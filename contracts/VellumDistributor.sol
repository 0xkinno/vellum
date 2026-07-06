// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @notice Minimal ERC-7984 surface used by the distributor.
interface IERC7984 {
    function confidentialTransfer(address to, euint64 amount) external returns (euint64);
    function confidentialTransferFrom(address from, address to, euint64 amount) external returns (euint64);
}

/// @title  VellumDistributor
/// @author Vellum — Zama Developer Program S3
/// @notice Multi-campaign confidential distribution over any ERC-7984 token. One deployment
///         runs unlimited rounds in three modes — Airdrop, Vesting (cliff + linear), Disperse.
///         Amounts are encrypted euint64 handles; the public sees handles, the operator can
///         reconcile encrypted totals, and each recipient decrypts only their own line.
contract VellumDistributor is ZamaEthereumConfig {
    enum Kind {
        Airdrop,
        Vesting,
        Disperse
    }

    struct Campaign {
        address operator;
        address token;
        Kind kind;
        uint64 start; // vesting reference start (unix)
        uint64 cliff; // seconds after start before anything vests
        uint64 duration; // total vesting seconds (0 => instant / airdrop / disperse)
        uint64 end; // claim window end (0 => open); after end the operator may reclaim
        string title;
        uint256 recipientCount;
        bool paused;
        bool exists;
    }

    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;

    // Encrypted per-campaign accounting (operator-decryptable → provable, sealed solvency).
    mapping(uint256 => euint64) private _funded;
    mapping(uint256 => euint64) private _totalAllocated;

    // Per (campaign, recipient) sealed state.
    mapping(uint256 => mapping(address => euint64)) private _allocation;
    mapping(uint256 => mapping(address => euint64)) private _claimed;
    mapping(uint256 => mapping(address => bool)) public assigned;
    mapping(uint256 => mapping(address => bool)) public revoked;

    event CampaignCreated(uint256 indexed id, address indexed operator, address indexed token, Kind kind, string title);
    event Funded(uint256 indexed id);
    event AllocationSet(uint256 indexed id, address indexed recipient);
    event Claimed(uint256 indexed id, address indexed recipient);
    event Distributed(uint256 indexed id, uint256 count);
    event Revoked(uint256 indexed id, address indexed recipient);
    event Reclaimed(uint256 indexed id);
    event PausedSet(uint256 indexed id, bool paused);

    modifier onlyOperator(uint256 id) {
        require(msg.sender == campaigns[id].operator, "not operator");
        _;
    }

    // --------------------------------------------------------------------- //
    //  Campaign lifecycle
    // --------------------------------------------------------------------- //

    /// @notice Create a distribution round. `duration == 0` => instant (airdrop / disperse).
    function createCampaign(
        address token,
        Kind kind,
        uint64 start,
        uint64 cliff,
        uint64 duration,
        uint64 end,
        string calldata title
    ) external returns (uint256 id) {
        id = ++campaignCount;
        Campaign storage c = campaigns[id];
        c.operator = msg.sender;
        c.token = token;
        c.kind = kind;
        c.start = start;
        c.cliff = cliff;
        c.duration = duration;
        c.end = end;
        c.title = title;
        c.exists = true;

        euint64 z1 = FHE.asEuint64(0);
        _funded[id] = z1;
        FHE.allowThis(z1);
        FHE.allow(z1, msg.sender);

        euint64 z2 = FHE.asEuint64(0);
        _totalAllocated[id] = z2;
        FHE.allowThis(z2);
        FHE.allow(z2, msg.sender);

        emit CampaignCreated(id, msg.sender, token, kind, title);
    }

    /// @notice Pull confidential funds from the operator into the campaign treasury.
    /// @dev    Operator must first call `token.setOperator(distributor, until)`.
    function fund(uint256 id, externalEuint64 amount, bytes calldata proof) external onlyOperator(id) {
        Campaign storage c = campaigns[id];
        euint64 amt = FHE.fromExternal(amount, proof);
        FHE.allowTransient(amt, c.token);
        IERC7984(c.token).confidentialTransferFrom(msg.sender, address(this), amt);

        _funded[id] = FHE.add(_funded[id], amt);
        FHE.allowThis(_funded[id]);
        FHE.allow(_funded[id], msg.sender);
        emit Funded(id);
    }

    /// @notice Seal a batch of allocations (one shared ZK input proof covers the batch).
    function setAllocations(
        uint256 id,
        address[] calldata recipients,
        externalEuint64[] calldata amounts,
        bytes calldata proof
    ) external onlyOperator(id) {
        require(recipients.length == amounts.length, "length");
        Campaign storage c = campaigns[id];

        for (uint256 i; i < recipients.length; i++) {
            address r = recipients[i];
            euint64 a = FHE.fromExternal(amounts[i], proof);

            if (!assigned[id][r]) {
                assigned[id][r] = true;
                c.recipientCount++;
                _allocation[id][r] = a;
                euint64 zero = FHE.asEuint64(0);
                _claimed[id][r] = zero;
                FHE.allowThis(zero);
                FHE.allow(zero, r);
                FHE.allow(zero, c.operator);
            } else {
                _allocation[id][r] = FHE.add(_allocation[id][r], a);
            }

            euint64 alloc = _allocation[id][r];
            FHE.allowThis(alloc);
            FHE.allow(alloc, r);
            FHE.allow(alloc, c.operator);

            _totalAllocated[id] = FHE.add(_totalAllocated[id], a);
            FHE.allowThis(_totalAllocated[id]);
            FHE.allow(_totalAllocated[id], c.operator);

            emit AllocationSet(id, r);
        }
    }

    // --------------------------------------------------------------------- //
    //  Claiming
    // --------------------------------------------------------------------- //

    /// @notice Recipient pulls their currently-claimable (vested minus already-claimed).
    function claim(uint256 id) external {
        require(!campaigns[id].paused, "paused");
        _deliver(id, msg.sender);
    }

    /// @notice Operator pushes claimable to a batch of recipients (disperse mode).
    function distribute(uint256 id, address[] calldata recipients) external onlyOperator(id) {
        require(!campaigns[id].paused, "paused");
        for (uint256 i; i < recipients.length; i++) {
            _deliver(id, recipients[i]);
        }
        emit Distributed(id, recipients.length);
    }

    function _deliver(uint256 id, address r) internal {
        require(assigned[id][r], "not assigned");
        require(!revoked[id][r], "revoked");
        Campaign storage c = campaigns[id];

        euint64 vested = _vested(id, r);
        euint64 claimedSoFar = _claimed[id][r];

        // claimable = vested >= claimed ? vested - claimed : 0  (guards against wrap)
        ebool ok = FHE.ge(vested, claimedSoFar);
        euint64 claimable = FHE.select(ok, FHE.sub(vested, claimedSoFar), FHE.asEuint64(0));

        FHE.allowTransient(claimable, c.token);
        euint64 transferred = IERC7984(c.token).confidentialTransfer(r, claimable);

        euint64 newClaimed = FHE.add(claimedSoFar, transferred);
        _claimed[id][r] = newClaimed;
        FHE.allowThis(newClaimed);
        FHE.allow(newClaimed, r);
        FHE.allow(newClaimed, c.operator);

        emit Claimed(id, r);
    }

    /// @dev Currently-vested amount for a recipient (encrypted). Public schedule, sealed value.
    function _vested(uint256 id, address r) internal returns (euint64) {
        Campaign storage c = campaigns[id];
        euint64 alloc = _allocation[id][r];
        if (c.duration == 0) {
            return alloc; // airdrop / disperse => fully vested immediately
        }
        uint256 startCliff = uint256(c.start) + uint256(c.cliff);
        if (block.timestamp < startCliff) {
            return FHE.asEuint64(0);
        }
        uint256 elapsed = block.timestamp - uint256(c.start);
        if (elapsed >= uint256(c.duration)) {
            return alloc;
        }
        uint64 bps = uint64((elapsed * 10000) / uint256(c.duration));
        return FHE.div(FHE.mul(alloc, bps), uint64(10000));
    }

    // --------------------------------------------------------------------- //
    //  Operator controls
    // --------------------------------------------------------------------- //

    /// @notice Cancel unclaimed allocations (e.g. wrong address). Already-claimed value stays.
    function revoke(uint256 id, address[] calldata recipients) external onlyOperator(id) {
        for (uint256 i; i < recipients.length; i++) {
            revoked[id][recipients[i]] = true;
            emit Revoked(id, recipients[i]);
        }
    }

    function setPaused(uint256 id, bool p) external onlyOperator(id) {
        campaigns[id].paused = p;
        emit PausedSet(id, p);
    }

    /// @notice After the claim window ends, sweep an amount of unclaimed funds back to the operator.
    function reclaim(uint256 id, externalEuint64 amount, bytes calldata proof) external onlyOperator(id) {
        Campaign storage c = campaigns[id];
        require(c.end != 0 && block.timestamp >= c.end, "not ended");
        euint64 amt = FHE.fromExternal(amount, proof);
        FHE.allowTransient(amt, c.token);
        IERC7984(c.token).confidentialTransfer(msg.sender, amt);
        emit Reclaimed(id);
    }

    // --------------------------------------------------------------------- //
    //  Views (return sealed handles; only ACL-granted addresses can decrypt)
    // --------------------------------------------------------------------- //

    function getAllocation(uint256 id, address r) external view returns (euint64) {
        return _allocation[id][r];
    }

    function getClaimed(uint256 id, address r) external view returns (euint64) {
        return _claimed[id][r];
    }

    /// @notice Operator-decryptable round total (reconciliation).
    function totalAllocatedOf(uint256 id) external view returns (euint64) {
        return _totalAllocated[id];
    }

    /// @notice Operator-decryptable funded total. Solvency = fundedOf - totalAllocatedOf,
    ///         both sealed on-chain, verifiable only by the operator.
    function fundedOf(uint256 id) external view returns (euint64) {
        return _funded[id];
    }
}

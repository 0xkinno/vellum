// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/// @title  VellumToken
/// @notice A confidential ERC-7984 demo token with a public faucet, so a round can be
///         funded and claimed end-to-end on Sepolia with no external dependencies.
contract VellumToken is ERC7984, ZamaEthereumConfig {
    uint64 public constant FAUCET_AMOUNT = 1_000_000;
    mapping(address => uint256) public lastFaucet;

    constructor() ERC7984("Vellum Token", "VLM", "https://vellum.app/token") {}

    /// @notice Mint a fixed confidential amount to the caller (once per 24h).
    function faucet() external {
        require(lastFaucet[msg.sender] == 0 || block.timestamp - lastFaucet[msg.sender] >= 1 days, "faucet: wait 24h");
        lastFaucet[msg.sender] = block.timestamp;
        euint64 amt = FHE.asEuint64(FAUCET_AMOUNT);
        FHE.allowThis(amt);
        _mint(msg.sender, amt);
    }

    /// @notice Mint an explicit confidential amount (demo convenience for funding rounds).
    function mint(address to, uint64 amount) external {
        euint64 amt = FHE.asEuint64(amount);
        FHE.allowThis(amt);
        _mint(to, amt);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {ERC7984ERC20Wrapper} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @notice Confidential USD  a real ERC-7984 wrapper over MockUSD. Shield: approve + wrap.
contract VellumcUSD is ERC7984ERC20Wrapper, ZamaEthereumConfig {
    constructor(IERC20 underlying)
        ERC7984("Confidential USD", "cUSD", "https://vellum.app/cusd")
        ERC7984ERC20Wrapper(underlying)
    {}
}
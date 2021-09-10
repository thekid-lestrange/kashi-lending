// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
import "@polycity/core/contracts/uniswapv2/interfaces/IUniswapV2Factory.sol";
import "@polycity/core/contracts/uniswapv2/UniswapV2Factory.sol";

contract PolyCityDexFactoryMock is UniswapV2Factory {
    constructor() public UniswapV2Factory(msg.sender) {
        return;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

interface IERC20 {
    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);
}

/// @notice A library for performing overflow-/underflow-safe math,
/// updated with awesomeness from of DappHub (https://github.com/dapphub/ds-math).
library BoringMath {
    function add(uint256 a, uint256 b) internal pure returns (uint256 c) {
        require((c = a + b) >= b, "BoringMath: Add Overflow");
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256 c) {
        require((c = a - b) <= a, "BoringMath: Underflow");
    }

    function mul(uint256 a, uint256 b) internal pure returns (uint256 c) {
        require(b == 0 || (c = a * b) / b == a, "BoringMath: Mul Overflow");
    }
}

interface IAggregator {
    function latestAnswer() external view returns (int256 answer);
}

/// @title xPICHIOracle
/// @author BoringCrypto
/// @notice Oracle used for getting the price of xPICHI based on Chainlink PICHI price
/// @dev
contract xPICHIOracleV1 is IAggregator {
    using BoringMath for uint256;

    IERC20 public immutable pichi;
    IERC20 public immutable hall;
    IAggregator public immutable pichiOracle;

    constructor(
        IERC20 pichi_,
        IERC20 hall_,
        IAggregator pichiOracle_
    ) public {
        pichi = pichi_;
        hall = hall_;
        pichiOracle = pichiOracle_;
    }

    // Calculates the lastest exchange rate
    // Uses pichi rate and xPICHI conversion
    function latestAnswer() external view override returns (int256) {
        return int256(uint256(pichiOracle.latestAnswer()).mul(pichi.balanceOf(address(hall))) / hall.totalSupply());
    }
}

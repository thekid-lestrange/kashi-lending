// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import "@boringcrypto/boring-solidity/contracts/libraries/BoringMath.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import "@polycity/antiquebox-sdk/contracts/IAntiqueBoxV1.sol";
import "./KushoPair.sol";

/// @dev This contract provides useful helper functions for `KushoPair`.
contract KushoPairHelper {
    using BoringMath for uint256;
    using BoringMath128 for uint128;
    using RebaseLibrary for Rebase;

    /// @dev Helper function to calculate the collateral shares that are needed for `borrowPart`,
    /// taking the current exchange rate into account.
    function getCollateralSharesForBorrowPart(KushoPair kushoPair, uint256 borrowPart) public view returns (uint256) {
        // Taken from KushoPair
        uint256 EXCHANGE_RATE_PRECISION = 1e18;
        uint256 LIQUIDATION_MULTIPLIER = 112000; // add 12%
        uint256 LIQUIDATION_MULTIPLIER_PRECISION = 1e5;

        (uint128 elastic, uint128 base) = kushoPair.totalBorrow();
        Rebase memory totalBorrow = Rebase(elastic, base);
        uint256 borrowAmount = totalBorrow.toElastic(borrowPart, false);

        return
            kushoPair.antiqueBox().toShare(
                kushoPair.collateral(),
                borrowAmount.mul(LIQUIDATION_MULTIPLIER).mul(kushoPair.exchangeRate()) /
                    (LIQUIDATION_MULTIPLIER_PRECISION * EXCHANGE_RATE_PRECISION),
                false
            );
    }
}

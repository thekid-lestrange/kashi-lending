// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
import "@polycity/antiquebox-sdk/contracts/IStrategy.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringMath.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

// solhint-disable not-rely-on-time

contract SimpleStrategyMock is IStrategy {
    using BoringMath for uint256;
    using BoringERC20 for IERC20;

    IERC20 private immutable token;
    address private immutable antiqueBox;

    modifier onlyAntiqueBox() {
        require(msg.sender == antiqueBox, "Ownable: caller is not the owner");
        _;
    }

    constructor(address antiqueBox_, IERC20 token_) public {
        antiqueBox = antiqueBox_;
        token = token_;
    }

    // Send the assets to the Strategy and call skim to invest them
    function skim(uint256) external override onlyAntiqueBox {
        // Leave the tokens on the contract
        return;
    }

    // Harvest any profits made converted to the asset and pass them to the caller
    function harvest(uint256 balance, address) external override onlyAntiqueBox returns (int256 amountAdded) {
        amountAdded = int256(token.balanceOf(address(this)).sub(balance));
        token.safeTransfer(antiqueBox, uint256(amountAdded)); // Add as profit
    }

    // Withdraw assets. The returned amount can differ from the requested amount due to rounding or if the request was more than there is.
    function withdraw(uint256 amount) external override onlyAntiqueBox returns (uint256 actualAmount) {
        token.safeTransfer(antiqueBox, uint256(amount)); // Add as profit
        actualAmount = amount;
    }

    // Withdraw all assets in the safest way possible. This shouldn't fail.
    function exit(uint256 balance) external override onlyAntiqueBox returns (int256 amountAdded) {
        amountAdded = 0;
        token.safeTransfer(antiqueBox, balance);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
import "@polycity/antiquebox-sdk/contracts/IStrategy.sol";
import "@polycity/antiquebox-sdk/contracts/IFlashBorrower.sol";
import "@polycity/antiquebox-sdk/contracts/IAntiqueBoxV1.sol";
import "@polycity/core/contracts/uniswapv2/interfaces/IUniswapV2Factory.sol";
import "@polycity/core/contracts/uniswapv2/interfaces/IUniswapV2Pair.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringMath.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "../KushoPair.sol";
import "../KushoPairHelper.sol";
import "../interfaces/ISwapper.sol";

// solhint-disable not-rely-on-time

contract FlashloanStrategyMock is IStrategy, IFlashBorrower, KushoPairHelper {
    using BoringMath for uint256;
    using BoringERC20 for IERC20;

    IERC20 private immutable assetToken;
    IERC20 private immutable collateralToken;
    KushoPair private immutable kushoPair;
    IAntiqueBoxV1 private immutable antiqueBox;
    ISwapper private immutable swapper;
    address private immutable target;
    IUniswapV2Factory public factory;

    modifier onlyAntiqueBox() {
        require(msg.sender == address(antiqueBox), "only antiqueBox");
        _;
    }

    constructor(
        IAntiqueBoxV1 antiqueBox_,
        KushoPair _kushoPair,
        IERC20 asset,
        IERC20 collateral,
        ISwapper _swapper,
        IUniswapV2Factory _factory
    ) public {
        antiqueBox = antiqueBox_;
        kushoPair = _kushoPair;
        assetToken = asset;
        collateralToken = collateral;
        swapper = _swapper;
        factory = _factory;
        target = msg.sender;
    }

    // Send the assets to the Strategy and call skim to invest them
    function skim(uint256) external override onlyAntiqueBox {
        // Leave the tokens on the contract
        return;
    }

    // Harvest any profits made converted to the asset and pass them to the caller
    function harvest(uint256 balance, address) external override onlyAntiqueBox returns (int256 amountAdded) {
        // flashloan everything we can
        uint256 flashAmount = assetToken.balanceOf(address(antiqueBox));
        antiqueBox.flashLoan(IFlashBorrower(this), address(this), assetToken, flashAmount, new bytes(0));

        // Profit is any leftover after the flashloan and liquidation succeeded
        amountAdded = int256(assetToken.balanceOf(address(this)).sub(balance));
        assetToken.safeTransfer(address(antiqueBox), uint256(amountAdded));
    }

    // Withdraw assets. The returned amount can differ from the requested amount due to rounding or if the request was more than there is.
    function withdraw(uint256 amount) external override onlyAntiqueBox returns (uint256 actualAmount) {
        assetToken.safeTransfer(address(antiqueBox), uint256(amount));
        actualAmount = amount;
    }

    // Withdraw all assets in the safest way possible. This shouldn't fail.
    function exit(uint256 balance) external override onlyAntiqueBox returns (int256 amountAdded) {
        amountAdded = 0;
        assetToken.safeTransfer(address(antiqueBox), balance);
    }

    // Given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountOut) {
        uint256 amountInWithFee = amountIn.mul(997);
        uint256 numerator = amountInWithFee.mul(reserveOut);
        uint256 denominator = reserveIn.mul(1000).add(amountInWithFee);
        amountOut = numerator / denominator;
    }

    // liquidate
    function onFlashLoan(
        address, /*sender*/
        IERC20 token,
        uint256 amount,
        uint256 fee,
        bytes calldata /*data*/
    ) external override onlyAntiqueBox {
        require(token == assetToken);

        // approve kushoPair
        antiqueBox.setMasterContractApproval(address(this), address(kushoPair.masterContract()), true, 0, 0, 0);
        // approve & deposit asset into antiqueBox
        assetToken.approve(address(antiqueBox), amount);
        antiqueBox.deposit(assetToken, address(this), address(this), amount, 0);

        // update exchange rate first
        kushoPair.updateExchangeRate();
        // calculate how much we can liquidate
        uint256 PREC = 1e5;
        uint256 targetBorrowPart = kushoPair.userBorrowPart(target);
        // round up
        uint256 divisor =
            (KushoPairHelper.getCollateralSharesForBorrowPart(kushoPair, targetBorrowPart) * PREC) / (kushoPair.userCollateralShare(target)) + 1;
        // setup
        address[] memory users = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        users[0] = target;
        amounts[0] = (targetBorrowPart * PREC) / divisor;

        // get rid of some assets and receive collateral
        kushoPair.liquidate(users, amounts, address(this), ISwapper(address(0)), true);

        // swap the collateral to asset
        IUniswapV2Pair pair = IUniswapV2Pair(factory.getPair(address(collateralToken), address(assetToken)));
        // withdraw collateral to uniswap
        (uint256 amountFrom, ) =
            antiqueBox.withdraw(collateralToken, address(this), address(pair), 0, antiqueBox.balanceOf(collateralToken, address(this)));
        // withdraw remaining assets
        antiqueBox.withdraw(assetToken, address(this), address(this), 0, antiqueBox.balanceOf(assetToken, address(this)));

        {
            // swap
            (uint256 reserve0, uint256 reserve1, ) = pair.getReserves();
            if (pair.token0() == address(collateralToken)) {
                uint256 amountTo = getAmountOut(amountFrom, reserve0, reserve1);
                pair.swap(0, amountTo, address(this), new bytes(0));
            } else {
                uint256 amountTo = getAmountOut(amountFrom, reserve1, reserve0);
                pair.swap(amountTo, 0, address(this), new bytes(0));
            }
        }

        // transfer flashloan + fee back to antiqueBox
        assetToken.safeTransfer(msg.sender, amount.add(fee));
    }
}

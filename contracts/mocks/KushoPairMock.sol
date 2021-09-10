// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import "@polycity/antiquebox-sdk/contracts/IAntiqueBoxV1.sol";
import "../KushoPair.sol";

contract KushoPairMock is KushoPair {
    constructor(IAntiqueBoxV1 antiqueBox) public KushoPair(antiqueBox) {
        return;
    }

    function accrueTwice() public {
        accrue();
        accrue();
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../PumpStaking.sol";

contract PumpStakingTest is PumpStaking {
    function _getPeriod() public override pure returns (uint256) {
        return 5 minutes;
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {TaskPay} from "../src/TaskPay.sol";

contract DeployTaskPay is Script {
    address constant COPM_MAINNET = 0x8A567e2aE79CA692Bd748aB832081C45de4041eA;
    address constant COPM_SEPOLIA = 0x5F8d55c3627d2dc0a2B4afa798f877242F382F67;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address copm = block.chainid == 42220 ? COPM_MAINNET : COPM_SEPOLIA;
        TaskPay taskPay = new TaskPay(copm);
        console2.log("TaskPay deployed at:", address(taskPay));
        console2.log("Chain ID:", block.chainid);
        console2.log("COPm token:", copm);

        vm.stopBroadcast();
    }
}

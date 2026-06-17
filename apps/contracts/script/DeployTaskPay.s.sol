// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {TaskPay} from "../src/TaskPay.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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

        IERC20 copmToken = IERC20(copm);

        string[3] memory descriptions = [
            "Is there a sportswear store at Calle 62 #8-100, Bogota? Need a storefront photo.",
            "Is parking available near Universidad Icesi right now? Photo of the price sign.",
            "Is El Trigal bakery open at Av. 6N #23-50, Cali? Photo showing hours."
        ];
        string[3] memory locations = [
            "Calle 62 #8-100, Bogota",
            "Universidad Icesi, Cali",
            "Av. 6N #23-50, Cali"
        ];
        uint256[3] memory rewards = [uint256(50e18), uint256(50e18), uint256(50e18)];
        uint256[3] memory deadlines = [
            block.timestamp + 24 hours,
            block.timestamp + 1 hours,
            block.timestamp + 2 hours
        ];

        uint256 totalReward = rewards[0] + rewards[1] + rewards[2];
        copmToken.approve(address(taskPay), totalReward);

        for (uint256 i = 0; i < 3; i++) {
            uint256 taskId = taskPay.postTask(
                descriptions[i],
                locations[i],
                deadlines[i],
                rewards[i]
            );
            console2.log("Seeded task", taskId);
        }

        vm.stopBroadcast();
    }
}

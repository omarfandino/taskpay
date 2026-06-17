// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {TaskPay} from "../src/TaskPay.sol";
import {MockCOPm} from "../src/MockCOPm.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TaskPayTest is Test {
    TaskPay public taskPay;
    MockCOPm public copm;

    address public poster = address(0x1);
    address public taker = address(0x2);

    uint256 public constant REWARD = 2000e18;

    function setUp() public {
        copm = new MockCOPm();
        taskPay = new TaskPay(address(copm));

        copm.mint(poster, 10_000e18);
        copm.mint(taker, 10_000e18);
    }

    function testPostAndTakeTask() public {
        vm.startPrank(poster);
        copm.approve(address(taskPay), REWARD);
        uint256 taskId = taskPay.postTask(
            "Is the store open?",
            "4.6097,-74.0817",
            block.timestamp + 1 hours,
            REWARD
        );
        vm.stopPrank();

        TaskPay.Task memory task = taskPay.getTask(taskId);
        assertEq(uint256(task.status), uint256(TaskPay.TaskStatus.Open));
        assertEq(task.reward, REWARD);

        vm.prank(taker);
        taskPay.takeTask(taskId);

        task = taskPay.getTask(taskId);
        assertEq(uint256(task.status), uint256(TaskPay.TaskStatus.Taken));
        assertEq(task.taker, taker);
    }

    function testFullFlow() public {
        vm.startPrank(poster);
        copm.approve(address(taskPay), REWARD);
        uint256 taskId = taskPay.postTask(
            "Need a photo of the bakery sign",
            "Cali, Colombia",
            block.timestamp + 24 hours,
            REWARD
        );
        vm.stopPrank();

        vm.prank(taker);
        taskPay.takeTask(taskId);

        vm.prank(taker);
        taskPay.submitEvidence(taskId, "https://example.com/photo.jpg");

        uint256 takerBefore = copm.balanceOf(taker);

        vm.prank(poster);
        taskPay.approveTask(taskId);

        assertEq(copm.balanceOf(taker), takerBefore + REWARD);

        TaskPay.Task memory task = taskPay.getTask(taskId);
        assertEq(uint256(task.status), uint256(TaskPay.TaskStatus.Completed));
    }

    function testCancelOpenTask() public {
        vm.startPrank(poster);
        copm.approve(address(taskPay), REWARD);
        uint256 taskId = taskPay.postTask(
            "Cancel me",
            "Bogota",
            block.timestamp + 1 hours,
            REWARD
        );

        uint256 before = copm.balanceOf(poster);
        taskPay.cancelTask(taskId);
        vm.stopPrank();

        assertEq(copm.balanceOf(poster), before + REWARD);
    }

    function testRevertWhenRewardTooLow() public {
        vm.startPrank(poster);
        copm.approve(address(taskPay), 100e18);
        vm.expectRevert(TaskPay.InvalidReward.selector);
        taskPay.postTask("Too cheap", "Bogota", block.timestamp + 1 hours, 100e18);
        vm.stopPrank();
    }

    function testGetOpenTasks() public {
        vm.startPrank(poster);
        copm.approve(address(taskPay), REWARD * 2);

        taskPay.postTask("Task 1", "Location 1", block.timestamp + 1 hours, REWARD);
        taskPay.postTask("Task 2", "Location 2", block.timestamp + 2 hours, REWARD);
        vm.stopPrank();

        TaskPay.Task[] memory open = taskPay.getOpenTasks();
        assertEq(open.length, 2);
    }
}

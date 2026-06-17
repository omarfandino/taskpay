// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TaskPay is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum TaskStatus {
        Open,
        Taken,
        PendingReview,
        Completed,
        Cancelled
    }

    struct Task {
        uint256 id;
        address poster;
        address taker;
        string description;
        string location;
        uint256 reward;
        uint256 deadline;
        TaskStatus status;
        string evidenceUrl;
    }

    IERC20 public immutable copmToken;
    uint256 public taskCount;
    uint256 public constant MIN_REWARD = 50e18;

    mapping(uint256 => Task) private _tasks;

    event TaskPosted(
        uint256 indexed taskId,
        address indexed poster,
        uint256 reward,
        uint256 deadline
    );
    event TaskTaken(uint256 indexed taskId, address indexed taker);
    event EvidenceSubmitted(uint256 indexed taskId, string evidenceUrl);
    event TaskMarkedComplete(uint256 indexed taskId, address indexed taker);
    event TaskApproved(uint256 indexed taskId, address indexed taker, uint256 reward);
    event TaskRejected(uint256 indexed taskId, address indexed poster, uint256 refund);
    event TaskCancelled(uint256 indexed taskId, address indexed poster, uint256 refund);

    error InvalidReward();
    error InvalidDeadline();
    error TaskNotFound();
    error TaskNotOpen();
    error TaskNotTaken();
    error TaskNotPendingReview();
    error DeadlinePassed();
    error NotPoster();
    error NotTaker();
    error EvidenceRequired();
    error EmptyDescription();
    error EmptyLocation();

    constructor(address copmTokenAddress) {
        require(copmTokenAddress != address(0), "Invalid COPm address");
        copmToken = IERC20(copmTokenAddress);
    }

    function postTask(
        string calldata description,
        string calldata location,
        uint256 deadline,
        uint256 reward
    ) external nonReentrant returns (uint256 taskId) {
        if (bytes(description).length == 0) revert EmptyDescription();
        if (bytes(location).length == 0) revert EmptyLocation();
        if (reward < MIN_REWARD) revert InvalidReward();
        if (deadline <= block.timestamp) revert InvalidDeadline();

        copmToken.safeTransferFrom(msg.sender, address(this), reward);

        taskId = ++taskCount;
        _tasks[taskId] = Task({
            id: taskId,
            poster: msg.sender,
            taker: address(0),
            description: description,
            location: location,
            reward: reward,
            deadline: deadline,
            status: TaskStatus.Open,
            evidenceUrl: ""
        });

        emit TaskPosted(taskId, msg.sender, reward, deadline);
    }

    function takeTask(uint256 taskId) external nonReentrant {
        Task storage task = _requireTask(taskId);
        if (task.status != TaskStatus.Open) revert TaskNotOpen();
        if (block.timestamp >= task.deadline) revert DeadlinePassed();

        task.status = TaskStatus.Taken;
        task.taker = msg.sender;

        emit TaskTaken(taskId, msg.sender);
    }

    function submitEvidence(uint256 taskId, string calldata evidenceUrl) external {
        Task storage task = _requireTask(taskId);
        if (task.status != TaskStatus.Taken) revert TaskNotTaken();
        if (msg.sender != task.taker) revert NotTaker();
        if (bytes(evidenceUrl).length == 0) revert EvidenceRequired();

        task.evidenceUrl = evidenceUrl;

        emit EvidenceSubmitted(taskId, evidenceUrl);
    }

    function markTaskComplete(uint256 taskId) external {
        Task storage task = _requireTask(taskId);
        if (task.status != TaskStatus.Taken) revert TaskNotTaken();
        if (msg.sender != task.taker) revert NotTaker();
        if (bytes(task.evidenceUrl).length == 0) revert EvidenceRequired();

        task.status = TaskStatus.PendingReview;

        emit TaskMarkedComplete(taskId, msg.sender);
    }

    function approveTask(uint256 taskId) external nonReentrant {
        Task storage task = _requireTask(taskId);
        if (task.status != TaskStatus.PendingReview) revert TaskNotPendingReview();
        if (msg.sender != task.poster) revert NotPoster();
        if (bytes(task.evidenceUrl).length == 0) revert EvidenceRequired();

        task.status = TaskStatus.Completed;
        copmToken.safeTransfer(task.taker, task.reward);

        emit TaskApproved(taskId, task.taker, task.reward);
    }

    function rejectTask(uint256 taskId) external nonReentrant {
        Task storage task = _requireTask(taskId);
        if (task.status != TaskStatus.PendingReview) revert TaskNotPendingReview();
        if (msg.sender != task.poster) revert NotPoster();

        task.status = TaskStatus.Cancelled;
        copmToken.safeTransfer(task.poster, task.reward);

        emit TaskRejected(taskId, task.poster, task.reward);
    }

    function cancelTask(uint256 taskId) external nonReentrant {
        Task storage task = _requireTask(taskId);
        if (task.status != TaskStatus.Open) revert TaskNotOpen();
        if (msg.sender != task.poster) revert NotPoster();

        task.status = TaskStatus.Cancelled;
        copmToken.safeTransfer(task.poster, task.reward);

        emit TaskCancelled(taskId, task.poster, task.reward);
    }

    function getTask(uint256 taskId) external view returns (Task memory) {
        return _requireTask(taskId);
    }

    function getOpenTasks() external view returns (Task[] memory) {
        uint256 openCount;
        for (uint256 i = 1; i <= taskCount; i++) {
            Task storage task = _tasks[i];
            if (task.status == TaskStatus.Open && block.timestamp < task.deadline) {
                openCount++;
            }
        }

        Task[] memory openTasks = new Task[](openCount);
        uint256 index;
        for (uint256 i = 1; i <= taskCount; i++) {
            Task storage task = _tasks[i];
            if (task.status == TaskStatus.Open && block.timestamp < task.deadline) {
                openTasks[index++] = task;
            }
        }

        return openTasks;
    }

    function getTasksByPoster(address poster) external view returns (Task[] memory) {
        uint256 count;
        for (uint256 i = 1; i <= taskCount; i++) {
            if (_tasks[i].poster == poster) count++;
        }

        Task[] memory tasks = new Task[](count);
        uint256 index;
        for (uint256 i = 1; i <= taskCount; i++) {
            if (_tasks[i].poster == poster) {
                tasks[index++] = _tasks[i];
            }
        }

        return tasks;
    }

    function getTasksByTaker(address taker) external view returns (Task[] memory) {
        uint256 count;
        for (uint256 i = 1; i <= taskCount; i++) {
            if (_tasks[i].taker == taker) count++;
        }

        Task[] memory tasks = new Task[](count);
        uint256 index;
        for (uint256 i = 1; i <= taskCount; i++) {
            if (_tasks[i].taker == taker) {
                tasks[index++] = _tasks[i];
            }
        }

        return tasks;
    }

    function _requireTask(uint256 taskId) internal view returns (Task storage task) {
        if (taskId == 0 || taskId > taskCount) revert TaskNotFound();
        return _tasks[taskId];
    }
}

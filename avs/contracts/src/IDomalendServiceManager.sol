// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface IDomalendServiceManager {
    event NewTaskCreated(uint32 indexed taskIndex, Task task);
    event TaskResponded(uint32 indexed taskIndex, Task task, address operator);
    event CScoreInserted(address indexed user, uint256 cScore, uint256 timestamp);
    event DomainScoringTaskCreated(uint32 indexed taskIndex, DomainTask task);
    event DomainScoreSubmitted(uint256 indexed domainTokenId, uint256 score, string ipfsHash, address operator);

    enum TaskType {
        WalletCScore,
        DomainScore
    }

    struct Task {
        address user;
        uint32 taskCreatedBlock;
    }

    struct DomainTask {
        uint256 domainTokenId;
        uint32 taskCreatedBlock;
        TaskType taskType;
    }

    struct CScoreData {
        uint256 cScore;
        uint256 lastUpdate;
    }

    struct DomainScoreData {
        uint256 score;
        uint256 lastUpdate;
        string ipfsHash;
    }

    function getUserCScoreData(
        address user
    ) external view returns (CScoreData memory);

    function latestTaskNum() external view returns (uint32);

    function allTaskHashes(
        uint32 taskIndex
    ) external view returns (bytes32);

    function allTaskResponses(
        address operator,
        uint32 taskIndex
    ) external view returns (bytes memory);

    function createNewTask(
        address user
    ) external returns (Task memory);

    function respondToTask(
        Task calldata task,
        uint256 cScore,
        uint32 referenceTaskIndex,
        bytes calldata signature
    ) external;

    function createDomainScoringTask(
        uint256 domainTokenId
    ) external returns (DomainTask memory);

    function respondToDomainTask(
        DomainTask calldata task,
        uint256 score,
        string calldata ipfsHash,
        uint32 referenceTaskIndex,
        bytes calldata signature
    ) external;

    function getDomainScoreData(
        uint256 domainTokenId
    ) external view returns (DomainScoreData memory);
}

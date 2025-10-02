// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDomalendServiceManager {
    enum TaskType {
        WalletCScore,
        DomainScore
    }

    struct DomainTask {
        uint256 domainTokenId;
        uint32 taskCreatedBlock;
        TaskType taskType;
    }

    struct DomainScoreData {
        uint256 score;
        uint256 lastUpdate;
        string ipfsHash;
    }

    event DomainScoringTaskCreated(uint32 indexed taskIndex, DomainTask task);
    event DomainScoreSubmitted(uint256 indexed domainTokenId, uint256 score, string ipfsHash, address operator);

    function createDomainScoringTask(uint256 domainTokenId) external returns (DomainTask memory);
    function getDomainScoreData(uint256 domainTokenId) external view returns (DomainScoreData memory);
}

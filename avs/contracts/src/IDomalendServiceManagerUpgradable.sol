// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

/**
 * @title IDomalendServiceManager
 * @notice Interface for Domalend Service Manager - Domain Scoring Only
 */
interface IDomalendServiceManagerUpgradable {
    // ========================================
    // === Events ===
    // ========================================

    event DomainScoringTaskCreated(uint32 indexed taskIndex, DomainTask task);
    event DomainScoreSubmitted(
        uint256 indexed domainTokenId, uint256 score, string ipfsHash, address operator
    );

    // ========================================
    // === Enums & Structs ===
    // ========================================

    enum TaskType {
        DomainScore
    }

    struct DomainTask {
        uint256 domainTokenId;
        uint256 requestId;
        uint32 taskCreatedBlock;
        TaskType taskType;
    }

    struct DomainScoreData {
        uint256 score;
        uint256 lastUpdate;
        string ipfsHash;
    }

    // ========================================
    // === State Variables (View Functions) ===
    // ========================================

    function latestTaskNum() external view returns (uint32);

    function domainTaskHashes(
        uint32 taskIndex
    ) external view returns (bytes32);

    function allTaskResponses(
        address operator,
        uint32 taskIndex
    ) external view returns (bytes memory);

    function aiOracleAddress() external view returns (address);

    // ========================================
    // === Core Functions ===
    // ========================================

    /**
     * @notice Create a new domain scoring task for operators
     * @param domainTokenId The token ID of the domain to score
     * @param requestId The paid request ID from AIOracle
     * @return The created domain task
     */
    function createDomainScoringTask(
        uint256 domainTokenId,
        uint256 requestId
    ) external returns (DomainTask memory);

    /**
     * @notice Operator responds to a domain scoring task
     * @param task The domain task being responded to
     * @param score The calculated domain score (0-100)
     * @param ipfsHash The IPFS hash containing score details
     * @param referenceTaskIndex The task index this response is for
     * @param signature The operator's signature
     */
    function respondToDomainTask(
        DomainTask calldata task,
        uint256 score,
        string calldata ipfsHash,
        uint32 referenceTaskIndex,
        bytes calldata signature
    ) external;

    /**
     * @notice Get domain score data
     * @param domainTokenId The token ID of the domain
     * @return The domain score data
     */
    function getDomainScoreData(
        uint256 domainTokenId
    ) external view returns (DomainScoreData memory);

    /**
     * @notice Set the AI Oracle address
     * @param _aiOracleAddress The new AI Oracle address
     */
    function setAIOracle(
        address _aiOracleAddress
    ) external;
}

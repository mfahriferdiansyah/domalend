// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAIOracle
 * @dev Interface for AI Oracle contract
 */
interface IAIOracle {
    function requestScoring(uint256 domainTokenId) external;
    function batchRequestScoring(uint256[] memory domainTokenIds) external;
    function scoreDomain(uint256 domainTokenId) external view returns (uint256 score);
    function getDomainScore(uint256 domainTokenId)
        external
        view
        returns (uint256 score, bool isValid, uint256 timestamp);
    function hasValidScore(uint256 domainTokenId) external view returns (bool);
    function isScoreValid(uint256 domainTokenId) external view returns (bool);
    function needsRefresh(uint256 domainTokenId) external view returns (bool);
    function getScoreAge(uint256 domainTokenId) external view returns (uint256 ageInSeconds);
}
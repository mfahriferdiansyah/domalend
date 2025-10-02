// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAIOracle
 * @dev Interface for AI Oracle contract
 */
interface IAIOracle {
    struct PaidScoreRequest {
        address requester;
        uint256 domainTokenId;
        address paymentToken;
        uint256 paymentAmount;
        uint256 timestamp;
        bool isCompleted;
        address rewardRecipient;
    }

    // Free Scoring Functions
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

    // Paid Scoring Functions
    function paidScoreRequest(uint256 domainTokenId) external returns (uint256 requestId);
    function submitPaidScore(
        uint256 requestId,
        uint256 domainTokenId,
        uint256 score,
        address rewardRecipient
    ) external;
    function getPaidRequestDetail(uint256 requestId) external view returns (PaidScoreRequest memory);
    function getPaidRequests(uint256 startId, uint256 limit) external view returns (PaidScoreRequest[] memory);
    function getPendingRequests(uint256 maxResults) external view returns (uint256[] memory);
    function isOperator(address account) external view returns (bool);
}
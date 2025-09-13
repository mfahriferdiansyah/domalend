// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../src/interfaces/IAIOracle.sol";

contract MockAIOracle is IAIOracle {
    struct DomainScore {
        uint256 score;
        uint256 timestamp;
        bool isValid;
    }

    mapping(uint256 => DomainScore) private _scores;

    function requestScoring(uint256 domainTokenId) external {
        // Mock implementation - do nothing
    }

    function batchRequestScoring(uint256[] memory domainTokenIds) external {
        // Mock implementation - do nothing
    }

    function scoreDomain(uint256 domainTokenId) external view returns (uint256) {
        require(_scores[domainTokenId].isValid, "No valid score");
        return _scores[domainTokenId].score;
    }

    function getDomainScore(uint256 domainTokenId)
        external
        view
        returns (uint256 score, bool isValid, uint256 timestamp)
    {
        DomainScore storage domainScore = _scores[domainTokenId];
        return (domainScore.score, domainScore.isValid, domainScore.timestamp);
    }

    function hasValidScore(uint256 domainTokenId) external view returns (bool) {
        return _scores[domainTokenId].isValid;
    }

    function isScoreValid(uint256 domainTokenId) external view returns (bool) {
        return _scores[domainTokenId].isValid;
    }

    function needsRefresh(uint256 domainTokenId) external view returns (bool) {
        return !_scores[domainTokenId].isValid ||
               (block.timestamp - _scores[domainTokenId].timestamp) > 7 days;
    }

    function getScoreAge(uint256 domainTokenId) external view returns (uint256) {
        if (!_scores[domainTokenId].isValid) return type(uint256).max;
        return block.timestamp - _scores[domainTokenId].timestamp;
    }

    // Mock-specific functions
    function setScore(uint256 domainTokenId, uint256 score) external {
        _scores[domainTokenId] = DomainScore({
            score: score,
            timestamp: block.timestamp,
            isValid: true
        });
    }

    function invalidateScore(uint256 domainTokenId) external {
        _scores[domainTokenId].isValid = false;
    }
}
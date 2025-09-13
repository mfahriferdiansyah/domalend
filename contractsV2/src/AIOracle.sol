// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract AIOracle is Ownable, AccessControl {
    bytes32 public constant SCORING_SERVICE_ROLE = keccak256("SCORING_SERVICE_ROLE");

    address public backendService;
    bool public emergencyPaused = false;

    struct DomainScore {
        uint256 score;
        uint256 timestamp;
        bool isValid;
    }

    mapping(uint256 => DomainScore) public domainScores;

    uint256 public constant SCORE_VALIDITY_PERIOD = 24 hours;
    uint256 public constant DEFAULT_SCORE = 0;

    uint256 public totalScoresSubmitted;
    uint256 public totalScoringRequests;
    mapping(address => uint256) public userRequests;

    event ScoringRequested(
        uint256 indexed domainTokenId,
        address indexed requester,
        uint256 timestamp
    );

    event BatchScoringRequested(
        uint256[] domainTokenIds,
        address indexed requester,
        uint256 timestamp
    );

    event ScoreSubmitted(
        uint256 indexed domainTokenId,
        uint256 score,
        address indexed submittedBy,
        uint256 timestamp
    );

    event BatchScoresSubmitted(
        uint256[] domainTokenIds,
        uint256[] scores,
        address indexed submittedBy,
        uint256 batchSize,
        uint256 timestamp
    );

    event BackendServiceUpdated(
        address indexed oldService,
        address indexed newService,
        address indexed updatedBy,
        uint256 timestamp
    );

    event ScoreInvalidated(
        uint256 indexed domainTokenId,
        address indexed invalidatedBy,
        string reason,
        uint256 timestamp
    );

    event EmergencyPauseToggled(
        bool isPaused,
        address indexed toggledBy,
        uint256 timestamp
    );

    modifier onlyBackendService() {
        require(hasRole(SCORING_SERVICE_ROLE, msg.sender), "Not authorized backend service");
        _;
    }

    modifier validScore(uint256 score) {
        require(score <= 100, "Score must be 0-100");
        _;
    }

    modifier whenNotPaused() {
        require(!emergencyPaused, "Oracle is paused");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
    }

    function requestScoring(uint256 domainTokenId) external {
        totalScoringRequests++;
        userRequests[msg.sender]++;
        _updateStats(true, false);

        emit ScoringRequested(domainTokenId, msg.sender, block.timestamp);
    }

    function batchRequestScoring(uint256[] memory domainTokenIds) external {
        require(domainTokenIds.length > 0, "Empty domain list");

        totalScoringRequests += domainTokenIds.length;
        userRequests[msg.sender] += domainTokenIds.length;

        for (uint256 i = 0; i < domainTokenIds.length; i++) {
            emit ScoringRequested(domainTokenIds[i], msg.sender, block.timestamp);
        }

        emit BatchScoringRequested(domainTokenIds, msg.sender, block.timestamp);
    }

    function submitScore(uint256 domainTokenId, uint256 score)
        external
        onlyBackendService
        validScore(score)
        whenNotPaused
    {
        domainScores[domainTokenId] = DomainScore({
            score: score,
            timestamp: block.timestamp,
            isValid: true
        });

        totalScoresSubmitted++;
        _updateStats(false, true);

        emit ScoreSubmitted(domainTokenId, score, msg.sender, block.timestamp);
    }

    function batchSubmitScores(
        uint256[] memory domainTokenIds,
        uint256[] memory scores
    ) external onlyBackendService whenNotPaused {
        require(domainTokenIds.length == scores.length, "Array length mismatch");
        require(domainTokenIds.length > 0, "Empty arrays");

        for (uint256 i = 0; i < scores.length; i++) {
            require(scores[i] <= 100, "Score must be 0-100");

            domainScores[domainTokenIds[i]] = DomainScore({
                score: scores[i],
                timestamp: block.timestamp,
                isValid: true
            });
        }

        totalScoresSubmitted += domainTokenIds.length;

        emit BatchScoresSubmitted(
            domainTokenIds,
            scores,
            msg.sender,
            domainTokenIds.length,
            block.timestamp
        );
    }

    function scoreDomain(uint256 domainTokenId)
        external
        view
        returns (uint256 score)
    {
        DomainScore memory domainScore = domainScores[domainTokenId];

        if (!domainScore.isValid || _isScoreExpired(domainScore.timestamp)) {
            return DEFAULT_SCORE;
        }

        return domainScore.score;
    }

    function getDomainScore(uint256 domainTokenId)
        external
        view
        returns (uint256 score, bool isValid, uint256 timestamp)
    {
        DomainScore memory domainScore = domainScores[domainTokenId];

        bool scoreValid = domainScore.isValid && !_isScoreExpired(domainScore.timestamp);

        return (
            scoreValid ? domainScore.score : DEFAULT_SCORE,
            scoreValid,
            domainScore.timestamp
        );
    }

    function hasValidScore(uint256 domainTokenId)
        external
        view
        returns (bool)
    {
        DomainScore memory domainScore = domainScores[domainTokenId];
        return domainScore.isValid && !_isScoreExpired(domainScore.timestamp);
    }

    function isScoreValid(uint256 domainTokenId)
        external
        view
        returns (bool)
    {
        DomainScore memory domainScore = domainScores[domainTokenId];
        return domainScore.isValid && !_isScoreExpired(domainScore.timestamp);
    }

    function getScoreAge(uint256 domainTokenId)
        external
        view
        returns (uint256 ageInSeconds)
    {
        DomainScore memory domainScore = domainScores[domainTokenId];
        if (domainScore.timestamp == 0) {
            return 0;
        }
        return block.timestamp - domainScore.timestamp;
    }

    function needsRefresh(uint256 domainTokenId)
        external
        view
        returns (bool)
    {
        DomainScore memory domainScore = domainScores[domainTokenId];
        return !domainScore.isValid || _isScoreExpired(domainScore.timestamp);
    }

    function getTotalStats()
        external
        view
        returns (
            uint256 totalRequests,
            uint256 totalSubmissions,
            uint256 validScores,
            uint256 expiredScores
        )
    {
        return (totalScoringRequests, totalScoresSubmitted, 0, 0);
    }

    function setBackendService(address newService)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        address oldService = backendService;

        if (oldService != address(0)) {
            _revokeRole(SCORING_SERVICE_ROLE, oldService);
        }

        _grantRole(SCORING_SERVICE_ROLE, newService);
        backendService = newService;

        emit BackendServiceUpdated(oldService, newService, msg.sender, block.timestamp);
    }

    function invalidateScore(uint256 domainTokenId, string memory reason)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        domainScores[domainTokenId].isValid = false;

        emit ScoreInvalidated(domainTokenId, msg.sender, reason, block.timestamp);
    }

    function emergencyPause(bool paused)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        emergencyPaused = paused;

        emit EmergencyPauseToggled(paused, msg.sender, block.timestamp);
    }

    function _validateScore(uint256 score)
        internal
        pure
        returns (bool)
    {
        return score <= 100;
    }

    function _isScoreExpired(uint256 timestamp)
        internal
        view
        returns (bool)
    {
        if (timestamp == 0) return true;
        return block.timestamp > timestamp + SCORE_VALIDITY_PERIOD;
    }

    function _updateStats(bool isNewRequest, bool isNewSubmission)
        internal
    {
        // Stats are updated in the calling functions
        // This function is kept for interface consistency
    }
}
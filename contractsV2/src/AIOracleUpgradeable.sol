// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract AIOracleUpgradeable is Initializable, OwnableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    bytes32 public constant SCORING_SERVICE_ROLE = keccak256("SCORING_SERVICE_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    string public constant VERSION = "3.0.0";

    address public backendService;
    bool public emergencyPaused;

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

    // Paid Scoring State Variables
    IERC20 public paymentToken;
    uint256 public paidScoringFee;

    struct PaidScoreRequest {
        address requester;
        uint256 domainTokenId;
        address paymentToken;
        uint256 paymentAmount;
        uint256 timestamp;
        bool isCompleted;
        address rewardRecipient;
    }

    mapping(uint256 => PaidScoreRequest) public paidScoreRequests;
    uint256 public nextPaidRequestId;

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

    // Paid Scoring Events
    event PaidScoringRequested(
        uint256 indexed requestId,
        uint256 indexed domainTokenId,
        address indexed requester,
        address paymentToken,
        uint256 paymentAmount,
        uint256 timestamp
    );

    event PaidScoreSubmitted(
        uint256 indexed requestId,
        uint256 indexed domainTokenId,
        uint256 score,
        address indexed operator,
        address rewardRecipient,
        uint256 rewardAmount,
        uint256 timestamp
    );

    event PaymentTokenUpdated(
        address indexed oldToken,
        address indexed newToken
    );

    event PaidScoringFeeUpdated(
        uint256 oldFee,
        uint256 newFee
    );

    event OperatorRegistered(
        address indexed operator
    );

    event OperatorUnregistered(
        address indexed operator
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

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        emergencyPaused = false;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

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

    function getVersion() external pure returns (string memory) {
        return VERSION;
    }

    // ============ Paid Scoring Functions ============

    /**
     * @notice Initialize paid scoring (call after upgrade)
     */
    function initializePaidScoring(address _paymentToken, uint256 _initialFee)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(address(paymentToken) == address(0), "Already initialized");
        require(_paymentToken != address(0), "Invalid token");

        paymentToken = IERC20(_paymentToken);
        paidScoringFee = _initialFee;
        nextPaidRequestId = 1;
    }

    /**
     * @notice Create a paid scoring request
     */
    function paidScoreRequest(uint256 domainTokenId)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 requestId)
    {
        require(address(paymentToken) != address(0), "Not configured");
        require(paidScoringFee > 0, "Fee not set");

        // Transfer payment from user to contract
        paymentToken.safeTransferFrom(msg.sender, address(this), paidScoringFee);

        // Create request
        requestId = nextPaidRequestId++;
        paidScoreRequests[requestId] = PaidScoreRequest({
            requester: msg.sender,
            domainTokenId: domainTokenId,
            paymentToken: address(paymentToken),
            paymentAmount: paidScoringFee,
            timestamp: block.timestamp,
            isCompleted: false,
            rewardRecipient: address(0)
        });

        emit PaidScoringRequested(
            requestId,
            domainTokenId,
            msg.sender,
            address(paymentToken),
            paidScoringFee,
            block.timestamp
        );
    }

    /**
     * @notice Submit score for paid request and receive payment
     */
    function submitPaidScore(
        uint256 requestId,
        uint256 domainTokenId,
        uint256 score,
        address rewardRecipient
    )
        external
        onlyRole(OPERATOR_ROLE)
        validScore(score)
        whenNotPaused
    {
        PaidScoreRequest storage req = paidScoreRequests[requestId];

        require(req.requester != address(0), "Request not found");
        require(!req.isCompleted, "Already completed");
        require(req.domainTokenId == domainTokenId, "Domain mismatch");
        require(rewardRecipient != address(0), "Invalid recipient");

        // Store score (same as free scoring)
        domainScores[domainTokenId] = DomainScore({
            score: score,
            timestamp: block.timestamp,
            isValid: true
        });

        // Mark completed
        req.isCompleted = true;
        req.rewardRecipient = rewardRecipient;

        // Pay operator
        IERC20(req.paymentToken).safeTransfer(rewardRecipient, req.paymentAmount);

        // Update stats
        totalScoresSubmitted++;

        emit PaidScoreSubmitted(
            requestId,
            domainTokenId,
            score,
            msg.sender,
            rewardRecipient,
            req.paymentAmount,
            block.timestamp
        );
    }

    /**
     * @notice Set payment token address
     */
    function setPaymentToken(address _token)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(_token != address(0), "Invalid token");
        address oldToken = address(paymentToken);
        paymentToken = IERC20(_token);

        emit PaymentTokenUpdated(oldToken, _token);
    }

    /**
     * @notice Set paid scoring fee amount
     */
    function setPaidScoringFee(uint256 _fee)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 oldFee = paidScoringFee;
        paidScoringFee = _fee;

        emit PaidScoringFeeUpdated(oldFee, _fee);
    }

    /**
     * @notice Register an AVS operator
     */
    function registerOperator(address operator)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(operator != address(0), "Invalid operator");
        _grantRole(OPERATOR_ROLE, operator);

        emit OperatorRegistered(operator);
    }

    /**
     * @notice Unregister an AVS operator
     */
    function unregisterOperator(address operator)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _revokeRole(OPERATOR_ROLE, operator);

        emit OperatorUnregistered(operator);
    }

    /**
     * @notice Get paid request details
     */
    function getPaidRequestDetail(uint256 requestId)
        external
        view
        returns (PaidScoreRequest memory)
    {
        return paidScoreRequests[requestId];
    }

    /**
     * @notice Get multiple paid requests (pagination)
     */
    function getPaidRequests(uint256 startId, uint256 limit)
        external
        view
        returns (PaidScoreRequest[] memory)
    {
        uint256 endId = startId + limit;
        if (endId > nextPaidRequestId) {
            endId = nextPaidRequestId;
        }

        uint256 count = endId > startId ? endId - startId : 0;
        PaidScoreRequest[] memory requests = new PaidScoreRequest[](count);

        for (uint256 i = 0; i < count; i++) {
            requests[i] = paidScoreRequests[startId + i];
        }

        return requests;
    }

    /**
     * @notice Get pending (incomplete) paid requests
     */
    function getPendingRequests(uint256 maxResults)
        external
        view
        returns (uint256[] memory)
    {
        // First pass: count pending
        uint256 count = 0;
        for (uint256 i = 1; i < nextPaidRequestId && count < maxResults; i++) {
            if (!paidScoreRequests[i].isCompleted && paidScoreRequests[i].requester != address(0)) {
                count++;
            }
        }

        // Second pass: collect IDs
        uint256[] memory pending = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i < nextPaidRequestId && index < count; i++) {
            if (!paidScoreRequests[i].isCompleted && paidScoreRequests[i].requester != address(0)) {
                pending[index++] = i;
            }
        }

        return pending;
    }

    /**
     * @notice Check if address is registered operator
     */
    function isOperator(address account)
        external
        view
        returns (bool)
    {
        return hasRole(OPERATOR_ROLE, account);
    }

    /**
     * @dev Storage gap for future upgrades
     */
    uint256[44] private __gap;
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/IDoma.sol";
import "./interfaces/IAIOracle.sol";
import "./interfaces/ILoanManager.sol";

contract SatoruLendingUpgradeable is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    string public constant VERSION = "5.1.0";

    // Changed from immutable to storage variables
    IERC20 public usdc;
    IDoma public domaProtocol;
    IAIOracle public aiOracle;
    ILoanManager public loanManager;

    struct LiquidityPool {
        address creator;
        uint256 totalLiquidity;
        uint256 availableLiquidity;
        uint256 minAiScore;
        uint256 maxDomainExpiration;
        uint256 interestRate;
        uint256 minLoanAmount;
        uint256 maxLoanAmount;
        uint256 minDuration;
        uint256 maxDuration;
        bool allowAdditionalProviders;
        bool isActive;
        uint256 totalLoansIssued;
        uint256 totalInterestEarned;
        mapping(address => uint256) providerShares;
        address[] providers;
    }

    mapping(uint256 => LiquidityPool) public pools;
    uint256 public nextPoolId;

    struct LoanRequest {
        address borrower;
        uint256 domainTokenId;
        uint256 requestedAmount;
        uint256 proposedInterestRate;
        uint256 campaignDeadline;
        uint256 repaymentDeadline;
        uint256 totalFunded;
        uint256 aiScore;
        uint256 domainExpiration;
        bool isActive;
        bool isExecuted;
        bool isCancelled;
        mapping(address => uint256) contributions;
        address[] contributors;
    }

    mapping(uint256 => LoanRequest) public loanRequests;
    uint256 public nextRequestId;

    uint256 public totalPoolsCreated;
    uint256 public totalLiquidityProvided;
    uint256 public totalLoansExecuted;
    uint256 public totalVolumeProcessed;

    // Removed artificial restrictions - let pool creators and market decide
    uint256 public constant MAX_INTEREST_RATE = type(uint256).max;
    uint256 public constant MIN_CAMPAIGN_DURATION = 1;
    uint256 public constant MAX_CAMPAIGN_DURATION = type(uint256).max;
    uint256 public constant MIN_LOAN_DURATION = 1;
    uint256 public constant MAX_LOAN_DURATION = type(uint256).max;
    uint256 public constant MIN_POOL_LIQUIDITY = 1;
    uint256 public constant MAX_POOLS_PER_USER = type(uint256).max;

    struct CreatePoolParams {
        uint256 initialLiquidity;
        uint256 minAiScore;
        uint256 maxDomainExpiration;
        uint256 interestRate;
        uint256 minLoanAmount;
        uint256 maxLoanAmount;
        uint256 minDuration;
        uint256 maxDuration;
        bool allowAdditionalProviders;
    }

    struct CreateRequestParams {
        uint256 domainTokenId;
        uint256 requestedAmount;
        uint256 proposedInterestRate;
        uint256 campaignDuration;
        uint256 repaymentDeadline;
    }

    struct InstantLoanParams {
        uint256 domainTokenId;
        uint256 poolId;
        uint256 requestedAmount;
        uint256 loanDuration;
    }

    event PoolCreated(
        uint256 indexed poolId,
        address indexed creator,
        uint256 initialLiquidity,
        uint256 minAiScore,
        uint256 interestRate,
        uint256 timestamp,
        uint256 maxDomainExpiration,
        uint256 minLoanAmount,
        uint256 maxLoanAmount,
        uint256 minDuration,
        uint256 maxDuration,
        bool allowAdditionalProviders
    );

    event LiquidityAdded(
        uint256 indexed poolId,
        address indexed provider,
        uint256 amount,
        uint256 newTotalLiquidity,
        uint256 providerShares,
        uint256 timestamp
    );

    event LiquidityRemoved(
        uint256 indexed poolId,
        address indexed provider,
        uint256 amount,
        uint256 interestEarned,
        uint256 remainingShares,
        uint256 timestamp
    );

    event PoolUpdated(
        uint256 indexed poolId,
        address indexed updatedBy,
        uint256 newMinAiScore,
        uint256 newInterestRate,
        uint256 timestamp
    );

    event InstantLoanExecuted(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 indexed domainTokenId,
        uint256 poolId,
        uint256 loanAmount,
        uint256 interestRate,
        uint256 repaymentDeadline,
        uint256 aiScore
    );

    event LoanRequestCreated(
        uint256 indexed requestId,
        address indexed borrower,
        uint256 indexed domainTokenId,
        uint256 requestedAmount,
        uint256 proposedInterestRate,
        uint256 aiScore,
        uint256 campaignDeadline
    );

    event LoanRequestFunded(
        uint256 indexed requestId,
        address indexed contributor,
        uint256 contributionAmount,
        uint256 totalFunded,
        uint256 remainingAmount,
        bool isFullyFunded
    );

    event LoanExecuted(
        uint256 indexed loanId,
        uint256 indexed requestId,
        address indexed borrower,
        uint256 domainTokenId,
        uint256 loanAmount,
        address[] contributors
    );

    event LoanRequestCancelled(
        uint256 indexed requestId, address indexed borrower, uint256 totalRefunded, string reason
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner, address _usdc, address _domaProtocol, address _aiOracle)
        public
        initializer
    {
        __Ownable_init(initialOwner);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        usdc = IERC20(_usdc);
        domaProtocol = IDoma(_domaProtocol);
        aiOracle = IAIOracle(_aiOracle);

        nextPoolId = 1;
        nextRequestId = 1;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setLoanManager(address _loanManager) external onlyOwner {
        loanManager = ILoanManager(_loanManager);
    }

    function createLiquidityPool(CreatePoolParams memory params) external nonReentrant returns (uint256 poolId) {
        require(params.initialLiquidity > 0, "Initial liquidity cannot be zero");
        require(params.minLoanAmount < params.maxLoanAmount, "Invalid loan amount range");
        require(params.minDuration > 0, "Duration cannot be zero");
        require(params.minDuration < params.maxDuration, "Invalid duration range");

        poolId = nextPoolId++;
        LiquidityPool storage pool = pools[poolId];

        pool.creator = msg.sender;
        pool.totalLiquidity = params.initialLiquidity;
        pool.availableLiquidity = params.initialLiquidity;
        pool.minAiScore = params.minAiScore;
        pool.maxDomainExpiration = params.maxDomainExpiration;
        pool.interestRate = params.interestRate;
        pool.minLoanAmount = params.minLoanAmount;
        pool.maxLoanAmount = params.maxLoanAmount;
        pool.minDuration = params.minDuration;
        pool.maxDuration = params.maxDuration;
        pool.allowAdditionalProviders = params.allowAdditionalProviders;
        pool.isActive = true;

        pool.providerShares[msg.sender] = 10000; // 100% shares in basis points
        pool.providers.push(msg.sender);

        totalPoolsCreated++;
        totalLiquidityProvided += params.initialLiquidity;

        usdc.safeTransferFrom(msg.sender, address(this), params.initialLiquidity);

        emit PoolCreated(
            poolId,
            msg.sender,
            params.initialLiquidity,
            params.minAiScore,
            params.interestRate,
            block.timestamp,
            params.maxDomainExpiration,
            params.minLoanAmount,
            params.maxLoanAmount,
            params.minDuration,
            params.maxDuration,
            params.allowAdditionalProviders
        );
    }

    function addLiquidity(uint256 poolId, uint256 amount) external nonReentrant {
        LiquidityPool storage pool = pools[poolId];
        require(pool.isActive, "Pool not active");
        require(pool.allowAdditionalProviders || msg.sender == pool.creator, "Additional providers not allowed");
        require(amount > 0, "Amount must be positive");

        uint256 newShares = _calculateProviderShares(poolId, amount);

        if (pool.providerShares[msg.sender] == 0) {
            pool.providers.push(msg.sender);
        }

        pool.providerShares[msg.sender] += newShares;
        pool.totalLiquidity += amount;
        pool.availableLiquidity += amount;
        totalLiquidityProvided += amount;

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        emit LiquidityAdded(
            poolId, msg.sender, amount, pool.totalLiquidity, pool.providerShares[msg.sender], block.timestamp
        );
    }

    function removeLiquidity(uint256 poolId, uint256 sharePercentage) external nonReentrant {
        require(sharePercentage > 0 && sharePercentage <= 100, "Invalid share percentage");

        LiquidityPool storage pool = pools[poolId];
        require(pool.providerShares[msg.sender] > 0, "No shares in pool");

        uint256 sharesToRemove = (pool.providerShares[msg.sender] * sharePercentage) / 100;
        uint256 liquidityToRemove = (pool.availableLiquidity * sharesToRemove) / 10000;
        uint256 interestEarned = (pool.totalInterestEarned * sharesToRemove) / 10000;

        require(liquidityToRemove <= pool.availableLiquidity, "Insufficient available liquidity");

        pool.providerShares[msg.sender] -= sharesToRemove;
        pool.totalLiquidity -= liquidityToRemove;
        pool.availableLiquidity -= liquidityToRemove;

        uint256 totalToTransfer = liquidityToRemove + interestEarned;
        usdc.safeTransfer(msg.sender, totalToTransfer);

        emit LiquidityRemoved(
            poolId, msg.sender, liquidityToRemove, interestEarned, pool.providerShares[msg.sender], block.timestamp
        );
    }

    function canGetInstantLoan(uint256 domainTokenId, uint256 poolId, uint256 amount)
        external
        view
        returns (bool eligible, string memory reason)
    {
        return _canGetInstantLoan(msg.sender, domainTokenId, poolId, amount);
    }

    function _canGetInstantLoan(address caller, uint256 domainTokenId, uint256 poolId, uint256 amount)
        internal
        view
        returns (bool eligible, string memory reason)
    {
        (bool domainEligible, string memory domainReason) = _validateDomainEligibility(caller, domainTokenId);
        if (!domainEligible) {
            return (false, domainReason);
        }

        (bool poolEligible, string memory poolReason) = _checkPoolCriteria(domainTokenId, poolId, amount);
        if (!poolEligible) {
            return (false, poolReason);
        }

        return (true, "");
    }

    function requestInstantLoan(InstantLoanParams memory params) external nonReentrant returns (uint256 loanId) {
        (bool eligible, string memory reason) =
            _canGetInstantLoan(msg.sender, params.domainTokenId, params.poolId, params.requestedAmount);
        require(eligible, reason);

        uint256 aiScore = aiOracle.scoreDomain(params.domainTokenId);
        loanId = _executeInstantLoan(params, aiScore);
    }

    function createLoanRequest(CreateRequestParams memory params) external nonReentrant returns (uint256 requestId) {
        require(params.campaignDuration > 0, "Campaign duration cannot be zero");
        require(params.requestedAmount > 0, "Requested amount cannot be zero");

        uint256 campaignDeadline = block.timestamp + params.campaignDuration;

        require(
            params.repaymentDeadline > block.timestamp, "INVALID_TIMELINE: Repayment deadline cannot be in the past"
        );

        require(
            params.repaymentDeadline > campaignDeadline,
            string(
                abi.encodePacked(
                    "INVALID_TIMELINE: Repayment deadline (",
                    Strings.toString(params.repaymentDeadline),
                    ") must be after campaign deadline (",
                    Strings.toString(campaignDeadline),
                    "). Current time: ",
                    Strings.toString(block.timestamp)
                )
            )
        );

        require(
            params.repaymentDeadline >= campaignDeadline + MIN_LOAN_DURATION,
            "INVALID_TIMELINE: Minimum loan duration required"
        );

        (bool eligible, string memory reason) = _validateDomainEligibility(msg.sender, params.domainTokenId);
        require(eligible, reason);

        require(aiOracle.hasValidScore(params.domainTokenId), "Domain must have valid AI score");
        uint256 aiScore = aiOracle.scoreDomain(params.domainTokenId);

        requestId = nextRequestId++;
        LoanRequest storage request = loanRequests[requestId];

        request.borrower = msg.sender;
        request.domainTokenId = params.domainTokenId;
        request.requestedAmount = params.requestedAmount;
        request.proposedInterestRate = params.proposedInterestRate;
        request.campaignDeadline = campaignDeadline;
        request.repaymentDeadline = params.repaymentDeadline;
        request.aiScore = aiScore;
        request.domainExpiration = domaProtocol.expirationOf(params.domainTokenId);
        request.isActive = true;

        emit LoanRequestCreated(
            requestId,
            msg.sender,
            params.domainTokenId,
            params.requestedAmount,
            params.proposedInterestRate,
            aiScore,
            request.campaignDeadline
        );
    }

    function fundLoanRequest(uint256 requestId, uint256 amount) external nonReentrant {
        LoanRequest storage request = loanRequests[requestId];
        require(request.isActive, "Request not active");
        require(!request.isExecuted, "Request already executed");
        require(block.timestamp < request.campaignDeadline, "Campaign expired");
        require(amount > 0, "Amount must be positive");

        if (request.totalFunded >= request.requestedAmount) {
            revert("Loan request already fully funded");
        }

        uint256 remainingAmount = request.requestedAmount - request.totalFunded;
        uint256 actualAmount = amount > remainingAmount ? remainingAmount : amount;

        require(actualAmount > 0, "No funding needed");
        require(actualAmount <= remainingAmount, "Amount exceeds remaining");

        if (request.contributions[msg.sender] == 0) {
            request.contributors.push(msg.sender);
        }

        request.contributions[msg.sender] += actualAmount;

        uint256 newTotalFunded = request.totalFunded + actualAmount;
        require(newTotalFunded <= request.requestedAmount, "Total funding would exceed requested amount");
        request.totalFunded = newTotalFunded;

        usdc.safeTransferFrom(msg.sender, address(this), actualAmount);

        bool isFullyFunded = request.totalFunded == request.requestedAmount;

        uint256 remainingAmountForEmit = 0;
        if (!isFullyFunded) {
            remainingAmountForEmit = request.requestedAmount - request.totalFunded;
        }

        emit LoanRequestFunded(
            requestId, msg.sender, actualAmount, request.totalFunded, remainingAmountForEmit, isFullyFunded
        );

        if (isFullyFunded) {
            _executeLoanRequest(requestId);
        }
    }

    function executeLoanRequest(uint256 requestId) external nonReentrant returns (uint256 loanId) {
        LoanRequest storage request = loanRequests[requestId];
        require(request.totalFunded >= request.requestedAmount, "Request not fully funded");

        return _executeLoanRequest(requestId);
    }

    function executePartialLoanRequest(uint256 requestId, uint256 minThresholdBps)
        external
        nonReentrant
        returns (uint256 loanId)
    {
        LoanRequest storage request = loanRequests[requestId];
        require(request.borrower == msg.sender, "Only borrower can execute partial loan");
        require(request.isActive, "Request not active");
        require(!request.isExecuted, "Request already executed");
        require(minThresholdBps > 0 && minThresholdBps <= 10000, "Invalid threshold (must be 1-10000 bps)");

        uint256 minRequiredAmount = (request.requestedAmount * minThresholdBps) / 10000;
        require(request.totalFunded >= minRequiredAmount, "Funding below minimum threshold");

        request.requestedAmount = request.totalFunded;

        return _executeLoanRequest(requestId);
    }

    function cancelLoanRequest(uint256 requestId) external nonReentrant {
        LoanRequest storage request = loanRequests[requestId];
        require(request.borrower == msg.sender, "Only borrower can cancel");
        require(request.isActive, "Request not active");
        require(!request.isExecuted, "Request already executed");

        request.isActive = false;
        request.isCancelled = true;

        _refundContributors(requestId);

        emit LoanRequestCancelled(requestId, msg.sender, request.totalFunded, "Cancelled by borrower");
    }

    function claimRefundExpiredCampaign(uint256 requestId) external nonReentrant {
        LoanRequest storage request = loanRequests[requestId];
        require(request.isActive, "Request not active");
        require(!request.isExecuted, "Request already executed");
        require(block.timestamp >= request.campaignDeadline, "Campaign not expired yet");
        require(request.contributions[msg.sender] > 0, "No contribution to refund");

        uint256 refundAmount = request.contributions[msg.sender];
        request.contributions[msg.sender] = 0;
        request.totalFunded -= refundAmount;

        bool hasRemainingContributions = false;
        for (uint256 i = 0; i < request.contributors.length; i++) {
            if (request.contributions[request.contributors[i]] > 0) {
                hasRemainingContributions = true;
                break;
            }
        }

        if (!hasRemainingContributions) {
            request.isActive = false;
            request.isCancelled = true;
        }

        usdc.safeTransfer(msg.sender, refundAmount);

        emit LoanRequestCancelled(requestId, msg.sender, refundAmount, "Refund claimed for expired campaign");
    }

    function _validateDomainEligibility(address caller, uint256 domainTokenId)
        internal
        view
        returns (bool, string memory)
    {
        if (domaProtocol.ownerOf(domainTokenId) != caller) {
            return (false, "Not domain owner");
        }

        if (address(loanManager) != address(0) && loanManager.isCollateralLocked(domainTokenId)) {
            return (false, "Domain already used as collateral");
        }

        uint256 expiry = domaProtocol.expirationOf(domainTokenId);
        if (expiry <= block.timestamp) {
            return (false, "Domain expired");
        }

        return (true, "");
    }

    function _checkPoolCriteria(uint256 domainTokenId, uint256 poolId, uint256 amount)
        internal
        view
        returns (bool, string memory)
    {
        LiquidityPool storage pool = pools[poolId];

        if (!pool.isActive) {
            return (false, "Pool not active");
        }

        if (amount < pool.minLoanAmount || amount > pool.maxLoanAmount) {
            return (false, "Amount outside pool limits");
        }

        if (amount > pool.availableLiquidity) {
            return (false, "Insufficient pool liquidity");
        }

        if (!aiOracle.hasValidScore(domainTokenId)) {
            return (false, "Domain needs AI score");
        }

        uint256 aiScore = aiOracle.scoreDomain(domainTokenId);
        if (aiScore < pool.minAiScore) {
            return (false, "AI score too low for pool");
        }

        uint256 domainExpiry = domaProtocol.expirationOf(domainTokenId);
        uint256 daysUntilExpiry = (domainExpiry - block.timestamp) / 1 days;
        if (daysUntilExpiry > pool.maxDomainExpiration) {
            return (false, "Domain expiry exceeds pool limit");
        }

        return (true, "");
    }

    function _calculateProviderShares(uint256 poolId, uint256 newLiquidity) internal view returns (uint256) {
        LiquidityPool storage pool = pools[poolId];
        if (pool.totalLiquidity == 0) {
            return 10000;
        }
        return (newLiquidity * 10000) / pool.totalLiquidity;
    }

    function _executeInstantLoan(InstantLoanParams memory params, uint256 aiScore) internal returns (uint256) {
        LiquidityPool storage pool = pools[params.poolId];
        pool.availableLiquidity -= params.requestedAmount;
        pool.totalLoansIssued++;

        ILoanManager.CreateLoanParams memory loanParams = ILoanManager.CreateLoanParams({
            borrower: msg.sender,
            domainTokenId: params.domainTokenId,
            loanAmount: params.requestedAmount,
            interestRate: pool.interestRate,
            duration: params.loanDuration,
            aiScore: aiScore,
            poolId: params.poolId,
            requestId: 0
        });

        uint256 loanId = loanManager.createPoolBasedLoan(loanParams);

        usdc.safeTransfer(msg.sender, params.requestedAmount);

        _updatePoolStats(params.poolId, params.requestedAmount);

        emit InstantLoanExecuted(
            loanId,
            msg.sender,
            params.domainTokenId,
            params.poolId,
            params.requestedAmount,
            pool.interestRate,
            block.timestamp + params.loanDuration,
            aiScore
        );

        return loanId;
    }

    function _executeLoanRequest(uint256 requestId) internal returns (uint256) {
        LoanRequest storage request = loanRequests[requestId];
        require(!request.isExecuted, "Already executed");

        require(
            request.repaymentDeadline > request.campaignDeadline,
            "UNDERFLOW_PREVENTION: Repayment deadline must be after campaign deadline"
        );

        request.isExecuted = true;
        request.isActive = false;

        uint256 loanDuration = request.repaymentDeadline - request.campaignDeadline;

        ILoanManager.CreateLoanParams memory loanParams = ILoanManager.CreateLoanParams({
            borrower: request.borrower,
            domainTokenId: request.domainTokenId,
            loanAmount: request.requestedAmount,
            interestRate: request.proposedInterestRate,
            duration: loanDuration,
            aiScore: request.aiScore,
            poolId: 0,
            requestId: requestId
        });

        uint256[] memory contributions = new uint256[](request.contributors.length);
        for (uint256 i = 0; i < request.contributors.length; i++) {
            contributions[i] = request.contributions[request.contributors[i]];
        }

        ILoanManager.CrowdfundedLoanData memory loanData = ILoanManager.CrowdfundedLoanData({
            contributors: request.contributors,
            contributions: contributions,
            totalContributions: request.totalFunded
        });

        uint256 loanId = loanManager.createCrowdfundedLoan(loanParams, loanData);

        usdc.safeTransfer(request.borrower, request.requestedAmount);

        totalLoansExecuted++;
        totalVolumeProcessed += request.requestedAmount;

        emit LoanExecuted(
            loanId, requestId, request.borrower, request.domainTokenId, request.requestedAmount, request.contributors
        );

        return loanId;
    }

    function _updatePoolStats(uint256 poolId, uint256 loanAmount) internal {
        totalLoansExecuted++;
        totalVolumeProcessed += loanAmount;
    }

    function _refundContributors(uint256 requestId) internal {
        LoanRequest storage request = loanRequests[requestId];

        for (uint256 i = 0; i < request.contributors.length; i++) {
            address contributor = request.contributors[i];
            uint256 amount = request.contributions[contributor];
            if (amount > 0) {
                request.contributions[contributor] = 0;
                usdc.safeTransfer(contributor, amount);
            }
        }
    }

    // View functions
    function getPoolInfo(uint256 poolId)
        external
        view
        returns (
            address creator,
            uint256 totalLiquidity,
            uint256 availableLiquidity,
            uint256 minAiScore,
            uint256 interestRate,
            bool isActive,
            uint256 totalLoansIssued,
            uint256 maxDomainExpiration,
            uint256 minLoanAmount,
            uint256 maxLoanAmount,
            uint256 minDuration,
            uint256 maxDuration,
            bool allowAdditionalProviders,
            uint256 totalInterestEarned
        )
    {
        LiquidityPool storage pool = pools[poolId];
        return (
            pool.creator,
            pool.totalLiquidity,
            pool.availableLiquidity,
            pool.minAiScore,
            pool.interestRate,
            pool.isActive,
            pool.totalLoansIssued,
            pool.maxDomainExpiration,
            pool.minLoanAmount,
            pool.maxLoanAmount,
            pool.minDuration,
            pool.maxDuration,
            pool.allowAdditionalProviders,
            pool.totalInterestEarned
        );
    }

    function getProtocolStats()
        external
        view
        returns (uint256 totalPools, uint256 totalLiquidity, uint256 totalLoans, uint256 totalVolume)
    {
        return (totalPoolsCreated, totalLiquidityProvided, totalLoansExecuted, totalVolumeProcessed);
    }

    function getVersion() external pure returns (string memory) {
        return VERSION;
    }

    /**
     * @dev Storage gap for future upgrades
     */
    uint256[50] private __gap;
}

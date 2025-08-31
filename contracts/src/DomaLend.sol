// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./libraries/LoanCalculations.sol";
import "./libraries/PointsCalculations.sol";
import "./libraries/AuctionCalculations.sol";
import "./libraries/LiquidityCalculations.sol";

// Interfaces - Compatible with real Doma Protocol Ownership Token
interface IDoma {
    // Standard ERC-721 functions
    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
    function approve(address to, uint256 tokenId) external;
    function getApproved(uint256 tokenId) external view returns (address operator);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function tokenURI(uint256 tokenId) external view returns (string memory);
    
    // Doma Protocol specific functions (verified from contract explorer ✅)
    function expirationOf(uint256 tokenId) external view returns (uint256);
    function registrarOf(uint256 tokenId) external view returns (uint256);
    function exists(uint256 tokenId) external view returns (bool);
    function lockStatusOf(uint256 tokenId) external view returns (bool);
}

interface IAIOracle {
    function scoreDomain(uint256 tokenId) external view returns (uint256 score);
    function getDomainValue(uint256 tokenId) external view returns (uint256 estimatedValue);
    function getMaxLoanAmount(uint256 tokenId) external view returns (uint256 maxLoan);
}

contract DomaLend is ReentrancyGuard, Ownable, IERC721Receiver {
    using SafeERC20 for IERC20;
    using LoanCalculations for LoanCalculations.Loan;
    using PointsCalculations for PointsCalculations.StakeInfo;
    using AuctionCalculations for AuctionCalculations.DutchAuction;
    using LiquidityCalculations for LiquidityCalculations.WithdrawalRequest;
    
    // Core contracts
    IERC20 public immutable usdc;
    IDoma public immutable domaProtocol;
    IAIOracle public aiOracle;
    
    // Use library structs
    using LoanCalculations for LoanCalculations.Loan;
    using PointsCalculations for PointsCalculations.StakeInfo;
    using AuctionCalculations for AuctionCalculations.DutchAuction;
    using LiquidityCalculations for LiquidityCalculations.WithdrawalRequest;
    
    // State variables
    mapping(address => PointsCalculations.StakeInfo) public stakes;
    mapping(address => uint256) public stakerDeposits;
    mapping(address => uint256) public pendingDistributions;
    uint256 public totalDeposited;
    uint256 public totalPoolValue; // Tracks total pool value including earned fees
    
    // For efficient total points calculation
    uint256 public totalPointSupply;
    uint256 public lastPointSupplyUpdate;
    
    mapping(uint256 => LoanCalculations.Loan) public loans;
    mapping(address => uint256[]) public userLoans;
    uint256 public nextLoanId = 1;
    
    mapping(uint256 => AuctionCalculations.DutchAuction) public auctions;
    
    // Liquidity management state
    mapping(uint256 => LiquidityCalculations.WithdrawalRequest) public withdrawalQueue;
    uint256 public queueHead = 1;
    uint256 public queueTail = 1;
    
    // Constants
    uint256 public constant MAX_LOAN_TO_VALUE = 5000; // 50%
    uint256 public constant BASE_INTEREST_RATE = 800; // 8% annual base rate
    
    // Events
    event Staked(address indexed user, uint256 amount, uint256 timestamp);
    event Unstaked(address indexed user, uint256 amount, uint256 pointsRemoved);
    event PointsUpdated(address indexed user, uint256 newPoints);
    event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 domainTokenId, uint256 amount, uint256 rate);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 remainingBalance);
    event PaymentDistributed(uint256 indexed loanId, uint256 totalAmount);
    event DistributionClaimed(address indexed user, uint256 amount);
    event AuctionStarted(uint256 indexed loanId, uint256 startPrice, uint256 startTime);
    event AuctionCompleted(uint256 indexed loanId, address indexed winner, uint256 finalPrice);
    
    // Liquidity management events
    event WithdrawalQueued(uint256 indexed requestId, address indexed user, uint256 amount, uint256 priority);
    event WithdrawalFulfilled(uint256 indexed requestId, address indexed user, uint256 amount);
    event ExitFeeCharged(address indexed user, uint256 amount, uint256 fee);
    event PoolValueUpdated(uint256 newPoolValue, uint256 feeAdded);
    event MinimumFeeEnforced(uint256 indexed loanId, uint256 timeBasedFee, uint256 minimumFee, uint256 actualFee);
    event LoanFullyRepaid(uint256 indexed loanId, address indexed borrower);
    
    // Emergency/Development events
    event EmergencyDomainRecovered(uint256 indexed tokenId, address indexed recoveredTo);
    event EmergencyUSDCRecovered(uint256 amount, address indexed recoveredTo);
    event PointsMigrated(uint256 stakersCount, uint256 newTotalPoints);
    event EmergencyLoanClosed(uint256 indexed loanId, address indexed borrower, uint256 indexed domainTokenId);
    
    constructor(
        address _usdc,
        address _domaProtocol,
        address _aiOracle
    ) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        domaProtocol = IDoma(_domaProtocol);
        aiOracle = IAIOracle(_aiOracle);
        totalPoolValue = 0;
    }
    
    // ============ Staking Functions ============
    
    function stakeFunds(uint256 usdcAmount) external nonReentrant {
        require(usdcAmount > 0, "Amount must be > 0");
        
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        
        PointsCalculations.StakeInfo storage stake = stakes[msg.sender];
        
        if (stake.amount == 0) {
            // First time staking - initialize
            stake.stakeTimestamp = block.timestamp;
            stake.lastUpdateTimestamp = block.timestamp;
            stake.accumulatedPoints = 0; // Not used in simplified model
        }
        
        // Update stake amount (which equals points in 1:1 model)
        stake.amount += usdcAmount;
        stakerDeposits[msg.sender] += usdcAmount;
        totalDeposited += usdcAmount;
        totalPoolValue += usdcAmount;
        
        // CRITICAL FIX: Add points to total supply (1:1 with USDC)
        _addToTotalPoints(usdcAmount);
        
        emit Staked(msg.sender, usdcAmount, block.timestamp);
    }
    
    function unstakeFunds(uint256 usdcAmount) external nonReentrant {
        uint256 maxWithdrawable = getWithdrawableAmount(msg.sender);
        require(usdcAmount <= maxWithdrawable, "Insufficient withdrawable amount");
        require(usdcAmount > 0, "Amount must be > 0");
        
        PointsCalculations.StakeInfo storage stake = stakes[msg.sender];
        require(stake.amount > 0, "No stake found");
        
        // Check liquidity constraints
        uint256 currentLiquidity = usdc.balanceOf(address(this));
        require(currentLiquidity >= usdcAmount, "Insufficient liquidity");
        
        // Calculate fee
        uint256 utilization = LiquidityCalculations.getUtilizationRate(totalDeposited, currentLiquidity);
        uint256 exitFee = LiquidityCalculations.calculateExitFee(usdcAmount, utilization);
        
        // Calculate proportional reduction in user's stake
        uint256 currentPoints = PointsCalculations.calculateUserPoints(stake);
        (uint256 pointsToRemove, uint256 depositReduction, uint256 stakeReduction) = 
            PointsCalculations.calculateProportionalReduction(
                usdcAmount,
                maxWithdrawable, 
                currentPoints,
                stakerDeposits[msg.sender],
                stake.amount
            );
        
        // Update user's stake proportionally
        stake.amount -= stakeReduction;
        stakerDeposits[msg.sender] -= depositReduction;
        
        // CRITICAL FIX: Remove points from total supply (1:1 with stake reduction)
        _removeFromTotalPoints(stakeReduction);
        
        // Update global state
        totalDeposited -= depositReduction;
        totalPoolValue -= usdcAmount;
        
        // If fully unstaked, reset timestamps
        if (stake.amount == 0) {
            stake.stakeTimestamp = 0;
            stake.lastUpdateTimestamp = 0;
            stake.accumulatedPoints = 0;
        }
        
        // Transfer net amount to user
        uint256 netAmount = usdcAmount - exitFee;
        usdc.safeTransfer(msg.sender, netAmount);
        
        // Emit events
        if (exitFee > 0) {
            emit ExitFeeCharged(msg.sender, usdcAmount, exitFee);
        }
        
        emit Unstaked(msg.sender, usdcAmount, stakeReduction);
    }
    
    
    function claimDistributions() public nonReentrant {
        uint256 amount = pendingDistributions[msg.sender];
        require(amount > 0, "No distributions to claim");
        
        pendingDistributions[msg.sender] = 0;
        usdc.safeTransfer(msg.sender, amount);
        
        emit DistributionClaimed(msg.sender, amount);
    }
    
    // ============ Loan Functions ============
    
    function requestLoan(
        uint256 domainTokenId,
        uint256 requestedAmount,
        uint256 duration
    ) external nonReentrant returns (uint256) {
        // Enhanced validation with real Doma Protocol functions
        require(domaProtocol.exists(domainTokenId), "Domain does not exist");
        require(domaProtocol.ownerOf(domainTokenId) == msg.sender, "Not domain owner");
        require(!domaProtocol.lockStatusOf(domainTokenId), "Domain is locked");
        require(duration >= 5 minutes && duration <= 365 days, "Duration: 5 min to 365 days");
        
        // Doma Protocol specific validation: Check domain expiration
        uint256 domainExpiration = domaProtocol.expirationOf(domainTokenId);
        require(domainExpiration > block.timestamp, "Domain has expired");
        require(domainExpiration > block.timestamp + duration, "Domain expires before loan maturity");
        
        uint256 maxLoan = aiOracle.getMaxLoanAmount(domainTokenId);
        require(requestedAmount <= maxLoan, "Amount exceeds max loan");
        
        // Check liquidity constraints
        uint256 currentLiquidity = usdc.balanceOf(address(this));
        require(currentLiquidity >= requestedAmount, "Insufficient liquidity");
        
        // Ensure loan won't violate reserve requirements
        require(
            LiquidityCalculations.validateLoanAgainstReserves(requestedAmount, currentLiquidity, totalDeposited),
            "Would violate liquidity reserve"
        );
        
        // Calculate dynamic interest rate based on duration
        uint256 dynamicRate = calculateInterestRate(duration);
        
        // Transfer domain as collateral
        domaProtocol.safeTransferFrom(msg.sender, address(this), domainTokenId);
        
        uint256 loanId = nextLoanId++;
        loans[loanId] = LoanCalculations.Loan({
            domainTokenId: domainTokenId,
            borrower: msg.sender,
            principalAmount: requestedAmount,
            interestRate: dynamicRate,
            startTime: block.timestamp,
            duration: duration,
            amountRepaid: 0,
            isActive: true,
            isLiquidated: false
        });
        
        userLoans[msg.sender].push(loanId);
        
        // Transfer USDC to borrower
        usdc.safeTransfer(msg.sender, requestedAmount);
        
        // Reduce pool value when loan is disbursed
        totalPoolValue -= requestedAmount;
        
        emit LoanCreated(loanId, msg.sender, domainTokenId, requestedAmount, dynamicRate);
        
        return loanId;
    }
    
    function repayLoan(uint256 loanId, uint256 paymentAmount) external nonReentrant {
        LoanCalculations.Loan storage loan = loans[loanId];
        require(loan.isActive, "Loan not active");
        require(msg.sender == loan.borrower, "Not borrower");
        
        // Use slippage-protected calculation for payment validation
        uint256 totalOwedWithSlippage = LoanCalculations.calculateTotalOwedWithSlippage(loan);
        uint256 remainingBalance = totalOwedWithSlippage - loan.amountRepaid;
        require(paymentAmount <= remainingBalance, "Payment exceeds balance");
        
        // Transfer payment
        usdc.safeTransferFrom(msg.sender, address(this), paymentAmount);
        loan.amountRepaid += paymentAmount;
        
        // Calculate fee portion and principal portion
        (uint256 principalPortion, uint256 feePortion) = 
            LoanCalculations.calculatePaymentPortions(paymentAmount, loan.principalAmount, loan.amountRepaid);
        
        // Add repayment to pool value (principal maintains pool, fees grow it)
        totalPoolValue += paymentAmount;
        
        // Emit events for tracking
        if (feePortion > 0) {
            emit PoolValueUpdated(totalPoolValue, feePortion);
        }
        
        // Check if fully repaid using current (non-slippage) calculation
        uint256 currentTotalOwed = LoanCalculations.calculateTotalOwed(loan);
        if (loan.amountRepaid >= currentTotalOwed) {
            loan.isActive = false;
            domaProtocol.safeTransferFrom(address(this), loan.borrower, loan.domainTokenId);
            emit LoanFullyRepaid(loanId, msg.sender);
        }
        
        // Process withdrawal queue with new liquidity
        if (queueHead < queueTail) {
            _processWithdrawalQueue();
        }
        
        emit LoanRepaid(loanId, msg.sender, paymentAmount, currentTotalOwed - loan.amountRepaid);
    }
    
    // ============ Dutch Auction Functions ============
    
    function liquidateLoan(uint256 loanId) external {
        LoanCalculations.Loan storage loan = loans[loanId];
        require(loan.isActive, "Loan not active");
        require(LoanCalculations.isLoanDefaulted(loan), "Loan not defaulted");
        
        loan.isActive = false;
        loan.isLiquidated = true;
        
        uint256 totalOwed = LoanCalculations.calculateTotalOwed(loan);
        
        auctions[loanId] = AuctionCalculations.createAuction(loanId, totalOwed, loan.amountRepaid);
        
        emit AuctionStarted(loanId, auctions[loanId].startPrice, block.timestamp);
    }
    
    function getCurrentAuctionPrice(uint256 loanId) public view returns (uint256) {
        return AuctionCalculations.getCurrentAuctionPrice(auctions[loanId]);
    }
    
    function buyFromAuction(uint256 loanId) external nonReentrant {
        AuctionCalculations.DutchAuction storage auction = auctions[loanId];
        require(auction.isActive, "Auction not active");
        
        uint256 currentPrice = AuctionCalculations.getCurrentAuctionPrice(auction);
        
        // Transfer payment
        usdc.safeTransferFrom(msg.sender, address(this), currentPrice);
        
        // Distribute proceeds
        _distributePayment(currentPrice);
        
        // Transfer domain to buyer
        LoanCalculations.Loan memory loan = loans[loanId];
        domaProtocol.safeTransferFrom(address(this), msg.sender, loan.domainTokenId);
        
        // Close auction
        AuctionCalculations.finalizeAuction(auction, msg.sender, currentPrice);
        
        // Process withdrawal queue with new liquidity from auction
        if (queueHead < queueTail) {
            _processWithdrawalQueue();
        }
        
        emit AuctionCompleted(loanId, msg.sender, currentPrice);
    }
    
    // ============ Interest Rate Functions ============
    
    function calculateInterestRate(uint256 duration) public pure returns (uint256) {
        uint256 baseRate = BASE_INTEREST_RATE; // 8% annual base rate
        
        // Risk premium decreases with longer duration (research-based approach)
        if (duration < 1 hours) return baseRate + 4200;     // 50% annual (high risk premium)
        if (duration < 6 hours) return baseRate + 2200;     // 30% annual  
        if (duration < 1 days) return baseRate + 1200;      // 20% annual
        if (duration < 7 days) return baseRate + 700;       // 15% annual
        if (duration < 30 days) return baseRate + 200;      // 10% annual
        return baseRate;                                     // 8% annual (30+ days)
    }
    
    function previewLoanTerms(uint256 amount, uint256 duration) 
        external 
        view 
        returns (
            uint256 interestRate,
            uint256 minimumFee, 
            uint256 estimatedTotalFee,
            uint256 totalRepayment
        ) 
    {
        interestRate = calculateInterestRate(duration);
        minimumFee = LoanCalculations.calculateMinimumFee(amount);
        
        // Calculate time-based fee for full duration
        uint256 timeBased = (amount * interestRate * duration) / (365 days * 10000);
        estimatedTotalFee = timeBased > minimumFee ? timeBased : minimumFee;
        totalRepayment = amount + estimatedTotalFee;
    }

    // ============ Helper Functions ============
    
    function calculateTotalOwed(uint256 loanId) public view returns (uint256) {
        return LoanCalculations.calculateTotalOwed(loans[loanId]);
    }
    
    function calculateTotalOwedWithSlippage(uint256 loanId) public view returns (uint256) {
        return LoanCalculations.calculateTotalOwedWithSlippage(loans[loanId]);
    }
    
    function calculateMinimumFee(uint256 principal) public pure returns (uint256) {
        return LoanCalculations.calculateMinimumFee(principal);
    }
    
    function getWithdrawableAmount(address user) public view returns (uint256) {
        uint256 userPoints = PointsCalculations.calculateUserPoints(stakes[user]);
        uint256 totalPoints = getTotalPoints();
        
        return PointsCalculations.calculateWithdrawableAmount(
            userPoints,
            totalPoints, 
            totalPoolValue,
            stakerDeposits[user]
        );
    }
    
    function getPoolPerformance() external view returns (uint256 totalStaked, uint256 currentValue, uint256 yieldEarned) {
        totalStaked = totalDeposited;
        currentValue = totalPoolValue;
        yieldEarned = totalPoolValue > totalDeposited ? totalPoolValue - totalDeposited : 0;
    }
    
    function getUserYieldEarned(address user) external view returns (uint256) {
        uint256 originalStake = stakerDeposits[user];
        uint256 currentValue = getWithdrawableAmount(user);
        return PointsCalculations.calculateYieldEarned(currentValue, originalStake);
    }
    
    // ============ Development Emergency Functions ============
    
    /**
     * @notice Migration function to fix points for existing stakers
     * @dev Temporary function to migrate to simplified points system
     * @param stakers Array of staker addresses to migrate
     */
    function migrateStakersToSimplifiedPoints(address[] calldata stakers) external onlyOwner {
        uint256 newTotalPoints = 0;
        
        for (uint256 i = 0; i < stakers.length; i++) {
            PointsCalculations.StakeInfo storage stake = stakes[stakers[i]];
            if (stake.amount > 0) {
                // In simplified model, points = stake amount (1:1)
                newTotalPoints += stake.amount;
            }
        }
        
        // Update total points supply to match actual stakes
        totalPointSupply = newTotalPoints;
        
        emit PointsMigrated(stakers.length, newTotalPoints);
    }
    
    /**
     * @notice Emergency function to recover stuck assets during development
     * @dev ONLY FOR DEVELOPMENT/TESTNET - Should be removed before mainnet
     * @param tokenId Domain token ID to recover (0 = skip domain recovery)
     * @param usdcAmount USDC amount to recover (0 = recover all)
     */
    function retakeStuckAssetAndDomainInDevelopment(uint256 tokenId, uint256 usdcAmount) external onlyOwner {
        require(block.chainid != 1 && block.chainid != 137, "Function disabled on mainnet");
        
        address deployer = owner();
        
        // Recover stuck domain if tokenId provided
        if (tokenId != 0) {
            try domaProtocol.ownerOf(tokenId) returns (address currentOwner) {
                if (currentOwner == address(this)) {
                    domaProtocol.safeTransferFrom(address(this), deployer, tokenId);
                    emit EmergencyDomainRecovered(tokenId, deployer);
                }
            } catch {
                // Domain doesn't exist or error - skip
            }
        }
        
        // Recover stuck USDC
        uint256 contractBalance = usdc.balanceOf(address(this));
        if (contractBalance > 0) {
            uint256 amountToRecover = usdcAmount == 0 ? contractBalance : usdcAmount;
            if (amountToRecover > contractBalance) {
                amountToRecover = contractBalance;
            }
            
            usdc.safeTransfer(deployer, amountToRecover);
            emit EmergencyUSDCRecovered(amountToRecover, deployer);
        }
    }
    
    // ============ Liquidity Management Functions ============
    
    function getUtilizationRate() public view returns (uint256) {
        return LiquidityCalculations.getUtilizationRate(totalDeposited, usdc.balanceOf(address(this)));
    }
    
    function calculateExitFee(uint256 requestedAmount) public view returns (uint256) {
        uint256 utilization = getUtilizationRate();
        return LiquidityCalculations.calculateExitFee(requestedAmount, utilization);
    }
    
    function isLiquidityAdequate() public view returns (bool) {
        return LiquidityCalculations.isLiquidityAdequate(usdc.balanceOf(address(this)), totalDeposited);
    }
    
    function getAvailableLiquidity() public view returns (uint256) {
        return LiquidityCalculations.getAvailableLiquidity(usdc.balanceOf(address(this)), totalDeposited);
    }
    
    // ============ Withdrawal Queue Functions ============
    
    function queueWithdrawal(uint256 amount) external nonReentrant {
        PointsCalculations.StakeInfo storage stake = stakes[msg.sender];
        require(stake.amount >= amount, "Insufficient staked amount");
        
        _queueWithdrawal(msg.sender, amount);
    }
    
    function _queueWithdrawal(address user, uint256 amount) internal {
        PointsCalculations.StakeInfo storage stake = stakes[user];
        
        // Calculate stake duration for priority (longer stakes get higher priority)
        uint256 stakeDuration = block.timestamp - stake.stakeTimestamp;
        
        // Add to queue
        withdrawalQueue[queueTail] = LiquidityCalculations.createWithdrawalRequest(user, amount, stakeDuration);
        
        emit WithdrawalQueued(queueTail, user, amount, stakeDuration);
        queueTail++;
    }
    
    function processWithdrawalQueue() public nonReentrant {
        _processWithdrawalQueue();
    }
    
    function _processWithdrawalQueue() internal {
        uint256 availableLiquidity = getAvailableLiquidity();
        
        while (queueHead < queueTail && availableLiquidity > 0) {
            LiquidityCalculations.WithdrawalRequest storage request = withdrawalQueue[queueHead];
            
            if (request.fulfilled) {
                queueHead++;
                continue;
            }
            
            if (LiquidityCalculations.canFulfillWithdrawal(request.amount, availableLiquidity)) {
                _executeWithdrawal(request.user, request.amount);
                request.fulfilled = true;
                availableLiquidity -= request.amount;
                
                emit WithdrawalFulfilled(queueHead, request.user, request.amount);
                queueHead++;
            } else {
                break; // Not enough liquidity for this request
            }
        }
    }
    
    function _executeWithdrawal(address user, uint256 amount) internal {
        PointsCalculations.StakeInfo storage stake = stakes[user];
        
        // Update user points before withdrawal
        stake.updateStakeInfo();
        
        // Calculate proportional point reduction
        uint256 currentPoints = stake.accumulatedPoints;
        uint256 pointsToRemove = (currentPoints * amount) / stake.amount;
        
        // Update stake info
        stake.amount -= amount;
        stake.accumulatedPoints -= pointsToRemove;
        
        // If fully unstaked, reset timestamps
        if (stake.amount == 0) {
            stake.stakeTimestamp = 0;
            stake.lastUpdateTimestamp = 0;
            stake.accumulatedPoints = 0;
        }
        
        stakerDeposits[user] -= amount;
        totalDeposited -= amount;
        
        usdc.safeTransfer(user, amount);
        
        emit Unstaked(user, amount, pointsToRemove);
    }
    
    function getQueueStatus(address user) external view returns (uint256[] memory requestIds, uint256[] memory amounts, bool[] memory fulfilled) {
        uint256 count = 0;
        
        // First pass: count user's requests
        for (uint256 i = queueHead; i < queueTail; i++) {
            if (withdrawalQueue[i].user == user) {
                count++;
            }
        }
        
        // Second pass: fill arrays
        requestIds = new uint256[](count);
        amounts = new uint256[](count);
        fulfilled = new bool[](count);
        
        uint256 index = 0;
        for (uint256 i = queueHead; i < queueTail; i++) {
            if (withdrawalQueue[i].user == user) {
                requestIds[index] = i;
                amounts[index] = withdrawalQueue[i].amount;
                fulfilled[index] = withdrawalQueue[i].fulfilled;
                index++;
            }
        }
    }
    
    function _distributePayment(uint256 totalAmount) internal {
        if (totalDeposited == 0) return;
        
        // Update total point supply cache
        _updateTotalPointSupply();
        
        if (totalPointSupply == 0) return;
        
        // For simplicity, we'll track distributions for claiming
        // In production, you might want a more efficient distribution mechanism
        emit PaymentDistributed(nextLoanId - 1, totalAmount);
    }
    
    function getUserPointsShare(address user) external view returns (uint256) {
        uint256 userPoints = PointsCalculations.calculateUserPoints(stakes[user]);
        uint256 totalPoints = getTotalPoints();
        
        return PointsCalculations.calculateUserPointsShare(userPoints, totalPoints);
    }
    
    function getLoanTerms(uint256 domainTokenId) external view returns (
        uint256 maxLoan, 
        uint256 interestRate, 
        uint256 domainExpiration,
        bool isEligible
    ) {
        maxLoan = aiOracle.getMaxLoanAmount(domainTokenId);
        interestRate = BASE_INTEREST_RATE;
        domainExpiration = domaProtocol.expirationOf(domainTokenId);
        
        // Domain is eligible if it hasn't expired and has reasonable time left
        isEligible = domainExpiration > block.timestamp + 7 days; // Minimum 7 days remaining
    }
    
    // Helper function to get comprehensive domain information
    function getDomainInfo(uint256 domainTokenId) external view returns (
        address owner,
        uint256 expiration,
        uint256 registrarId,
        bool isExpired,
        bool isLocked
    ) {
        require(domaProtocol.exists(domainTokenId), "Domain does not exist");
        owner = domaProtocol.ownerOf(domainTokenId);
        expiration = domaProtocol.expirationOf(domainTokenId);
        registrarId = domaProtocol.registrarOf(domainTokenId);
        isExpired = expiration <= block.timestamp;
        isLocked = domaProtocol.lockStatusOf(domainTokenId);
    }
    
    // ============ Time-based Points Functions ============
    
    function getUserPoints(address user) public view returns (uint256) {
        return PointsCalculations.calculateUserPoints(stakes[user]);
    }
    
    function getTotalPoints() public view returns (uint256) {
        // Return the properly maintained total points supply
        return totalPointSupply;
    }
    
    function _updateTotalPointSupply() internal {
        // This function should be called whenever points change
        // For efficiency, we maintain a running total
        lastPointSupplyUpdate = block.timestamp;
    }
    
    function _addToTotalPoints(uint256 pointsToAdd) internal {
        totalPointSupply += pointsToAdd;
    }
    
    function _removeFromTotalPoints(uint256 pointsToRemove) internal {
        if (pointsToRemove > totalPointSupply) {
            totalPointSupply = 0;
        } else {
            totalPointSupply -= pointsToRemove;
        }
    }
    
    
    // ============ Admin Functions ============
    
    function setAIOracle(address _aiOracle) external onlyOwner {
        aiOracle = IAIOracle(_aiOracle);
    }
    
    // Emergency function to withdraw stuck tokens
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
    
    // IERC721Receiver implementation
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
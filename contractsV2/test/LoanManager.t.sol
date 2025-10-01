// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/legacy/LoanManager.sol";
import "../src/interfaces/ILoanManager.sol";

contract MockUSDC is IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(_balances[msg.sender] >= amount, "Insufficient balance");
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(_balances[from] >= amount, "Insufficient balance");
        require(_allowances[from][msg.sender] >= amount, "Insufficient allowance");
        _balances[from] -= amount;
        _balances[to] += amount;
        _allowances[from][msg.sender] -= amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        return true;
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
        _totalSupply += amount;
    }
}

contract MockDoma is IDoma {
    mapping(uint256 => address) private _owners;
    mapping(uint256 => uint256) private _expiries;
    mapping(uint256 => string) private _names;
    mapping(uint256 => address) private _approvals;

    function ownerOf(uint256 tokenId) external view returns (address) {
        return _owners[tokenId];
    }

    function expirationOf(uint256 tokenId) external view returns (uint256) {
        return _expiries[tokenId];
    }

    function exists(uint256 tokenId) external view returns (bool) {
        return _owners[tokenId] != address(0);
    }

    function setDomain(uint256 tokenId, address owner, uint256 expiry, string memory name) external {
        _owners[tokenId] = owner;
        _expiries[tokenId] = expiry;
        _names[tokenId] = name;
    }

    function transferFrom(address from, address to, uint256 tokenId) external {
        require(_owners[tokenId] == from || _approvals[tokenId] == msg.sender, "Not approved");
        _owners[tokenId] = to;
    }

    function approve(address to, uint256 tokenId) external {
        _approvals[tokenId] = to;
    }

    // Required ERC721 functions (minimal implementation)
    function balanceOf(address) external pure returns (uint256) { return 0; }
    function getApproved(uint256 tokenId) external view returns (address) { return _approvals[tokenId]; }
    function isApprovedForAll(address, address) external pure returns (bool) { return false; }
    function safeTransferFrom(address, address, uint256) external pure {}
    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {}
    function setApprovalForAll(address, bool) external pure {}
    function supportsInterface(bytes4) external pure returns (bool) { return false; }
}

contract MockSatoruLending is ISatoruLending {
    mapping(uint256 => PoolInfo) private pools;

    struct PoolInfo {
        address creator;
        uint256 totalLiquidity;
        uint256 availableLiquidity;
        uint256 minAiScore;
        uint256 interestRate;
        bool isActive;
        uint256 totalLoansIssued;
    }

    function setPool(
        uint256 poolId,
        address creator,
        uint256 totalLiquidity,
        uint256 availableLiquidity,
        uint256 minAiScore,
        uint256 interestRate,
        bool isActive,
        uint256 totalLoansIssued
    ) external {
        pools[poolId] = PoolInfo({
            creator: creator,
            totalLiquidity: totalLiquidity,
            availableLiquidity: availableLiquidity,
            minAiScore: minAiScore,
            interestRate: interestRate,
            isActive: isActive,
            totalLoansIssued: totalLoansIssued
        });
    }

    function addLiquidity(uint256, uint256) external {}

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
            uint256 totalLoansIssued
        )
    {
        PoolInfo memory pool = pools[poolId];
        return (
            pool.creator,
            pool.totalLiquidity,
            pool.availableLiquidity,
            pool.minAiScore,
            pool.interestRate,
            pool.isActive,
            pool.totalLoansIssued
        );
    }
}

contract MockDutchAuction is IDutchAuction {
    uint256 private nextAuctionId = 1;
    mapping(uint256 => AuctionInfo) private auctions;

    struct AuctionInfo {
        uint256 domainTokenId;
        uint256 startingPrice;
        uint256 currentPrice;
        uint256 reservePrice;
        uint256 endTime;
        address highestBidder;
        bool isActive;
    }

    function startAuction(StartAuctionParams memory params)
        external
        returns (uint256 auctionId)
    {
        auctionId = nextAuctionId++;
        uint256 startingPrice = params.loanAmount * 2; // 2x loan amount
        uint256 reservePrice = (params.loanAmount * 60) / 100; // 60% for medium score
        auctions[auctionId] = AuctionInfo({
            domainTokenId: params.domainTokenId,
            startingPrice: startingPrice,
            currentPrice: startingPrice,
            reservePrice: reservePrice,
            endTime: block.timestamp + 30 days,
            highestBidder: address(0),
            isActive: true
        });
    }

    function getCurrentPrice(uint256 auctionId) external view returns (uint256) {
        return auctions[auctionId].currentPrice;
    }

    function placeBid(uint256, uint256) external {}

    function endAuction(uint256) external {}

    function getAuctionInfo(uint256 auctionId)
        external
        view
        returns (
            uint256 domainTokenId,
            uint256 startingPrice,
            uint256 currentPrice,
            uint256 reservePrice,
            uint256 endTime,
            address highestBidder,
            bool isActive
        )
    {
        AuctionInfo memory auction = auctions[auctionId];
        return (
            auction.domainTokenId,
            auction.startingPrice,
            auction.currentPrice,
            auction.reservePrice,
            auction.endTime,
            auction.highestBidder,
            auction.isActive
        );
    }
}

contract LoanManagerTest is Test {
    // Events from LoanManager contract
    event LoanCreated(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 indexed domainTokenId,
        uint256 principalAmount,
        uint256 interestRate,
        uint256 duration,
        uint256 totalOwed,
        uint256 dueDate,
        uint256 poolId,
        uint256 requestId
    );

    event LoanRepaid(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 repaymentAmount,
        uint256 remainingBalance,
        bool isFullyRepaid,
        uint256 timestamp
    );

    event CollateralLocked(
        uint256 indexed loanId,
        uint256 indexed domainTokenId,
        address indexed borrower,
        uint256 lockTimestamp
    );

    event CollateralReleased(
        uint256 indexed loanId,
        uint256 indexed domainTokenId,
        address indexed borrower,
        uint256 releaseTimestamp
    );

    event CollateralLiquidated(
        uint256 indexed loanId,
        uint256 indexed domainTokenId,
        address indexed borrower,
        uint256 loanAmount,
        uint256 auctionId,
        uint256 startingPrice
    );

    LoanManager public loanManager;
    MockUSDC public usdc;
    MockDoma public doma;
    MockSatoruLending public satoruLending;
    MockDutchAuction public dutchAuction;

    address public owner;
    address public borrower;
    address public poolCreator;
    address public lender1;
    address public lender2;

    uint256 constant DOMAIN_TOKEN_ID = 1;
    uint256 constant POOL_ID = 1;
    uint256 constant LOAN_AMOUNT = 5000e6; // 5k USDC
    uint256 constant INTEREST_RATE = 800; // 8%
    uint256 constant DURATION = 30 days;

    function setUp() public {
        owner = makeAddr("owner");
        borrower = makeAddr("borrower");
        poolCreator = makeAddr("poolCreator");
        lender1 = makeAddr("lender1");
        lender2 = makeAddr("lender2");

        // Deploy mock contracts
        usdc = new MockUSDC();
        doma = new MockDoma();
        satoruLending = new MockSatoruLending();
        dutchAuction = new MockDutchAuction();

        // Deploy LoanManager
        vm.prank(owner);
        loanManager = new LoanManager(owner, address(usdc), address(doma), address(satoruLending));

        // Set Dutch auction
        vm.prank(owner);
        loanManager.setDutchAuction(address(dutchAuction));

        // Set up domain
        doma.setDomain(DOMAIN_TOKEN_ID, borrower, block.timestamp + 365 days, "nike.com");

        // Approve LoanManager to transfer domain
        vm.prank(borrower);
        doma.approve(address(loanManager), DOMAIN_TOKEN_ID);

        // Set up pool
        satoruLending.setPool(POOL_ID, poolCreator, 100000e6, 50000e6, 80, 800, true, 0);

        // Set up USDC balances
        usdc.mint(borrower, 100000e6);
        usdc.mint(lender1, 100000e6);
        usdc.mint(lender2, 100000e6);

        // Approve USDC spending
        vm.prank(borrower);
        usdc.approve(address(loanManager), type(uint256).max);

        vm.prank(lender1);
        usdc.approve(address(loanManager), type(uint256).max);

        vm.prank(lender2);
        usdc.approve(address(loanManager), type(uint256).max);
    }

    function testCreatePoolBasedLoan() public {
        ILoanManager.CreateLoanParams memory params = ILoanManager.CreateLoanParams({
            borrower: borrower,
            domainTokenId: DOMAIN_TOKEN_ID,
            loanAmount: LOAN_AMOUNT,
            interestRate: INTEREST_RATE,
            duration: DURATION,
            aiScore: 98,
            poolId: POOL_ID,
            requestId: 0
        });

        uint256 expectedTotalOwed = LOAN_AMOUNT + (LOAN_AMOUNT * INTEREST_RATE * DURATION) / (10000 * 365 days);

        vm.expectEmit(true, true, true, true, address(loanManager));
        emit LoanCreated(
            1,
            borrower,
            DOMAIN_TOKEN_ID,
            LOAN_AMOUNT,
            INTEREST_RATE,
            DURATION,
            expectedTotalOwed,
            block.timestamp + DURATION,
            POOL_ID,
            0
        );

        vm.prank(address(satoruLending));
        uint256 loanId = loanManager.createPoolBasedLoan(params);

        assertEq(loanId, 1);
        assertTrue(loanManager.isCollateralLocked(DOMAIN_TOKEN_ID));

        (
            address loanBorrower,
            uint256 domainId,
            uint256 loanAmount,
            uint256 interestRate,
            uint256 repaymentDeadline,
            bool isActive
        ) = loanManager.getLoanInfo(loanId);

        assertEq(loanBorrower, borrower);
        assertEq(domainId, DOMAIN_TOKEN_ID);
        assertEq(loanAmount, LOAN_AMOUNT);
        assertEq(interestRate, INTEREST_RATE);
        assertEq(repaymentDeadline, block.timestamp + DURATION);
        assertTrue(isActive);
    }

    function testCreateCrowdfundedLoan() public {
        address[] memory contributors = new address[](2);
        contributors[0] = lender1;
        contributors[1] = lender2;

        uint256[] memory contributions = new uint256[](2);
        contributions[0] = 3000e6;
        contributions[1] = 2000e6;

        ILoanManager.CreateLoanParams memory params = ILoanManager.CreateLoanParams({
            borrower: borrower,
            domainTokenId: DOMAIN_TOKEN_ID,
            loanAmount: LOAN_AMOUNT,
            interestRate: INTEREST_RATE,
            duration: DURATION,
            aiScore: 98,
            poolId: 0,
            requestId: 1
        });

        ILoanManager.CrowdfundedLoanData memory loanData = ILoanManager.CrowdfundedLoanData({
            contributors: contributors,
            contributions: contributions,
            totalContributions: LOAN_AMOUNT
        });

        vm.prank(address(satoruLending));
        uint256 loanId = loanManager.createCrowdfundedLoan(params, loanData);

        assertEq(loanId, 1);
        assertTrue(loanManager.isCollateralLocked(DOMAIN_TOKEN_ID));
    }

    function testRepayLoanFull() public {
        // Create loan first
        ILoanManager.CreateLoanParams memory params = ILoanManager.CreateLoanParams({
            borrower: borrower,
            domainTokenId: DOMAIN_TOKEN_ID,
            loanAmount: LOAN_AMOUNT,
            interestRate: INTEREST_RATE,
            duration: DURATION,
            aiScore: 98,
            poolId: POOL_ID,
            requestId: 0
        });

        vm.prank(address(satoruLending));
        uint256 loanId = loanManager.createPoolBasedLoan(params);

        (uint256 totalOwed,) = loanManager.calculateCurrentOwed(loanId);

        vm.expectEmit(true, true, false, true, address(loanManager));
        emit LoanRepaid(loanId, borrower, totalOwed, 0, true, block.timestamp);

        vm.expectEmit(true, true, true, true, address(loanManager));
        emit CollateralReleased(loanId, DOMAIN_TOKEN_ID, borrower, block.timestamp);

        vm.prank(borrower);
        loanManager.repayLoan(loanId, totalOwed);

        // Check collateral released
        assertFalse(loanManager.isCollateralLocked(DOMAIN_TOKEN_ID));
        assertEq(doma.ownerOf(DOMAIN_TOKEN_ID), borrower);
    }

    function testRepayLoanPartial() public {
        // Create loan first
        ILoanManager.CreateLoanParams memory params = ILoanManager.CreateLoanParams({
            borrower: borrower,
            domainTokenId: DOMAIN_TOKEN_ID,
            loanAmount: LOAN_AMOUNT,
            interestRate: INTEREST_RATE,
            duration: DURATION,
            aiScore: 98,
            poolId: POOL_ID,
            requestId: 0
        });

        vm.prank(address(satoruLending));
        uint256 loanId = loanManager.createPoolBasedLoan(params);

        (uint256 totalOwed,) = loanManager.calculateCurrentOwed(loanId);
        uint256 partialPayment = totalOwed / 2;

        vm.prank(borrower);
        loanManager.repayLoan(loanId, partialPayment);

        (uint256 newTotalOwed, uint256 remainingBalance) = loanManager.calculateCurrentOwed(loanId);
        assertEq(newTotalOwed, totalOwed);
        assertEq(remainingBalance, totalOwed - partialPayment);

        // Collateral should still be locked
        assertTrue(loanManager.isCollateralLocked(DOMAIN_TOKEN_ID));
    }

    function testLiquidateDefaultedLoan() public {
        // Create loan first
        ILoanManager.CreateLoanParams memory params = ILoanManager.CreateLoanParams({
            borrower: borrower,
            domainTokenId: DOMAIN_TOKEN_ID,
            loanAmount: LOAN_AMOUNT,
            interestRate: INTEREST_RATE,
            duration: DURATION,
            aiScore: 98,
            poolId: POOL_ID,
            requestId: 0
        });

        vm.prank(address(satoruLending));
        uint256 loanId = loanManager.createPoolBasedLoan(params);

        // Fast forward past due date + buffer
        vm.warp(block.timestamp + DURATION + loanManager.LIQUIDATION_BUFFER() + 1);

        assertTrue(loanManager.isLoanDefaulted(loanId));

        (uint256 totalOwed,) = loanManager.calculateCurrentOwed(loanId);
        uint256 expectedStartingPrice = totalOwed * 2;

        vm.expectEmit(true, true, true, true, address(loanManager));
        emit CollateralLiquidated(
            loanId,
            DOMAIN_TOKEN_ID,
            borrower,
            totalOwed,
            1, // First auction
            expectedStartingPrice
        );

        uint256 auctionId = loanManager.liquidateCollateral(loanId);
        assertEq(auctionId, 1);
    }

    function testCannotLiquidateActiveLoan() public {
        // Create loan first
        ILoanManager.CreateLoanParams memory params = ILoanManager.CreateLoanParams({
            borrower: borrower,
            domainTokenId: DOMAIN_TOKEN_ID,
            loanAmount: LOAN_AMOUNT,
            interestRate: INTEREST_RATE,
            duration: DURATION,
            aiScore: 98,
            poolId: POOL_ID,
            requestId: 0
        });

        vm.prank(address(satoruLending));
        uint256 loanId = loanManager.createPoolBasedLoan(params);

        assertFalse(loanManager.isLoanDefaulted(loanId));

        vm.expectRevert("Loan not defaulted");
        loanManager.liquidateCollateral(loanId);
    }

    function testReleaseCollateralAfterFullPayment() public {
        // Create loan first
        ILoanManager.CreateLoanParams memory params = ILoanManager.CreateLoanParams({
            borrower: borrower,
            domainTokenId: DOMAIN_TOKEN_ID,
            loanAmount: LOAN_AMOUNT,
            interestRate: INTEREST_RATE,
            duration: DURATION,
            aiScore: 98,
            poolId: POOL_ID,
            requestId: 0
        });

        vm.prank(address(satoruLending));
        uint256 loanId = loanManager.createPoolBasedLoan(params);

        (uint256 totalOwed,) = loanManager.calculateCurrentOwed(loanId);

        // Repay loan fully
        vm.prank(borrower);
        loanManager.repayLoan(loanId, totalOwed);

        // Collateral should be automatically released
        assertFalse(loanManager.isCollateralLocked(DOMAIN_TOKEN_ID));
        assertEq(doma.ownerOf(DOMAIN_TOKEN_ID), borrower);
    }

    function testUnauthorizedLoanCreation() public {
        ILoanManager.CreateLoanParams memory params = ILoanManager.CreateLoanParams({
            borrower: borrower,
            domainTokenId: DOMAIN_TOKEN_ID,
            loanAmount: LOAN_AMOUNT,
            interestRate: INTEREST_RATE,
            duration: DURATION,
            aiScore: 98,
            poolId: POOL_ID,
            requestId: 0
        });

        vm.prank(borrower);
        vm.expectRevert("Only SatoruLending");
        loanManager.createPoolBasedLoan(params);
    }

    function testProtocolStats() public {
        // Create a loan
        ILoanManager.CreateLoanParams memory params = ILoanManager.CreateLoanParams({
            borrower: borrower,
            domainTokenId: DOMAIN_TOKEN_ID,
            loanAmount: LOAN_AMOUNT,
            interestRate: INTEREST_RATE,
            duration: DURATION,
            aiScore: 98,
            poolId: POOL_ID,
            requestId: 0
        });

        vm.prank(address(satoruLending));
        uint256 loanId = loanManager.createPoolBasedLoan(params);

        (
            uint256 totalLoans,
            uint256 totalRepaid,
            uint256 totalLiquidated,
            uint256 totalInterest,
            uint256 activeLoans
        ) = loanManager.getProtocolStats();

        assertEq(totalLoans, 1);
        assertEq(totalRepaid, 0);
        assertEq(totalLiquidated, 0);
        assertEq(totalInterest, 0);
        assertEq(activeLoans, 1);

        // Repay the loan
        (uint256 totalOwed,) = loanManager.calculateCurrentOwed(loanId);
        vm.prank(borrower);
        loanManager.repayLoan(loanId, totalOwed);

        (totalLoans, totalRepaid, totalLiquidated, totalInterest, activeLoans) = loanManager.getProtocolStats();

        assertEq(totalLoans, 1);
        assertEq(totalRepaid, 1);
        assertEq(totalLiquidated, 0);
        assertGt(totalInterest, 0);
        assertEq(activeLoans, 0);
    }

    function testOverpaymentRefund() public {
        // Create loan first
        ILoanManager.CreateLoanParams memory params = ILoanManager.CreateLoanParams({
            borrower: borrower,
            domainTokenId: DOMAIN_TOKEN_ID,
            loanAmount: LOAN_AMOUNT,
            interestRate: INTEREST_RATE,
            duration: DURATION,
            aiScore: 98,
            poolId: POOL_ID,
            requestId: 0
        });

        vm.prank(address(satoruLending));
        uint256 loanId = loanManager.createPoolBasedLoan(params);

        (uint256 totalOwed,) = loanManager.calculateCurrentOwed(loanId);
        uint256 overpayment = totalOwed + 1000e6;

        uint256 balanceBefore = usdc.balanceOf(borrower);

        vm.prank(borrower);
        loanManager.repayLoan(loanId, overpayment);

        uint256 balanceAfter = usdc.balanceOf(borrower);

        // Should have received overpayment back
        assertEq(balanceBefore - balanceAfter, totalOwed);
    }

    function testCannotRepayNonexistentLoan() public {
        vm.prank(borrower);
        vm.expectRevert("Loan does not exist");
        loanManager.repayLoan(999, 1000e6);
    }

    function testDomainAlreadyLocked() public {
        ILoanManager.CreateLoanParams memory params = ILoanManager.CreateLoanParams({
            borrower: borrower,
            domainTokenId: DOMAIN_TOKEN_ID,
            loanAmount: LOAN_AMOUNT,
            interestRate: INTEREST_RATE,
            duration: DURATION,
            aiScore: 98,
            poolId: POOL_ID,
            requestId: 0
        });

        vm.prank(address(satoruLending));
        loanManager.createPoolBasedLoan(params);

        // Try to create another loan with same domain
        vm.prank(address(satoruLending));
        vm.expectRevert("Domain already locked");
        loanManager.createPoolBasedLoan(params);
    }

    function testInterestCalculation() public {
        uint256 principal = 10000e6; // 10k USDC
        uint256 rate = 1000; // 10%
        uint256 duration = 365 days; // 1 year

        ILoanManager.CreateLoanParams memory params = ILoanManager.CreateLoanParams({
            borrower: borrower,
            domainTokenId: DOMAIN_TOKEN_ID,
            loanAmount: principal,
            interestRate: rate,
            duration: duration,
            aiScore: 98,
            poolId: POOL_ID,
            requestId: 0
        });

        vm.prank(address(satoruLending));
        uint256 loanId = loanManager.createPoolBasedLoan(params);

        (uint256 totalOwed,) = loanManager.calculateCurrentOwed(loanId);

        // Expected: 10000 + (10000 * 10% * 1 year) = 11000
        uint256 expectedTotal = principal + (principal * rate * duration) / (10000 * 365 days);
        assertEq(totalOwed, expectedTotal);
    }
}
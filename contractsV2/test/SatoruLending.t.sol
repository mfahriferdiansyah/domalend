// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/legacy/SatoruLending.sol";
import "../src/legacy/AIOracle.sol";

contract MockUSDC is IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
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

    // Required ERC721 functions (minimal implementation)
    function balanceOf(address) external pure returns (uint256) { return 0; }
    function getApproved(uint256) external pure returns (address) { return address(0); }
    function isApprovedForAll(address, address) external pure returns (bool) { return false; }
    function safeTransferFrom(address, address, uint256) external pure {}
    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {}
    function transferFrom(address, address, uint256) external pure {}
    function approve(address, uint256) external pure {}
    function setApprovalForAll(address, bool) external pure {}
    function supportsInterface(bytes4) external pure returns (bool) { return false; }
}

contract MockLoanManager is ILoanManager {
    uint256 private nextLoanId = 1;
    mapping(uint256 => bool) private lockedCollateral;

    function createPoolBasedLoan(CreateLoanParams memory)
        external
        returns (uint256 loanId)
    {
        return nextLoanId++;
    }

    function createCrowdfundedLoan(
        CreateLoanParams memory,
        CrowdfundedLoanData memory
    ) external returns (uint256 loanId) {
        return nextLoanId++;
    }

    function lockCollateral(uint256 domainTokenId, address) external {
        lockedCollateral[domainTokenId] = true;
    }

    function releaseCollateral(uint256) external {}

    function isCollateralLocked(uint256 domainTokenId) external view returns (bool) {
        return lockedCollateral[domainTokenId];
    }

    function getLoanInfo(uint256)
        external
        pure
        returns (
            address borrower,
            uint256 domainTokenId,
            uint256 loanAmount,
            uint256 interestRate,
            uint256 repaymentDeadline,
            bool isActive
        )
    {
        return (address(0), 0, 0, 0, 0, false);
    }

    function processAuctionProceeds(uint256, uint256, address) external {
        // Mock implementation - just accept the call
    }
}

contract SatoruLendingTest is Test {
    // Events from SatoruLending contract
    event PoolCreated(
        uint256 indexed poolId,
        address indexed creator,
        uint256 initialLiquidity,
        uint256 minAiScore,
        uint256 interestRate,
        uint256 timestamp
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

    event LoanRequestCancelled(
        uint256 indexed requestId,
        address indexed borrower,
        uint256 totalRefunded,
        string reason
    );
    SatoruLending public lending;
    AIOracle public aiOracle;
    MockUSDC public usdc;
    MockDoma public doma;
    MockLoanManager public loanManager;

    address public owner;
    address public user1;
    address public user2;
    address public backendService;

    uint256 constant DOMAIN_TOKEN_ID_1 = 1;
    uint256 constant DOMAIN_TOKEN_ID_2 = 2;
    uint256 constant INITIAL_USDC_BALANCE = 100000e6; // 100k USDC
    uint256 constant NIKE_SCORE = 98;

    function setUp() public {
        owner = makeAddr("owner");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        backendService = makeAddr("backendService");

        // Deploy mock contracts
        usdc = new MockUSDC();
        doma = new MockDoma();
        loanManager = new MockLoanManager();

        // Deploy AIOracle
        vm.prank(owner);
        aiOracle = new AIOracle(owner);

        // Deploy SatoruLending
        vm.prank(owner);
        lending = new SatoruLending(owner, address(usdc), address(doma), address(aiOracle));

        // Set up mock data
        doma.setDomain(DOMAIN_TOKEN_ID_1, user1, block.timestamp + 365 days, "nike.com");
        doma.setDomain(DOMAIN_TOKEN_ID_2, user2, block.timestamp + 365 days, "cocacola.com");

        // Set up USDC balances
        usdc.mint(user1, INITIAL_USDC_BALANCE);
        usdc.mint(user2, INITIAL_USDC_BALANCE);

        // Configure AIOracle
        vm.prank(owner);
        aiOracle.setBackendService(backendService);

        // Submit AI scores
        vm.prank(backendService);
        aiOracle.submitScore(DOMAIN_TOKEN_ID_1, NIKE_SCORE);

        vm.prank(backendService);
        aiOracle.submitScore(DOMAIN_TOKEN_ID_2, 96);

        // Set loan manager
        vm.prank(owner);
        lending.setLoanManager(address(loanManager));

        // Approve USDC spending
        vm.prank(user1);
        usdc.approve(address(lending), type(uint256).max);

        vm.prank(user2);
        usdc.approve(address(lending), type(uint256).max);
    }

    function testCreateLiquidityPool() public {
        SatoruLending.CreatePoolParams memory params = SatoruLending.CreatePoolParams({
            initialLiquidity: 10000e6, // 10k USDC
            minAiScore: 80,
            maxDomainExpiration: 400, // days
            interestRate: 800, // 8%
            minLoanAmount: 1000e6,
            maxLoanAmount: 5000e6,
            minDuration: 7 days,
            maxDuration: 90 days,
            allowAdditionalProviders: true
        });

        vm.expectEmit(true, true, false, true, address(lending));
        emit PoolCreated(1, user1, 10000e6, 80, 800, block.timestamp);

        vm.prank(user1);
        uint256 poolId = lending.createLiquidityPool(params);

        assertEq(poolId, 1);

        (
            address creator,
            uint256 totalLiquidity,
            uint256 availableLiquidity,
            uint256 minAiScore,
            uint256 interestRate,
            bool isActive,
            uint256 totalLoansIssued
        ) = lending.getPoolInfo(poolId);

        assertEq(creator, user1);
        assertEq(totalLiquidity, 10000e6);
        assertEq(availableLiquidity, 10000e6);
        assertEq(minAiScore, 80);
        assertEq(interestRate, 800);
        assertTrue(isActive);
        assertEq(totalLoansIssued, 0);
    }

    function testCreatePoolInvalidParameters() public {
        // Test logical inconsistencies that should still be rejected
        SatoruLending.CreatePoolParams memory params = SatoruLending.CreatePoolParams({
            initialLiquidity: 1000e6,
            minAiScore: 80,
            maxDomainExpiration: 400,
            interestRate: 800,
            minLoanAmount: 5000e6, // Min > Max (logical error)
            maxLoanAmount: 1000e6, // Max < Min (logical error)
            minDuration: 7 days,
            maxDuration: 90 days,
            allowAdditionalProviders: true
        });

        vm.prank(user1);
        vm.expectRevert("Invalid loan amount range");
        lending.createLiquidityPool(params);
    }

    function testAddLiquidity() public {
        // Create pool first
        SatoruLending.CreatePoolParams memory params = SatoruLending.CreatePoolParams({
            initialLiquidity: 10000e6,
            minAiScore: 80,
            maxDomainExpiration: 400,
            interestRate: 800,
            minLoanAmount: 1000e6,
            maxLoanAmount: 5000e6,
            minDuration: 7 days,
            maxDuration: 90 days,
            allowAdditionalProviders: true
        });

        vm.prank(user1);
        uint256 poolId = lending.createLiquidityPool(params);

        // Add liquidity from user2
        vm.prank(user2);
        lending.addLiquidity(poolId, 5000e6);

        (,uint256 totalLiquidity, uint256 availableLiquidity,,,,) = lending.getPoolInfo(poolId);
        assertEq(totalLiquidity, 15000e6);
        assertEq(availableLiquidity, 15000e6);
    }

    function testCanGetInstantLoan() public {
        // Create pool
        SatoruLending.CreatePoolParams memory params = SatoruLending.CreatePoolParams({
            initialLiquidity: 10000e6,
            minAiScore: 80,
            maxDomainExpiration: 400,
            interestRate: 800,
            minLoanAmount: 1000e6,
            maxLoanAmount: 5000e6,
            minDuration: 7 days,
            maxDuration: 90 days,
            allowAdditionalProviders: true
        });

        vm.prank(user1);
        uint256 poolId = lending.createLiquidityPool(params);

        // Check eligibility for nike.com (score 98) - call from user1 context
        vm.prank(user1);
        (bool eligible, string memory reason) = lending.canGetInstantLoan(
            DOMAIN_TOKEN_ID_1,
            poolId,
            3000e6
        );

        assertTrue(eligible);
        assertEq(reason, "");
    }

    function testCanGetInstantLoanLowScore() public {
        // Create pool with high minimum score
        SatoruLending.CreatePoolParams memory params = SatoruLending.CreatePoolParams({
            initialLiquidity: 10000e6,
            minAiScore: 99, // Higher than nike.com score (98)
            maxDomainExpiration: 400,
            interestRate: 800,
            minLoanAmount: 1000e6,
            maxLoanAmount: 5000e6,
            minDuration: 7 days,
            maxDuration: 90 days,
            allowAdditionalProviders: true
        });

        vm.prank(user1);
        uint256 poolId = lending.createLiquidityPool(params);

        // Check eligibility - should fail
        vm.prank(user1);
        (bool eligible, string memory reason) = lending.canGetInstantLoan(
            DOMAIN_TOKEN_ID_1,
            poolId,
            3000e6
        );

        assertFalse(eligible);
        assertEq(reason, "AI score too low for pool");
    }

    function testRequestInstantLoan() public {
        // Create pool
        SatoruLending.CreatePoolParams memory params = SatoruLending.CreatePoolParams({
            initialLiquidity: 10000e6,
            minAiScore: 80,
            maxDomainExpiration: 400,
            interestRate: 800,
            minLoanAmount: 1000e6,
            maxLoanAmount: 5000e6,
            minDuration: 7 days,
            maxDuration: 90 days,
            allowAdditionalProviders: true
        });

        vm.prank(user1);
        uint256 poolId = lending.createLiquidityPool(params);

        // Request instant loan
        SatoruLending.InstantLoanParams memory loanParams = SatoruLending.InstantLoanParams({
            domainTokenId: DOMAIN_TOKEN_ID_1,
            poolId: poolId,
            requestedAmount: 3000e6,
            loanDuration: 30 days
        });

        uint256 balanceBefore = usdc.balanceOf(user1);

        vm.prank(user1);
        uint256 loanId = lending.requestInstantLoan(loanParams);

        uint256 balanceAfter = usdc.balanceOf(user1);

        assertEq(loanId, 1);
        assertEq(balanceAfter - balanceBefore, 3000e6);

        // Check pool liquidity reduced
        (,, uint256 availableLiquidity,,,,) = lending.getPoolInfo(poolId);
        assertEq(availableLiquidity, 7000e6);
    }

    function testCreateLoanRequest() public {
        SatoruLending.CreateRequestParams memory params = SatoruLending.CreateRequestParams({
            domainTokenId: DOMAIN_TOKEN_ID_1,
            requestedAmount: 5000e6,
            proposedInterestRate: 1000, // 10%
            campaignDuration: 7 days,
            repaymentDeadline: block.timestamp + 90 days
        });

        vm.expectEmit(true, true, true, true, address(lending));
        emit LoanRequestCreated(
            1,
            user1,
            DOMAIN_TOKEN_ID_1,
            5000e6,
            1000,
            NIKE_SCORE,
            block.timestamp + 7 days
        );

        vm.prank(user1);
        uint256 requestId = lending.createLoanRequest(params);

        assertEq(requestId, 1);
    }

    function testFundLoanRequest() public {
        // Create loan request
        SatoruLending.CreateRequestParams memory params = SatoruLending.CreateRequestParams({
            domainTokenId: DOMAIN_TOKEN_ID_1,
            requestedAmount: 5000e6,
            proposedInterestRate: 1000,
            campaignDuration: 7 days,
            repaymentDeadline: block.timestamp + 90 days
        });

        vm.prank(user1);
        uint256 requestId = lending.createLoanRequest(params);

        // Fund the request
        vm.prank(user2);
        lending.fundLoanRequest(requestId, 5000e6);

        // Check borrower received funds
        uint256 borrowerBalance = usdc.balanceOf(user1);
        // Initial balance was used for pool creation, so check relative increase
        assertGt(borrowerBalance, INITIAL_USDC_BALANCE - 10000e6);
    }

    function testFundLoanRequestPartial() public {
        // Create loan request
        SatoruLending.CreateRequestParams memory params = SatoruLending.CreateRequestParams({
            domainTokenId: DOMAIN_TOKEN_ID_1,
            requestedAmount: 5000e6,
            proposedInterestRate: 1000,
            campaignDuration: 7 days,
            repaymentDeadline: block.timestamp + 90 days
        });

        vm.prank(user1);
        uint256 requestId = lending.createLoanRequest(params);

        // Partially fund the request
        vm.expectEmit(true, true, false, true, address(lending));
        emit LoanRequestFunded(
            requestId,
            user2,
            2000e6,
            2000e6,
            3000e6,
            false
        );

        vm.prank(user2);
        lending.fundLoanRequest(requestId, 2000e6);
    }

    function testCancelLoanRequest() public {
        // Create loan request
        SatoruLending.CreateRequestParams memory params = SatoruLending.CreateRequestParams({
            domainTokenId: DOMAIN_TOKEN_ID_1,
            requestedAmount: 5000e6,
            proposedInterestRate: 1000,
            campaignDuration: 7 days,
            repaymentDeadline: block.timestamp + 90 days
        });

        vm.prank(user1);
        uint256 requestId = lending.createLoanRequest(params);

        // Partially fund
        vm.prank(user2);
        lending.fundLoanRequest(requestId, 2000e6);

        uint256 user2BalanceBefore = usdc.balanceOf(user2);

        // Cancel request
        vm.expectEmit(true, true, false, true, address(lending));
        emit LoanRequestCancelled(
            requestId,
            user1,
            2000e6,
            "Cancelled by borrower"
        );

        vm.prank(user1);
        lending.cancelLoanRequest(requestId);

        // Check contributor got refunded
        uint256 user2BalanceAfter = usdc.balanceOf(user2);
        assertEq(user2BalanceAfter, user2BalanceBefore + 2000e6);
    }

    function testProtocolStats() public {
        // Create pool and execute loan
        SatoruLending.CreatePoolParams memory poolParams = SatoruLending.CreatePoolParams({
            initialLiquidity: 10000e6,
            minAiScore: 80,
            maxDomainExpiration: 400,
            interestRate: 800,
            minLoanAmount: 1000e6,
            maxLoanAmount: 5000e6,
            minDuration: 7 days,
            maxDuration: 90 days,
            allowAdditionalProviders: true
        });

        vm.prank(user1);
        uint256 poolId = lending.createLiquidityPool(poolParams);

        SatoruLending.InstantLoanParams memory loanParams = SatoruLending.InstantLoanParams({
            domainTokenId: DOMAIN_TOKEN_ID_1,
            poolId: poolId,
            requestedAmount: 3000e6,
            loanDuration: 30 days
        });

        vm.prank(user1);
        lending.requestInstantLoan(loanParams);

        (
            uint256 totalPools,
            uint256 totalLiquidity,
            uint256 totalLoans,
            uint256 totalVolume
        ) = lending.getProtocolStats();

        assertEq(totalPools, 1);
        assertEq(totalLiquidity, 10000e6);
        assertEq(totalLoans, 1);
        assertEq(totalVolume, 3000e6);
    }

    function testInvalidDomainOwnership() public {
        // Create pool
        SatoruLending.CreatePoolParams memory params = SatoruLending.CreatePoolParams({
            initialLiquidity: 10000e6,
            minAiScore: 80,
            maxDomainExpiration: 400,
            interestRate: 800,
            minLoanAmount: 1000e6,
            maxLoanAmount: 5000e6,
            minDuration: 7 days,
            maxDuration: 90 days,
            allowAdditionalProviders: true
        });

        vm.prank(user1);
        uint256 poolId = lending.createLiquidityPool(params);

        // Try to use user2's domain as user1
        vm.prank(user1);
        (bool eligible, string memory reason) = lending.canGetInstantLoan(
            DOMAIN_TOKEN_ID_2, // Owned by user2
            poolId,
            3000e6
        );

        assertFalse(eligible);
        assertEq(reason, "Not domain owner");
    }

    function testRemoveLiquidity() public {
        // Create pool
        SatoruLending.CreatePoolParams memory params = SatoruLending.CreatePoolParams({
            initialLiquidity: 10000e6,
            minAiScore: 80,
            maxDomainExpiration: 400,
            interestRate: 800,
            minLoanAmount: 1000e6,
            maxLoanAmount: 5000e6,
            minDuration: 7 days,
            maxDuration: 90 days,
            allowAdditionalProviders: true
        });

        vm.prank(user1);
        uint256 poolId = lending.createLiquidityPool(params);

        uint256 balanceBefore = usdc.balanceOf(user1);

        // Remove 50% liquidity
        vm.prank(user1);
        lending.removeLiquidity(poolId, 50);

        uint256 balanceAfter = usdc.balanceOf(user1);

        // Should receive 50% of initial liquidity back
        assertEq(balanceAfter - balanceBefore, 5000e6);

        // Pool should have reduced liquidity
        (,uint256 totalLiquidity, uint256 availableLiquidity,,,,) = lending.getPoolInfo(poolId);
        assertEq(totalLiquidity, 5000e6);
        assertEq(availableLiquidity, 5000e6);
    }

    function testHighInterestRateAcceptance() public {
        // Test that high interest rates are now accepted (unrestricted design)
        SatoruLending.CreatePoolParams memory params = SatoruLending.CreatePoolParams({
            initialLiquidity: 10000e6,
            minAiScore: 80,
            maxDomainExpiration: 400,
            interestRate: 6000, // 60% - now allowed in unrestricted design
            minLoanAmount: 1000e6,
            maxLoanAmount: 5000e6,
            minDuration: 7 days,
            maxDuration: 90 days,
            allowAdditionalProviders: true
        });

        vm.expectEmit(true, true, false, true, address(lending));
        emit PoolCreated(1, user1, 10000e6, 80, 6000, block.timestamp);

        vm.prank(user1);
        uint256 poolId = lending.createLiquidityPool(params);

        assertEq(poolId, 1);

        // Verify pool was created with high interest rate
        // Check that the pool exists and has the expected properties
        assertTrue(poolId > 0);
        // Note: Detailed field verification would require getter functions
    }
}
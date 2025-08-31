// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DomaLend.sol";
import "../src/mocks/MockUSDC.sol";
import "../src/mocks/MockDoma.sol";
import "../src/mocks/MockOracle.sol";

contract DomaLendTest is Test {
    DomaLend public domaLend;
    MockUSDC public usdc;
    MockDoma public doma; // MockDoma with real Doma interface compatibility
    MockOracle public oracle;
    
    address public alice = address(0x1);
    address public bob = address(0x2);
    address public charlie = address(0x3);
    
    uint256 public constant INITIAL_BALANCE = 100_000 * 1e6; // 100k USDC
    
    // Real Doma Protocol contract address on testnet
    address public constant DOMA_OWNERSHIP_TOKEN = 0x424bDf2E8a6F52Bd2c1C81D9437b0DC0309DF90f;
    
    function setUp() public {
        // Deploy mocks (including MockDoma with real interface compatibility)
        usdc = new MockUSDC();
        doma = new MockDoma();
        oracle = new MockOracle();
        
        // Deploy main contract  
        domaLend = new DomaLend(address(usdc), address(doma), address(oracle));
        
        // Setup test users with USDC
        usdc.mint(alice, INITIAL_BALANCE);
        usdc.mint(bob, INITIAL_BALANCE);
        usdc.mint(charlie, INITIAL_BALANCE);
        
        // Approve DomaLend to spend USDC
        vm.prank(alice);
        usdc.approve(address(domaLend), type(uint256).max);
        
        vm.prank(bob);
        usdc.approve(address(domaLend), type(uint256).max);
        
        vm.prank(charlie);
        usdc.approve(address(domaLend), type(uint256).max);
    }
    
    // ============ Domain Expiration Tests ============
    
    function testDomainExpirationValidation() public {
        // Setup: Stake funds for liquidity
        vm.prank(alice);
        domaLend.stakeFunds(50_000 * 1e6);
        
        // Create a domain that expires soon
        uint256 domainId = doma.mintDomain(bob, "test.doma");
        
        // Set domain to expire in 5 days (less than minimum loan duration of 7 days)
        doma.setDomainExpiry(domainId, block.timestamp + 5 days);
        
        vm.prank(bob);
        doma.approve(address(domaLend), domainId);
        
        // Try to request a loan - should fail due to expiry
        vm.prank(bob);
        vm.expectRevert("Domain expires before loan maturity");
        domaLend.requestLoan(domainId, 5_000 * 1e6, 7 days);
    }
    
    function testExpiredDomainRejection() public {
        // Setup: Stake funds for liquidity  
        vm.prank(alice);
        domaLend.stakeFunds(50_000 * 1e6);
        
        // Create an already expired domain
        uint256 domainId = doma.mintDomainWithExpiry(bob, "expired.doma", block.timestamp - 1);
        
        vm.prank(bob);
        doma.approve(address(domaLend), domainId);
        
        // Try to request a loan with expired domain - should fail
        vm.prank(bob);
        vm.expectRevert("Domain has expired");
        domaLend.requestLoan(domainId, 5_000 * 1e6, 30 days);
    }
    
    function testGetDomainInfo() public {
        // Create a domain with specific properties
        uint256 domainId = doma.mintDomainWithExpiry(bob, "info.doma", block.timestamp + 180 days);
        doma.setRegistrar(domainId, 123);
        
        // Test the getDomainInfo function
        (address owner, uint256 expiration, uint256 registrarId, bool isExpired, bool isLocked) = domaLend.getDomainInfo(domainId);
        
        assertEq(owner, bob, "Owner should be Bob");
        assertEq(expiration, block.timestamp + 180 days, "Expiration should match");
        assertEq(registrarId, 123, "Registrar ID should be 123");
        assertEq(isExpired, false, "Domain should not be expired");
        assertEq(isLocked, false, "Domain should not be locked");
    }
    
    function testLoanTermsWithExpiration() public {
        uint256 domainId = doma.mintDomainWithExpiry(bob, "terms.doma", block.timestamp + 30 days);
        
        (uint256 maxLoan, uint256 interestRate, uint256 domainExpiration, bool isEligible) = 
            domaLend.getLoanTerms(domainId);
        
        assertGt(maxLoan, 0, "Max loan should be positive");
        assertEq(interestRate, 1000, "Interest rate should be 10%");
        assertEq(domainExpiration, block.timestamp + 30 days, "Expiration should match");
        assertEq(isEligible, true, "Domain should be eligible");
    }
    
    function testLoanTermsIneligibleDomain() public {
        // Create domain with very short expiry (less than 7 days)
        uint256 domainId = doma.mintDomainWithExpiry(bob, "shortterm.doma", block.timestamp + 5 days);
        
        (, , , bool isEligible) = domaLend.getLoanTerms(domainId);
        
        assertEq(isEligible, false, "Domain with short expiry should be ineligible");
    }
    
    function testLockedDomainRejection() public {
        // Setup: Stake funds for liquidity
        vm.prank(alice);
        domaLend.stakeFunds(50_000 * 1e6);
        
        // Create a locked domain
        uint256 domainId = doma.mintDomain(bob, "locked.doma");
        doma.setLockStatus(domainId, true);
        
        vm.prank(bob);
        doma.approve(address(domaLend), domainId);
        
        // Try to request a loan with locked domain - should fail
        vm.prank(bob);
        vm.expectRevert("Domain is locked");
        domaLend.requestLoan(domainId, 5_000 * 1e6, 30 days);
    }
    
    function testEnhancedDomainInfo() public {
        // Create a domain with comprehensive properties
        uint256 domainId = doma.mintDomainWithExpiry(bob, "enhanced.doma", block.timestamp + 180 days);
        doma.setRegistrar(domainId, 456);
        doma.setLockStatus(domainId, true);
        
        // Test the enhanced getDomainInfo function
        (address owner, uint256 expiration, uint256 registrarId, bool isExpired, bool isLocked) = 
            domaLend.getDomainInfo(domainId);
        
        assertEq(owner, bob, "Owner should be Bob");
        assertEq(expiration, block.timestamp + 180 days, "Expiration should match");
        assertEq(registrarId, 456, "Registrar ID should be 456");
        assertEq(isExpired, false, "Domain should not be expired");
        assertEq(isLocked, true, "Domain should be locked");
    }
    
    // ============ Staking Tests ============
    
    function testStakeFunds() public {
        uint256 stakeAmount = 10_000 * 1e6; // 10k USDC
        
        vm.prank(alice);
        domaLend.stakeFunds(stakeAmount);
        
        // Points should start at 0 in time-based system
        assertEq(domaLend.getUserPoints(alice), 0);
        assertEq(domaLend.stakerDeposits(alice), stakeAmount);
        assertEq(domaLend.totalDeposited(), stakeAmount);
        
        // Fast forward time to accumulate points
        vm.warp(block.timestamp + 1 days);
        
        // Now user should have points based on time
        uint256 expectedPoints = (stakeAmount * 1 days * 1e12) / 1e18;
        assertGt(domaLend.getUserPoints(alice), 0);
    }
    
    function testUnstakeFunds() public {
        uint256 stakeAmount = 10_000 * 1e6;
        
        // First stake
        vm.prank(alice);
        domaLend.stakeFunds(stakeAmount);
        
        // Fast forward to accumulate points
        vm.warp(block.timestamp + 1 days);
        
        // Check points accumulated
        uint256 pointsBeforeUnstake = domaLend.getUserPoints(alice);
        assertGt(pointsBeforeUnstake, 0);
        
        // Then unstake
        vm.prank(alice);
        domaLend.unstakeFunds(stakeAmount);
        
        assertEq(domaLend.getUserPoints(alice), 0);
        assertEq(domaLend.stakerDeposits(alice), 0);
        // Account for potential exit fees at low utilization (should be 0)
        uint256 exitFee = domaLend.calculateExitFee(stakeAmount);
        assertEq(usdc.balanceOf(alice), INITIAL_BALANCE - exitFee);
    }
    
    function testCannotUnstakeMoreThanStaked() public {
        uint256 stakeAmount = 10_000 * 1e6;
        
        vm.prank(alice);
        domaLend.stakeFunds(stakeAmount);
        
        vm.prank(alice);
        vm.expectRevert("Insufficient staked amount");
        domaLend.unstakeFunds(stakeAmount + 1);
    }
    
    // ============ Loan Tests ============
    
    function testRequestLoan() public {
        // Setup: Stake funds for liquidity
        vm.prank(alice);
        domaLend.stakeFunds(50_000 * 1e6);
        
        // Setup domain ownership for Bob
        uint256 domainId = doma.mintDomain(bob, "test.doma");
        
        // Bob approves DomaLend to transfer his domain
        vm.prank(bob);
        doma.approve(address(domaLend), domainId);
        
        // Request loan
        uint256 loanAmount = 5_000 * 1e6; // 5k USDC
        uint256 duration = 30 days;
        
        vm.prank(bob);
        uint256 loanId = domaLend.requestLoan(domainId, loanAmount, duration);
        
        // Verify loan created
        (uint256 tokenId, address borrower, uint256 principal,,,,,bool isActive,) = domaLend.loans(loanId);
        assertEq(tokenId, domainId);
        assertEq(borrower, bob);
        assertEq(principal, loanAmount);
        
        // Verify domain transferred to contract
        assertEq(doma.ownerOf(domainId), address(domaLend));
        
        // Verify USDC transferred to borrower
        assertEq(usdc.balanceOf(bob), INITIAL_BALANCE + loanAmount);
    }
    
    function testRepayLoan() public {
        // Setup loan
        vm.prank(alice);
        domaLend.stakeFunds(50_000 * 1e6);
        
        uint256 domainId = doma.mintDomain(bob, "test.doma");
        vm.prank(bob);
        doma.approve(address(domaLend), domainId);
        
        vm.prank(bob);
        uint256 loanId = domaLend.requestLoan(domainId, 5_000 * 1e6, 30 days);
        
        // Fast forward time
        vm.warp(block.timestamp + 1 days);
        
        // Calculate repayment amount
        uint256 totalOwed = domaLend.calculateTotalOwed(loanId);
        
        // Repay loan
        vm.prank(bob);
        domaLend.repayLoan(loanId, totalOwed);
        
        // Verify loan closed
        (,,,,,,, bool isActive,) = domaLend.loans(loanId);
        assertEq(isActive, false);
        
        // Verify domain returned
        assertEq(doma.ownerOf(domainId), bob);
    }
    
    // ============ Dutch Auction Tests ============
    
    function testLiquidateLoan() public {
        // Setup loan
        vm.prank(alice);
        domaLend.stakeFunds(50_000 * 1e6);
        
        uint256 domainId = doma.mintDomain(bob, "test.doma");
        vm.prank(bob);
        doma.approve(address(domaLend), domainId);
        
        vm.prank(bob);
        uint256 loanId = domaLend.requestLoan(domainId, 5_000 * 1e6, 7 days);
        
        // Fast forward past loan duration
        vm.warp(block.timestamp + 8 days);
        
        // Liquidate
        domaLend.liquidateLoan(loanId);
        
        // Verify auction started
        (uint256 auctionLoanId,, uint256 startTime,, bool isActive,,) = domaLend.auctions(loanId);
        assertEq(auctionLoanId, loanId);
        assertEq(isActive, true);
        assertGt(startTime, 0);
    }
    
    function testDutchAuctionPricing() public {
        // Setup and liquidate loan
        vm.prank(alice);
        domaLend.stakeFunds(50_000 * 1e6);
        
        uint256 domainId = doma.mintDomain(bob, "test.doma");
        vm.prank(bob);
        doma.approve(address(domaLend), domainId);
        
        vm.prank(bob);
        uint256 loanId = domaLend.requestLoan(domainId, 5_000 * 1e6, 7 days);
        
        vm.warp(block.timestamp + 8 days);
        domaLend.liquidateLoan(loanId);
        
        // Check initial price (should be ~2x loan amount)
        uint256 initialPrice = domaLend.getCurrentAuctionPrice(loanId);
        uint256 totalOwed = domaLend.calculateTotalOwed(loanId);
        assertGt(initialPrice, totalOwed);
        
        // Fast forward 1 day and check price decreased
        vm.warp(block.timestamp + 1 days);
        uint256 dayLaterPrice = domaLend.getCurrentAuctionPrice(loanId);
        assertLt(dayLaterPrice, initialPrice);
        
        // Price should decrease by 1% per day
        uint256 expectedDecrease = initialPrice / 100;
        assertApproxEqAbs(initialPrice - dayLaterPrice, expectedDecrease, 1e6);
    }
    
    function testBuyFromAuction() public {
        // Setup and liquidate loan
        vm.prank(alice);
        domaLend.stakeFunds(50_000 * 1e6);
        
        uint256 domainId = doma.mintDomain(bob, "test.doma");
        vm.prank(bob);
        doma.approve(address(domaLend), domainId);
        
        vm.prank(bob);
        uint256 loanId = domaLend.requestLoan(domainId, 5_000 * 1e6, 7 days);
        
        vm.warp(block.timestamp + 8 days);
        domaLend.liquidateLoan(loanId);
        
        // Fast forward to get better price
        vm.warp(block.timestamp + 5 days);
        
        uint256 auctionPrice = domaLend.getCurrentAuctionPrice(loanId);
        
        // Charlie buys from auction
        vm.prank(charlie);
        domaLend.buyFromAuction(loanId);
        
        // Verify domain transferred to Charlie
        assertEq(doma.ownerOf(domainId), charlie);
        
        // Verify auction closed
        (,,,, bool isActive,,) = domaLend.auctions(loanId);
        assertEq(isActive, false);
    }
    
    // ============ Points Distribution Tests ============
    
    function testPointsDistribution() public {
        // Multiple stakers
        vm.prank(alice);
        domaLend.stakeFunds(30_000 * 1e6); // Alice stakes 30k
        
        vm.prank(bob);
        domaLend.stakeFunds(70_000 * 1e6); // Bob stakes 70k
        
        // Fast forward to accumulate points
        vm.warp(block.timestamp + 1 days);
        
        // Points should be proportional to stake amount
        uint256 alicePoints = domaLend.getUserPoints(alice);
        uint256 bobPoints = domaLend.getUserPoints(bob);
        
        // Bob should have ~2.33x more points than Alice (70k/30k)
        assertApproxEqRel(bobPoints, (alicePoints * 70_000) / 30_000, 0.01e18);
    }
    
    function testPartialUnstaking() public {
        uint256 stakeAmount = 10_000 * 1e6;
        
        // Stake funds
        vm.prank(alice);
        domaLend.stakeFunds(stakeAmount);
        
        // Accumulate points for 10 days
        vm.warp(block.timestamp + 10 days);
        
        uint256 pointsBefore = domaLend.getUserPoints(alice);
        assertGt(pointsBefore, 0);
        
        // Unstake 40% (4000 USDC)
        uint256 unstakeAmount = 4_000 * 1e6;
        vm.prank(alice);
        domaLend.unstakeFunds(unstakeAmount);
        
        // Points should be reduced by 40%
        uint256 pointsAfter = domaLend.getUserPoints(alice);
        assertApproxEqRel(pointsAfter, (pointsBefore * 60) / 100, 0.01e18);
        
        // Remaining stake should be 60%
        assertEq(domaLend.stakerDeposits(alice), stakeAmount - unstakeAmount);
    }
    
    // ============ Liquidity Management Tests ============
    
    function testLiquidityReserveEnforcement() public {
        // Alice stakes 10k USDC
        uint256 stakeAmount = 10_000 * 1e6;
        vm.prank(alice);
        domaLend.stakeFunds(stakeAmount);
        
        // Create a domain for Bob
        uint256 domainId = doma.mintDomain(bob, "test.doma");
        vm.prank(bob);
        doma.approve(address(domaLend), domainId);
        
        // Try to borrow too much (would violate 25% reserve)
        uint256 maxAllowedLoan = (stakeAmount * 75) / 100; // 75% of deposits
        uint256 excessiveLoan = maxAllowedLoan + 1;
        
        vm.prank(bob);
        vm.expectRevert("Would violate liquidity reserve");
        domaLend.requestLoan(domainId, excessiveLoan, 30 days);
        
        // But borrowing within limits should work
        vm.prank(bob);
        uint256 loanId = domaLend.requestLoan(domainId, maxAllowedLoan, 30 days);
        assertGt(loanId, 0);
    }
    
    function testUtilizationRateCalculation() public {
        // Start with 10k USDC staked
        uint256 stakeAmount = 10_000 * 1e6;
        vm.prank(alice);
        domaLend.stakeFunds(stakeAmount);
        
        // Initially 0% utilization
        assertEq(domaLend.getUtilizationRate(), 0);
        
        // Create loan for 5k USDC (50% utilization)
        uint256 domainId = doma.mintDomain(bob, "test.doma");
        vm.prank(bob);
        doma.approve(address(domaLend), domainId);
        
        vm.prank(bob);
        domaLend.requestLoan(domainId, 5_000 * 1e6, 30 days);
        
        // Should be ~50% utilization (some rounding expected)
        uint256 utilization = domaLend.getUtilizationRate();
        assertApproxEqAbs(utilization, 5000, 100); // ~50% in basis points
    }
    
    function testExitFeeCalculation() public {
        // Setup high utilization scenario
        uint256 stakeAmount = 10_000 * 1e6;
        vm.prank(alice);
        domaLend.stakeFunds(stakeAmount);
        
        // Create loans to reach high utilization
        uint256 domainId1 = doma.mintDomain(bob, "test1.doma");
        uint256 domainId2 = doma.mintDomain(charlie, "test2.doma");
        
        vm.prank(bob);
        doma.approve(address(domaLend), domainId1);
        vm.prank(charlie);
        doma.approve(address(domaLend), domainId2);
        
        // Loan 7.5k to reach 75% utilization (above 70% threshold)
        vm.prank(bob);
        domaLend.requestLoan(domainId1, 3_750 * 1e6, 30 days);
        vm.prank(charlie);  
        domaLend.requestLoan(domainId2, 3_750 * 1e6, 30 days);
        
        // Exit fee should be 0.5% for 70-85% utilization
        uint256 withdrawAmount = 1_000 * 1e6;
        uint256 expectedFee = (withdrawAmount * 50) / 10000; // 0.5%
        uint256 actualFee = domaLend.calculateExitFee(withdrawAmount);
        
        assertEq(actualFee, expectedFee);
    }
    
    function testWithdrawalQueue() public {
        // Setup high utilization to trigger queue
        uint256 stakeAmount = 10_000 * 1e6;
        vm.prank(alice);
        domaLend.stakeFunds(stakeAmount);
        
        // Create domain and max loan to use all available liquidity
        uint256 domainId = doma.mintDomain(bob, "test.doma");
        vm.prank(bob);
        doma.approve(address(domaLend), domainId);
        
        // Borrow the maximum allowed (75% of deposits to maintain 25% reserve)
        uint256 maxLoan = (stakeAmount * 75) / 100;
        vm.prank(bob);
        domaLend.requestLoan(domainId, maxLoan, 30 days);
        
        // Now Alice tries to unstake - should go to queue
        uint256 withdrawAmount = 1_000 * 1e6;
        vm.prank(alice);
        domaLend.unstakeFunds(withdrawAmount);
        
        // Check queue status
        (uint256[] memory requestIds, uint256[] memory amounts, bool[] memory fulfilled) = domaLend.getQueueStatus(alice);
        
        assertEq(requestIds.length, 1);
        assertEq(amounts[0], withdrawAmount);
        assertEq(fulfilled[0], false);
    }
    
    function testQueueProcessingOnRepayment() public {
        // Setup queue scenario
        uint256 stakeAmount = 10_000 * 1e6;
        vm.prank(alice);
        domaLend.stakeFunds(stakeAmount);
        
        uint256 domainId = doma.mintDomain(bob, "test.doma");
        vm.prank(bob);
        doma.approve(address(domaLend), domainId);
        
        uint256 loanAmount = 7_500 * 1e6; // High utilization
        vm.prank(bob);
        uint256 loanId = domaLend.requestLoan(domainId, loanAmount, 30 days);
        
        // Alice queues withdrawal
        uint256 withdrawAmount = 1_000 * 1e6;
        vm.prank(alice);
        domaLend.unstakeFunds(withdrawAmount);
        
        // Verify withdrawal is queued
        (uint256[] memory requestIds,, bool[] memory fulfilled) = domaLend.getQueueStatus(alice);
        assertEq(fulfilled[0], false);
        
        // Bob repays part of loan
        vm.warp(block.timestamp + 1 days);
        uint256 repaymentAmount = 2_000 * 1e6;
        vm.prank(bob);
        domaLend.repayLoan(loanId, repaymentAmount);
        
        // Alice's withdrawal should now be fulfilled - check by verifying queue is empty for alice
        (, , fulfilled) = domaLend.getQueueStatus(alice);
        // If the queue is empty for alice, the withdrawal was processed
        assertEq(fulfilled.length, 0);
        
        // Alice's balance should be reduced
        assertEq(domaLend.stakerDeposits(alice), stakeAmount - withdrawAmount);
    }
    
    function testPriorityInQueue() public {
        // Alice stakes first (longer duration = higher priority)
        vm.prank(alice);
        domaLend.stakeFunds(5_000 * 1e6);
        
        // Wait 30 days
        vm.warp(block.timestamp + 30 days);
        
        // Bob stakes later (shorter duration = lower priority)
        vm.prank(bob);
        domaLend.stakeFunds(5_000 * 1e6);
        
        // Create high utilization
        uint256 domainId = doma.mintDomain(charlie, "test.doma");
        vm.prank(charlie);
        doma.approve(address(domaLend), domainId);
        
        vm.prank(charlie);
        uint256 loanId = domaLend.requestLoan(domainId, 7_500 * 1e6, 30 days);
        
        // Both Alice and Bob try to unstake (should be queued)
        vm.prank(alice);
        domaLend.unstakeFunds(1_000 * 1e6);
        
        vm.prank(bob);
        domaLend.unstakeFunds(1_000 * 1e6);
        
        // Charlie repays some loan to create liquidity for only one withdrawal
        vm.prank(charlie);
        domaLend.repayLoan(loanId, 1_200 * 1e6);
        
        // Alice should be fulfilled first due to longer stake duration
        (, , bool[] memory aliceFulfilled) = domaLend.getQueueStatus(alice);
        (, , bool[] memory bobFulfilled) = domaLend.getQueueStatus(bob);
        
        // Alice should have empty queue (fulfilled and processed)
        assertEq(aliceFulfilled.length, 0);
        // Bob should still have one pending request
        assertEq(bobFulfilled.length, 1);
        assertEq(bobFulfilled[0], false);   // Bob still waiting
    }
}
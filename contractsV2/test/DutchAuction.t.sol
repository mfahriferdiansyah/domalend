// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/legacy/DutchAuction.sol";
import "../src/interfaces/IDutchAuction.sol";
import "./mocks/MockUSDC.sol";
import "./mocks/MockDoma.sol";
import "./mocks/MockLoanManager.sol";
import "./mocks/MockAIOracle.sol";

contract DutchAuctionTest is Test {
    DutchAuction public dutchAuction;
    MockUSDC public mockUSDC;
    MockDoma public mockDoma;
    MockLoanManager public mockLoanManager;
    MockAIOracle public mockAIOracle;

    address public owner = address(1);
    address public borrower = address(2);
    address public bidder1 = address(3);
    address public bidder2 = address(4);
    uint256 public constant DOMAIN_TOKEN_ID = 1;
    uint256 public constant LOAN_ID = 1;
    uint256 public constant LOAN_AMOUNT = 1000 * 1e6; // 1000 USDC
    uint256 public constant AI_SCORE = 75;
    string public constant DOMAIN_NAME = "test.eth";

    event AuctionStarted(
        uint256 indexed auctionId,
        uint256 indexed loanId,
        uint256 indexed domainTokenId,
        address borrower,
        uint256 startingPrice,
        uint256 reservePrice,
        uint256 startTimestamp,
        uint256 endTimestamp,
        uint256 aiScore,
        string domainName
    );

    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 bidAmount,
        uint256 currentPrice,
        uint256 timestamp,
        bool isWinningBid
    );

    event AuctionEnded(
        uint256 indexed auctionId,
        uint256 indexed loanId,
        uint256 indexed domainTokenId,
        address winner,
        uint256 finalPrice,
        uint256 loanAmount,
        uint256 surplus,
        uint256 endTimestamp
    );

    function setUp() public {
        // Deploy mocks
        mockUSDC = new MockUSDC("Mock USDC", "MUSDC", 6);
        mockDoma = new MockDoma("Mock Doma", "MDOMA");
        mockAIOracle = new MockAIOracle();
        mockLoanManager = new MockLoanManager();

        // Deploy DutchAuction
        dutchAuction = new DutchAuction(
            address(mockUSDC),
            address(mockDoma),
            address(mockLoanManager),
            address(mockAIOracle),
            owner
        );

        // Set up domain ownership
        mockDoma.mint(address(mockLoanManager), DOMAIN_TOKEN_ID);

        // Set up mock loan manager to approve transfers AFTER minting
        vm.prank(address(mockLoanManager));
        mockDoma.setApprovalForAll(address(dutchAuction), true);

        // Set up USDC balances
        mockUSDC.mint(bidder1, 10000 * 1e6);
        mockUSDC.mint(bidder2, 10000 * 1e6);

        // Approve USDC spending
        vm.prank(bidder1);
        mockUSDC.approve(address(dutchAuction), type(uint256).max);

        vm.prank(bidder2);
        mockUSDC.approve(address(dutchAuction), type(uint256).max);

        // Set up AI Oracle scores
        mockAIOracle.setScore(DOMAIN_TOKEN_ID, AI_SCORE);
    }


    function testConstructor() public {
        assertEq(address(dutchAuction.usdc()), address(mockUSDC));
        assertEq(address(dutchAuction.domaProtocol()), address(mockDoma));
        assertEq(address(dutchAuction.loanManager()), address(mockLoanManager));
        assertEq(address(dutchAuction.aiOracle()), address(mockAIOracle));
        assertEq(dutchAuction.owner(), owner);
        assertEq(dutchAuction.nextAuctionId(), 1);
    }

    function testConstants() public {
        assertEq(dutchAuction.DAILY_DECREASE_RATE(), 100);
        assertEq(dutchAuction.MIN_AUCTION_DURATION(), 7 days);
        assertEq(dutchAuction.MAX_AUCTION_DURATION(), 100 days);
        assertEq(dutchAuction.STARTING_PRICE_MULTIPLIER(), 200);
        assertEq(dutchAuction.MIN_BID_INCREMENT(), 50);
    }

    function testStartAuction() public {
        IDutchAuction.StartAuctionParams memory params = IDutchAuction.StartAuctionParams({
            loanId: LOAN_ID,
            domainTokenId: DOMAIN_TOKEN_ID,
            borrower: borrower,
            loanAmount: LOAN_AMOUNT,
            aiScore: AI_SCORE,
            domainName: DOMAIN_NAME
        });

        vm.prank(address(mockLoanManager));
        uint256 auctionId = dutchAuction.startAuction(params);

        assertEq(auctionId, 1);
        assertEq(dutchAuction.nextAuctionId(), 2);
        assertEq(dutchAuction.totalAuctionsCreated(), 1);

        // Verify domain was transferred to auction contract
        assertEq(mockDoma.ownerOf(DOMAIN_TOKEN_ID), address(dutchAuction));
    }

    function testStartAuctionUnauthorized() public {
        IDutchAuction.StartAuctionParams memory params = IDutchAuction.StartAuctionParams({
            loanId: LOAN_ID,
            domainTokenId: DOMAIN_TOKEN_ID,
            borrower: borrower,
            loanAmount: LOAN_AMOUNT,
            aiScore: AI_SCORE,
            domainName: DOMAIN_NAME
        });

        vm.prank(bidder1);
        vm.expectRevert("Only LoanManager");
        dutchAuction.startAuction(params);
    }

    function testGetCurrentPrice() public {
        uint256 auctionId = _createAuction();

        uint256 startingPrice = (LOAN_AMOUNT * 200) / 100; // 2000 USDC
        uint256 currentPrice = dutchAuction.getCurrentPrice(auctionId);

        assertEq(currentPrice, startingPrice); // Should be starting price initially
    }

    function testGetCurrentPriceAfterTime() public {
        uint256 auctionId = _createAuction();

        // Skip 1 day
        vm.warp(block.timestamp + 1 days);

        uint256 currentPrice = dutchAuction.getCurrentPrice(auctionId);
        uint256 startingPrice = (LOAN_AMOUNT * 200) / 100;

        // Price should have decreased (approximately)
        assertLt(currentPrice, startingPrice);
    }

    function testGetCurrentPriceAtReserve() public {
        uint256 auctionId = _createAuction();

        // Skip to end of auction
        vm.warp(block.timestamp + 30 days);

        uint256 currentPrice = dutchAuction.getCurrentPrice(auctionId);
        // After 30 days with 1% daily decline: 100% - 30% = 70% of starting price
        uint256 startingPrice = (LOAN_AMOUNT * 200) / 100;
        uint256 expectedPrice = (startingPrice * 70) / 100;

        assertEq(currentPrice, expectedPrice);
    }

    function testPlaceBidValid() public {
        uint256 auctionId = _createAuction();
        uint256 currentPrice = dutchAuction.getCurrentPrice(auctionId);
        uint256 bidAmount = currentPrice;

        uint256 balanceBefore = mockUSDC.balanceOf(bidder1);

        vm.expectEmit(true, true, false, true);
        emit BidPlaced(auctionId, bidder1, bidAmount, currentPrice, block.timestamp, true);

        vm.prank(bidder1);
        dutchAuction.placeBid(auctionId, bidAmount);

        // Check bid was accepted and USDC transferred
        assertEq(mockUSDC.balanceOf(bidder1), balanceBefore - bidAmount);

        // Check auction completed (Dutch auction - first valid bid wins)
        (, , , , , , , , bool isActive, ) = dutchAuction.getAuctionDetails(auctionId);
        assertFalse(isActive);

        // Check domain transferred to winner
        assertEq(mockDoma.ownerOf(DOMAIN_TOKEN_ID), bidder1);

        // Check statistics updated
        assertEq(dutchAuction.totalAuctionsCompleted(), 1);
        assertEq(dutchAuction.totalAuctionVolume(), bidAmount);
        assertEq(dutchAuction.userBids(bidder1), 1);
    }

    function testPlaceBidBelowCurrentPrice() public {
        uint256 auctionId = _createAuction();
        uint256 currentPrice = dutchAuction.getCurrentPrice(auctionId);
        uint256 lowBid = currentPrice - 1;

        vm.prank(bidder1);
        vm.expectRevert("Bid below current price");
        dutchAuction.placeBid(auctionId, lowBid);
    }

    function testPlaceBidBorrowerCannotBid() public {
        uint256 auctionId = _createAuction();
        uint256 currentPrice = dutchAuction.getCurrentPrice(auctionId);

        // Give borrower USDC and approval
        mockUSDC.mint(borrower, currentPrice);
        vm.prank(borrower);
        mockUSDC.approve(address(dutchAuction), currentPrice);

        vm.prank(borrower);
        vm.expectRevert("Borrower cannot bid");
        dutchAuction.placeBid(auctionId, currentPrice);
    }

    function testPlaceBidExpiredAuction() public {
        uint256 auctionId = _createAuction();
        uint256 currentPrice = dutchAuction.getCurrentPrice(auctionId);

        // Skip past auction end
        vm.warp(block.timestamp + 101 days);

        vm.prank(bidder1);
        vm.expectRevert("Auction expired");
        dutchAuction.placeBid(auctionId, currentPrice);
    }

    function testMultipleBidsRefunding() public {
        uint256 auctionId = _createAuction();
        uint256 currentPrice = dutchAuction.getCurrentPrice(auctionId);

        // First bid
        vm.prank(bidder1);
        dutchAuction.placeBid(auctionId, currentPrice);

        // Auction should be completed after first bid in Dutch auction
        (, , , , , , , , bool isActive, ) = dutchAuction.getAuctionDetails(auctionId);
        assertFalse(isActive);
    }

    function testEndAuctionNoValidBids() public {
        uint256 auctionId = _createAuction();

        // Skip past auction end
        vm.warp(block.timestamp + 101 days);

        vm.prank(bidder1);
        dutchAuction.endAuction(auctionId);

        // Check auction was cancelled
        (, , , , , , , , bool isActive, ) = dutchAuction.getAuctionDetails(auctionId);
        assertFalse(isActive);

        // Domain should be returned to loan manager
        assertEq(mockDoma.ownerOf(DOMAIN_TOKEN_ID), address(mockLoanManager));
    }

    function testEndAuctionBeforeExpiry() public {
        uint256 auctionId = _createAuction();

        vm.prank(bidder1);
        vm.expectRevert("Auction not expired");
        dutchAuction.endAuction(auctionId);
    }

    function testCancelAuction() public {
        uint256 auctionId = _createAuction();
        string memory reason = "Emergency cancellation";

        vm.prank(owner);
        dutchAuction.cancelAuction(auctionId, reason);

        // Check auction was cancelled
        (, , , , , , , , bool isActive, ) = dutchAuction.getAuctionDetails(auctionId);
        assertFalse(isActive);

        // Domain should be returned to loan manager
        assertEq(mockDoma.ownerOf(DOMAIN_TOKEN_ID), address(mockLoanManager));
    }

    function testCancelAuctionUnauthorized() public {
        uint256 auctionId = _createAuction();

        vm.prank(bidder1);
        vm.expectRevert();
        dutchAuction.cancelAuction(auctionId, "test");
    }

    function testGetMinimumBidNoBids() public {
        uint256 auctionId = _createAuction();
        uint256 currentPrice = dutchAuction.getCurrentPrice(auctionId);
        uint256 minimumBid = dutchAuction.getMinimumBid(auctionId);

        assertEq(minimumBid, currentPrice);
    }

    function testValidateBid() public {
        uint256 auctionId = _createAuction();
        uint256 currentPrice = dutchAuction.getCurrentPrice(auctionId);

        // Valid bid
        vm.prank(bidder1);
        (bool isValid, string memory reason) = dutchAuction.validateBid(auctionId, currentPrice);
        assertTrue(isValid);
        assertEq(reason, "");

        // Invalid bid - too low
        vm.prank(bidder1);
        (isValid, reason) = dutchAuction.validateBid(auctionId, currentPrice - 1);
        assertFalse(isValid);
        assertEq(reason, "Bid below current price");

        // Invalid bid - borrower
        vm.prank(borrower);
        (isValid, reason) = dutchAuction.validateBid(auctionId, currentPrice);
        assertFalse(isValid);
        assertEq(reason, "Borrower cannot bid");
    }

    function testGetAuctionDetails() public {
        uint256 auctionId = _createAuction();

        (
            uint256 loanId,
            uint256 domainTokenId,
            address borrowerAddr,
            uint256 startingPrice,
            uint256 currentPrice,
            uint256 highestBid,
            address highestBidder,
            uint256 timeRemaining,
            bool isActive,
            string memory domainName
        ) = dutchAuction.getAuctionDetails(auctionId);

        assertEq(loanId, LOAN_ID);
        assertEq(domainTokenId, DOMAIN_TOKEN_ID);
        assertEq(borrowerAddr, borrower);
        assertEq(startingPrice, (LOAN_AMOUNT * 200) / 100);
        assertGt(currentPrice, 0);
        assertEq(highestBid, 0);
        assertEq(highestBidder, address(0));
        assertGt(timeRemaining, 0);
        assertTrue(isActive);
        assertEq(domainName, DOMAIN_NAME);
    }

    function testGetActiveAuctions() public {
        uint256 auctionId1 = _createAuction();

        // Create second auction
        mockDoma.mint(address(mockLoanManager), 2);
        IDutchAuction.StartAuctionParams memory params2 = IDutchAuction.StartAuctionParams({
            loanId: 2,
            domainTokenId: 2,
            borrower: borrower,
            loanAmount: LOAN_AMOUNT,
            aiScore: AI_SCORE,
            domainName: "test2.eth"
        });

        vm.prank(address(mockLoanManager));
        uint256 auctionId2 = dutchAuction.startAuction(params2);

        uint256[] memory activeAuctions = dutchAuction.getActiveAuctions();

        assertEq(activeAuctions.length, 2);
        assertEq(activeAuctions[0], auctionId1);
        assertEq(activeAuctions[1], auctionId2);
    }

    function testGetAuctionInfo() public {
        uint256 auctionId = _createAuction();

        (
            uint256 domainTokenId,
            uint256 startingPrice,
            uint256 currentPrice,
            uint256 reservePrice,
            uint256 endTime,
            address highestBidder,
            bool isActive
        ) = dutchAuction.getAuctionInfo(auctionId);

        assertEq(domainTokenId, DOMAIN_TOKEN_ID);
        assertEq(startingPrice, (LOAN_AMOUNT * 200) / 100);
        assertGt(currentPrice, 0);
        assertEq(reservePrice, 0); // No reserve price - maximum market discovery
        assertGt(endTime, block.timestamp);
        assertEq(highestBidder, address(0));
        assertTrue(isActive);
    }

    function testReservePriceCalculation() public {
        // Test high score (80+)
        IDutchAuction.StartAuctionParams memory paramsHigh = IDutchAuction.StartAuctionParams({
            loanId: LOAN_ID,
            domainTokenId: DOMAIN_TOKEN_ID,
            borrower: borrower,
            loanAmount: LOAN_AMOUNT,
            aiScore: 85,
            domainName: DOMAIN_NAME
        });

        vm.prank(address(mockLoanManager));
        uint256 auctionIdHigh = dutchAuction.startAuction(paramsHigh);

        (, , , uint256 reservePriceHigh, , , ) = dutchAuction.getAuctionInfo(auctionIdHigh);
        assertEq(reservePriceHigh, 0); // No reserve price - maximum market discovery

        // Test low score (<50)
        mockDoma.mint(address(mockLoanManager), 3);
        IDutchAuction.StartAuctionParams memory paramsLow = IDutchAuction.StartAuctionParams({
            loanId: 3,
            domainTokenId: 3,
            borrower: borrower,
            loanAmount: LOAN_AMOUNT,
            aiScore: 30,
            domainName: "test3.eth"
        });

        vm.prank(address(mockLoanManager));
        uint256 auctionIdLow = dutchAuction.startAuction(paramsLow);

        (, , , uint256 reservePriceLow, , , ) = dutchAuction.getAuctionInfo(auctionIdLow);
        assertEq(reservePriceLow, 0); // No reserve price - maximum market discovery
    }

    function testAuctionDoesNotExist() public {
        vm.expectRevert("Auction does not exist");
        dutchAuction.getCurrentPrice(999);
    }

    function testOnERC721Received() public {
        bytes4 result = dutchAuction.onERC721Received(address(0), address(0), 0, "");
        assertEq(result, IERC721Receiver.onERC721Received.selector);
    }

    // Helper functions
    function _createAuction() internal returns (uint256 auctionId) {
        IDutchAuction.StartAuctionParams memory params = IDutchAuction.StartAuctionParams({
            loanId: LOAN_ID,
            domainTokenId: DOMAIN_TOKEN_ID,
            borrower: borrower,
            loanAmount: LOAN_AMOUNT,
            aiScore: AI_SCORE,
            domainName: DOMAIN_NAME
        });

        vm.prank(address(mockLoanManager));
        return dutchAuction.startAuction(params);
    }
}
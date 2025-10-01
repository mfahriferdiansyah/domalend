// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./interfaces/IDoma.sol";
import "./interfaces/ILoanManager.sol";
import "./interfaces/IAIOracle.sol";
import "./interfaces/IDutchAuction.sol";

contract DutchAuctionUpgradeable is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, IERC721Receiver, IDutchAuction {
    using SafeERC20 for IERC20;

    // Changed from immutable to storage variables
    IERC20 public usdc;
    IDoma public domaProtocol;
    ILoanManager public loanManager;
    IAIOracle public aiOracle;

    // Auction management
    struct Auction {
        uint256 loanId;
        uint256 domainTokenId;
        address borrower;
        uint256 startingPrice;
        uint256 reservePrice;
        uint256 startTime;
        uint256 endTime;
        uint256 loanAmount;
        uint256 aiScore;
        address highestBidder;
        uint256 highestBid;
        bool isActive;
        bool isCompleted;
        bool isCancelled;
        string domainName;
    }

    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => uint256) public domainToAuction;
    mapping(uint256 => uint256) public loanToAuction;
    uint256 public nextAuctionId;

    // Auction parameters
    uint256 public constant DAILY_DECREASE_RATE = 100; // 1% per day (in basis points)
    uint256 public constant MIN_AUCTION_DURATION = 7 days;
    uint256 public constant MAX_AUCTION_DURATION = 100 days;
    uint256 public constant STARTING_PRICE_MULTIPLIER = 200; // 2x loan amount
    uint256 public constant MIN_BID_INCREMENT = 50; // 0.5% minimum bid increase

    // Protocol statistics
    uint256 public totalAuctionsCreated;
    uint256 public totalAuctionsCompleted;
    uint256 public totalAuctionVolume;
    mapping(address => uint256) public userBids;

    // Events
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

    event AuctionCancelled(
        uint256 indexed auctionId,
        uint256 indexed loanId,
        address indexed cancelledBy,
        string reason,
        uint256 timestamp
    );

    event BidRefunded(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 refundAmount,
        uint256 timestamp
    );

    event EmergencyRescue(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed recipient,
        uint256 timestamp
    );

    // Modifiers
    modifier onlyLoanManager() {
        require(msg.sender == address(loanManager), "Only LoanManager");
        _;
    }

    modifier auctionExists(uint256 auctionId) {
        require(auctionId < nextAuctionId && auctions[auctionId].loanId != 0, "Auction does not exist");
        _;
    }

    modifier auctionActive(uint256 auctionId) {
        require(auctions[auctionId].isActive && !auctions[auctionId].isCompleted, "Auction not active");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _usdc,
        address _domaProtocol,
        address _loanManager,
        address _aiOracle,
        address _owner
    ) public initializer {
        require(_usdc != address(0), "Invalid USDC address");
        require(_domaProtocol != address(0), "Invalid Doma address");
        require(_loanManager != address(0), "Invalid LoanManager address");
        require(_aiOracle != address(0), "Invalid AIOracle address");

        __Ownable_init(_owner);
        __ReentrancyGuard_init();

        usdc = IERC20(_usdc);
        domaProtocol = IDoma(_domaProtocol);
        loanManager = ILoanManager(_loanManager);
        aiOracle = IAIOracle(_aiOracle);

        nextAuctionId = 1;
    }

    function startAuction(StartAuctionParams memory params)
        external
        onlyLoanManager
        returns (uint256 auctionId)
    {
        require(params.loanAmount > 0, "Invalid loan amount");
        require(params.domainTokenId > 0, "Invalid domain token ID");
        require(params.borrower != address(0), "Invalid borrower address");

        auctionId = nextAuctionId++;

        uint256 startingPrice = _calculateStartingPrice(params.loanAmount);
        uint256 reservePrice = _calculateReservePrice(params.loanAmount, params.aiScore);
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + MAX_AUCTION_DURATION;

        auctions[auctionId] = Auction({
            loanId: params.loanId,
            domainTokenId: params.domainTokenId,
            borrower: params.borrower,
            startingPrice: startingPrice,
            reservePrice: reservePrice,
            startTime: startTime,
            endTime: endTime,
            loanAmount: params.loanAmount,
            aiScore: params.aiScore,
            highestBidder: address(0),
            highestBid: 0,
            isActive: true,
            isCompleted: false,
            isCancelled: false,
            domainName: params.domainName
        });

        domainToAuction[params.domainTokenId] = auctionId;
        loanToAuction[params.loanId] = auctionId;

        domaProtocol.safeTransferFrom(address(loanManager), address(this), params.domainTokenId);

        totalAuctionsCreated++;

        emit AuctionStarted(
            auctionId,
            params.loanId,
            params.domainTokenId,
            params.borrower,
            startingPrice,
            reservePrice,
            startTime,
            endTime,
            params.aiScore,
            params.domainName
        );
    }

    function getCurrentPrice(uint256 auctionId)
        external
        view
        auctionExists(auctionId)
        returns (uint256)
    {
        return _calculateCurrentPrice(auctionId);
    }

    function placeBid(uint256 auctionId, uint256 bidAmount)
        external
        auctionExists(auctionId)
        auctionActive(auctionId)
        nonReentrant
    {
        Auction storage auction = auctions[auctionId];
        require(block.timestamp <= auction.endTime, "Auction expired");
        require(msg.sender != auction.borrower, "Borrower cannot bid");

        uint256 currentPrice = _calculateCurrentPrice(auctionId);
        uint256 minimumBid = getMinimumBid(auctionId);

        if (auction.highestBidder != address(0)) {
            uint256 effectiveMinimum = minimumBid < currentPrice ? minimumBid : currentPrice;
            require(bidAmount >= effectiveMinimum, "Bid below effective minimum");
        } else {
            require(bidAmount >= currentPrice, "Bid below current price");
        }

        usdc.safeTransferFrom(msg.sender, address(this), bidAmount);

        if (auction.highestBidder != address(0)) {
            _refundPreviousBidder(auctionId);
        }

        auction.highestBidder = msg.sender;
        auction.highestBid = bidAmount;
        userBids[msg.sender]++;

        bool isWinningBid = true;

        emit BidPlaced(
            auctionId,
            msg.sender,
            bidAmount,
            currentPrice,
            block.timestamp,
            isWinningBid
        );

        _completeAuction(auctionId);
    }

    function endAuction(uint256 auctionId)
        external
        auctionExists(auctionId)
        nonReentrant
    {
        Auction storage auction = auctions[auctionId];
        require(auction.isActive, "Auction not active");
        require(!auction.isCompleted, "Auction already completed");

        if (auction.highestBidder == address(0)) {
            require(block.timestamp > auction.endTime, "Auction not expired");
            _cancelAuctionNoBids(auctionId);
        } else {
            _completeAuction(auctionId);
        }
    }

    function cancelAuction(uint256 auctionId, string memory reason)
        external
        onlyOwner
        auctionExists(auctionId)
        auctionActive(auctionId)
    {
        Auction storage auction = auctions[auctionId];

        if (auction.highestBidder != address(0)) {
            _refundPreviousBidder(auctionId);
        }

        domaProtocol.safeTransferFrom(address(this), address(loanManager), auction.domainTokenId);

        auction.isActive = false;
        auction.isCancelled = true;

        emit AuctionCancelled(
            auctionId,
            auction.loanId,
            msg.sender,
            reason,
            block.timestamp
        );
    }

    function getMinimumBid(uint256 auctionId)
        public
        view
        auctionExists(auctionId)
        returns (uint256)
    {
        Auction storage auction = auctions[auctionId];
        uint256 currentPrice = _calculateCurrentPrice(auctionId);

        if (auction.highestBidder == address(0)) {
            return currentPrice;
        } else {
            uint256 increment = (auction.highestBid * MIN_BID_INCREMENT) / 10000;
            return auction.highestBid + increment;
        }
    }

    function validateBid(uint256 auctionId, uint256 bidAmount)
        external
        view
        auctionExists(auctionId)
        returns (bool isValid, string memory reason)
    {
        Auction storage auction = auctions[auctionId];

        if (!auction.isActive || auction.isCompleted) {
            return (false, "Auction not active");
        }

        if (block.timestamp > auction.endTime) {
            return (false, "Auction expired");
        }

        if (msg.sender == auction.borrower) {
            return (false, "Borrower cannot bid");
        }

        uint256 currentPrice = _calculateCurrentPrice(auctionId);
        uint256 minimumBid = getMinimumBid(auctionId);

        if (auction.highestBidder != address(0)) {
            uint256 effectiveMinimum = minimumBid < currentPrice ? minimumBid : currentPrice;
            if (bidAmount < effectiveMinimum) {
                return (false, "Bid below effective minimum");
            }
        } else {
            if (bidAmount < currentPrice) {
                return (false, "Bid below current price");
            }
        }

        return (true, "");
    }

    function getAuctionDetails(uint256 auctionId)
        external
        view
        auctionExists(auctionId)
        returns (
            uint256 loanId,
            uint256 domainTokenId,
            address borrower,
            uint256 startingPrice,
            uint256 currentPrice,
            uint256 highestBid,
            address highestBidder,
            uint256 timeRemaining,
            bool isActive,
            string memory domainName
        )
    {
        Auction storage auction = auctions[auctionId];

        currentPrice = _calculateCurrentPrice(auctionId);
        timeRemaining = auction.endTime > block.timestamp ? auction.endTime - block.timestamp : 0;

        return (
            auction.loanId,
            auction.domainTokenId,
            auction.borrower,
            auction.startingPrice,
            currentPrice,
            auction.highestBid,
            auction.highestBidder,
            timeRemaining,
            auction.isActive,
            auction.domainName
        );
    }

    function getActiveAuctions() external view returns (uint256[] memory) {
        uint256 activeCount = 0;

        for (uint256 i = 1; i < nextAuctionId; i++) {
            if (auctions[i].isActive && !auctions[i].isCompleted) {
                activeCount++;
            }
        }

        uint256[] memory activeAuctions = new uint256[](activeCount);
        uint256 index = 0;

        for (uint256 i = 1; i < nextAuctionId; i++) {
            if (auctions[i].isActive && !auctions[i].isCompleted) {
                activeAuctions[index] = i;
                index++;
            }
        }

        return activeAuctions;
    }

    function getAuctionInfo(uint256 auctionId)
        external
        view
        auctionExists(auctionId)
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
        Auction storage auction = auctions[auctionId];
        currentPrice = _calculateCurrentPrice(auctionId);

        return (
            auction.domainTokenId,
            auction.startingPrice,
            currentPrice,
            auction.reservePrice,
            auction.endTime,
            auction.highestBidder,
            auction.isActive
        );
    }

    // Internal functions
    function _calculateCurrentPrice(uint256 auctionId) internal view returns (uint256) {
        Auction storage auction = auctions[auctionId];

        if (block.timestamp >= auction.endTime) {
            return auction.reservePrice;
        }

        uint256 timeElapsed = block.timestamp - auction.startTime;

        uint256 dailyDecreaseRate = 100;
        uint256 priceDecrease = (auction.startingPrice * timeElapsed * dailyDecreaseRate) / (1 days * 10000);

        if (priceDecrease >= auction.startingPrice) {
            return 0;
        }

        uint256 currentPrice = auction.startingPrice - priceDecrease;
        return currentPrice;
    }

    function _calculateReservePrice(uint256 loanAmount, uint256 aiScore) internal pure returns (uint256) {
        return 0;
    }

    function _calculateStartingPrice(uint256 loanAmount) internal pure returns (uint256) {
        return (loanAmount * STARTING_PRICE_MULTIPLIER) / 100;
    }

    function _completeAuction(uint256 auctionId) internal {
        Auction storage auction = auctions[auctionId];
        require(auction.highestBidder != address(0), "No valid bids");

        auction.isActive = false;
        auction.isCompleted = true;

        domaProtocol.safeTransferFrom(address(this), auction.highestBidder, auction.domainTokenId);

        uint256 surplus = auction.highestBid > auction.loanAmount ?
            auction.highestBid - auction.loanAmount : 0;

        usdc.safeTransfer(address(loanManager), auction.highestBid);
        loanManager.processAuctionProceeds(auctionId, auction.highestBid, auction.highestBidder);

        totalAuctionsCompleted++;
        totalAuctionVolume += auction.highestBid;

        emit AuctionEnded(
            auctionId,
            auction.loanId,
            auction.domainTokenId,
            auction.highestBidder,
            auction.highestBid,
            auction.loanAmount,
            surplus,
            block.timestamp
        );
    }

    function _cancelAuctionNoBids(uint256 auctionId) internal {
        Auction storage auction = auctions[auctionId];

        auction.isActive = false;
        auction.isCancelled = true;

        domaProtocol.safeTransferFrom(address(this), address(loanManager), auction.domainTokenId);

        emit AuctionCancelled(
            auctionId,
            auction.loanId,
            address(this),
            "Auction expired without bids",
            block.timestamp
        );
    }

    function _refundPreviousBidder(uint256 auctionId) internal {
        Auction storage auction = auctions[auctionId];

        if (auction.highestBidder != address(0) && auction.highestBid > 0) {
            address previousBidder = auction.highestBidder;
            uint256 refundAmount = auction.highestBid;

            auction.highestBidder = address(0);
            auction.highestBid = 0;

            usdc.safeTransfer(previousBidder, refundAmount);

            emit BidRefunded(
                auctionId,
                previousBidder,
                refundAmount,
                block.timestamp
            );
        }
    }

    function emergencyRescueNFT(
        address nftContract,
        uint256 tokenId,
        address recipient
    ) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        IERC721(nftContract).safeTransferFrom(address(this), recipient, tokenId);

        emit EmergencyRescue(nftContract, tokenId, recipient, block.timestamp);
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    /**
     * @dev Storage gap for future upgrades
     */
    uint256[50] private __gap;
}

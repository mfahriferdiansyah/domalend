// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IDoma.sol";
import "./interfaces/ISatoruLending.sol";
import "./interfaces/IDutchAuction.sol";
import "./interfaces/ILoanManager.sol";

contract LoanManagerUpgradeable is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable, ILoanManager {
    using SafeERC20 for IERC20;

    string public constant VERSION = "5.0.0";

    // Changed from immutable to storage variables
    IERC20 public usdc;
    IDoma public domaProtocol;
    ISatoruLending public satoruLending;
    IDutchAuction public dutchAuction;

    struct Loan {
        uint256 domainTokenId;
        address borrower;
        uint256 principalAmount;
        uint256 interestRate;
        uint256 startTime;
        uint256 duration;
        uint256 totalOwed;
        uint256 amountRepaid;
        uint256 poolId;
        uint256 requestId;
        bool isActive;
        bool isLiquidated;
        LoanStatus status;
        address[] lenders;
        mapping(address => uint256) lenderShares;
        address poolCreator;
    }

    mapping(uint256 => Loan) public loans;
    mapping(uint256 => bool) public lockedDomains;
    mapping(address => uint256[]) public userLoans;
    mapping(address => uint256[]) public lenderLoans;
    uint256 public nextLoanId;

    mapping(uint256 => uint256) public loanToAuction;
    mapping(uint256 => uint256) public auctionToLoan;

    uint256 public totalLoansCreated;
    uint256 public totalLoansRepaid;
    uint256 public totalLoansLiquidated;
    uint256 public totalInterestPaid;

    uint256 public constant LIQUIDATION_BUFFER = 10 seconds;
    uint256 public constant MAX_REPAYMENT_SLIPPAGE = 500;
    uint256 public constant REPAYMENT_TOLERANCE_MINUTES = 10;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

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

    event LoanClosed(
        uint256 indexed loanId,
        address indexed borrower,
        bool wasRepaid,
        bool wasLiquidated,
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

    event RepaymentDistributed(
        uint256 indexed loanId,
        uint256 totalAmount,
        address[] recipients,
        uint256[] amounts
    );

    event AuctionProceedsDistributed(
        uint256 indexed auctionId,
        uint256 indexed loanId,
        uint256 salePrice,
        address[] recipients,
        uint256[] amounts,
        uint256 surplus
    );

    event DutchAuctionUpdated(address oldAuction, address newAuction);

    modifier onlySatoruLending() {
        require(msg.sender == address(satoruLending), "Only SatoruLending");
        _;
    }

    modifier onlyDutchAuction() {
        require(msg.sender == address(dutchAuction), "Only DutchAuction");
        _;
    }

    modifier loanExists(uint256 loanId) {
        require(loanId < nextLoanId && loans[loanId].borrower != address(0), "Loan does not exist");
        _;
    }

    modifier loanActive(uint256 loanId) {
        require(loans[loanId].isActive, "Loan not active");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        address _usdc,
        address _domaProtocol,
        address _satoruLending
    ) public initializer {
        __Ownable_init(initialOwner);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        usdc = IERC20(_usdc);
        domaProtocol = IDoma(_domaProtocol);
        satoruLending = ISatoruLending(_satoruLending);

        nextLoanId = 1;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setDutchAuction(address _dutchAuction) external onlyOwner {
        address oldAuction = address(dutchAuction);
        dutchAuction = IDutchAuction(_dutchAuction);
        emit DutchAuctionUpdated(oldAuction, _dutchAuction);
    }

    function createPoolBasedLoan(CreateLoanParams memory params)
        external
        onlySatoruLending
        returns (uint256 loanId)
    {
        require(!lockedDomains[params.domainTokenId], "Domain already locked");

        loanId = nextLoanId++;
        Loan storage loan = loans[loanId];

        loan.domainTokenId = params.domainTokenId;
        loan.borrower = params.borrower;
        loan.principalAmount = params.loanAmount;
        loan.interestRate = params.interestRate;
        loan.startTime = block.timestamp;
        loan.duration = params.duration;
        loan.totalOwed = _calculateTotalOwed(params.loanAmount, params.interestRate, params.duration);
        loan.poolId = params.poolId;
        loan.isActive = true;
        loan.status = LoanStatus.Active;

        (address creator,,,,,,,,,,,,,) = satoruLending.getPoolInfo(params.poolId);
        loan.poolCreator = creator;

        lockCollateral(params.domainTokenId, params.borrower);
        _updateLoanTracking(loanId, new address[](0));

        totalLoansCreated++;

        emit LoanCreated(
            loanId,
            params.borrower,
            params.domainTokenId,
            params.loanAmount,
            params.interestRate,
            params.duration,
            loan.totalOwed,
            block.timestamp + params.duration,
            params.poolId,
            0
        );
    }

    function createCrowdfundedLoan(
        CreateLoanParams memory params,
        CrowdfundedLoanData memory loanData
    ) external onlySatoruLending returns (uint256 loanId) {
        require(!lockedDomains[params.domainTokenId], "Domain already locked");
        require(loanData.contributors.length > 0, "No contributors");
        require(loanData.contributors.length == loanData.contributions.length, "Array length mismatch");

        loanId = nextLoanId++;
        Loan storage loan = loans[loanId];

        loan.domainTokenId = params.domainTokenId;
        loan.borrower = params.borrower;
        loan.principalAmount = params.loanAmount;
        loan.interestRate = params.interestRate;
        loan.startTime = block.timestamp;
        loan.duration = params.duration;
        loan.totalOwed = _calculateTotalOwed(params.loanAmount, params.interestRate, params.duration);
        loan.requestId = params.requestId;
        loan.isActive = true;
        loan.status = LoanStatus.Active;

        loan.lenders = loanData.contributors;
        for (uint256 i = 0; i < loanData.contributors.length; i++) {
            loan.lenderShares[loanData.contributors[i]] = loanData.contributions[i];
        }

        lockCollateral(params.domainTokenId, params.borrower);
        _updateLoanTracking(loanId, loanData.contributors);

        totalLoansCreated++;

        emit LoanCreated(
            loanId,
            params.borrower,
            params.domainTokenId,
            params.loanAmount,
            params.interestRate,
            params.duration,
            loan.totalOwed,
            block.timestamp + params.duration,
            0,
            params.requestId
        );
    }

    function lockCollateral(uint256 domainTokenId, address borrower) public onlySatoruLending {
        require(domaProtocol.ownerOf(domainTokenId) == borrower, "Not domain owner");
        require(!lockedDomains[domainTokenId], "Domain already locked");

        domaProtocol.transferFrom(borrower, address(this), domainTokenId);
        lockedDomains[domainTokenId] = true;

        emit CollateralLocked(0, domainTokenId, borrower, block.timestamp);
    }

    function releaseCollateral(uint256 loanId)
        external
        loanExists(loanId)
        nonReentrant
    {
        Loan storage loan = loans[loanId];
        uint256 remainingBalance = loan.totalOwed - loan.amountRepaid;
        uint256 tolerance = calculateRepaymentTolerance(loanId);
        require(
            remainingBalance == 0 || remainingBalance <= tolerance || msg.sender == loan.borrower,
            "Not fully repaid or not borrower"
        );
        require(!loan.isLiquidated, "Loan was liquidated");
        require(lockedDomains[loan.domainTokenId], "Domain not locked");

        lockedDomains[loan.domainTokenId] = false;
        domaProtocol.transferFrom(address(this), loan.borrower, loan.domainTokenId);

        emit CollateralReleased(loanId, loan.domainTokenId, loan.borrower, block.timestamp);
    }

    function repayLoan(uint256 loanId, uint256 repaymentAmount)
        external
        loanExists(loanId)
        loanActive(loanId)
        nonReentrant
    {
        Loan storage loan = loans[loanId];
        require(repaymentAmount > 0, "Repayment must be positive");

        uint256 remainingBalance = loan.totalOwed - loan.amountRepaid;
        uint256 actualRepayment = repaymentAmount;
        uint256 overpayment = 0;

        if (repaymentAmount > remainingBalance) {
            actualRepayment = remainingBalance;
            overpayment = repaymentAmount - remainingBalance;
        }

        usdc.safeTransferFrom(msg.sender, address(this), repaymentAmount);

        if (overpayment > 0) {
            usdc.safeTransfer(msg.sender, overpayment);
        }

        loan.amountRepaid += actualRepayment;
        remainingBalance = loan.totalOwed - loan.amountRepaid;

        uint256 tolerance = calculateRepaymentTolerance(loanId);
        bool isFullyRepaid = remainingBalance == 0 || remainingBalance <= tolerance;

        (address[] memory recipients, uint256[] memory amounts) = _distributeRepayment(loanId, actualRepayment);

        totalInterestPaid += actualRepayment;

        emit LoanRepaid(
            loanId,
            loan.borrower,
            actualRepayment,
            remainingBalance,
            isFullyRepaid,
            block.timestamp
        );

        emit RepaymentDistributed(loanId, actualRepayment, recipients, amounts);

        if (isFullyRepaid) {
            loan.isActive = false;
            loan.status = LoanStatus.Repaid;
            totalLoansRepaid++;
            lockedDomains[loan.domainTokenId] = false;
            domaProtocol.transferFrom(address(this), loan.borrower, loan.domainTokenId);

            emit CollateralReleased(loanId, loan.domainTokenId, loan.borrower, block.timestamp);
            emit LoanClosed(loanId, loan.borrower, true, false, block.timestamp);
        }
    }

    function liquidateCollateral(uint256 loanId)
        external
        loanExists(loanId)
        loanActive(loanId)
        returns (uint256 auctionId)
    {
        require(isLoanDefaulted(loanId), "Loan not defaulted");
        require(address(dutchAuction) != address(0), "Dutch auction not set");

        Loan storage loan = loans[loanId];
        loan.isLiquidated = true;
        loan.isActive = false;
        loan.status = LoanStatus.Auctioning;

        uint256 aiScore = 75;
        string memory domainName = "defaultdomain.eth";

        IDutchAuction.StartAuctionParams memory auctionParams = IDutchAuction.StartAuctionParams({
            loanId: loanId,
            domainTokenId: loan.domainTokenId,
            borrower: loan.borrower,
            loanAmount: loan.totalOwed,
            aiScore: aiScore,
            domainName: domainName
        });

        domaProtocol.approve(address(dutchAuction), loan.domainTokenId);

        auctionId = dutchAuction.startAuction(auctionParams);

        loanToAuction[loanId] = auctionId;
        auctionToLoan[auctionId] = loanId;

        totalLoansLiquidated++;

        emit CollateralLiquidated(
            loanId,
            loan.domainTokenId,
            loan.borrower,
            loan.totalOwed,
            auctionId,
            loan.totalOwed * 2
        );

        emit LoanClosed(loanId, loan.borrower, false, true, block.timestamp);
    }

    function isLoanDefaulted(uint256 loanId)
        public
        view
        loanExists(loanId)
        returns (bool)
    {
        Loan storage loan = loans[loanId];
        if (!loan.isActive || loan.amountRepaid >= loan.totalOwed) {
            return false;
        }

        uint256 dueDate = loan.startTime + loan.duration;
        return block.timestamp > dueDate + LIQUIDATION_BUFFER;
    }

    function processAuctionProceeds(uint256 auctionId, uint256 salePrice, address winner)
        external
        onlyDutchAuction
    {
        uint256 loanId = auctionToLoan[auctionId];
        require(loanId != 0, "Invalid auction");

        Loan storage loan = loans[loanId];

        (address[] memory recipients, uint256[] memory amounts, uint256 surplus) =
            _distributeAuctionProceeds(loanId, salePrice);

        lockedDomains[loan.domainTokenId] = false;

        emit AuctionProceedsDistributed(auctionId, loanId, salePrice, recipients, amounts, surplus);
    }

    function _calculateTotalOwed(uint256 principal, uint256 interestRate, uint256 duration)
        internal
        pure
        returns (uint256)
    {
        uint256 interest = (principal * interestRate * duration) / (10000 * SECONDS_PER_YEAR);
        return principal + interest;
    }

    function _distributeRepayment(uint256 loanId, uint256 amount)
        internal
        returns (address[] memory recipients, uint256[] memory amounts)
    {
        Loan storage loan = loans[loanId];

        if (loan.poolId != 0) {
            recipients = new address[](1);
            amounts = new uint256[](1);
            recipients[0] = address(satoruLending);
            amounts[0] = amount;

            usdc.safeTransfer(address(satoruLending), amount);
        } else {
            recipients = new address[](loan.lenders.length);
            amounts = new uint256[](loan.lenders.length);

            for (uint256 i = 0; i < loan.lenders.length; i++) {
                uint256 share = (loan.lenderShares[loan.lenders[i]] * amount) / loan.principalAmount;
                recipients[i] = loan.lenders[i];
                amounts[i] = share;
                usdc.safeTransfer(loan.lenders[i], share);
            }
        }
    }

    function _distributeAuctionProceeds(uint256 loanId, uint256 salePrice)
        internal
        returns (address[] memory recipients, uint256[] memory amounts, uint256 surplus)
    {
        Loan storage loan = loans[loanId];
        uint256 totalOwed = loan.totalOwed - loan.amountRepaid;

        if (salePrice >= totalOwed) {
            surplus = salePrice - totalOwed;

            if (loan.poolId != 0) {
                recipients = new address[](surplus > 0 ? 2 : 1);
                amounts = new uint256[](surplus > 0 ? 2 : 1);

                recipients[0] = address(satoruLending);
                amounts[0] = totalOwed;
                usdc.safeTransfer(address(satoruLending), totalOwed);

                if (surplus > 0) {
                    recipients[1] = loan.borrower;
                    amounts[1] = surplus;
                    usdc.safeTransfer(loan.borrower, surplus);
                }
            } else {
                uint256 recipientCount = loan.lenders.length + (surplus > 0 ? 1 : 0);
                recipients = new address[](recipientCount);
                amounts = new uint256[](recipientCount);

                for (uint256 i = 0; i < loan.lenders.length; i++) {
                    uint256 share = (loan.lenderShares[loan.lenders[i]] * totalOwed) / loan.principalAmount;
                    recipients[i] = loan.lenders[i];
                    amounts[i] = share;
                    usdc.safeTransfer(loan.lenders[i], share);
                }

                if (surplus > 0) {
                    recipients[loan.lenders.length] = loan.borrower;
                    amounts[loan.lenders.length] = surplus;
                    usdc.safeTransfer(loan.borrower, surplus);
                }
            }
        } else {
            surplus = 0;

            if (loan.poolId != 0) {
                recipients = new address[](1);
                amounts = new uint256[](1);
                recipients[0] = address(satoruLending);
                amounts[0] = salePrice;
                usdc.safeTransfer(address(satoruLending), salePrice);
            } else {
                recipients = new address[](loan.lenders.length);
                amounts = new uint256[](loan.lenders.length);

                for (uint256 i = 0; i < loan.lenders.length; i++) {
                    uint256 share = (loan.lenderShares[loan.lenders[i]] * salePrice) / loan.principalAmount;
                    recipients[i] = loan.lenders[i];
                    amounts[i] = share;
                    usdc.safeTransfer(loan.lenders[i], share);
                }
            }
        }
    }

    function _updateLoanTracking(uint256 loanId, address[] memory lenders) internal {
        Loan storage loan = loans[loanId];

        userLoans[loan.borrower].push(loanId);

        for (uint256 i = 0; i < lenders.length; i++) {
            lenderLoans[lenders[i]].push(loanId);
        }
    }

    // View functions
    function getLoanInfo(uint256 loanId)
        external
        view
        loanExists(loanId)
        returns (
            address borrower,
            uint256 domainTokenId,
            uint256 loanAmount,
            uint256 interestRate,
            uint256 repaymentDeadline,
            bool isActive,
            uint256 totalOwed,
            uint256 amountRepaid,
            uint256 startTime,
            uint256 poolId,
            uint256 requestId,
            LoanStatus status
        )
    {
        Loan storage loan = loans[loanId];

        // Compute status dynamically for Overdue
        LoanStatus currentStatus = loan.status;
        if (currentStatus == LoanStatus.Active && isLoanDefaulted(loanId)) {
            currentStatus = LoanStatus.Overdue;
        }

        return (
            loan.borrower,
            loan.domainTokenId,
            loan.principalAmount,
            loan.interestRate,
            loan.startTime + loan.duration,
            loan.isActive,
            loan.totalOwed,
            loan.amountRepaid,
            loan.startTime,
            loan.poolId,
            loan.requestId,
            currentStatus
        );
    }

    function getLoanStatus(uint256 loanId)
        external
        view
        loanExists(loanId)
        returns (LoanStatus)
    {
        Loan storage loan = loans[loanId];

        // Handle computed Overdue status (if not updated yet)
        if (loan.status == LoanStatus.Active && isLoanDefaulted(loanId)) {
            return LoanStatus.Overdue;
        }

        return loan.status;
    }

    function markAuctionCompleted(uint256 loanId)
        external
        onlyDutchAuction
        loanExists(loanId)
    {
        loans[loanId].status = LoanStatus.Sold;
    }

    function isCollateralLocked(uint256 domainTokenId) external view returns (bool) {
        return lockedDomains[domainTokenId];
    }

    function calculateCurrentOwed(uint256 loanId)
        external
        view
        loanExists(loanId)
        returns (uint256 totalOwed, uint256 remainingBalance)
    {
        Loan storage loan = loans[loanId];
        totalOwed = loan.totalOwed;
        remainingBalance = loan.totalOwed - loan.amountRepaid;
    }

    function calculateRepaymentTolerance(uint256 loanId) public view returns (uint256) {
        Loan storage loan = loans[loanId];

        uint256 toleranceSeconds = REPAYMENT_TOLERANCE_MINUTES * 60;
        uint256 annualizedTolerance = (loan.principalAmount * loan.interestRate * toleranceSeconds) / (SECONDS_PER_YEAR * 10000);

        return annualizedTolerance > 1000 ? annualizedTolerance : 1000;
    }

    function getProtocolStats()
        external
        view
        returns (
            uint256 totalLoans,
            uint256 totalRepaid,
            uint256 totalLiquidated,
            uint256 totalInterest,
            uint256 activeLoans
        )
    {
        uint256 active = 0;
        for (uint256 i = 1; i < nextLoanId; i++) {
            if (loans[i].isActive) {
                active++;
            }
        }

        return (
            totalLoansCreated,
            totalLoansRepaid,
            totalLoansLiquidated,
            totalInterestPaid,
            active
        );
    }

    function getVersion() external pure returns (string memory) {
        return VERSION;
    }

    /**
     * @dev Storage gap for future upgrades
     * Reduced from 50 to 49 after adding LoanStatus status field
     */
    uint256[49] private __gap;
}

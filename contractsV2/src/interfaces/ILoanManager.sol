// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILoanManager
 * @dev Interface for Loan Manager contract
 */
interface ILoanManager {
    struct CreateLoanParams {
        address borrower;
        uint256 domainTokenId;
        uint256 loanAmount;
        uint256 interestRate;
        uint256 duration;
        uint256 aiScore;
        uint256 poolId;
        uint256 requestId;
    }

    struct CrowdfundedLoanData {
        address[] contributors;
        uint256[] contributions;
        uint256 totalContributions;
    }

    function createPoolBasedLoan(CreateLoanParams memory params)
        external
        returns (uint256 loanId);

    function createCrowdfundedLoan(
        CreateLoanParams memory params,
        CrowdfundedLoanData memory loanData
    ) external returns (uint256 loanId);

    function lockCollateral(uint256 domainTokenId, address borrower) external;
    function releaseCollateral(uint256 loanId) external;
    function isCollateralLocked(uint256 domainTokenId) external view returns (bool);
    function getLoanInfo(uint256 loanId) external view returns (
        address borrower,
        uint256 domainTokenId,
        uint256 loanAmount,
        uint256 interestRate,
        uint256 repaymentDeadline,
        bool isActive
    );

    function processAuctionProceeds(uint256 auctionId, uint256 salePrice, address winner) external;
}
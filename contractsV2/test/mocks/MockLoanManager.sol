// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../src/interfaces/ILoanManager.sol";

contract MockLoanManager is ILoanManager {
    mapping(uint256 => bool) private _lockedDomains;

    function createPoolBasedLoan(CreateLoanParams memory) external pure returns (uint256) {
        return 1; // Mock loan ID
    }

    function createCrowdfundedLoan(CreateLoanParams memory, CrowdfundedLoanData memory)
        external
        pure
        returns (uint256)
    {
        return 1; // Mock loan ID
    }

    function lockCollateral(uint256 domainTokenId, address) external {
        _lockedDomains[domainTokenId] = true;
    }

    function releaseCollateral(uint256 domainTokenId) external {
        _lockedDomains[domainTokenId] = false;
    }

    function isCollateralLocked(uint256 domainTokenId) external view returns (bool) {
        return _lockedDomains[domainTokenId];
    }

    function getLoanInfo(uint256) external pure returns (
        address borrower,
        uint256 domainTokenId,
        uint256 loanAmount,
        uint256 interestRate,
        uint256 repaymentDeadline,
        bool isActive
    ) {
        return (address(0), 0, 0, 0, 0, false);
    }

    function processAuctionProceeds(uint256, uint256, address) external {
        // Mock implementation - just accept the call
    }
}
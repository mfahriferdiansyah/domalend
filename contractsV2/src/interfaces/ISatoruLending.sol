// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ISatoruLending
 * @dev Interface for SatoruLending contract
 */
interface ISatoruLending {
    function addLiquidity(uint256 poolId, uint256 amount) external;
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
        );
}
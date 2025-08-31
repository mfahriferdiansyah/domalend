// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library PointsCalculations {
    // Simplified: 1 USDC = 1 Point (no time-based accumulation)
    // This makes fee distribution transparent and predictable
    
    struct StakeInfo {
        uint256 amount;              // USDC staked (also equals points)
        uint256 stakeTimestamp;      // When user first staked
        uint256 lastUpdateTimestamp; // Last time points were calculated (kept for compatibility)
        uint256 accumulatedPoints;   // Not used in simplified model (kept for compatibility)
    }
    
    function calculateUserPoints(StakeInfo memory stake) internal pure returns (uint256) {
        // Simplified: Points = USDC staked amount (1:1 ratio)
        return stake.amount;
    }
    
    function updateStakeInfo(StakeInfo storage stake) internal returns (uint256 newPoints) {
        // Simplified: No time-based accumulation needed
        // Points change only when stake amount changes
        stake.lastUpdateTimestamp = block.timestamp;
        return 0; // No new points from time passage
    }
    
    function calculateProportionalReduction(
        uint256 withdrawAmount,
        uint256 totalWithdrawable,
        uint256 currentPoints,
        uint256 currentDeposits,
        uint256 currentStake
    ) internal pure returns (
        uint256 pointsToRemove,
        uint256 depositReduction,
        uint256 stakeReduction
    ) {
        // Calculate proportional reduction based on withdrawal amount
        uint256 shareReduction = (withdrawAmount * 10000) / totalWithdrawable; // basis points
        
        // Since points = stake in 1:1 model, pointsToRemove = stakeReduction
        stakeReduction = (currentStake * shareReduction) / 10000;
        pointsToRemove = stakeReduction; // 1:1 with stake
        depositReduction = (currentDeposits * shareReduction) / 10000;
    }
    
    function calculateWithdrawableAmount(
        uint256 userPoints,
        uint256 totalPoints,
        uint256 totalPoolValue,
        uint256 userDeposits
    ) internal pure returns (uint256) {
        if (totalPoints == 0 || totalPoolValue == 0) {
            return userDeposits; // If no points or pool value, return original stake
        }
        
        // User's proportional share of the total pool value
        return (userPoints * totalPoolValue) / totalPoints;
    }
    
    function calculateUserPointsShare(uint256 userPoints, uint256 totalPoints) internal pure returns (uint256) {
        if (totalPoints == 0) return 0;
        return (userPoints * 10000) / totalPoints; // basis points
    }
    
    function calculateYieldEarned(uint256 currentValue, uint256 originalStake) internal pure returns (uint256) {
        return currentValue > originalStake ? currentValue - originalStake : 0;
    }
}
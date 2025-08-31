// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library LiquidityCalculations {
    uint256 public constant MINIMUM_LIQUIDITY_RESERVE = 2500; // 25% in basis points
    uint256 public constant OPTIMAL_LIQUIDITY_RESERVE = 3000; // 30% in basis points
    
    struct WithdrawalRequest {
        address user;
        uint256 amount;
        uint256 timestamp;
        uint256 stakeDuration; // Duration user has been staking (for priority)
        bool fulfilled;
    }
    
    function getUtilizationRate(uint256 totalDeposited, uint256 currentLiquidity) internal pure returns (uint256) {
        if (totalDeposited == 0) return 0;
        if (currentLiquidity >= totalDeposited) return 0;
        return ((totalDeposited - currentLiquidity) * 10000) / totalDeposited;
    }
    
    function calculateExitFee(uint256 requestedAmount, uint256 utilization) internal pure returns (uint256) {
        if (utilization < 7000) return 0;           // No fee below 70% utilization
        if (utilization < 8500) return (requestedAmount * 50) / 10000;    // 0.5% fee at 70-85%
        if (utilization < 9500) return (requestedAmount * 200) / 10000;   // 2% fee at 85-95%
        return (requestedAmount * 500) / 10000;     // 5% fee above 95%
    }
    
    function isLiquidityAdequate(uint256 currentLiquidity, uint256 totalDeposited) internal pure returns (bool) {
        uint256 requiredReserve = (totalDeposited * MINIMUM_LIQUIDITY_RESERVE) / 10000;
        return currentLiquidity >= requiredReserve;
    }
    
    function getAvailableLiquidity(uint256 currentLiquidity, uint256 totalDeposited) internal pure returns (uint256) {
        uint256 requiredReserve = (totalDeposited * MINIMUM_LIQUIDITY_RESERVE) / 10000;
        return currentLiquidity > requiredReserve ? currentLiquidity - requiredReserve : 0;
    }
    
    function createWithdrawalRequest(
        address user,
        uint256 amount,
        uint256 stakeDuration
    ) internal view returns (WithdrawalRequest memory) {
        return WithdrawalRequest({
            user: user,
            amount: amount,
            timestamp: block.timestamp,
            stakeDuration: stakeDuration,
            fulfilled: false
        });
    }
    
    function canFulfillWithdrawal(uint256 requestAmount, uint256 availableLiquidity) internal pure returns (bool) {
        return availableLiquidity >= requestAmount;
    }
    
    function validateLoanAgainstReserves(
        uint256 requestedAmount,
        uint256 currentLiquidity,
        uint256 totalDeposited
    ) internal pure returns (bool) {
        uint256 requiredReserve = (totalDeposited * MINIMUM_LIQUIDITY_RESERVE) / 10000;
        return currentLiquidity - requestedAmount >= requiredReserve;
    }
}
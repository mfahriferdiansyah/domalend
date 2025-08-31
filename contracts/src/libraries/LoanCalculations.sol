// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library LoanCalculations {
    uint256 public constant MINIMUM_FEE_RATE = 50; // 0.5% minimum fee in basis points
    
    struct Loan {
        uint256 domainTokenId;
        address borrower;
        uint256 principalAmount;
        uint256 interestRate; // basis points (1000 = 10%)
        uint256 startTime;
        uint256 duration;
        uint256 amountRepaid;
        bool isActive;
        bool isLiquidated;
    }
    
    function calculateTotalOwed(Loan memory loan) internal view returns (uint256) {
        // Time-based interest calculation
        uint256 timeElapsed = block.timestamp - loan.startTime;
        uint256 timeBasedInterest = (loan.principalAmount * loan.interestRate * timeElapsed) / (365 days * 10000);
        
        // Minimum fee calculation (0.5% of principal)
        uint256 minimumFee = (loan.principalAmount * MINIMUM_FEE_RATE) / 10000;
        
        // Use the higher of time-based interest or minimum fee
        uint256 actualFee = timeBasedInterest > minimumFee ? timeBasedInterest : minimumFee;
        
        return loan.principalAmount + actualFee;
    }
    
    function calculateTotalOwedWithSlippage(Loan memory loan) internal view returns (uint256) {
        // Calculate with 5 minutes extra time for slippage protection
        uint256 timeElapsed = (block.timestamp + 5 minutes) - loan.startTime;
        uint256 timeBasedInterest = (loan.principalAmount * loan.interestRate * timeElapsed) / (365 days * 10000);
        
        // Minimum fee calculation (0.5% of principal)
        uint256 minimumFee = (loan.principalAmount * MINIMUM_FEE_RATE) / 10000;
        
        // Use the higher of time-based interest or minimum fee
        uint256 actualFee = timeBasedInterest > minimumFee ? timeBasedInterest : minimumFee;
        
        return loan.principalAmount + actualFee;
    }
    
    function calculateMinimumFee(uint256 principal) internal pure returns (uint256) {
        return (principal * MINIMUM_FEE_RATE) / 10000;
    }
    
    function calculatePaymentPortions(uint256 paymentAmount, uint256 principalAmount, uint256 totalRepaid) 
        internal 
        pure 
        returns (uint256 principalPortion, uint256 feePortion) 
    {
        principalPortion = paymentAmount > principalAmount - (totalRepaid - paymentAmount) 
            ? principalAmount - (totalRepaid - paymentAmount) 
            : 0;
        feePortion = paymentAmount - principalPortion;
    }
    
    function isLoanDefaulted(Loan memory loan) internal view returns (bool) {
        return block.timestamp > loan.startTime + loan.duration;
    }
}
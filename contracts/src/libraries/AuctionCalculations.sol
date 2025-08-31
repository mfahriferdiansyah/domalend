// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library AuctionCalculations {
    uint256 public constant AUCTION_PRICE_DECREASE_RATE = 100; // 1% per day
    uint256 public constant SECONDS_PER_DAY = 86400;
    
    struct DutchAuction {
        uint256 loanId;
        uint256 startPrice;
        uint256 startTime;
        uint256 minimumPrice;
        bool isActive;
        address winner;
        uint256 finalPrice;
    }
    
    function getCurrentAuctionPrice(DutchAuction memory auction) internal view returns (uint256) {
        require(auction.isActive, "Auction not active");
        
        uint256 timeElapsed = block.timestamp - auction.startTime;
        
        // Continuous 1% decrease per day (calculated per second)
        // Formula: startPrice * timeElapsed * rate / (secondsPerDay * 10000)
        uint256 priceDecrease = (auction.startPrice * timeElapsed * AUCTION_PRICE_DECREASE_RATE) / (SECONDS_PER_DAY * 10000);
        
        if (priceDecrease >= auction.startPrice - auction.minimumPrice) {
            return auction.minimumPrice;
        }
        
        return auction.startPrice - priceDecrease;
    }
    
    function createAuction(
        uint256 loanId,
        uint256 totalOwed,
        uint256 amountRepaid
    ) internal view returns (DutchAuction memory) {
        uint256 remainingBalance = totalOwed - amountRepaid;
        uint256 startPrice = remainingBalance * 2; // Start at 2x
        
        return DutchAuction({
            loanId: loanId,
            startPrice: startPrice,
            startTime: block.timestamp,
            minimumPrice: remainingBalance,
            isActive: true,
            winner: address(0),
            finalPrice: 0
        });
    }
    
    function finalizeAuction(DutchAuction storage auction, address winner, uint256 finalPrice) internal {
        auction.isActive = false;
        auction.winner = winner;
        auction.finalPrice = finalPrice;
    }
}
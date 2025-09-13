// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDutchAuction
 * @dev Interface for DutchAuction contract
 */
interface IDutchAuction {
    struct StartAuctionParams {
        uint256 loanId;
        uint256 domainTokenId;
        address borrower;
        uint256 loanAmount;
        uint256 aiScore;
        string domainName;
    }

    function startAuction(StartAuctionParams memory params)
        external
        returns (uint256 auctionId);

    function getCurrentPrice(uint256 auctionId)
        external
        view
        returns (uint256);

    function placeBid(uint256 auctionId, uint256 bidAmount) external;

    function endAuction(uint256 auctionId) external;

    function getAuctionInfo(uint256 auctionId)
        external
        view
        returns (
            uint256 domainTokenId,
            uint256 startingPrice,
            uint256 currentPrice,
            uint256 reservePrice,
            uint256 endTime,
            address highestBidder,
            bool isActive
        );
}
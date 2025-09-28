// Placeholder ABI for DutchAuction contract
// This will be replaced with the actual ABI after contract compilation

export const DutchAuction_ABI = [
  // Events
  {
    type: 'event',
    name: 'AuctionStarted',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'loanId', type: 'uint256', indexed: true },
      { name: 'domainTokenId', type: 'uint256', indexed: true },
      { name: 'borrower', type: 'address', indexed: false },
      { name: 'startingPrice', type: 'uint256', indexed: false },
      { name: 'reservePrice', type: 'uint256', indexed: false },
      { name: 'startTimestamp', type: 'uint256', indexed: false },
      { name: 'endTimestamp', type: 'uint256', indexed: false },
      { name: 'aiScore', type: 'uint256', indexed: false },
      { name: 'domainName', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BidPlaced',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'bidder', type: 'address', indexed: true },
      { name: 'bidAmount', type: 'uint256', indexed: false },
      { name: 'currentPrice', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
      { name: 'isWinningBid', type: 'bool', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'AuctionEnded',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'loanId', type: 'uint256', indexed: true },
      { name: 'domainTokenId', type: 'uint256', indexed: true },
      { name: 'winner', type: 'address', indexed: false },
      { name: 'finalPrice', type: 'uint256', indexed: false },
      { name: 'loanAmount', type: 'uint256', indexed: false },
      { name: 'surplus', type: 'uint256', indexed: false },
      { name: 'endTimestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'AuctionCancelled',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'reason', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BidRefunded',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'bidder', type: 'address', indexed: true },
      { name: 'refundAmount', type: 'uint256', indexed: false },
    ],
  },
  // Functions (minimal for interaction)
  {
    type: 'function',
    name: 'placeBid',
    inputs: [{ name: 'auctionId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'getCurrentPrice',
    inputs: [{ name: 'auctionId', type: 'uint256' }],
    outputs: [{ name: 'currentPrice', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;
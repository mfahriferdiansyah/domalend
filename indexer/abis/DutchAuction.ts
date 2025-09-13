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
      { name: 'startingPrice', type: 'uint256', indexed: false },
      { name: 'startTime', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'AuctionBidPlaced',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'bidder', type: 'address', indexed: true },
      { name: 'bidAmount', type: 'uint256', indexed: false },
      { name: 'currentPrice', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'AuctionEnded',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'winner', type: 'address', indexed: true },
      { name: 'finalPrice', type: 'uint256', indexed: false },
      { name: 'domainTokenId', type: 'uint256', indexed: true },
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
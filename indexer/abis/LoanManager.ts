// Placeholder ABI for LoanManager contract
// This will be replaced with the actual ABI after contract compilation

export const LoanManager_ABI = [
  // Events
  {
    type: 'event',
    name: 'LoanCreated',
    inputs: [
      { name: 'loanId', type: 'uint256', indexed: true },
      { name: 'borrower', type: 'address', indexed: true },
      { name: 'domainTokenId', type: 'uint256', indexed: true },
      { name: 'principalAmount', type: 'uint256', indexed: false },
      { name: 'interestRate', type: 'uint256', indexed: false },
      { name: 'duration', type: 'uint256', indexed: false },
      { name: 'totalOwed', type: 'uint256', indexed: false },
      { name: 'dueDate', type: 'uint256', indexed: false },
      { name: 'poolId', type: 'uint256', indexed: false },
      { name: 'requestId', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LoanRepaid',
    inputs: [
      { name: 'loanId', type: 'uint256', indexed: true },
      { name: 'borrower', type: 'address', indexed: true },
      { name: 'repaymentAmount', type: 'uint256', indexed: false },
      { name: 'remainingBalance', type: 'uint256', indexed: false },
      { name: 'isFullyRepaid', type: 'bool', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LoanClosed',
    inputs: [
      { name: 'loanId', type: 'uint256', indexed: true },
      { name: 'borrower', type: 'address', indexed: true },
      { name: 'wasRepaid', type: 'bool', indexed: false },
      { name: 'wasLiquidated', type: 'bool', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'CollateralLocked',
    inputs: [
      { name: 'loanId', type: 'uint256', indexed: true },
      { name: 'domainTokenId', type: 'uint256', indexed: true },
      { name: 'borrower', type: 'address', indexed: true },
      { name: 'lockTimestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'CollateralReleased',
    inputs: [
      { name: 'loanId', type: 'uint256', indexed: true },
      { name: 'domainTokenId', type: 'uint256', indexed: true },
      { name: 'borrower', type: 'address', indexed: true },
      { name: 'releaseTimestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'CollateralLiquidated',
    inputs: [
      { name: 'loanId', type: 'uint256', indexed: true },
      { name: 'domainTokenId', type: 'uint256', indexed: true },
      { name: 'borrower', type: 'address', indexed: true },
      { name: 'loanAmount', type: 'uint256', indexed: false },
      { name: 'auctionId', type: 'uint256', indexed: false },
      { name: 'startingPrice', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'RepaymentDistributed',
    inputs: [
      { name: 'loanId', type: 'uint256', indexed: true },
      { name: 'totalAmount', type: 'uint256', indexed: false },
      { name: 'recipients', type: 'address[]', indexed: false },
      { name: 'amounts', type: 'uint256[]', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'AuctionProceedsDistributed',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'loanId', type: 'uint256', indexed: true },
      { name: 'salePrice', type: 'uint256', indexed: false },
      { name: 'recipients', type: 'address[]', indexed: false },
      { name: 'amounts', type: 'uint256[]', indexed: false },
      { name: 'surplus', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DutchAuctionUpdated',
    inputs: [
      { name: 'oldAuction', type: 'address', indexed: false },
      { name: 'newAuction', type: 'address', indexed: false },
    ],
  },
  // Functions (minimal for interaction)
  {
    type: 'function',
    name: 'repayLoan',
    inputs: [
      { name: 'loanId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'checkAndTriggerLiquidation',
    inputs: [{ name: 'loanId', type: 'uint256' }],
    outputs: [{ name: 'wasTriggered', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;
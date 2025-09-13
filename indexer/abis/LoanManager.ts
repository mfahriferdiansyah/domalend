// Placeholder ABI for LoanManager contract
// This will be replaced with the actual ABI after contract compilation

export const LoanManager_ABI = [
  // Events
  {
    type: 'event',
    name: 'LoanRepaid',
    inputs: [
      { name: 'loanId', type: 'uint256', indexed: true },
      { name: 'borrower', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'isFullRepayment', type: 'bool', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LoanDefaulted',
    inputs: [
      { name: 'loanId', type: 'uint256', indexed: true },
      { name: 'borrower', type: 'address', indexed: true },
      { name: 'domainTokenId', type: 'uint256', indexed: true },
      { name: 'outstandingAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LiquidationTriggered',
    inputs: [
      { name: 'loanId', type: 'uint256', indexed: true },
      { name: 'domainTokenId', type: 'uint256', indexed: true },
      { name: 'auctionId', type: 'uint256', indexed: false },
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
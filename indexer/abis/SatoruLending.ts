// Placeholder ABI for SatoruLending contract
// This will be replaced with the actual ABI after contract compilation

export const SatoruLending_ABI = [
  // Events
  {
    type: 'event',
    name: 'InstantLoanExecuted',
    inputs: [
      { name: 'loanId', type: 'uint256', indexed: true },
      { name: 'borrower', type: 'address', indexed: true },
      { name: 'domainTokenId', type: 'uint256', indexed: true },
      { name: 'poolId', type: 'uint256', indexed: false },
      { name: 'loanAmount', type: 'uint256', indexed: false },
      { name: 'interestRate', type: 'uint256', indexed: false },
      { name: 'repaymentDeadline', type: 'uint256', indexed: false },
      { name: 'aiScore', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PoolCreated',
    inputs: [
      { name: 'poolId', type: 'uint256', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'liquidityAmount', type: 'uint256', indexed: false },
      { name: 'minAiScore', type: 'uint256', indexed: false },
      { name: 'interestRate', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LiquidityAdded',
    inputs: [
      { name: 'poolId', type: 'uint256', indexed: true },
      { name: 'provider', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LiquidityRemoved',
    inputs: [
      { name: 'poolId', type: 'uint256', indexed: true },
      { name: 'provider', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  // Functions (minimal for interaction)
  {
    type: 'function',
    name: 'executeInstantLoan',
    inputs: [
      { name: 'domainTokenId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'poolId', type: 'uint256' },
    ],
    outputs: [{ name: 'loanId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
] as const;
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
      { name: 'initialLiquidity', type: 'uint256', indexed: false },
      { name: 'minAiScore', type: 'uint256', indexed: false },
      { name: 'interestRate', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
      { name: 'maxDomainExpiration', type: 'uint256', indexed: false },
      { name: 'minLoanAmount', type: 'uint256', indexed: false },
      { name: 'maxLoanAmount', type: 'uint256', indexed: false },
      { name: 'minDuration', type: 'uint256', indexed: false },
      { name: 'maxDuration', type: 'uint256', indexed: false },
      { name: 'allowAdditionalProviders', type: 'bool', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LiquidityAdded',
    inputs: [
      { name: 'poolId', type: 'uint256', indexed: true },
      { name: 'provider', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'newTotalLiquidity', type: 'uint256', indexed: false },
      { name: 'providerShares', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LiquidityRemoved',
    inputs: [
      { name: 'poolId', type: 'uint256', indexed: true },
      { name: 'provider', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'interestEarned', type: 'uint256', indexed: false },
      { name: 'remainingShares', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PoolUpdated',
    inputs: [
      { name: 'poolId', type: 'uint256', indexed: true },
      { name: 'updatedBy', type: 'address', indexed: true },
      { name: 'newMinAiScore', type: 'uint256', indexed: false },
      { name: 'newInterestRate', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LoanRequestCreated',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'borrower', type: 'address', indexed: true },
      { name: 'domainTokenId', type: 'uint256', indexed: true },
      { name: 'requestedAmount', type: 'uint256', indexed: false },
      { name: 'proposedInterestRate', type: 'uint256', indexed: false },
      { name: 'aiScore', type: 'uint256', indexed: false },
      { name: 'campaignDeadline', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LoanRequestFunded',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'contributor', type: 'address', indexed: true },
      { name: 'contributionAmount', type: 'uint256', indexed: false },
      { name: 'totalFunded', type: 'uint256', indexed: false },
      { name: 'remainingAmount', type: 'uint256', indexed: false },
      { name: 'isFullyFunded', type: 'bool', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LoanExecuted',
    inputs: [
      { name: 'loanId', type: 'uint256', indexed: true },
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'borrower', type: 'address', indexed: true },
      { name: 'domainTokenId', type: 'uint256', indexed: false },
      { name: 'loanAmount', type: 'uint256', indexed: false },
      { name: 'contributors', type: 'address[]', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LoanRequestCancelled',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'borrower', type: 'address', indexed: true },
      { name: 'totalRefunded', type: 'uint256', indexed: false },
      { name: 'reason', type: 'string', indexed: false },
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
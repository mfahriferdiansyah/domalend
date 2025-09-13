// Updated ABI for deployed AIOracle contract
// Extracted from actual deployed contract on Doma testnet

export const AIOracle_ABI = [
  // Events from deployed contract
  {
    type: 'event',
    name: 'ScoringRequested',
    inputs: [
      { name: 'domainTokenId', type: 'uint256', indexed: true },
      { name: 'requester', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ScoreSubmitted',
    inputs: [
      { name: 'domainTokenId', type: 'uint256', indexed: true },
      { name: 'score', type: 'uint256', indexed: false },
      { name: 'submittedBy', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BatchScoringRequested',
    inputs: [
      { name: 'domainTokenIds', type: 'uint256[]', indexed: false },
      { name: 'requester', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BatchScoresSubmitted',
    inputs: [
      { name: 'domainTokenIds', type: 'uint256[]', indexed: false },
      { name: 'scores', type: 'uint256[]', indexed: false },
      { name: 'submittedBy', type: 'address', indexed: true },
      { name: 'batchSize', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ScoreInvalidated',
    inputs: [
      { name: 'domainTokenId', type: 'uint256', indexed: true },
      { name: 'invalidatedBy', type: 'address', indexed: true },
      { name: 'reason', type: 'string', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BackendServiceUpdated',
    inputs: [
      { name: 'oldService', type: 'address', indexed: true },
      { name: 'newService', type: 'address', indexed: true },
      { name: 'updatedBy', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'EmergencyPauseToggled',
    inputs: [
      { name: 'isPaused', type: 'bool', indexed: false },
      { name: 'toggledBy', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  // Functions
  {
    type: 'function',
    name: 'requestScoring',
    inputs: [{ name: 'domainTokenId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'submitScore',
    inputs: [
      { name: 'domainTokenId', type: 'uint256' },
      { name: 'score', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'batchRequestScoring',
    inputs: [{ name: 'domainTokenIds', type: 'uint256[]' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'batchSubmitScores',
    inputs: [
      { name: 'domainTokenIds', type: 'uint256[]' },
      { name: 'scores', type: 'uint256[]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;
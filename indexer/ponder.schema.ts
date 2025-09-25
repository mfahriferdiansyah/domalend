import { onchainTable, index, relations } from "ponder";

// Scoring Events tracking from AIOracle - CRITICAL FOR DEBUGGING
export const scoringEvent = onchainTable(
  "scoring_event",
  (t) => ({
    id: t.text().primaryKey(),
    domainTokenId: t.text().notNull(),
    domainName: t.text(),
    requesterAddress: t.hex().notNull(),
    aiScore: t.integer(),
    confidence: t.integer(),
    reasoning: t.text(),
    submissionTxHash: t.text(),
    requestTimestamp: t.timestamp().notNull(),
    backendCallTimestamp: t.timestamp(),
    submissionTimestamp: t.timestamp(),
    completionTimestamp: t.timestamp(),
    status: t.text().notNull(), // 'pending', 'backend_called', 'submitted', 'completed', 'failed', 'batch_requested', 'invalidated', 'backend_updated', 'emergency_paused', 'emergency_unpaused'
    errorMessage: t.text(),
    retryCount: t.integer().notNull().default(0),
    processingDurationMs: t.integer(),
  }),
  (table) => ({
    domainTokenIdIndex: index().on(table.domainTokenId),
    statusIndex: index().on(table.status),
    requestTimestampIndex: index().on(table.requestTimestamp),
  })
);

// Loan Events from SatoruLending and LoanManager
export const loanEvent = onchainTable(
  "loan_event", 
  (t) => ({
    id: t.text().primaryKey(),
    eventType: t.text().notNull(), // 'created_instant', 'created_crowdfunded', 'repaid_full', 'repaid_partial', 'liquidated', 'defaulted', 'collateral_locked', 'collateral_released'
    loanId: t.text(),
    requestId: t.text(),
    borrowerAddress: t.hex().notNull(),
    domainTokenId: t.text().notNull(),
    domainName: t.text(),
    loanAmount: t.text().notNull(), // Store as string to avoid precision loss
    aiScore: t.integer(),
    interestRate: t.integer(),
    poolId: t.text(),
    repaymentDeadline: t.timestamp(),
    eventTimestamp: t.timestamp().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    // Liquidation tracking fields
    liquidationAttempted: t.boolean().notNull().default(false),
    liquidationTxHash: t.text(),
    liquidationTimestamp: t.timestamp(),
    liquidationBufferHours: t.integer().default(24), // Buffer period before liquidation
  }),
  (table) => ({
    loanIdIndex: index().on(table.loanId),
    domainTokenIdIndex: index().on(table.domainTokenId),
    eventTypeIndex: index().on(table.eventType),
    eventTimestampIndex: index().on(table.eventTimestamp),
    liquidationAttemptedIndex: index().on(table.liquidationAttempted),
    repaymentDeadlineIndex: index().on(table.repaymentDeadline),
  })
);

// Auction Events from DutchAuction
export const auctionEvent = onchainTable(
  "auction_event",
  (t) => ({
    id: t.text().primaryKey(),
    eventType: t.text().notNull(), // 'started', 'bid_placed', 'ended', 'cancelled'
    auctionId: t.text().notNull(),
    loanId: t.text(),
    domainTokenId: t.text().notNull(),
    domainName: t.text(),
    borrowerAddress: t.hex(),
    bidderAddress: t.hex(),
    aiScore: t.integer(),
    startingPrice: t.text(),
    currentPrice: t.text(),
    finalPrice: t.text(),
    recoveryRate: t.real(), // finalPrice / loanAmount
    eventTimestamp: t.timestamp().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    auctionIdIndex: index().on(table.auctionId),
    domainTokenIdIndex: index().on(table.domainTokenId),
    eventTypeIndex: index().on(table.eventType),
  })
);

// Loan Requests from SatoruLending (Crowdfunding)
export const loanRequest = onchainTable(
  "loan_request",
  (t) => ({
    id: t.text().primaryKey(),
    requestId: t.text().notNull(),
    borrowerAddress: t.hex().notNull(),
    domainTokenId: t.text().notNull(),
    domainName: t.text(),
    requestedAmount: t.text().notNull(),
    proposedInterestRate: t.integer().notNull(),
    aiScore: t.integer(),
    campaignDeadline: t.timestamp().notNull(),
    totalFunded: t.text().notNull().default("0"),
    contributorCount: t.integer().notNull().default(0),
    status: t.text().notNull().default("active"), // 'active', 'funded', 'executed', 'cancelled'
    eventTimestamp: t.timestamp().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    requestIdIndex: index().on(table.requestId),
    borrowerIndex: index().on(table.borrowerAddress),
    domainTokenIdIndex: index().on(table.domainTokenId),
    statusIndex: index().on(table.status),
  })
);

// Loan Request Funding Events
export const loanFunding = onchainTable(
  "loan_funding",
  (t) => ({
    id: t.text().primaryKey(),
    requestId: t.text().notNull(),
    contributorAddress: t.hex().notNull(),
    contributionAmount: t.text().notNull(),
    totalFunded: t.text().notNull(),
    remainingAmount: t.text().notNull(),
    isFullyFunded: t.boolean().notNull(),
    eventTimestamp: t.timestamp().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    requestIdIndex: index().on(table.requestId),
    contributorIndex: index().on(table.contributorAddress),
  })
);

// Pool Events from SatoruLending
export const poolEvent = onchainTable(
  "pool_event",
  (t) => ({
    id: t.text().primaryKey(),
    eventType: t.text().notNull(), // 'created', 'liquidity_added', 'liquidity_removed', 'updated'
    poolId: t.text().notNull(),
    creatorAddress: t.hex().notNull(),
    providerAddress: t.hex(),
    liquidityAmount: t.text(),
    minAiScore: t.integer(),
    interestRate: t.integer(),
    eventTimestamp: t.timestamp().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    poolIdIndex: index().on(table.poolId),
    eventTypeIndex: index().on(table.eventType),
  })
);

// Daily Analytics for monitoring
export const dailyMetrics = onchainTable(
  "daily_metrics",
  (t) => ({
    id: t.text().primaryKey(), // date in YYYY-MM-DD format
    date: t.timestamp().notNull(),
    totalScoringRequests: t.integer().notNull().default(0),
    totalScoresSubmitted: t.integer().notNull().default(0),
    totalLoansCreated: t.integer().notNull().default(0),
    totalLoanVolume: t.text().notNull().default("0"),
    totalAuctionsStarted: t.integer().notNull().default(0),
    averageAiScore: t.real(),
    averageProcessingTime: t.integer(),
    successRate: t.real(),
  }),
  (table) => ({
    dateIndex: index().on(table.date),
  })
);

// Domain Analytics for tracking domain performance
export const domainAnalytics = onchainTable(
  "domain_analytics",
  (t) => ({
    id: t.text().primaryKey(), // domainTokenId
    domainTokenId: t.text().notNull(),
    domainName: t.text(),
    latestAiScore: t.integer(),
    totalScoringRequests: t.integer().notNull().default(0),
    totalLoansCreated: t.integer().notNull().default(0),
    totalLoanVolume: t.text().notNull().default("0"),
    hasBeenLiquidated: t.boolean().notNull().default(false),
    firstScoreTimestamp: t.timestamp(),
    lastActivityTimestamp: t.timestamp(),
  }),
  (table) => ({
    domainTokenIdIndex: index().on(table.domainTokenId),
    latestAiScoreIndex: index().on(table.latestAiScore),
  })
);

// System Events for tracking contract configuration changes
export const systemEvent = onchainTable(
  "system_event",
  (t) => ({
    id: t.text().primaryKey(),
    eventType: t.text().notNull(), // 'backend_updated', 'emergency_pause', 'emergency_unpause', 'config_change'
    contractAddress: t.hex().notNull(),
    triggeredBy: t.hex().notNull(),
    oldValue: t.text(),
    newValue: t.text(),
    reason: t.text(),
    eventTimestamp: t.timestamp().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    eventTypeIndex: index().on(table.eventType),
    contractAddressIndex: index().on(table.contractAddress),
    eventTimestampIndex: index().on(table.eventTimestamp),
  })
);

// Batch Operations for tracking batch scoring requests
export const batchOperation = onchainTable(
  "batch_operation",
  (t) => ({
    id: t.text().primaryKey(),
    operationType: t.text().notNull(), // 'batch_scoring', 'batch_submission'
    requestedBy: t.hex().notNull(),
    batchSize: t.integer().notNull(),
    completedCount: t.integer().notNull().default(0),
    failedCount: t.integer().notNull().default(0),
    status: t.text().notNull(), // 'pending', 'completed', 'failed', 'partial'
    requestTimestamp: t.timestamp().notNull(),
    completionTimestamp: t.timestamp(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    operationTypeIndex: index().on(table.operationType),
    requestedByIndex: index().on(table.requestedBy),
    statusIndex: index().on(table.status),
    requestTimestampIndex: index().on(table.requestTimestamp),
  })
);

// Relations
export const poolEventRelations = relations(poolEvent, ({ many }) => ({
  loans: many(loanEvent),
}));

export const loanEventRelations = relations(loanEvent, ({ one, many }) => ({
  pool: one(poolEvent, {
    fields: [loanEvent.poolId],
    references: [poolEvent.poolId],
  }),
  auctions: many(auctionEvent),
  domain: one(domainAnalytics, {
    fields: [loanEvent.domainTokenId],
    references: [domainAnalytics.domainTokenId],
  }),
}));

export const auctionEventRelations = relations(auctionEvent, ({ one }) => ({
  loan: one(loanEvent, {
    fields: [auctionEvent.loanId],
    references: [loanEvent.loanId],
  }),
  domain: one(domainAnalytics, {
    fields: [auctionEvent.domainTokenId],
    references: [domainAnalytics.domainTokenId],
  }),
}));

export const domainAnalyticsRelations = relations(domainAnalytics, ({ many }) => ({
  loans: many(loanEvent),
  auctions: many(auctionEvent),
  scoringEvents: many(scoringEvent),
}));

export const scoringEventRelations = relations(scoringEvent, ({ one }) => ({
  domain: one(domainAnalytics, {
    fields: [scoringEvent.domainTokenId],
    references: [domainAnalytics.domainTokenId],
  }),
}));

export const loanRequestRelations = relations(loanRequest, ({ many, one }) => ({
  fundings: many(loanFunding),
  domain: one(domainAnalytics, {
    fields: [loanRequest.domainTokenId],
    references: [domainAnalytics.domainTokenId],
  }),
}));

export const loanFundingRelations = relations(loanFunding, ({ one }) => ({
  request: one(loanRequest, {
    fields: [loanFunding.requestId],
    references: [loanRequest.requestId],
  }),
}));

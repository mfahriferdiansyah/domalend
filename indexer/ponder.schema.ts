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

// Loan state table - one record per loan
export const loan = onchainTable(
  "loan",
  (t) => ({
    id: t.text().primaryKey(), // loanId
    loanId: t.text().notNull(),
    requestId: t.text(),
    borrowerAddress: t.hex().notNull(),
    domainTokenId: t.text().notNull(),
    domainName: t.text(),
    originalAmount: t.text().notNull(), // Original loan amount
    currentBalance: t.text().notNull(), // Current outstanding balance
    totalRepaid: t.text().notNull().default("0"), // Total amount repaid so far
    aiScore: t.integer(),
    interestRate: t.integer(),
    poolId: t.text(),
    status: t.text().notNull().default("active"), // 'active', 'repaid', 'defaulted', 'liquidated'
    repaymentDeadline: t.timestamp(),
    liquidationAttempted: t.boolean().notNull().default(false),
    liquidationTxHash: t.text(),
    liquidationTimestamp: t.timestamp(),
    liquidationBufferHours: t.integer().default(24),
    createdAt: t.timestamp().notNull(),
    lastUpdated: t.timestamp().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    loanIdIndex: index().on(table.loanId),
    domainTokenIdIndex: index().on(table.domainTokenId),
    borrowerIndex: index().on(table.borrowerAddress),
    statusIndex: index().on(table.status),
    poolIdIndex: index().on(table.poolId),
    repaymentDeadlineIndex: index().on(table.repaymentDeadline),
  })
);

// Loan history table - event log for audit trail
export const loanHistory = onchainTable(
  "loan_history", 
  (t) => ({
    id: t.text().primaryKey(),
    loanId: t.text().notNull(),
    eventType: t.text().notNull(), // 'created_instant', 'created_crowdfunded', 'repaid_full', 'repaid_partial', 'liquidated', 'defaulted', 'collateral_locked', 'collateral_released'
    requestId: t.text(),
    borrowerAddress: t.hex().notNull(),
    domainTokenId: t.text().notNull(),
    domainName: t.text(),
    amount: t.text(), // Amount for this specific event (repayment amount, liquidation amount, etc.)
    remainingBalance: t.text(), // Balance after this event
    aiScore: t.integer(),
    interestRate: t.integer(),
    poolId: t.text(),
    repaymentDeadline: t.timestamp(),
    liquidationTxHash: t.text(),
    eventTimestamp: t.timestamp().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    loanIdIndex: index().on(table.loanId),
    domainTokenIdIndex: index().on(table.domainTokenId),
    eventTypeIndex: index().on(table.eventType),
    eventTimestampIndex: index().on(table.eventTimestamp),
    borrowerIndex: index().on(table.borrowerAddress),
  })
);

// Auction state table - one record per auction
export const auction = onchainTable(
  "auction",
  (t) => ({
    id: t.text().primaryKey(), // auctionId
    auctionId: t.text().notNull(),
    loanId: t.text(),
    domainTokenId: t.text().notNull(),
    domainName: t.text(),
    borrowerAddress: t.hex(),
    currentBidderAddress: t.hex(),
    aiScore: t.integer(),
    startingPrice: t.text(),
    currentPrice: t.text(),
    finalPrice: t.text(),
    status: t.text().notNull(), // 'active', 'ended', 'cancelled'
    recoveryRate: t.real(), // finalPrice / loanAmount
    startedAt: t.timestamp(),
    endedAt: t.timestamp(),
    lastUpdated: t.timestamp().notNull(),
    createdAt: t.timestamp().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    auctionIdIndex: index().on(table.auctionId),
    domainTokenIdIndex: index().on(table.domainTokenId),
    statusIndex: index().on(table.status),
    startedAtIndex: index().on(table.startedAt),
  })
);

// Auction history table - event log for audit trail
export const auctionHistory = onchainTable(
  "auction_history",
  (t) => ({
    id: t.text().primaryKey(),
    auctionId: t.text().notNull(),
    eventType: t.text().notNull(), // 'started', 'bid_placed', 'ended', 'cancelled'
    bidderAddress: t.hex(),
    bidAmount: t.text(),
    currentPrice: t.text(),
    finalPrice: t.text(),
    eventTimestamp: t.timestamp().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    auctionIdIndex: index().on(table.auctionId),
    eventTypeIndex: index().on(table.eventType),
    eventTimestampIndex: index().on(table.eventTimestamp),
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

// Pool state table - one record per pool
export const pool = onchainTable(
  "pool",
  (t) => ({
    id: t.text().primaryKey(), // poolId
    poolId: t.text().notNull(),
    creatorAddress: t.hex().notNull(),
    totalLiquidity: t.text().notNull().default("0"),
    minAiScore: t.integer(),
    interestRate: t.integer(),
    participantCount: t.integer().notNull().default(0),
    status: t.text().notNull().default("active"), // 'active', 'paused', 'closed'
    createdAt: t.timestamp().notNull(),
    lastUpdated: t.timestamp().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    poolIdIndex: index().on(table.poolId),
    statusIndex: index().on(table.status),
    creatorIndex: index().on(table.creatorAddress),
  })
);

// Pool history table - event log for audit trail
export const poolHistory = onchainTable(
  "pool_history",
  (t) => ({
    id: t.text().primaryKey(),
    poolId: t.text().notNull(),
    eventType: t.text().notNull(), // 'created', 'liquidity_added', 'liquidity_removed', 'updated', 'paused', 'closed'
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
    eventTimestampIndex: index().on(table.eventTimestamp),
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
export const poolRelations = relations(pool, ({ many }) => ({
  history: many(poolHistory),
  loans: many(loan, {
    relationName: "poolLoans",
  }),
}));

export const poolHistoryRelations = relations(poolHistory, ({ one }) => ({
  pool: one(pool, {
    fields: [poolHistory.poolId],
    references: [pool.poolId],
  }),
}));

export const loanRelations = relations(loan, ({ one, many }) => ({
  pool: one(pool, {
    fields: [loan.poolId],
    references: [pool.poolId],
    relationName: "poolLoans",
  }),
  history: many(loanHistory),
  auctions: many(auction),
  domain: one(domainAnalytics, {
    fields: [loan.domainTokenId],
    references: [domainAnalytics.domainTokenId],
  }),
}));

export const loanHistoryRelations = relations(loanHistory, ({ one }) => ({
  loan: one(loan, {
    fields: [loanHistory.loanId],
    references: [loan.loanId],
  }),
}));

export const auctionRelations = relations(auction, ({ one, many }) => ({
  loan: one(loan, {
    fields: [auction.loanId],
    references: [loan.loanId],
  }),
  domain: one(domainAnalytics, {
    fields: [auction.domainTokenId],
    references: [domainAnalytics.domainTokenId],
  }),
  history: many(auctionHistory),
}));

export const auctionHistoryRelations = relations(auctionHistory, ({ one }) => ({
  auction: one(auction, {
    fields: [auctionHistory.auctionId],
    references: [auction.auctionId],
  }),
}));

export const domainAnalyticsRelations = relations(domainAnalytics, ({ many }) => ({
  loans: many(loan),
  auctions: many(auction),
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

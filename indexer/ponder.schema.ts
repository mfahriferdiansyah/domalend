import { onchainTable, index } from "ponder";

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
    status: t.text().notNull(), // 'pending', 'backend_called', 'submitted', 'completed', 'failed'
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
    eventType: t.text().notNull(), // 'created_instant', 'created_crowdfunded', 'repaid', 'liquidated'
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

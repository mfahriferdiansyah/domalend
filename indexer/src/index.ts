import "dotenv/config";
import { ponder } from "ponder:registry";
import { BackendApiService } from "./services/backend-api.service";
import { DomainResolutionService } from "./services/domain-resolution.service";
// Wallet imports removed - all contract calls now handled by backend
import {
  scoringEvent,
  loanEvent,
  auctionEvent,
  poolEvent,
  loanRequest,
  loanFunding,
  dailyMetrics,
  domainAnalytics,
  systemEvent,
  batchOperation
} from "../ponder.schema.js";

// Initialize services
const backendApi = new BackendApiService();
const domainResolver = new DomainResolutionService();

// Debug: Log environment variables
console.log(`🚨 [DEBUG] AI_ORACLE_ADDRESS: ${process.env.AI_ORACLE_ADDRESS}`);
console.log(`🚨 [DEBUG] LOAN_MANAGER_ADDRESS: ${process.env.LOAN_MANAGER_ADDRESS}`);
console.log(`🚨 [DEBUG] DEPLOYMENT_BLOCK: ${process.env.DEPLOYMENT_BLOCK}`);
console.log(`🚨 [DEBUG] Registering event handlers and liquidation monitoring...`);

// Track if liquidation monitoring has been started
let liquidationMonitoringStarted = false;

/**
 * MAIN EVENT: ScoringRequested from AIOracle
 * This is the core workflow: Event → Backend API → Score Submission
 */
ponder.on("AIOracle:ScoringRequested", async ({ event, context }) => {
  console.log(`🚨 [DEBUG] ScoringRequested handler CALLED!`);
  console.log(`🚨 [DEBUG] Event args:`, event.args);
  console.log(`🚨 [DEBUG] Transaction hash:`, event.transaction.hash);
  console.log(`🚨 [DEBUG] Block number:`, event.block.number);

  const { domainTokenId, requester, timestamp } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
  const startTime = Date.now();
  
  console.log(`🔍 [AIOracle] Processing scoring request for tokenId: ${domainTokenId}`);
  
  // Check for defaulted loans inline during scoring events
  await checkForDefaultedLoansInline(context);
  
  try {
    // 1. Insert initial scoring event record
    await context.db.insert(scoringEvent).values({
      id: eventId,
      domainTokenId: domainTokenId.toString(),
      requesterAddress: requester,
      status: 'pending',
      requestTimestamp: new Date(Number(event.block.timestamp) * 1000),
      retryCount: 0,
    });
    console.log(`✅ [AIOracle] Database insert successful`);

    // 2. Resolve domain name from tokenId
    const domainName = await domainResolver?.resolveDomainName(domainTokenId) || `domain-${domainTokenId}`;
    console.log(`📍 [AIOracle] Resolved ${domainTokenId} → ${domainName}`);
    
    // Update database with domain name
    await context.db.update(scoringEvent, {
      id: eventId
    }).set({
      domainName,
      status: 'backend_called',
      backendCallTimestamp: new Date(),
    });

    // 3. Get AI score from backend
    const scoreData = await backendApi.scoreDomain(domainName);
    console.log(`🎯 [AIOracle] Backend scored ${domainName}: ${scoreData.totalScore}/100 (confidence: ${scoreData.confidence}%)`);

    // 4. Request backend to submit score to AIOracle contract
    let txHash = '';
    try {
      console.log(`📝 [AIOracle] Requesting backend to submit score to contract...`);

      const submitResponse = await backendApi.submitScore({
        domainTokenId: domainTokenId.toString(),
        score: scoreData.totalScore,
        domainName: domainName,
        confidence: scoreData.confidence,
        reasoning: scoreData.reasoning
      });

      txHash = submitResponse.txHash || '';
      console.log(`✅ [AIOracle] Backend submitted score! TX: ${txHash}`);
    } catch (contractError) {
      console.error(`❌ [AIOracle] Backend score submission failed:`, contractError);
      // Continue processing even if contract submission fails
    }

    // 5. Update database with completion
    const endTime = Date.now();
    const processingDuration = endTime - startTime;
    
    await context.db.update(scoringEvent, {
      id: eventId
    }).set({
      aiScore: scoreData.totalScore,
      confidence: scoreData.confidence,
      reasoning: scoreData.reasoning,
      submissionTxHash: txHash || undefined,
      submissionTimestamp: new Date(),
      completionTimestamp: new Date(),
      status: txHash ? 'completed' : 'backend_completed',
      processingDurationMs: processingDuration,
    });

    // 6. Update domain analytics
    await updateDomainAnalytics(
      context,
      domainTokenId,
      domainName,
      scoreData.totalScore
    );

    console.log(`🎉 [AIOracle] Complete! ${domainName} scored ${scoreData.totalScore} in ${processingDuration}ms`);

  } catch (error) {
    console.error(`❌ [AIOracle] Processing failed for ${domainTokenId}:`, error);
    
    // Record error in database
    try {
      await context.db.update(scoringEvent, {
        id: eventId
      }).set({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        completionTimestamp: new Date(),
        processingDurationMs: Date.now() - startTime,
      });
    } catch (dbError) {
      console.error(`❌ [AIOracle] Failed to record error in database:`, dbError);
    }
  }
});

/**
 * MONITORING: ScoreSubmitted event (our own submissions)
 * Verify our submissions are working correctly
 */
ponder.on("AIOracle:ScoreSubmitted", async ({ event, context }) => {
  const { domainTokenId, score, submittedBy, timestamp } = event.args;
  
  console.log(`✅ [AIOracle] Score submitted: ${domainTokenId} → ${score} by ${submittedBy}`);

  // Update all scoring events for this domain to confirmed
  try {
    // Use simple database query pattern for Ponder v0.12 with proper null safety
    // Query scoring events for this domain (use any type for now to avoid compilation issues)
    const allScoringEvents = (await (context.db as any).findMany?.(scoringEvent)) || [];
    const scoringEvents = allScoringEvents.filter?.((e: any) => e.domainTokenId === domainTokenId.toString()) || [];

    for (const event of scoringEvents) {
      if (event.status === 'submitted' || event.status === 'backend_completed') {
        await context.db.update(scoringEvent, { id: event.id })
          .set({
            status: 'completed',
            aiScore: Number(score),
            submissionTimestamp: new Date(Number(timestamp) * 1000),
          });
      }
    }
    console.log(`✅ [AIOracle] Updated ${scoringEvents.length} scoring events to completed`);
  } catch (error) {
    console.error(`❌ [AIOracle] Failed to update scoring events:`, error);
  }
});

/**
 * BATCH SCORING: Handle batch scoring operations
 */
ponder.on("AIOracle:BatchScoringRequested", async ({ event, context }) => {
  const { domainTokenIds, requester, timestamp } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  console.log(`🔍 [AIOracle] Batch scoring requested by ${requester} for ${domainTokenIds.length} domains`);

  try {
    // Record the batch operation
    await context.db.insert(batchOperation).values({
      id: eventId,
      operationType: 'batch_scoring',
      requestedBy: requester,
      batchSize: domainTokenIds.length,
      status: 'pending',
      requestTimestamp: new Date(Number(event.block.timestamp) * 1000),
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });

    // Process each domain in the batch
    for (let i = 0; i < domainTokenIds.length; i++) {
      const domainTokenId = domainTokenIds[i];
      if (!domainTokenId) {
        console.warn(`❌ [AIOracle] Batch item ${i + 1}: domainTokenId is undefined, skipping`);
        continue;
      }
      const batchItemId = `${eventId}-${i}`;

      // Insert batch scoring event
      await context.db.insert(scoringEvent).values({
        id: batchItemId,
        domainTokenId: domainTokenId.toString(),
        requesterAddress: requester,
        status: 'batch_requested',
        requestTimestamp: new Date(Number(event.block.timestamp) * 1000),
        retryCount: 0,
      });

      // Trigger backend scoring for this domain and let backend handle contract submission
      try {
        const domainName = await domainResolver?.resolveDomainName(domainTokenId) || `domain-${domainTokenId}`;
        const scoreData = await backendApi.scoreDomain(domainName);

        // Update with backend response
        await context.db.update(scoringEvent, { id: batchItemId })
          .set({
            domainName,
            aiScore: scoreData.totalScore,
            confidence: scoreData.confidence,
            reasoning: scoreData.reasoning,
            status: 'backend_completed',
            backendCallTimestamp: new Date(),
          });

        console.log(`✅ [AIOracle] Batch item ${i + 1}/${domainTokenIds.length} scored: ${domainName} → ${scoreData.totalScore}`);
      } catch (domainError) {
        console.error(`❌ [AIOracle] Failed to process batch item ${i + 1}: ${domainTokenId}`, domainError);

        await context.db.update(scoringEvent, { id: batchItemId })
          .set({
            status: 'failed',
            errorMessage: domainError instanceof Error ? domainError.message : String(domainError),
          });
      }
    }

    console.log(`✅ [AIOracle] Batch scoring request recorded for ${domainTokenIds.length} domains`);
  } catch (error) {
    console.error(`❌ [AIOracle] Failed to process batch scoring request:`, error);
  }
});

ponder.on("AIOracle:BatchScoresSubmitted", async ({ event, context }) => {
  const { domainTokenIds, scores, submittedBy, batchSize, timestamp } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  console.log(`🎯 [AIOracle] Batch scores submitted by ${submittedBy} for ${batchSize} domains`);

  try {
    // Update scoring events for each domain in the batch
    for (let i = 0; i < domainTokenIds.length && i < scores.length; i++) {
      const domainTokenId = domainTokenIds[i];
      const score = scores[i];

      if (!domainTokenId) {
        console.warn(`❌ [AIOracle] Batch score ${i + 1}: domainTokenId is undefined, skipping`);
        continue;
      }

      // Find existing scoring events for this domain
      const allScoringEvents = await (context.db as any).findMany(scoringEvent);
      const domainEvents = allScoringEvents?.filter((e: any) => e.domainTokenId === domainTokenId.toString()) || [];

      // Update the most recent pending event
      for (const batchEvent of domainEvents) {
        if (batchEvent.status === 'batch_requested' || batchEvent.status === 'pending') {
          await context.db.update(scoringEvent, { id: batchEvent.id })
            .set({
              aiScore: Number(score),
              status: 'completed',
              submissionTimestamp: new Date(Number(event.block.timestamp) * 1000),
              completionTimestamp: new Date(Number(event.block.timestamp) * 1000),
            });
          break;
        }
      }
    }

    console.log(`✅ [AIOracle] Batch scores updated for ${Math.min(domainTokenIds.length, scores.length)} domains`);
  } catch (error) {
    console.error(`❌ [AIOracle] Failed to process batch scores submission:`, error);
  }
});

ponder.on("AIOracle:ScoreInvalidated", async ({ event, context }) => {
  const { domainTokenId, invalidatedBy, reason, timestamp } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  console.log(`⚠️ [AIOracle] Score invalidated for domain ${domainTokenId} by ${invalidatedBy}: ${reason}`);

  try {
    // Record the invalidation event
    await context.db.insert(scoringEvent).values({
      id: eventId,
      domainTokenId: domainTokenId.toString(),
      requesterAddress: invalidatedBy,
      status: 'invalidated',
      requestTimestamp: new Date(Number(event.block.timestamp) * 1000),
      completionTimestamp: new Date(Number(event.block.timestamp) * 1000),
      errorMessage: reason,
      retryCount: 0,
    });

    // Update domain analytics if exists
    const existingAnalytics = await context.db.find(domainAnalytics, {
      id: domainTokenId.toString()
    });

    if (existingAnalytics) {
      await context.db.update(domainAnalytics, { id: domainTokenId.toString() })
        .set({
          lastActivityTimestamp: new Date(),
        });
    }

    console.log(`✅ [AIOracle] Score invalidation recorded for domain ${domainTokenId}`);
  } catch (error) {
    console.error(`❌ [AIOracle] Failed to process score invalidation:`, error);
  }
});

ponder.on("AIOracle:BackendServiceUpdated", async ({ event, context }) => {
  const { oldService, newService, updatedBy, timestamp } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  console.log(`🔧 [AIOracle] Backend service updated from ${oldService} to ${newService} by ${updatedBy}`);

  try {
    // Record the configuration change in the dedicated system events table
    await context.db.insert(systemEvent).values({
      id: eventId,
      eventType: 'backend_updated',
      contractAddress: process.env.AI_ORACLE_ADDRESS as `0x${string}` || '0x0',
      triggeredBy: updatedBy,
      oldValue: oldService,
      newValue: newService,
      eventTimestamp: new Date(Number(event.block.timestamp) * 1000),
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });

    console.log(`✅ [AIOracle] Backend service update recorded`);
  } catch (error) {
    console.error(`❌ [AIOracle] Failed to process backend service update:`, error);
  }
});

ponder.on("AIOracle:EmergencyPauseToggled", async ({ event, context }) => {
  const { isPaused, toggledBy, timestamp } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  console.log(`🚨 [AIOracle] Emergency pause ${isPaused ? 'ENABLED' : 'DISABLED'} by ${toggledBy}`);

  try {
    // Record the emergency action in the dedicated system events table
    await context.db.insert(systemEvent).values({
      id: eventId,
      eventType: isPaused ? 'emergency_pause' : 'emergency_unpause',
      contractAddress: process.env.AI_ORACLE_ADDRESS as `0x${string}` || '0x0',
      triggeredBy: toggledBy,
      newValue: isPaused.toString(),
      reason: `Emergency pause ${isPaused ? 'enabled' : 'disabled'}`,
      eventTimestamp: new Date(Number(event.block.timestamp) * 1000),
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });

    console.log(`✅ [AIOracle] Emergency pause toggle recorded`);
  } catch (error) {
    console.error(`❌ [AIOracle] Failed to process emergency pause toggle:`, error);
  }
});

/**
 * ANALYTICS: Track loan events for scoring effectiveness
 */
ponder.on("SatoruLending:InstantLoanExecuted", async ({ event, context }) => {
  const { loanId, borrower, domainTokenId, poolId, loanAmount, interestRate, repaymentDeadline, aiScore } = event.args;
  
  console.log(`💰 [SatoruLending] Instant loan executed: ${loanId} for ${domainTokenId} (AI: ${aiScore})`);
  
  try {
    // Resolve domain name for analytics
    const domainName = await domainResolver?.resolveDomainName(domainTokenId) || `domain-${domainTokenId}`;
    
    // Record loan event
    await context.db.insert(loanEvent).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      eventType: 'created_instant',
      loanId: loanId.toString(),
      borrowerAddress: borrower,
      domainTokenId: domainTokenId.toString(),
      domainName,
      loanAmount: loanAmount.toString(),
      aiScore: Number(aiScore),
      interestRate: Number(interestRate),
      poolId: poolId.toString(),
      repaymentDeadline: new Date(Number(repaymentDeadline) * 1000),
      eventTimestamp: new Date(Number(event.block.timestamp) * 1000),
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
      liquidationAttempted: false,
      liquidationBufferHours: 0, // Default 24-hour buffer
    });
    
    // Update domain analytics
    await updateDomainAnalytics(
      context,
      domainTokenId,
      domainName,
      Number(aiScore),
      loanAmount
    );
  } catch (error) {
    console.error(`❌ [SatoruLending] Failed to process loan event:`, error);
  }
});

/**
 * POOL MANAGEMENT: Track liquidity pool lifecycle
 */
ponder.on("SatoruLending:PoolCreated", async ({ event, context }) => {
  const { poolId, creator, initialLiquidity, minAiScore, interestRate } = event.args;

  console.log(`🏦 [SatoruLending] Pool created: ${poolId} by ${creator} with ${initialLiquidity} liquidity`);

  try {
    await context.db.insert(poolEvent).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      eventType: 'created',
      poolId: poolId.toString(),
      creatorAddress: creator,
      liquidityAmount: initialLiquidity.toString(),
      minAiScore: Number(minAiScore),
      interestRate: Number(interestRate),
      eventTimestamp: new Date(Number(event.block.timestamp) * 1000),
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });

    console.log(`✅ [SatoruLending] Pool creation recorded for pool ${poolId}`);
  } catch (error) {
    console.error(`❌ [SatoruLending] Failed to process pool creation:`, error);
  }
});

ponder.on("SatoruLending:LiquidityAdded", async ({ event, context }) => {
  const { poolId, provider, amount } = event.args;

  console.log(`💰 [SatoruLending] Liquidity added: ${amount} to pool ${poolId} by ${provider}`);

  try {
    await context.db.insert(poolEvent).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      eventType: 'liquidity_added',
      poolId: poolId.toString(),
      creatorAddress: provider,
      providerAddress: provider,
      liquidityAmount: amount.toString(),
      eventTimestamp: new Date(Number(event.block.timestamp) * 1000),
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });

    console.log(`✅ [SatoruLending] Liquidity addition recorded for pool ${poolId}`);
  } catch (error) {
    console.error(`❌ [SatoruLending] Failed to process liquidity addition:`, error);
  }
});

ponder.on("SatoruLending:LiquidityRemoved", async ({ event, context }) => {
  const { poolId, provider, amount } = event.args;

  console.log(`💸 [SatoruLending] Liquidity removed: ${amount} from pool ${poolId} by ${provider}`);

  try {
    await context.db.insert(poolEvent).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      eventType: 'liquidity_removed',
      poolId: poolId.toString(),
      creatorAddress: provider,
      providerAddress: provider,
      liquidityAmount: amount.toString(),
      eventTimestamp: new Date(Number(event.block.timestamp) * 1000),
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });

    console.log(`✅ [SatoruLending] Liquidity removal recorded for pool ${poolId}`);
  } catch (error) {
    console.error(`❌ [SatoruLending] Failed to process liquidity removal:`, error);
  }
});

/**
 * Helper function to update domain analytics
 */
async function updateDomainAnalytics(
  context: any,
  domainTokenId: bigint,
  domainName: string,
  aiScore: number,
  loanAmount?: bigint
) {
  const id = domainTokenId.toString();

  try {
    // For Ponder, we need to use insert/update pattern
    // First try to get existing record
    let existingAnalytics = null;
    try {
      existingAnalytics = await context.db.find(domainAnalytics, { id });
    } catch (e) {
      // Record doesn't exist yet
    }

    if (existingAnalytics) {
      // Update existing record
      await context.db.update(domainAnalytics, { id })
        .set({
          domainName,
          latestAiScore: aiScore,
          lastActivityTimestamp: new Date(),
          totalScoringRequests: existingAnalytics.totalScoringRequests + 1,
          totalLoansCreated: loanAmount ? existingAnalytics.totalLoansCreated + 1 : existingAnalytics.totalLoansCreated,
          totalLoanVolume: loanAmount ?
            (BigInt(existingAnalytics.totalLoanVolume) + loanAmount).toString() :
            existingAnalytics.totalLoanVolume
        });
    } else {
      // Create new record
      await context.db.insert(domainAnalytics).values({
        id,
        domainTokenId: id,
        domainName,
        latestAiScore: aiScore,
        totalScoringRequests: 1,
        totalLoansCreated: loanAmount ? 1 : 0,
        totalLoanVolume: loanAmount ? loanAmount.toString() : "0",
        hasBeenLiquidated: false,
        firstScoreTimestamp: new Date(),
        lastActivityTimestamp: new Date()
      });
    }

    console.log(`✅ [Analytics] Updated domain analytics for ${domainName} (${id})`);
  } catch (error) {
    console.error(`❌ Failed to update domain analytics for ${domainTokenId}:`, error);
  }
}

/**
 * Helper function to update domain analytics for liquidation
 */
async function updateDomainAnalyticsForLiquidation(
  context: any,
  domainTokenId: bigint,
  domainName: string
) {
  const id = domainTokenId.toString();

  try {
    // Find existing analytics
    let existingAnalytics = null;
    try {
      existingAnalytics = await context.db.find(domainAnalytics, { id });
    } catch (e) {
      // Record doesn't exist yet
    }

    if (existingAnalytics) {
      // Update existing record to mark as liquidated
      await context.db.update(domainAnalytics, { id })
        .set({
          hasBeenLiquidated: true,
          lastActivityTimestamp: new Date(),
        });
      console.log(`✅ [Analytics] Marked domain ${domainName} as liquidated`);
    } else {
      // Create new record marked as liquidated
      await context.db.insert(domainAnalytics).values({
        id,
        domainTokenId: id,
        domainName,
        latestAiScore: 0,
        totalScoringRequests: 0,
        totalLoansCreated: 0,
        totalLoanVolume: "0",
        hasBeenLiquidated: true,
        firstScoreTimestamp: new Date(),
        lastActivityTimestamp: new Date()
      });
      console.log(`✅ [Analytics] Created domain analytics for ${domainName} marked as liquidated`);
    }
  } catch (error) {
    console.error(`❌ Failed to update domain analytics for liquidation ${domainTokenId}:`, error);
  }
}

/**
 * LOAN EVENTS: Track loan lifecycle
 */
ponder.on("LoanManager:LoanRepaid", async ({ event, context }) => {
  const { loanId, borrower, repaymentAmount, isFullyRepaid } = event.args;

  console.log(`💰 [LoanManager] Loan repaid: ${loanId} by ${borrower} (${repaymentAmount})`);

  try {
    // Find the original loan to get domain information
    // Use SQL query to find the original loan with specific conditions
    // Find the original loan (use any type for compatibility)
    const allLoans = (await (context.db as any).findMany?.(loanEvent)) || [];
    const originalLoan = allLoans.find?.((loan: any) =>
      loan.loanId === loanId.toString() && loan.eventType === 'created_instant'
    ) || null;

    await context.db.insert(loanEvent).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      eventType: isFullyRepaid ? 'repaid_full' : 'repaid_partial',
      loanId: loanId.toString(),
      borrowerAddress: borrower,
      domainTokenId: originalLoan?.domainTokenId || '',
      domainName: originalLoan?.domainName || '',
      loanAmount: repaymentAmount.toString(),
      aiScore: originalLoan?.aiScore,
      eventTimestamp: new Date(Number(event.block.timestamp) * 1000),
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });

    console.log(`✅ [LoanManager] Loan repayment recorded for loan ${loanId}`);
  } catch (error) {
    console.error(`❌ [LoanManager] Failed to process loan repaid event:`, error);
  }
});

// Note: LoanDefaulted and LiquidationTriggered events don't exist in current ABI
// They will be handled when the actual events are triggered from contract logic

/**
 * DUTCH AUCTION EVENTS: Track auction lifecycle
 */

ponder.on("DutchAuction:AuctionStarted", async ({ event, context }) => {
  const { auctionId, loanId, domainTokenId, startingPrice, startTime } = event.args;

  console.log(`🏛️ [DutchAuction] Auction started: ${auctionId} for loan ${loanId} (domain: ${domainTokenId})`);

  try {
    // Find the original loan to get additional data
    // Find the original loan (use any type for compatibility)
    const allLoans = (await (context.db as any).findMany?.(loanEvent)) || [];
    const originalLoan = allLoans.find?.((loan: any) =>
      loan.loanId === loanId.toString() && loan.eventType === 'created_instant'
    ) || null;

    // Resolve domain name
    const domainName = await domainResolver?.resolveDomainName(domainTokenId) || `domain-${domainTokenId}`;

    await context.db.insert(auctionEvent).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      eventType: 'started',
      auctionId: auctionId.toString(),
      loanId: loanId.toString(),
      domainTokenId: domainTokenId.toString(),
      domainName,
      borrowerAddress: originalLoan?.borrowerAddress,
      aiScore: originalLoan?.aiScore,
      startingPrice: startingPrice.toString(),
      currentPrice: startingPrice.toString(),
      eventTimestamp: new Date(Number(event.block.timestamp) * 1000),
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });

    // Update domain analytics to mark as liquidated
    await updateDomainAnalyticsForLiquidation(context, domainTokenId, domainName);

    console.log(`✅ [DutchAuction] Auction start recorded: ${auctionId} for domain ${domainName}`);
  } catch (error) {
    console.error(`❌ [DutchAuction] Failed to process auction started event:`, error);
  }
});

ponder.on("DutchAuction:BidPlaced", async ({ event, context }) => {
  const { auctionId, bidder, bidAmount, currentPrice, timestamp, isWinningBid } = event.args;

  console.log(`💰 [DutchAuction] Bid placed: ${auctionId} by ${bidder} (${bidAmount})`);

  try {
    // Find the auction start event to get domain information
    // Find the auction start event (use any type for compatibility)
    const allAuctions = (await (context.db as any).findMany?.(auctionEvent)) || [];
    const auctionStart = allAuctions.find?.((auction: any) =>
      auction.auctionId === auctionId.toString() && auction.eventType === 'started'
    ) || null;

    await context.db.insert(auctionEvent).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      eventType: 'bid_placed',
      auctionId: auctionId.toString(),
      loanId: auctionStart?.loanId,
      domainTokenId: auctionStart?.domainTokenId || '',
      domainName: auctionStart?.domainName,
      borrowerAddress: auctionStart?.borrowerAddress,
      bidderAddress: bidder,
      aiScore: auctionStart?.aiScore,
      currentPrice: currentPrice.toString(), // Use currentPrice instead of bidAmount
      eventTimestamp: new Date(Number(event.block.timestamp) * 1000),
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });

    console.log(`✅ [DutchAuction] Bid recorded for auction ${auctionId}`);
  } catch (error) {
    console.error(`❌ [DutchAuction] Failed to process bid placed event:`, error);
  }
});

ponder.on("DutchAuction:AuctionEnded", async ({ event, context }) => {
  const { auctionId, loanId, domainTokenId, winner, finalPrice, loanAmount, surplus, endTimestamp } = event.args;

  console.log(`🎉 [DutchAuction] Auction ended: ${auctionId} won by ${winner} for ${finalPrice}`);

  try {
    // Find the auction start event to get loan and domain information
    // Find the auction start event (use any type for compatibility)
    const allAuctions = (await (context.db as any).findMany?.(auctionEvent)) || [];
    const auctionStart = allAuctions.find?.((auction: any) =>
      auction.auctionId === auctionId.toString() && auction.eventType === 'started'
    ) || null;

    // Calculate recovery rate (final price / original loan amount)
    let recoveryRate = 0;
    if (loanAmount && loanAmount > 0n) {
      const finalPriceBig = BigInt(finalPrice.toString());
      recoveryRate = Number(finalPriceBig * 10000n / loanAmount) / 10000;
    }

    await context.db.insert(auctionEvent).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      eventType: 'ended',
      auctionId: auctionId.toString(),
      loanId: loanId.toString(),
      domainTokenId: domainTokenId.toString(),
      domainName: auctionStart?.domainName,
      borrowerAddress: auctionStart?.borrowerAddress,
      bidderAddress: winner,
      aiScore: auctionStart?.aiScore,
      startingPrice: auctionStart?.startingPrice,
      finalPrice: finalPrice.toString(),
      recoveryRate,
      eventTimestamp: new Date(Number(event.block.timestamp) * 1000),
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });

    console.log(`✅ [DutchAuction] Auction completion recorded: ${auctionId} (recovery: ${(recoveryRate * 100).toFixed(2)}%)`);
  } catch (error) {
    console.error(`❌ [DutchAuction] Failed to process auction ended event:`, error);
  }
});

ponder.on("DutchAuction:AuctionCancelled", async ({ event, context }) => {
  const { auctionId, reason } = event.args;

  console.log(`❌ [DutchAuction] Auction cancelled: ${auctionId} - ${reason}`);

  try {
    // Find the auction start event to get domain and loan information
    // Find the auction start event (use any type for compatibility)
    const allAuctions = (await (context.db as any).findMany?.(auctionEvent)) || [];
    const auctionStart = allAuctions.find?.((auction: any) =>
      auction.auctionId === auctionId.toString() && auction.eventType === 'started'
    ) || null;

    await context.db.insert(auctionEvent).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      eventType: 'cancelled',
      auctionId: auctionId.toString(),
      loanId: auctionStart?.loanId,
      domainTokenId: auctionStart?.domainTokenId || '0',
      domainName: auctionStart?.domainName,
      borrowerAddress: auctionStart?.borrowerAddress,
      aiScore: auctionStart?.aiScore,
      startingPrice: auctionStart?.startingPrice,
      eventTimestamp: new Date(Number(event.block.timestamp) * 1000),
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });

    console.log(`✅ [DutchAuction] Auction cancellation recorded: ${auctionId} (reason: ${reason})`);
  } catch (error) {
    console.error(`❌ [DutchAuction] Failed to process auction cancelled event:`, error);
  }
});

/**
 * LIQUIDATION MONITORING SYSTEM
 * Checks for defaulted loans and triggers liquidation
 */
async function checkAndLiquidateDefaultedLoans(context: any) {
  const now = new Date();
  console.log(`🔍 [Liquidation] Checking for defaulted loans at ${now.toISOString()}`);

  try {
    // Query all instant loans that need liquidation check using new Ponder SQL API
    const allLoans = await context.db.sql.select().from(loanEvent);
    console.log(`🔍 [Liquidation Debug] Found ${allLoans.length} total loans in database`);

    // Debug: log all loans with their details
    allLoans.forEach((loan: any, index: number) => {
      console.log(`  Loan ${index + 1}: ID=${loan.loanId}, eventType=${loan.eventType}, liquidationAttempted=${loan.liquidationAttempted}, repaymentDeadline=${loan.repaymentDeadline}`);
    });

    const defaultedLoans = allLoans.filter?.((loan: any) =>
      (loan.eventType === 'created_instant' || loan.eventType === 'created_crowdfunded') &&
      loan.liquidationAttempted === false
    ) || [];

    console.log(`🔍 [Liquidation Debug] Found ${defaultedLoans.length} loans eligible for liquidation check`);

    if (!defaultedLoans || defaultedLoans.length === 0) {
      console.log('✅ [Liquidation] No loans found for liquidation check');
      return;
    }

    let liquidationCount = 0;

    for (const loan of defaultedLoans) {
      try {
        // Check if loan is past due (repayment deadline + buffer hours)
        const repaymentDeadline = new Date(loan.repaymentDeadline);
        const bufferHours = loan.liquidationBufferHours || 0;
        const liquidationThreshold = new Date(repaymentDeadline.getTime() + bufferHours * 60 * 60 * 1000);

        if (now < liquidationThreshold) {
          continue; // Loan not yet eligible for liquidation
        }

        console.log(`🚨 [Liquidation] Requesting backend to liquidate loan ${loan.loanId} (deadline: ${repaymentDeadline.toISOString()}, threshold: ${liquidationThreshold.toISOString()})`);

        // Mark as liquidation attempted first (to prevent duplicate attempts)
        await context.db.update(loanEvent, { id: loan.id })
          .set({
            liquidationAttempted: true,
            liquidationTimestamp: new Date(),
          });

        // Request backend to liquidate the loan
        try {
          const liquidationResponse = await backendApi.liquidateLoan({
            loanId: loan.loanId,
            domainTokenId: loan.domainTokenId,
            borrowerAddress: loan.borrowerAddress,
            domainName: loan.domainName || undefined
          });

          const txHash = liquidationResponse.txHash || '';
          console.log(`✅ [Liquidation] Backend submitted liquidation for loan ${loan.loanId}! TX: ${txHash}`);

          // Update database with transaction hash
          await context.db.update(loanEvent, { id: loan.id })
            .set({
              liquidationTxHash: txHash,
            });

          liquidationCount++;

        } catch (backendError) {
          console.error(`❌ [Liquidation] Backend failed to liquidate loan ${loan.loanId}:`, backendError);
          throw backendError;
        }

      } catch (loanError) {
        console.error(`❌ [Liquidation] Failed to liquidate loan ${loan.loanId}:`, loanError);

        // Revert liquidation attempt flag on error
        try {
          await context.db.update(loanEvent, { id: loan.id })
            .set({
              liquidationAttempted: false,
              liquidationTimestamp: null,
            });
        } catch (revertError) {
          console.error(`❌ [Liquidation] Failed to revert liquidation attempt for loan ${loan.loanId}:`, revertError);
        }
      }
    }

    if (liquidationCount > 0) {
      console.log(`🎉 [Liquidation] Successfully submitted ${liquidationCount} liquidation(s) via backend`);
    } else {
      console.log('✅ [Liquidation] No loans eligible for liquidation');
    }

  } catch (error) {
    console.error('❌ [Liquidation] Error during liquidation check:', error);
  }
}

/**
 * START LIQUIDATION MONITORING
 * Runs periodic checks for defaulted loans
 */
let liquidationInterval: NodeJS.Timeout | null = null;

function startLiquidationMonitoring(context: any) {
  if (liquidationInterval) {
    clearInterval(liquidationInterval);
  }

  const checkIntervalMs = parseInt(process.env.LIQUIDATION_CHECK_INTERVAL_MS || '10000'); // Default 10 seconds
  console.log(`🚀 [Liquidation] Starting liquidation monitoring (interval: ${checkIntervalMs}ms)`);

  // Run initial check after 30 seconds
  setTimeout(() => void checkAndLiquidateDefaultedLoans(context), 30000);

  // Set up periodic checks
  liquidationInterval = setInterval(() => {
    void checkAndLiquidateDefaultedLoans(context);
  }, checkIntervalMs);
}

/**
 * LOAN MANAGEMENT: Handle LoanManager contract events
 */
ponder.on("LoanManager:LoanCreated", async ({ event, context }) => {
  const { loanId, borrower, domainTokenId, principalAmount, interestRate, duration, totalOwed, dueDate, poolId, requestId } = event.args;

  console.log(`💰 [LoanManager] Loan created: ${loanId} for ${domainTokenId}`);

  try {
    // Resolve domain name
    const domainName = await domainResolver?.resolveDomainName(domainTokenId) || `domain-${domainTokenId}`;

    // Record loan creation event
    await context.db.insert(loanEvent).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      eventType: requestId && requestId > 0n ? 'created_crowdfunded' : 'created_instant',
      loanId: loanId.toString(),
      requestId: requestId ? requestId.toString() : undefined,
      borrowerAddress: borrower,
      domainTokenId: domainTokenId.toString(),
      domainName,
      loanAmount: principalAmount.toString(),
      interestRate: Number(interestRate),
      poolId: poolId ? poolId.toString() : undefined,
      repaymentDeadline: new Date(Number(dueDate) * 1000),
      eventTimestamp: new Date(Number(event.block.timestamp) * 1000),
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
      liquidationAttempted: false,
      liquidationBufferHours: 0,
    });

    console.log(`✅ [LoanManager] Loan creation recorded for ${loanId}`);
  } catch (error) {
    console.error(`❌ [LoanManager] Failed to process loan creation:`, error);
  }
});

ponder.on("LoanManager:CollateralLocked", async ({ event, context }) => {
  const { loanId, domainTokenId, borrower, lockTimestamp } = event.args;

  console.log(`🔒 [LoanManager] Collateral locked: loan ${loanId}, domain ${domainTokenId}`);

  try {
    // Find the loan to update
    const allLoans = (await (context.db as any).findMany?.(loanEvent)) || [];
    const loan = allLoans.find?.((l: any) =>
      l.loanId === loanId.toString() && (l.eventType === 'created_instant' || l.eventType === 'created_crowdfunded')
    );

    if (loan) {
      // Record collateral lock event
      await context.db.insert(loanEvent).values({
        id: `${event.transaction.hash}-${event.log.logIndex}`,
        eventType: 'collateral_locked',
        loanId: loanId.toString(),
        borrowerAddress: borrower,
        domainTokenId: domainTokenId.toString(),
        domainName: loan.domainName,
        loanAmount: loan.loanAmount,
        aiScore: loan.aiScore,
        eventTimestamp: new Date(Number(event.block.timestamp) * 1000),
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      });
    }

    console.log(`✅ [LoanManager] Collateral lock recorded for loan ${loanId}`);
  } catch (error) {
    console.error(`❌ [LoanManager] Failed to process collateral lock:`, error);
  }
});

ponder.on("LoanManager:CollateralReleased", async ({ event, context }) => {
  const { loanId, domainTokenId, borrower, releaseTimestamp } = event.args;

  console.log(`🔓 [LoanManager] Collateral released: loan ${loanId}, domain ${domainTokenId}`);

  try {
    // Find the original loan
    const allLoans = (await (context.db as any).findMany?.(loanEvent)) || [];
    const originalLoan = allLoans.find?.((l: any) =>
      l.loanId === loanId.toString() && (l.eventType === 'created_instant' || l.eventType === 'created_crowdfunded')
    );

    if (originalLoan) {
      // Record collateral release event
      await context.db.insert(loanEvent).values({
        id: `${event.transaction.hash}-${event.log.logIndex}`,
        eventType: 'collateral_released',
        loanId: loanId.toString(),
        borrowerAddress: borrower,
        domainTokenId: domainTokenId.toString(),
        domainName: originalLoan.domainName,
        loanAmount: originalLoan.loanAmount,
        aiScore: originalLoan.aiScore,
        eventTimestamp: new Date(Number(event.block.timestamp) * 1000),
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      });
    }

    console.log(`✅ [LoanManager] Collateral release recorded for loan ${loanId}`);
  } catch (error) {
    console.error(`❌ [LoanManager] Failed to process collateral release:`, error);
  }
});

ponder.on("LoanManager:CollateralLiquidated", async ({ event, context }) => {
  const { loanId, domainTokenId, borrower, loanAmount, auctionId, startingPrice } = event.args;

  console.log(`⚖️ [LoanManager] Collateral liquidated: loan ${loanId} → auction ${auctionId}`);

  try {
    // Find the original loan
    const allLoans = (await (context.db as any).findMany?.(loanEvent)) || [];
    const originalLoan = allLoans.find?.((l: any) =>
      l.loanId === loanId.toString() && (l.eventType === 'created_instant' || l.eventType === 'created_crowdfunded')
    );

    // Record liquidation event
    await context.db.insert(loanEvent).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      eventType: 'liquidated',
      loanId: loanId.toString(),
      borrowerAddress: borrower,
      domainTokenId: domainTokenId.toString(),
      domainName: originalLoan?.domainName || `domain-${domainTokenId}`,
      loanAmount: loanAmount.toString(),
      aiScore: originalLoan?.aiScore,
      eventTimestamp: new Date(Number(event.block.timestamp) * 1000),
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
      liquidationAttempted: true,
      liquidationTxHash: event.transaction.hash,
      liquidationTimestamp: new Date(Number(event.block.timestamp) * 1000),
    });

    console.log(`✅ [LoanManager] Collateral liquidation recorded for loan ${loanId}`);
  } catch (error) {
    console.error(`❌ [LoanManager] Failed to process collateral liquidation:`, error);
  }
});

/**
 * CROWDFUNDING: Handle loan request events
 */
ponder.on("SatoruLending:LoanRequestCreated", async ({ event, context }) => {
  const { requestId, borrower, domainTokenId, requestedAmount, proposedInterestRate, aiScore, campaignDeadline } = event.args;

  console.log(`📋 [SatoruLending] Loan request created: ${requestId} for domain ${domainTokenId}`);

  try {
    // Resolve domain name
    const domainName = await domainResolver?.resolveDomainName(domainTokenId) || `domain-${domainTokenId}`;

    // Record loan request
    await context.db.insert(loanRequest).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      requestId: requestId.toString(),
      borrowerAddress: borrower,
      domainTokenId: domainTokenId.toString(),
      domainName,
      requestedAmount: requestedAmount.toString(),
      proposedInterestRate: Number(proposedInterestRate),
      aiScore: Number(aiScore),
      campaignDeadline: new Date(Number(campaignDeadline) * 1000),
      status: 'active',
      eventTimestamp: new Date(Number(event.block.timestamp) * 1000),
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });

    console.log(`✅ [SatoruLending] Loan request recorded: ${requestId}`);
  } catch (error) {
    console.error(`❌ [SatoruLending] Failed to process loan request creation:`, error);
  }
});

ponder.on("SatoruLending:LoanRequestFunded", async ({ event, context }) => {
  const { requestId, contributor, contributionAmount, totalFunded, remainingAmount, isFullyFunded } = event.args;

  console.log(`💰 [SatoruLending] Loan request funded: ${requestId} by ${contributor} (${contributionAmount})`);

  try {
    // Record funding contribution
    await context.db.insert(loanFunding).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      requestId: requestId.toString(),
      contributorAddress: contributor,
      contributionAmount: contributionAmount.toString(),
      totalFunded: totalFunded.toString(),
      remainingAmount: remainingAmount.toString(),
      isFullyFunded,
      eventTimestamp: new Date(Number(event.block.timestamp) * 1000),
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });

    // Update loan request status
    const allRequests = (await (context.db as any).findMany?.(loanRequest)) || [];
    const request = allRequests.find?.((r: any) => r.requestId === requestId.toString());

    if (request) {
      await context.db.update(loanRequest, { id: request.id })
        .set({
          totalFunded: totalFunded.toString(),
          contributorCount: request.contributorCount + 1,
          status: isFullyFunded ? 'funded' : 'active',
        });
    }

    console.log(`✅ [SatoruLending] Loan funding recorded: ${requestId}`);
  } catch (error) {
    console.error(`❌ [SatoruLending] Failed to process loan funding:`, error);
  }
});

ponder.on("SatoruLending:LoanExecuted", async ({ event, context }) => {
  const { loanId, requestId, borrower, domainTokenId, loanAmount, contributors } = event.args;

  console.log(`🎯 [SatoruLending] Crowdfunded loan executed: ${loanId} from request ${requestId}`);

  try {
    // Find the original request
    const allRequests = (await (context.db as any).findMany?.(loanRequest)) || [];
    const request = allRequests.find?.((r: any) => r.requestId === requestId.toString());

    if (request) {
      // Update request status
      await context.db.update(loanRequest, { id: request.id })
        .set({ status: 'executed' });

      // This will be handled by LoanManager:LoanCreated event
      console.log(`✅ [SatoruLending] Loan execution recorded: ${loanId} from request ${requestId}`);
    }
  } catch (error) {
    console.error(`❌ [SatoruLending] Failed to process loan execution:`, error);
  }
});

ponder.on("SatoruLending:LoanRequestCancelled", async ({ event, context }) => {
  const { requestId, borrower, totalRefunded, reason } = event.args;

  console.log(`❌ [SatoruLending] Loan request cancelled: ${requestId} (${reason})`);

  try {
    // Find and update the request
    const allRequests = (await (context.db as any).findMany?.(loanRequest)) || [];
    const request = allRequests.find?.((r: any) => r.requestId === requestId.toString());

    if (request) {
      await context.db.update(loanRequest, { id: request.id })
        .set({ status: 'cancelled' });
    }

    console.log(`✅ [SatoruLending] Loan request cancellation recorded: ${requestId}`);
  } catch (error) {
    console.error(`❌ [SatoruLending] Failed to process loan request cancellation:`, error);
  }
});

/**
 * POOL UPDATES: Handle pool configuration changes
 */
ponder.on("SatoruLending:PoolUpdated", async ({ event, context }) => {
  const { poolId, updatedBy, newMinAiScore, newInterestRate, timestamp } = event.args;

  console.log(`🔧 [SatoruLending] Pool updated: ${poolId} by ${updatedBy}`);

  try {
    await context.db.insert(poolEvent).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      eventType: 'updated',
      poolId: poolId.toString(),
      creatorAddress: updatedBy,
      minAiScore: Number(newMinAiScore),
      interestRate: Number(newInterestRate),
      eventTimestamp: new Date(Number(event.block.timestamp) * 1000),
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });

    console.log(`✅ [SatoruLending] Pool update recorded: ${poolId}`);
  } catch (error) {
    console.error(`❌ [SatoruLending] Failed to process pool update:`, error);
  }
});

// Export handlers for testing
export {
  updateDomainAnalytics,
  updateDomainAnalyticsForLiquidation,
  checkAndLiquidateDefaultedLoans,
  startLiquidationMonitoring
};
import { ponder } from "ponder:registry";
import { BackendApiService } from "./services/backend-api.service";
import { DomainResolutionService } from "./services/domain-resolution.service";
import { createWalletClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import { 
  scoringEvent, 
  loanEvent, 
  auctionEvent, 
  poolEvent, 
  dailyMetrics, 
  domainAnalytics 
} from "../ponder.schema.js";

// Define Doma testnet chain
const domaTestnet = defineChain({
  id: 97476,
  name: 'Doma Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Doma',
    symbol: 'DOMA',
  },
  rpcUrls: {
    default: { http: ['https://rpc-testnet.doma.xyz'] },
  },
});

// Initialize services
const backendApi = new BackendApiService();
const domainResolver = new DomainResolutionService();

// Initialize wallet for score submission and liquidations (only if private key is available)
let walletClient: any = null;
let account: any = null;
let loanManagerClient: any = null;

if (process.env.DEPLOYER_PRIVATE_KEY && process.env.DEPLOYER_PRIVATE_KEY !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
  account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`);
  walletClient = createWalletClient({
    account,
    chain: domaTestnet,
    transport: http(process.env.DOMA_RPC_URL || 'https://rpc-testnet.doma.xyz'),
  });
  
  // Initialize LoanManager contract client for liquidations
  if (process.env.LOAN_MANAGER_ADDRESS) {
    loanManagerClient = createWalletClient({
      account,
      chain: domaTestnet,
      transport: http(process.env.DOMA_RPC_URL || 'https://rpc-testnet.doma.xyz'),
    });
    console.log(`🔐 [Indexer] Wallet and LoanManager initialized: ${account.address}`);
  } else {
    console.warn('⚠️ [Indexer] LOAN_MANAGER_ADDRESS not set - liquidation disabled');
  }
} else {
  console.warn('⚠️ [Indexer] No wallet configured - score submission and liquidation disabled');
}

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
  
  const { domainTokenId, requester } = event.args;
  const eventId = `${event.transaction.hash}-${event.logIndex}`;
  const startTime = Date.now();
  
  console.log(`🔍 [AIOracle] Processing scoring request for tokenId: ${domainTokenId}`);
  
  // Initialize liquidation monitoring on first event (to get context access)
  if (!liquidationMonitoringStarted) {
    liquidationMonitoringStarted = true;
    console.log(`🚀 [Liquidation] Starting liquidation monitoring system...`);
    startLiquidationMonitoring(context);
  }
  
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
    const domainName = await domainResolver.resolveDomainName(domainTokenId);
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

    // 4. Submit score to AIOracle contract (if wallet is configured)
    let txHash = '';
    if (walletClient && process.env.AI_ORACLE_ADDRESS) {
      console.log(`📝 [AIOracle] Submitting score to contract...`);
      
      try {
        txHash = await walletClient.writeContract({
          address: process.env.AI_ORACLE_ADDRESS as Address,
          abi: [
            {
              type: 'function',
              name: 'submitScore',
              inputs: [
                { name: 'domainTokenId', type: 'uint256' },
                { name: 'score', type: 'uint256' }
              ],
              outputs: [],
              stateMutability: 'nonpayable',
            }
          ],
          functionName: 'submitScore',
          args: [domainTokenId, BigInt(scoreData.totalScore)],
        });

        console.log(`✅ [AIOracle] Score submitted! TX: ${txHash}`);
      } catch (contractError) {
        console.error(`❌ [AIOracle] Contract submission failed:`, contractError);
        // Continue processing even if contract submission fails
      }
    } else {
      console.warn('⚠️ [AIOracle] Skipping contract submission - wallet/address not configured');
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
  const { domainTokenId, score, submittedBy } = event.args;
  
  // Check if this was submitted by our indexer
  if (account && submittedBy.toLowerCase() === account.address.toLowerCase()) {
    console.log(`✅ [AIOracle] Confirmed submission: ${domainTokenId} → ${score} by our indexer`);
    
    // Update all scoring events for this domain to confirmed
    try {
      // Use simple database query pattern for Ponder v0.12 with proper null safety
      const allScoringEvents = await context.db.find(scoringEvent, {});
      const scoringEvents = Array.isArray(allScoringEvents) ? allScoringEvents.filter(e => e.domainTokenId === domainTokenId.toString()) : [];
      
      for (const event of scoringEvents) {
        if (event.status === 'submitted' || event.status === 'backend_completed') {
          await context.db.update(scoringEvent, { id: event.id })
            .set({
              status: 'completed',
              aiScore: Number(score)
            });
        }
      }
      console.log(`✅ [AIOracle] Updated ${scoringEvents.length} scoring events to completed`);
    } catch (error) {
      console.error(`❌ [AIOracle] Failed to update scoring events:`, error);
    }
  } else {
    console.log(`ℹ️ [AIOracle] External submission: ${domainTokenId} → ${score} by ${submittedBy}`);
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
    const domainName = await domainResolver.resolveDomainName(domainTokenId);
    
    // Record loan event
    await context.db.insert(loanEvent).values({
      id: `${event.transaction.hash}-${event.logIndex}`,
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
      liquidationBufferHours: 24, // Default 24-hour buffer
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
      // Use simple database query pattern for Ponder v0.12 with proper null safety
      const allAnalytics = await context.db.find(domainAnalytics, {});
      const results = Array.isArray(allAnalytics) ? allAnalytics.filter(a => a.id === id) : [];
      existingAnalytics = results.length > 0 ? results[0] : null;
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
 * LOAN EVENTS: Track loan lifecycle
 */
ponder.on("LoanManager:LoanRepaid", async ({ event, context }) => {
  const { loanId, borrower, amount } = event.args;
  
  console.log(`💰 [LoanManager] Loan repaid: ${loanId} by ${borrower} (${amount})`);
  
  try {
    await context.db.insert(loanEvent).values({
      id: `${event.transaction.hash}-${event.logIndex}`,
      eventType: 'repaid',
      loanId: loanId.toString(),
      borrowerAddress: borrower,
      domainTokenId: '', // This will need to be filled from loan data
      loanAmount: amount.toString(),
      eventTimestamp: new Date(Number(event.block.timestamp) * 1000),
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });
  } catch (error) {
    console.error(`❌ [LoanManager] Failed to process loan repaid event:`, error);
  }
});

/**
 * LIQUIDATION MONITORING SYSTEM
 * Checks for defaulted loans and triggers liquidation
 */
async function checkAndLiquidateDefaultedLoans(context: any) {
  if (!loanManagerClient || !process.env.LOAN_MANAGER_ADDRESS) {
    console.log('⚠️ [Liquidation] LoanManager not configured - skipping liquidation check');
    return;
  }

  const now = new Date();
  console.log(`🔍 [Liquidation] Checking for defaulted loans at ${now.toISOString()}`);

  try {
    // Query all instant loans using Ponder's find method
    // Use simple database query pattern for Ponder v0.12 with proper null safety
    const allLoans = await context.db.find(loanEvent, {});
    const defaultedLoans = Array.isArray(allLoans) ? allLoans.filter(loan => 
      loan.eventType === 'created_instant' && loan.liquidationAttempted === false
    ) : [];

    if (!defaultedLoans || defaultedLoans.length === 0) {
      console.log('✅ [Liquidation] No loans found for liquidation check');
      return;
    }

    let liquidationCount = 0;
    
    for (const loan of defaultedLoans) {
      try {
        // Check if loan is past due (repayment deadline + buffer hours)
        const repaymentDeadline = new Date(loan.repaymentDeadline);
        const bufferHours = loan.liquidationBufferHours || 24;
        const liquidationThreshold = new Date(repaymentDeadline.getTime() + bufferHours * 60 * 60 * 1000);
        
        if (now < liquidationThreshold) {
          continue; // Loan not yet eligible for liquidation
        }

        console.log(`🚨 [Liquidation] Attempting liquidation for loan ${loan.loanId} (deadline: ${repaymentDeadline.toISOString()}, threshold: ${liquidationThreshold.toISOString()})`);

        // Mark as liquidation attempted first (to prevent duplicate attempts)
        await context.db.update(loanEvent, { id: loan.id })
          .set({
            liquidationAttempted: true,
            liquidationTimestamp: new Date(),
          });

        // Call LoanManager.liquidateCollateral
        const txHash = await loanManagerClient.writeContract({
          address: process.env.LOAN_MANAGER_ADDRESS as Address,
          abi: [
            {
              type: 'function',
              name: 'liquidateCollateral',
              inputs: [{ name: 'loanId', type: 'uint256' }],
              outputs: [{ name: 'auctionId', type: 'uint256' }],
              stateMutability: 'nonpayable',
            }
          ],
          functionName: 'liquidateCollateral',
          args: [BigInt(loan.loanId)],
        });

        console.log(`✅ [Liquidation] Liquidation submitted for loan ${loan.loanId}! TX: ${txHash}`);

        // Update database with transaction hash
        await context.db.update(loanEvent, { id: loan.id })
          .set({
            liquidationTxHash: txHash,
          });

        liquidationCount++;

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
      console.log(`🎉 [Liquidation] Successfully submitted ${liquidationCount} liquidation(s)`);
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

  const checkIntervalMs = parseInt(process.env.LIQUIDATION_CHECK_INTERVAL_MS || '300000'); // Default 5 minutes
  console.log(`🚀 [Liquidation] Starting liquidation monitoring (interval: ${checkIntervalMs}ms)`);

  // Run initial check after 30 seconds
  setTimeout(() => checkAndLiquidateDefaultedLoans(context), 30000);

  // Set up periodic checks
  liquidationInterval = setInterval(() => {
    checkAndLiquidateDefaultedLoans(context);
  }, checkIntervalMs);
}

// Export handlers for testing
export { updateDomainAnalytics, checkAndLiquidateDefaultedLoans, startLiquidationMonitoring };
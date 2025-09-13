# DomaLend V2 Event Mapping & Logic Specification

## Overview
This document maps all contract events that the indexer listens to, their parameters, processing logic, and expected outcomes. This serves as the single source of truth for debugging and verification.

## Event Processing Flow Architecture

```
Contract Event → Indexer Captures → Process Logic → Backend API → Contract Submission → Database Record
```

## Contract Events Specification

### 1. AIOracle Events

#### 1.1 ScoringRequested Event
```solidity
event ScoringRequested(
    uint256 indexed domainTokenId,
    address indexed requester,
    uint256 timestamp
);
```

**Parameters:**
- `domainTokenId` (uint256): The domain NFT token ID to be scored
- `requester` (address): Address that requested the scoring
- `timestamp` (uint256): Block timestamp when request was made

**Processing Logic:**
```typescript
1. Extract domainTokenId from event
2. Resolve domainTokenId → domain name via Doma Protocol
3. Call backend API: GET /domains/{domainName}/score
4. Extract AI score from backend response (expect: nike.com → 98)
5. Submit score to AIOracle.submitScore(domainTokenId, score)
6. Record complete flow in database
```

**Expected Flow:**
```
Input: ScoringRequested(12345, 0xABC..., 1694612345)
→ Resolve: tokenId 12345 = "nike.com"
→ Backend: GET /domains/nike.com/score → {totalScore: 98, confidence: 95}
→ Submit: aiOracle.submitScore(12345, 98)
→ Record: Database entry with all details
```

**Error Handling:**
- Domain resolution fails → Use fallback: `domain-${tokenId}.unknown`
- Backend API fails → Use default score: 50
- Contract submission fails → Retry up to 3 times, then log failure

#### 1.2 BatchScoringRequested Event
```solidity
event BatchScoringRequested(
    uint256[] domainTokenIds,
    address indexed requester,
    uint256 timestamp
);
```

**Parameters:**
- `domainTokenIds` (uint256[]): Array of domain token IDs to score
- `requester` (address): Address that requested batch scoring
- `timestamp` (uint256): Block timestamp when request was made

**Processing Logic:**
```typescript
1. Extract array of domainTokenIds
2. Resolve all tokenIds → domain names in parallel
3. Call backend API: POST /domains/bulk-test with domain names
4. Map responses back to tokenIds
5. Submit all scores via aiOracle.batchSubmitScores()
6. Record each individual score in database
```

#### 1.3 ScoreSubmitted Event (For Monitoring)
```solidity
event ScoreSubmitted(
    uint256 indexed domainTokenId,
    uint256 score,
    address indexed submittedBy,
    uint256 timestamp
);
```

**Parameters:**
- `domainTokenId` (uint256): Domain that was scored
- `score` (uint256): AI score submitted (0-100)
- `submittedBy` (address): Address that submitted (should be our indexer)
- `timestamp` (uint256): Submission timestamp

**Processing Logic:**
```typescript
1. Verify submittedBy matches our indexer address
2. Log successful submission
3. Update database record status to 'completed'
4. Track metrics (response time, success rate)
```

### 2. SatoruLending Events

#### 2.1 InstantLoanExecuted Event
```solidity
event InstantLoanExecuted(
    uint256 indexed loanId,
    address indexed borrower,
    uint256 indexed domainTokenId,
    uint256 poolId,
    uint256 loanAmount,
    uint256 interestRate,
    uint256 repaymentDeadline,
    uint256 aiScore
);
```

**Parameters:**
- `loanId` (uint256): Unique loan identifier
- `borrower` (address): Borrower's address
- `domainTokenId` (uint256): Domain used as collateral
- `poolId` (uint256): Liquidity pool that funded the loan
- `loanAmount` (uint256): Amount loaned in USDC (6 decimals)
- `interestRate` (uint256): Interest rate in basis points
- `repaymentDeadline` (uint256): Deadline timestamp
- `aiScore` (uint256): AI score used for loan approval

**Processing Logic:**
```typescript
1. Record loan creation analytics
2. Track AI score usage (verify matches our submitted score)
3. Monitor loan-to-value ratios
4. Update pool utilization metrics
```

#### 2.2 LoanRequestCreated Event
```solidity
event LoanRequestCreated(
    uint256 indexed requestId,
    address indexed borrower,
    uint256 indexed domainTokenId,
    uint256 requestedAmount,
    uint256 proposedInterestRate,
    uint256 aiScore,
    uint256 campaignDeadline
);
```

**Processing Logic:**
```typescript
1. Record crowdfunding campaign start
2. Verify AI score matches our records
3. Track campaign metrics
4. Monitor funding progress
```

### 3. LoanManager Events

#### 3.1 LoanRepaid Event
```solidity
event LoanRepaid(
    uint256 indexed loanId,
    address indexed borrower,
    uint256 repaymentAmount,
    uint256 remainingBalance,
    bool isFullyRepaid,
    uint256 timestamp
);
```

**Processing Logic:**
```typescript
1. Update loan status tracking
2. Calculate performance metrics
3. Track borrower behavior patterns
4. Update collateral release status if fully repaid
```

#### 3.2 CollateralLiquidated Event
```solidity
event CollateralLiquidated(
    uint256 indexed loanId,
    uint256 indexed domainTokenId,
    address indexed borrower,
    uint256 loanAmount,
    uint256 auctionId,
    uint256 startingPrice
);
```

**Processing Logic:**
```typescript
1. Record liquidation event
2. Track domain that went to auction
3. Monitor relationship between AI score and liquidation
4. Update risk analytics
```

### 4. DutchAuction Events

#### 4.1 AuctionStarted Event
```solidity
event AuctionStarted(
    uint256 indexed auctionId,
    uint256 indexed loanId,
    uint256 indexed domainTokenId,
    address borrower,
    uint256 startingPrice,
    uint256 reservePrice,
    uint256 startTimestamp,
    uint256 endTimestamp,
    uint256 aiScore,
    string domainName
);
```

**Processing Logic:**
```typescript
1. Record auction start
2. Verify AI score matches our records
3. Track pricing relationship to AI score
4. Monitor auction performance
```

#### 4.2 AuctionEnded Event
```solidity
event AuctionEnded(
    uint256 indexed auctionId,
    uint256 indexed loanId,
    uint256 indexed domainTokenId,
    address winner,
    uint256 finalPrice,
    uint256 loanAmount,
    uint256 surplus,
    uint256 endTimestamp
);
```

**Processing Logic:**
```typescript
1. Record auction completion
2. Calculate recovery rates
3. Analyze price vs AI score correlation
4. Track market efficiency metrics
```

## Database Schema for Event Tracking

### ScoringEvents Table
```sql
CREATE TABLE scoring_events (
    id VARCHAR PRIMARY KEY,
    domain_token_id BIGINT NOT NULL,
    domain_name VARCHAR,
    requester_address VARCHAR NOT NULL,
    ai_score INTEGER,
    confidence INTEGER,
    reasoning TEXT,
    submission_tx_hash VARCHAR,
    request_timestamp TIMESTAMP,
    backend_call_timestamp TIMESTAMP,
    submission_timestamp TIMESTAMP,
    completion_timestamp TIMESTAMP,
    status VARCHAR, -- 'pending', 'backend_called', 'submitted', 'completed', 'failed'
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);
```

### LoanEvents Table
```sql
CREATE TABLE loan_events (
    id VARCHAR PRIMARY KEY,
    event_type VARCHAR NOT NULL, -- 'created', 'repaid', 'liquidated'
    loan_id BIGINT,
    borrower_address VARCHAR,
    domain_token_id BIGINT,
    domain_name VARCHAR,
    loan_amount BIGINT,
    ai_score INTEGER,
    interest_rate INTEGER,
    event_timestamp TIMESTAMP,
    block_number BIGINT,
    transaction_hash VARCHAR
);
```

### AuctionEvents Table
```sql
CREATE TABLE auction_events (
    id VARCHAR PRIMARY KEY,
    event_type VARCHAR NOT NULL, -- 'started', 'bid_placed', 'ended'
    auction_id BIGINT,
    loan_id BIGINT,
    domain_token_id BIGINT,
    domain_name VARCHAR,
    ai_score INTEGER,
    starting_price BIGINT,
    final_price BIGINT,
    recovery_rate DECIMAL,
    event_timestamp TIMESTAMP,
    block_number BIGINT,
    transaction_hash VARCHAR
);
```

## Critical Logic Verification Points

### 1. AI Score Consistency
```typescript
// Verify AI scores match between:
// 1. ScoreSubmitted event (our submission)
// 2. InstantLoanExecuted event (contract usage)
// 3. AuctionStarted event (liquidation reference)

function verifyScoreConsistency(domainTokenId: bigint) {
    const submittedScore = getSubmittedScore(domainTokenId);
    const loanScore = getLoanScore(domainTokenId);
    const auctionScore = getAuctionScore(domainTokenId);
    
    if (submittedScore !== loanScore || loanScore !== auctionScore) {
        console.error(`Score inconsistency for ${domainTokenId}:`, {
            submitted: submittedScore,
            loan: loanScore,
            auction: auctionScore
        });
    }
}
```

### 2. Backend API Response Validation
```typescript
// Verify backend responses match expected format
function validateBackendResponse(response: any, domainName: string): boolean {
    return (
        typeof response.totalScore === 'number' &&
        response.totalScore >= 0 &&
        response.totalScore <= 100 &&
        typeof response.confidence === 'number'
    );
}

// Test cases for known domains
const testCases = [
    { domain: 'nike.com', expectedScore: 98 },
    { domain: 'cocacola.com', expectedScore: 96 },
    { domain: 'randomdomain123.com', expectedScoreRange: [0, 30] }
];
```

### 3. End-to-End Flow Tracking
```typescript
// Track complete flow from request to usage
interface FlowTracking {
    requestTimestamp: number;
    backendCallTimestamp: number;
    submissionTimestamp: number;
    usageTimestamp: number; // When used in loan/auction
    totalDuration: number;
    success: boolean;
}

function trackEndToEndFlow(domainTokenId: bigint): FlowTracking {
    // Implementation tracks timing and success of entire flow
}
```

## Debugging Checklist

When debugging issues, check in this order:

1. **Event Reception**: Is the indexer receiving the event?
2. **Domain Resolution**: Can we resolve tokenId to domain name?
3. **Backend API**: Is the backend responding with valid scores?
4. **Contract Submission**: Are we successfully submitting scores?
5. **Score Usage**: Are contracts using our submitted scores?
6. **Database Recording**: Are all events properly recorded?

## Monitoring Alerts

Set up alerts for:
- ❌ **Backend API failures** > 5% error rate
- ❌ **Score submission failures** > 1% error rate  
- ❌ **Processing delays** > 30 seconds end-to-end
- ❌ **Score inconsistencies** between events
- ❌ **Missing events** (gaps in sequence)

This specification ensures we can quickly identify and fix any issues during implementation or after deployment changes.
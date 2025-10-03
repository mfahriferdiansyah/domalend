import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean } from 'class-validator';

export class PoolHistoryEventDto {
  @ApiProperty({
    description: 'Pool history event ID',
    example: '0xbd6e65eaa1fdb2e65a8fedd470caf3171c06ac83801ab18faa6228e9f9c2ec80-22',
  })
  id: string;

  @ApiProperty({
    description: 'Pool ID',
    example: '1',
  })
  poolId: string;

  @ApiProperty({
    description: 'Event type',
    example: 'created',
    enum: ['created', 'liquidity_added', 'liquidity_removed', 'updated', 'paused', 'closed'],
  })
  eventType: string;

  @ApiProperty({
    description: 'Liquidity provider address (for liquidity events)',
    example: '0x47b245f2a3c7557d855e4d800890c4a524a42cc8',
    required: false,
  })
  providerAddress?: string;

  @ApiProperty({
    description: 'Liquidity amount (for liquidity events)',
    example: '10000000000',
    required: false,
  })
  liquidityAmount?: string;

  @ApiProperty({
    description: 'Minimum AI score (for updated events)',
    example: 70,
    required: false,
  })
  minAiScore?: number;

  @ApiProperty({
    description: 'Interest rate (for updated events)',
    example: 1000,
    required: false,
  })
  interestRate?: number;

  @ApiProperty({
    description: 'Event timestamp',
    example: '1759316702000',
  })
  eventTimestamp: string;

  @ApiProperty({
    description: 'Block number',
    example: '11412397',
  })
  blockNumber: string;

  @ApiProperty({
    description: 'Transaction hash',
    example: '0xbd6e65eaa1fdb2e65a8fedd470caf3171c06ac83801ab18faa6228e9f9c2ec80',
  })
  transactionHash: string;
}

export class PoolHistoryDto {
  @ApiProperty({
    description: 'List of pool history events',
    type: [PoolHistoryEventDto],
  })
  items: PoolHistoryEventDto[];
}

export class PoolDto {
  @ApiProperty({
    description: 'Pool ID',
    example: '1',
  })
  poolId: string;

  @ApiProperty({
    description: 'Pool ID (alias for poolId)',
    example: '1',
  })
  id: string;

  @ApiProperty({
    description: 'Pool creator address',
    example: '0xaba3cf48a81225de43a642ca486c1c069ec11a53',
  })
  creator: string;

  @ApiProperty({
    description: 'Transaction hash of pool creation',
    example: '0xbd6e65eaa1fdb2e65a8fedd470caf3171c06ac83801ab18faa6228e9f9c2ec80',
  })
  transactionHash: string;

  @ApiProperty({
    description: 'Minimum AI score required for loans',
    example: 70,
  })
  minAiScore: number;

  @ApiProperty({
    description: 'Interest rate for loans (in basis points)',
    example: 1000,
  })
  interestRate: number;

  @ApiProperty({
    description: 'Pool creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '1759329172000',
  })
  lastUpdated: string;

  @ApiProperty({
    description: 'Total liquidity in the pool',
    example: '15000000000',
  })
  totalLiquidity: string;

  @ApiProperty({
    description: 'Number of unique liquidity providers',
    example: 1,
  })
  liquidityProviderCount: number;

  @ApiProperty({
    description: 'Participant count (alias for liquidityProviderCount)',
    example: 1,
  })
  participantCount: number;

  @ApiProperty({
    description: 'Number of active loans',
    example: 3,
  })
  activeLoans: number;

  @ApiProperty({
    description: 'Total volume of loans issued',
    example: '5000000000000000000',
  })
  totalLoanVolume: string;

  @ApiProperty({
    description: 'Default rate (0-1)',
    example: 0.05,
  })
  defaultRate: number;

  @ApiProperty({
    description: 'Pool status',
    example: 'active',
    enum: ['active', 'inactive'],
  })
  status: 'active' | 'inactive';

  @ApiProperty({
    description: 'Minimum loan duration in seconds',
    example: '86400',
  })
  minDuration: string;

  @ApiProperty({
    description: 'Maximum loan duration in seconds',
    example: '2592000',
  })
  maxDuration: string;

  @ApiProperty({
    description: 'Minimum loan amount',
    example: '1000000000',
  })
  minLoanAmount: string;

  @ApiProperty({
    description: 'Maximum loan amount',
    example: '5000000000',
  })
  maxLoanAmount: string;

  @ApiProperty({
    description: 'Maximum domain expiration timestamp',
    example: '999999999',
  })
  maxDomainExpiration: string;

  @ApiProperty({
    description: 'Pool history events',
    type: 'PoolHistoryDto',
    required: false,
  })
  history?: PoolHistoryDto;
}

export class UserPoolDto extends PoolDto {
  @ApiProperty({
    description: 'User contribution to this pool',
    example: '100000000000000000',
  })
  userContribution: string;

  @ApiProperty({
    description: 'When user first contributed to this pool',
    example: '2024-01-15T10:30:00Z',
  })
  userContributedAt: string;

  @ApiProperty({
    description: 'Whether user is the creator of this pool',
    example: false,
  })
  userIsCreator: boolean;
}

export class GetPoolsQueryDto {
  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiProperty({
    description: 'Minimum AI score filter',
    example: 50,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  minAiScore?: number;

  @ApiProperty({
    description: 'Pool status filter',
    example: 'active',
    required: false,
    enum: ['active', 'inactive'],
  })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @ApiProperty({
    description: 'Sort field',
    example: 'createdAt',
    required: false,
    enum: ['createdAt', 'totalLiquidity', 'interestRate'],
  })
  @IsOptional()
  @IsEnum(['createdAt', 'totalLiquidity', 'interestRate'])
  sortBy?: 'createdAt' | 'totalLiquidity' | 'interestRate';

  @ApiProperty({
    description: 'Sort order',
    example: 'desc',
    required: false,
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc';
}

export class GetPoolsResponseDto {
  @ApiProperty({
    description: 'Data wrapper containing pools',
    type: Object,
  })
  data: {
    pools: {
      items: PoolDto[];
    };
  };
}

export class LoanDto {
  @ApiProperty({
    description: 'Loan ID',
    example: '12345',
  })
  loanId: string;

  @ApiProperty({
    description: 'Borrower address',
    example: '0xaba3cf48a81225de43a642ca486c1c069ec11a53',
  })
  borrowerAddress: string;

  @ApiProperty({
    description: 'Domain token ID',
    example: '123456',
  })
  domainTokenId: string;

  @ApiProperty({
    description: 'Domain name',
    example: 'example.eth',
  })
  domainName: string;

  @ApiProperty({
    description: 'Loan amount (formatted in USDC)',
    example: '1000',
  })
  loanAmount: string;

  @ApiProperty({
    description: 'AI score',
    example: 85,
  })
  aiScore: number;

  @ApiProperty({
    description: 'Interest rate (in basis points)',
    example: 500,
  })
  interestRate: number;

  @ApiProperty({
    description: 'Loan status',
    example: 'active',
    enum: ['active', 'overdue', 'repaid', 'liquidated'],
  })
  status: 'active' | 'overdue' | 'repaid' | 'liquidated';

  @ApiProperty({
    description: 'Event type (for compatibility)',
    example: 'loan_record',
  })
  eventType: string;

  @ApiProperty({
    description: 'Loan creation timestamp',
    example: '1758975554000',
  })
  eventTimestamp: string;

  @ApiProperty({
    description: 'Repayment deadline',
    example: '1759235554000',
    required: false,
  })
  repaymentDeadline?: string;

  @ApiProperty({
    description: 'Pool ID',
    example: '12',
  })
  poolId: string;

  @ApiProperty({
    description: 'Whether liquidation was attempted',
    example: false,
  })
  liquidationAttempted: boolean;

  @ApiProperty({
    description: 'Liquidation timestamp',
    example: '1759240000000',
    required: false,
  })
  liquidationTimestamp?: string;
}

export class GetPoolDetailResponseDto {
  @ApiProperty({
    description: 'Pool details with all fields including history',
    type: () => PoolDto,
  })
  pool: PoolDto;

  @ApiProperty({
    description: 'Loans associated with this pool',
    type: [LoanDto],
    required: false,
  })
  loans?: LoanDto[];

  @ApiProperty({
    description: 'Pool history events (legacy field, use pool.history instead)',
    type: [PoolHistoryEventDto],
    required: false,
  })
  poolHistory?: PoolHistoryEventDto[];
}

export class DomainDto {
  @ApiProperty({
    description: 'Domain token ID',
    example: '123456',
  })
  domainTokenId: string;

  @ApiProperty({
    description: 'Domain name',
    example: 'example.eth',
  })
  domainName: string;

  @ApiProperty({
    description: 'Latest AI score',
    example: 85,
  })
  latestAiScore: number;

  @ApiProperty({
    description: 'Total number of scoring requests',
    example: 5,
  })
  totalScoringRequests: number;

  @ApiProperty({
    description: 'Total loans created for this domain',
    example: 3,
  })
  totalLoansCreated: number;

  @ApiProperty({
    description: 'Total loan volume for this domain',
    example: '5000000000000000000',
  })
  totalLoanVolume: string;

  @ApiProperty({
    description: 'Whether domain has been liquidated',
    example: false,
  })
  hasBeenLiquidated: boolean;

  @ApiProperty({
    description: 'First scoring timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  firstScoreTimestamp: string;

  @ApiProperty({
    description: 'Last activity timestamp',
    example: '2024-01-16T10:30:00Z',
  })
  lastActivityTimestamp: string;
}

export class GetDomainsQueryDto {
  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiProperty({
    description: 'Minimum AI score filter',
    example: 50,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  minAiScore?: number;

  @ApiProperty({
    description: 'Maximum AI score filter',
    example: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  maxAiScore?: number;

  @ApiProperty({
    description: 'Whether to include only liquidated domains',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  liquidatedOnly?: boolean;

  @ApiProperty({
    description: 'Sort field',
    example: 'latestAiScore',
    required: false,
    enum: ['latestAiScore', 'totalLoansCreated', 'totalLoanVolume', 'firstScoreTimestamp'],
  })
  @IsOptional()
  @IsEnum(['latestAiScore', 'totalLoansCreated', 'totalLoanVolume', 'firstScoreTimestamp'])
  sortBy?: 'latestAiScore' | 'totalLoansCreated' | 'totalLoanVolume' | 'firstScoreTimestamp';

  @ApiProperty({
    description: 'Sort order',
    example: 'desc',
    required: false,
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc';
}

export class GetDomainsResponseDto {
  @ApiProperty({
    description: 'List of scored domains',
    type: [DomainDto],
  })
  domains: DomainDto[];

  @ApiProperty({
    description: 'Total number of domains',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Current page',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
  })
  limit: number;
}

export class ScoringEventDto {
  @ApiProperty({
    description: 'Scoring event ID',
    example: 'score_12345',
  })
  id: string;

  @ApiProperty({
    description: 'Domain token ID',
    example: '123456',
  })
  domainTokenId: string;

  @ApiProperty({
    description: 'Domain name',
    example: 'example.eth',
  })
  domainName: string;

  @ApiProperty({
    description: 'Requester address',
    example: '0xaba3cf48a81225de43a642ca486c1c069ec11a53',
  })
  requesterAddress: string;

  @ApiProperty({
    description: 'AI score',
    example: 85,
  })
  aiScore: number;

  @ApiProperty({
    description: 'Confidence level',
    example: 92,
  })
  confidence: number;

  @ApiProperty({
    description: 'Reasoning for the score',
    example: 'High traffic domain with good branding',
  })
  reasoning: string;

  @ApiProperty({
    description: 'Request timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  requestTimestamp: string;

  @ApiProperty({
    description: 'Status of the scoring request',
    example: 'completed',
  })
  status: string;
}

export class DomainDetailDto extends DomainDto {
  @ApiProperty({
    description: 'Loans associated with this domain',
    type: [LoanDto],
    required: false,
  })
  loans?: LoanDto[];

  @ApiProperty({
    description: 'Scoring history for this domain',
    type: [ScoringEventDto],
    required: false,
  })
  scoringHistory?: ScoringEventDto[];

  @ApiProperty({
    description: 'Auctions for this domain',
    type: [Object], // We can create AuctionDto later if needed
    required: false,
  })
  auctions?: any[];
}

export class GetDomainDetailResponseDto {
  @ApiProperty({
    description: 'Domain details with related data',
    type: () => DomainDetailDto,
  })
  domain: DomainDetailDto;
}

export class GetUserPoolsResponseDto {
  @ApiProperty({
    description: 'List of pools user participated in',
    type: [UserPoolDto],
  })
  pools: UserPoolDto[];

  @ApiProperty({
    description: 'Summary of user pool participation',
  })
  summary: {
    totalPools: number;
    totalContribution: string;
  };
}

export class AuctionDto {
  @ApiProperty({
    description: 'Auction ID',
    example: 'auction_12345',
  })
  auctionId: string;

  @ApiProperty({
    description: 'Associated loan ID',
    example: 'loan_12345',
  })
  loanId: string;

  @ApiProperty({
    description: 'Domain token ID',
    example: '123456',
  })
  domainTokenId: string;

  @ApiProperty({
    description: 'Domain name',
    example: 'example.eth',
  })
  domainName: string;

  @ApiProperty({
    description: 'Borrower address',
    example: '0xaba3cf48a81225de43a642ca486c1c069ec11a53',
  })
  borrowerAddress: string;

  @ApiProperty({
    description: 'Bidder address',
    example: '0x47b245f2a3c7557d855e4d800890c4a524a42cc8',
    required: false,
  })
  bidderAddress?: string;

  @ApiProperty({
    description: 'Starting price of the auction',
    example: '1000000000000000000',
    required: false,
  })
  startingPrice?: string;

  @ApiProperty({
    description: 'Current price of the auction',
    example: '1500000000000000000',
    required: false,
  })
  currentPrice?: string;

  @ApiProperty({
    description: 'Final price if auction ended',
    example: '2000000000000000000',
    required: false,
  })
  finalPrice?: string;

  @ApiProperty({
    description: 'Recovery rate (final price / loan amount)',
    example: 1.5,
    required: false,
  })
  recoveryRate?: number;

  @ApiProperty({
    description: 'Event type',
    example: 'started',
    enum: ['started', 'bid_placed', 'ended'],
  })
  eventType: string;

  @ApiProperty({
    description: 'Event timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  eventTimestamp: string;
}

export class AuctionDetailDto {
  @ApiProperty({
    description: 'Auction ID',
    example: 'auction_12345',
  })
  auctionId: string;

  @ApiProperty({
    description: 'Associated loan ID',
    example: 'loan_12345',
  })
  loanId: string;

  @ApiProperty({
    description: 'Domain token ID',
    example: '123456',
  })
  domainTokenId: string;

  @ApiProperty({
    description: 'Domain name',
    example: 'example.eth',
  })
  domainName: string;

  @ApiProperty({
    description: 'Borrower address',
    example: '0xaba3cf48a81225de43a642ca486c1c069ec11a53',
  })
  borrowerAddress: string;

  @ApiProperty({
    description: 'Current status of the auction',
    example: 'active',
    enum: ['active', 'ended'],
  })
  status: string;

  @ApiProperty({
    description: 'Starting price of the auction',
    example: '1000000000000000000',
    required: false,
  })
  startingPrice?: string;

  @ApiProperty({
    description: 'Current highest bid',
    example: '1500000000000000000',
    required: false,
  })
  currentPrice?: string;

  @ApiProperty({
    description: 'Final price if auction ended',
    example: '2000000000000000000',
    required: false,
  })
  finalPrice?: string;

  @ApiProperty({
    description: 'Recovery rate (final price / loan amount)',
    example: 1.5,
    required: false,
  })
  recoveryRate?: number;

  @ApiProperty({
    description: 'Current highest bidder',
    example: '0x47b245f2a3c7557d855e4d800890c4a524a42cc8',
    required: false,
  })
  currentBidder?: string;

  @ApiProperty({
    description: 'Auction start timestamp',
    example: '2024-01-15T10:30:00Z',
    required: false,
  })
  startedAt?: string;

  @ApiProperty({
    description: 'Auction end timestamp',
    example: '2024-01-16T10:30:00Z',
    required: false,
  })
  endedAt?: string;

  @ApiProperty({
    description: 'All auction events in chronological order',
    type: [AuctionDto],
  })
  events: AuctionDto[];
}

export class GetAuctionDetailResponseDto {
  @ApiProperty({
    description: 'Auction details with event history',
    type: () => AuctionDetailDto,
  })
  auction: AuctionDetailDto;
}

export class PoolsSummaryDto {
  @ApiProperty({ description: 'Total Value Locked across all pools', example: '1000000000000000000000' })
  tvl: string;

  @ApiProperty({ description: 'Average APY across all pools (in basis points)', example: 850 })
  averageApy: number;

  @ApiProperty({ description: 'Total amount of active loans across all pools', example: '50000000000000000000' })
  totalActiveLoanAmount: string;

  @ApiProperty({ description: 'Available liquidity across all pools', example: '950000000000000000000' })
  availableLiquidity: string;
}

export class GetPoolsSummaryResponseDto {
  @ApiProperty({ type: PoolsSummaryDto })
  summary: PoolsSummaryDto;
}
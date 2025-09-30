import { ApiProperty } from '@nestjs/swagger';
import { EnhancedDomainDto } from '../../domain/dto/domain.dto';

export class DomainAttributeDto {
  @ApiProperty({
    description: 'Trait type',
    example: 'TLD'
  })
  trait_type: string;

  @ApiProperty({
    description: 'Trait value',
    example: 'com'
  })
  value: string | number;
}

export class DomainMetadataDto {
  @ApiProperty({
    description: 'Domain attributes',
    type: () => [DomainAttributeDto],
    required: false
  })
  attributes?: DomainAttributeDto[];
}

export class DashboardStatsDto {
  @ApiProperty({
    description: 'Total portfolio value',
    example: '45780'
  })
  totalPortfolio: string;


  @ApiProperty({
    description: 'Active loans count',
    example: 2
  })
  activeLoansCount: number;

  @ApiProperty({
    description: 'Total active loans value',
    example: '8950'
  })
  activeLoansValue: string;

  @ApiProperty({
    description: 'Total liquidity provided',
    example: '25600'
  })
  liquidityProvided: string;

  @ApiProperty({
    description: 'Number of pools providing liquidity to',
    example: 2
  })
  liquidityPoolsCount: number;

  @ApiProperty({
    description: 'Total earnings all time',
    example: '3420'
  })
  totalEarnings: string;
}

export class ActiveLoanDto {
  @ApiProperty({
    description: 'Domain name',
    example: 'example.com'
  })
  domainName: string;

  @ApiProperty({
    description: 'Loan amount',
    example: '2800'
  })
  loanAmount: string;

  @ApiProperty({
    description: 'Next payment due date',
    example: '10/15/2024'
  })
  nextPaymentDate: string;

  @ApiProperty({
    description: 'Loan status',
    example: 'active',
    enum: ['active', 'overdue', 'completed']
  })
  status: 'active' | 'overdue' | 'completed';
}

export class UserLoanDto {
  @ApiProperty({
    description: 'Loan ID',
    example: '123'
  })
  loanId: string;

  @ApiProperty({
    description: 'Domain name',
    example: 'example.com'
  })
  domainName: string;

  @ApiProperty({
    description: 'Domain token ID',
    example: '12345678901234567890'
  })
  domainTokenId: string;

  @ApiProperty({
    description: 'Loan amount (formatted)',
    example: '2800'
  })
  loanAmount: string;

  @ApiProperty({
    description: 'Original loan amount (raw)',
    example: '2800000000'
  })
  originalAmount: string;

  @ApiProperty({
    description: 'Current outstanding balance',
    example: '1400000000'
  })
  currentBalance: string;

  @ApiProperty({
    description: 'Total amount repaid',
    example: '1400000000'
  })
  totalRepaid: string;

  @ApiProperty({
    description: 'Repayment due date',
    example: '10/15/2024'
  })
  repaymentDate: string;

  @ApiProperty({
    description: 'Loan status',
    example: 'active',
    enum: ['active', 'overdue', 'repaid', 'liquidated']
  })
  status: 'active' | 'overdue' | 'repaid' | 'liquidated';

  @ApiProperty({
    description: 'AI score of the domain',
    example: 85
  })
  aiScore: number;

  @ApiProperty({
    description: 'Interest rate (basis points)',
    example: 1500
  })
  interestRate: number;

  @ApiProperty({
    description: 'Pool ID',
    example: 'pool_123'
  })
  poolId: string;

  @ApiProperty({
    description: 'Loan creation timestamp',
    example: '1758972212000'
  })
  createdAt: string;

  @ApiProperty({
    description: 'Whether liquidation was attempted',
    example: false
  })
  liquidationAttempted: boolean;

  @ApiProperty({
    description: 'Liquidation timestamp',
    example: '1758975812000',
    required: false
  })
  liquidationTimestamp?: string;
}

export class LiquidityPositionDto {
  @ApiProperty({
    description: 'Pool name',
    example: 'Premium Domain Pool'
  })
  poolName: string;

  @ApiProperty({
    description: 'Pool ID',
    example: 'pool_123'
  })
  poolId: string;

  @ApiProperty({
    description: 'APY percentage',
    example: '12.5'
  })
  apy: string;

  @ApiProperty({
    description: 'User contribution amount',
    example: '15000'
  })
  contribution: string;

  @ApiProperty({
    description: 'Total earnings from this pool',
    example: '1875'
  })
  earnings: string;
}

export class AuctionOpportunityDto {
  @ApiProperty({
    description: 'Domain name',
    example: 'example.com'
  })
  domainName: string;

  @ApiProperty({
    description: 'Current bid amount',
    example: '6300'
  })
  currentBid: string;

  @ApiProperty({
    description: 'Estimated value',
    example: '8500'
  })
  estimatedValue: string;

  @ApiProperty({
    description: 'Time remaining',
    example: 'Ends in 48h'
  })
  timeRemaining: string;

  @ApiProperty({
    description: 'Percentage below estimate',
    example: '26'
  })
  belowEstimatePercent: string;
}

export class RecentActivityDto {
  @ApiProperty({
    description: 'Activity type',
    example: 'loan_payment',
    enum: ['loan_payment', 'liquidity_added', 'new_loan', 'auction_bid']
  })
  type: 'loan_payment' | 'liquidity_added' | 'new_loan' | 'auction_bid';

  @ApiProperty({
    description: 'Activity description',
    example: 'Loan payment for example.com'
  })
  description: string;

  @ApiProperty({
    description: 'Activity date',
    example: '9/10/2024'
  })
  date: string;

  @ApiProperty({
    description: 'Amount involved',
    example: '320'
  })
  amount: string;
}

export class DomainNFTDto {
  @ApiProperty({
    description: 'Token ID',
    example: '12345'
  })
  tokenId: string;

  @ApiProperty({
    description: 'Domain name',
    example: 'example.com'
  })
  name: string;

  @ApiProperty({
    description: 'Owner address',
    example: '0xaba3cf48a81225de43a642ca486c1c069ec11a53'
  })
  owner: string;

  @ApiProperty({
    description: 'Domain metadata',
    type: () => DomainMetadataDto,
    required: false
  })
  metadata?: DomainMetadataDto;
}

export class UserDashboardDto {
  @ApiProperty({
    description: 'Dashboard statistics',
    type: () => DashboardStatsDto
  })
  stats: DashboardStatsDto;

  @ApiProperty({
    description: 'User loans list (all statuses)',
    type: () => [UserLoanDto]
  })
  userLoans: UserLoanDto[];

  @ApiProperty({
    description: 'Liquidity positions',
    type: () => [LiquidityPositionDto]
  })
  liquidityPositions: LiquidityPositionDto[];

  @ApiProperty({
    description: 'Auction opportunities',
    type: () => [AuctionOpportunityDto]
  })
  auctionOpportunities: AuctionOpportunityDto[];

  @ApiProperty({
    description: 'Recent activity',
    type: () => [RecentActivityDto]
  })
  recentActivity: RecentActivityDto[];

  @ApiProperty({
    description: 'User owned domains/NFTs from Doma contract',
    type: () => [DomainNFTDto]
  })
  ownedNFTs: DomainNFTDto[];

  @ApiProperty({
    description: 'User scored domains with enhanced data',
    type: () => [EnhancedDomainDto]
  })
  scoredDomains: EnhancedDomainDto[];
}

export class GetUserDashboardResponseDto {
  @ApiProperty({
    description: 'User dashboard data',
    type: () => UserDashboardDto
  })
  dashboard: UserDashboardDto;
}
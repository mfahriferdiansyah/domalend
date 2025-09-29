import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({
    description: 'Total portfolio value',
    example: '45780'
  })
  totalPortfolio: string;

  @ApiProperty({
    description: 'Portfolio change percentage this month',
    example: '12.3'
  })
  portfolioChangePercent: string;

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

export class UserDashboardDto {
  @ApiProperty({
    description: 'Dashboard statistics',
    type: DashboardStatsDto
  })
  stats: DashboardStatsDto;

  @ApiProperty({
    description: 'Active loans list',
    type: [ActiveLoanDto]
  })
  activeLoans: ActiveLoanDto[];

  @ApiProperty({
    description: 'Liquidity positions',
    type: [LiquidityPositionDto]
  })
  liquidityPositions: LiquidityPositionDto[];

  @ApiProperty({
    description: 'Auction opportunities',
    type: [AuctionOpportunityDto]
  })
  auctionOpportunities: AuctionOpportunityDto[];

  @ApiProperty({
    description: 'Recent activity',
    type: [RecentActivityDto]
  })
  recentActivity: RecentActivityDto[];
}

export class GetUserDashboardResponseDto {
  @ApiProperty({
    description: 'User dashboard data',
    type: UserDashboardDto
  })
  dashboard: UserDashboardDto;
}
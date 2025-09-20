import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class LoanDomainDto {
  @ApiProperty({
    description: 'Domain token ID',
    example: '54344964066288468101530659531467425324551312134658892013131579195659464473615'
  })
  tokenId: string;

  @ApiProperty({
    description: 'Domain name',
    example: 'example.com'
  })
  name: string;

  @ApiProperty({
    description: 'AI domain score (0-100)',
    example: 85
  })
  aiScore: number;
}

export class LoanDto {
  @ApiProperty({
    description: 'Unique loan identifier',
    example: 'loan_123456'
  })
  loanId: string;

  @ApiProperty({
    description: 'Borrower wallet address',
    example: '0xaba3cf48a81225de43a642ca486c1c069ec11a53'
  })
  borrowerAddress: string;

  @ApiProperty({
    description: 'Loan status calculated from events',
    enum: ['active', 'overdue', 'repaid', 'liquidated', 'released'],
    example: 'active'
  })
  status: 'active' | 'overdue' | 'repaid' | 'liquidated' | 'released';

  @ApiProperty({
    description: 'Original loan amount in USDC (6 decimals)',
    example: '500000000'
  })
  principalAmount: string;

  @ApiProperty({
    description: 'Interest rate from pool (basis points)',
    example: 500
  })
  interestRate: number;

  @ApiProperty({
    description: 'Calculated interest accrued in USDC',
    example: '25000000'
  })
  interestAccrued: string;

  @ApiProperty({
    description: 'Total amount currently due (principal + interest)',
    example: '525000000'
  })
  currentAmountDue: string;

  @ApiProperty({
    description: 'Loan creation timestamp',
    example: '2024-01-15T10:30:00.000Z'
  })
  createdAt: string;

  @ApiProperty({
    description: 'Repayment deadline timestamp',
    example: '2024-02-15T10:30:00.000Z'
  })
  repaymentDeadline: string;

  @ApiProperty({
    description: 'Days until deadline (negative if overdue)',
    example: 15
  })
  daysUntilDeadline: number;

  @ApiProperty({
    description: 'Pool ID this loan belongs to',
    example: 'pool_789'
  })
  poolId: string;

  @ApiProperty({
    description: 'Domain information',
    type: LoanDomainDto
  })
  domain: LoanDomainDto;

  @ApiProperty({
    description: 'Loan health indicator (0-100)',
    example: 85
  })
  healthScore: number;

  @ApiProperty({
    description: 'Loan type',
    enum: ['instant', 'crowdfunded'],
    example: 'instant'
  })
  loanType: 'instant' | 'crowdfunded';
}

export class LoanDetailDto extends LoanDto {
  @ApiProperty({
    description: 'Event history for this loan',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        type: { type: 'string', example: 'created_instant' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
        details: { type: 'object' }
      }
    }
  })
  events: Array<{
    type: string;
    timestamp: string;
    details: any;
  }>;
}

export class GetLoansQueryDto {
  @ApiProperty({
    description: 'Page number (1-based)',
    example: 1,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;

  @ApiProperty({
    description: 'Filter by borrower address',
    example: '0xaba3cf48a81225de43a642ca486c1c069ec11a53',
    required: false
  })
  @IsOptional()
  @IsString()
  borrower?: string;

  @ApiProperty({
    description: 'Filter by domain token ID',
    example: '54344964066288468101530659531467425324551312134658892013131579195659464473615',
    required: false
  })
  @IsOptional()
  @IsString()
  domainTokenId?: string;

  @ApiProperty({
    description: 'Filter by pool ID',
    example: 'pool_789',
    required: false
  })
  @IsOptional()
  @IsString()
  poolId?: string;

  @ApiProperty({
    description: 'Filter by loan status',
    enum: ['active', 'overdue', 'repaid', 'liquidated', 'released'],
    required: false
  })
  @IsOptional()
  @IsEnum(['active', 'overdue', 'repaid', 'liquidated', 'released'])
  status?: 'active' | 'overdue' | 'repaid' | 'liquidated' | 'released';

  @ApiProperty({
    description: 'Sort by field',
    enum: ['createdAt', 'principalAmount', 'repaymentDeadline'],
    example: 'createdAt',
    required: false
  })
  @IsOptional()
  @IsEnum(['createdAt', 'principalAmount', 'repaymentDeadline'])
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc',
    required: false
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}

export class LoanSummaryDto {
  @ApiProperty({
    description: 'Total number of loans',
    example: 10
  })
  totalLoans: number;

  @ApiProperty({
    description: 'Number of active loans',
    example: 3
  })
  activeLoans: number;

  @ApiProperty({
    description: 'Total volume of loans',
    example: '5000000000'
  })
  totalVolume: string;

  @ApiProperty({
    description: 'Average AI score of domains',
    example: 75
  })
  averageAiScore: number;

  @ApiProperty({
    description: 'User total borrowed (when filtered by user)',
    example: '1000000000',
    required: false
  })
  userTotalBorrowed?: string;

  @ApiProperty({
    description: 'User current debt (when filtered by user)',
    example: '525000000',
    required: false
  })
  userCurrentDebt?: string;

  @ApiProperty({
    description: 'Pool utilization rate (when filtered by pool)',
    example: 0.45,
    required: false
  })
  poolUtilization?: number;

  @ApiProperty({
    description: 'Pool default rate (when filtered by pool)',
    example: 0.05,
    required: false
  })
  poolDefaultRate?: number;

  @ApiProperty({
    description: 'Domain loan count (when filtered by domain)',
    example: 3,
    required: false
  })
  domainLoanCount?: number;

  @ApiProperty({
    description: 'Domain total borrowed (when filtered by domain)',
    example: '1500000000',
    required: false
  })
  domainTotalBorrowed?: string;
}

export class GetLoansResponseDto {
  @ApiProperty({
    description: 'List of loans',
    type: [LoanDto]
  })
  loans: LoanDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: 'object',
    properties: {
      total: { type: 'number', example: 50 },
      page: { type: 'number', example: 1 },
      limit: { type: 'number', example: 20 },
      totalPages: { type: 'number', example: 3 }
    }
  })
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  @ApiProperty({
    description: 'Context-aware summary',
    type: LoanSummaryDto
  })
  summary: LoanSummaryDto;
}
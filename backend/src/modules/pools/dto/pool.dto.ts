import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';

export class PoolDto {
  @ApiProperty({
    description: 'Pool ID',
    example: 'pool_12345',
  })
  poolId: string;

  @ApiProperty({
    description: 'Pool creator address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
  })
  creator: string;

  @ApiProperty({
    description: 'Minimum AI score required for loans',
    example: 70,
  })
  minAiScore: number;

  @ApiProperty({
    description: 'Interest rate for loans (in basis points)',
    example: 500,
  })
  interestRate: number;

  @ApiProperty({
    description: 'Pool creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Total liquidity in the pool',
    example: '1000000000000000000',
  })
  totalLiquidity: string;

  @ApiProperty({
    description: 'Number of unique liquidity providers',
    example: 5,
  })
  liquidityProviderCount: number;

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
    description: 'List of pools',
    type: [PoolDto],
  })
  pools: PoolDto[];

  @ApiProperty({
    description: 'Total number of pools',
    example: 50,
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
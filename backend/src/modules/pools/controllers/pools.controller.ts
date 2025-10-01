import {
  Controller,
  Get,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { ethers } from 'ethers';

import { IndexerService } from '../../indexer/indexer.service';
import {
  PoolDto,
  UserPoolDto,
  GetPoolsQueryDto,
  GetPoolsResponseDto,
  GetUserPoolsResponseDto,
  GetPoolDetailResponseDto,
  LoanDto,
  PoolHistoryEventDto
} from '../dto/pool.dto';

@ApiTags('pools')
@Controller('pools')
export class PoolsController {
  private readonly logger = new Logger(PoolsController.name);

  constructor(
    private readonly indexerService: IndexerService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all pools with filters',
    description: 'Retrieve all lending pools with optional filtering by minAiScore, status, etc.'
  })
  @ApiResponse({
    status: 200,
    description: 'Pools retrieved successfully',
    type: GetPoolsResponseDto
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getPools(@Query() query: GetPoolsQueryDto): Promise<GetPoolsResponseDto> {
    const { page = 1, limit = 20, minAiScore, status, sortBy = 'createdAt', order = 'desc' } = query;

    this.logger.log(`Getting pools: page=${page}, limit=${limit}, minAiScore=${minAiScore}, status=${status}`);

    try {
      // Get pools directly from pool table
      const poolData = await this.indexerService.queryPools({
        where: this.buildPoolWhereClause({ minAiScore, status }),
        limit: limit
      });

      const pools = await this.buildPoolObjects(poolData.pools?.items || []);

      return {
        pools,
        total: pools.length,
        page,
        limit
      };
    } catch (error) {
      this.logger.error('Failed to get pools:', error);
      throw new HttpException('Failed to fetch pools', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('user/:address')
  @ApiOperation({
    summary: 'Get pools by user participation (Portfolio Tab 3)',
    description: 'Retrieve pools where the user has provided liquidity, with participation details'
  })
  @ApiParam({
    name: 'address',
    description: 'User wallet address',
    example: '0xaba3cf48a81225de43a642ca486c1c069ec11a53'
  })
  @ApiResponse({
    status: 200,
    description: 'User pools retrieved successfully',
    type: GetUserPoolsResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid address format' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getPoolsByUser(@Param('address') address: string): Promise<GetUserPoolsResponseDto> {
    this.logger.log(`Getting pools for user: ${address}`);

    if (!ethers.isAddress(address)) {
      throw new HttpException('Invalid Ethereum address', HttpStatus.BAD_REQUEST);
    }

    try {
      // Get user's liquidity events from pool history
      const userPoolHistoryData = await this.indexerService.queryPoolHistory({
        where: { providerAddress: address, eventType_in: ["liquidity_added", "liquidity_removed"] }
      });

      const pools = await this.buildUserPoolObjects(userPoolHistoryData.poolHistorys?.items || [], address);

      const summary = {
        totalPools: pools.length,
        totalContribution: pools.reduce((sum, pool) =>
          sum + BigInt(pool.userContribution || '0'), 0n
        ).toString()
      };

      return { pools, summary };
    } catch (error) {
      this.logger.error(`Failed to get pools for user ${address}:`, error);
      throw new HttpException('Failed to fetch user pools', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':poolId')
  @ApiOperation({
    summary: 'Get pool details by ID',
    description: 'Retrieve detailed information about a specific pool, optionally including associated loans'
  })
  @ApiParam({
    name: 'poolId',
    description: 'Pool ID',
    example: 'pool_12345'
  })
  @ApiQuery({
    name: 'includeLoans',
    description: 'Whether to include loans associated with this pool',
    required: false,
    type: Boolean,
    example: false
  })
  @ApiQuery({
    name: 'includeHistory',
    description: 'Whether to include pool history events',
    required: false,
    type: Boolean,
    example: false
  })
  @ApiResponse({
    status: 200,
    description: 'Pool details retrieved successfully',
    type: GetPoolDetailResponseDto
  })
  @ApiResponse({ status: 404, description: 'Pool not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getPoolDetail(
    @Param('poolId') poolId: string,
    @Query('includeLoans') includeLoans?: string,
    @Query('includeHistory') includeHistory?: string
  ): Promise<GetPoolDetailResponseDto> {
    this.logger.log(`Getting pool detail for poolId: ${poolId}, includeLoans: ${includeLoans}, includeHistory: ${includeHistory}`);

    const shouldIncludeLoans = includeLoans === 'true';
    const shouldIncludeHistory = includeHistory === 'true';

    try {
      // Get pool from pool table
      const poolData = await this.indexerService.queryPools({
        where: { poolId },
        includeLoans: shouldIncludeLoans
      });

      const pools = poolData.pools?.items || [];
      if (pools.length === 0) {
        throw new HttpException('Pool not found', HttpStatus.NOT_FOUND);
      }

      const poolRecord = pools[0];
      const pool = await this.buildPoolObjectFromRecord(poolRecord);

      const result: GetPoolDetailResponseDto = { pool };

      // Include loans if requested (either from relations or separate query)
      if (shouldIncludeLoans) {
        if (poolRecord.loans?.items && poolRecord.loans.items.length > 0) {
          // Use loans from relations
          result.loans = this.buildLoanObjects(poolRecord.loans.items);
        } else {
          // Fallback to separate query
          const loanData = await this.indexerService.queryLoansByPool(poolId, 50);
          result.loans = this.buildLoanObjects(loanData.loans?.items || []);
        }
      }

      // Include pool history if requested
      if (shouldIncludeHistory) {
        const poolHistoryData = await this.indexerService.queryPoolHistory({
          where: { poolId },
          limit: 100 // Limit to most recent 100 events
        });
        result.poolHistory = this.buildPoolHistoryObjects(poolHistoryData.poolHistorys?.items || []);
      }

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to get pool detail for ${poolId}:`, error);
      throw new HttpException('Failed to fetch pool details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async buildPoolObjects(poolRecords: any[]): Promise<PoolDto[]> {
    const pools: PoolDto[] = poolRecords.map(record => {
      // Format timestamp to ISO string for better readability
      const createdAt = new Date(parseInt(record.createdAt)).toISOString();
      
      return {
        poolId: record.poolId,
        creator: record.creatorAddress,
        minAiScore: record.minAiScore,
        interestRate: record.interestRate,
        createdAt: createdAt,
        totalLiquidity: record.totalLiquidity || '0',
        liquidityProviderCount: record.participantCount || 0,
        activeLoans: 0, // Will be enhanced
        totalLoanVolume: '0', // Will be enhanced
        defaultRate: 0, // Will be enhanced
        status: record.status as 'active' | 'inactive'
      };
    });

    // Get additional stats for these pools
    if (pools.length > 0) {
      await this.enhancePoolsWithStats(pools);
    }

    return pools;
  }

  private async buildPoolObjectFromRecord(record: any): Promise<PoolDto> {
    const createdAt = new Date(parseInt(record.createdAt)).toISOString();
    
    const pool: PoolDto = {
      poolId: record.poolId,
      creator: record.creatorAddress,
      minAiScore: record.minAiScore,
      interestRate: record.interestRate,
      createdAt: createdAt,
      totalLiquidity: record.totalLiquidity || '0',
      liquidityProviderCount: record.participantCount || 0,
      activeLoans: 0, // Will be enhanced
      totalLoanVolume: '0', // Will be enhanced
      defaultRate: 0, // Will be enhanced
      status: record.status as 'active' | 'inactive'
    };

    // Get additional stats for this pool
    await this.enhancePoolsWithStats([pool]);

    return pool;
  }

  private async buildUserPoolObjects(userPoolEvents: any[], userAddress: string): Promise<UserPoolDto[]> {
    // Group by poolId to calculate user's net contribution
    const userPoolMap = new Map();

    userPoolEvents.forEach(event => {
      if (!userPoolMap.has(event.poolId)) {
        userPoolMap.set(event.poolId, {
          poolId: event.poolId,
          added: 0n,
          removed: 0n,
          firstContributedAt: event.eventTimestamp
        });
      }

      const poolData = userPoolMap.get(event.poolId);

      if (event.eventType === 'liquidity_added') {
        poolData.added += BigInt(event.liquidityAmount || '0');
      } else if (event.eventType === 'liquidity_removed') {
        poolData.removed += BigInt(event.liquidityAmount || '0');
      }

      // Track earliest contribution
      if (event.eventTimestamp < poolData.firstContributedAt) {
        poolData.firstContributedAt = event.eventTimestamp;
      }
    });

    // Get pool details for user's pools
    const poolIds = Array.from(userPoolMap.keys());
    if (poolIds.length === 0) {
      return [];
    }

    const poolDetailsData = await this.indexerService.queryPools({
      where: { poolId_in: poolIds }
    });

    const basePools = await this.buildPoolObjects(poolDetailsData.pools?.items || []);

    // Combine base pool data with user-specific data
    const userPools: UserPoolDto[] = basePools.map(pool => {
      const userData = userPoolMap.get(pool.poolId);
      const netContribution = userData.added - userData.removed;

      return {
        ...pool,
        userContribution: netContribution.toString(),
        userContributedAt: userData.firstContributedAt,
        userIsCreator: pool.creator.toLowerCase() === userAddress.toLowerCase()
      };
    }).filter(pool => BigInt(pool.userContribution) > 0n); // Only pools with positive contribution

    return userPools;
  }

  private async enhancePoolsWithStats(pools: PoolDto[]): Promise<void> {
    const poolIds = pools.map(p => p.poolId);

    try {
      // Get liquidity stats from pool history
      const liquidityData = await this.indexerService.queryPoolHistory({
        where: { poolId_in: poolIds, eventType_in: ["liquidity_added", "liquidity_removed"] }
      });

      // Get loan stats
      const loanData = await this.indexerService.queryPoolLoanStats(poolIds);

      // Calculate stats for each pool
      pools.forEach(pool => {
        this.calculatePoolLiquidityStats(pool, liquidityData.poolHistorys?.items || []);
        this.calculatePoolLoanStats(pool, loanData.loans?.items || []);
      });
    } catch (error) {
      this.logger.warn('Failed to enhance pools with stats, using defaults:', error);
      // Stats will remain at default values (0, '0', etc.)
    }
  }

  private calculatePoolLiquidityStats(pool: PoolDto, liquidityEvents: any[]): void {
    const poolLiquidityEvents = liquidityEvents.filter(e => e.poolId === pool.poolId);

    // totalLiquidity is already calculated and stored in the pool record
    // We just need to count unique providers
    const providers = new Set(poolLiquidityEvents.map(e => e.providerAddress).filter(addr => addr));
    
    // Add creator as a provider if they created with initial liquidity
    if (BigInt(pool.totalLiquidity || '0') > 0n) {
      providers.add(pool.creator);
    }
    
    pool.liquidityProviderCount = providers.size || pool.liquidityProviderCount;
  }

  private calculatePoolLoanStats(pool: PoolDto, loans: any[]): void {
    const poolLoans = loans.filter(loan => loan.poolId === pool.poolId);

    pool.activeLoans = poolLoans.filter(loan =>
      loan.status === 'active'
    ).length;

    pool.totalLoanVolume = poolLoans
      .reduce((sum, loan) => sum + BigInt(loan.originalAmount || '0'), 0n)
      .toString();

    const totalLoans = poolLoans.length;
    const liquidatedLoans = poolLoans.filter(loan => loan.status === 'liquidated').length;
    pool.defaultRate = totalLoans > 0 ? liquidatedLoans / totalLoans : 0;
  }

  private buildLoanObjects(loans: any[]): LoanDto[] {
    // Convert loan records to LoanDto array - these are now from the loan table, not events
    return loans.map(loan => {
      const now = Date.now();
      const deadline = loan.repaymentDeadline ? parseInt(loan.repaymentDeadline) : now + 86400000;
      const isOverdue = loan.status === 'active' && deadline < now;

      return {
        loanId: loan.loanId,
        borrowerAddress: loan.borrowerAddress,
        domainTokenId: loan.domainTokenId,
        domainName: loan.domainName,
        loanAmount: (BigInt(loan.originalAmount || '0') / BigInt(1000000)).toString(), // Convert to USDC format
        aiScore: loan.aiScore,
        interestRate: loan.interestRate,
        status: isOverdue ? 'overdue' : loan.status,
        eventType: 'loan_record', // This is now a loan record, not an event
        eventTimestamp: loan.createdAt,
        repaymentDeadline: loan.repaymentDeadline,
        poolId: loan.poolId,
        liquidationAttempted: loan.liquidationAttempted,
        liquidationTimestamp: loan.liquidationTimestamp
      };
    });
  }

  private buildPoolHistoryObjects(poolHistoryEvents: any[]): PoolHistoryEventDto[] {
    return poolHistoryEvents
      .map(event => ({
        id: event.id,
        poolId: event.poolId,
        eventType: event.eventType,
        providerAddress: event.providerAddress || undefined,
        liquidityAmount: event.liquidityAmount || undefined,
        minAiScore: event.minAiScore || undefined,
        interestRate: event.interestRate || undefined,
        eventTimestamp: new Date(parseInt(event.eventTimestamp)).toISOString(),
        blockNumber: event.blockNumber?.toString() || '0',
        transactionHash: event.transactionHash
      }))
      .sort((a, b) => new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime()); // Most recent first
  }

  private buildPoolWhereClause(filters: { minAiScore?: number; status?: string }): any {
    const where: any = {};

    if (filters.minAiScore !== undefined) {
      where.minAiScore_gte = filters.minAiScore;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    return where;
  }
}
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
  LoanDto
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
      // Get pool creation events
      const poolData = await this.indexerService.queryPools({
        where: this.buildPoolWhereClause({ minAiScore, status }),
        limit: limit
      });

      const pools = await this.buildPoolObjects(poolData.poolEvents?.items || []);

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
      // Get user's liquidity events
      const userPoolData = await this.indexerService.queryPools({
        where: { providerAddress: address, eventType_in: ["liquidity_added", "liquidity_removed"] }
      });

      const pools = await this.buildUserPoolObjects(userPoolData.poolEvents?.items || [], address);

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
  @ApiResponse({
    status: 200,
    description: 'Pool details retrieved successfully',
    type: GetPoolDetailResponseDto
  })
  @ApiResponse({ status: 404, description: 'Pool not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getPoolDetail(
    @Param('poolId') poolId: string,
    @Query('includeLoans') includeLoans?: string
  ): Promise<GetPoolDetailResponseDto> {
    this.logger.log(`Getting pool detail for poolId: ${poolId}, includeLoans: ${includeLoans}`);

    const shouldIncludeLoans = includeLoans === 'true';

    try {
      // Get pool creation event
      const poolData = await this.indexerService.queryPools({
        where: { eventType: "created", poolId },
        includeLoans: shouldIncludeLoans
      });

      const poolEvents = poolData.poolEvents?.items || [];
      if (poolEvents.length === 0) {
        throw new HttpException('Pool not found', HttpStatus.NOT_FOUND);
      }


      const pools = await this.buildPoolObjects(poolEvents);
      if (pools.length === 0) {
        throw new HttpException('Pool not found', HttpStatus.NOT_FOUND);
      }

      const result: GetPoolDetailResponseDto = { pool: pools[0] };

      // Include loans if requested (either from relations or separate query)
      if (shouldIncludeLoans) {
        const poolEvent = poolEvents[0];
        if (poolEvent.loans?.items && poolEvent.loans.items.length > 0) {
          // Use loans from relations
          result.loans = this.buildLoanObjects(poolEvent.loans.items);
        } else {
          // Fallback to separate query
          const loanData = await this.indexerService.queryLoansByPool(poolId, 50);
          result.loans = this.buildLoanObjects(loanData.loanEvents?.items || []);
        }
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

  private async buildPoolObjects(poolEvents: any[]): Promise<PoolDto[]> {
    // Group by poolId to get unique pools
    const poolMap = new Map();

    poolEvents.forEach(event => {
      if (event.eventType === 'created' && !poolMap.has(event.poolId)) {
        // Format timestamp to ISO string for better readability
        const createdAt = new Date(parseInt(event.eventTimestamp)).toISOString();
        
        // Handle liquidityAmount properly - it should be a string but might be null
        const liquidityAmount = event.liquidityAmount || '0';
        
        poolMap.set(event.poolId, {
          poolId: event.poolId,
          creator: event.creatorAddress,
          minAiScore: event.minAiScore,
          interestRate: event.interestRate,
          createdAt: createdAt,
          // Use initial liquidity from creation event if available
          totalLiquidity: liquidityAmount,
          liquidityProviderCount: liquidityAmount && liquidityAmount !== '0' ? 1 : 0,
          activeLoans: 0,
          totalLoanVolume: '0',
          defaultRate: 0,
          status: 'active' as const
        });
      }
    });

    const pools = Array.from(poolMap.values()) as PoolDto[];

    // Get additional stats for these pools
    if (pools.length > 0) {
      await this.enhancePoolsWithStats(pools);
    }

    return pools;
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
      where: { eventType: "created", poolId_in: poolIds }
    });

    const basePools = await this.buildPoolObjects(poolDetailsData.poolEvents?.items || []);

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
      // Get liquidity stats
      const liquidityData = await this.indexerService.queryPools({
        where: { poolId_in: poolIds, eventType_in: ["liquidity_added", "liquidity_removed"] }
      });

      // Get loan stats
      const loanData = await this.indexerService.queryPoolLoanStats(poolIds);

      // Calculate stats for each pool
      pools.forEach(pool => {
        this.calculatePoolLiquidityStats(pool, liquidityData.poolEvents?.items || []);
        this.calculatePoolLoanStats(pool, loanData.loanEvents?.items || []);
      });
    } catch (error) {
      this.logger.warn('Failed to enhance pools with stats, using defaults:', error);
      // Stats will remain at default values (0, '0', etc.)
    }
  }

  private calculatePoolLiquidityStats(pool: PoolDto, liquidityEvents: any[]): void {
    const poolLiquidityEvents = liquidityEvents.filter(e => e.poolId === pool.poolId);

    const added: bigint = poolLiquidityEvents
      .filter(e => e.eventType === 'liquidity_added')
      .reduce((sum: bigint, e) => sum + BigInt(e.liquidityAmount || '0'), 0n);

    const removed: bigint = poolLiquidityEvents
      .filter(e => e.eventType === 'liquidity_removed')
      .reduce((sum: bigint, e) => sum + BigInt(e.liquidityAmount || '0'), 0n);

    // Include initial liquidity from pool creation (which is already set in buildPoolObjects)
    const initialLiquidity: bigint = BigInt(pool.totalLiquidity || '0');
    const netLiquidityChanges: bigint = added - removed;
    
    const finalLiquidity: bigint = initialLiquidity + netLiquidityChanges;
    
    
    pool.totalLiquidity = finalLiquidity.toString();
    
    // Count unique providers (including creator if there's initial liquidity)
    const providers = new Set(poolLiquidityEvents.map(e => e.providerAddress).filter(addr => addr));
    if (initialLiquidity > 0n) {
      providers.add(pool.creator); // Add creator as initial liquidity provider
    }
    pool.liquidityProviderCount = providers.size;
  }

  private calculatePoolLoanStats(pool: PoolDto, loanEvents: any[]): void {
    const poolLoans = loanEvents.filter(e => e.poolId === pool.poolId);

    pool.activeLoans = poolLoans.filter(e =>
      !['repaid_full', 'liquidated'].includes(e.eventType)
    ).length;

    pool.totalLoanVolume = poolLoans
      .reduce((sum, e) => sum + BigInt(e.loanAmount || '0'), 0n)
      .toString();

    const totalLoans = poolLoans.length;
    const defaultedLoans = poolLoans.filter(e => e.eventType === 'defaulted').length;
    pool.defaultRate = totalLoans > 0 ? defaultedLoans / totalLoans : 0;
  }

  private buildLoanObjects(loanEvents: any[]): LoanDto[] {
    // Group events by loanId and keep the latest event for each loan
    const loanMap = new Map();
    
    loanEvents.forEach(event => {
      const existingEvent = loanMap.get(event.loanId);
      
      // Keep the event with the latest timestamp, or if timestamps are equal, prefer events with aiScore
      if (!existingEvent || 
          parseInt(event.eventTimestamp) > parseInt(existingEvent.eventTimestamp) ||
          (parseInt(event.eventTimestamp) === parseInt(existingEvent.eventTimestamp) && event.aiScore && !existingEvent.aiScore)) {
        loanMap.set(event.loanId, event);
      }
    });
    
    // Convert map values to LoanDto array
    return Array.from(loanMap.values()).map(event => ({
      loanId: event.loanId,
      borrowerAddress: event.borrowerAddress,
      domainTokenId: event.domainTokenId,
      domainName: event.domainName,
      loanAmount: event.loanAmount,
      aiScore: event.aiScore,
      interestRate: event.interestRate,
      eventType: event.eventType,
      eventTimestamp: event.eventTimestamp,
      repaymentDeadline: event.repaymentDeadline,
      poolId: event.poolId,
      liquidationAttempted: event.liquidationAttempted,
      liquidationTimestamp: event.liquidationTimestamp
    }));
  }

  private buildPoolWhereClause(filters: { minAiScore?: number; status?: string }): any {
    const where: any = { eventType: "created" };

    if (filters.minAiScore !== undefined) {
      where.minAiScore_gte = filters.minAiScore;
    }

    // Note: status filtering would need additional logic based on pool activity
    // For now, we assume all created pools are active

    return where;
  }
}
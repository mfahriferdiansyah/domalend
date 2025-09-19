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
  GetUserPoolsResponseDto
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

      const pools = await this.buildConsistentPoolObjects(poolData.poolEvents?.items || []);

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
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'
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

  private async buildConsistentPoolObjects(poolEvents: any[]): Promise<PoolDto[]> {
    // Group by poolId to get unique pools
    const poolMap = new Map();

    poolEvents.forEach(event => {
      if (event.eventType === 'created' && !poolMap.has(event.poolId)) {
        poolMap.set(event.poolId, {
          poolId: event.poolId,
          creator: event.creatorAddress,
          minAiScore: event.minAiScore,
          interestRate: event.interestRate,
          createdAt: event.eventTimestamp,
          // Initialize calculated fields
          totalLiquidity: '0',
          liquidityProviderCount: 0,
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

    const basePools = await this.buildConsistentPoolObjects(poolDetailsData.poolEvents?.items || []);

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

    const added = poolLiquidityEvents
      .filter(e => e.eventType === 'liquidity_added')
      .reduce((sum, e) => sum + BigInt(e.liquidityAmount || '0'), 0n);

    const removed = poolLiquidityEvents
      .filter(e => e.eventType === 'liquidity_removed')
      .reduce((sum, e) => sum + BigInt(e.liquidityAmount || '0'), 0n);

    pool.totalLiquidity = (added - removed).toString();
    pool.liquidityProviderCount = new Set(poolLiquidityEvents.map(e => e.providerAddress)).size;
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
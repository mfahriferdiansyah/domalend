import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { ethers } from 'ethers';

import { EnhancedDomainDto } from '../../domain/dto/domain.dto';
import { DomaNftService } from '../../domain/services/doma-nft.service';
import { DomainScoreCacheService } from '../../domain/services/domain-score-cache.service';
import { IndexerService } from '../../indexer/indexer.service';
import {
  AuctionOpportunityDto,
  DashboardStatsDto,
  DomainNFTDto,
  GetUserDashboardResponseDto,
  LiquidityPositionDto,
  RecentActivityDto,
  UserDashboardDto,
  UserLoanDto
} from '../dto/dashboard.dto';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(
    private readonly indexerService: IndexerService,
    private readonly domaNftService: DomaNftService,
    private readonly domainScoreCacheService: DomainScoreCacheService
  ) {}

  @Get('user/:address')
  @ApiOperation({
    summary: 'Get user dashboard data',
    description: 'Retrieve comprehensive dashboard data for a user including portfolio stats, active loans, liquidity positions, auction opportunities, and recent activity'
  })
  @ApiParam({
    name: 'address',
    description: 'User wallet address',
    example: '0xaba3cf48a81225de43a642ca486c1c069ec11a53'
  })
  @ApiResponse({
    status: 200,
    description: 'User dashboard data retrieved successfully',
    type: GetUserDashboardResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid address format' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getUserDashboard(@Param('address') address: string): Promise<GetUserDashboardResponseDto> {
    this.logger.log(`Getting dashboard data for user: ${address}`);

    if (!ethers.isAddress(address)) {
      throw new HttpException('Invalid Ethereum address', HttpStatus.BAD_REQUEST);
    }

    try {
      // Get all user data from indexer
      const dashboardData = await this.indexerService.queryUserDashboardData(address);

      // Get user domains/NFTs from Doma contract
      const userDomainsData = await this.domaNftService.getNFTBalanceForAddress(address);

      // Get user scored domains with enhanced data
      const userScoredDomains = await this.buildScoredDomains(userDomainsData.ownedNFTs || []);

      // Build dashboard components
      const stats = await this.buildDashboardStats(dashboardData, address);
      const userLoans = this.buildUserLoans(dashboardData.userLoans?.items || []);
      const liquidityPositions = this.buildLiquidityPositions(dashboardData.userPoolHistory?.items || []);
      const auctionOpportunities = this.buildAuctionOpportunities(dashboardData.recentAuctions?.items || []);
      const recentActivity = this.buildRecentActivity(
        dashboardData.userLoans?.items || [],
        dashboardData.userPoolHistory?.items || [],
        dashboardData.userAuctions?.items || []
      );
      const ownedNFTs = this.buildOwnedNFTs(userDomainsData.ownedNFTs || []);
      const scoredDomains = userScoredDomains;

      const dashboard: UserDashboardDto = {
        stats,
        userLoans,
        liquidityPositions,
        auctionOpportunities,
        recentActivity,
        ownedNFTs,
        scoredDomains
      };

      return { dashboard };
    } catch (error) {
      this.logger.error(`Failed to get dashboard data for user ${address}:`, error);
      throw new HttpException('Failed to fetch dashboard data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async buildDashboardStats(dashboardData: any, userAddress: string): Promise<DashboardStatsDto> {
    const userLoans = dashboardData.userLoans?.items || [];
    const userPoolEvents = dashboardData.userPoolHistory?.items || [];
    const userAuctions = dashboardData.userAuctions?.items || [];

    // Calculate active loans - now simply filter by status
    const activeLoans = userLoans.filter(loan => loan.status === 'active');
    const activeLoansValue = activeLoans.reduce((sum, loan) => 
      sum + BigInt(loan.originalAmount || '0'), BigInt(0)
    );

    // Calculate liquidity provided
    const liquidityEvents = userPoolEvents.filter(event => 
      event.eventType === 'liquidity_added' && 
      event.providerAddress?.toLowerCase() === userAddress.toLowerCase()
    );
    const totalLiquidity = liquidityEvents.reduce((sum, event) => 
      sum + BigInt(event.liquidityAmount || '0'), BigInt(0)
    );

    // Calculate portfolio value (loans + liquidity)
    const totalPortfolio = activeLoansValue + totalLiquidity;

    // Calculate earnings (simplified - would need more complex calculation in production)
    const completedLoans = userLoans.filter(loan => loan.status === 'repaid');
    const estimatedEarnings = BigInt(completedLoans.length) * BigInt('100000000'); // 100 USDC per completed loan estimate

    // Count unique pools
    const uniquePools = new Set(liquidityEvents.map(event => event.poolId));

    return {
      totalPortfolio: (totalPortfolio / BigInt(1000000)).toString(), // Convert from wei to USDC
      // portfolioChangePercent: undefined, // Would need historical data tracking
      activeLoansCount: activeLoans.length,
      activeLoansValue: (activeLoansValue / BigInt(1000000)).toString(),
      liquidityProvided: (totalLiquidity / BigInt(1000000)).toString(),
      liquidityPoolsCount: uniquePools.size,
      totalEarnings: (estimatedEarnings / BigInt(1000000)).toString()
    };
  }

  private buildUserLoans(loans: any[]): UserLoanDto[] {
    // Return all loans with their status - let frontend handle filtering/display
    return loans.slice(0, 10).map(loan => {
      const repaymentDate = loan.repaymentDeadline ? 
        new Date(parseInt(loan.repaymentDeadline)).toLocaleDateString() : 
        'N/A';
      
      const now = Date.now();
      const deadline = loan.repaymentDeadline ? parseInt(loan.repaymentDeadline) : now + 86400000;
      const isOverdue = loan.status === 'active' && deadline < now;

      return {
        loanId: loan.loanId,
        domainName: loan.domainName || `Token #${loan.domainTokenId}`,
        domainTokenId: loan.domainTokenId,
        loanAmount: (BigInt(loan.originalAmount || '0') / BigInt(1000000)).toString(),
        originalAmount: loan.originalAmount,
        currentBalance: loan.currentBalance || loan.originalAmount,
        totalRepaid: loan.totalRepaid || '0',
        repaymentDate: repaymentDate,
        status: isOverdue ? 'overdue' : loan.status,
        aiScore: loan.aiScore,
        interestRate: loan.interestRate,
        poolId: loan.poolId,
        createdAt: loan.createdAt,
        liquidationAttempted: loan.liquidationAttempted,
        liquidationTimestamp: loan.liquidationTimestamp
      };
    });
  }

  private buildLiquidityPositions(poolEvents: any[]): LiquidityPositionDto[] {
    // Group by poolId and calculate net liquidity
    const poolPositions = new Map();
    
    poolEvents.forEach(event => {
      if (!poolPositions.has(event.poolId)) {
        poolPositions.set(event.poolId, {
          poolId: event.poolId,
          totalLiquidity: BigInt(0),
          interestRate: event.interestRate || 0,
          events: []
        });
      }
      
      const position = poolPositions.get(event.poolId);
      if (event.eventType === 'liquidity_added') {
        position.totalLiquidity += BigInt(event.liquidityAmount || '0');
      } else if (event.eventType === 'liquidity_removed') {
        position.totalLiquidity -= BigInt(event.liquidityAmount || '0');
      }
      position.events.push(event);
    });

    return Array.from(poolPositions.values())
      .filter(position => position.totalLiquidity > BigInt(0))
      .slice(0, 5)
      .map(position => {
        const apy = position.interestRate ? (position.interestRate / 100).toFixed(1) : '0.0';
        const contribution = (position.totalLiquidity / BigInt(1000000)).toString();
        const estimatedEarnings = (position.totalLiquidity * BigInt(Math.floor(position.interestRate || 0)) / BigInt(10000)).toString();

        return {
          poolName: `Pool ${position.poolId.slice(0, 8)}...`,
          poolId: position.poolId,
          apy: `${apy}%`,
          contribution,
          earnings: (BigInt(estimatedEarnings) / BigInt(1000000)).toString()
        };
      });
  }

  private buildAuctionOpportunities(auctions: any[]): AuctionOpportunityDto[] {
    const activeAuctions = auctions.filter(auction => auction.status === 'active');

    return activeAuctions.slice(0, 5).map(auction => {
      const currentPrice = BigInt(auction.currentPrice || auction.startingPrice || '0');
      const startingPrice = BigInt(auction.startingPrice || '0');
      const belowEstimate = startingPrice > BigInt(0) ? 
        ((startingPrice - currentPrice) * BigInt(100) / startingPrice).toString() : '0';

      const endTime = auction.endedAt ? new Date(auction.endedAt) : new Date(Date.now() + 48 * 60 * 60 * 1000);
      const timeRemaining = this.calculateTimeRemaining(endTime);

      return {
        domainName: auction.domainName || `Token #${auction.domainTokenId}`,
        currentBid: (currentPrice / BigInt(1000000)).toString(),
        estimatedValue: (startingPrice / BigInt(1000000)).toString(),
        timeRemaining,
        belowEstimatePercent: belowEstimate
      };
    });
  }

  private buildRecentActivity(loans: any[], poolEvents: any[], auctions: any[]): RecentActivityDto[] {
    const activities: RecentActivityDto[] = [];

    // Add loan activities
    loans.slice(0, 3).forEach(loan => {
      const date = new Date(parseInt(loan.createdAt)).toLocaleDateString();
      const amount = (BigInt(loan.originalAmount || '0') / BigInt(1000000)).toString();
      
      if (loan.status === 'repaid') {
        activities.push({
          type: 'loan_payment',
          description: `Loan payment for ${loan.domainName || 'domain'}`,
          date,
          amount
        });
      } else if (loan.status === 'active') {
        activities.push({
          type: 'new_loan',
          description: `New loan for ${loan.domainName || 'domain'}`,
          date,
          amount
        });
      }
    });

    // Add pool activities
    poolEvents.slice(0, 2).forEach(event => {
      if (event.eventType === 'liquidity_added') {
        const date = new Date(parseInt(event.eventTimestamp)).toLocaleDateString();
        const amount = (BigInt(event.liquidityAmount || '0') / BigInt(1000000)).toString();
        
        activities.push({
          type: 'liquidity_added',
          description: `Added liquidity to pool`,
          date,
          amount
        });
      }
    });

    // Sort by timestamp (most recent first)
    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }

  private buildOwnedNFTs(domains: any[]): DomainNFTDto[] {
    return domains.map(domain => ({
      tokenId: domain.tokenId,
      name: domain.name || `Domain #${domain.tokenId}`,
      owner: domain.owner,
      metadata: domain.metadata
    }));
  }

  private calculateTimeRemaining(endTime: Date): string {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `Ends in ${days}d`;
    } else {
      return `Ends in ${hours}h`;
    }
  }

  private async buildScoredDomains(domains: any[]): Promise<EnhancedDomainDto[]> {
    const enhancedDomains: EnhancedDomainDto[] = [];

    for (const domain of domains) {
      const enhancedDomain: EnhancedDomainDto = {
        ...domain,
        loanHistory: {
          totalLoans: 0,
          totalBorrowed: '0',
          currentlyCollateralized: false,
          averageLoanAmount: '0',
          successfulRepayments: 0,
          liquidations: 0
        }
      };

      // Add AI score if available
      try {
        const scoreData = await this.domainScoreCacheService.getDomainScore(domain.name);
        if (scoreData) {
          enhancedDomain.aiScore = {
            score: scoreData.totalScore,
            confidence: scoreData.confidence,
            lastUpdated: new Date().toISOString(),
            factors: {
              age: Math.round(scoreData.totalScore * 0.2),
              extension: Math.round(scoreData.totalScore * 0.15),
              length: Math.round(scoreData.totalScore * 0.1),
              keywords: Math.round(scoreData.totalScore * 0.25),
              traffic: Math.round(scoreData.totalScore * 0.3)
            }
          };
        }
      } catch (error) {
        this.logger.warn(`Failed to get AI score for domain ${domain.name}:`, error.message);
      }

      enhancedDomains.push(enhancedDomain);
    }

    return enhancedDomains;
  }
}
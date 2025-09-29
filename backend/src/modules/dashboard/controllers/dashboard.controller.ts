import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam
} from '@nestjs/swagger';
import { ethers } from 'ethers';

import { IndexerService } from '../../indexer/indexer.service';
import {
  UserDashboardDto,
  GetUserDashboardResponseDto,
  DashboardStatsDto,
  ActiveLoanDto,
  LiquidityPositionDto,
  AuctionOpportunityDto,
  RecentActivityDto
} from '../dto/dashboard.dto';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(
    private readonly indexerService: IndexerService
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

      // Build dashboard components
      const stats = await this.buildDashboardStats(dashboardData, address);
      const activeLoans = this.buildActiveLoans(dashboardData.userLoans?.items || []);
      const liquidityPositions = this.buildLiquidityPositions(dashboardData.userPoolEvents?.items || []);
      const auctionOpportunities = this.buildAuctionOpportunities(dashboardData.recentAuctions?.items || []);
      const recentActivity = this.buildRecentActivity(
        dashboardData.userLoans?.items || [],
        dashboardData.userPoolEvents?.items || [],
        dashboardData.userAuctions?.items || []
      );

      const dashboard: UserDashboardDto = {
        stats,
        activeLoans,
        liquidityPositions,
        auctionOpportunities,
        recentActivity
      };

      return { dashboard };
    } catch (error) {
      this.logger.error(`Failed to get dashboard data for user ${address}:`, error);
      throw new HttpException('Failed to fetch dashboard data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async buildDashboardStats(dashboardData: any, userAddress: string): Promise<DashboardStatsDto> {
    const userLoans = dashboardData.userLoans?.items || [];
    const userPoolEvents = dashboardData.userPoolEvents?.items || [];
    const userAuctions = dashboardData.userAuctions?.items || [];

    // Calculate active loans using the same logic as buildActiveLoans
    const loansByLoanId = new Map();
    userLoans.forEach(loan => {
      const loanId = loan.loanId;
      if (!loansByLoanId.has(loanId)) {
        loansByLoanId.set(loanId, []);
      }
      loansByLoanId.get(loanId).push(loan);
    });

    const activeLoans: any[] = [];
    loansByLoanId.forEach((loanEvents, loanId) => {
      const sortedEvents = loanEvents.sort((a, b) => 
        parseInt(b.eventTimestamp) - parseInt(a.eventTimestamp)
      );
      
      const hasRepaidFull = sortedEvents.some(e => e.eventType === 'repaid_full');
      const hasCollateralReleased = sortedEvents.some(e => e.eventType === 'collateral_released');
      const hasLiquidated = sortedEvents.some(e => e.eventType === 'liquidated');
      
      if (!hasRepaidFull && !hasCollateralReleased && !hasLiquidated) {
        const creationEvent = sortedEvents.find(e => 
          e.eventType === 'created' || e.eventType === 'created_instant'
        );
        if (creationEvent) {
          activeLoans.push(creationEvent);
        }
      }
    });
    const activeLoansValue = activeLoans.reduce((sum, loan) => 
      sum + BigInt(loan.loanAmount || '0'), BigInt(0)
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
    const completedLoans = userLoans.filter(loan => loan.eventType === 'repaid');
    const estimatedEarnings = BigInt(completedLoans.length) * BigInt('100000000'); // 100 USDC per completed loan estimate

    // Count unique pools
    const uniquePools = new Set(liquidityEvents.map(event => event.poolId));

    return {
      totalPortfolio: (totalPortfolio / BigInt(1000000)).toString(), // Convert from wei to USDC
      portfolioChangePercent: '12.3', // Mock data - would need historical data
      activeLoansCount: activeLoans.length,
      activeLoansValue: (activeLoansValue / BigInt(1000000)).toString(),
      liquidityProvided: (totalLiquidity / BigInt(1000000)).toString(),
      liquidityPoolsCount: uniquePools.size,
      totalEarnings: (estimatedEarnings / BigInt(1000000)).toString()
    };
  }

  private buildActiveLoans(loans: any[]): ActiveLoanDto[] {
    // Group loans by loanId to get the latest status for each loan
    const loansByLoanId = new Map();
    
    loans.forEach(loan => {
      const loanId = loan.loanId;
      if (!loansByLoanId.has(loanId)) {
        loansByLoanId.set(loanId, []);
      }
      loansByLoanId.get(loanId).push(loan);
    });

    const activeLoans: any[] = [];
    
    // For each loan, check if it's still active
    loansByLoanId.forEach((loanEvents, loanId) => {
      // Sort by timestamp to get latest events
      const sortedEvents = loanEvents.sort((a, b) => 
        parseInt(b.eventTimestamp) - parseInt(a.eventTimestamp)
      );
      
      // Check if loan is still active (not repaid, liquidated, or collateral released)
      const hasRepaidFull = sortedEvents.some(e => e.eventType === 'repaid_full');
      const hasCollateralReleased = sortedEvents.some(e => e.eventType === 'collateral_released');
      const hasLiquidated = sortedEvents.some(e => e.eventType === 'liquidated');
      
      // If none of these final events occurred, the loan is still active
      if (!hasRepaidFull && !hasCollateralReleased && !hasLiquidated) {
        // Find the creation event for this loan
        const creationEvent = sortedEvents.find(e => 
          e.eventType === 'created' || e.eventType === 'created_instant'
        );
        if (creationEvent) {
          activeLoans.push(creationEvent);
        }
      }
    });

    return activeLoans.slice(0, 5).map(loan => {
      const repaymentDate = loan.repaymentDeadline ? 
        new Date(parseInt(loan.repaymentDeadline)).toLocaleDateString() : 
        'N/A';
      
      const now = Date.now();
      const deadline = loan.repaymentDeadline ? parseInt(loan.repaymentDeadline) : now + 86400000;
      const isOverdue = deadline < now;

      return {
        domainName: loan.domainName || `Token #${loan.domainTokenId}`,
        loanAmount: (BigInt(loan.loanAmount || '0') / BigInt(1000000)).toString(),
        nextPaymentDate: repaymentDate,
        status: isOverdue ? 'overdue' : 'active'
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
      const date = new Date(parseInt(loan.eventTimestamp)).toLocaleDateString();
      const amount = (BigInt(loan.loanAmount || '0') / BigInt(1000000)).toString();
      
      if (loan.eventType === 'repaid') {
        activities.push({
          type: 'loan_payment',
          description: `Loan payment for ${loan.domainName || 'domain'}`,
          date,
          amount
        });
      } else if (loan.eventType === 'created') {
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
}
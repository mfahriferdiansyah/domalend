import { Controller, Get, Query, Param, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IndexerService } from '../../indexer/indexer.service';
import { DomaNftService } from '../../domain/services/doma-nft.service';
import { DomainScoreCacheService } from '../../domain/services/domain-score-cache.service';
import {
  LoanDto,
  LoanDetailDto,
  GetLoansQueryDto,
  GetLoansResponseDto,
  LoanSummaryDto,
  LoanDomainDto
} from '../dto/loan.dto';

@ApiTags('loans')
@Controller('loans')
export class LoansController {
  private readonly logger = new Logger(LoansController.name);

  constructor(
    private readonly indexerService: IndexerService,
    private readonly domaNftService: DomaNftService,
    private readonly domainScoreCacheService: DomainScoreCacheService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get loans with flexible filtering' })
  @ApiResponse({
    status: 200,
    description: 'List of loans with pagination and context-aware summary',
    type: GetLoansResponseDto,
  })
  async getLoans(@Query() query: GetLoansQueryDto): Promise<GetLoansResponseDto> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 20;
      const offset = (page - 1) * limit;

      // Build GraphQL where clause based on filters
      const where: any = {};

      if (query.borrower) {
        where.borrowerAddress = query.borrower.toLowerCase();
      }

      if (query.domainTokenId) {
        where.domainTokenId = query.domainTokenId;
      }

      if (query.poolId) {
        where.poolId = query.poolId;
      }

      // Query all loan events with filters
      const loanEventsData = await this.indexerService.queryLoans({
        where,
        limit: 1000, // Get more to group by loanId
      });

      const loanEvents = loanEventsData.loanEvents?.items || [];

      // Group events by loanId to build complete loan lifecycle
      const loansByIdMap = this.groupEventsByLoanId(loanEvents);

      // Build loan objects from grouped events
      const allLoans = await this.buildLoansFromEventGroups(loansByIdMap);

      // Filter by calculated status if specified
      let filteredLoans = allLoans;
      if (query.status) {
        filteredLoans = allLoans.filter(loan => loan.status === query.status);
      }

      // Sort loans
      const sortedLoans = this.sortLoans(filteredLoans, query.sortBy, query.order);

      // Paginate
      const paginatedLoans = sortedLoans.slice(offset, offset + limit);

      // Build context-aware summary
      const summary = this.buildSummary(filteredLoans, query);

      return {
        loans: paginatedLoans,
        pagination: {
          total: filteredLoans.length,
          page,
          limit,
          totalPages: Math.ceil(filteredLoans.length / limit),
        },
        summary,
      };
    } catch (error) {
      this.logger.error('Failed to get loans', error);
      throw new HttpException('Failed to fetch loans', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':loanId')
  @ApiOperation({ summary: 'Get detailed loan information' })
  @ApiResponse({
    status: 200,
    description: 'Detailed loan with event history',
    type: LoanDetailDto,
  })
  async getLoanDetails(@Param('loanId') loanId: string): Promise<LoanDetailDto> {
    try {
      // Query all events for this specific loan
      const loanEventsData = await this.indexerService.queryLoans({
        where: { loanId },
        limit: 100,
      });

      const loanEvents = loanEventsData.loanEvents?.items || [];

      if (loanEvents.length === 0) {
        throw new HttpException('Loan not found', HttpStatus.NOT_FOUND);
      }

      // Group events by loanId (will only have one group)
      const loansByIdMap = this.groupEventsByLoanId(loanEvents);
      const loans = await this.buildLoansFromEventGroups(loansByIdMap);

      if (loans.length === 0) {
        throw new HttpException('Loan not found', HttpStatus.NOT_FOUND);
      }

      const loan = loans[0] as LoanDetailDto;

      // Add event history
      loan.events = loanEvents.map(event => ({
        type: event.eventType,
        timestamp: this.formatTimestamp(event.eventTimestamp),
        details: {
          amount: event.loanAmount,
          aiScore: event.aiScore,
          poolId: event.poolId,
        }
      }));

      return loan;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to get loan details for ${loanId}`, error);
      throw new HttpException('Failed to fetch loan details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private groupEventsByLoanId(events: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();

    for (const event of events) {
      const loanId = event.loanId;
      if (!grouped.has(loanId)) {
        grouped.set(loanId, []);
      }
      grouped.get(loanId)!.push(event);
    }

    return grouped;
  }

  private async buildLoansFromEventGroups(groupedEvents: Map<string, any[]>): Promise<LoanDto[]> {
    const loans: LoanDto[] = [];

    for (const [loanId, events] of groupedEvents) {
      // Sort events by timestamp to get chronological order
      events.sort((a, b) => {
        const timeA = this.parseTimestamp(a.eventTimestamp);
        const timeB = this.parseTimestamp(b.eventTimestamp);
        return timeA - timeB;
      });

      // Get the creation event (first event)
      const creationEvent = events.find(e =>
        e.eventType === 'created_instant' || e.eventType === 'created_crowdfunded'
      );

      if (!creationEvent) {
        this.logger.warn(`No creation event found for loan ${loanId}`);
        continue;
      }

      // Get the latest event for status
      const latestEvent = events[events.length - 1];

      // Build loan object
      const loan: LoanDto = {
        loanId: loanId,
        borrowerAddress: creationEvent.borrowerAddress?.toLowerCase() || '',
        status: this.calculateStatus(events, creationEvent.repaymentDeadline),
        principalAmount: creationEvent.loanAmount || '0',
        interestRate: this.extractInterestRate(creationEvent),
        interestAccrued: '0', // Will calculate below
        currentAmountDue: '0', // Will calculate below
        createdAt: this.formatTimestamp(creationEvent.eventTimestamp),
        repaymentDeadline: this.formatTimestamp(creationEvent.repaymentDeadline),
        daysUntilDeadline: this.calculateDaysUntilDeadline(creationEvent.repaymentDeadline),
        poolId: creationEvent.poolId || '',
        domain: {
          tokenId: creationEvent.domainTokenId || '',
          name: creationEvent.domainName || '',
          aiScore: creationEvent.aiScore || 0,
        },
        healthScore: 0, // Will calculate below
        loanType: creationEvent.eventType === 'created_instant' ? 'instant' : 'crowdfunded',
      };

      // Calculate interest accrued
      loan.interestAccrued = this.calculateInterestAccrued(loan);
      loan.currentAmountDue = this.calculateCurrentAmountDue(loan);
      loan.healthScore = this.calculateHealthScore(loan);

      // Try to enrich domain data
      if (loan.domain.tokenId) {
        try {
          const domainMetadata = await this.domaNftService.getNFTByTokenId(loan.domain.tokenId);
          if (domainMetadata && domainMetadata.name) {
            loan.domain.name = domainMetadata.name;
          }

          const domainScore = await this.domainScoreCacheService.getDomainScore(loan.domain.name || loan.domain.tokenId);
          if (domainScore) {
            loan.domain.aiScore = domainScore.totalScore;
          }
        } catch (error) {
          this.logger.warn(`Failed to enrich domain data for loan ${loanId}`, error);
        }
      }

      loans.push(loan);
    }

    return loans;
  }

  private calculateStatus(events: any[], repaymentDeadline: string): LoanDto['status'] {
    // Check for terminal events
    const hasRepaid = events.some(e => e.eventType === 'repaid_full');
    const hasLiquidated = events.some(e => e.eventType === 'liquidated');
    const hasReleased = events.some(e => e.eventType === 'collateral_released');

    if (hasRepaid) return 'repaid';
    if (hasLiquidated) return 'liquidated';
    if (hasReleased) return 'released';

    // Check if overdue
    const deadline = this.parseTimestamp(repaymentDeadline);
    const now = Date.now();

    if (now > deadline) return 'overdue';

    return 'active';
  }

  private calculateInterestAccrued(loan: LoanDto): string {
    // Skip interest for non-active loans
    if (loan.status !== 'active' && loan.status !== 'overdue') {
      return '0';
    }

    const principal = BigInt(loan.principalAmount);
    const rate = BigInt(loan.interestRate); // basis points
    const created = new Date(loan.createdAt).getTime();
    const now = Date.now();
    const daysElapsed = Math.floor((now - created) / (1000 * 60 * 60 * 24));

    // Simple interest: principal * rate * time / (10000 * 365)
    const interest = (principal * rate * BigInt(daysElapsed)) / (BigInt(10000) * BigInt(365));

    return interest.toString();
  }

  private calculateCurrentAmountDue(loan: LoanDto): string {
    const principal = BigInt(loan.principalAmount);
    const interest = BigInt(loan.interestAccrued);
    return (principal + interest).toString();
  }

  private calculateHealthScore(loan: LoanDto): number {
    // Health based on days remaining and status
    if (loan.status === 'repaid' || loan.status === 'released') return 100;
    if (loan.status === 'liquidated') return 0;
    if (loan.status === 'overdue') return 25;

    // For active loans, base on days remaining
    const days = loan.daysUntilDeadline;
    if (days > 30) return 100;
    if (days > 14) return 85;
    if (days > 7) return 70;
    if (days > 3) return 50;
    if (days > 0) return 35;
    return 25;
  }

  private calculateDaysUntilDeadline(repaymentDeadline: string): number {
    const deadline = this.parseTimestamp(repaymentDeadline);
    const now = Date.now();
    const diff = deadline - now;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private extractInterestRate(event: any): number {
    // TODO: Get from pool data or event details
    // Default to 5% (500 basis points) for now
    return 500;
  }

  private buildSummary(loans: LoanDto[], query: GetLoansQueryDto): LoanSummaryDto {
    const summary: LoanSummaryDto = {
      totalLoans: loans.length,
      activeLoans: loans.filter(l => l.status === 'active').length,
      totalVolume: this.sumAmounts(loans.map(l => l.principalAmount)),
      averageAiScore: this.calculateAverageScore(loans),
    };

    // Add user-specific summary if filtered by borrower
    if (query.borrower) {
      const userLoans = loans.filter(l =>
        l.borrowerAddress.toLowerCase() === query.borrower?.toLowerCase()
      );
      summary.userTotalBorrowed = this.sumAmounts(userLoans.map(l => l.principalAmount));
      summary.userCurrentDebt = this.sumAmounts(
        userLoans
          .filter(l => l.status === 'active' || l.status === 'overdue')
          .map(l => l.currentAmountDue)
      );
    }

    // Add pool-specific summary if filtered by pool
    if (query.poolId) {
      const poolLoans = loans.filter(l => l.poolId === query.poolId);
      const liquidatedLoans = poolLoans.filter(l => l.status === 'liquidated');
      const repaidLoans = poolLoans.filter(l => l.status === 'repaid');

      summary.poolDefaultRate = poolLoans.length > 0
        ? liquidatedLoans.length / poolLoans.length
        : 0;

      // TODO: Calculate utilization when we have pool liquidity data
      summary.poolUtilization = 0.45; // Placeholder
    }

    // Add domain-specific summary if filtered by domain
    if (query.domainTokenId) {
      const domainLoans = loans.filter(l => l.domain.tokenId === query.domainTokenId);
      summary.domainLoanCount = domainLoans.length;
      summary.domainTotalBorrowed = this.sumAmounts(domainLoans.map(l => l.principalAmount));
    }

    return summary;
  }

  private sumAmounts(amounts: string[]): string {
    let sum = BigInt(0);
    for (const amount of amounts) {
      sum += BigInt(amount || '0');
    }
    return sum.toString();
  }

  private calculateAverageScore(loans: LoanDto[]): number {
    if (loans.length === 0) return 0;
    const sum = loans.reduce((acc, loan) => acc + loan.domain.aiScore, 0);
    return Math.round(sum / loans.length);
  }

  private sortLoans(loans: LoanDto[], sortBy?: string, order?: 'asc' | 'desc'): LoanDto[] {
    const sorted = [...loans];
    const direction = order === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'principalAmount':
          comparison = BigInt(a.principalAmount) > BigInt(b.principalAmount) ? 1 : -1;
          break;
        case 'repaymentDeadline':
          comparison = new Date(a.repaymentDeadline).getTime() - new Date(b.repaymentDeadline).getTime();
          break;
        case 'createdAt':
        default:
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return comparison * direction;
    });

    return sorted;
  }

  private parseTimestamp(timestamp: string | number): number {
    if (typeof timestamp === 'string') {
      const num = parseInt(timestamp, 10);
      if (!isNaN(num)) {
        return num > 1e12 ? num : num * 1000;
      }
      return new Date(timestamp).getTime();
    }
    return timestamp > 1e12 ? timestamp : timestamp * 1000;
  }

  private formatTimestamp(timestamp: string | number): string {
    const time = this.parseTimestamp(timestamp);
    return new Date(time).toISOString();
  }
}
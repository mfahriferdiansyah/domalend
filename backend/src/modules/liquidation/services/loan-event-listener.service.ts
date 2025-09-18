import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { LiquidationTracking } from '../../../core/database/entities/liquidation-tracking.entity';

interface PonderLoanEvent {
  id: string;
  eventType: string;
  loanId: string;
  borrowerAddress: string;
  domainTokenId: string;
  domainName?: string;
  loanAmount: string;
  interestRate?: number;
  poolId?: string;
  requestId?: string;
  repaymentDeadline: string;
  eventTimestamp: string;
  transactionHash: string;
  blockNumber: string;
}

@Injectable()
export class LoanEventListenerService {
  private readonly logger = new Logger(LoanEventListenerService.name);
  private lastProcessedTimestamp: Date = new Date(0);

  constructor(
    @InjectRepository(LiquidationTracking)
    private readonly liquidationRepo: Repository<LiquidationTracking>,
    private readonly configService: ConfigService,
  ) {
    // Initialize last processed timestamp from database
    this.initializeLastProcessedTimestamp();
  }

  private async initializeLastProcessedTimestamp() {
    try {
      const latestRecord = await this.liquidationRepo.findOne({
        order: { createdAt: 'DESC' },
      });

      if (latestRecord) {
        this.lastProcessedTimestamp = latestRecord.createdAt;
        this.logger.log(`Initialized last processed timestamp: ${this.lastProcessedTimestamp.toISOString()}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to initialize last processed timestamp: ${error.message}`);
    }
  }

  @Cron('*/30 * * * * *') // Every 30 seconds
  async checkForNewLoanEvents() {
    if (!this.configService.get('liquidation.enabled', true)) {
      return;
    }

    try {
      this.logger.debug('Checking for new loan events from Ponder...');

      const newEvents = await this.queryPonderForNewEvents();

      if (newEvents.length > 0) {
        this.logger.log(`Found ${newEvents.length} new loan events to process`);

        for (const event of newEvents) {
          await this.processLoanEvent(event);
        }

        // Update last processed timestamp
        this.lastProcessedTimestamp = new Date();
      } else {
        this.logger.debug('No new loan events found');
      }
    } catch (error) {
      this.logger.error(`Failed to check for new loan events: ${error.message}`, error.stack);
    }
  }

  private async queryPonderForNewEvents(): Promise<PonderLoanEvent[]> {
    const ponderUrl = this.configService.get('ponder.graphqlUrl', 'http://localhost:42069/graphql');

    const query = `
      query GetNewLoanEvents {
        loanEvents(
          where: {
            eventType_in: ["created_instant", "created_crowdfunded"]
          }
          orderBy: "eventTimestamp"
          orderDirection: "asc"
          limit: 100
        ) {
          items {
            id
            eventType
            loanId
            borrowerAddress
            domainTokenId
            domainName
            loanAmount
            interestRate
            poolId
            requestId
            repaymentDeadline
            eventTimestamp
            transactionHash
            blockNumber
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    try {
      const response = await axios.post(ponderUrl, {
        query,
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
      }

      const loanEvents = response.data.data?.loanEvents?.items || [];

      // Filter events newer than our last processed timestamp
      const lastTimestampMs = this.lastProcessedTimestamp.getTime();
      const filteredEvents = loanEvents.filter(event => {
        const eventTimestampMs = parseInt(event.eventTimestamp);
        return eventTimestampMs > lastTimestampMs;
      });

      this.logger.debug(`Found ${loanEvents.length} total events, ${filteredEvents.length} new events since ${this.lastProcessedTimestamp.toISOString()}`);

      return filteredEvents;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          this.logger.warn('Ponder indexer is not running - skipping event check');
          return [];
        }
        throw new Error(`Failed to query Ponder: ${error.message}`);
      }
      throw error;
    }
  }

  private async processLoanEvent(event: PonderLoanEvent) {
    try {
      // Check if already processed
      const exists = await this.liquidationRepo.findOne({
        where: { ponderEventId: event.id },
      });

      if (exists) {
        this.logger.debug(`Event ${event.id} already processed, skipping`);
        return;
      }

      // Parse repayment deadline (convert string milliseconds to Date)
      const dueDate = new Date(parseInt(event.repaymentDeadline));
      if (isNaN(dueDate.getTime())) {
        this.logger.error(`Invalid repayment deadline for loan ${event.loanId}: ${event.repaymentDeadline} (could not parse as timestamp)`);
        return;
      }

      // Create liquidation tracking record
      const liquidationRecord = this.liquidationRepo.create({
        loanId: event.loanId,
        borrower: event.borrowerAddress,
        domainTokenId: event.domainTokenId,
        domainName: event.domainName || `domain-${event.domainTokenId}`,
        principalAmount: event.loanAmount,
        totalOwed: event.loanAmount, // For now, will be updated when we calculate interest
        interestRate: event.interestRate,
        dueDate,
        status: 'pending',
        liquidationAttempts: 0,
        poolId: event.poolId,
        requestId: event.requestId,
        isDefault: false,
        ponderEventId: event.id,
      });

      await this.liquidationRepo.save(liquidationRecord);

      this.logger.log(
        `Added loan ${event.loanId} to liquidation tracking - Due: ${dueDate.toISOString()}, Domain: ${event.domainTokenId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to process loan event ${event.id}: ${error.message}`,
        error.stack
      );
    }
  }

  async getTrackedLoansCount(): Promise<number> {
    return this.liquidationRepo.count();
  }

  async getPendingLoansCount(): Promise<number> {
    return this.liquidationRepo.count({
      where: { status: 'pending' },
    });
  }

  async getLastProcessedTimestamp(): Promise<Date> {
    return this.lastProcessedTimestamp;
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { LiquidationTracking } from '../../../core/database/entities/liquidation-tracking.entity';
import { BlockchainLiquidationService, LoanStatusResult } from './blockchain-liquidation.service';

@Injectable()
export class LiquidationService {
  private readonly logger = new Logger(LiquidationService.name);

  constructor(
    @InjectRepository(LiquidationTracking)
    private readonly liquidationRepo: Repository<LiquidationTracking>,
    private readonly blockchainService: BlockchainLiquidationService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('*/10 * * * * *') // Every 10 seconds
  async checkForLiquidations() {
    if (!this.configService.get('liquidation.enabled', true)) {
      this.logger.debug('Liquidation checking is disabled');
      return;
    }

    try {
      this.logger.debug('Checking for loans eligible for liquidation...');

      // Find loans that are past due and pending liquidation
      const currentTime = new Date();
      const eligibleLoans = await this.liquidationRepo.find({
        where: {
          status: 'pending',
          dueDate: LessThan(currentTime),
        },
        order: { dueDate: 'ASC' },
        take: 20, // Process max 20 loans at a time
      });

      if (eligibleLoans.length === 0) {
        this.logger.debug('No loans eligible for liquidation');
        return;
      }

      this.logger.log(`Found ${eligibleLoans.length} loans potentially eligible for liquidation`);

      // Process each loan
      for (const loan of eligibleLoans) {
        await this.processLoanForLiquidation(loan);

        // Small delay between liquidations to avoid overwhelming the RPC
        await this.sleep(1000);
      }

    } catch (error) {
      this.logger.error(`Failed to check for liquidations: ${error.message}`, error.stack);
    }
  }

  private async processLoanForLiquidation(loan: LiquidationTracking) {
    try {
      this.logger.log(`Processing loan ${loan.loanId} for liquidation (Due: ${loan.dueDate.toISOString()})`);

      // Update last check timestamp
      loan.lastCheckTimestamp = new Date();

      // Check if loan is actually defaulted on-chain
      const statusResult = await this.blockchainService.checkLoanStatus(loan.loanId);

      if (statusResult.error) {
        this.logger.error(`Failed to check status for loan ${loan.loanId}: ${statusResult.error}`);
        loan.errorMessage = statusResult.error;
        await this.liquidationRepo.save(loan);
        return;
      }

      if (!statusResult.isDefaulted) {
        // Check if loan is no longer active (repaid/liquidated by others)
        const loanDetails = await this.blockchainService.getLoanDetails(loan.loanId);
        if (!loanDetails.isActive) {
          this.logger.log(`Loan ${loan.loanId} is no longer active (repaid or liquidated), marking as completed`);
          loan.status = loanDetails.isLiquidated ? 'liquidated' : 'repaid';
          await this.liquidationRepo.save(loan);
          return;
        }

        this.logger.debug(`Loan ${loan.loanId} is not yet defaulted (grace period may still be active)`);
        await this.liquidationRepo.save(loan);
        return;
      }

      // Loan is defaulted, attempt liquidation
      this.logger.log(`🚨 Loan ${loan.loanId} is defaulted - attempting liquidation...`);

      const liquidationResult = await this.blockchainService.liquidateLoan(loan.loanId);

      if (liquidationResult.success) {
        // Liquidation successful
        loan.status = 'liquidated';
        loan.liquidationTxHash = liquidationResult.txHash;
        loan.auctionId = liquidationResult.auctionId;
        loan.errorMessage = null;

        this.logger.log(
          `✅ Successfully liquidated loan ${loan.loanId} - TX: ${liquidationResult.txHash}${liquidationResult.auctionId ? `, Auction: ${liquidationResult.auctionId}` : ''}`
        );
      } else {
        // Liquidation failed
        loan.liquidationAttempts++;
        loan.errorMessage = liquidationResult.error;

        // Mark as failed after 5 attempts
        if (loan.liquidationAttempts >= 5) {
          loan.status = 'failed';
          this.logger.error(
            `❌ Loan ${loan.loanId} liquidation failed after ${loan.liquidationAttempts} attempts: ${liquidationResult.error}`
          );
        } else {
          this.logger.warn(
            `⚠️ Loan ${loan.loanId} liquidation attempt ${loan.liquidationAttempts} failed: ${liquidationResult.error}`
          );
        }
      }

      await this.liquidationRepo.save(loan);

    } catch (error) {
      this.logger.error(
        `Failed to process loan ${loan.loanId} for liquidation: ${error.message}`,
        error.stack
      );

      // Update error in database
      try {
        loan.liquidationAttempts++;
        loan.errorMessage = error.message;
        loan.lastCheckTimestamp = new Date();
        await this.liquidationRepo.save(loan);
      } catch (dbError) {
        this.logger.error(`Failed to save error state for loan ${loan.loanId}: ${dbError.message}`);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Manual liquidation trigger (for testing)
  async triggerLiquidation(loanId: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const loan = await this.liquidationRepo.findOne({
        where: { loanId },
      });

      if (!loan) {
        return {
          success: false,
          message: `Loan ${loanId} not found in liquidation tracking`,
        };
      }

      if (loan.status !== 'pending') {
        return {
          success: false,
          message: `Loan ${loanId} is not in pending status (current: ${loan.status})`,
        };
      }

      // Check if defaulted
      const statusResult = await this.blockchainService.checkLoanStatus(loanId);
      if (statusResult.error) {
        return {
          success: false,
          message: `Failed to check loan status: ${statusResult.error}`,
        };
      }

      if (!statusResult.isDefaulted) {
        return {
          success: false,
          message: 'Loan is not yet defaulted',
        };
      }

      // Attempt liquidation
      const liquidationResult = await this.blockchainService.liquidateLoan(loanId);

      if (liquidationResult.success) {
        loan.status = 'liquidated';
        loan.liquidationTxHash = liquidationResult.txHash;
        loan.auctionId = liquidationResult.auctionId;
        loan.lastCheckTimestamp = new Date();
        await this.liquidationRepo.save(loan);

        return {
          success: true,
          message: 'Liquidation successful',
          data: {
            txHash: liquidationResult.txHash,
            auctionId: liquidationResult.auctionId,
          },
        };
      } else {
        loan.liquidationAttempts++;
        loan.errorMessage = liquidationResult.error;
        loan.lastCheckTimestamp = new Date();
        await this.liquidationRepo.save(loan);

        return {
          success: false,
          message: `Liquidation failed: ${liquidationResult.error}`,
        };
      }

    } catch (error) {
      this.logger.error(`Manual liquidation trigger failed for ${loanId}: ${error.message}`);
      return {
        success: false,
        message: `Internal error: ${error.message}`,
      };
    }
  }

  // Statistics methods
  async getStatistics() {
    const [
      totalTracked,
      pending,
      liquidated,
      failed,
      expired,
    ] = await Promise.all([
      this.liquidationRepo.count(),
      this.liquidationRepo.count({ where: { status: 'pending' } }),
      this.liquidationRepo.count({ where: { status: 'liquidated' } }),
      this.liquidationRepo.count({ where: { status: 'failed' } }),
      this.liquidationRepo.count({ where: { status: 'expired' } }),
    ]);

    return {
      totalTracked,
      pending,
      liquidated,
      failed,
      expired,
    };
  }

  async getPendingLoans() {
    return this.liquidationRepo.find({
      where: { status: 'pending' },
      order: { dueDate: 'ASC' },
    });
  }

  async getRecentLiquidations(limit = 10) {
    return this.liquidationRepo.find({
      where: { status: 'liquidated' },
      order: { updatedAt: 'DESC' },
      take: limit,
    });
  }

  async getLoanStatus(loanId: string) {
    const loan = await this.liquidationRepo.findOne({
      where: { loanId },
    });

    if (!loan) {
      return { found: false };
    }

    // Also get current blockchain status
    const blockchainStatus = await this.blockchainService.checkLoanStatus(loanId);

    return {
      found: true,
      loan,
      blockchainStatus,
    };
  }
}
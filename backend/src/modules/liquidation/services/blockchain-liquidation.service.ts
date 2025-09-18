import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

export interface LoanStatusResult {
  isDefaulted: boolean;
  error?: string;
}

export interface LiquidationResult {
  success: boolean;
  txHash?: string;
  auctionId?: string;
  error?: string;
}

@Injectable()
export class BlockchainLiquidationService {
  private readonly logger = new Logger(BlockchainLiquidationService.name);
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private loanManagerContract: ethers.Contract;

  // LoanManager ABI - only the functions we need
  private readonly LOAN_MANAGER_ABI = [
    'function isLoanDefaulted(uint256 loanId) external view returns (bool)',
    'function liquidateCollateral(uint256 loanId) external returns (uint256 auctionId)',
    'function loans(uint256 loanId) external view returns (tuple(uint256 domainTokenId, address borrower, uint256 principalAmount, uint256 interestRate, uint256 startTime, uint256 duration, uint256 totalOwed, uint256 amountRepaid, uint256 poolId, uint256 requestId, bool isActive, bool isLiquidated, address poolCreator))',
  ];

  constructor(private readonly configService: ConfigService) {
    this.initializeProvider();
  }

  private initializeProvider() {
    try {
      const rpcUrl = this.configService.get('blockchain.rpcUrl', 'https://rpc-testnet.doma.xyz');
      const privateKey = this.configService.get('blockchain.privateKey');
      const loanManagerAddress = this.configService.get('blockchain.loanManagerAddress', '0x5365E0cf54Bccc157A0eFBb3aC77F826E27f9A49');

      if (!privateKey) {
        throw new Error('Private key not configured');
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.loanManagerContract = new ethers.Contract(
        loanManagerAddress,
        this.LOAN_MANAGER_ABI,
        this.wallet
      );

      this.logger.log(`Blockchain service initialized with LoanManager: ${loanManagerAddress}`);
    } catch (error) {
      this.logger.error(`Failed to initialize blockchain service: ${error.message}`);
      throw error;
    }
  }

  async checkLoanStatus(loanId: string): Promise<LoanStatusResult> {
    try {
      this.logger.debug(`Checking default status for loan ${loanId}...`);

      const isDefaulted = await this.loanManagerContract.isLoanDefaulted(loanId);

      this.logger.debug(`Loan ${loanId} default status: ${isDefaulted}`);

      return {
        isDefaulted,
      };
    } catch (error) {
      this.logger.error(`Failed to check loan status for ${loanId}: ${error.message}`);
      return {
        isDefaulted: false,
        error: error.message,
      };
    }
  }

  async liquidateLoan(loanId: string): Promise<LiquidationResult> {
    try {
      this.logger.log(`Attempting to liquidate loan ${loanId}...`);

      // First verify the loan is actually defaulted
      const statusCheck = await this.checkLoanStatus(loanId);
      if (!statusCheck.isDefaulted) {
        return {
          success: false,
          error: 'Loan is not defaulted yet',
        };
      }

      // Estimate gas for the liquidation
      let gasEstimate: bigint;
      try {
        gasEstimate = await this.loanManagerContract.liquidateCollateral.estimateGas(loanId);
        this.logger.debug(`Gas estimate for loan ${loanId} liquidation: ${gasEstimate.toString()}`);
      } catch (gasError) {
        this.logger.error(`Gas estimation failed for loan ${loanId}: ${gasError.message}`);
        return {
          success: false,
          error: `Gas estimation failed: ${gasError.message}`,
        };
      }

      // Execute liquidation with some gas buffer
      const gasLimit = gasEstimate + (gasEstimate / 10n); // Add 10% buffer
      const tx = await this.loanManagerContract.liquidateCollateral(loanId, {
        gasLimit,
      });

      this.logger.log(`Liquidation transaction sent for loan ${loanId}: ${tx.hash}`);

      // Wait for transaction confirmation
      const receipt = await tx.wait(1);

      if (receipt.status === 1) {
        // Extract auction ID from logs if available
        let auctionId: string | undefined;

        // Look for CollateralLiquidated event
        for (const log of receipt.logs) {
          try {
            if (log.topics[0] === ethers.id('CollateralLiquidated(uint256,uint256,address,uint256,uint256,uint256)')) {
              // Parse the event - auctionId is the 5th parameter (index 4)
              const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                ['uint256', 'uint256'],
                log.data
              );
              auctionId = decoded[1].toString(); // auctionId is second in data
              break;
            }
          } catch (parseError) {
            // Continue looking through other logs
          }
        }

        this.logger.log(
          `✅ Loan ${loanId} liquidated successfully - TX: ${tx.hash}${auctionId ? `, Auction: ${auctionId}` : ''}`
        );

        return {
          success: true,
          txHash: tx.hash,
          auctionId,
        };
      } else {
        return {
          success: false,
          error: 'Transaction failed',
        };
      }
    } catch (error) {
      this.logger.error(`Failed to liquidate loan ${loanId}: ${error.message}`, error.stack);

      // Parse specific error messages
      let errorMessage = error.message;
      if (error.message.includes('Loan not defaulted')) {
        errorMessage = 'Loan is not yet eligible for liquidation';
      } else if (error.message.includes('Dutch auction not set')) {
        errorMessage = 'Dutch auction contract not configured';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient gas funds for liquidation';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getLoanDetails(loanId: string) {
    try {
      const loanData = await this.loanManagerContract.loans(loanId);

      return {
        domainTokenId: loanData[0].toString(),
        borrower: loanData[1],
        principalAmount: loanData[2].toString(),
        interestRate: Number(loanData[3]),
        startTime: Number(loanData[4]),
        duration: Number(loanData[5]),
        totalOwed: loanData[6].toString(),
        amountRepaid: loanData[7].toString(),
        poolId: loanData[8].toString(),
        requestId: loanData[9].toString(),
        isActive: loanData[10],
        isLiquidated: loanData[11],
        poolCreator: loanData[12],
      };
    } catch (error) {
      this.logger.error(`Failed to get loan details for ${loanId}: ${error.message}`);
      throw error;
    }
  }

  async getBlockTimestamp(): Promise<number> {
    try {
      const block = await this.provider.getBlock('latest');
      return block?.timestamp || Math.floor(Date.now() / 1000);
    } catch (error) {
      this.logger.error(`Failed to get block timestamp: ${error.message}`);
      return Math.floor(Date.now() / 1000);
    }
  }

  async getWalletAddress(): Promise<string> {
    return this.wallet.address;
  }

  async getBalance(): Promise<string> {
    try {
      const balance = await this.provider.getBalance(this.wallet.address);
      return ethers.formatEther(balance);
    } catch (error) {
      this.logger.error(`Failed to get wallet balance: ${error.message}`);
      return '0.0';
    }
  }
}
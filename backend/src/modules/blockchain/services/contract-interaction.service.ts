import { Injectable, Logger } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { SmartContractService } from './smart-contract.service';
import { ethers } from 'ethers';

interface ScoreSubmissionParams {
  domainTokenId: string;
  score: number;
}

interface LiquidationParams {
  loanId: string;
  domainTokenId: string;
}

interface ContractResult {
  success: boolean;
  txHash: string;
  auctionId?: string;
}

@Injectable()
export class ContractInteractionService {
  private readonly logger = new Logger(ContractInteractionService.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly smartContractService: SmartContractService,
  ) {}

  /**
   * Submit domain score to AIOracle smart contract
   */
  async submitScore(params: ScoreSubmissionParams): Promise<ContractResult> {
    try {
      this.logger.log(`Submitting score ${params.score} for domain token ${params.domainTokenId}`);

      // Get wallet
      const wallet = this.walletService.getWallet();
      if (!wallet) {
        throw new Error('Wallet not available');
      }

      // Get AIOracle contract address
      const contractAddress = process.env.AI_ORACLE_ADDRESS;
      if (!contractAddress) {
        throw new Error('AI_ORACLE_ADDRESS not configured');
      }

      // Create contract instance
      const contract = new ethers.Contract(
        contractAddress,
        [
          {
            type: 'function',
            name: 'submitScore',
            inputs: [
              { name: 'domainTokenId', type: 'uint256' },
              { name: 'score', type: 'uint256' }
            ],
            outputs: [],
            stateMutability: 'nonpayable',
          }
        ],
        wallet
      );

      // Submit score to contract
      const tx = await contract.submitScore(params.domainTokenId, params.score);
      const txHash = tx.hash;

      this.logger.log(`Score submission successful: ${txHash}`);

      return {
        success: true,
        txHash,
      };

    } catch (error) {
      this.logger.error(`Score submission failed for domain ${params.domainTokenId}:`, error);
      throw new Error(`Score submission failed: ${error.message}`);
    }
  }

  /**
   * Liquidate loan via LoanManager smart contract
   */
  async liquidateLoan(params: LiquidationParams): Promise<ContractResult> {
    try {
      this.logger.log(`Liquidating loan ${params.loanId} for domain ${params.domainTokenId}`);

      // Get wallet
      const wallet = this.walletService.getWallet();
      if (!wallet) {
        throw new Error('Wallet not available');
      }

      // Get LoanManager contract address
      const contractAddress = process.env.LOAN_MANAGER_ADDRESS;
      if (!contractAddress) {
        throw new Error('LOAN_MANAGER_ADDRESS not configured');
      }

      // Create contract instance
      const contract = new ethers.Contract(
        contractAddress,
        [
          {
            type: 'function',
            name: 'liquidateCollateral',
            inputs: [{ name: 'loanId', type: 'uint256' }],
            outputs: [{ name: 'auctionId', type: 'uint256' }],
            stateMutability: 'nonpayable',
          }
        ],
        wallet
      );

      // Call liquidateCollateral on LoanManager
      const tx = await contract.liquidateCollateral(params.loanId);
      const txHash = tx.hash;

      this.logger.log(`Liquidation successful: ${txHash}`);

      // For now, we can't easily get the return value from the transaction
      // The auctionId would need to be extracted from the transaction receipt or event logs
      return {
        success: true,
        txHash,
        auctionId: undefined, // Would need event parsing to get this
      };

    } catch (error) {
      this.logger.error(`Liquidation failed for loan ${params.loanId}:`, error);
      throw new Error(`Liquidation failed: ${error.message}`);
    }
  }

  /**
   * Batch submit scores (for future use)
   */
  async batchSubmitScores(domainScores: Array<{domainTokenId: string, score: number}>): Promise<ContractResult> {
    try {
      this.logger.log(`Batch submitting ${domainScores.length} scores`);

      const wallet = this.walletService.getWallet();
      if (!wallet) {
        throw new Error('Wallet not available');
      }

      const contractAddress = process.env.AI_ORACLE_ADDRESS;
      if (!contractAddress) {
        throw new Error('AI_ORACLE_ADDRESS not configured');
      }

      // Create contract instance
      const contract = new ethers.Contract(
        contractAddress,
        [
          {
            type: 'function',
            name: 'batchSubmitScores',
            inputs: [
              { name: 'domainTokenIds', type: 'uint256[]' },
              { name: 'scores', type: 'uint256[]' }
            ],
            outputs: [],
            stateMutability: 'nonpayable',
          }
        ],
        wallet
      );

      // Prepare arrays for batch submission
      const domainTokenIds = domainScores.map(ds => ds.domainTokenId);
      const scores = domainScores.map(ds => ds.score);

      const tx = await contract.batchSubmitScores(domainTokenIds, scores);
      const txHash = tx.hash;

      this.logger.log(`Batch score submission successful: ${txHash}`);

      return {
        success: true,
        txHash,
      };

    } catch (error) {
      this.logger.error(`Batch score submission failed:`, error);
      throw new Error(`Batch score submission failed: ${error.message}`);
    }
  }
}
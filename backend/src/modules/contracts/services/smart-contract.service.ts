import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

interface ContractSubmissionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

@Injectable()
export class SmartContractService {
  private readonly logger = new Logger(SmartContractService.name);
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private aiOracleContract: ethers.Contract;

  // AIOracle ABI - only the functions we need
  private readonly AI_ORACLE_ABI = [
    'function submitScore(uint256 domainTokenId, uint256 score) external',
    'function getDomainScore(uint256 domainTokenId) external view returns (uint256 score, bool isValid, uint256 timestamp)',
  ];

  constructor(private readonly configService: ConfigService) {
    this.initializeProvider();
  }

  async submitScore(
    domainTokenId: string,
    score: number,
    domainName: string,
    confidence: number,
    reasoning: string
  ): Promise<ContractSubmissionResult> {
    try {
      this.logger.log(`Submitting score for ${domainName} (${domainTokenId}): ${score} (confidence: ${confidence}%)`);

      // Validate inputs
      if (!domainTokenId || !domainName) {
        throw new Error('Missing required parameters: tokenId or domainName');
      }

      if (score < 0 || score > 100) {
        throw new Error(`Invalid score: ${score}. Must be between 0 and 100`);
      }

      if (confidence < 0 || confidence > 100) {
        throw new Error(`Invalid confidence: ${confidence}. Must be between 0 and 100`);
      }

      // Submit score to AIOracle contract
      this.logger.debug(`Estimating gas for submitScore transaction...`);

      // Estimate gas for the transaction
      let gasEstimate: bigint;
      try {
        gasEstimate = await this.aiOracleContract.submitScore.estimateGas(domainTokenId, score);
        this.logger.debug(`Gas estimate for submitScore: ${gasEstimate.toString()}`);
      } catch (gasError) {
        this.logger.error(`Gas estimation failed for domain ${domainTokenId}: ${gasError.message}`);
        throw new Error(`Gas estimation failed: ${gasError.message}`);
      }

      // Execute transaction with gas buffer (10% extra)
      const gasLimit = gasEstimate + (gasEstimate / 10n);
      this.logger.debug(`Submitting score to contract with gas limit: ${gasLimit.toString()}`);

      const tx = await this.aiOracleContract.submitScore(domainTokenId, score, {
        gasLimit,
      });

      this.logger.log(`Score submission transaction sent for ${domainName}: ${tx.hash}`);

      // Wait for transaction confirmation
      const receipt = await tx.wait(1);

      if (receipt.status !== 1) {
        throw new Error('Transaction failed');
      }

      const txHash = tx.hash;

      this.logger.log(`✅ Score submitted successfully for ${domainName}: TX ${txHash}`);

      return {
        success: true,
        txHash,
      };

    } catch (error) {
      this.logger.error(`❌ Failed to submit score for ${domainName}:`, error.message);

      // Parse specific blockchain error messages
      let errorMessage = error.message || 'Unknown contract error';

      if (error.message.includes('Not authorized backend service')) {
        errorMessage = 'Backend service is not authorized to submit scores (missing SCORING_SERVICE_ROLE)';
      } else if (error.message.includes('Score must be 0-100')) {
        errorMessage = `Invalid score: ${score}. Score must be between 0 and 100`;
      } else if (error.message.includes('Oracle is paused')) {
        errorMessage = 'AIOracle contract is currently paused for emergency maintenance';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds to pay for transaction gas';
      } else if (error.message.includes('nonce too low') || error.message.includes('replacement transaction underpriced')) {
        errorMessage = 'Transaction nonce issue - please try again';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network connection error - please check your connection';
      } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        errorMessage = 'Transaction would fail - check contract state and parameters';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private initializeProvider() {
    try {
      const rpcUrl = this.configService.get('blockchain.rpcUrl', 'https://rpc-testnet.doma.xyz');
      const privateKey = this.configService.get('blockchain.privateKey');
      const aiOracleAddress = this.configService.get('blockchain.aiOracleAddress');

      if (!privateKey) {
        throw new Error('Scoring service private key not configured');
      }

      if (!aiOracleAddress) {
        throw new Error('AI Oracle contract address not configured');
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.aiOracleContract = new ethers.Contract(
        aiOracleAddress,
        this.AI_ORACLE_ABI,
        this.wallet
      );

      this.logger.log(`Smart contract service initialized with AIOracle: ${aiOracleAddress}`);
    } catch (error) {
      this.logger.error(`Failed to initialize smart contract service: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get contract configuration for debugging
   */
  getContractInfo() {
    return {
      aiOracleAddress: this.configService.get('blockchain.aiOracleAddress') || 'Not configured',
      rpcUrl: this.configService.get('blockchain.rpcUrl') || 'Not configured',
      walletAddress: this.wallet?.address || 'Not initialized',
      status: 'Production blockchain integration active'
    };
  }
}
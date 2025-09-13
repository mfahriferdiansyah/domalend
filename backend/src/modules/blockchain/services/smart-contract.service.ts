import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { ScoreBreakdown, DomainValuation } from './domain-scoring.service';

// ABI for AIOracle contract
const AI_ORACLE_ABI = [
  "function submitScore(uint256 domainTokenId, uint256 score) external",
  "function getDomainInfo(uint256 tokenId) external view returns (uint256 score, uint256 value, uint256 maxLoan, uint256 confidence, bool scoreIsValid, bool valuationIsValid)",
  "function needsRefresh(uint256 tokenId) external view returns (bool)",
  "function scoringService() external view returns (address)"
];

@Injectable()
export class SmartContractService {
  private readonly logger = new Logger(SmartContractService.name);
  private readonly provider: ethers.Provider;
  private readonly wallet: ethers.Wallet;
  private readonly aiOracleContract: ethers.Contract;
  
  constructor(private readonly configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('DOMA_RPC_URL') || 'https://rpc-testnet.doma.xyz';
    const privateKey = this.configService.get<string>('SCORING_SERVICE_PRIVATE_KEY') || 
                      this.configService.get<string>('PRIVATE_KEY');
    const aiOracleAddress = this.configService.get<string>('AI_ORACLE_ADDRESS');
    
    if (!privateKey) {
      throw new Error('SCORING_SERVICE_PRIVATE_KEY or PRIVATE_KEY must be set');
    }
    
    if (!aiOracleAddress) {
      throw new Error('AI_ORACLE_ADDRESS must be set');
    }
    
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.aiOracleContract = new ethers.Contract(aiOracleAddress, AI_ORACLE_ABI, this.wallet);
    
    this.logger.log(`Smart contract service initialized with address: ${aiOracleAddress}`);
  }

  /**
   * Update domain score on-chain (scores from AI service)
   */
  async updateDomainScore(
    tokenId: string,
    scoreBreakdown: ScoreBreakdown
  ): Promise<string> {
    try {
      this.logger.log(`Updating on-chain score for domain ${tokenId}`);
      
      // Calculate total score from breakdown
      const totalScore = Math.round(
        scoreBreakdown.ageScore + 
        scoreBreakdown.lengthScore + 
        scoreBreakdown.extensionScore + 
        scoreBreakdown.keywordScore + 
        scoreBreakdown.trafficScore + 
        scoreBreakdown.marketScore + 
        scoreBreakdown.domaScore
      );
      
      // Submit the total score to AIOracle (using submitScore from the indexer pattern)
      const submitTx = await this.aiOracleContract.submitScore(
        tokenId,
        totalScore
      );
      
      await submitTx.wait();
      this.logger.log(`Score submission confirmed: ${submitTx.hash} (Score: ${totalScore})`);
      
      return submitTx.hash;
    } catch (error) {
      this.logger.error(`Error updating domain score on-chain for ${tokenId}:`, error);
      throw error;
    }
  }

  /**
   * Check if domain score needs refresh
   */
  async needsRefresh(tokenId: string): Promise<boolean> {
    try {
      return await this.aiOracleContract.needsRefresh(tokenId);
    } catch (error) {
      this.logger.error(`Error checking refresh status for ${tokenId}:`, error);
      return true; // Default to needing refresh on error
    }
  }

  /**
   * Get current on-chain domain info
   */
  async getOnChainDomainInfo(tokenId: string): Promise<{
    score: number;
    value: number;
    maxLoan: number;
    confidence: number;
    scoreIsValid: boolean;
    valuationIsValid: boolean;
  } | null> {
    try {
      const result = await this.aiOracleContract.getDomainInfo(tokenId);
      
      return {
        score: Number(result.score),
        value: Number(result.value),
        maxLoan: Number(result.maxLoan),
        confidence: Number(result.confidence),
        scoreIsValid: result.scoreIsValid,
        valuationIsValid: result.valuationIsValid
      };
    } catch (error) {
      this.logger.error(`Error getting on-chain domain info for ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Check if this service is authorized to update scores
   */
  async isAuthorizedScoringService(): Promise<boolean> {
    try {
      // Try to call scoringService function - if it doesn't exist, assume we're authorized for development
      const authorizedAddress = await this.aiOracleContract.scoringService();
      const ourAddress = await this.wallet.getAddress();
      
      return authorizedAddress.toLowerCase() === ourAddress.toLowerCase();
    } catch (error) {
      this.logger.warn('Unable to check scoring service authorization (function may not exist in contract):', error.message);
      // Return true for development if function doesn't exist - in production this should be more strict
      return true;
    }
  }

  /**
   * Get service wallet address
   */
  async getWalletAddress(): Promise<string> {
    return await this.wallet.getAddress();
  }

  /**
   * Get service wallet balance
   */
  async getWalletBalance(): Promise<string> {
    const balance = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }

  /**
   * Estimate gas for score update
   */
  async estimateScoreUpdateGas(
    tokenId: string,
    scoreBreakdown: ScoreBreakdown
  ): Promise<{
    scoreUpdateGas: bigint;
    valuationUpdateGas: bigint;
    totalGas: bigint;
    estimatedCostEth: string;
  }> {
    try {
      const scoreUpdateGas = await this.aiOracleContract.updateDetailedScore.estimateGas(
        tokenId,
        Math.round(scoreBreakdown.ageScore),
        Math.round(scoreBreakdown.lengthScore),
        Math.round(scoreBreakdown.extensionScore),
        Math.round(scoreBreakdown.keywordScore),
        Math.round(scoreBreakdown.trafficScore),
        Math.round(scoreBreakdown.marketScore),
        Math.round(scoreBreakdown.domaScore)
      );
      
      const valuationUpdateGas = await this.aiOracleContract.updateValuation.estimateGas(
        tokenId,
        "1000000000", // Dummy value for estimation
        80 // Dummy confidence for estimation
      );
      
      const totalGas = scoreUpdateGas + valuationUpdateGas;
      
      // Get current gas price
      const gasPrice = await this.provider.getFeeData();
      const estimatedCost = totalGas * (gasPrice.gasPrice || BigInt("1000000000")); // 1 gwei fallback
      
      return {
        scoreUpdateGas,
        valuationUpdateGas,
        totalGas,
        estimatedCostEth: ethers.formatEther(estimatedCost)
      };
    } catch (error) {
      this.logger.error(`Error estimating gas for ${tokenId}:`, error);
      throw error;
    }
  }

  /**
   * Get network information
   */
  async getNetworkInfo(): Promise<{
    chainId: number;
    blockNumber: number;
    gasPrice: string;
    network: string;
    rpcUrl: string;
  }> {
    try {
      const [network, blockNumber, feeData] = await Promise.all([
        this.provider.getNetwork(),
        this.provider.getBlockNumber(),
        this.provider.getFeeData()
      ]);
      
      return {
        chainId: Number(network.chainId),
        blockNumber,
        gasPrice: ethers.formatUnits(feeData.gasPrice || 0n, 'gwei'),
        network: 'Doma Testnet',
        rpcUrl: this.configService.get<string>('DOMA_RPC_URL') || 'https://rpc-testnet.doma.xyz'
      };
    } catch (error) {
      this.logger.error('Failed to get network info:', error);
      throw error;
    }
  }

  /**
   * Get loan information from LoanManager contract
   */
  async getLoanInfo(loanId: number): Promise<{
    id: number;
    borrower: string;
    domainTokenId: string;
    amount: string;
    interestRate: number;
    repaymentDeadline: Date;
    status: string;
    aiScore: number;
  } | null> {
    try {
      const loanManagerAddress = this.configService.get<string>('LOAN_MANAGER_ADDRESS');
      if (!loanManagerAddress) {
        this.logger.warn('LOAN_MANAGER_ADDRESS not configured');
        return null;
      }
      
      const loanManagerAbi = [
        'function loans(uint256) view returns (address borrower, uint256 domainTokenId, uint256 amount, uint256 interestRate, uint256 repaymentDeadline, bool isActive, uint256 aiScore)'
      ];
      
      const loanManager = new ethers.Contract(loanManagerAddress, loanManagerAbi, this.provider);
      const loan = await loanManager.loans(loanId);
      
      if (!loan.borrower || loan.borrower === ethers.ZeroAddress) {
        return null;
      }
      
      return {
        id: loanId,
        borrower: loan.borrower,
        domainTokenId: loan.domainTokenId.toString(),
        amount: ethers.formatUnits(loan.amount, 6), // USDC has 6 decimals
        interestRate: Number(loan.interestRate),
        repaymentDeadline: new Date(Number(loan.repaymentDeadline) * 1000),
        status: loan.isActive ? 'active' : 'repaid',
        aiScore: Number(loan.aiScore)
      };
    } catch (error) {
      this.logger.error(`Failed to get loan info for ${loanId}:`, error);
      return null;
    }
  }

  /**
   * Health check for smart contract connectivity
   */
  async healthCheck(): Promise<{
    connected: boolean;
    authorized: boolean;
    walletAddress: string;
    walletBalance: string;
    blockNumber: number;
  }> {
    try {
      const [authorized, walletAddress, walletBalance, blockNumber] = await Promise.all([
        this.isAuthorizedScoringService(),
        this.getWalletAddress(),
        this.getWalletBalance(),
        this.provider.getBlockNumber()
      ]);
      
      return {
        connected: true,
        authorized,
        walletAddress,
        walletBalance,
        blockNumber
      };
    } catch (error) {
      this.logger.error('Smart contract health check failed:', error);
      return {
        connected: false,
        authorized: false,
        walletAddress: '',
        walletBalance: '0',
        blockNumber: 0
      };
    }
  }
}
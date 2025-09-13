import { Controller, Get, Post, Body, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SmartContractService } from '../services/smart-contract.service';
import { TransactionService } from '../services/transaction.service';
import { WalletService } from '../services/wallet.service';

@ApiTags('blockchain')
@Controller('blockchain')
export class BlockchainController {
  private readonly logger = new Logger(BlockchainController.name);

  constructor(
    private readonly smartContractService: SmartContractService,
    private readonly transactionService: TransactionService,
    private readonly walletService: WalletService,
  ) {}

  @Get('network-info')
  @ApiOperation({ summary: 'Get blockchain network information' })
  @ApiResponse({ status: 200, description: 'Network information retrieved' })
  async getNetworkInfo() {
    const networkInfo = await this.smartContractService.getNetworkInfo();
    return networkInfo;
  }

  @Get('domain/:tokenId/score')
  @ApiOperation({ summary: 'Get domain score from smart contract' })
  @ApiParam({ name: 'tokenId', description: 'Domain token ID' })
  @ApiResponse({ status: 200, description: 'Domain score retrieved' })
  async getDomainScore(@Param('tokenId') tokenId: string) {
    const info = await this.smartContractService.getOnChainDomainInfo(tokenId);
    const score = info?.score;
    if (!score) {
      return { error: 'Score not found or not valid' };
    }
    return score;
  }

  @Get('domain/:tokenId/info')
  @ApiOperation({ summary: 'Get enhanced domain information' })
  @ApiParam({ name: 'tokenId', description: 'Domain token ID' })
  @ApiResponse({ status: 200, description: 'Domain information retrieved' })
  async getEnhancedDomainInfo(@Param('tokenId') tokenId: string) {
    const info = await this.smartContractService.getOnChainDomainInfo(tokenId);
    if (!info) {
      return { error: 'Domain information not found' };
    }
    return info;
  }

  @Post('domain/:tokenId/update-score')
  @ApiOperation({ summary: 'Update domain score on blockchain' })
  @ApiParam({ name: 'tokenId', description: 'Domain token ID' })
  @ApiResponse({ status: 200, description: 'Score updated successfully' })
  async updateDomainScore(
    @Param('tokenId') tokenId: string,
    @Body() scoreData: {
      ageScore: number;
      lengthScore: number;
      extensionScore: number;
      keywordScore: number;
      trafficScore: number;
      marketScore: number;
      domaScore: number;
    }
  ) {
    try {
      // The scores already come from the AI service
      // Just pass them to the smart contract
      const txHash = await this.smartContractService.updateDomainScore(
        tokenId,
        scoreData
      );
      
      return {
        success: true,
        transactionHash: txHash,
        message: 'Score update submitted to blockchain'
      };
    } catch (error) {
      this.logger.error(`Failed to update score for token ${tokenId}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('loan/:loanId')
  @ApiOperation({ summary: 'Get loan information' })
  @ApiParam({ name: 'loanId', description: 'Loan ID' })
  @ApiResponse({ status: 200, description: 'Loan information retrieved' })
  async getLoanInfo(@Param('loanId') loanId: string) {
    const info = await this.smartContractService.getLoanInfo(parseInt(loanId));
    if (!info) {
      return { error: 'Loan not found' };
    }
    return info;
  }

  @Get('user/:address/points')
  @ApiOperation({ summary: 'Get user points balance' })
  @ApiParam({ name: 'address', description: 'User wallet address' })
  @ApiResponse({ status: 200, description: 'User points retrieved' })
  async getUserPoints(@Param('address') address: string) {
    // Points feature not implemented yet
    return { 
      address, 
      points: 0,
      message: 'Points feature not yet implemented'
    };
  }

  @Get('points/total')
  @ApiOperation({ summary: 'Get total points in system' })
  @ApiResponse({ status: 200, description: 'Total points retrieved' })
  async getTotalPoints() {
    // Points feature not implemented yet
    return { 
      totalPoints: 0,
      message: 'Points feature not yet implemented'
    };
  }

  @Get('transaction/:hash')
  @ApiOperation({ summary: 'Get transaction receipt' })
  @ApiParam({ name: 'hash', description: 'Transaction hash' })
  @ApiResponse({ status: 200, description: 'Transaction receipt retrieved' })
  async getTransactionReceipt(@Param('hash') hash: string) {
    const receipt = await this.transactionService.getTransactionReceipt(hash);
    if (!receipt) {
      return { error: 'Transaction not found or still pending' };
    }
    return receipt;
  }

  @Get('transaction/:hash/status')
  @ApiOperation({ summary: 'Get transaction status' })
  @ApiParam({ name: 'hash', description: 'Transaction hash' })
  @ApiResponse({ status: 200, description: 'Transaction status retrieved' })
  async getTransactionStatus(@Param('hash') hash: string) {
    return this.transactionService.getTransactionStatus(hash);
  }

  @Get('wallet/info')
  @ApiOperation({ summary: 'Get service wallet information' })
  @ApiResponse({ status: 200, description: 'Wallet information retrieved' })
  async getWalletInfo(@Query('address') address?: string) {
    return this.walletService.getWalletInfo(address);
  }

  @Get('wallet/:address/balance')
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiParam({ name: 'address', description: 'Wallet address' })
  @ApiResponse({ status: 200, description: 'Wallet balance retrieved' })
  async getWalletBalance(@Param('address') address: string) {
    const balance = await this.walletService.getBalance(address);
    return { address, balance };
  }

  @Get('wallet/:address/transactions')
  @ApiOperation({ summary: 'Get recent transactions for wallet' })
  @ApiParam({ name: 'address', description: 'Wallet address' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of transactions to return' })
  @ApiResponse({ status: 200, description: 'Recent transactions retrieved' })
  async getRecentTransactions(
    @Param('address') address: string,
    @Query('limit') limit?: string
  ) {
    const limitNum = limit ? parseInt(limit) : 10;
    const transactions = await this.transactionService.getRecentTransactions(address, limitNum);
    return { address, transactions };
  }

  @Post('transaction/estimate-gas')
  @ApiOperation({ summary: 'Estimate gas for transaction' })
  @ApiResponse({ status: 200, description: 'Gas estimation completed' })
  async estimateGas(
    @Body() data: {
      to: string;
      data: string;
      value?: string;
    }
  ) {
    const estimate = await this.transactionService.estimateGas(
      data.to,
      data.data,
      data.value || '0'
    );
    
    if (!estimate) {
      return { error: 'Failed to estimate gas' };
    }
    
    return estimate;
  }

  @Get('pending-transactions')
  @ApiOperation({ summary: 'Get pending transactions' })
  @ApiResponse({ status: 200, description: 'Pending transactions retrieved' })
  async getPendingTransactions() {
    const pending = this.transactionService.getPendingTransactions();
    return { count: pending.length, transactions: pending };
  }

  @Post('wallet/validate-address')
  @ApiOperation({ summary: 'Validate wallet address' })
  @ApiResponse({ status: 200, description: 'Address validation result' })
  async validateAddress(@Body() data: { address: string }) {
    const isValid = await this.walletService.isValidAddress(data.address);
    return { address: data.address, isValid };
  }

  @Get('gas-price')
  @ApiOperation({ summary: 'Get current gas price' })
  @ApiResponse({ status: 200, description: 'Current gas price retrieved' })
  async getGasPrice() {
    const gasPrice = await this.walletService.getGasPrice();
    return { gasPrice: `${gasPrice} gwei` };
  }
}
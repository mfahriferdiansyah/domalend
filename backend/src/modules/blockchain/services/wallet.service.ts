import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

export interface WalletBalance {
  native: string; // ETH balance
  usdc?: string;  // USDC balance if available
}

export interface WalletInfo {
  address: string;
  balance: WalletBalance;
  nonce: number;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private readonly provider: ethers.JsonRpcProvider;
  private readonly wallet: ethers.Wallet;

  constructor(private readonly configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('blockchain.rpcUrl') || this.configService.get<string>('DOMA_RPC_URL');
    const privateKey = this.configService.get<string>('blockchain.privateKey') || this.configService.get<string>('SCORING_SERVICE_PRIVATE_KEY');

    if (!rpcUrl || !privateKey) {
      this.logger.error('Missing wallet configuration');
      throw new Error('Wallet configuration is incomplete');
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);

    this.logger.log(`Wallet service initialized for address: ${this.wallet.address}`);
  }

  getAddress(): string {
    return this.wallet.address;
  }

  async getBalance(address?: string): Promise<WalletBalance> {
    try {
      const targetAddress = address || this.wallet.address;
      
      const nativeBalance = await this.provider.getBalance(targetAddress);
      
      const balance: WalletBalance = {
        native: ethers.formatEther(nativeBalance),
      };

      // Try to get USDC balance if USDC contract address is configured
      const usdcAddress = this.configService.get<string>('blockchain.usdcAddress');
      if (usdcAddress) {
        try {
          const usdcContract = new ethers.Contract(
            usdcAddress,
            [
              'function balanceOf(address) view returns (uint256)',
              'function decimals() view returns (uint8)',
            ],
            this.provider
          );

          const usdcBalance = await usdcContract.balanceOf(targetAddress);
          const decimals = await usdcContract.decimals();
          
          balance.usdc = ethers.formatUnits(usdcBalance, decimals);
        } catch (error) {
          this.logger.warn(`Could not fetch USDC balance: ${error.message}`);
        }
      }

      return balance;
    } catch (error) {
      this.logger.error(`Failed to get balance for ${address}:`, error.message);
      return { native: '0', usdc: '0' };
    }
  }

  async getWalletInfo(address?: string): Promise<WalletInfo> {
    try {
      const targetAddress = address || this.wallet.address;
      const balance = await this.getBalance(targetAddress);
      const nonce = await this.provider.getTransactionCount(targetAddress);

      return {
        address: targetAddress,
        balance,
        nonce,
      };
    } catch (error) {
      this.logger.error(`Failed to get wallet info:`, error.message);
      throw error;
    }
  }

  async getNonce(address?: string): Promise<number> {
    try {
      const targetAddress = address || this.wallet.address;
      return await this.provider.getTransactionCount(targetAddress);
    } catch (error) {
      this.logger.error(`Failed to get nonce for ${address}:`, error.message);
      return 0;
    }
  }

  async estimateTransactionCost(
    to: string,
    data: string = '0x',
    value: string = '0'
  ): Promise<{
    gasLimit: string;
    gasPrice: string;
    estimatedCost: string;
  } | null> {
    try {
      const gasLimit = await this.provider.estimateGas({
        to,
        data,
        value: ethers.parseEther(value),
        from: this.wallet.address,
      });

      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
      
      const estimatedCost = gasLimit * gasPrice;

      return {
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString(),
        estimatedCost: ethers.formatEther(estimatedCost),
      };
    } catch (error) {
      this.logger.error(`Failed to estimate transaction cost:`, error.message);
      return null;
    }
  }

  async sendTransaction(
    to: string,
    value: string,
    data: string = '0x',
    gasLimit?: string,
    gasPrice?: string
  ): Promise<string | null> {
    try {
      this.logger.log(`Sending transaction to ${to}, value: ${value}`);

      const tx: any = {
        to,
        value: ethers.parseEther(value),
        data,
      };

      if (gasLimit) {
        tx.gasLimit = gasLimit;
      }

      if (gasPrice) {
        tx.gasPrice = gasPrice;
      } else {
        const feeData = await this.provider.getFeeData();
        tx.gasPrice = feeData.gasPrice;
      }

      const transaction = await this.wallet.sendTransaction(tx);
      
      this.logger.log(`Transaction sent: ${transaction.hash}`);
      return transaction.hash;
    } catch (error) {
      this.logger.error(`Failed to send transaction:`, error.message);
      return null;
    }
  }

  async signMessage(message: string): Promise<string | null> {
    try {
      const signature = await this.wallet.signMessage(message);
      return signature;
    } catch (error) {
      this.logger.error(`Failed to sign message:`, error.message);
      return null;
    }
  }

  async verifySignature(message: string, signature: string, address: string): Promise<boolean> {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      this.logger.error(`Failed to verify signature:`, error.message);
      return false;
    }
  }

  async isValidAddress(address: string): Promise<boolean> {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  async getTransactionCount(address?: string): Promise<number> {
    try {
      const targetAddress = address || this.wallet.address;
      return await this.provider.getTransactionCount(targetAddress);
    } catch (error) {
      this.logger.error(`Failed to get transaction count:`, error.message);
      return 0;
    }
  }

  async hasEnoughBalance(requiredAmount: string, tokenAddress?: string): Promise<boolean> {
    try {
      const balance = await this.getBalance();
      
      if (tokenAddress) {
        // Check token balance (assuming USDC for now)
        if (!balance.usdc) return false;
        return parseFloat(balance.usdc) >= parseFloat(requiredAmount);
      } else {
        // Check native token balance
        return parseFloat(balance.native) >= parseFloat(requiredAmount);
      }
    } catch (error) {
      this.logger.error(`Failed to check balance:`, error.message);
      return false;
    }
  }

  async getGasPrice(): Promise<string> {
    try {
      const feeData = await this.provider.getFeeData();
      return ethers.formatUnits(feeData.gasPrice || 0, 'gwei');
    } catch (error) {
      this.logger.error(`Failed to get gas price:`, error.message);
      return '0';
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Check if we can get wallet info
      const info = await this.getWalletInfo();
      return !!info.address && info.nonce >= 0;
    } catch (error) {
      this.logger.error('Wallet health check failed:', error.message);
      return false;
    }
  }
}
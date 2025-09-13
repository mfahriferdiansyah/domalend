import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { SmartContractService } from './smart-contract.service';

export interface TransactionReceipt {
  hash: string;
  blockNumber: number;
  gasUsed: string;
  gasPrice: string;
  status: number;
  timestamp: number;
}

export interface PendingTransaction {
  hash: string;
  to: string;
  value: string;
  gasLimit: string;
  gasPrice: string;
  nonce: number;
}

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  private readonly provider: ethers.JsonRpcProvider;
  private pendingTransactions = new Map<string, PendingTransaction>();

  constructor(
    private readonly configService: ConfigService,
    private readonly smartContractService: SmartContractService,
  ) {
    const rpcUrl = this.configService.get<string>('blockchain.rpcUrl');
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  async getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null> {
    try {
      this.logger.log(`Getting receipt for transaction: ${txHash}`);
      
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) return null;

      const block = await this.provider.getBlock(receipt.blockNumber);
      
      return {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.gasPrice?.toString() || '0',
        status: receipt.status || 0,
        timestamp: block?.timestamp || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get transaction receipt for ${txHash}:`, error.message);
      return null;
    }
  }

  async waitForTransaction(
    txHash: string, 
    confirmations: number = 1,
    timeout: number = 300000 // 5 minutes
  ): Promise<TransactionReceipt | null> {
    try {
      this.logger.log(`Waiting for transaction: ${txHash} (${confirmations} confirmations)`);
      
      const receipt = await this.provider.waitForTransaction(txHash, confirmations, timeout);
      if (!receipt) return null;

      // Remove from pending transactions
      this.pendingTransactions.delete(txHash);

      const block = await this.provider.getBlock(receipt.blockNumber);
      
      return {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.gasPrice?.toString() || '0',
        status: receipt.status || 0,
        timestamp: block?.timestamp || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to wait for transaction ${txHash}:`, error.message);
      return null;
    }
  }

  async estimateGas(
    to: string,
    data: string,
    value: string = '0'
  ): Promise<{ gasLimit: string; gasPrice: string } | null> {
    try {
      const gasLimit = await this.provider.estimateGas({
        to,
        data,
        value: ethers.parseEther(value),
      });

      const feeData = await this.provider.getFeeData();
      
      return {
        gasLimit: gasLimit.toString(),
        gasPrice: feeData.gasPrice?.toString() || '0',
      };
    } catch (error) {
      this.logger.error(`Failed to estimate gas:`, error.message);
      return null;
    }
  }

  trackPendingTransaction(txHash: string, txData: Omit<PendingTransaction, 'hash'>): void {
    this.pendingTransactions.set(txHash, {
      hash: txHash,
      ...txData,
    });
    
    this.logger.log(`Tracking pending transaction: ${txHash}`);
  }

  getPendingTransactions(): PendingTransaction[] {
    return Array.from(this.pendingTransactions.values());
  }

  async getTransactionStatus(txHash: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed' | 'not_found';
    confirmations: number;
    receipt?: TransactionReceipt;
  }> {
    try {
      // Check if it's in our pending list
      if (this.pendingTransactions.has(txHash)) {
        const receipt = await this.provider.getTransactionReceipt(txHash);
        if (!receipt) {
          return { status: 'pending', confirmations: 0 };
        }
        
        // Remove from pending and return confirmed status
        this.pendingTransactions.delete(txHash);
        
        const currentBlock = await this.provider.getBlockNumber();
        const confirmations = currentBlock - receipt.blockNumber;
        const block = await this.provider.getBlock(receipt.blockNumber);
        
        const receiptData: TransactionReceipt = {
          hash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          gasPrice: receipt.gasPrice?.toString() || '0',
          status: receipt.status || 0,
          timestamp: block?.timestamp || 0,
        };
        
        return {
          status: receipt.status === 1 ? 'confirmed' : 'failed',
          confirmations,
          receipt: receiptData,
        };
      }
      
      // Check on-chain
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) {
        // Check if transaction exists in mempool
        try {
          const tx = await this.provider.getTransaction(txHash);
          if (tx && !tx.blockNumber) {
            return { status: 'pending', confirmations: 0 };
          }
        } catch {}
        
        return { status: 'not_found', confirmations: 0 };
      }
      
      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;
      const block = await this.provider.getBlock(receipt.blockNumber);
      
      const receiptData: TransactionReceipt = {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.gasPrice?.toString() || '0',
        status: receipt.status || 0,
        timestamp: block?.timestamp || 0,
      };
      
      return {
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        confirmations,
        receipt: receiptData,
      };
    } catch (error) {
      this.logger.error(`Failed to get transaction status for ${txHash}:`, error.message);
      return { status: 'not_found', confirmations: 0 };
    }
  }

  async getRecentTransactions(
    address: string,
    limit: number = 10
  ): Promise<Array<{
    hash: string;
    blockNumber: number;
    from: string;
    to: string;
    value: string;
    gasUsed?: string;
    timestamp: number;
  }>> {
    try {
      // Note: This is a simplified implementation
      // In production, you'd want to use a graph indexer or event logs
      const currentBlock = await this.provider.getBlockNumber();
      const transactions: any[] = [];
      
      // Search recent blocks for transactions involving the address
      for (let i = 0; i < Math.min(100, currentBlock) && transactions.length < limit; i++) {
        try {
          const block = await this.provider.getBlock(currentBlock - i, true);
          if (!block?.transactions) continue;
          
          for (const tx of block.transactions) {
            if (typeof tx === 'string') continue;
            
            const txData = tx as any; // Type assertion for transaction data
            
            if (txData.from === address || txData.to === address) {
              const receipt = await this.provider.getTransactionReceipt(txData.hash);
              
              transactions.push({
                hash: txData.hash,
                blockNumber: txData.blockNumber || 0,
                from: txData.from,
                to: txData.to || '',
                value: ethers.formatEther(txData.value),
                gasUsed: receipt?.gasUsed.toString(),
                timestamp: block.timestamp,
              });
              
              if (transactions.length >= limit) break;
            }
          }
        } catch (blockError) {
          // Skip blocks that can't be fetched
          continue;
        }
      }
      
      return transactions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      this.logger.error(`Failed to get recent transactions for ${address}:`, error.message);
      return [];
    }
  }

  async cleanupOldPendingTransactions(): Promise<void> {
    const currentTime = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    for (const [hash, tx] of this.pendingTransactions.entries()) {
      try {
        // Check if transaction is still pending
        const receipt = await this.provider.getTransactionReceipt(hash);
        if (receipt) {
          this.pendingTransactions.delete(hash);
          continue;
        }
        
        // Remove old pending transactions (they might be dropped)
        // Note: This is simplified - in production you'd want more sophisticated cleanup
        const txAge = currentTime - (Date.now() - 1800000); // Rough estimate
        if (txAge > maxAge) {
          this.logger.warn(`Removing old pending transaction: ${hash}`);
          this.pendingTransactions.delete(hash);
        }
      } catch (error) {
        // Remove transactions that cause errors
        this.pendingTransactions.delete(hash);
      }
    }
  }
}
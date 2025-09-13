import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface DomainMetadata {
  tokenId: string;
  name: string;
  registrar: string;
  registrationDate: Date;
  expirationDate: Date;
  owner: string;
  transactions: DomainTransaction[];
  tokenizationDate?: Date;
}

export interface DomainTransaction {
  timestamp: Date;
  price: string;
  type: string;
  transactionHash?: string;
}

@Injectable()
export class DomainMetadataService {
  private readonly logger = new Logger(DomainMetadataService.name);
  private readonly domaSubgraphUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.domaSubgraphUrl = this.configService.get<string>('externalApis.domaSubgraph');
  }

  /**
   * Fetch domain metadata from Doma Subgraph
   */
  async getDomainMetadata(tokenId: string): Promise<DomainMetadata | null> {
    try {
      const query = `
        query GetDomain($tokenId: String!) {
          domain(id: $tokenId) {
            tokenId
            name
            registrar
            registrationDate
            expirationDate
            owner
            tokenizationDate
            transactions(orderBy: timestamp, orderDirection: desc, first: 20) {
              timestamp
              price
              type
              transactionHash
              from
              to
            }
          }
        }
      `;

      const response = await firstValueFrom(
        this.httpService.post(
          this.domaSubgraphUrl,
          { query, variables: { tokenId } },
          { timeout: 10000 }
        )
      );

      const domainData = response.data?.data?.domain;
      if (!domainData) {
        this.logger.warn(`No domain data found for tokenId: ${tokenId}`);
        return null;
      }

      return this.formatDomainMetadata(domainData);

    } catch (error) {
      this.logger.error(`Error fetching domain metadata for ${tokenId}:`, error.message);
      return null;
    }
  }

  /**
   * Get domain metadata from cache or fetch fresh
   */
  async getDomainMetadataWithCache(tokenId: string, maxAge: number = 3600): Promise<DomainMetadata | null> {
    // TODO: Implement Redis caching
    return this.getDomainMetadata(tokenId);
  }

  /**
   * Batch fetch multiple domain metadata
   */
  async batchGetDomainMetadata(tokenIds: string[]): Promise<Map<string, DomainMetadata>> {
    const results = new Map<string, DomainMetadata>();
    
    // Process in chunks to avoid overwhelming the API
    const chunkSize = 5;
    for (let i = 0; i < tokenIds.length; i += chunkSize) {
      const chunk = tokenIds.slice(i, i + chunkSize);
      
      const promises = chunk.map(async (tokenId) => {
        const metadata = await this.getDomainMetadata(tokenId);
        if (metadata) {
          results.set(tokenId, metadata);
        }
        return metadata;
      });

      await Promise.all(promises);
      
      // Small delay between chunks
      if (i + chunkSize < tokenIds.length) {
        await this.delay(100);
      }
    }

    return results;
  }

  /**
   * Check if domain exists in Doma Protocol
   */
  async domainExists(tokenId: string): Promise<boolean> {
    try {
      const metadata = await this.getDomainMetadata(tokenId);
      return metadata !== null;
    } catch (error) {
      this.logger.error(`Error checking domain existence for ${tokenId}:`, error.message);
      return false;
    }
  }

  /**
   * Get domain trading history
   */
  async getDomainTradingHistory(tokenId: string): Promise<DomainTransaction[]> {
    const metadata = await this.getDomainMetadata(tokenId);
    return metadata?.transactions || [];
  }

  /**
   * Get domain age in days
   */
  getDomainAge(metadata: DomainMetadata): number {
    const now = new Date();
    const registrationDate = new Date(metadata.registrationDate);
    const ageInMs = now.getTime() - registrationDate.getTime();
    return Math.floor(ageInMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Get days until expiration
   */
  getDaysUntilExpiration(metadata: DomainMetadata): number {
    const now = new Date();
    const expirationDate = new Date(metadata.expirationDate);
    const daysUntilExpiration = Math.floor((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysUntilExpiration);
  }

  /**
   * Check if domain is expired
   */
  isDomainExpired(metadata: DomainMetadata): boolean {
    return this.getDaysUntilExpiration(metadata) <= 0;
  }

  /**
   * Calculate average trading price
   */
  calculateAverageTradingPrice(transactions: DomainTransaction[]): number {
    if (!transactions.length) return 0;
    
    const validPrices = transactions
      .map(tx => parseFloat(tx.price))
      .filter(price => !isNaN(price) && price > 0);
    
    if (!validPrices.length) return 0;
    
    return validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length;
  }

  /**
   * Get latest trading price
   */
  getLatestTradingPrice(transactions: DomainTransaction[]): number {
    if (!transactions.length) return 0;
    
    const latestTransaction = transactions.find(tx => parseFloat(tx.price) > 0);
    return latestTransaction ? parseFloat(latestTransaction.price) : 0;
  }

  /**
   * Private helper methods
   */
  private formatDomainMetadata(rawData: any): DomainMetadata {
    return {
      tokenId: rawData.tokenId,
      name: rawData.name,
      registrar: rawData.registrar,
      registrationDate: new Date(rawData.registrationDate * 1000),
      expirationDate: new Date(rawData.expirationDate * 1000),
      owner: rawData.owner,
      tokenizationDate: rawData.tokenizationDate ? new Date(rawData.tokenizationDate * 1000) : undefined,
      transactions: rawData.transactions.map((tx: any) => ({
        timestamp: new Date(tx.timestamp * 1000),
        price: tx.price,
        type: tx.type,
        transactionHash: tx.transactionHash,
      })),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
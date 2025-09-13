import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { TrafficMetrics } from './traffic-analysis.service';

@Injectable()
export class AhrefsService {
  private readonly logger = new Logger(AhrefsService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://apiv2.ahrefs.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get('externalApis.ahrefs.apiKey');
  }

  async getDomainMetrics(domain: string): Promise<TrafficMetrics | null> {
    if (!this.apiKey) {
      this.logger.warn('Ahrefs API key not configured');
      return null;
    }

    try {
      this.logger.log(`Fetching Ahrefs metrics for: ${domain}`);

      const response = await this.httpService.axiosRef.get(
        `${this.baseUrl}/domain-rating`,
        {
          params: {
            token: this.apiKey,
            target: domain,
            mode: 'domain',
            output: 'json',
          },
          timeout: 10000,
        }
      );

      if (!response.data?.domain) {
        return null;
      }

      const data = response.data.domain;
      
      return {
        monthlyVisitors: this.estimateVisitors(data.domain_rating, data.ahrefs_rank),
        domainRating: data.domain_rating || 0,
        organicTraffic: data.organic_traffic || 0,
        backlinks: data.backlinks || 0,
        referringDomains: data.referring_domains || 0,
        confidenceScore: 85, // High confidence for Ahrefs data
        dataSource: 'ahrefs',
      };
    } catch (error) {
      this.logger.error(`Ahrefs API error for ${domain}:`, error.message);
      return null;
    }
  }

  async getKeywordDifficulty(keyword: string): Promise<number | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await this.httpService.axiosRef.get(
        `${this.baseUrl}/keywords-explorer`,
        {
          params: {
            token: this.apiKey,
            keyword: keyword,
            country: 'US',
            output: 'json',
          },
          timeout: 10000,
        }
      );

      return response.data?.keywords?.[0]?.keyword_difficulty || null;
    } catch (error) {
      this.logger.error(`Ahrefs keyword difficulty error for ${keyword}:`, error.message);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      // Test with a simple account info request
      const response = await this.httpService.axiosRef.get(
        `${this.baseUrl}/subscription-info`,
        {
          params: {
            token: this.apiKey,
          },
          timeout: 5000,
        }
      );

      return response.status === 200 && response.data?.subscription;
    } catch (error) {
      this.logger.error('Ahrefs health check failed:', error.message);
      return false;
    }
  }

  private estimateVisitors(domainRating: number, ahrefsRank: number): number {
    // Estimate monthly visitors based on domain rating and Ahrefs rank
    let baseVisitors = 1000;
    
    if (domainRating > 70) baseVisitors = 100000;
    else if (domainRating > 50) baseVisitors = 50000;
    else if (domainRating > 30) baseVisitors = 10000;
    else if (domainRating > 10) baseVisitors = 5000;
    
    // Adjust based on Ahrefs rank if available
    if (ahrefsRank) {
      if (ahrefsRank < 1000) baseVisitors *= 10;
      else if (ahrefsRank < 10000) baseVisitors *= 5;
      else if (ahrefsRank < 100000) baseVisitors *= 2;
    }
    
    return Math.round(baseVisitors);
  }
}
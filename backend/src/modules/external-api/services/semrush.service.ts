import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { TrafficMetrics } from './traffic-analysis.service';

@Injectable()
export class SemrushService {
  private readonly logger = new Logger(SemrushService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.semrush.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get('externalApis.semrush.apiKey');
  }

  async getDomainMetrics(domain: string): Promise<TrafficMetrics | null> {
    if (!this.apiKey) {
      this.logger.warn('SEMrush API key not configured');
      return null;
    }

    try {
      this.logger.log(`Fetching SEMrush metrics for: ${domain}`);

      // Get domain overview data
      const response = await this.httpService.axiosRef.get(this.baseUrl, {
        params: {
          type: 'domain_overview',
          key: this.apiKey,
          domain: domain,
          export_columns: 'Or,Ot,Oc,Ad,At,Ac,FKn,FPn',
          database: 'us',
        },
        timeout: 10000,
      });

      if (!response.data) {
        return null;
      }

      // Parse CSV response
      const lines = response.data.split('\n');
      if (lines.length < 2) {
        return null;
      }

      const headers = lines[0].split(';');
      const values = lines[1].split(';');
      
      const data: Record<string, string> = {};
      headers.forEach((header: string, index: number) => {
        data[header.trim()] = values[index]?.trim() || '';
      });

      const organicKeywords = parseInt(data['Or']) || 0;
      const organicTraffic = parseInt(data['Ot']) || 0;
      const organicCost = parseFloat(data['Oc']) || 0;
      
      return {
        monthlyVisitors: this.estimateVisitors(organicTraffic, organicKeywords),
        domainRating: this.calculateDomainRating(organicKeywords, organicCost),
        organicTraffic: organicTraffic,
        backlinks: 0, // SEMrush doesn't provide backlinks in domain overview
        referringDomains: 0, // Not available in basic overview
        confidenceScore: 80, // High confidence for SEMrush data
        dataSource: 'semrush',
      };
    } catch (error) {
      this.logger.error(`SEMrush API error for ${domain}:`, error.message);
      return null;
    }
  }

  async getKeywordData(keyword: string): Promise<{
    volume: number;
    difficulty: number;
    cpc: number;
  } | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await this.httpService.axiosRef.get(this.baseUrl, {
        params: {
          type: 'phrase_this',
          key: this.apiKey,
          phrase: keyword,
          export_columns: 'Ph,Nq,Cp,Co',
          database: 'us',
        },
        timeout: 10000,
      });

      const lines = response.data.split('\n');
      if (lines.length < 2) {
        return null;
      }

      const values = lines[1].split(';');
      
      return {
        volume: parseInt(values[1]) || 0,
        difficulty: parseFloat(values[3]) || 0,
        cpc: parseFloat(values[2]) || 0,
      };
    } catch (error) {
      this.logger.error(`SEMrush keyword data error for ${keyword}:`, error.message);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      // Test with a simple account info request
      const response = await this.httpService.axiosRef.get(this.baseUrl, {
        params: {
          type: 'info',
          key: this.apiKey,
        },
        timeout: 5000,
      });

      return response.status === 200 && response.data?.includes('subscription_type');
    } catch (error) {
      this.logger.error('SEMrush health check failed:', error.message);
      return false;
    }
  }

  private estimateVisitors(organicTraffic: number, organicKeywords: number): number {
    // Estimate monthly visitors based on organic traffic and keyword count
    let baseVisitors = organicTraffic * 30; // Convert daily to monthly
    
    // Boost estimation based on keyword diversity
    if (organicKeywords > 10000) baseVisitors *= 1.5;
    else if (organicKeywords > 1000) baseVisitors *= 1.2;
    else if (organicKeywords > 100) baseVisitors *= 1.1;
    
    return Math.round(Math.max(baseVisitors, 100));
  }

  private calculateDomainRating(organicKeywords: number, organicCost: number): number {
    // Calculate domain rating based on organic presence
    let rating = 0;
    
    // Keywords factor (0-60 points)
    if (organicKeywords > 100000) rating += 60;
    else if (organicKeywords > 10000) rating += 50;
    else if (organicKeywords > 1000) rating += 40;
    else if (organicKeywords > 100) rating += 30;
    else if (organicKeywords > 10) rating += 20;
    else if (organicKeywords > 0) rating += 10;
    
    // Organic cost factor (0-40 points)
    if (organicCost > 100000) rating += 40;
    else if (organicCost > 10000) rating += 30;
    else if (organicCost > 1000) rating += 20;
    else if (organicCost > 100) rating += 10;
    else if (organicCost > 0) rating += 5;
    
    return Math.min(100, rating);
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';

export interface TrafficMetrics {
  monthlyVisitors: number;
  domainRating: number; // 0-100
  organicTraffic: number;
  backlinks: number;
  referringDomains: number;
  confidenceScore: number; // How confident we are in this data
  dataSource: string;
}

@Injectable()
export class TrafficAnalysisService {
  private readonly logger = new Logger(TrafficAnalysisService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Get aggregated traffic metrics from multiple sources
   */
  async getTrafficMetrics(domain: string): Promise<TrafficMetrics> {
    this.logger.log(`Analyzing traffic for domain: ${domain}`);
    
    // Clean domain name
    const cleanDomain = this.cleanDomainName(domain);
    
    try {
      // For now, return heuristic-based metrics
      // In production, integrate with real APIs (Ahrefs, SEMrush, SimilarWeb)
      return this.estimateTrafficHeuristically(cleanDomain);
    } catch (error) {
      this.logger.error(`Traffic analysis failed for ${domain}:`, error.message);
      return this.getDefaultTrafficMetrics();
    }
  }

  /**
   * Health check for traffic analysis APIs
   */
  async healthCheck(): Promise<{
    ahrefs: boolean;
    semrush: boolean;
    similarweb: boolean;
    availableApis: number;
  }> {
    const ahrefsKey = this.configService.get('externalApis.ahrefs.apiKey');
    const semrushKey = this.configService.get('externalApis.semrush.apiKey');
    const similarwebKey = this.configService.get('externalApis.similarweb.apiKey');

    return {
      ahrefs: Boolean(ahrefsKey),
      semrush: Boolean(semrushKey),
      similarweb: Boolean(similarwebKey),
      availableApis: [ahrefsKey, semrushKey, similarwebKey].filter(Boolean).length,
    };
  }

  /**
   * Private helper methods
   */
  private cleanDomainName(domain: string): string {
    return domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .toLowerCase()
      .trim();
  }

  private estimateTrafficHeuristically(domain: string): TrafficMetrics {
    const sld = domain.split('.')[0];
    const tld = domain.split('.').pop() || '';
    
    let baseScore = 10; // Base score for any domain
    
    // Length factor
    if (sld.length <= 4) baseScore += 50;
    else if (sld.length <= 6) baseScore += 30;
    else if (sld.length <= 8) baseScore += 15;
    else if (sld.length <= 12) baseScore += 5;
    
    // TLD factor
    const tldMultipliers: Record<string, number> = {
      'com': 3.0,
      'net': 2.0,
      'org': 2.0,
      'io': 1.8,
      'ai': 1.5,
      'co': 1.3,
    };
    
    const tldMultiplier = tldMultipliers[tld] || 1.0;
    baseScore *= tldMultiplier;
    
    // Check for dictionary words or common patterns
    const commonWords = ['app', 'web', 'tech', 'digital', 'online', 'data', 'cloud', 'smart'];
    if (commonWords.some(word => sld.includes(word))) {
      baseScore *= 1.5;
    }
    
    // Estimate metrics based on score
    const estimatedVisitors = Math.round(baseScore * 100);
    const domainRating = Math.min(baseScore, 100);
    
    return {
      monthlyVisitors: estimatedVisitors,
      domainRating,
      organicTraffic: Math.round(estimatedVisitors * 0.7),
      backlinks: Math.round(estimatedVisitors / 10),
      referringDomains: Math.round(estimatedVisitors / 50),
      confidenceScore: 30, // Low confidence for heuristic estimation
      dataSource: 'heuristic',
    };
  }

  private getDefaultTrafficMetrics(): TrafficMetrics {
    return {
      monthlyVisitors: 100,
      domainRating: 10,
      organicTraffic: 70,
      backlinks: 10,
      referringDomains: 2,
      confidenceScore: 10,
      dataSource: 'default',
    };
  }
}
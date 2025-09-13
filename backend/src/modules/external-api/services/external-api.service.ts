import { Injectable, Logger } from '@nestjs/common';
import { TrafficAnalysisService, TrafficMetrics } from './traffic-analysis.service';
import { KeywordAnalysisService, KeywordMetrics } from './keyword-analysis.service';

export { TrafficMetrics, KeywordMetrics };

@Injectable()
export class ExternalApiService {
  private readonly logger = new Logger(ExternalApiService.name);

  constructor(
    private readonly trafficAnalysisService: TrafficAnalysisService,
    private readonly keywordAnalysisService: KeywordAnalysisService,
  ) {}

  /**
   * Get comprehensive traffic metrics for a domain
   */
  async getTrafficMetrics(domain: string): Promise<TrafficMetrics> {
    this.logger.log(`Fetching traffic metrics for: ${domain}`);
    return this.trafficAnalysisService.getTrafficMetrics(domain);
  }

  /**
   * Perform keyword and brandability analysis
   */
  async analyzeKeywords(domainName: string): Promise<KeywordMetrics> {
    this.logger.log(`Analyzing keywords for: ${domainName}`);
    return this.keywordAnalysisService.analyzeKeywords(domainName);
  }

  /**
   * Health check for all external APIs
   */
  async healthCheck(): Promise<{
    traffic: any;
    keywords: boolean;
    overall: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    const [trafficHealth, keywordHealth] = await Promise.all([
      this.trafficAnalysisService.healthCheck(),
      Promise.resolve(true), // Keyword analysis is internal, always healthy
    ]);

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (trafficHealth.availableApis === 0) {
      overall = 'unhealthy';
    } else if (trafficHealth.availableApis < 2) {
      overall = 'degraded';
    }

    return {
      traffic: trafficHealth,
      keywords: keywordHealth,
      overall,
    };
  }

  /**
   * Test API connectivity with a sample domain
   */
  async testApiConnectivity(testDomain: string = 'example.com'): Promise<{
    traffic: boolean;
    keywords: boolean;
    latency: { traffic: number; keywords: number };
  }> {
    const startTime = Date.now();
    
    try {
      const trafficStart = Date.now();
      await this.getTrafficMetrics(testDomain);
      const trafficLatency = Date.now() - trafficStart;

      const keywordsStart = Date.now();
      await this.analyzeKeywords(testDomain);
      const keywordsLatency = Date.now() - keywordsStart;

      return {
        traffic: true,
        keywords: true,
        latency: {
          traffic: trafficLatency,
          keywords: keywordsLatency,
        },
      };
    } catch (error) {
      this.logger.error('API connectivity test failed:', error.message);
      return {
        traffic: false,
        keywords: false,
        latency: {
          traffic: -1,
          keywords: -1,
        },
      };
    }
  }
}
import { Controller, Get, Post, Param, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DomainScoreCacheService } from '../services/domain-score-cache.service';

@ApiTags('indexer')
@Controller('indexer')
export class IndexerController {
  private readonly logger = new Logger(IndexerController.name);

  constructor(
    private readonly domainScoreCacheService: DomainScoreCacheService,
  ) {}

  @Get('domains/:domain/score')
  @ApiOperation({ summary: 'Get domain score for indexer integration (database-first with rate limiting)' })
  @ApiParam({ name: 'domain', description: 'Domain name (e.g., cocacola.com)', example: 'cocacola.com' })
  @ApiResponse({ status: 200, description: 'Domain score for indexer integration' })
  async getDomainScoreForIndexer(@Param('domain') domain: string) {
    try {
      this.logger.log(`[Indexer] Scoring request for: ${domain}`);
      
      // Use database-first approach with 7-day cache and rate limiting
      const scoreData = await this.domainScoreCacheService.getDomainScore(domain, 7 * 24);
      const rateLimitInfo = this.domainScoreCacheService.getRateLimitInfo(domain);
      
      // Return format expected by indexer
      const response = {
        totalScore: scoreData.totalScore,
        confidence: scoreData.confidence,
        reasoning: scoreData.reasoning,
        brandScore: scoreData.brandScore || 0,
        technicalScore: scoreData.technicalScore || 0,
        riskScore: scoreData.riskScore || 50,
        // Cache metadata
        isFromCache: scoreData.isFromCache,
        cacheAge: scoreData.cacheAge || 0,
        // Rate limiting info
        rateLimited: rateLimitInfo.isRateLimited,
        minutesUntilNextScore: rateLimitInfo.minutesUntilNextScore,
      };

      const cacheStatus = scoreData.isFromCache ? `CACHED (${scoreData.cacheAge}m old)` : 'FRESH';
      const rateLimitStatus = rateLimitInfo.isRateLimited ? ` [RATE LIMITED: ${rateLimitInfo.minutesUntilNextScore}m remaining]` : '';
      this.logger.log(`[Indexer] ✅ ${domain}: ${response.totalScore}/100 [${cacheStatus}]${rateLimitStatus}`);
      return response;
    } catch (error) {
      this.logger.error(`[Indexer] ❌ Scoring failed for ${domain}:`, error.message);
      return { 
        error: 'Domain scoring failed', 
        message: error.message,
        totalScore: 50,
        confidence: 20,
        reasoning: `Fallback score due to error: ${error.message}`,
        isFromCache: false,
        cacheAge: 0,
        rateLimited: false,
        minutesUntilNextScore: 0,
      };
    }
  }

  @Get('domains/:domain/rate-limit')
  @ApiOperation({ summary: 'Check rate limiting status for a domain' })
  @ApiParam({ name: 'domain', description: 'Domain name to check', example: 'cocacola.com' })
  @ApiResponse({ status: 200, description: 'Rate limiting information' })
  async checkRateLimit(@Param('domain') domain: string) {
    const rateLimitInfo = this.domainScoreCacheService.getRateLimitInfo(domain);
    return {
      domain,
      rateLimited: rateLimitInfo.isRateLimited,
      minutesUntilNextScore: rateLimitInfo.minutesUntilNextScore,
      message: rateLimitInfo.isRateLimited 
        ? `Rate limited. Next scoring allowed in ${rateLimitInfo.minutesUntilNextScore} minutes.`
        : 'No rate limiting active. Scoring available immediately.'
    };
  }

  @Post('bulk-test')
  @ApiOperation({ summary: 'Bulk test scoring for indexer (database-first batch)' })
  @ApiResponse({ status: 200, description: 'Bulk scoring completed' })
  async bulkTest(@Body() data?: { domains?: string[] }) {
    const testDomains = data?.domains || [
      // Test domains optimized for proven scoring
      'cocacola.com', 'nike.com', 'apple.com', 'google.com',
      'randomdomain123.com', 'testdomain456.net'
    ];

    this.logger.log(`[Indexer] Bulk scoring ${testDomains.length} domains`);

    try {
      // Use efficient batch processing with database-first approach
      const batchResults = await this.domainScoreCacheService.batchGetDomainScores(testDomains, 7 * 24);
      
      // Transform to expected format
      const results = {};
      let cacheHits = 0;
      
      for (const [domain, scoreData] of Object.entries(batchResults)) {
        results[domain] = {
          totalScore: scoreData.totalScore,
          confidence: scoreData.confidence,
          reasoning: scoreData.reasoning,
          isFromCache: scoreData.isFromCache,
          cacheAge: scoreData.cacheAge,
        };
        
        if (scoreData.isFromCache) cacheHits++;
      }

      this.logger.log(`[Indexer] ✅ Bulk completed: ${cacheHits}/${testDomains.length} cache hits`);

      return {
        message: 'Bulk testing completed (database-first)',
        totalDomains: testDomains.length,
        cacheHits,
        performance: {
          cacheHitRate: `${Math.round((cacheHits / testDomains.length) * 100)}%`,
          strategy: 'database-first-with-ai-fallback'
        },
        results
      };
    } catch (error) {
      this.logger.error(`[Indexer] Bulk test failed:`, error.message);
      
      // Return fallback results
      const results = {};
      for (const domain of testDomains) {
        results[domain] = {
          error: error.message,
          totalScore: 50,
          confidence: 20,
          reasoning: 'Bulk scoring error',
          isFromCache: false,
          cacheAge: 0,
        };
      }
      
      return {
        message: 'Bulk testing failed',
        totalDomains: testDomains.length,
        error: error.message,
        results
      };
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for indexer integration' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  async healthCheck() {
    try {
      const cacheHealth = await this.domainScoreCacheService.healthCheck();
      
      return {
        status: 'healthy',
        service: 'DomaLend Backend (Database-First)',
        timestamp: new Date().toISOString(),
        cache: cacheHealth,
        endpoints: {
          domainScore: '/indexer/domains/{domain}/score',
          bulkTest: '/indexer/bulk-test',
          health: '/indexer/health'
        },
        features: {
          databaseFirst: true,
          aiScoring: true,
          batchProcessing: true,
          smartCaching: true
        }
      };
    } catch (error) {
      return {
        status: 'degraded',
        service: 'DomaLend Backend',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}
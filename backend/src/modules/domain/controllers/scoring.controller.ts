import { Controller, Get, Post, Param, Body, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DomainScoringService } from '../services/domain-scoring.service';
import { HybridScoringService } from '../services/hybrid-scoring.service';
import { DomainScoreCacheService } from '../services/domain-score-cache.service';

@ApiTags('domains')
@Controller('domains')
export class ScoringController {
  private readonly logger = new Logger(ScoringController.name);

  constructor(
    private readonly domainScoringService: DomainScoringService,
    private readonly hybridScoringService: HybridScoringService,
    private readonly domainScoreCacheService: DomainScoreCacheService,
  ) {
    this.logger.log('ScoringController constructed successfully');
  }

  @Get('ai-score')
  @ApiOperation({ summary: 'Get AI-powered domain analysis by domain name with 7-day caching' })
  @ApiQuery({ name: 'domain', description: 'Domain name (e.g., cocacola.com)', example: 'cocacola.com' })
  @ApiResponse({ status: 200, description: 'Complete domain analysis with AI scoring, cached for 7 days' })
  async getDomainAnalysis(@Query('domain') domain: string) {
    if (!domain) {
      return { error: 'Domain parameter is required' };
    }

    try {
      this.logger.log(`[User] AI domain analysis request for: ${domain}`);

      // Use intelligent caching for OpenAI results (7 days for production)
      const cachedScore = await this.domainScoreCacheService.getDomainScore(domain, 7 * 24);

      if (cachedScore.isFromCache) {
        this.logger.log(`[User] ✅ Returning cached OpenAI score for ${domain} (age: ${cachedScore.cacheAge}m)`);
        return {
          totalScore: cachedScore.totalScore,
          confidence: cachedScore.confidence,
          reasoning: cachedScore.reasoning,
          brandScore: cachedScore.brandScore,
          technicalScore: cachedScore.technicalScore,
          riskScore: cachedScore.riskScore,
          _cacheInfo: {
            isFromCache: true,
            cacheAge: cachedScore.cacheAge,
            rateLimited: false
          }
        };
      } else {
        this.logger.log(`[User] 🚀 Generating fresh OpenAI analysis for ${domain}`);
      }

      // Generate fresh OpenAI analysis
      const fullAnalysis = await this.hybridScoringService.generateStandardizedScore(domain);

      // Add cache metadata to the response
      return {
        ...fullAnalysis,
        _cacheInfo: {
          isFromCache: false,
          cacheAge: 0,
          rateLimited: false
        }
      };

    } catch (error) {
      this.logger.error(`[User] AI domain analysis failed for ${domain}:`, error.message);
      return {
        error: 'Domain analysis failed',
        message: error.message,
        domain
      };
    }
  }




}
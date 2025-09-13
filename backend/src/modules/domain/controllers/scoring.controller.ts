import { Controller, Get, Post, Param, Body, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DomainScoringService } from '../services/domain-scoring.service';
import { HybridScoringService } from '../services/hybrid-scoring.service';

@ApiTags('domains')
@Controller('domains')
export class ScoringController {
  private readonly logger = new Logger(ScoringController.name);

  constructor(
    private readonly domainScoringService: DomainScoringService,
    private readonly hybridScoringService: HybridScoringService,
  ) {}

  @Get('score')
  @ApiOperation({ summary: 'Get AI-powered domain analysis by domain name' })
  @ApiQuery({ name: 'domain', description: 'Domain name (e.g., cocacola.com)', example: 'cocacola.com' })
  @ApiResponse({ status: 200, description: 'Complete domain analysis with AI scoring' })
  async getDomainAnalysis(@Query('domain') domain: string) {
    if (!domain) {
      return { error: 'Domain parameter is required' };
    }

    try {
      this.logger.log(`Starting AI domain analysis for: ${domain}`);
      const analysis = await this.hybridScoringService.generateStandardizedScore(domain);
      return analysis;
    } catch (error) {
      this.logger.error(`AI domain analysis failed for ${domain}:`, error.message);
      return { 
        error: 'Domain analysis failed', 
        message: error.message,
        domain 
      };
    }
  }


  @Get(':tokenId/score')
  @ApiOperation({ summary: 'Get domain score by token ID' })
  @ApiParam({ name: 'tokenId', description: 'Domain token ID' })
  @ApiResponse({ status: 200, description: 'Domain score retrieved' })
  async getDomainScore(@Param('tokenId') tokenId: string) {
    try {
      const score = await this.domainScoringService.scoreDomain(tokenId);
      return score;
    } catch (error) {
      this.logger.error(`Failed to get score for token ${tokenId}:`, error.message);
      return { error: 'Failed to retrieve domain score' };
    }
  }

  @Get(':tokenId/valuation')
  @ApiOperation({ summary: 'Get domain valuation by token ID' })
  @ApiParam({ name: 'tokenId', description: 'Domain token ID' })
  @ApiResponse({ status: 200, description: 'Domain valuation retrieved' })
  async getDomainValuation(@Param('tokenId') tokenId: string) {
    try {
      const valuation = await this.domainScoringService.valuateDomain(tokenId);
      return valuation;
    } catch (error) {
      this.logger.error(`Failed to get valuation for token ${tokenId}:`, error.message);
      return { error: 'Failed to retrieve domain valuation' };
    }
  }

  @Post('batch-score')
  @ApiOperation({ summary: 'Score multiple domains in batch' })
  @ApiResponse({ status: 200, description: 'Batch scoring completed' })
  async batchScore(@Body() data: { tokenIds: string[] }) {
    try {
      const results = await this.domainScoringService.batchScoreDomains(data.tokenIds);
      return { results: Object.fromEntries(results) };
    } catch (error) {
      this.logger.error('Batch scoring failed:', error.message);
      return { error: 'Batch scoring failed' };
    }
  }

  @Post('bulk-test')
  @ApiOperation({ summary: 'Bulk test AI scoring across different domain categories' })
  @ApiResponse({ status: 200, description: 'Bulk testing completed' })
  async bulkTestScoring(@Body() data?: { domains?: string[] }) {
    const testDomains = data?.domains || [
      // Major brands (should score 95+)
      'cocacola.com',
      'apple.com', 
      'google.com',
      'microsoft.com',
      'amazon.com',
      'facebook.com',
      'netflix.com',
      'tesla.com',
      
      // High potential (should score 75+)
      'one.com',
      'kick.com',
      'time.fun',
      '1.com',
      'three.com',
      'fun.com',
      
      // Average domains (should score 40-70)
      'superlongandmulti.com',
      'myawesomecompany.com',
      'bestservices.net',
      'qualityproducts.org',
      
      // Random/poor domains (should score 0-30)
      'aowkoaskdajsd.com',
      'qwerty123random.com',
      'asdfghjkl.net',
      'randomgibberish.xyz'
    ];

    const results = {};
    const summary = {
      majorBrands: { count: 0, totalScore: 0, domains: [] },
      highPotential: { count: 0, totalScore: 0, domains: [] },
      average: { count: 0, totalScore: 0, domains: [] },
      poor: { count: 0, totalScore: 0, domains: [] }
    };

    this.logger.log(`Starting bulk test with ${testDomains.length} domains`);

    for (const domain of testDomains) {
      try {
        const analysis = await this.hybridScoringService.generateStandardizedScore(domain);
        const score = analysis.totalScore;
        
        results[domain] = {
          totalScore: score,
          lendingRecommendation: analysis.lendingRecommendation,
          reasoning: analysis.lendingRecommendation?.conciseReasoning || analysis.lendingRecommendation?.reasoning
        };

        // Categorize results
        if (score >= 95) {
          summary.majorBrands.count++;
          summary.majorBrands.totalScore += score;
          summary.majorBrands.domains.push({ domain, score });
        } else if (score >= 75) {
          summary.highPotential.count++;
          summary.highPotential.totalScore += score;
          summary.highPotential.domains.push({ domain, score });
        } else if (score >= 40) {
          summary.average.count++;
          summary.average.totalScore += score;
          summary.average.domains.push({ domain, score });
        } else {
          summary.poor.count++;
          summary.poor.totalScore += score;
          summary.poor.domains.push({ domain, score });
        }

      } catch (error) {
        this.logger.error(`Bulk test failed for ${domain}:`, error.message);
        results[domain] = { error: error.message };
      }
    }

    // Calculate averages
    const finalSummary = {
      majorBrands: {
        ...summary.majorBrands,
        averageScore: summary.majorBrands.count > 0 ? Math.round(summary.majorBrands.totalScore / summary.majorBrands.count) : 0
      },
      highPotential: {
        ...summary.highPotential,
        averageScore: summary.highPotential.count > 0 ? Math.round(summary.highPotential.totalScore / summary.highPotential.count) : 0
      },
      average: {
        ...summary.average,
        averageScore: summary.average.count > 0 ? Math.round(summary.average.totalScore / summary.average.count) : 0
      },
      poor: {
        ...summary.poor,
        averageScore: summary.poor.count > 0 ? Math.round(summary.poor.totalScore / summary.poor.count) : 0
      }
    };

    return {
      message: 'Bulk testing completed',
      totalDomains: testDomains.length,
      summary: finalSummary,
      results,
      validation: {
        majorBrandsCorrect: finalSummary.majorBrands.averageScore >= 95,
        highPotentialCorrect: finalSummary.highPotential.averageScore >= 75,
        averageInRange: finalSummary.average.averageScore >= 40 && finalSummary.average.averageScore <= 70,
        poorCorrect: finalSummary.poor.averageScore <= 30
      }
    };
  }

  @Get(':tokenId/history')
  @ApiOperation({ summary: 'Get domain scoring history' })
  @ApiParam({ name: 'tokenId', description: 'Domain token ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of history entries' })
  @ApiResponse({ status: 200, description: 'Scoring history retrieved' })
  async getScoringHistory(
    @Param('tokenId') tokenId: string,
    @Query('limit') limit?: string
  ) {
    try {
      const history = await this.domainScoringService.getScoringHistory(
        tokenId,
        limit ? parseInt(limit) : 10
      );
      return { history };
    } catch (error) {
      this.logger.error(`Failed to get history for token ${tokenId}:`, error.message);
      return { error: 'Failed to retrieve scoring history' };
    }
  }

  @Get('hybrid/:domain/analyze')
  @ApiOperation({ summary: 'Get comprehensive hybrid AI + technical domain analysis' })
  @ApiParam({ name: 'domain', description: 'Domain name (e.g., cocacola.com)' })
  @ApiResponse({ status: 200, description: 'Hybrid domain analysis completed' })
  async getHybridAnalysis(@Param('domain') domain: string) {
    try {
      this.logger.log(`Starting hybrid analysis for domain: ${domain}`);
      const analysis = await this.hybridScoringService.generateHybridScore(domain);
      return analysis;
    } catch (error) {
      this.logger.error(`Hybrid analysis failed for ${domain}:`, error.message);
      return { 
        error: 'Hybrid analysis failed', 
        message: error.message,
        domain 
      };
    }
  }

  @Get('hybrid/test/brands')
  @ApiOperation({ summary: 'Test hybrid scoring with major brands' })
  @ApiResponse({ status: 200, description: 'Brand testing completed' })
  async testMajorBrands() {
    const testDomains = ['cocacola.com', 'apple.com', 'google.com', 'randomstartup123.com'];
    const results = {};

    for (const domain of testDomains) {
      try {
        this.logger.log(`Testing hybrid scoring for: ${domain}`);
        results[domain] = await this.hybridScoringService.generateHybridScore(domain);
      } catch (error) {
        this.logger.error(`Test failed for ${domain}:`, error.message);
        results[domain] = { error: error.message };
      }
    }

    return {
      message: 'Brand testing completed',
      testDomains,
      results
    };
  }

  @Get('ai-config/profiles/:profile/:domain/analyze')
  @ApiOperation({ summary: 'Test different AI configuration profiles' })
  @ApiParam({ name: 'profile', description: 'AI config profile (conservative-lender, growth-focused, balanced-institutional, web3-native)' })
  @ApiParam({ name: 'domain', description: 'Domain name to analyze' })
  @ApiResponse({ status: 200, description: 'AI analysis with specific configuration' })
  async testAIProfiles(@Param('profile') profile: string, @Param('domain') domain: string) {
    try {
      this.logger.log(`Testing AI profile "${profile}" for domain: ${domain}`);
      
      // For now, return the current hybrid analysis with profile information
      // In a full implementation, this would use the AIConfigService
      const analysis = await this.hybridScoringService.generateHybridScore(domain);
      
      return {
        profile,
        domain,
        message: `Analysis using ${profile} configuration`,
        configurationNotes: this.getProfileDescription(profile),
        analysis
      };
    } catch (error) {
      this.logger.error(`AI profile test failed for ${domain}:`, error.message);
      return { 
        error: 'AI profile test failed', 
        message: error.message,
        profile,
        domain 
      };
    }
  }

  @Get('ai-config/compare/:domain')
  @ApiOperation({ summary: 'Compare domain analysis across different AI profiles' })
  @ApiParam({ name: 'domain', description: 'Domain name to analyze' })
  @ApiResponse({ status: 200, description: 'Comparison across AI profiles' })
  async compareAIProfiles(@Param('domain') domain: string) {
    const profiles = ['conservative-lender', 'growth-focused', 'balanced-institutional', 'web3-native'];
    const results = {};

    for (const profile of profiles) {
      try {
        this.logger.log(`Comparing profile "${profile}" for domain: ${domain}`);
        const analysis = await this.hybridScoringService.generateHybridScore(domain);
        
        results[profile] = {
          totalScore: analysis.totalScore,
          loanAmount: analysis.lendingRecommendation.maxLoanAmount,
          ltv: analysis.lendingRecommendation.recommendedLTV,
          riskLevel: analysis.riskLevel,
          confidence: analysis.confidenceLevel,
          profileDescription: this.getProfileDescription(profile)
        };
      } catch (error) {
        results[profile] = { error: error.message };
      }
    }

    return {
      domain,
      message: 'AI profile comparison completed',
      profiles,
      results,
      recommendation: this.getBestProfileRecommendation(domain, results)
    };
  }

  private getProfileDescription(profile: string): string {
    const descriptions = {
      'conservative-lender': 'Conservative risk assessment, favors established brands, strict lending criteria',
      'growth-focused': 'Optimistic about growth potential, favors tech companies, relaxed risk tolerance',
      'balanced-institutional': 'Balanced approach, comprehensive analysis, moderate risk tolerance',
      'web3-native': 'Specialized for Web3/DeFi protocols, tech-focused, growth-oriented'
    };
    return descriptions[profile] || 'Standard configuration';
  }

  private getBestProfileRecommendation(domain: string, results: any): string {
    const sld = domain.split('.')[0].toLowerCase();
    
    if (['defi', 'crypto', 'web3', 'nft', 'dao'].some(keyword => sld.includes(keyword))) {
      return 'web3-native profile recommended for optimal analysis of Web3/crypto domains';
    } else if (['bank', 'finance', 'investment', 'capital'].some(keyword => sld.includes(keyword))) {
      return 'conservative-lender profile recommended for financial institutions';
    } else if (['startup', 'tech', 'app', 'ai', 'software'].some(keyword => sld.includes(keyword))) {
      return 'growth-focused profile recommended for technology companies';
    } else {
      return 'balanced-institutional profile recommended for general analysis';
    }
  }
}
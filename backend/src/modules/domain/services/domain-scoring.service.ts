import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

// Entities
import { DomainScore } from '../../../core/database/entities/domain-score.entity';
import { DomainValuation } from '../../../core/database/entities/domain-valuation.entity';
import { ScoringHistory } from '../../../core/database/entities/scoring-history.entity';

// Services
import { DomainMetadataService, DomainMetadata } from './domain-metadata.service';
import { DomainAnalysisService } from './domain-analysis.service';
import { ExternalApiService } from '../../external-api/services/external-api.service';

export interface ScoreBreakdown {
  totalScore: number;
  ageScore: number;
  lengthScore: number;
  extensionScore: number;
  keywordScore: number;
  trafficScore: number;
  marketScore: number;
  domaScore: number;
  confidenceLevel: number;
  dataSource: string;
}

export interface DomainValuationResult {
  estimatedValue: string; // bigint as string
  maxLoanAmount: string;  // 50% LTV
  confidenceLevel: number;
  factors: string[];
  valuationMethod: string;
}

@Injectable()
export class DomainScoringService {
  private readonly logger = new Logger(DomainScoringService.name);

  constructor(
    @InjectRepository(DomainScore)
    private readonly domainScoreRepository: Repository<DomainScore>,
    
    @InjectRepository(DomainValuation)
    private readonly domainValuationRepository: Repository<DomainValuation>,
    
    @InjectRepository(ScoringHistory)
    private readonly scoringHistoryRepository: Repository<ScoringHistory>,
    
    private readonly configService: ConfigService,
    private readonly domainMetadataService: DomainMetadataService,
    private readonly domainAnalysisService: DomainAnalysisService,
    private readonly externalApiService: ExternalApiService,
  ) {}

  /**
   * Get comprehensive domain score with all factors
   */
  async scoreDomain(tokenId: string, useCache: boolean = true): Promise<ScoreBreakdown | null> {
    try {
      // Check cache first
      if (useCache) {
        const cachedScore = await this.getCachedScore(tokenId);
        if (cachedScore && this.isCacheValid(cachedScore)) {
          this.logger.log(`Using cached score for domain ${tokenId}`);
          return this.formatScoreBreakdown(cachedScore);
        }
      }

      // Fetch fresh data
      const metadata = await this.domainMetadataService.getDomainMetadata(tokenId);
      if (!metadata) {
        this.logger.warn(`No metadata found for domain ${tokenId}`);
        return null;
      }

      // Calculate all score components
      const scoreBreakdown = await this.calculateComprehensiveScore(metadata);
      
      // Save to database
      await this.saveScoreToDatabase(tokenId, metadata, scoreBreakdown);
      
      // Log history
      await this.logScoringHistory(tokenId, metadata, scoreBreakdown, 'score_update', true);

      return scoreBreakdown;

    } catch (error) {
      this.logger.error(`Error scoring domain ${tokenId}:`, error.message);
      
      // Log failed attempt
      await this.logScoringHistory(tokenId, null, null, 'score_update', false, error.message);
      
      return null;
    }
  }

  /**
   * Get domain valuation
   */
  async valuateDomain(tokenId: string, useCache: boolean = true): Promise<DomainValuationResult | null> {
    try {
      // Check cache first
      if (useCache) {
        const cachedValuation = await this.getCachedValuation(tokenId);
        if (cachedValuation && this.isValuationCacheValid(cachedValuation)) {
          this.logger.log(`Using cached valuation for domain ${tokenId}`);
          return this.formatValuationResult(cachedValuation);
        }
      }

      // Get score first
      const scoreBreakdown = await this.scoreDomain(tokenId, useCache);
      if (!scoreBreakdown) return null;

      const metadata = await this.domainMetadataService.getDomainMetadata(tokenId);
      if (!metadata) return null;

      // Calculate valuation
      const valuation = await this.calculateDomainValuation(metadata, scoreBreakdown);
      
      // Save to database
      await this.saveValuationToDatabase(tokenId, metadata, valuation);
      
      // Log history
      await this.logScoringHistory(tokenId, metadata, scoreBreakdown, 'valuation_update', true);

      return valuation;

    } catch (error) {
      this.logger.error(`Error valuating domain ${tokenId}:`, error.message);
      
      // Log failed attempt
      await this.logScoringHistory(tokenId, null, null, 'valuation_update', false, error.message);
      
      return null;
    }
  }

  /**
   * Batch score multiple domains
   */
  async batchScoreDomains(tokenIds: string[]): Promise<Map<string, ScoreBreakdown>> {
    const results = new Map<string, ScoreBreakdown>();
    const batchSize = this.configService.get<number>('scoring.batchSize') || 10;
    
    this.logger.log(`Starting batch scoring for ${tokenIds.length} domains`);

    for (let i = 0; i < tokenIds.length; i += batchSize) {
      const batch = tokenIds.slice(i, i + batchSize);
      
      const promises = batch.map(async (tokenId) => {
        try {
          const score = await this.scoreDomain(tokenId);
          if (score) {
            results.set(tokenId, score);
          }
          return { tokenId, success: true };
        } catch (error) {
          this.logger.error(`Batch scoring failed for ${tokenId}:`, error.message);
          return { tokenId, success: false, error: error.message };
        }
      });

      await Promise.allSettled(promises);
      
      // Small delay between batches
      if (i + batchSize < tokenIds.length) {
        await this.delay(200);
      }
    }

    this.logger.log(`Batch scoring completed: ${results.size}/${tokenIds.length} successful`);
    return results;
  }

  /**
   * Get scoring history for a domain
   */
  async getScoringHistory(tokenId: string, limit: number = 10): Promise<ScoringHistory[]> {
    return this.scoringHistoryRepository.find({
      where: { tokenId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Private methods
   */
  private async calculateComprehensiveScore(metadata: DomainMetadata): Promise<ScoreBreakdown> {
    const domainName = metadata.name;
    
    // Basic analysis scores
    const analysis = this.domainAnalysisService.analyzeDomain(domainName, metadata);
    
    // External API enhanced scores
    let trafficScore = 0;
    let keywordScore = analysis.scoring.keywordScore;
    let marketScore = 0;
    
    try {
      // Get traffic metrics
      const trafficMetrics = await this.externalApiService.getTrafficMetrics(domainName);
      trafficScore = this.calculateTrafficScore(trafficMetrics);
      
      // Get keyword analysis
      const keywordAnalysis = await this.externalApiService.analyzeKeywords(domainName);
      keywordScore = this.calculateEnhancedKeywordScore(keywordAnalysis);
      marketScore = this.calculateMarketScore(keywordAnalysis);
      
    } catch (error) {
      this.logger.warn(`External API error for ${domainName}, using fallback scores:`, error.message);
      // Use fallback scores from basic analysis
      trafficScore = this.calculateFallbackTrafficScore(domainName);
      marketScore = this.calculateFallbackMarketScore(domainName);
    }

    const totalScore = Math.min(100, 
      analysis.scoring.ageScore +
      analysis.scoring.lengthScore +
      analysis.scoring.extensionScore +
      keywordScore +
      trafficScore +
      marketScore +
      analysis.scoring.domaScore
    );

    // Calculate confidence level
    const confidenceLevel = this.calculateConfidenceLevel(metadata, totalScore);

    return {
      totalScore,
      ageScore: analysis.scoring.ageScore,
      lengthScore: analysis.scoring.lengthScore,
      extensionScore: analysis.scoring.extensionScore,
      keywordScore,
      trafficScore,
      marketScore,
      domaScore: analysis.scoring.domaScore,
      confidenceLevel,
      dataSource: 'comprehensive',
    };
  }

  private async calculateDomainValuation(
    metadata: DomainMetadata, 
    scoreBreakdown: ScoreBreakdown
  ): Promise<DomainValuationResult> {
    // Base valuation calculation
    const baseValue = 1000; // $1,000 base value
    const scoreMultiplier = Math.pow(scoreBreakdown.totalScore / 10, 2); // Exponential scaling
    
    let estimatedValue = baseValue * scoreMultiplier;

    const factors = [`Base score: ${scoreBreakdown.totalScore}/100`];

    // Apply premium factors
    const sld = metadata.name.split('.')[0];
    const tld = metadata.name.split('.').pop() || '';

    // Length premium
    if (sld.length <= 3) {
      estimatedValue *= 5;
      factors.push('3-letter premium: 5x');
    } else if (sld.length <= 4) {
      estimatedValue *= 3;
      factors.push('4-letter premium: 3x');
    }

    // TLD premium
    if (tld === 'com') {
      estimatedValue *= 2;
      factors.push('.com premium: 2x');
    } else if (tld === 'ai') {
      estimatedValue *= 1.5;
      factors.push('.ai premium: 1.5x');
    }

    // Historical trading premium
    if (metadata.transactions.length >= 2) {
      const avgPrice = this.domainMetadataService.calculateAverageTradingPrice(metadata.transactions);
      if (avgPrice > estimatedValue) {
        estimatedValue = Math.max(estimatedValue, avgPrice);
        factors.push(`Historical average: $${avgPrice.toLocaleString()}`);
      }
    }

    // Cap values for safety
    estimatedValue = Math.min(estimatedValue, 1000000); // $1M max
    estimatedValue = Math.max(estimatedValue, 100); // $100 min

    // Convert to USDC format (6 decimals)
    const estimatedValueUsdc = Math.round(estimatedValue * 1e6);
    const maxLoanAmount = Math.round(estimatedValueUsdc * 0.5); // 50% LTV

    return {
      estimatedValue: estimatedValueUsdc.toString(),
      maxLoanAmount: maxLoanAmount.toString(),
      confidenceLevel: scoreBreakdown.confidenceLevel,
      factors,
      valuationMethod: 'ai-comprehensive',
    };
  }

  // Additional helper methods for scoring calculations...
  private calculateTrafficScore(trafficMetrics: any): number {
    let score = 0;
    
    // Domain Rating component (0-8 points)
    score += Math.min(8, (trafficMetrics.domainRating / 100) * 8);
    
    // Monthly visitors component (0-6 points) - logarithmic scale
    if (trafficMetrics.monthlyVisitors > 0) {
      score += Math.min(6, Math.log10(trafficMetrics.monthlyVisitors + 1));
    }
    
    // Backlinks component (0-4 points)
    if (trafficMetrics.backlinks > 0) {
      score += Math.min(4, Math.log10(trafficMetrics.backlinks + 1) / 2);
    }
    
    // Referring domains component (0-2 points)
    if (trafficMetrics.referringDomains > 0) {
      score += Math.min(2, Math.log10(trafficMetrics.referringDomains + 1) / 2);
    }
    
    // Adjust by confidence
    score *= (trafficMetrics.confidenceScore / 100);
    
    return Math.min(20, Math.round(score));
  }

  private calculateEnhancedKeywordScore(keywordAnalysis: any): number {
    let score = 0;
    
    // Brandability component (0-10 points)
    score += (keywordAnalysis.brandabilityScore / 100) * 10;
    
    // Memorability component (0-5 points)
    score += (keywordAnalysis.memorabilityScore / 100) * 5;
    
    // Trending keywords bonus (0-8 points)
    score += (keywordAnalysis.trendingScore / 100) * 8;
    
    // Pronounceability bonus (0-2 points)
    score += (keywordAnalysis.pronounceabilityScore / 100) * 2;
    
    return Math.min(25, Math.round(score));
  }

  private calculateMarketScore(keywordAnalysis: any): number {
    return Math.min(5, Math.round((keywordAnalysis.trendingScore / 100) * 5));
  }

  private calculateFallbackTrafficScore(domainName: string): number {
    const sld = domainName.split('.')[0];
    const tld = domainName.split('.').pop();
    
    let score = 5; // Base score
    
    if (tld === 'com') score += 5;
    if (['io', 'net', 'org'].includes(tld || '')) score += 3;
    if (sld.length <= 6) score += 5;
    if (sld.length <= 4) score += 5;
    
    return Math.min(score, 20);
  }

  private calculateFallbackMarketScore(domainName: string): number {
    const sld = domainName.split('.')[0].toLowerCase();
    const trendingKeywords = ['ai', 'crypto', 'nft', 'web3', 'defi', 'dao'];
    
    for (const keyword of trendingKeywords) {
      if (sld.includes(keyword)) return 3;
    }
    
    return 1;
  }

  private calculateConfidenceLevel(metadata: DomainMetadata, totalScore: number): number {
    let confidence = 70; // Base confidence
    
    if (metadata.transactions.length >= 2) confidence += 10;
    if (metadata.tokenizationDate) confidence += 10;
    if (totalScore >= 70) confidence += 10;
    
    return Math.min(confidence, 100);
  }

  // Cache and database operations...
  private async getCachedScore(tokenId: string): Promise<DomainScore | null> {
    return this.domainScoreRepository.findOne({ where: { tokenId } });
  }

  private async getCachedValuation(tokenId: string): Promise<DomainValuation | null> {
    return this.domainValuationRepository.findOne({ where: { tokenId } });
  }

  private isCacheValid(score: DomainScore): boolean {
    const cacheTimeout = this.configService.get<number>('scoring.cacheTimeout') || 3600;
    const now = new Date();
    const ageInSeconds = (now.getTime() - score.lastUpdated.getTime()) / 1000;
    return ageInSeconds < cacheTimeout && score.isValid;
  }

  private isValuationCacheValid(valuation: DomainValuation): boolean {
    const cacheTimeout = this.configService.get<number>('scoring.cacheTimeout') || 3600;
    const now = new Date();
    const ageInSeconds = (now.getTime() - valuation.lastUpdated.getTime()) / 1000;
    return ageInSeconds < cacheTimeout && valuation.isActive;
  }

  private async saveScoreToDatabase(tokenId: string, metadata: DomainMetadata, score: ScoreBreakdown): Promise<void> {
    const domainScore = this.domainScoreRepository.create({
      tokenId,
      domainName: metadata.name,
      totalScore: score.totalScore,
      ageScore: score.ageScore,
      lengthScore: score.lengthScore,
      extensionScore: score.extensionScore,
      keywordScore: score.keywordScore,
      trafficScore: score.trafficScore,
      marketScore: score.marketScore,
      domaScore: score.domaScore,
      confidenceLevel: score.confidenceLevel,
      dataSource: score.dataSource,
      metadata: { 
        registrationDate: metadata.registrationDate,
        expirationDate: metadata.expirationDate,
        transactions: metadata.transactions.length 
      },
      isValid: true,
    });

    await this.domainScoreRepository.save(domainScore);
  }

  private async saveValuationToDatabase(tokenId: string, metadata: DomainMetadata, valuation: DomainValuationResult): Promise<void> {
    const domainValuation = this.domainValuationRepository.create({
      tokenId,
      domainName: metadata.name,
      estimatedValue: valuation.estimatedValue,
      maxLoanAmount: valuation.maxLoanAmount,
      confidenceLevel: valuation.confidenceLevel,
      factors: valuation.factors,
      valuationMethod: valuation.valuationMethod,
      priceHistory: metadata.transactions.map(tx => ({
        price: tx.price,
        timestamp: tx.timestamp,
        type: tx.type
      })),
      isActive: true,
    });

    await this.domainValuationRepository.save(domainValuation);
  }

  private async logScoringHistory(
    tokenId: string,
    metadata: DomainMetadata | null,
    score: ScoreBreakdown | null,
    action: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    const history = this.scoringHistoryRepository.create({
      tokenId,
      domainName: metadata?.name || 'unknown',
      totalScore: score?.totalScore || 0,
      estimatedValue: '0',
      confidenceLevel: score?.confidenceLevel || 0,
      action,
      scoreBreakdown: score,
      dataSource: score?.dataSource,
      success,
      errorMessage,
    });

    await this.scoringHistoryRepository.save(history);
  }

  private formatScoreBreakdown(score: DomainScore): ScoreBreakdown {
    return {
      totalScore: score.totalScore,
      ageScore: score.ageScore,
      lengthScore: score.lengthScore,
      extensionScore: score.extensionScore,
      keywordScore: score.keywordScore,
      trafficScore: score.trafficScore,
      marketScore: score.marketScore,
      domaScore: score.domaScore,
      confidenceLevel: score.confidenceLevel,
      dataSource: score.dataSource,
    };
  }

  private formatValuationResult(valuation: DomainValuation): DomainValuationResult {
    return {
      estimatedValue: valuation.estimatedValue,
      maxLoanAmount: valuation.maxLoanAmount,
      confidenceLevel: valuation.confidenceLevel,
      factors: valuation.factors,
      valuationMethod: valuation.valuationMethod,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
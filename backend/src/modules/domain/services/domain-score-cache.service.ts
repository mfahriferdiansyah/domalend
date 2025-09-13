import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DomainScore } from '../../../core/database/entities/domain-score.entity';
import { HybridScoringService } from './hybrid-scoring.service';

export interface CachedDomainScore {
  totalScore: number;
  confidence: number;
  reasoning: string;
  brandScore?: number;
  technicalScore?: number;
  riskScore?: number;
  isFromCache: boolean;
  cacheAge?: number; // minutes since last update
}

@Injectable()
export class DomainScoreCacheService {
  private readonly logger = new Logger(DomainScoreCacheService.name);
  private readonly DEFAULT_CACHE_HOURS = 24; // Default score freshness: 24 hours
  private readonly RATE_LIMIT_MINUTES = 5; // Minimum time between rescoring same domain
  private readonly recentScoringMap = new Map<string, number>(); // Track recent scoring requests

  constructor(
    @InjectRepository(DomainScore)
    private readonly domainScoreRepository: Repository<DomainScore>,
    private readonly hybridScoringService: HybridScoringService,
  ) {}

  /**
   * Get domain score with database-first approach
   * 1. Check database first
   * 2. Return cached score if fresh
   * 3. Generate new score if missing or expired
   * 4. Save new score to database
   */
  async getDomainScore(domainName: string, maxCacheHours: number = this.DEFAULT_CACHE_HOURS): Promise<CachedDomainScore> {
    const startTime = Date.now();

    try {
      // 1. Try to get from database first
      const cachedScore = await this.getFromDatabase(domainName);

      if (cachedScore && this.isScoreFresh(cachedScore, maxCacheHours)) {
        const cacheAge = this.getCacheAgeMinutes(cachedScore);
        this.logger.log(`[Cache HIT] ${domainName}: ${cachedScore.totalScore} (age: ${cacheAge}m)`);
        
        return {
          totalScore: cachedScore.totalScore,
          confidence: cachedScore.confidenceLevel,
          reasoning: cachedScore.reasoning || `Cached AI score: ${cachedScore.totalScore}/100`,
          brandScore: cachedScore.brandScore,
          technicalScore: cachedScore.technicalScore,
          riskScore: cachedScore.riskScore,
          isFromCache: true,
          cacheAge,
        };
      }

      // 2. Check rate limiting before generating new score
      if (this.isRateLimited(domainName)) {
        const lastScoringTime = this.recentScoringMap.get(domainName);
        const minutesAgo = Math.floor((Date.now() - lastScoringTime) / (1000 * 60));
        this.logger.warn(`[Rate Limited] ${domainName} - last scored ${minutesAgo}m ago, minimum ${this.RATE_LIMIT_MINUTES}m required`);
        
        // Return the most recent score even if slightly stale
        if (cachedScore) {
          const cacheAge = this.getCacheAgeMinutes(cachedScore);
          return {
            totalScore: cachedScore.totalScore,
            confidence: cachedScore.confidenceLevel,
            reasoning: `Rate limited - returning cached score (${cacheAge}m old)`,
            brandScore: cachedScore.brandScore,
            technicalScore: cachedScore.technicalScore,
            riskScore: cachedScore.riskScore,
            isFromCache: true,
            cacheAge,
          };
        } else {
          // No cached score available, return fallback
          return {
            totalScore: 50,
            confidence: 25,
            reasoning: 'Rate limited - no recent score available',
            isFromCache: false,
            cacheAge: 0,
          };
        }
      }

      // 3. Generate new score using AI
      this.logger.log(`[Cache MISS] ${domainName} - generating new score`);
      this.markDomainAsScoring(domainName);
      const aiAnalysis = await this.hybridScoringService.generateStandardizedScore(domainName);

      // 3. Save to database for future use
      const savedScore = await this.saveToDatabase(domainName, aiAnalysis);
      
      const duration = Date.now() - startTime;
      this.logger.log(`[Fresh Score] ${domainName}: ${aiAnalysis.totalScore} (${duration}ms)`);

      return {
        totalScore: aiAnalysis.totalScore,
        confidence: aiAnalysis.confidenceLevel || 90,
        reasoning: aiAnalysis.lendingRecommendation?.reasoning || `AI scored: ${aiAnalysis.totalScore}/100`,
        brandScore: aiAnalysis.brandScore?.subtotal,
        technicalScore: aiAnalysis.technicalScore?.subtotal,
        riskScore: aiAnalysis.riskLevel === 'low' ? 90 : aiAnalysis.riskLevel === 'medium' ? 70 : 50,
        isFromCache: false,
        cacheAge: 0,
      };

    } catch (error) {
      this.logger.error(`[Score Error] ${domainName}:`, error.message);
      
      // Return fallback score
      return {
        totalScore: 50,
        confidence: 20,
        reasoning: `Fallback score due to error: ${error.message}`,
        isFromCache: false,
        cacheAge: 0,
      };
    }
  }

  /**
   * Batch get domain scores with efficient database queries
   */
  async batchGetDomainScores(domainNames: string[], maxCacheHours: number = this.DEFAULT_CACHE_HOURS): Promise<Record<string, CachedDomainScore>> {
    const results: Record<string, CachedDomainScore> = {};
    const startTime = Date.now();

    try {
      // 1. Batch query database for all domains
      const cachedScores = await this.domainScoreRepository
        .createQueryBuilder('score')
        .where('score.domainName IN (:...domainNames)', { domainNames })
        .getMany();

      const cachedMap = new Map(cachedScores.map(score => [score.domainName, score]));

      // 2. Process each domain
      for (const domainName of domainNames) {
        const cached = cachedMap.get(domainName);
        
        if (cached && this.isScoreFresh(cached, maxCacheHours)) {
          // Use cached score
          results[domainName] = {
            totalScore: cached.totalScore,
            confidence: cached.confidenceLevel,
            reasoning: cached.reasoning || `Cached: ${cached.totalScore}/100`,
            brandScore: cached.brandScore,
            technicalScore: cached.technicalScore,
            riskScore: cached.riskScore,
            isFromCache: true,
            cacheAge: this.getCacheAgeMinutes(cached),
          };
        } else {
          // Need fresh score - will be handled individually to avoid blocking
          results[domainName] = await this.getDomainScore(domainName, maxCacheHours);
        }
      }

      const duration = Date.now() - startTime;
      const cacheHits = Object.values(results).filter(r => r.isFromCache).length;
      this.logger.log(`[Batch Score] ${domainNames.length} domains: ${cacheHits} cache hits (${duration}ms)`);

      return results;
    } catch (error) {
      this.logger.error('[Batch Score Error]:', error.message);
      
      // Return fallback scores for all
      for (const domainName of domainNames) {
        results[domainName] = {
          totalScore: 50,
          confidence: 20,
          reasoning: 'Batch scoring error',
          isFromCache: false,
          cacheAge: 0,
        };
      }
      return results;
    }
  }

  /**
   * Get domain score from database
   */
  private async getFromDatabase(domainName: string): Promise<DomainScore | null> {
    return await this.domainScoreRepository
      .createQueryBuilder('score')
      .where('score.domainName = :domainName', { domainName })
      .orderBy('score.lastUpdated', 'DESC')
      .getOne();
  }

  /**
   * Save domain score to database
   */
  private async saveToDatabase(domainName: string, aiAnalysis: any): Promise<DomainScore> {
    const scoreExpiry = new Date();
    scoreExpiry.setHours(scoreExpiry.getHours() + this.DEFAULT_CACHE_HOURS);

    const domainScore = this.domainScoreRepository.create({
      tokenId: `${domainName}-${Date.now()}`, // Unique ID for each score
      domainName,
      totalScore: aiAnalysis.totalScore,
      ageScore: aiAnalysis.technicalScore?.domainAgeScore || 0,
      lengthScore: aiAnalysis.technicalScore?.lengthScore || 0,
      extensionScore: aiAnalysis.technicalScore?.tldScore || 0,
      keywordScore: aiAnalysis.brandScore?.brandabilityScore || 0,
      trafficScore: aiAnalysis.marketScore?.subtotal || 0,
      marketScore: aiAnalysis.marketScore?.subtotal || 0,
      domaScore: aiAnalysis.qualityScore?.subtotal || 0,
      confidenceLevel: aiAnalysis.confidenceLevel || 90,
      reasoning: aiAnalysis.lendingRecommendation?.reasoning || `AI score: ${aiAnalysis.totalScore}/100`,
      brandScore: aiAnalysis.brandScore?.subtotal,
      technicalScore: aiAnalysis.technicalScore?.subtotal,
      riskScore: aiAnalysis.riskLevel === 'low' ? 90 : aiAnalysis.riskLevel === 'medium' ? 70 : 50,
      scoreExpiry,
      dataSource: 'hybrid-ai-v2',
      metadata: aiAnalysis, // Store full analysis for debugging
      isValid: true,
    });

    return await this.domainScoreRepository.save(domainScore);
  }

  /**
   * Check if score is fresh enough to use
   */
  private isScoreFresh(score: DomainScore, maxAgeHours: number): boolean {
    if (!score.lastUpdated) return false;
    
    const ageHours = (Date.now() - score.lastUpdated.getTime()) / (1000 * 60 * 60);
    return ageHours <= maxAgeHours;
  }

  /**
   * Get cache age in minutes
   */
  private getCacheAgeMinutes(score: DomainScore): number {
    if (!score.lastUpdated) return 0;
    return Math.floor((Date.now() - score.lastUpdated.getTime()) / (1000 * 60));
  }

  /**
   * Check if domain is rate limited (scored too recently)
   */
  private isRateLimited(domainName: string): boolean {
    const lastScoringTime = this.recentScoringMap.get(domainName);
    if (!lastScoringTime) return false;
    
    const minutesSinceLastScoring = (Date.now() - lastScoringTime) / (1000 * 60);
    return minutesSinceLastScoring < this.RATE_LIMIT_MINUTES;
  }

  /**
   * Mark domain as recently scored for rate limiting
   */
  private markDomainAsScoring(domainName: string): void {
    this.recentScoringMap.set(domainName, Date.now());
    
    // Clean up old entries to prevent memory leaks (keep last 1000 entries)
    if (this.recentScoringMap.size > 1000) {
      const entries = Array.from(this.recentScoringMap.entries());
      entries.sort((a, b) => b[1] - a[1]); // Sort by timestamp desc
      this.recentScoringMap.clear();
      entries.slice(0, 500).forEach(([domain, timestamp]) => {
        this.recentScoringMap.set(domain, timestamp);
      });
    }
  }

  /**
   * Get rate limiting info for a domain
   */
  getRateLimitInfo(domainName: string): { isRateLimited: boolean; minutesUntilNextScore: number } {
    const lastScoringTime = this.recentScoringMap.get(domainName);
    if (!lastScoringTime) {
      return { isRateLimited: false, minutesUntilNextScore: 0 };
    }
    
    const minutesSinceLastScoring = (Date.now() - lastScoringTime) / (1000 * 60);
    const isRateLimited = minutesSinceLastScoring < this.RATE_LIMIT_MINUTES;
    const minutesUntilNextScore = isRateLimited ? Math.ceil(this.RATE_LIMIT_MINUTES - minutesSinceLastScoring) : 0;
    
    return { isRateLimited, minutesUntilNextScore };
  }

  /**
   * Health check for database connection and recent activity
   */
  async healthCheck(): Promise<{ status: string; recentScores: number; oldestCache: string }> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentCount = await this.domainScoreRepository
        .createQueryBuilder('score')
        .where('score.lastUpdated > :oneDayAgo', { oneDayAgo })
        .getCount();

      const oldestCache = await this.domainScoreRepository
        .createQueryBuilder('score')
        .orderBy('score.lastUpdated', 'ASC')
        .getOne();

      return {
        status: 'healthy',
        recentScores: recentCount,
        oldestCache: oldestCache ? oldestCache.lastUpdated.toISOString() : 'none',
      };
    } catch (error) {
      return {
        status: 'error',
        recentScores: 0,
        oldestCache: error.message,
      };
    }
  }
}
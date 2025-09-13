import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Import existing services
import { OpenAIDomainAnalyzerService, OpenAIDomainAnalysis } from '../../ai/services/openai-domain-analyzer.service';
import { TrafficAnalysisService, TrafficMetrics } from '../../external-api/services/traffic-analysis.service';
import { KeywordAnalysisService, KeywordMetrics } from '../../external-api/services/keyword-analysis.service';
import { FreeEnhancementService, FreeEnhancements } from '../../external-api/services/free-enhancement.service';

// Standardized scoring weights (total = 100 points)
export const SCORING_WEIGHTS = {
  // Technical factors (30 points total) - REDUCED to make room for AI
  domainAge: 10,           // 0-10 points
  domainLength: 7,         // 0-7 points  
  tldQuality: 8,           // 0-8 points
  dnsHealth: 5,            // 0-5 points
  
  // Brand factors (55 points total) - INCREASED for AI-driven scoring
  brandLegitimacy: 25,     // 0-25 points (AI: official vs variation) - INCREASED
  brandRecognition: 15,    // 0-15 points (AI: global awareness) - INCREASED  
  brandability: 15,        // 0-15 points (AI enhanced brandability) - INCREASED
  
  // Market factors (10 points total) - AI market intelligence
  trafficMetrics: 5,       // 0-5 points (technical baseline)
  marketTrends: 5,         // 0-5 points (AI enhanced)
  
  // Quality adjustments (5 points total) - Minimal for premium brands
  confidenceBonus: 3,      // 0-3 points (data quality)
  doma: 2,                 // 0-2 points (protocol relevance)
} as const;

export interface StandardizedScoreBreakdown {
  // Standardized 100-Point Scoring System
  totalScore: number;                // 0-100 (sum of weighted components)
  
  // Technical Component Scores (30 points max) - REDUCED for AI focus
  technicalScore: {
    domainAgeScore: number;          // 0-10 points
    lengthScore: number;             // 0-7 points
    tldScore: number;                // 0-8 points
    dnsHealthScore: number;          // 0-5 points
    subtotal: number;                // 0-30 points
  };
  
  // Brand Component Scores (55 points max) - INCREASED for AI-driven scoring
  brandScore: {
    brandLegitimacyScore: number;    // 0-25 points (AI: official vs variation)
    brandRecognitionScore: number;   // 0-15 points (AI: global awareness)
    brandabilityScore: number;       // 0-15 points (AI enhanced brandability)
    subtotal: number;                // 0-55 points
  };
  
  // Market Component Scores (10 points max) - AI market intelligence
  marketScore: {
    trafficScore: number;            // 0-5 points (technical baseline)
    marketTrendsScore: number;       // 0-5 points (AI enhanced)
    subtotal: number;                // 0-10 points
  };
  
  // Quality Adjustments (5 points max) - Minimal for premium brands
  qualityScore: {
    confidenceBonus: number;         // 0-3 points (data quality)
    domaRelevance: number;          // 0-2 points (protocol relevance)
    subtotal: number;                // 0-5 points
  };
  
  // Confidence & Risk Metrics
  confidenceLevel: number;          // 0-100 (separate from score)
  riskLevel: 'low' | 'medium' | 'high';
  
  // Brand Analysis Details (From AI)
  brandAnalysis: {
    isOfficialBrand: boolean;       // True if official brand domain
    brandVariationType: 'official' | 'premium-generic' | 'variation' | 'random';
    officialBrandScore: number;     // 0-100 how close to official
    trademarkRisk: number;          // 0-100 legal risk score
    brandEquityValue: number;       // 0-100 actual brand equity
  };
  
  // Data Quality Indicators
  dataQuality: {
    aiAnalysisAvailable: boolean;
    technicalDataComplete: boolean;
    externalDataSources: number;
    overallDataConfidence: number;   // 0-100
  };
  
  // Lending Recommendations
  lendingRecommendation: {
    recommendedLTV: number;         // 20-75% based on score + risk
    maxLoanAmount: string;          // Conservative estimate in USDC
    interestRateModifier: number;   // +/- rate adjustment
    collateralQuality: 'excellent' | 'good' | 'fair' | 'poor';
    reasoning: string;              // Detailed explanation
    conciseReasoning: string;       // SHORT explanation for frontend (max 100 chars)
  };
  
  // Raw Analysis Data (for transparency)
  rawAnalysis: {
    technicalAnalysis: TechnicalAnalysis;
    aiAnalysis: OpenAIDomainAnalysis | null;
    enhancementData: FreeEnhancements | null;
  };
  
  // Metadata
  analysisTimestamp: Date;
  analysisVersion: string;
}

// Legacy interface - kept for backward compatibility
export interface HybridScoreBreakdown {
  totalScore: number;
  ageScore: number;
  lengthScore: number;
  extensionScore: number;
  keywordScore: number;
  trafficScore: number;
  marketScore: number;
  domaScore: number;
  aiEnhancementScore: number;
  brandRecognitionScore: number;
  businessLegitimacyScore: number;
  riskAssessmentScore: number;
  technicalReliabilityScore: number;
  socialPresenceScore: number;
  overallConfidence: number;
  dataSourceBreakdown: {
    technical: number;
    ai: number;
    external: number;
  };
  technicalAnalysis: TechnicalAnalysis;
  aiAnalysis: OpenAIDomainAnalysis | null;
  enhancementData: FreeEnhancements | null;
  loanRecommendation: {
    recommendedLTV: number;
    maxLoanAmount: string;
    interestRateModifier: number;
    riskLevel: 'low' | 'medium' | 'high';
    reasoning: string;
  };
}

export interface TechnicalAnalysis {
  domainAge: number;           // Years
  lengthOptimality: number;    // 0-100
  tldQuality: number;         // 0-100  
  keywordStrength: number;    // 0-100
  trafficMetrics: TrafficMetrics;
  keywordMetrics: KeywordMetrics;
  dnsHealth: number;          // 0-100
  sslSecurity: number;        // 0-100
  pageSpeed: number;          // 0-100
}

@Injectable()
export class HybridScoringService {
  private readonly logger = new Logger(HybridScoringService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly openAIAnalyzer: OpenAIDomainAnalyzerService,
    private readonly trafficAnalysis: TrafficAnalysisService,
    private readonly keywordAnalysis: KeywordAnalysisService,
    private readonly freeEnhancements: FreeEnhancementService,
  ) {}

  /**
   * Generate standardized hybrid score with consistent 100-point system
   */
  async generateStandardizedScore(domain: string, tokenId?: string): Promise<StandardizedScoreBreakdown> {
    this.logger.log(`Starting standardized hybrid analysis for domain: ${domain}`);

    try {
      // Run all analyses in parallel for speed
      const [technicalResults, aiResults, enhancementResults] = await Promise.allSettled([
        this.performTechnicalAnalysis(domain),
        this.performAIAnalysis(domain),
        this.performEnhancementAnalysis(domain),
      ]);

      const technical = technicalResults.status === 'fulfilled' ? technicalResults.value : this.getDefaultTechnical(domain);
      const ai = aiResults.status === 'fulfilled' ? aiResults.value : null;
      const enhancements = enhancementResults.status === 'fulfilled' ? enhancementResults.value : null;

      // Generate standardized scores
      return this.combineAnalysesStandardized(domain, technical, ai, enhancements);

    } catch (error) {
      this.logger.error(`Standardized scoring failed for ${domain}:`, error.message);
      return this.getFallbackStandardizedScore(domain);
    }
  }

  /**
   * Legacy method - kept for backward compatibility
   * @deprecated Use generateStandardizedScore instead
   */
  async generateHybridScore(domain: string, tokenId?: string): Promise<StandardizedScoreBreakdown> {
    this.logger.warn('Using deprecated generateHybridScore - use generateStandardizedScore instead');
    return this.generateStandardizedScore(domain, tokenId);
  }

  /**
   * Perform comprehensive technical analysis
   */
  private async performTechnicalAnalysis(domain: string): Promise<TechnicalAnalysis> {
    const [trafficMetrics, keywordMetrics] = await Promise.all([
      this.trafficAnalysis.getTrafficMetrics(domain),
      this.keywordAnalysis.analyzeKeywords(domain),
    ]);

    const domainAge = this.calculateDomainAge(domain);
    const lengthOptimality = this.calculateLengthScore(domain);
    const tldQuality = this.calculateTLDScore(domain);

    return {
      domainAge,
      lengthOptimality,
      tldQuality,
      keywordStrength: keywordMetrics.brandabilityScore,
      trafficMetrics,
      keywordMetrics,
      dnsHealth: 75, // Will be enhanced with real DNS checks
      sslSecurity: 70, // Will be enhanced with SSL Labs
      pageSpeed: 65,   // Will be enhanced with PageSpeed API
    };
  }

  /**
   * Perform AI-powered business analysis
   */
  private async performAIAnalysis(domain: string): Promise<OpenAIDomainAnalysis> {
    return await this.openAIAnalyzer.analyzeWithOpenAI(domain);
  }

  /**
   * Perform free enhancement analysis
   */
  private async performEnhancementAnalysis(domain: string): Promise<FreeEnhancements> {
    return await this.freeEnhancements.getFreeEnhancements(domain);
  }

  /**
   * Combine all analyses into standardized 100-point score
   */
  private combineAnalysesStandardized(
    domain: string,
    technical: TechnicalAnalysis,
    ai: OpenAIDomainAnalysis | null,
    enhancements: FreeEnhancements | null,
  ): StandardizedScoreBreakdown {
    
    if (!ai) {
      throw new Error('AI analysis required for pure AI-driven scoring');
    }

    // Use AI totalScore as the primary score
    const totalScore = ai.totalScore;

    // Generate breakdown scores from AI scores (for compatibility)
    const technicalScore = {
      domainAgeScore: Math.round((ai.trustworthiness / 100) * 10),  // 0-10
      lengthScore: Math.round((ai.brandability / 100) * 7),         // 0-7
      tldScore: Math.round((ai.brandLegitimacy / 100) * 8),         // 0-8
      dnsHealthScore: 5, // Default                                 // 0-5
      subtotal: 0,
    };
    technicalScore.subtotal = technicalScore.domainAgeScore + technicalScore.lengthScore + 
                             technicalScore.tldScore + technicalScore.dnsHealthScore;

    // Use AI scores directly for brand scoring
    const brandScore = {
      brandLegitimacyScore: Math.round((ai.brandLegitimacy / 100) * 25),     // 0-25
      brandRecognitionScore: Math.round((ai.brandRecognition / 100) * 15),   // 0-15
      brandabilityScore: Math.round((ai.brandability / 100) * 15),           // 0-15
      subtotal: 0,
    };
    brandScore.subtotal = brandScore.brandLegitimacyScore + brandScore.brandRecognitionScore + 
                         brandScore.brandabilityScore;

    // Use AI market analysis for market scores
    const marketScore = {
      trafficScore: Math.round((ai.marketValue / 100) * 5),         // 0-5
      marketTrendsScore: Math.round((ai.businessLegitimacy / 100) * 5), // 0-5
      subtotal: 0,
    };
    marketScore.subtotal = marketScore.trafficScore + marketScore.marketTrendsScore;

    // Simple quality score based on confidence
    const qualityScore = {
      confidenceBonus: Math.round((ai.confidenceScore / 100) * 3),  // 0-3
      domaRelevance: this.calculateDomaRelevance(domain),           // 0-2
      subtotal: 0,
    };
    qualityScore.subtotal = qualityScore.confidenceBonus + qualityScore.domaRelevance;

    // Risk and confidence from AI
    const riskLevel = ai.riskFactors.overallRisk;
    const confidenceLevel = ai.confidenceScore;

    // Brand analysis from AI
    const brandAnalysis = {
      isOfficialBrand: ai.brandAnalysis.isOfficialBrand,
      brandVariationType: ai.brandAnalysis.brandVariationType,
      officialBrandScore: ai.brandAnalysis.officialBrandScore,
      trademarkRisk: ai.brandAnalysis.trademarkRisk,
      brandEquityValue: ai.brandAnalysis.brandEquityScore,
    };

    // Data quality assessment
    const dataQuality = {
      aiAnalysisAvailable: true,
      technicalDataComplete: true,
      externalDataSources: 1,
      overallDataConfidence: confidenceLevel,
    };

    // Generate lending recommendation from AI scores
    const lendingRecommendation = this.generateAILendingRecommendation(ai);

    return {
      totalScore,
      technicalScore,
      brandScore,
      marketScore,
      qualityScore,
      confidenceLevel,
      riskLevel,
      brandAnalysis,
      dataQuality,
      lendingRecommendation,
      rawAnalysis: {
        technicalAnalysis: technical,
        aiAnalysis: ai,
        enhancementData: enhancements,
      },
      analysisTimestamp: new Date(),
      analysisVersion: '3.0.0-pure-ai',
    };
  }

  /**
   * Legacy method - combine all analyses into final hybrid score
   * @deprecated Use combineAnalysesStandardized instead
   */
  private combineAnalyses(
    domain: string,
    technical: TechnicalAnalysis,
    ai: OpenAIDomainAnalysis | null,
    enhancements: FreeEnhancements | null,
  ): HybridScoreBreakdown {
    
    // Define scoring weights based on data availability
    const hasAI = ai !== null;
    const hasEnhancements = enhancements !== null;
    
    // Weight distribution (total = 100%)
    const weights = {
      // Core technical scores (60-70% when no AI, 40-50% with AI)
      age: hasAI ? 12 : 20,           // 12-20%
      length: 8,                      // 8%  
      extension: hasAI ? 10 : 15,     // 10-15%
      keyword: hasAI ? 15 : 25,       // 15-25% (AI enhances this)
      traffic: hasAI ? 15 : 20,       // 15-20%
      market: hasAI ? 15 : 7,         // 7-15% (AI heavily enhances this)
      doma: 5,                        // 5%
      
      // AI enhancements (30-40% when available)
      brandRecognition: hasAI ? 15 : 0,    // 15%
      businessLegitimacy: hasAI ? 10 : 0,  // 10%
      riskAssessment: hasAI ? 10 : 0,      // 10%
      
      // Technical enhancements (5-10%)
      technicalReliability: hasEnhancements ? 5 : 0,  // 5%
      socialPresence: hasEnhancements ? 5 : 0,         // 5%
    };

    // Calculate individual scores (normalized to proper ranges)
    const ageScore = Math.min(20, Math.round((technical.domainAge / 20) * 20));  // 0-20
    const lengthScore = Math.min(10, Math.round((technical.lengthOptimality / 100) * 10));  // 0-10  
    const extensionScore = Math.min(15, Math.round((technical.tldQuality / 100) * 15));  // 0-15
    const keywordScore = Math.min(25, Math.round((this.combineKeywordScores(technical.keywordMetrics, ai) / 100) * 25));  // 0-25
    const trafficScore = Math.min(20, Math.round((this.normalizeTrafficScore(technical.trafficMetrics) / 100) * 20));  // 0-20
    const marketScore = Math.min(5, Math.round((this.combineMarketScores(technical.trafficMetrics, ai) / 100) * 5));  // 0-5
    const domaScore = Math.min(5, this.calculateDomaScore(domain));  // 0-5
    
    // AI-enhanced scores
    const brandRecognitionScore = ai?.brandRecognition || 0;
    const businessLegitimacyScore = ai?.businessLegitimacy || 0;
    const riskAssessmentScore = ai ? (100 - ai.riskFactors.reputationRisk) : 0;
    
    // Technical enhancement scores
    const technicalReliabilityScore = enhancements ? 
      (enhancements.dnsHealth.healthScore + enhancements.certificateStatus.securityScore + enhancements.pageSpeedScore) / 3 : 0;
    const socialPresenceScore = enhancements?.socialMediaPresence.socialScore || 0;

    // Calculate total score (sum of all components, max 100)
    const totalScore = Math.min(100, 
      ageScore + lengthScore + extensionScore + keywordScore + 
      trafficScore + marketScore + domaScore
    );

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(technical, ai, enhancements);
    
    // Data source breakdown
    const dataSourceBreakdown = {
      technical: hasAI ? 50 : 85,
      ai: hasAI ? 40 : 0,
      external: hasEnhancements ? 10 : 15,
    };

    // Generate loan recommendation
    const loanRecommendation = this.generateLoanRecommendation(totalScore, ai, overallConfidence);

    return {
      // Final scores
      totalScore,
      ageScore,
      lengthScore,
      extensionScore,
      keywordScore,
      trafficScore,
      marketScore,
      domaScore,
      
      // AI enhancement scores
      aiEnhancementScore: hasAI ? Math.round((brandRecognitionScore + businessLegitimacyScore + riskAssessmentScore) / 3) : 0,
      brandRecognitionScore,
      businessLegitimacyScore, 
      riskAssessmentScore,
      
      // Technical enhancement scores
      technicalReliabilityScore: Math.round(technicalReliabilityScore),
      socialPresenceScore,
      
      // Confidence and metadata
      overallConfidence,
      dataSourceBreakdown,
      
      // Detailed results
      technicalAnalysis: technical,
      aiAnalysis: ai,
      enhancementData: enhancements,
      
      // Recommendations
      loanRecommendation,
    };
  }

  private combineKeywordScores(technical: KeywordMetrics, ai: OpenAIDomainAnalysis | null): number {
    let score = technical.brandabilityScore;
    
    if (ai) {
      // Blend technical brandability with AI brand recognition
      score = Math.round((technical.brandabilityScore * 0.6) + (ai.brandRecognition * 0.4));
    }
    
    return Math.min(100, score);
  }

  private combineMarketScores(traffic: TrafficMetrics, ai: OpenAIDomainAnalysis | null): number {
    let marketScore = Math.min(100, (traffic.domainRating / 2) + 25); // Base market score from traffic
    
    if (ai) {
      // Heavily weight AI market analysis
      marketScore = Math.round((marketScore * 0.3) + (ai.marketValue * 0.7));
    }
    
    return Math.min(100, marketScore);
  }

  private generateLoanRecommendation(
    totalScore: number, 
    ai: OpenAIDomainAnalysis | null,
    confidence: number,
  ) {
    let recommendedLTV = Math.min(75, Math.max(25, totalScore * 0.7)); // Base LTV from score
    let interestRateModifier = 0;
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    
    if (ai) {
      // Use AI loan recommendations if available
      recommendedLTV = Math.round((recommendedLTV * 0.4) + (ai.loanRecommendation.recommendedLTV * 0.6));
      interestRateModifier = ai.loanRecommendation.interestRateModifier;
      riskLevel = ai.riskFactors.overallRisk;
    } else {
      // Fallback risk assessment
      if (totalScore >= 80) riskLevel = 'low';
      else if (totalScore <= 40) riskLevel = 'high';
    }

    // Adjust for confidence
    if (confidence < 60) {
      recommendedLTV *= 0.8; // Reduce LTV if low confidence
      interestRateModifier += 1; // Increase rate for uncertainty
    }

    const maxLoanAmount = this.estimateMaxLoanAmount(totalScore, ai, recommendedLTV);
    
    return {
      recommendedLTV: Math.round(recommendedLTV),
      maxLoanAmount,
      interestRateModifier: Math.round(interestRateModifier * 10) / 10,
      riskLevel,
      reasoning: this.generateRecommendationReasoning(totalScore, ai, confidence),
    };
  }

  private estimateMaxLoanAmount(totalScore: number, ai: OpenAIDomainAnalysis | null, ltv: number): string {
    let baseValue = Math.pow(10, 3 + (totalScore / 25)); // Exponential scaling: $1K-$100M+
    
    if (ai && ai.companyInfo.isPubliclyTraded && ai.brandRecognition > 90) {
      // Major public companies get premium valuation
      baseValue *= 50;
    }
    
    const maxLoan = Math.round(baseValue * (ltv / 100));
    return maxLoan.toLocaleString();
  }

  private generateRecommendationReasoning(totalScore: number, ai: OpenAIDomainAnalysis | null, confidence: number): string {
    if (ai && ai.brandRecognition > 90) {
      return `Major recognized brand with high market value and low risk profile. ${ai.analysisReasoning}`;
    } else if (ai && ai.businessLegitimacy > 80) {
      return `Established business with good market standing. ${ai.loanRecommendation.reasoning}`;
    } else if (totalScore > 80) {
      return `High-quality domain with strong technical metrics and good market potential.`;
    } else if (totalScore > 60) {
      return `Solid domain with decent metrics. Moderate risk profile suitable for standard lending terms.`;
    } else {
      return `Domain shows limited market validation. Conservative lending approach recommended.`;
    }
  }

  // Helper methods for scoring calculations
  private calculateDomainAge(domain: string): number {
    // This would integrate with WHOIS API
    // Returns 0-20 points for age score
    const tld = domain.split('.').pop();
    const ageYears = tld === 'com' ? Math.random() * 15 + 5 : Math.random() * 10 + 2;
    
    // Normalize to 0-20 range (max 20 points for 15+ year old domains)
    return Math.min(20, Math.round((ageYears / 15) * 20));
  }


  private calculateTLDScore(domain: string): number {
    // Returns 0-15 points for TLD score
    const tld = domain.split('.').pop()?.toLowerCase();
    const scores: Record<string, number> = {
      'com': 15, 'org': 13, 'net': 12, 'io': 11, 'co': 10,
      'app': 9, 'dev': 8, 'tech': 7, 'ai': 6
    };
    return scores[tld || ''] || 4; // Default for unknown TLDs
  }

  private normalizeAge(ageYears: number): number {
    return Math.min(100, (ageYears / 20) * 100);
  }

  private normalizeTrafficScore(traffic: TrafficMetrics): number {
    const score = Math.min(100, 
      (traffic.domainRating * 0.4) + 
      (Math.log10(traffic.monthlyVisitors + 1) * 10) +
      (Math.min(50, traffic.backlinks / 100))
    );
    return Math.round(score);
  }

  private calculateDomaScore(domain: string): number {
    // Doma-specific factors (0-5 points)
    const sld = domain.split('.')[0].toLowerCase();
    let score = 2; // Base score for any domain
    
    // Web3 relevance bonuses
    if (sld.includes('web3') || sld.includes('crypto') || sld.includes('defi')) score += 2;
    if (sld.includes('nft') || sld.includes('dao')) score += 1;
    if (domain.includes('.crypto') || domain.includes('.blockchain')) score += 1;
    
    return Math.min(5, score);
  }

  private calculateOverallConfidence(
    technical: TechnicalAnalysis,
    ai: OpenAIDomainAnalysis | null,
    enhancements: FreeEnhancements | null,
  ): number {
    let confidence = technical.trafficMetrics.confidenceScore; // Base from traffic analysis
    
    if (ai) {
      confidence = Math.round((confidence * 0.4) + (ai.confidenceScore * 0.6));
    }
    
    if (enhancements) {
      confidence = Math.min(100, confidence + 5); // Slight boost for additional data
    }
    
    return confidence;
  }

  private getDefaultTechnical(domain: string): TechnicalAnalysis {
    return {
      domainAge: 3,
      lengthOptimality: this.calculateLengthScore(domain),
      tldQuality: this.calculateTLDScore(domain),
      keywordStrength: 50,
      trafficMetrics: {
        monthlyVisitors: 1000,
        domainRating: 30,
        organicTraffic: 700,
        backlinks: 50,
        referringDomains: 10,
        confidenceScore: 30,
        dataSource: 'fallback',
      },
      keywordMetrics: {
        brandabilityScore: 50,
        memorabilityScore: 45,
        pronunciationScore: 50,
        typabilityScore: 55,
        containsCommonWords: false,
        containsNumbers: false,
        containsHyphens: false,
        suggestedCategories: ['General'],
      },
      dnsHealth: 70,
      sslSecurity: 50,
      pageSpeed: 60,
    };
  }

  private getFallbackScore(domain: string): HybridScoreBreakdown {
    const technical = this.getDefaultTechnical(domain);
    return this.combineAnalyses(domain, technical, null, null);
  }

  private getFallbackStandardizedScore(domain: string): StandardizedScoreBreakdown {
    const technical = this.getDefaultTechnical(domain);
    return this.combineAnalysesStandardized(domain, technical, null, null);
  }

  // ====== BRAND DETECTION DATABASE ======
  
  private readonly MAJOR_BRANDS = {
    'cocacola': { official: 'cocacola.com', name: 'The Coca-Cola Company', industry: 'Beverages', tier: 'fortune10', marketCap: 278000000000 },
    'coca-cola': { official: 'coca-cola.com', name: 'The Coca-Cola Company', industry: 'Beverages', tier: 'fortune10', marketCap: 278000000000 },
    'coke': { official: 'cocacola.com', name: 'The Coca-Cola Company', industry: 'Beverages', tier: 'fortune10', marketCap: 278000000000 },
    'google': { official: 'google.com', name: 'Google LLC', industry: 'Technology', tier: 'fortune10', marketCap: 1700000000000 },
    'alphabet': { official: 'abc.xyz', name: 'Alphabet Inc.', industry: 'Technology', tier: 'fortune10', marketCap: 1700000000000 },
    'apple': { official: 'apple.com', name: 'Apple Inc.', industry: 'Technology', tier: 'fortune10', marketCap: 3000000000000 },
    'microsoft': { official: 'microsoft.com', name: 'Microsoft Corporation', industry: 'Technology', tier: 'fortune10', marketCap: 2800000000000 },
    'amazon': { official: 'amazon.com', name: 'Amazon.com Inc.', industry: 'E-commerce', tier: 'fortune10', marketCap: 1500000000000 },
    'facebook': { official: 'facebook.com', name: 'Meta Platforms Inc.', industry: 'Social Media', tier: 'fortune50', marketCap: 800000000000 },
    'meta': { official: 'meta.com', name: 'Meta Platforms Inc.', industry: 'Technology', tier: 'fortune50', marketCap: 800000000000 },
    'netflix': { official: 'netflix.com', name: 'Netflix Inc.', industry: 'Entertainment', tier: 'fortune100', marketCap: 180000000000 },
    'tesla': { official: 'tesla.com', name: 'Tesla Inc.', industry: 'Automotive', tier: 'fortune50', marketCap: 800000000000 },
    'nike': { official: 'nike.com', name: 'Nike Inc.', industry: 'Retail', tier: 'fortune100', marketCap: 160000000000 },
    'samsung': { official: 'samsung.com', name: 'Samsung Electronics', industry: 'Technology', tier: 'fortune50', marketCap: 350000000000 },
    'sony': { official: 'sony.com', name: 'Sony Corporation', industry: 'Electronics', tier: 'fortune100', marketCap: 110000000000 },
    'walmart': { official: 'walmart.com', name: 'Walmart Inc.', industry: 'Retail', tier: 'fortune10', marketCap: 520000000000 },
    'mcdonalds': { official: 'mcdonalds.com', name: "McDonald's Corporation", industry: 'Food Service', tier: 'fortune100', marketCap: 210000000000 },
    'starbucks': { official: 'starbucks.com', name: 'Starbucks Corporation', industry: 'Food Service', tier: 'fortune100', marketCap: 105000000000 },
    'disney': { official: 'disney.com', name: 'The Walt Disney Company', industry: 'Entertainment', tier: 'fortune100', marketCap: 200000000000 },
  } as const;

  private analyzeBrandLegitimacy(domain: string): {
    isKnownBrand: boolean;
    isOfficialBrand: boolean;
    brandVariationType: 'official' | 'typo' | 'variation' | 'unrelated';
    officialBrandScore: number;
    trademarkRisk: number;
    brandEquityScore: number;
    companyName: string;
    industry: string;
  } {
    const sld = domain.split('.')[0].toLowerCase();
    const tld = domain.split('.').pop()?.toLowerCase();
    
    // Check for exact brand match
    const brandInfo = this.MAJOR_BRANDS[sld] || this.MAJOR_BRANDS[sld.replace(/[-_]/g, '')];
    
    if (brandInfo) {
      const actualDomain = `${sld}.${tld}`;
      const isOfficial = brandInfo.official === actualDomain;
      
      return {
        isKnownBrand: true,
        isOfficialBrand: isOfficial,
        brandVariationType: isOfficial ? 'official' : 'variation',
        officialBrandScore: isOfficial ? 100 : (tld === 'com' ? 95 : 70),
        trademarkRisk: isOfficial ? 5 : 30,
        brandEquityScore: isOfficial ? 95 : 70,
        companyName: brandInfo.name,
        industry: brandInfo.industry,
      };
    }
    
    // Check for partial matches (brand variations)
    const partialMatch = Object.keys(this.MAJOR_BRANDS).find(brand => 
      sld.includes(brand) || brand.includes(sld) || this.calculateSimilarity(sld, brand) > 0.7
    );
    
    if (partialMatch) {
      const matchedBrand = this.MAJOR_BRANDS[partialMatch];
      const similarity = this.calculateSimilarity(sld, partialMatch);
      
      return {
        isKnownBrand: true,
        isOfficialBrand: false,
        brandVariationType: similarity > 0.9 ? 'typo' : 'variation',
        officialBrandScore: Math.round(similarity * 80), // Max 80 for variations
        trademarkRisk: 70,
        brandEquityScore: Math.round(similarity * 60),
        companyName: matchedBrand.name,
        industry: matchedBrand.industry,
      };
    }
    
    // Unknown domain
    return {
      isKnownBrand: false,
      isOfficialBrand: false,
      brandVariationType: 'unrelated',
      officialBrandScore: 15,
      trademarkRisk: 20,
      brandEquityScore: 20,
      companyName: sld.charAt(0).toUpperCase() + sld.slice(1),
      industry: 'Unknown',
    };
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  // ====== DOMAIN QUALITY ANALYZER ======

  private analyzeDomainQuality(domain: string, hasHighAIScores?: boolean): {
    isRandom: boolean;
    isPremiumGeneric: boolean;
    pronounceabilityScore: number;
    dictionaryWordCount: number;
    qualityTier: 'random' | 'standard' | 'premium' | 'brand';
  } {
    const sld = domain.split('.')[0].toLowerCase();
    
    // Check if it's a random/gibberish string
    const isRandom = this.isRandomString(sld);
    const pronounceabilityScore = this.calculatePronounceabilityScore(sld);
    const dictionaryWordCount = this.countDictionaryWords(sld);
    
    // Check if it's a premium generic
    const isPremiumGeneric = this.isPremiumGeneric(sld, domain);
    
    // Check if it's a known brand
    const brandAnalysis = this.analyzeBrandLegitimacy(domain);
    const isKnownBrand = brandAnalysis.isKnownBrand;
    
    // Determine quality tier - AI scores override local detection
    let qualityTier: 'random' | 'standard' | 'premium' | 'brand' = 'standard';
    
    if (hasHighAIScores) {
      // AI detected a major brand - override local analysis
      qualityTier = 'brand';
    } else if (isRandom || pronounceabilityScore < 20) {
      qualityTier = 'random';
    } else if (isKnownBrand) {
      qualityTier = 'brand';
    } else if (isPremiumGeneric) {
      qualityTier = 'premium';
    }
    
    return {
      isRandom,
      isPremiumGeneric,
      pronounceabilityScore,
      dictionaryWordCount,
      qualityTier,
    };
  }

  private isRandomString(str: string): boolean {
    // Check for consonant clusters (3+ consecutive consonants)
    const consonantClusters = /[bcdfghjklmnpqrstvwxyz]{3,}/gi;
    if (consonantClusters.test(str)) return true;
    
    // Check for very low vowel ratio
    const vowels = (str.match(/[aeiou]/gi) || []).length;
    const vowelRatio = vowels / str.length;
    if (str.length > 6 && vowelRatio < 0.2) return true;
    
    // Check for keyboard patterns
    const keyboardPatterns = /qwerty|asdf|zxcv|123|abc|test/gi;
    if (keyboardPatterns.test(str)) return true;
    
    // Check for alternating patterns that look random
    const randomPatterns = /[bcdfghjklmnpqrstvwxyz]{2}[aeiou][bcdfghjklmnpqrstvwxyz]{2}/gi;
    if (str.length > 8 && randomPatterns.test(str)) return true;
    
    return false;
  }

  private calculatePronounceabilityScore(str: string): number {
    let score = 100;
    
    // Penalty for consonant clusters
    const consonantClusters = (str.match(/[bcdfghjklmnpqrstvwxyz]{3,}/gi) || []).length;
    score -= consonantClusters * 30;
    
    // Penalty for very low vowel ratio
    const vowels = (str.match(/[aeiou]/gi) || []).length;
    const vowelRatio = vowels / str.length;
    if (vowelRatio < 0.2) score -= 40;
    if (vowelRatio < 0.1) score -= 30;
    
    // Penalty for length without vowels
    if (str.length > 8 && vowels < 2) score -= 30;
    
    // Penalty for difficult letter combinations
    const difficultCombos = /[xz][bcdfghjklmnpqrstvwxyz]|[bcdfghjklmnpqrstvwxyz][xz]/gi;
    score -= (str.match(difficultCombos) || []).length * 20;
    
    return Math.max(0, Math.min(100, score));
  }

  private countDictionaryWords(str: string): number {
    // Common English words that add value to domains
    const commonWords = [
      'one', 'two', 'three', 'time', 'day', 'year', 'way', 'man', 'new', 'first', 
      'last', 'long', 'great', 'little', 'own', 'old', 'right', 'big', 'high', 'small',
      'large', 'next', 'early', 'young', 'important', 'few', 'public', 'bad', 'same', 'able',
      'go', 'do', 'get', 'make', 'know', 'think', 'take', 'see', 'come', 'could', 'want',
      'look', 'use', 'find', 'give', 'tell', 'work', 'may', 'say', 'each', 'which', 'she',
      'buy', 'sell', 'web', 'net', 'app', 'site', 'blog', 'shop', 'store', 'market',
      'business', 'company', 'service', 'product', 'brand', 'name', 'domain', 'online',
      'digital', 'tech', 'smart', 'quick', 'fast', 'easy', 'simple', 'best', 'top',
      'love', 'like', 'good', 'better', 'world', 'life', 'home', 'family', 'friend',
      'car', 'house', 'money', 'food', 'water', 'air', 'fire', 'earth', 'sun', 'moon',
      'blue', 'red', 'green', 'black', 'white', 'gold', 'silver', 'diamond', 'star'
    ];
    
    let wordCount = 0;
    const lowerStr = str.toLowerCase();
    
    for (const word of commonWords) {
      if (lowerStr.includes(word)) {
        wordCount++;
      }
    }
    
    return wordCount;
  }

  private isPremiumGeneric(sld: string, domain: string): boolean {
    const tld = domain.split('.').pop()?.toLowerCase();
    
    // Short, valuable dictionary words
    const premiumWords = [
      'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
      'time', 'day', 'year', 'week', 'month', 'hour', 'now', 'new', 'old', 'first', 'last',
      'big', 'small', 'fast', 'slow', 'high', 'low', 'hot', 'cold', 'good', 'best', 'top',
      'buy', 'sell', 'get', 'go', 'come', 'make', 'use', 'find', 'help', 'work', 'play',
      'love', 'like', 'want', 'need', 'have', 'know', 'think', 'see', 'look', 'give',
      'web', 'net', 'app', 'site', 'blog', 'shop', 'store', 'mall', 'market', 'trade',
      'car', 'auto', 'home', 'house', 'rent', 'sale', 'food', 'eat', 'cook', 'book',
      'read', 'news', 'info', 'data', 'tech', 'code', 'game', 'fun', 'cool', 'wow',
      'art', 'music', 'film', 'photo', 'video', 'tv', 'radio', 'phone', 'call', 'text',
      'mail', 'send', 'chat', 'talk', 'meet', 'date', 'party', 'event', 'show', 'live'
    ];
    
    // Check if SLD is a premium word
    const isPremiumWord = premiumWords.includes(sld);
    
    // Check if it's short and on a premium TLD
    const isShortOnPremiumTLD = sld.length <= 6 && ['com', 'net', 'org', 'io', 'co'].includes(tld);
    
    // Creative TLDs with good words
    const creativeValueTLDs = ['fun', 'cool', 'app', 'tech', 'art', 'design', 'studio', 'agency'];
    const isCreativeCombo = creativeValueTLDs.includes(tld) && this.countDictionaryWords(sld) > 0;
    
    return isPremiumWord || (isShortOnPremiumTLD && this.countDictionaryWords(sld) > 0) || isCreativeCombo;
  }

  // ====== STANDARDIZED SCORING HELPER METHODS ======

  private calculateDomainAgeScore(ageYears: number, domainQuality?: any): number {
    // Age scoring: 0-10 points based on domain age (reduced from 12)
    // 0-2 years: 0-3 points, 3-10 years: 4-7 points, 10+ years: 8-10 points
    if (ageYears <= 1) return 1;
    if (ageYears <= 2) return 3;
    if (ageYears <= 5) return 5;
    if (ageYears <= 10) return 7;
    return 10; // 10+ years gets max points
  }

  private calculateLengthScore(domain: string, domainQuality?: any): number {
    // Length scoring: 0-7 points based on optimal length (reduced from 8)
    const sld = domain.split('.')[0];
    const length = sld.length;
    
    if (length >= 4 && length <= 6) return 7;  // Optimal: 4-6 chars
    if (length >= 3 && length <= 8) return 6;  // Very good: 3-8 chars
    if (length >= 2 && length <= 10) return 4; // Good: 2-10 chars
    if (length <= 15) return 2;                // Acceptable: up to 15
    if (length <= 20) return 1;                // Long but usable
    return 0; // Too long
  }

  private calculateTldScore(domain: string, domainQuality?: any): number {
    // TLD scoring: 0-8 points based on TLD quality and trust (reduced from 10)
    const tld = domain.split('.').pop()?.toLowerCase();
    const scores: Record<string, number> = {
      'com': 8,   // Premium
      'org': 7, 'net': 7, 'edu': 7, 'gov': 7,  // High trust
      'io': 6, 'co': 6, 'app': 6,              // Tech premium
      'ai': 5, 'tech': 5, 'dev': 5,            // Industry specific
      'biz': 4, 'info': 4,                     // Standard
      'xyz': 3, 'online': 3,                   // Lower tier
    };
    return scores[tld || ''] || 2; // Default for unknown TLDs
  }

  private calculateDnsHealthScore(technical: TechnicalAnalysis, enhancements: FreeEnhancements | null): number {
    // DNS Health scoring: 0-5 points (reduced from 10)
    let score = technical.dnsHealth / 20; // Base from technical analysis
    
    if (enhancements) {
      // Enhance with real data if available
      score = Math.round((
        enhancements.dnsHealth.healthScore * 0.4 +
        enhancements.certificateStatus.securityScore * 0.3 +
        enhancements.pageSpeedScore * 0.3
      ) / 20);
    }
    
    return Math.min(5, Math.max(0, Math.round(score)));
  }

  private calculateBrandLegitimacyScore(ai: OpenAIDomainAnalysis | null, domain?: string, domainQuality?: any): number {
    // Brand Legitimacy scoring: 0-25 points (INCREASED for AI-driven scoring)
    if (ai) {
      // Use AI score directly with higher weight for excellent brands
      const aiScore = ai.brandLegitimacy;
      if (aiScore >= 95) return 25; // Exceptional brands get maximum points
      if (aiScore >= 90) return 22; // Excellent brands
      if (aiScore >= 80) return 18; // Very good brands
      return Math.round((aiScore / 100) * 15); // Standard scaling for others
    }
    
    // Fallback to local brand detection when AI unavailable
    if (domain) {
      const brandAnalysis = this.analyzeBrandLegitimacy(domain);
      if (brandAnalysis.isOfficialBrand) return 20; // Increased from 15
      if (brandAnalysis.isKnownBrand && brandAnalysis.officialBrandScore >= 90) return 15;
      if (brandAnalysis.isKnownBrand && brandAnalysis.officialBrandScore >= 70) return 10;
      if (brandAnalysis.isKnownBrand) return 6;
    }
    
    return 2; // Unknown domains
  }

  private calculateBrandRecognitionScore(ai: OpenAIDomainAnalysis | null, domain?: string, domainQuality?: any): number {
    // Brand Recognition scoring: 0-15 points (INCREASED for global brands)
    if (ai) {
      // Use AI score directly - global brands deserve higher weight
      const aiScore = ai.brandRecognition;
      if (aiScore >= 95) return 15; // World-class brands like Apple, Coca-Cola
      if (aiScore >= 90) return 13; // Major global brands
      if (aiScore >= 80) return 11; // Well-known brands
      return Math.round((aiScore / 100) * 10); // Standard scaling
    }
    
    // Fallback to local brand detection when AI unavailable
    if (domain) {
      const brandAnalysis = this.analyzeBrandLegitimacy(domain);
      if (brandAnalysis.isOfficialBrand) return 12;
      if (brandAnalysis.isKnownBrand && brandAnalysis.officialBrandScore >= 80) return 9;
      if (brandAnalysis.isKnownBrand) return 6;
    }
    
    return 1; // Unknown domains
  }

  private calculateBrandabilityScore(technical: TechnicalAnalysis, ai: OpenAIDomainAnalysis | null, domain?: string, domainQuality?: any): number {
    // Check if this is a major brand with inherent brandability
    if (domain) {
      const brandAnalysis = this.analyzeBrandLegitimacy(domain);
      if (brandAnalysis.isOfficialBrand) {
        const sld = domain.split('.')[0].toLowerCase();
        const brandInfo = this.MAJOR_BRANDS[sld];
        if (brandInfo) {
          // Major brands are inherently highly brandable - INCREASED to 15 max
          if (brandInfo.tier === 'fortune10') return 15; // Maximum brandability
          if (brandInfo.tier === 'fortune50') return 14;  // Near maximum
          if (brandInfo.tier === 'fortune100') return 12; // High brandability
        }
      }
    }
    
    // Brandability scoring: 0-15 points (INCREASED from 10, combines technical + AI insights)
    let baseScore = technical.keywordStrength / 100 * 9; // Technical component (0-9)
    
    if (ai) {
      // Enhance with AI insights (0-6 additional points)
      const aiBonus = (ai.brandRecognition / 100) * 6;
      baseScore += aiBonus;
    }
    
    return Math.round(Math.min(15, baseScore));
  }

  private calculateConfidenceBonus(ai: OpenAIDomainAnalysis | null, technical: TechnicalAnalysis, enhancements: FreeEnhancements | null, domain?: string): number {
    // Check if this is a major brand that deserves high confidence
    if (domain) {
      const brandAnalysis = this.analyzeBrandLegitimacy(domain);
      if (brandAnalysis.isOfficialBrand) {
        const sld = domain.split('.')[0].toLowerCase();
        const brandInfo = this.MAJOR_BRANDS[sld];
        if (brandInfo) {
          // Fortune companies have maximum confidence due to public data - REDUCED to 3 max
          return 3; // Maximum confidence bonus
        }
      }
    }
    
    // Standard confidence bonus: 0-3 points based on data quality (REDUCED from 5)
    let bonus = 0; // Base bonus
    
    if (ai && ai.confidenceScore >= 80) bonus += 2;        // High AI confidence
    if (technical.trafficMetrics.confidenceScore >= 70) bonus += 1; // Good traffic data
    if (enhancements) bonus += 1;                          // Additional data sources
    
    return Math.min(3, bonus);
  }

  private calculateTrafficScore(trafficMetrics: TrafficMetrics, domain?: string): number {
    // Check if this is a major brand that deserves premium traffic score
    if (domain) {
      const brandAnalysis = this.analyzeBrandLegitimacy(domain);
      if (brandAnalysis.isOfficialBrand) {
        const sld = domain.split('.')[0].toLowerCase();
        const brandInfo = this.MAJOR_BRANDS[sld];
        if (brandInfo) {
          // Fortune brands get maximum traffic scores - REDUCED to 5 max
          if (brandInfo.tier === 'fortune10') return 5; // Maximum traffic
          if (brandInfo.tier === 'fortune50') return 5;  // Maximum traffic
          if (brandInfo.tier === 'fortune100') return 4; // High traffic
        }
      }
    }
    
    // Standard traffic scoring for non-major brands - REDUCED to 5 max
    let score = 0;
    
    // Domain Rating component (0-2 points)
    score += Math.min(2, (trafficMetrics.domainRating / 100) * 2);
    
    // Monthly visitors component (0-1.5 points) - logarithmic scale
    if (trafficMetrics.monthlyVisitors > 100) {
      score += Math.min(1.5, Math.log10(trafficMetrics.monthlyVisitors) / 4);
    }
    
    // Backlinks component (0-1 points)
    if (trafficMetrics.backlinks > 10) {
      score += Math.min(1, Math.log10(trafficMetrics.backlinks) / 4);
    }
    
    // Referring domains component (0-0.5 points)
    if (trafficMetrics.referringDomains > 5) {
      score += Math.min(0.5, Math.log10(trafficMetrics.referringDomains) / 4);
    }
    
    return Math.round(Math.min(5, score));
  }

  private calculateMarketTrendsScore(ai: OpenAIDomainAnalysis | null, domain?: string): number {
    // Check if this is a major brand that deserves premium market score
    if (domain) {
      const brandAnalysis = this.analyzeBrandLegitimacy(domain);
      if (brandAnalysis.isOfficialBrand) {
        const sld = domain.split('.')[0].toLowerCase();
        const brandInfo = this.MAJOR_BRANDS[sld];
        if (brandInfo) {
          // Fortune companies dominate market trends
          if (brandInfo.tier === 'fortune10') return 5; // Maximum market score
          if (brandInfo.tier === 'fortune50') return 5; // Maximum market score
          if (brandInfo.tier === 'fortune100') return 4; // High market score
        }
      }
    }
    
    // Market Trends scoring: 0-5 points based on AI market analysis
    if (ai) {
      const marketScore = (ai.marketValue / 100) * 5;
      return Math.round(Math.min(5, marketScore));
    }
    
    return 1; // Base score for unknown domains
  }


  private calculateDomaRelevance(domain: string): number {
    // Doma protocol relevance: 0-2 points (REDUCED from 5)
    const sld = domain.split('.')[0].toLowerCase();
    let score = 0; // Base score
    
    // Web3/crypto relevance bonuses
    if (sld.includes('web3') || sld.includes('crypto') || sld.includes('defi')) score += 1;
    if (sld.includes('nft') || sld.includes('dao') || sld.includes('doma')) score += 1;
    if (domain.includes('.crypto') || domain.includes('.blockchain')) score += 1;
    
    return Math.min(2, score);
  }

  private determineRiskLevel(totalScore: number, ai: OpenAIDomainAnalysis | null): 'low' | 'medium' | 'high' {
    if (ai) {
      return ai.riskFactors.overallRisk;
    }
    
    // Fallback based on score
    if (totalScore >= 75) return 'low';
    if (totalScore >= 45) return 'medium';
    return 'high';
  }

  private calculateConfidenceLevel(technical: TechnicalAnalysis, ai: OpenAIDomainAnalysis | null, enhancements: FreeEnhancements | null): number {
    let confidence = 50; // Base confidence
    
    if (ai) {
      confidence = Math.round((confidence + ai.confidenceScore) / 2);
    }
    
    if (technical.trafficMetrics.confidenceScore > 60) {
      confidence += 10;
    }
    
    if (enhancements) {
      confidence += 5;
    }
    
    return Math.min(100, confidence);
  }

  private isTechnicalDataComplete(technical: TechnicalAnalysis): boolean {
    return technical.domainAge > 0 && 
           technical.trafficMetrics.domainRating > 0 &&
           technical.keywordStrength > 0;
  }

  private countExternalDataSources(technical: TechnicalAnalysis, enhancements: FreeEnhancements | null): number {
    let count = 0;
    if (technical.trafficMetrics.dataSource !== 'fallback') count++;
    if (enhancements) count++;
    return count;
  }

  private generateStandardizedLendingRecommendation(
    totalScore: number, 
    brandAnalysis: any,
    riskLevel: 'low' | 'medium' | 'high',
    confidenceLevel: number,
    ai: OpenAIDomainAnalysis | null
  ) {
    let baseLTV = Math.round(totalScore * 0.6); // Base LTV from score
    let interestRateModifier = 0;
    let collateralQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'fair';

    // Adjust based on brand legitimacy
    if (brandAnalysis.isOfficialBrand && totalScore >= 85) {
      baseLTV = Math.min(75, baseLTV + 10);
      interestRateModifier = -2;
      collateralQuality = 'excellent';
    } else if (brandAnalysis.officialBrandScore >= 70) {
      baseLTV = Math.min(65, baseLTV + 5);
      interestRateModifier = -1;
      collateralQuality = 'good';
    }

    // Risk adjustments
    if (riskLevel === 'high') {
      baseLTV *= 0.7;
      interestRateModifier += 3;
      if (collateralQuality === 'excellent') collateralQuality = 'good';
      else if (collateralQuality === 'good') collateralQuality = 'fair';
      else collateralQuality = 'poor';
    }

    // Confidence adjustments
    if (confidenceLevel < 60) {
      baseLTV *= 0.8;
      interestRateModifier += 1;
    }

    // Conservative caps for crypto lending
    baseLTV = Math.min(75, Math.max(20, baseLTV));
    
    const maxLoanAmount = this.estimateMaxLoanAmountStandardized(totalScore, brandAnalysis, baseLTV);
    
    return {
      recommendedLTV: Math.round(baseLTV),
      maxLoanAmount,
      interestRateModifier: Math.round(interestRateModifier * 10) / 10,
      collateralQuality,
      reasoning: this.generateLendingReasoning(totalScore, brandAnalysis, riskLevel, collateralQuality),
      conciseReasoning: this.generateConciseLendingReasoning(totalScore, brandAnalysis, ai),
    };
  }

  private estimateMaxLoanAmountStandardized(totalScore: number, brandAnalysis: any, ltv: number): string {
    let baseValue = Math.pow(10, 2.5 + (totalScore / 30)); // $316 to $100M+ range
    
    // Major brand multipliers
    if (brandAnalysis.isOfficialBrand && brandAnalysis.officialBrandScore >= 95) {
      baseValue *= 25; // Major official brands
    } else if (brandAnalysis.officialBrandScore >= 80) {
      baseValue *= 5; // Recognized brands
    }
    
    const maxLoan = Math.round(baseValue * (ltv / 100));
    return maxLoan.toLocaleString();
  }

  private generateLendingReasoning(
    totalScore: number, 
    brandAnalysis: any, 
    riskLevel: 'low' | 'medium' | 'high',
    collateralQuality: string
  ): string {
    if (brandAnalysis.isOfficialBrand && totalScore >= 85) {
      return `Official domain of recognized brand with ${collateralQuality} collateral quality. Score: ${totalScore}/100, Risk: ${riskLevel}.`;
    } else if (brandAnalysis.officialBrandScore >= 70) {
      return `Brand-related domain with ${collateralQuality} collateral quality. Brand recognition gives moderate confidence. Score: ${totalScore}/100.`;
    } else if (totalScore >= 65) {
      return `Solid domain metrics with ${collateralQuality} collateral quality. Technical analysis shows good fundamentals. Score: ${totalScore}/100.`;
    } else {
      return `Conservative approach recommended. Limited brand validation and moderate technical metrics. Score: ${totalScore}/100, Risk: ${riskLevel}.`;
    }
  }

  private generateConciseLendingReasoning(
    totalScore: number,
    brandAnalysis: any,
    ai: OpenAIDomainAnalysis | null
  ): string {
    // Generate concise reasoning for frontend display (max 100 chars)
    if (brandAnalysis.isOfficialBrand && totalScore >= 90) {
      return `Major brand (${totalScore}/100) - Premium collateral`;
    } else if (brandAnalysis.isOfficialBrand && totalScore >= 80) {
      return `Official brand (${totalScore}/100) - High quality`;
    } else if (ai && ai.brandRecognition >= 80) {
      return `Recognized brand (${totalScore}/100) - Good value`;
    } else if (totalScore >= 70) {
      return `Strong metrics (${totalScore}/100) - Solid choice`;
    } else if (totalScore >= 50) {
      return `Moderate score (${totalScore}/100) - Standard risk`;
    } else {
      return `Low score (${totalScore}/100) - High risk domain`;
    }
  }

  private generateAILendingRecommendation(analysis: OpenAIDomainAnalysis): {
    recommendedLTV: number;
    maxLoanAmount: string;
    interestRateModifier: number;
    collateralQuality: 'excellent' | 'good' | 'fair' | 'poor';
    reasoning: string;
    conciseReasoning: string;
  } {
    const score = analysis.totalScore;
    
    // Direct AI score to lending terms mapping based on user's proven scoring philosophy
    let ltv: number;
    let rateModifier: number;
    let collateralQuality: 'excellent' | 'good' | 'fair' | 'poor';
    
    if (score >= 95) {
      // Branded and legit companies (95+)
      ltv = 72; // 70-75% range
      rateModifier = -2;
      collateralQuality = 'excellent';
    } else if (score >= 75) {
      // High potential domains (75+) - kick.com, one.com, time.fun
      ltv = 62; // 60-65% range
      rateModifier = -1;
      collateralQuality = 'good';
    } else if (score >= 40) {
      // Average domains (40-70) - superlongandmulti.com
      ltv = 45; // 40-50% range
      rateModifier = 0;
      collateralQuality = 'fair';
    } else {
      // Random/poor domains (0-30) - aowkoaskdajsd.com
      ltv = 22; // 20-25% range
      rateModifier = 3;
      collateralQuality = 'poor';
    }
    
    // Calculate max loan amount based on AI analysis
    const baseValue = this.estimateBaseValue(score);
    const maxLoanAmount = (baseValue * ltv / 100).toFixed(2);
    
    const reasoning = analysis.analysisReasoning || analysis.loanRecommendation?.reasoning || 'AI-driven analysis based on domain quality';
    const conciseReasoning = this.generateSimpleConciseReasoning(score);
    
    return {
      recommendedLTV: ltv,
      maxLoanAmount: `$${maxLoanAmount}`,
      interestRateModifier: rateModifier,
      collateralQuality,
      reasoning,
      conciseReasoning
    };
  }
  
  private estimateBaseValue(score: number): number {
    // Conservative base valuation based on AI score
    if (score >= 95) return 100000; // Major brands
    if (score >= 75) return 25000;  // High potential
    if (score >= 40) return 5000;   // Average domains
    return 1000; // Poor domains
  }
  
  private generateSimpleConciseReasoning(score: number): string {
    if (score >= 95) {
      return `Major brand (${score}/100) - Premium collateral`;
    } else if (score >= 75) {
      return `High potential (${score}/100) - Good collateral`;
    } else if (score >= 40) {
      return `Average domain (${score}/100) - Fair collateral`;
    } else {
      return `Low score (${score}/100) - High risk domain`;
    }
  }
}
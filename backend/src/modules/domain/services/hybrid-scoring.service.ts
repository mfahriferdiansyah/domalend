import { Injectable, Logger } from '@nestjs/common';
import { OpenAIDomainAnalyzerService, OpenAIDomainAnalysis } from '../../ai/services/openai-domain-analyzer.service';

export interface ScoreBreakdown {
  totalScore: number;
  ageScore: number;
  lengthScore: number;
  extensionScore: number;
  keywordScore: number;
  trafficScore: number;
  confidence: number;
  reasoning: string;
}

export interface StandardizedScoringResult {
  totalScore: number;
  confidence?: number;
  confidenceLevel?: number;
  reasoning?: string;
  riskLevel?: 'low' | 'medium' | 'high';

  // Technical score components
  technicalScore?: {
    subtotal: number;
    domainAgeScore?: number;
    lengthScore?: number;
    tldScore?: number;
  };

  // Brand/Market components
  brandScore?: {
    subtotal: number;
    brandabilityScore?: number;
  };

  marketScore?: {
    subtotal: number;
  };

  qualityScore?: {
    subtotal: number;
  };

  keywordScore?: number;
  lengthScore?: number;
  ageScore?: number;

  // Lending recommendation
  lendingRecommendation?: {
    reasoning?: string;
    conciseReasoning?: string;
    maxLoanAmount?: number;
    recommendedLTV?: number;
  };
}

@Injectable()
export class HybridScoringService {
  private readonly logger = new Logger(HybridScoringService.name);

  constructor(
    private readonly openaiAnalyzer: OpenAIDomainAnalyzerService,
  ) {}

  async scoreComprehensively(domain: string): Promise<ScoreBreakdown> {
    this.logger.log(`🎯 Comprehensive OpenAI scoring for domain: ${domain}`);

    try {
      // Get OpenAI analysis for comprehensive scoring
      const openaiAnalysis = await this.openaiAnalyzer.analyzeWithOpenAI(domain);

      // Convert to ScoreBreakdown format (legacy interface support)
      return {
        totalScore: openaiAnalysis.totalScore,
        ageScore: openaiAnalysis.businessLegitimacy, // Business maturity
        lengthScore: openaiAnalysis.brandability, // Brandability includes memorability
        extensionScore: Math.floor(openaiAnalysis.marketValue * 0.15), // Market value component
        keywordScore: openaiAnalysis.brandRecognition, // Brand recognition
        trafficScore: Math.floor(openaiAnalysis.trustworthiness * 0.35), // Trust-based traffic estimate
        confidence: openaiAnalysis.confidenceScore,
        reasoning: openaiAnalysis.analysisReasoning,
      };
    } catch (error) {
      this.logger.error(`❌ OpenAI comprehensive scoring failed for ${domain}: ${error.message}`);
      throw error;
    }
  }

  async generateStandardizedScore(domain: string): Promise<StandardizedScoringResult> {
    this.logger.log(`🚀 Generating OpenAI-powered score for domain: ${domain}`);

    try {
      // Get OpenAI analysis (pure business intelligence)
      const openaiAnalysis = await this.openaiAnalyzer.analyzeWithOpenAI(domain);

      this.logger.log(`✅ OpenAI analysis completed for ${domain}: ${openaiAnalysis.totalScore}/100`);

      // Convert OpenAI analysis to StandardizedScoringResult
      return this.convertOpenAIToStandardizedResult(openaiAnalysis, domain);

    } catch (error) {
      this.logger.error(`❌ OpenAI analysis failed for ${domain}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert OpenAI analysis to StandardizedScoringResult format
   */
  private convertOpenAIToStandardizedResult(
    analysis: OpenAIDomainAnalysis,
    domain: string
  ): StandardizedScoringResult {
    // Pure business intelligence scoring - NO technical components
    const brandScore = Math.floor((analysis.brandRecognition + analysis.brandLegitimacy + analysis.brandability) / 3);
    const marketScore = Math.floor((analysis.marketValue + analysis.trustworthiness) / 2);
    const qualityScore = Math.floor((analysis.businessLegitimacy + analysis.brandAnalysis.brandEquityScore) / 2);

    return {
      totalScore: analysis.totalScore,
      confidence: analysis.confidenceScore,
      confidenceLevel: analysis.confidenceScore,
      reasoning: analysis.analysisReasoning,
      riskLevel: analysis.riskFactors.overallRisk,

      // Business intelligence components (NO technical scoring)
      brandScore: {
        subtotal: brandScore,
        brandabilityScore: analysis.brandability,
      },

      marketScore: {
        subtotal: marketScore,
      },

      qualityScore: {
        subtotal: qualityScore,
      },

      // OpenAI-derived scores (business-focused)
      keywordScore: analysis.brandability,
      lengthScore: analysis.brandability, // Brandability includes memorability
      ageScore: analysis.businessLegitimacy, // Business maturity indicator

      lendingRecommendation: {
        reasoning: analysis.loanRecommendation.reasoning,
        conciseReasoning: `${analysis.totalScore}/100 score, ${analysis.riskFactors.overallRisk} risk, ${analysis.loanRecommendation.recommendedLTV}% LTV`,
        maxLoanAmount: analysis.loanRecommendation.maxLoanPercentage * 1000, // Convert percentage to amount
        recommendedLTV: analysis.loanRecommendation.recommendedLTV,
      },
    };
  }


  async generateHybridScore(domain: string): Promise<StandardizedScoringResult> {
    // For now, just use the same implementation as generateStandardizedScore
    return this.generateStandardizedScore(domain);
  }
}
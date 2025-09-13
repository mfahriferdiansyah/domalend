import { Injectable, Logger } from '@nestjs/common';
import { OpenAIDomainAnalysis } from './openai-domain-analyzer.service';

export interface FormattedScoringOutput {
  // Core scores (0-100, already converted to our 7-factor system)
  ageScore: number;        // 0-20 (from technical analysis)
  lengthScore: number;     // 0-10 (from technical analysis)  
  extensionScore: number;  // 0-15 (from technical analysis)
  keywordScore: number;    // 0-25 (AI-enhanced)
  trafficScore: number;    // 0-20 (AI-enhanced)
  marketScore: number;     // 0-5 (AI-powered)
  domaScore: number;       // 0-5 (technical + AI context)
  
  // Confidence and metadata
  totalScore: number;      // Sum of above (0-100)
  confidenceLevel: number; // 0-100
  
  // Formatted reasoning
  scoringReasoning: {
    aiAnalysis: string;
    riskAssessment: string;
    lendingRecommendation: string;
    majorFactors: string[];
    warningSignals: string[];
  };
  
  // Formatted loan terms
  loanTerms: {
    maxLoanAmount: number;   // USD amount
    recommendedLTV: number;  // 0-100 percentage
    interestRateAdjustment: number; // +/- basis points
    riskTier: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC';
    termRecommendation: string;
  };
}

@Injectable()
export class AIOutputFormatterService {
  private readonly logger = new Logger(AIOutputFormatterService.name);

  /**
   * Convert AI analysis to our standardized 7-factor scoring system
   */
  formatAIAnalysisToScores(
    domain: string,
    aiAnalysis: OpenAIDomainAnalysis,
    technicalScores: {
      ageScore: number;
      lengthScore: number; 
      extensionScore: number;
      baseTrafficScore: number;
    }
  ): FormattedScoringOutput {
    
    // Convert AI scores to our 7-factor system
    const keywordScore = this.convertToKeywordScore(aiAnalysis.brandRecognition, aiAnalysis.marketValue);
    const trafficScore = this.convertToTrafficScore(aiAnalysis.marketValue, technicalScores.baseTrafficScore);
    const marketScore = this.convertToMarketScore(aiAnalysis.marketValue, aiAnalysis.businessLegitimacy);
    const domaScore = this.convertToDomaScore(domain, aiAnalysis);
    
    const totalScore = Math.min(100, 
      technicalScores.ageScore + 
      technicalScores.lengthScore + 
      technicalScores.extensionScore + 
      keywordScore + 
      trafficScore + 
      marketScore + 
      domaScore
    );
    
    return {
      ageScore: Math.min(20, technicalScores.ageScore),
      lengthScore: Math.min(10, technicalScores.lengthScore),
      extensionScore: Math.min(15, technicalScores.extensionScore),
      keywordScore: Math.min(25, keywordScore),
      trafficScore: Math.min(20, trafficScore),
      marketScore: Math.min(5, marketScore),
      domaScore: Math.min(5, domaScore),
      totalScore,
      confidenceLevel: aiAnalysis.confidenceScore,
      
      scoringReasoning: this.formatReasoning(domain, aiAnalysis),
      loanTerms: this.formatLoanTerms(aiAnalysis, totalScore),
    };
  }

  /**
   * Create custom scoring explanations
   */
  generateCustomReasoning(
    domain: string,
    scores: any,
    format: 'detailed' | 'summary' | 'investor' | 'borrower' = 'detailed'
  ): string {
    const sld = domain.split('.')[0];
    
    switch (format) {
      case 'detailed':
        return this.generateDetailedReasoning(domain, scores);
      case 'summary':
        return this.generateSummaryReasoning(domain, scores);
      case 'investor':
        return this.generateInvestorReasoning(domain, scores);
      case 'borrower':
        return this.generateBorrowerReasoning(domain, scores);
      default:
        return this.generateDetailedReasoning(domain, scores);
    }
  }

  private convertToKeywordScore(brandRecognition: number, marketValue: number): number {
    // Convert 0-100 AI scores to 0-25 keyword score
    const weightedScore = (brandRecognition * 0.7) + (marketValue * 0.3);
    return Math.round((weightedScore / 100) * 25);
  }

  private convertToTrafficScore(marketValue: number, baseTraffic: number): number {
    // Blend AI market value with technical traffic analysis
    const aiTrafficBoost = (marketValue / 100) * 10; // 0-10 boost from AI
    return Math.min(20, Math.round(baseTraffic + aiTrafficBoost));
  }

  private convertToMarketScore(industryStanding: number, marketValue: number): number {
    // Market score heavily influenced by AI analysis
    const weightedScore = (industryStanding * 0.6) + (marketValue * 0.4);
    return Math.round((weightedScore / 100) * 5);
  }

  private convertToDomaScore(domain: string, aiAnalysis: OpenAIDomainAnalysis): number {
    const sld = domain.split('.')[0].toLowerCase();
    let score = 2; // Base score
    
    // Tech/Web3 relevance
    const web3Keywords = ['crypto', 'web3', 'defi', 'nft', 'dao', 'blockchain'];
    if (web3Keywords.some(keyword => sld.includes(keyword))) {
      score += 2;
    }
    
    // AI industry classification boost
    if (aiAnalysis.companyInfo.industry.toLowerCase().includes('tech')) {
      score += 1;
    }
    
    return Math.min(5, score);
  }

  private formatReasoning(domain: string, aiAnalysis: OpenAIDomainAnalysis) {
    return {
      aiAnalysis: aiAnalysis.analysisReasoning,
      riskAssessment: this.formatRiskAssessment(aiAnalysis.riskFactors),
      lendingRecommendation: aiAnalysis.loanRecommendation.reasoning,
      majorFactors: aiAnalysis.positiveIndicators,
      warningSignals: aiAnalysis.redFlags,
    };
  }

  private formatRiskAssessment(riskFactors: any): string {
    const risk = riskFactors.overallRisk;
    const stability = riskFactors.financialStability;
    const reputation = riskFactors.reputationRisk;
    
    if (risk === 'low' && stability > 80) {
      return `Excellent risk profile with ${stability}% financial stability. Minimal reputation concerns (${reputation}% risk). Ideal for premium lending terms.`;
    } else if (risk === 'medium') {
      return `Moderate risk profile. Financial stability at ${stability}% with ${reputation}% reputation risk. Standard lending terms recommended.`;
    } else {
      return `Higher risk profile requiring conservative approach. Financial stability ${stability}%, reputation risk ${reputation}%. Enhanced due diligence recommended.`;
    }
  }

  private formatLoanTerms(aiAnalysis: OpenAIDomainAnalysis, totalScore: number) {
    const baseAmount = Math.pow(10, 3 + (totalScore / 20)); // $1K to $100M scale
    
    let riskTier: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' = 'BBB';
    if (totalScore >= 95) riskTier = 'AAA';
    else if (totalScore >= 90) riskTier = 'AA';
    else if (totalScore >= 80) riskTier = 'A';
    else if (totalScore >= 70) riskTier = 'BBB';
    else if (totalScore >= 60) riskTier = 'BB';
    else if (totalScore >= 50) riskTier = 'B';
    else riskTier = 'CCC';

    return {
      maxLoanAmount: Math.round(baseAmount * (aiAnalysis.loanRecommendation.recommendedLTV / 100)),
      recommendedLTV: aiAnalysis.loanRecommendation.recommendedLTV,
      interestRateAdjustment: aiAnalysis.loanRecommendation.interestRateModifier * 100, // Convert to basis points
      riskTier,
      termRecommendation: this.generateTermRecommendation(aiAnalysis, riskTier),
    };
  }

  private generateTermRecommendation(aiAnalysis: OpenAIDomainAnalysis, riskTier: string): string {
    if (riskTier === 'AAA' || riskTier === 'AA') {
      return 'Premium terms available: 3-5 year terms, quarterly interest payments, minimal collateral requirements.';
    } else if (riskTier === 'A' || riskTier === 'BBB') {
      return 'Standard terms: 1-3 year terms, monthly payments, standard collateral requirements.';
    } else {
      return 'Conservative terms: 6-18 month terms, bi-weekly payments, enhanced collateral and monitoring required.';
    }
  }

  private generateDetailedReasoning(domain: string, scores: any): string {
    return `
Comprehensive Analysis for ${domain}:

SCORING BREAKDOWN:
- Technical Foundation: ${scores.ageScore + scores.lengthScore + scores.extensionScore}/45
- Market Intelligence: ${scores.keywordScore + scores.trafficScore + scores.marketScore}/50  
- Protocol Relevance: ${scores.domaScore}/5

RISK ASSESSMENT:
The domain demonstrates ${scores.totalScore >= 80 ? 'excellent' : scores.totalScore >= 60 ? 'good' : 'limited'} lending potential with a total score of ${scores.totalScore}/100.

AI CONFIDENCE: ${scores.confidenceLevel}% - ${scores.confidenceLevel >= 80 ? 'High confidence in analysis' : scores.confidenceLevel >= 60 ? 'Moderate confidence' : 'Limited data availability'}
    `.trim();
  }

  private generateSummaryReasoning(domain: string, scores: any): string {
    const quality = scores.totalScore >= 80 ? 'Premium' : scores.totalScore >= 60 ? 'Standard' : 'Basic';
    return `${domain}: ${quality} domain (${scores.totalScore}/100) - AI Confidence: ${scores.confidenceLevel}%`;
  }

  private generateInvestorReasoning(domain: string, scores: any): string {
    return `
INVESTMENT GRADE ANALYSIS - ${domain}

Risk Rating: ${scores.loanTerms?.riskTier || 'N/A'}
Expected LTV: ${scores.loanTerms?.recommendedLTV || 'N/A'}%
Rate Adjustment: ${scores.loanTerms?.interestRateAdjustment || 0} basis points

Portfolio Recommendation: ${scores.totalScore >= 80 ? 'APPROVED for premium allocation' : scores.totalScore >= 60 ? 'APPROVED for standard allocation' : 'REQUIRES enhanced due diligence'}
    `.trim();
  }

  private generateBorrowerReasoning(domain: string, scores: any): string {
    return `
Your Domain Assessment - ${domain}

Score: ${scores.totalScore}/100
Available Loan: Up to $${scores.loanTerms?.maxLoanAmount?.toLocaleString() || 'N/A'}
Loan-to-Value: ${scores.loanTerms?.recommendedLTV || 'N/A'}%

${scores.totalScore >= 80 ? '🟢 Excellent! You qualify for our best rates.' : 
  scores.totalScore >= 60 ? '🟡 Good standing. Standard terms available.' : 
  '🟠 Limited options. Consider domain improvements.'}
    `.trim();
  }
}
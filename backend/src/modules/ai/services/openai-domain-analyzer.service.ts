import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface OpenAIDomainAnalysis {
  // Primary Score (0-100)
  totalScore: number;             // Overall domain score for lending
  
  // Standardized Core Scoring (0-100 each)
  brandRecognition: number;       // Global brand awareness and recognition
  brandLegitimacy: number;        // Official brand vs trademark squatting
  marketValue: number;            // Market position and commercial value
  businessLegitimacy: number;     // Real business vs domain speculation
  brandability: number;           // How brandable/memorable the domain is
  trustworthiness: number;        // Overall trust and reputation indicators
  
  // Brand Analysis (NEW - Critical for lending)
  brandAnalysis: {
    isOfficialBrand: boolean;     // True official brand vs variation
    brandVariationType: 'official' | 'premium-generic' | 'variation' | 'random';
    officialBrandScore: number;   // 0-100: How close to official brand
    trademarkRisk: number;        // 0-100: Risk of trademark issues (higher = more risk)
    brandEquityScore: number;     // 0-100: Actual brand equity value
  };
  
  // Detailed Company Insights
  companyInfo: {
    name: string;
    industry: string;
    marketCap?: string;
    foundedYear?: number;
    isPubliclyTraded: boolean;
    revenue?: string;
    employees?: number;
  };
  
  // Enhanced Risk Assessment
  riskFactors: {
    overallRisk: 'low' | 'medium' | 'high';
    financialStability: number;   // 0-100 (higher = more stable)
    reputationRisk: number;       // 0-100 (higher = more risk)
    marketVolatility: number;     // 0-100 (higher = more volatile)
    legalRisk: number;           // 0-100 (trademark/legal issues risk)
  };
  
  // Lending-Optimized Recommendations
  loanRecommendation: {
    maxLoanPercentage: number;    // 0-80 (percentage of domain value)
    recommendedLTV: number;       // Loan-to-value ratio
    interestRateModifier: number; // +/- adjustment to base rate
    reasoning: string;
    collateralQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
  
  // AI Analysis Metadata
  confidenceScore: number;        // 0-100 (AI confidence in analysis)
  analysisReasoning: string;      // Detailed explanation with facts
  redFlags: string[];             // Concerning factors for lending
  positiveIndicators: string[];   // Strengths for collateral value
  dataSourcesUsed: string[];      // What data informed this analysis
}

@Injectable()
export class OpenAIDomainAnalyzerService {
  private readonly logger = new Logger(OpenAIDomainAnalyzerService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({
      apiKey: apiKey || undefined, // Will be undefined if no key provided
    });
  }

  /**
   * Analyze domain using OpenAI for comprehensive business intelligence
   */
  async analyzeWithOpenAI(domain: string): Promise<OpenAIDomainAnalysis> {
    const openaiKey = this.configService.get('OPENAI_API_KEY');
    
    if (!openaiKey || openaiKey === 'sk-your-openai-api-key-here') {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable to enable AI domain analysis.');
    }

    try {
      const prompt = this.buildComprehensivePrompt(domain);
      const response = await this.callOpenAI(prompt);
      return this.parseOpenAIResponse(response, domain);
    } catch (error) {
      this.logger.error(`OpenAI analysis failed for ${domain}:`, error.message);
      throw new Error(`OpenAI analysis failed for ${domain}: ${error.message}`);
    }
  }

  private buildComprehensivePrompt(domain: string): string {
    return `Act as a domain valuer, you are professional domain auditor and give lending based on that domain collateral.

SCORING PHILOSOPHY:
- As long as it's a branded and legit or profitable company: give super high score 95+
- Potential domains like kick.com, 1.com, three.com, fun.com, time.fun: give them great score 75+  
- Average domains like superlongandmulti.com: give it average like 40-70
- Random or long or boring or useless and unbrandable: give it 0-30 or near 0

CRITICAL REQUIREMENTS:
- Respond ONLY with valid JSON (no markdown, no explanations outside JSON)
- All scores must be integers between 0-100
- Be precise with lending recommendations
- Provide clear reasoning for scores

JSON SCHEMA (respond with exactly this structure):

{
  "totalScore": <0-100 integer>,
  "brandLegitimacy": <0-100 integer>,
  "brandRecognition": <0-100 integer>, 
  "marketValue": <0-100 integer>,
  "businessLegitimacy": <0-100 integer>,
  "brandability": <0-100 integer>,
  "trustworthiness": <0-100 integer>,
  
  "brandAnalysis": {
    "isOfficialBrand": true/false,
    "brandVariationType": "official/premium-generic/variation/random",
    "officialBrandScore": <0-100 integer>,
    "trademarkRisk": <0-100 integer>,
    "brandEquityScore": <0-100 integer>
  },
  
  "companyInfo": {
    "name": "Company name",
    "industry": "Primary industry", 
    "isPubliclyTraded": true/false
  },
  
  "riskFactors": {
    "overallRisk": "low/medium/high",
    "financialStability": <0-100 integer>,
    "reputationRisk": <0-100 integer>,
    "legalRisk": <0-100 integer>
  },
  
  "loanRecommendation": {
    "recommendedLTV": <20-75 integer>,
    "interestRateModifier": <-5 to +10 integer>,
    "collateralQuality": "excellent/good/fair/poor",
    "reasoning": "Brief explanation for score"
  },
  
  "confidenceScore": <0-100 integer>,
  "analysisReasoning": "Why this score - be concise",
  "positiveIndicators": ["List key strengths"],
  "redFlags": ["List main concerns"]
}

EXAMPLES FOR CLARITY:

MAJOR BRANDS (95-100 total score):
- apple.com, google.com, cocacola.com, microsoft.com → totalScore: 95-100
- Lending: 70-75% LTV, excellent collateral, -2% rate

HIGH-POTENTIAL DOMAINS (75-85 total score):  
- kick.com, one.com, three.com, fun.com, time.fun → totalScore: 75-85
- Lending: 60-65% LTV, good collateral, -1% rate

AVERAGE DOMAINS (40-70 total score):
- superlongandmulti.com, mybusiness.net, restaurant123.com → totalScore: 40-70
- Lending: 40-50% LTV, fair collateral, +0% rate

RANDOM/POOR DOMAINS (0-30 total score):
- aowkoaskdajsd.com, xkjfhskjfh.net, randomstring123.org → totalScore: 0-30
- Lending: 20-25% LTV, poor collateral, +3% rate

Domain to analyze: ${domain}

IMPORTANT: The totalScore should be the primary indicator. Set brandLegitimacy, brandRecognition, marketValue, businessLegitimacy, and brandability to support the totalScore logically.`;
  }

  private async callOpenAI(prompt: string): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a senior financial analyst specializing in domain valuation for cryptocurrency lending. Provide accurate, conservative risk assessments based on factual business intelligence.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1500,
      temperature: 0.1, // Very low temperature for consistent scoring
      response_format: { type: "json_object" }, // Force JSON output
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    return JSON.parse(content);
  }

  private parseOpenAIResponse(response: any, domain: string): OpenAIDomainAnalysis {
    // Validate and sanitize OpenAI response
    return {
      totalScore: this.validateScore(response.totalScore),
      brandRecognition: this.validateScore(response.brandRecognition),
      brandLegitimacy: this.validateScore(response.brandLegitimacy),
      marketValue: this.validateScore(response.marketValue),
      businessLegitimacy: this.validateScore(response.businessLegitimacy),
      brandability: this.validateScore(response.brandability),
      trustworthiness: this.validateScore(response.trustworthiness),
      
      brandAnalysis: {
        isOfficialBrand: Boolean(response.brandAnalysis?.isOfficialBrand),
        brandVariationType: this.validateBrandVariationType(response.brandAnalysis?.brandVariationType),
        officialBrandScore: this.validateScore(response.brandAnalysis?.officialBrandScore),
        trademarkRisk: this.validateScore(response.brandAnalysis?.trademarkRisk),
        brandEquityScore: this.validateScore(response.brandAnalysis?.brandEquityScore),
      },
      
      companyInfo: {
        name: response.companyInfo?.name || domain.split('.')[0],
        industry: response.companyInfo?.industry || 'Unknown',
        marketCap: response.companyInfo?.marketCap,
        foundedYear: response.companyInfo?.foundedYear,
        isPubliclyTraded: Boolean(response.companyInfo?.isPubliclyTraded),
        revenue: response.companyInfo?.revenue,
        employees: response.companyInfo?.employees,
      },
      
      riskFactors: {
        overallRisk: this.validateRiskLevel(response.riskFactors?.overallRisk),
        financialStability: this.validateScore(response.riskFactors?.financialStability),
        reputationRisk: this.validateScore(response.riskFactors?.reputationRisk),
        marketVolatility: this.validateScore(response.riskFactors?.marketVolatility),
        legalRisk: this.validateScore(response.riskFactors?.legalRisk),
      },
      
      loanRecommendation: {
        maxLoanPercentage: Math.min(80, Math.max(0, response.loanRecommendation?.maxLoanPercentage || 40)),
        recommendedLTV: Math.min(80, Math.max(0, response.loanRecommendation?.recommendedLTV || 35)),
        interestRateModifier: Math.min(10, Math.max(-5, response.loanRecommendation?.interestRateModifier || 0)),
        reasoning: response.loanRecommendation?.reasoning || 'Standard conservative analysis',
        collateralQuality: this.validateCollateralQuality(response.loanRecommendation?.collateralQuality),
      },
      
      confidenceScore: this.validateScore(response.confidenceScore),
      analysisReasoning: response.analysisReasoning || 'AI analysis completed with standard methodology',
      redFlags: Array.isArray(response.redFlags) ? response.redFlags : [],
      positiveIndicators: Array.isArray(response.positiveIndicators) ? response.positiveIndicators : [],
      dataSourcesUsed: Array.isArray(response.dataSourcesUsed) ? response.dataSourcesUsed : ['AI knowledge base'],
    };
  }


  private validateScore(score: any): number {
    const num = Number(score);
    return isNaN(num) ? 50 : Math.min(100, Math.max(0, num));
  }

  private validateRiskLevel(risk: any): 'low' | 'medium' | 'high' {
    if (typeof risk === 'string' && ['low', 'medium', 'high'].includes(risk)) {
      return risk as 'low' | 'medium' | 'high';
    }
    return 'medium';
  }

  private validateBrandVariationType(type: any): 'official' | 'premium-generic' | 'variation' | 'random' {
    if (typeof type === 'string' && ['official', 'premium-generic', 'variation', 'random'].includes(type)) {
      return type as 'official' | 'premium-generic' | 'variation' | 'random';
    }
    return 'random';
  }

  private validateCollateralQuality(quality: any): 'excellent' | 'good' | 'fair' | 'poor' {
    if (typeof quality === 'string' && ['excellent', 'good', 'fair', 'poor'].includes(quality)) {
      return quality as 'excellent' | 'good' | 'fair' | 'poor';
    }
    return 'fair';
  }
}
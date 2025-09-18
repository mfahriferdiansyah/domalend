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
    return `You are an elite domain valuation expert specializing in business intelligence for cryptocurrency lending. Focus PURELY on business value, brand recognition, and commercial potential. NO technical analysis.

🎯 ULTRA-PRECISE SCORING TIERS:

🏆 TIER 1: LEGENDARY BRANDS (95-100 points)
Examples: apple.com, google.com, cocacola.com, microsoft.com, amazon.com, netflix.com, tesla.com, facebook.com
- Fortune 500/Global mega-corporations with trillion+ market caps
- Household name recognition worldwide
- Decades of established business presence
- Massive revenue streams and brand equity
- Zero business risk, maximum collateral value
- Lending: 70-75% LTV, excellent collateral, -2% interest

🚀 TIER 2: PREMIUM DOMAINS (80-94 points)
Examples: one.com, kick.com, 1.com, 2.com, start.com, fun.com, time.com, shop.com, buy.com
- Ultra-short (1-4 chars) or perfect generic terms
- Massive brandability and commercial potential
- Clear business applications across industries
- High memorability and marketing value
- Premium domain parking/development potential
- Lending: 60-70% LTV, good collateral, -1% interest

💼 TIER 3: QUALITY POTENTIAL (60-79 points)
Examples: myshop.com, golfclub.com, restaurant.com, fitness.net, autoparts.org
- Clear business intent and commercial application
- Good brandability for specific industries
- Established or emerging business categories
- Reasonable memorability and marketing appeal
- Solid commercial development potential
- Lending: 45-60% LTV, fair collateral, 0% interest

📊 TIER 4: AVERAGE DOMAINS (40-59 points)
Examples: chihuahuamyydog.com, bestservices123.com, qualityproducts.org, myawesomecompany.net
- Readable and understandable purpose
- Longer but still brandable names
- Moderate commercial appeal
- Some market niche potential
- Limited but viable business use cases
- Lending: 30-45% LTV, fair collateral, +1% interest

⚠️ TIER 5: WEAK READABLE (20-39 points)
Examples: verylongdomainnamethatisstillreadable.com, my-super-long-business-name.net
- Technically readable but too long/complex
- Poor brandability due to length
- Limited commercial appeal
- Difficult to remember or market
- Minimal business development potential
- Lending: 20-30% LTV, poor collateral, +2% interest

❌ TIER 6: BARELY READABLE (10-19 points)
Examples: qwertykeyboard.com, randomwordscombined.net, mixedupphrasestogether.org
- Technically words but poor combination
- Very low brandability
- Almost no commercial value
- Difficult pronunciation/spelling
- Pure speculation investment
- Lending: 15-25% LTV, poor collateral, +3% interest

🗑️ TIER 7: GARBAGE DOMAINS (0-9 points)
Examples: aowkoaskdajsd.com, xkjfhskjfh.net, randomstring123.org, asdfghjkl.com
- Complete gibberish or random characters
- Zero commercial value
- No brandability whatsoever
- Pure domain spam/speculation
- Lending: 10-15% LTV, very poor collateral, +5% interest

🧠 ANALYSIS FRAMEWORK:

1. BRAND RECOGNITION: Is this an established global/regional brand?
2. BUSINESS LEGITIMACY: Real company vs domain speculation?
3. COMMERCIAL POTENTIAL: Clear business applications and revenue paths?
4. BRANDABILITY: Memorable, pronounceable, marketable?
5. MARKET POSITION: Industry leadership or niche dominance?
6. TRADEMARK RISK: Official brand vs potential infringement?
7. FINANCIAL STABILITY: Company health and business sustainability?

📋 REQUIRED JSON RESPONSE:

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
    "name": "Company/Brand name",
    "industry": "Primary industry/sector",
    "isPubliclyTraded": true/false
  },

  "riskFactors": {
    "overallRisk": "low/medium/high",
    "financialStability": <0-100 integer>,
    "reputationRisk": <0-100 integer>,
    "legalRisk": <0-100 integer>
  },

  "loanRecommendation": {
    "recommendedLTV": <10-75 integer>,
    "interestRateModifier": <-2 to +5 integer>,
    "collateralQuality": "excellent/good/fair/poor",
    "reasoning": "Concise lending rationale"
  },

  "confidenceScore": <0-100 integer>,
  "analysisReasoning": "Clear explanation of score rationale",
  "positiveIndicators": ["Key business strengths"],
  "redFlags": ["Major concerns or risks"]
}

🚨 CRITICAL RULES:
- ONLY business intelligence and brand analysis - NO technical domain factors
- Be extremely precise with tier classifications
- Major brands MUST score 95+, premium domains 80+
- Focus on real business value and commercial potential
- Consider trademark risks and legal implications
- Provide conservative but accurate lending recommendations

Domain to analyze: ${domain}

Analyze this domain's business intelligence, brand value, and commercial potential to determine its precise tier classification and lending suitability.`;
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
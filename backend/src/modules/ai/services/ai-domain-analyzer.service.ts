import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface AIDomainAnalysis {
  marketTrendsScore: number; // 0-100
  brandStrengthScore: number; // 0-100
  industryRelevance: string[];
  competitorAnalysis: {
    similarDomains: string[];
    marketPosition: 'premium' | 'standard' | 'budget';
    uniqueness: number; // 0-100
  };
  aiConfidence: number; // 0-100
  reasoning: string;
}

@Injectable()
export class AIDomainAnalyzerService {
  private readonly logger = new Logger(AIDomainAnalyzerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Analyze domain using OpenAI GPT-4 for advanced insights
   */
  async analyzeWithAI(domain: string): Promise<AIDomainAnalysis> {
    const openaiKey = this.configService.get('OPENAI_API_KEY');
    
    if (!openaiKey) {
      return this.getFallbackAnalysis(domain);
    }

    try {
      const prompt = this.buildAnalysisPrompt(domain);
      const response = await this.callOpenAI(prompt, openaiKey);
      return this.parseAIResponse(response);
    } catch (error) {
      this.logger.error(`AI analysis failed for ${domain}:`, error.message);
      return this.getFallbackAnalysis(domain);
    }
  }

  /**
   * Get real-time search trends using SERP API (free tier available)
   */
  async getSearchTrends(domain: string): Promise<{
    searchVolume: number;
    trendDirection: 'rising' | 'stable' | 'declining';
    relatedKeywords: string[];
  }> {
    const serpKey = this.configService.get('SERP_API_KEY');
    
    if (!serpKey) {
      return this.estimateSearchTrends(domain);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`https://serpapi.com/search`, {
          params: {
            q: domain.split('.')[0],
            api_key: serpKey,
            engine: 'google_trends',
          },
        }),
      );

      return this.parseSearchTrends(response.data);
    } catch (error) {
      this.logger.error(`Search trends failed for ${domain}:`, error.message);
      return this.estimateSearchTrends(domain);
    }
  }

  /**
   * Get domain age and historical data using WHOIS API
   */
  async getDomainHistory(domain: string): Promise<{
    age: number; // years
    registrar: string;
    hasBeenDropped: boolean;
    trustScore: number; // 0-100
  }> {
    const whoisKey = this.configService.get('WHOIS_API_KEY');
    
    if (!whoisKey) {
      return this.estimateDomainHistory(domain);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`https://api.whoisfreaks.com/v1.0/whois`, {
          params: {
            whois: 'live',
            domainName: domain,
            apiKey: whoisKey,
          },
        }),
      );

      return this.parseDomainHistory(response.data);
    } catch (error) {
      this.logger.error(`Domain history failed for ${domain}:`, error.message);
      return this.estimateDomainHistory(domain);
    }
  }

  private buildAnalysisPrompt(domain: string): string {
    const sld = domain.split('.')[0];
    
    return `Analyze the domain "${domain}" for investment potential. Provide a JSON response with:

1. marketTrendsScore (0-100): How well this domain aligns with current market trends
2. brandStrengthScore (0-100): Brand memorability, pronunciation, and commercial appeal  
3. industryRelevance: Array of relevant industries/categories
4. competitorAnalysis: 
   - similarDomains: 3-5 similar domain examples
   - marketPosition: premium/standard/budget classification
   - uniqueness: 0-100 score for how unique this domain is
5. aiConfidence (0-100): Your confidence in this analysis
6. reasoning: Brief explanation of the scores

Domain to analyze: "${sld}"
TLD: "${domain.split('.').pop()}"

Focus on: brandability, memorability, commercial potential, industry fit, and market trends.`;
  }

  private async callOpenAI(prompt: string, apiKey: string): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini', // Cheaper model, still very good
          messages: [
            {
              role: 'system',
              content: 'You are a domain valuation expert. Always respond with valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 1000,
          temperature: 0.3,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    return JSON.parse(response.data.choices[0].message.content);
  }

  private parseAIResponse(response: any): AIDomainAnalysis {
    return {
      marketTrendsScore: response.marketTrendsScore || 50,
      brandStrengthScore: response.brandStrengthScore || 50,
      industryRelevance: response.industryRelevance || ['General'],
      competitorAnalysis: {
        similarDomains: response.competitorAnalysis?.similarDomains || [],
        marketPosition: response.competitorAnalysis?.marketPosition || 'standard',
        uniqueness: response.competitorAnalysis?.uniqueness || 50,
      },
      aiConfidence: response.aiConfidence || 70,
      reasoning: response.reasoning || 'AI analysis completed',
    };
  }

  private getFallbackAnalysis(domain: string): AIDomainAnalysis {
    const sld = domain.split('.')[0];
    const tld = domain.split('.').pop();
    
    let brandStrength = 50;
    let marketTrends = 50;
    
    // Enhanced heuristic analysis
    if (sld.length >= 4 && sld.length <= 8) brandStrength += 20;
    if (tld === 'com') brandStrength += 15;
    if (/^[a-z]+$/.test(sld)) brandStrength += 10; // Only letters
    
    // Market trend estimation based on patterns
    const trendyPatterns = ['ai', 'tech', 'app', 'web', 'cloud', 'smart', 'digital'];
    if (trendyPatterns.some(pattern => sld.includes(pattern))) {
      marketTrends += 25;
    }

    return {
      marketTrendsScore: Math.min(marketTrends, 100),
      brandStrengthScore: Math.min(brandStrength, 100),
      industryRelevance: this.guessIndustries(sld),
      competitorAnalysis: {
        similarDomains: this.generateSimilarDomains(sld),
        marketPosition: brandStrength > 70 ? 'premium' : brandStrength > 50 ? 'standard' : 'budget',
        uniqueness: this.calculateUniqueness(sld),
      },
      aiConfidence: 60,
      reasoning: 'Heuristic analysis based on domain patterns and characteristics',
    };
  }

  private estimateSearchTrends(domain: string) {
    const sld = domain.split('.')[0];
    const baseVolume = Math.max(100, sld.length * 150 - Math.random() * 50);
    
    return {
      searchVolume: Math.floor(baseVolume),
      trendDirection: 'stable' as const,
      relatedKeywords: this.generateRelatedKeywords(sld),
    };
  }

  private estimateDomainHistory(domain: string) {
    // Estimate based on TLD and patterns
    const tld = domain.split('.').pop();
    const ageEstimate = tld === 'com' ? Math.random() * 15 + 5 : Math.random() * 10 + 2;
    
    return {
      age: Math.floor(ageEstimate),
      registrar: 'Unknown',
      hasBeenDropped: false,
      trustScore: tld === 'com' ? 85 : 70,
    };
  }

  private parseSearchTrends(data: any) {
    // Parse SERP API response
    return {
      searchVolume: data.interest_over_time?.[0]?.value || 50,
      trendDirection: 'stable' as const,
      relatedKeywords: data.related_queries?.map((q: any) => q.query) || [],
    };
  }

  private parseDomainHistory(data: any) {
    const createdDate = new Date(data.create_date);
    const age = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    return {
      age: Math.floor(age),
      registrar: data.registrar_name || 'Unknown',
      hasBeenDropped: false, // Would need additional analysis
      trustScore: age > 5 ? 90 : age > 2 ? 75 : 60,
    };
  }

  private guessIndustries(sld: string): string[] {
    const patterns = {
      'tech': ['ai', 'app', 'tech', 'soft', 'code', 'dev', 'digital', 'web'],
      'finance': ['pay', 'coin', 'bank', 'fund', 'invest', 'crypto', 'money'],
      'health': ['health', 'med', 'care', 'fit', 'wellness', 'bio'],
      'education': ['learn', 'edu', 'course', 'school', 'study', 'academy'],
      'ecommerce': ['shop', 'store', 'buy', 'sell', 'market', 'deal'],
    };

    const industries: string[] = [];
    for (const [industry, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => sld.includes(keyword))) {
        industries.push(industry);
      }
    }

    return industries.length > 0 ? industries : ['General'];
  }

  private generateSimilarDomains(sld: string): string[] {
    const variations = [
      `${sld}app.com`,
      `${sld}hub.com`,
      `${sld}pro.com`,
      `get${sld}.com`,
      `${sld}ly.com`,
    ];
    return variations.slice(0, 3);
  }

  private calculateUniqueness(sld: string): number {
    // Simple uniqueness heuristic
    let uniqueness = 70;
    
    if (sld.length > 12) uniqueness -= 20;
    if (/\d/.test(sld)) uniqueness -= 10;
    if (/-/.test(sld)) uniqueness -= 15;
    
    const commonWords = ['get', 'my', 'the', 'best', 'top', 'new', 'app'];
    if (commonWords.some(word => sld.includes(word))) {
      uniqueness -= 20;
    }

    return Math.max(10, Math.min(100, uniqueness));
  }

  private generateRelatedKeywords(sld: string): string[] {
    return [
      `${sld} website`,
      `${sld} app`,
      `${sld} online`,
      `${sld} service`,
      `${sld} platform`,
    ].slice(0, 3);
  }
}
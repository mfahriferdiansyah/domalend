import OpenAI from "openai";
import * as dotenv from "dotenv";
dotenv.config();

export interface DomainScore {
	score: number;
	confidence: number;
	reasoning: string;
}

export class OpenAIAnalyzer {
	private openai: OpenAI;

	constructor() {
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			throw new Error("OPENAI_API_KEY must be set in environment variables");
		}
		this.openai = new OpenAI({ apiKey });
	}

	async analyzeDomain(domain: string): Promise<DomainScore> {
		try {
			const prompt = this.buildPrompt(domain);
			const response = await this.callOpenAI(prompt);
			return this.parseResponse(response);
		} catch (error: any) {
			console.error(`OpenAI analysis failed for ${domain}:`, error);
			throw new Error(`Failed to analyze domain: ${error?.message || "Unknown error"}`);
		}
	}

	private buildPrompt(domain: string): string {
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

📋 REQUIRED JSON RESPONSE:

{
  "totalScore": <0-100 integer>,
  "confidenceScore": <0-100 integer>,
  "analysisReasoning": "Clear explanation of score rationale with specific business facts"
}

🚨 CRITICAL RULES:
- ONLY business intelligence and brand analysis - NO technical domain factors
- Be extremely precise with tier classifications
- Major brands MUST score 95+, premium domains 80+
- Focus on real business value and commercial potential
- Provide conservative but accurate assessments

Domain to analyze: ${domain}

Analyze this domain's business intelligence, brand value, and commercial potential to determine its precise tier classification.`;
	}

	private async callOpenAI(prompt: string): Promise<any> {
		const response = await this.openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content:
						"You are a senior financial analyst specializing in domain valuation for cryptocurrency lending. Provide accurate, conservative risk assessments based on factual business intelligence.",
				},
				{
					role: "user",
					content: prompt,
				},
			],
			max_tokens: 1000,
			temperature: 0.1,
			response_format: { type: "json_object" },
		});

		const content = response.choices[0]?.message?.content;
		if (!content) {
			throw new Error("No response content from OpenAI");
		}

		return JSON.parse(content);
	}

	private parseResponse(response: any): DomainScore {
		return {
			score: this.validateScore(response.totalScore),
			confidence: this.validateScore(response.confidenceScore),
			reasoning: response.analysisReasoning || "AI analysis completed",
		};
	}

	private validateScore(score: any): number {
		const num = Number(score);
		return isNaN(num) ? 0 : Math.min(100, Math.max(0, num));
	}
}

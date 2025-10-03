import { ReclaimClient } from "@reclaimprotocol/zk-fetch";
import * as dotenv from "dotenv";
dotenv.config();

export interface DomainScoreWithProof {
	score: number;
	confidence: number;
	reasoning: string;
	zkProof: any; // ZK proof from Reclaim Protocol
	extractedValues?: any; // Extracted parameters from response
}

export class OpenAIAnalyzerZkFetch {
	private reclaimClient: ReclaimClient;
	private openaiApiKey: string;

	constructor() {
		const appId = process.env.APP_ID;
		const appSecret = process.env.APP_SECRET;
		const apiKey = process.env.OPENAI_API_KEY;

		if (!appId || !appSecret) {
			throw new Error(
				"APP_ID and APP_SECRET must be set in environment variables"
			);
		}
		if (!apiKey) {
			throw new Error("OPENAI_API_KEY must be set in environment variables");
		}

		this.reclaimClient = new ReclaimClient(appId, appSecret);
		this.openaiApiKey = apiKey;
	}

	async analyzeDomain(domain: string): Promise<DomainScoreWithProof> {
		try {
			const prompt = this.buildPrompt(domain);
			const { response, proof } = await this.callOpenAIWithZkFetch(prompt);
			const parsed = this.parseResponse(response, proof);
			return parsed;
		} catch (error: any) {
			console.error(`zkFetch OpenAI analysis failed for ${domain}:`, error);
			throw new Error(
				`Failed to analyze domain with zkFetch: ${
					error?.message || "Unknown error"
				}`
			);
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

	private async callOpenAIWithZkFetch(
		prompt: string
	): Promise<{ response: any; proof: any }> {
		const requestBody = {
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
		};

		// Public options (visible in proof)
		const publicOptions = {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		};

		// Private options (hidden from verifiers)
		const privateOptions = {
			headers: {
				Authorization: `Bearer ${this.openaiApiKey}`,
			},
			responseMatches: [
				{
					type: "regex" as const,
					value: "(?<response>.*)", // Capture entire response body
				},
			],
		};

		console.log("Calling OpenAI via zkFetch (generating ZK proof)...");

		// Call OpenAI with zkFetch
		const proof = await this.reclaimClient.zkFetch(
			"https://api.openai.com/v1/chat/completions",
			publicOptions,
			privateOptions,
			3, // retries
			5000 // retry interval
		);

		if (!proof) {
			throw new Error("Failed to generate proof");
		}

		console.log("zkFetch proof generated successfully!");

		// Debug: Log full proof structure
		console.log("\n🔍 DEBUG: Proof structure keys:", Object.keys(proof));
		console.log("🔍 DEBUG: claimData keys:", Object.keys(proof.claimData || {}));

		// Extract response from proof context (following reclaimZkFetch.ts pattern)
		const context = JSON.parse(proof.claimData.context);
		console.log("🔍 DEBUG: Context keys:", Object.keys(context));
		console.log("🔍 DEBUG: extractedParameters keys:", Object.keys(context.extractedParameters || {}));

		// Extract the full response body from extractedParameters
		const rawHttpResponse = context.extractedParameters?.response || "{}";

		console.log("🔍 DEBUG: Raw HTTP response length:", rawHttpResponse.length);

		// Parse HTTP response to extract JSON body
		// zkFetch captures the entire HTTP response including headers and chunked encoding
		// We need to extract just the JSON body
		let responseText;
		try {
			// Split by double newline to separate headers from body
			const parts = rawHttpResponse.split(/\r?\n\r?\n/);

			// The body is after the headers
			// For chunked encoding, the body starts with chunk size (in hex), then the actual content
			const bodyPart = parts.slice(1).join("\n\n");

			// Extract JSON from the response body
			// Look for the OpenAI API response format: {"id":"chatcmpl-...
			const jsonMatch = bodyPart.match(/\{[\s\S]*"id"[\s\S]*"choices"[\s\S]*\}/);

			if (!jsonMatch) {
				throw new Error("Could not find JSON in HTTP response body");
			}

			responseText = jsonMatch[0];
			console.log("🔍 DEBUG: Extracted JSON length:", responseText.length);
		} catch (e) {
			console.error("Failed to extract JSON from HTTP response:", e);
			console.error("Raw HTTP response was:", rawHttpResponse);
			throw new Error("Failed to parse HTTP response from zkFetch");
		}

		// Parse OpenAI response
		let parsedResponse;
		try {
			// OpenAI returns the response in a specific format
			const openaiResponse = JSON.parse(responseText);
			console.log("🔍 DEBUG: OpenAI response ID:", openaiResponse.id);
			const content = openaiResponse.choices?.[0]?.message?.content || "{}";
			console.log("🔍 DEBUG: Extracted content:", content);
			parsedResponse = JSON.parse(content);
			console.log("🔍 DEBUG: Final parsed response - score:", parsedResponse.totalScore);
		} catch (e) {
			console.error("Failed to parse OpenAI JSON response:", e);
			console.error("responseText was:", responseText);
			throw new Error("Invalid OpenAI response format");
		}

		return {
			response: parsedResponse,
			proof,
		};
	}

	private parseResponse(response: any, proof: any): DomainScoreWithProof {
		return {
			score: this.validateScore(response.totalScore),
			confidence: this.validateScore(response.confidenceScore),
			reasoning:
				response.analysisReasoning || "AI analysis completed via zkFetch",
			zkProof: proof,
			extractedValues: proof.extractedParameterValues,
		};
	}

	private validateScore(score: any): number {
		const num = Number(score);
		return isNaN(num) ? 0 : Math.min(100, Math.max(0, num));
	}
}

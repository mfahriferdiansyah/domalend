import { OpenAIAnalyzerZkFetch } from "./openaiAnalyzerZkFetch";
import * as dotenv from "dotenv";
dotenv.config();

async function testZkFetch() {
	console.log("🧪 Testing zkFetch OpenAI analyzer...\n");

	const analyzer = new OpenAIAnalyzerZkFetch();
	const testDomain = "jordanville.ai";

	try {
		console.log(`Testing domain: ${testDomain}`);
		const result = await analyzer.analyzeDomain(testDomain);

		console.log("\n✅ SUCCESS! zkFetch returned valid score:");
		console.log(`   Domain: ${testDomain}`);
		console.log(`   Score: ${result.score}/100`);
		console.log(`   Confidence: ${result.confidence}%`);
		console.log(`   Reasoning: ${result.reasoning.substring(0, 200)}...`);
		console.log(
			`   ZK Proof: ${result.zkProof ? "✓ Present" : "✗ Missing"}`
		);
	} catch (error) {
		console.error("\n❌ FAILED! Error during zkFetch test:");
		console.error(error);
		process.exit(1);
	}
}

testZkFetch();

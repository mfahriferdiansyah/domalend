import {
	Alchemy,
	AssetTransfersCategory,
	Network,
	SortingOrder,
} from "alchemy-sdk";
import axios from "axios";
import { PinataSDK } from "pinata";
import { ReclaimClient } from "@reclaimprotocol/zk-fetch";
import { transformForOnchain, verifyProof } from "@reclaimprotocol/js-sdk";
import * as dotenv from "dotenv";
dotenv.config();

// Alchemy Config (Arbitrum)
const arbConfig = {
	apiKey: process.env.ALCHEMY_API_KEY!, // Replace with your key
	network: Network.ARB_MAINNET,
};
const alchemyArb = new Alchemy(arbConfig);

// Pinata Config (for IPFS)
const pinata = new PinataSDK({
	pinataJwt: process.env.PINATA_JWT!,
	pinataGateway: process.env.PINATA_GATEWAY!,
});

// Reclaim Config (for zkFetch)
const reclaimClient = new ReclaimClient(
	process.env.APP_ID!,
	process.env.APP_SECRET!
);
// Score Weights
const SCORE_WEIGHTS: { [key: string]: number } = {
	walletAge: 0.32,
	transactionActivity: 0.32,
	tokenDiversity: 0.11,
	ensOwnership: 0.11,
	nftOwnership: 0.05,
};

// ENS Response Interface
interface ENSData {
	address: string;
	ens?: string;
}

// Certificate Interface
interface CreditCertificate {
	address: string;
	score: string;
	timestamp: string;
	chain: string;
}

// Arbitrum Launch Date
const ARBITRUM_LAUNCH_DATE = new Date("2021-08-31").getTime();
const CURRENT_DATE = new Date().getTime(); // Fixed for consistency
const MAX_AGE_MS = CURRENT_DATE - ARBITRUM_LAUNCH_DATE; // ~1,316 days in milliseconds

// Fetch ENS Ownership
async function getENSOwnership(address: string): Promise<number> {
	try {
		const response = await axios.get<ENSData>(
			`https://api.ensdata.net/${address.toLowerCase()}`
		);
		return response?.data?.ens ? 1 : 0;
	} catch (error) {
		console.error("ENS fetch error:");
		return 0;
	}
}

// Calculate Credit Score with First Transaction Age
async function calculateCreditScore(address: string): Promise<BigInt> {
	// Wallet Age (based on first transaction)
	const transfers = await alchemyArb.core.getAssetTransfers({
		fromAddress: address,
		category: [
			"external",
			"erc20",
			"erc721",
			"erc1155",
		] as AssetTransfersCategory[],
		order: "asc" as SortingOrder, // Oldest first
		maxCount: 1, // Only need the first
	});

	let firstTxTimestamp: number;
	if (transfers.transfers.length > 0) {
		const blockNum = parseInt(transfers.transfers[0].blockNum, 16); // Convert hex to decimal
		const block = await alchemyArb.core.getBlock(blockNum);
		firstTxTimestamp = block.timestamp * 1000; // Convert seconds to milliseconds
	} else {
		firstTxTimestamp = ARBITRUM_LAUNCH_DATE; // Fallback to launch if no txs
	}
	const walletAgeMs = CURRENT_DATE - firstTxTimestamp;
	const walletAgeScore = Math.min(walletAgeMs / MAX_AGE_MS, 1); //

	// Transaction Activity
	const txCount = await alchemyArb.core.getTransactionCount(address);
	const txActivityScore = txCount > 50 ? 1 : txCount / 50;

	// Token Diversity
	const { tokenBalances } = await alchemyArb.core.getTokenBalances(address);
	const tokenDiversityScore = Math.min(tokenBalances.length / 10, 1);

	// ENS Ownership
	const ensScore = await getENSOwnership(address);

	// NFT Ownership
	const nfts = await alchemyArb.nft.getNftsForOwner(address);
	const nftScore = nfts.totalCount > 0 ? 1 : 0;

	// Total Score
	const totalScore =
		walletAgeScore * SCORE_WEIGHTS.walletAge +
		txActivityScore * SCORE_WEIGHTS.transactionActivity +
		tokenDiversityScore * SCORE_WEIGHTS.tokenDiversity +
		ensScore * SCORE_WEIGHTS.ensOwnership +
		nftScore * SCORE_WEIGHTS.nftOwnership;

	// Scale to 18 decimals
	const finalCScore = BigInt(Math.round(totalScore * 1e18));

	// Normalize to 5-10 range
	const normalizedFinalCScore = normalizedFinalScore(finalCScore);
	console.log("creditScore", normalizedFinalCScore);
	console.log("cScore displayed: ", Number(normalizedFinalCScore) / 1e18);

	return normalizedFinalCScore; // Return normalized score as bigint
}

// Normalization Function
function normalizedFinalScore(currentCScore: bigint): bigint {
	const minRawScore = 0; // Minimum raw score (all parameters 0)
	const maxRawScore =
		(SCORE_WEIGHTS.walletAge +
			SCORE_WEIGHTS.transactionActivity +
			SCORE_WEIGHTS.tokenDiversity +
			SCORE_WEIGHTS.ensOwnership +
			SCORE_WEIGHTS.nftOwnership) *
		1e18; // Max raw score (all parameters 1)

	const minTarget = BigInt(5e18); // 5.0 in 18 decimals
	const maxTarget = BigInt(10e18); // 10.0 in 18 decimals

	// Normalize to 5-10 range
	const normalizedFinalCreditScore =
		((currentCScore - BigInt(minRawScore)) * (maxTarget - minTarget)) /
			BigInt(maxRawScore - minRawScore) +
		minTarget;

	return normalizedFinalCreditScore;
}
// Upload Certificate to IPFS
async function uploadCertificateToIPFS(
	address: string,
	score: BigInt
): Promise<string> {
	const certificate: CreditCertificate = {
		address,
		score: score.toString(),
		timestamp: new Date().toISOString(),
		chain: "Arbitrum",
	};
	try {
		const result = await pinata.upload.public
			.json({
				content: JSON.stringify(certificate),
				name: "creditCertificate.json",
				lang: "json",
			})
			.name(`data_${address}.json`);
		return result.cid;
	} catch (error) {
		console.error("IPFS upload error:", error);
		throw new Error("Failed to upload certificate to IPFS");
	}
}

// Verify Certificate with zkFetch
async function verifyCertificate(cid: string): Promise<any> {
	try {
		const ipfsUrl = `https://${process.env.PINATA_GATEWAY!}/ipfs/${cid}`;
		const proof = await reclaimClient.zkFetch(
			ipfsUrl,
			{ method: "GET" },
			{
				responseMatches: [
					{
						type: "regex",
						value: '\\\\\\"score\\\\\\":\\\\\\"(?<score>[0-9]+)\\\\\\"',
					},
				],
			}
		);

		if (!proof) {
			console.error("Failed to generate proof");
			return null;
		}

		const isValid = await verifyProof(proof);
		if (!isValid) {
			console.error("Proof is invalid");
			return null;
		}

		const proofData = await transformForOnchain(proof);
		return { transformedProof: proofData, proof };
	} catch (error) {
		console.error("zkFetch verification error:", error);
		return false;
	}
}

// Main Function
export async function generateAndVerifyCreditScore(
	address: string
): Promise<any> {
	try {
		const score = await calculateCreditScore(address);
		console.log(`Calculated Credit Score: ${score}`);

		const cid = await uploadCertificateToIPFS(address, score);
		console.log(`Certificate uploaded to IPFS with CID: ${cid}`);
		console.log(`IPFS URL: https://ipfs.io/ipfs/${cid}`);
		console.log(
			`IPFS GATEWAY URL: https://${process.env.PINATA_GATEWAY!}/ipfs/${cid}`
		);

		const proofData = await verifyCertificate(cid);
		console.log(
			`Certificate authenticity verified: ${proofData ? "Yes" : "No"}`
		);
		return proofData;
	} catch (error) {
		console.error("Error in process:", error);
		throw error;
	}
}

// Test
// const testAddress = "0x8757f328371e571308c1271bd82b91882253fdd1";
// generateAndVerifyCreditScore(testAddress);

import axios from "axios";
import * as dotenv from "dotenv";
dotenv.config();

export interface ScoreData {
	domain: string;
	tokenId: string;
	score: number;
	confidence: number;
	reasoning: string;
	operatorAddress: string;
	timestamp: string;
}

export interface IpfsUploadResult {
	ipfsHash: string;
	ipfsUrl: string;
}

export class IpfsUploader {
	private jwt: string;
	private gateway: string;

	constructor() {
		const pinataJwt = process.env.PINATA_JWT;
		const pinataGateway = process.env.PINATA_GATEWAY;

		if (!pinataJwt || !pinataGateway) {
			throw new Error(
				"PINATA_JWT and PINATA_GATEWAY must be set in environment variables"
			);
		}

		this.jwt = pinataJwt;
		this.gateway = pinataGateway;
	}

	/**
	 * Upload score data to IPFS via Pinata
	 */
	async uploadScoreData(data: ScoreData): Promise<IpfsUploadResult> {
		try {
			const scoreData = {
				domain: data.domain,
				tokenId: data.tokenId,
				score: data.score,
				confidence: data.confidence,
				reasoning: data.reasoning,
				metadata: {
					operatorAddress: data.operatorAddress,
					timestamp: data.timestamp,
					chainId: process.env.CHAIN_ID || "97476",
					version: "1.0.0",
					protocol: "DomaLend AVS",
				},
			};

			// Upload JSON to Pinata using REST API
			const response = await axios.post(
				"https://api.pinata.cloud/pinning/pinJSONToIPFS",
				scoreData,
				{
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${this.jwt}`,
					},
				}
			);

			return {
				ipfsHash: response.data.IpfsHash,
				ipfsUrl: `https://${this.gateway}/ipfs/${response.data.IpfsHash}`,
			};
		} catch (error: any) {
			console.error("IPFS upload failed:", error);
			throw new Error(`Failed to upload to IPFS: ${error?.message || 'Unknown error'}`);
		}
	}

	/**
	 * Get IPFS gateway URL for a hash
	 */
	getIpfsUrl(hash: string): string {
		return `https://${this.gateway}/ipfs/${hash}`;
	}
}

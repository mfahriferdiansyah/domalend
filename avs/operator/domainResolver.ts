import { ethers } from "ethers";
import axios from "axios";
import * as dotenv from "dotenv";
dotenv.config();

export interface DomainMetadata {
	name: string;
	description: string;
	image: string;
	external_url: string;
	attributes: Array<{
		trait_type: string;
		value: string | number;
		display_type?: string;
	}>;
}

export class DomainResolver {
	private domaContract: ethers.Contract;
	private readonly domaContractAddress =
		"0x424bDf2E8a6F52Bd2c1C81D9437b0DC0309DF90f";

	constructor(provider: ethers.Provider) {
		const domaAbi = [
			"function tokenURI(uint256 tokenId) view returns (string)",
			"function exists(uint256 tokenId) view returns (bool)",
			"function ownerOf(uint256 tokenId) view returns (address)",
		];

		this.domaContract = new ethers.Contract(
			this.domaContractAddress,
			domaAbi,
			provider
		);
	}

	/**
	 * Resolve domain name from token ID
	 */
	async resolveDomainName(tokenId: string): Promise<string | null> {
		try {
			console.log(`Resolving domain name for tokenId: ${tokenId}`);

			// Check if token exists
			const exists = await this.domaContract.exists(tokenId);
			if (!exists) {
				console.error(`Token ID ${tokenId} does not exist`);
				return null;
			}

			// Get token URI
			const tokenURI = await this.domaContract.tokenURI(tokenId);
			console.log(`Token URI for ${tokenId}: ${tokenURI}`);

			// Fetch metadata from URI
			const metadata = await this.fetchMetadataFromURI(tokenURI);
			if (!metadata) {
				console.error(`Could not fetch metadata for token ID ${tokenId}`);
				return null;
			}

			// Extract domain name from metadata
			const domainName = metadata.name;
			console.log(`Resolved tokenId ${tokenId} to domain: ${domainName}`);

			return domainName;
		} catch (error: any) {
			console.error(
				`Error resolving domain name for tokenId ${tokenId}:`,
				error.message
			);
			return null;
		}
	}

	/**
	 * Fetch metadata from token URI (IPFS or HTTP)
	 */
	private async fetchMetadataFromURI(
		tokenURI: string
	): Promise<DomainMetadata | null> {
		try {
			// Handle IPFS URIs
			let fetchUrl = tokenURI;
			if (tokenURI.startsWith("ipfs://")) {
				const ipfsHash = tokenURI.replace("ipfs://", "");
				fetchUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
			}

			const response = await axios.get(fetchUrl, {
				timeout: 10000,
				headers: { Accept: "application/json" },
			});

			return response.data as DomainMetadata;
		} catch (error: any) {
			console.error(
				`Error fetching metadata from URI ${tokenURI}:`,
				error.message
			);
			return null;
		}
	}

	/**
	 * Get full domain metadata
	 */
	async getDomainMetadata(tokenId: string): Promise<DomainMetadata | null> {
		try {
			const tokenURI = await this.domaContract.tokenURI(tokenId);
			return await this.fetchMetadataFromURI(tokenURI);
		} catch (error: any) {
			console.error(
				`Error fetching domain metadata for tokenId ${tokenId}:`,
				error.message
			);
			return null;
		}
	}
}

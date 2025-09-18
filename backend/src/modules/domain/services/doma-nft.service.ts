import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { ethers } from 'ethers';
import { firstValueFrom } from 'rxjs';

export interface DomaNFT {
  tokenId: string;
  owner: string;
  name: string;
  description: string;
  image: string;
  externalUrl: string;
  attributes: DomaNFTAttribute[];
  expirationDate?: number;
  tld?: string;
  characterLength?: number;
  registrar?: string;
}

export interface DomaNFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

export interface DomaNFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: DomaNFTAttribute[];
}

@Injectable()
export class DomaNftService {
  private readonly logger = new Logger(DomaNftService.name);
  private readonly domaContract: ethers.Contract;
  private readonly provider: ethers.JsonRpcProvider;
  private readonly domaContractAddress = '0x424bDf2E8a6F52Bd2c1C81D9437b0DC0309DF90f';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const rpcUrl = this.configService.get<string>('blockchain.rpcUrl') || 'https://rpc-testnet.doma.xyz';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    const domaAbi = [
      'function balanceOf(address owner) view returns (uint256)',
      'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
      'function ownerOf(uint256 tokenId) view returns (address)',
      'function tokenURI(uint256 tokenId) view returns (string)',
      'function expirationOf(uint256 tokenId) view returns (uint256)',
      'function exists(uint256 tokenId) view returns (bool)',
      'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
    ];

    this.domaContract = new ethers.Contract(
      this.domaContractAddress,
      domaAbi,
      this.provider
    );
  }

  /**
   * Get NFT balance for an address (cast-like approach)
   */
  async getNFTBalanceForAddress(address: string): Promise<{ address: string; balance: number; note: string }> {
    try {
      this.logger.log(`Getting NFT balance for address: ${address}`);

      const balance = await this.domaContract.balanceOf(address);
      const balanceNumber = Number(balance);

      this.logger.log(`Address ${address} owns ${balanceNumber} NFTs`);

      return {
        address,
        balance: balanceNumber,
        note: balanceNumber > 0
          ? `Address owns ${balanceNumber} NFT(s). Use batch verification with known token IDs to get details.`
          : 'Address owns no NFTs'
      };
    } catch (error) {
      this.logger.error(`Error getting NFT balance for address ${address}:`, error.message);
      throw new Error(`Failed to get NFT balance: ${error.message}`);
    }
  }

  /**
   * Verify which tokens from a list are owned by an address (cast-like batch approach)
   */
  async verifyTokenOwnership(address: string, tokenIds: string[]): Promise<DomaNFT[]> {
    try {
      this.logger.log(`Verifying ownership of ${tokenIds.length} tokens for address: ${address}`);

      const nfts: DomaNFT[] = [];

      // Batch check ownership using simple ownerOf calls (like cast commands)
      const ownershipPromises = tokenIds.map(async (tokenId) => {
        try {
          const owner = await this.domaContract.ownerOf(tokenId);
          if (owner.toLowerCase() === address.toLowerCase()) {
            this.logger.log(`Token ${tokenId} is owned by ${address}`);
            return await this.getNFTByTokenId(tokenId);
          }
          return null;
        } catch (error) {
          this.logger.warn(`Failed to check ownership of token ${tokenId}: ${error.message}`);
          return null;
        }
      });

      const results = await Promise.all(ownershipPromises);

      // Filter out null results
      for (const nft of results) {
        if (nft) {
          nfts.push(nft);
        }
      }

      this.logger.log(`Found ${nfts.length} NFTs owned by ${address} from ${tokenIds.length} checked`);
      return nfts;
    } catch (error) {
      this.logger.error(`Error verifying token ownership for ${address}:`, error.message);
      throw new Error(`Failed to verify token ownership: ${error.message}`);
    }
  }

  /**
   * Get NFT details by token ID
   */
  async getNFTByTokenId(tokenId: string): Promise<DomaNFT | null> {
    try {
      this.logger.log(`Fetching NFT details for token ID: ${tokenId}`);

      const exists = await this.domaContract.exists(tokenId);
      if (!exists) {
        this.logger.warn(`Token ID ${tokenId} does not exist`);
        return null;
      }

      const [owner, tokenURI] = await Promise.all([
        this.domaContract.ownerOf(tokenId),
        this.domaContract.tokenURI(tokenId),
      ]);

      const metadata = await this.fetchMetadataFromURI(tokenURI);

      if (!metadata) {
        this.logger.warn(`Could not fetch metadata for token ID ${tokenId}`);
        return null;
      }

      const nft: DomaNFT = {
        tokenId,
        owner,
        name: metadata.name,
        description: metadata.description,
        image: metadata.image,
        externalUrl: metadata.external_url,
        attributes: metadata.attributes,
      };

      for (const attr of metadata.attributes) {
        if (attr.trait_type === 'Expiration Date' && attr.display_type === 'date') {
          nft.expirationDate = Number(attr.value);
        } else if (attr.trait_type === 'TLD') {
          nft.tld = String(attr.value);
        } else if (attr.trait_type === 'Character Length') {
          nft.characterLength = Number(attr.value);
        } else if (attr.trait_type === 'Registrar') {
          nft.registrar = String(attr.value);
        }
      }

      return nft;
    } catch (error) {
      this.logger.error(`Error fetching NFT for token ID ${tokenId}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch metadata from token URI
   */
  private async fetchMetadataFromURI(tokenURI: string): Promise<DomaNFTMetadata | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(tokenURI, { timeout: 10000 })
      );

      return response.data as DomaNFTMetadata;
    } catch (error) {
      this.logger.error(`Error fetching metadata from URI ${tokenURI}:`, error.message);
      return null;
    }
  }

  /**
   * Check if domain is expired
   */
  async isDomainExpired(tokenId: string): Promise<boolean> {
    try {
      const expiration = await this.domaContract.expirationOf(tokenId);
      const now = Math.floor(Date.now() / 1000);
      return Number(expiration) < now;
    } catch (error) {
      this.logger.error(`Error checking expiration for token ID ${tokenId}:`, error.message);
      return false;
    }
  }

  /**
   * Get domain expiration date
   */
  async getDomainExpiration(tokenId: string): Promise<number | null> {
    try {
      const expiration = await this.domaContract.expirationOf(tokenId);
      return Number(expiration);
    } catch (error) {
      this.logger.error(`Error fetching expiration for token ID ${tokenId}:`, error.message);
      return null;
    }
  }
}
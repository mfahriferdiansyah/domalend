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
   * Get NFT balance and details for an address
   */
  async getNFTBalanceForAddress(address: string): Promise<{ address: string; balance: number; ownedNFTs: DomaNFT[]; note: string }> {
    try {
      this.logger.log(`Getting NFT balance and details for address: ${address}`);

      // First, try to get NFTs from Doma Explorer API
      try {
        // Try both explorer URLs (dev and testnet)
        const explorerUrls = [
          `https://explorer-doma-dev-ix58nm4rnd.t.conduit.xyz/api/v2/addresses/${address}/nft?type=ERC-721`,
          `https://explorer-testnet.doma.xyz/api/v2/addresses/${address}/nft?type=ERC-721`
        ];

        for (const explorerUrl of explorerUrls) {
          try {
            this.logger.log(`Fetching NFTs from Doma Explorer: ${explorerUrl}`);

            const response = await firstValueFrom(
              this.httpService.get(explorerUrl, {
                timeout: 10000,
                headers: { 'accept': 'application/json' }
              })
            );

            if (response.data?.items) {
              const ownedNFTs: DomaNFT[] = [];

              for (const instance of response.data.items) {
                // Filter for DOMA contract only
                if (instance.token?.address?.toLowerCase() === this.domaContractAddress.toLowerCase()) {
                  const nft: DomaNFT = {
                    tokenId: instance.id,
                    owner: address,
                    name: instance.metadata?.name || 'Unknown',
                    description: instance.metadata?.description || 'Domain Ownership Token',
                    image: instance.metadata?.image || instance.image_url || '',
                    externalUrl: instance.metadata?.external_url || instance.external_app_url || '',
                    attributes: instance.metadata?.attributes || [],
                  };

                  // Parse attributes
                  if (instance.metadata?.attributes) {
                    for (const attr of instance.metadata.attributes) {
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
                  }

                  ownedNFTs.push(nft);
                }
              }

              const balance = ownedNFTs.length;
              this.logger.log(`Successfully fetched ${balance} NFTs from Doma Explorer for ${address}`);

              return {
                address,
                balance,
                ownedNFTs,
                note: `Address owns ${balance} NFT(s) from Doma Explorer`
              };
            }
          } catch (error) {
            this.logger.warn(`Failed to fetch from ${explorerUrl}: ${error.message}`);
            // Continue to next URL
          }
        }
      } catch (explorerError) {
        this.logger.warn(`Failed to fetch from all Doma Explorer endpoints, falling back to contract methods: ${explorerError.message}`);
      }

      // Fallback to contract balance check if Explorer API fails
      const balance = await this.domaContract.balanceOf(address);
      const balanceNumber = Number(balance);

      this.logger.log(`Address ${address} owns ${balanceNumber} NFTs (from contract fallback)`);

      return {
        address,
        balance: balanceNumber,
        ownedNFTs: [],
        note: `Address owns ${balanceNumber} NFT(s), but metadata unavailable (Explorer API failed)`
      };
    } catch (error) {
      this.logger.error(`Error getting NFT balance for address ${address}:`, error.message);
      throw new Error(`Failed to get NFT balance: ${error.message}`);
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
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class AuctionVerificationService {
  private readonly logger = new Logger(AuctionVerificationService.name);
  private readonly domaContract: ethers.Contract;
  private readonly provider: ethers.JsonRpcProvider;
  private readonly domaContractAddress = '0x424bDf2E8a6F52Bd2c1C81D9437b0DC0309DF90f';
  private readonly dutchAuctionAddress: string;

  constructor(private readonly configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('blockchain.rpcUrl') || 'https://rpc-testnet.doma.xyz';
    this.dutchAuctionAddress = this.configService.get<string>('blockchain.dutchAuctionAddress') || '0xF4eC2e259036A841D7ebd8A34fDC97311Be063d1';

    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    const domaAbi = [
      'function ownerOf(uint256 tokenId) view returns (address)',
    ];

    this.domaContract = new ethers.Contract(
      this.domaContractAddress,
      domaAbi,
      this.provider
    );

    this.logger.log(`AuctionVerificationService initialized`);
    this.logger.log(`Doma Contract: ${this.domaContractAddress}`);
    this.logger.log(`DutchAuction Contract: ${this.dutchAuctionAddress}`);
  }

  /**
   * Verify if a domain is actually in the DutchAuction contract
   * @param tokenId - The domain token ID to check
   * @returns true if domain is owned by DutchAuction contract (real auction), false otherwise
   */
  async isDomainInAuction(tokenId: string): Promise<boolean> {
    try {
      this.logger.debug(`Checking if domain ${tokenId} is in auction...`);

      // Get the current owner of the domain NFT
      const currentOwner = await this.domaContract.ownerOf(tokenId);

      // Check if the owner is the DutchAuction contract
      const isInAuction = currentOwner.toLowerCase() === this.dutchAuctionAddress.toLowerCase();

      this.logger.debug(`Domain ${tokenId} owner: ${currentOwner}`);
      this.logger.debug(`Is in auction: ${isInAuction}`);

      return isInAuction;
    } catch (error) {
      this.logger.error(`Failed to verify auction status for domain ${tokenId}:`, error);
      // If we can't verify, assume it's not in auction to be safe
      return false;
    }
  }

  /**
   * Verify multiple domains in batch
   * @param tokenIds - Array of domain token IDs to check
   * @returns Map of tokenId -> isInAuction boolean
   */
  async verifyMultipleDomainsInAuction(tokenIds: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    this.logger.debug(`Verifying ${tokenIds.length} domains for auction status...`);

    // Process in parallel for better performance
    const verificationPromises = tokenIds.map(async (tokenId) => {
      const isInAuction = await this.isDomainInAuction(tokenId);
      return { tokenId, isInAuction };
    });

    try {
      const verificationResults = await Promise.all(verificationPromises);

      verificationResults.forEach(({ tokenId, isInAuction }) => {
        results.set(tokenId, isInAuction);
      });

      const inAuctionCount = Array.from(results.values()).filter(Boolean).length;
      this.logger.log(`Verified ${tokenIds.length} domains: ${inAuctionCount} actually in auction`);

    } catch (error) {
      this.logger.error('Failed to verify multiple domains:', error);
      // If batch verification fails, mark all as not in auction
      tokenIds.forEach(tokenId => results.set(tokenId, false));
    }

    return results;
  }

  /**
   * Get the DutchAuction contract address
   */
  getDutchAuctionAddress(): string {
    return this.dutchAuctionAddress;
  }
}
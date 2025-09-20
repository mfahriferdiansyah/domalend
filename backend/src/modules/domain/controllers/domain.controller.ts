import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
  UseGuards,
  Logger
} from '@nestjs/common';
import { ethers } from 'ethers';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

// Services
import { DomaNftService } from '../services/doma-nft.service';
import { DomainScoreCacheService } from '../services/domain-score-cache.service';

// DTOs
import {
  AddressNFTBalanceDto,
  NFTDetailsResponseDto,
  DomaNFTDto,
  GetUserDomainsResponseDto,
  EnhancedDomainDto,
  DomainPortfolioSummaryDto,
  DomainLoanStatusDto,
  DomainAiScoreDto,
  DomainLoanHistoryDto
} from '../dto/domain.dto';

@ApiTags('domains')
@Controller('domains')
@UseGuards(ThrottlerGuard)
export class DomainController {
  private readonly logger = new Logger(DomainController.name);

  constructor(
    private readonly domaNftService: DomaNftService,
    private readonly domainScoreCacheService: DomainScoreCacheService,
  ) {}

  @Get('nft/:tokenId')
  @ApiOperation({
    summary: 'Get domain NFT details by token ID',
    description: 'Retrieve detailed information about a specific domain NFT including metadata, expiration status, and attributes. This endpoint fetches data directly from the blockchain.'
  })
  @ApiParam({
    name: 'tokenId',
    description: 'Domain token ID (large integer representing the domain hash)',
    example: '54344964066288468101530659531467425324551312134658892013131579195659464473615'
  })
  @ApiResponse({
    status: 200,
    description: 'NFT details retrieved successfully',
    type: NFTDetailsResponseDto
  })
  @ApiResponse({ status: 404, description: 'NFT not found or does not exist on the blockchain' })
  @ApiResponse({ status: 500, description: 'Internal server error or blockchain connection failed' })
  async getNFTByTokenId(@Param('tokenId') tokenId: string): Promise<NFTDetailsResponseDto> {
    this.logger.log(`Fetching NFT details for token ID: ${tokenId}`);

    try {
      const nft = await this.domaNftService.getNFTByTokenId(tokenId);

      if (!nft) {
        return {
          tokenId,
          exists: false,
          message: 'NFT not found or does not exist',
        };
      }

      const expired = await this.domaNftService.isDomainExpired(tokenId);

      return {
        tokenId,
        exists: true,
        nft: nft as DomaNFTDto,
        expired,
      };
    } catch (error) {
      this.logger.error(`Error fetching NFT for token ID ${tokenId}:`, error.message);
      throw new HttpException(
        `Failed to fetch NFT: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('address/:address')
  @ApiOperation({
    summary: 'Get all domain NFTs owned by an address',
    description: 'Retrieve all domain NFTs owned by a specific Ethereum address. This endpoint uses the Doma Explorer API for efficient data retrieval with full metadata.'
  })
  @ApiParam({
    name: 'address',
    description: 'Ethereum wallet address (42-character hex string starting with 0x)',
    example: '0xaba3cf48a81225de43a642ca486c1c069ec11a53'
  })
  @ApiResponse({
    status: 200,
    description: 'NFT balance and list retrieved successfully from Doma Explorer API',
    type: AddressNFTBalanceDto
  })
  @ApiResponse({ status: 400, description: 'Invalid Ethereum address format' })
  @ApiResponse({ status: 500, description: 'Explorer API unavailable or blockchain connection failed' })
  async getNFTBalanceByAddress(@Param('address') address: string): Promise<AddressNFTBalanceDto> {
    this.logger.log(`Getting NFT balance for address: ${address}`);

    if (!ethers.isAddress(address)) {
      throw new HttpException('Invalid Ethereum address', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.domaNftService.getNFTBalanceForAddress(address);
    } catch (error) {
      this.logger.error(`Error getting NFT balance for address ${address}:`, error.message);
      throw new HttpException(
        `Failed to get NFT balance: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('user/:address')
  @ApiOperation({
    summary: 'Get enhanced domain portfolio by user (Portfolio Tab 1)',
    description: 'Retrieve domains owned by user with loan status, AI scoring, and portfolio analytics'
  })
  @ApiParam({
    name: 'address',
    description: 'User wallet address',
    example: '0xaba3cf48a81225de43a642ca486c1c069ec11a53'
  })
  @ApiResponse({
    status: 200,
    description: 'Enhanced domain portfolio retrieved successfully',
    type: GetUserDomainsResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid Ethereum address format' })
  @ApiResponse({ status: 500, description: 'Failed to fetch domain portfolio' })
  async getUserDomains(@Param('address') address: string): Promise<GetUserDomainsResponseDto> {
    this.logger.log(`Getting enhanced domain portfolio for address: ${address}`);

    if (!ethers.isAddress(address)) {
      throw new HttpException('Invalid Ethereum address', HttpStatus.BAD_REQUEST);
    }

    try {
      // Get basic domain data
      const basicDomainsData = await this.domaNftService.getNFTBalanceForAddress(address);

      // Enhance each domain with placeholder data for now
      const enhancedDomains: EnhancedDomainDto[] = [];

      for (const domain of basicDomainsData.ownedNFTs) {
        const enhancedDomain: EnhancedDomainDto = {
          ...domain,
          loanHistory: {
            totalLoans: 0,
            totalBorrowed: '0',
            currentlyCollateralized: false,
            averageLoanAmount: '0',
            successfulRepayments: 0,
            liquidations: 0
          }
        };

        // Add AI score if available
        try {
          const scoreData = await this.domainScoreCacheService.getDomainScore(domain.name);
          if (scoreData) {
            enhancedDomain.aiScore = {
              score: scoreData.totalScore,
              confidence: scoreData.confidence,
              lastUpdated: new Date().toISOString(),
              factors: {
                age: Math.round(scoreData.totalScore * 0.2),
                extension: Math.round(scoreData.totalScore * 0.15),
                length: Math.round(scoreData.totalScore * 0.1),
                keywords: Math.round(scoreData.totalScore * 0.25),
                traffic: Math.round(scoreData.totalScore * 0.3)
              }
            };
          }
        } catch (error) {
          this.logger.warn(`Failed to get AI score for domain ${domain.name}:`, error.message);
        }

        enhancedDomains.push(enhancedDomain);
      }

      // Build portfolio summary
      const portfolio: DomainPortfolioSummaryDto = {
        totalDomains: enhancedDomains.length,
        collateralizedDomains: 0, // No loan data yet
        totalCollateralValue: '0',
        averageAiScore: enhancedDomains.length > 0
          ? Math.round(enhancedDomains.reduce((sum, d) => sum + (d.aiScore?.score || 0), 0) / enhancedDomains.length)
          : 0,
        activeLoanValue: '0',
        portfolioHealth: 100, // Default to healthy since no loans
        riskLevel: 'low'
      };

      return {
        address: address.toLowerCase(),
        domains: enhancedDomains,
        portfolio
      };
    } catch (error) {
      this.logger.error(`Error getting enhanced domain portfolio for address ${address}:`, error.message);
      throw new HttpException(
        `Failed to get domain portfolio: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


}
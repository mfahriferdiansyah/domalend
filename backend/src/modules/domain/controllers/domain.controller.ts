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
import { DomainScoringService, ScoreBreakdown } from '../services/domain-scoring.service';
import { DomaNftService } from '../services/doma-nft.service';

// DTOs
import {
  AddressNFTBalanceDto,
  NFTDetailsResponseDto,
  DomaNFTDto
} from '../dto/domain.dto';

@ApiTags('domains')
@Controller('domains')
@UseGuards(ThrottlerGuard)
export class DomainController {
  private readonly logger = new Logger(DomainController.name);

  constructor(
    private readonly domainScoringService: DomainScoringService,
    private readonly domaNftService: DomaNftService,
  ) {}

  @Get('nft/:tokenId')
  @ApiOperation({ summary: 'Get NFT details by token ID' })
  @ApiParam({ name: 'tokenId', description: 'Domain token ID' })
  @ApiResponse({
    status: 200,
    description: 'NFT details retrieved successfully',
    type: NFTDetailsResponseDto
  })
  @ApiResponse({ status: 404, description: 'NFT not found' })
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
  @ApiOperation({ summary: 'Get NFT balance for an address' })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiResponse({
    status: 200,
    description: 'NFT balance retrieved successfully',
    type: AddressNFTBalanceDto
  })
  @ApiResponse({ status: 400, description: 'Invalid address format' })
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

  @Get(':domain/score')
  @ApiOperation({ summary: 'Get domain score by domain name' })
  @ApiParam({ name: 'domain', description: 'Domain name (e.g., nike.com)' })
  @ApiResponse({ status: 200, description: 'Domain score calculated successfully' })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  async getDomainScoreByName(@Param('domain') domain: string): Promise<ScoreBreakdown> {
    this.logger.log(`Calculating score for domain: ${domain}`);

    try {
      const score = await this.domainScoringService.scoreDomainByName(domain);

      if (!score) {
        throw new HttpException(
          `Unable to score domain: ${domain}`,
          HttpStatus.NOT_FOUND
        );
      }

      return score;
    } catch (error) {
      this.logger.error(`Error scoring domain ${domain}:`, error.message);
      throw new HttpException(
        `Failed to score domain: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
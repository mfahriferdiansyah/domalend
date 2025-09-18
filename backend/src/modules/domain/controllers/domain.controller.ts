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
    private readonly domaNftService: DomaNftService,
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
    example: '0x47B245f2A3c7557d855E4d800890C4a524a42Cc8'
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

}
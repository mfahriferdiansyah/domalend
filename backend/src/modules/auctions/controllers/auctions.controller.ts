import {
  Controller,
  Get,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { ethers } from 'ethers';

import { IndexerService } from '../../indexer/indexer.service';
import { AuctionPriceService } from '../services/auction-price.service';
import { AuctionVerificationService } from '../services/auction-verification.service';
import { DomaNftService } from '../../domain/services/doma-nft.service';
import { DomainScoreCacheService } from '../../domain/services/domain-score-cache.service';
import {
  AuctionDto,
  UserAuctionDto,
  AuctionDomainDto,
  GetAuctionsQueryDto,
  GetAuctionsResponseDto,
  GetUserAuctionsResponseDto,
  AuctionDetailDto,
  AuctionEventDto,
  GetAuctionDetailResponseDto
} from '../dto/auction.dto';

@ApiTags('auctions')
@Controller('auctions')
export class AuctionsController {
  private readonly logger = new Logger(AuctionsController.name);

  constructor(
    private readonly indexerService: IndexerService,
    private readonly auctionPriceService: AuctionPriceService,
    private readonly auctionVerificationService: AuctionVerificationService,
    private readonly domaNftService: DomaNftService,
    private readonly domainScoreCacheService: DomainScoreCacheService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all auctions with filters',
    description: 'Retrieve all Dutch auctions with optional filtering by status, real-time price calculations'
  })
  @ApiResponse({
    status: 200,
    description: 'Auctions retrieved successfully',
    type: GetAuctionsResponseDto
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAuctions(@Query() query: GetAuctionsQueryDto): Promise<GetAuctionsResponseDto> {
    const { page = 1, limit = 20, status, sortBy = 'auctionStartedAt', order = 'desc' } = query;

    this.logger.log(`Getting auctions: page=${page}, limit=${limit}, status=${status}`);

    try {
      // Build filter for auction query
      let where: any = {};
      if (status) {
        where.status = status;
      }

      // Get auctions directly from the new auction schema
      const auctionsData = await this.indexerService.queryAuctions({
        where,
        limit,
        orderBy: sortBy === 'auctionStartedAt' ? 'startedAt' : sortBy,
        orderDirection: order
      });

      this.logger.log(`Found ${auctionsData.auctions?.items?.length || 0} auctions`);

      const auctions = await this.buildAuctionsFromNewSchema(
        auctionsData.auctions?.items || []
      );

      this.logger.debug(`Processed auctions count: ${auctions.length}`);

      return {
        auctions,
        total: auctionsData.auctions?.totalCount || auctions.length,
        page,
        limit
      };
    } catch (error) {
      this.logger.error('Failed to get auctions:', error);
      throw new HttpException('Failed to fetch auctions', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':auctionId')
  @ApiOperation({
    summary: 'Get auction details by ID',
    description: 'Retrieve detailed information about a specific auction including all events and current status'
  })
  @ApiParam({
    name: 'auctionId',
    description: 'Auction ID',
    example: '6'
  })
  @ApiResponse({
    status: 200,
    description: 'Auction details retrieved successfully',
    type: GetAuctionDetailResponseDto
  })
  @ApiResponse({ status: 404, description: 'Auction not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAuctionDetail(@Param('auctionId') auctionId: string): Promise<GetAuctionDetailResponseDto> {
    this.logger.log(`Getting auction detail for auctionId: ${auctionId}`);

    try {
      // Get auction details from the new auction schema
      const auctionData = await this.indexerService.queryAuctionDetail(auctionId);
      
      const auction = auctionData.auction;
      if (!auction) {
        throw new HttpException('Auction not found', HttpStatus.NOT_FOUND);
      }

      // Build event DTOs from auction history (supplement with auction data for missing fields)
      const events: AuctionEventDto[] = (auction.history?.items || []).map(event => ({
        auctionId: event.auctionId,
        loanId: auction.loanId, // Get from main auction object
        domainTokenId: auction.domainTokenId, // Get from main auction object
        domainName: auction.domainName, // Get from main auction object
        borrowerAddress: auction.borrowerAddress, // Get from main auction object
        bidderAddress: event.bidderAddress,
        startingPrice: auction.startingPrice, // Get from main auction object
        currentPrice: event.currentPrice,
        finalPrice: event.finalPrice,
        recoveryRate: auction.recoveryRate, // Get from main auction object
        eventType: event.eventType,
        eventTimestamp: new Date(parseInt(event.eventTimestamp)).toISOString()
      }));

      // Get domain information if available
      let domain: AuctionDomainDto | undefined;
      if (auction.domainTokenId) {
        try {
          domain = await this.buildDomainFromAuction(auction);
        } catch (error) {
          this.logger.warn(`Failed to build domain info for auction ${auctionId}:`, error);
        }
      }

      // Build auction detail
      const auctionDetail: AuctionDetailDto = {
        auctionId: auction.auctionId,
        loanId: auction.loanId,
        domainTokenId: auction.domainTokenId,
        domainName: auction.domainName,
        borrowerAddress: auction.borrowerAddress,
        status: auction.status,
        startingPrice: auction.startingPrice,
        currentPrice: auction.currentPrice,
        finalPrice: auction.finalPrice,
        recoveryRate: auction.recoveryRate,
        currentBidder: auction.currentBidderAddress,
        startedAt: auction.startedAt,
        endedAt: auction.endedAt,
        domain,
        events
      };

      return { auction: auctionDetail };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to get auction detail for ${auctionId}:`, error);
      throw new HttpException('Failed to fetch auction details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('user/:address')
  @ApiOperation({
    summary: 'Get auctions by user participation',
    description: 'Retrieve auctions where the user is the borrower'
  })
  @ApiParam({
    name: 'address',
    description: 'User wallet address',
    example: '0xaba3cf48a81225de43a642ca486c1c069ec11a53'
  })
  @ApiResponse({
    status: 200,
    description: 'User auctions retrieved successfully',
    type: GetUserAuctionsResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid address format' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAuctionsByUser(@Param('address') address: string): Promise<GetUserAuctionsResponseDto> {
    this.logger.log(`Getting auctions for user: ${address}`);

    if (!ethers.isAddress(address)) {
      throw new HttpException('Invalid Ethereum address', HttpStatus.BAD_REQUEST);
    }

    try {
      // Get auctions for this user
      const userAuctionsData = await this.indexerService.queryAuctions({
        where: { borrowerAddress: address }
      });

      const baseAuctions = await this.buildAuctionsFromNewSchema(
        userAuctionsData.auctions?.items || []
      );

      // Convert to user auction objects
      const auctions = baseAuctions.map(auction => ({
        ...auction,
        userIsBorrower: auction.borrower.toLowerCase() === address.toLowerCase()
      }));

      const summary = {
        totalAuctions: auctions.length,
        activeAuctions: auctions.filter(auction => auction.status === 'active').length
      };

      return { auctions, summary };
    } catch (error) {
      this.logger.error(`Failed to get auctions for user ${address}:`, error);
      throw new HttpException('Failed to fetch user auctions', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async buildAuctionsFromNewSchema(auctions: any[]): Promise<AuctionDto[]> {
    this.logger.log(`Building auctions from ${auctions.length} auction records`);

    const auctionDtos: AuctionDto[] = [];

    for (const auction of auctions) {
      try {
        // Calculate current price using Dutch auction mechanics if status is active
        let currentPrice = auction.currentPrice || auction.startingPrice;
        let decayPerSecond = '0';

        if (auction.status === 'active' && auction.startedAt && auction.startingPrice) {
          const priceCalc = this.auctionPriceService.calculateCurrentPrice(
            auction.startingPrice,
            auction.startedAt
          );
          currentPrice = priceCalc.currentPrice;
          decayPerSecond = priceCalc.decayPerSecond;
        }

        // Build domain information
        const domain: AuctionDomainDto = await this.buildDomainFromAuction(auction);

        // Create auction DTO
        const auctionDto: AuctionDto = {
          auctionId: auction.auctionId,
          loanId: auction.loanId || auction.auctionId,
          poolId: '', // Pool ID would need to come from loan relation if needed
          status: auction.status,
          startingPrice: auction.startingPrice || '0',
          currentPrice,
          decayPerSecond,
          auctionStartedAt: auction.startedAt || auction.createdAt,
          domain,
          borrower: auction.borrowerAddress || '0x0000000000000000000000000000000000000000'
        };

        auctionDtos.push(auctionDto);
        this.logger.debug(`Built auction from schema: ${auction.auctionId} - ${auction.domainName}`);

      } catch (error) {
        this.logger.error(`Failed to build auction from schema record ${auction.auctionId}:`, error);
        // Continue processing other auctions
      }
    }

    this.logger.log(`Successfully built ${auctionDtos.length} auctions from new schema`);
    return auctionDtos;
  }

  private async buildDomainFromAuction(auction: any): Promise<AuctionDomainDto> {
    let domainMetadata = null;
    let aiScore = auction.aiScore || 0;

    // Use domain info from the auction's domain relation if available
    if (auction.domain) {
      aiScore = auction.domain.latestAiScore || aiScore;
    }

    // Try to get domain metadata from NFT service if we have a valid token ID
    if (auction.domainTokenId && auction.domainTokenId.trim() !== '' && auction.domainTokenId !== '0') {
      try {
        domainMetadata = await this.domaNftService.getNFTByTokenId(auction.domainTokenId);
        this.logger.debug(`Retrieved NFT metadata for ${auction.domainTokenId}: ${domainMetadata?.name || 'no name'}`);
      } catch (error) {
        this.logger.warn(`Failed to get NFT metadata for ${auction.domainTokenId}:`, error);
      }
    }

    // Try to get cached AI score if we have a valid domain name
    const domainName = auction.domainName || domainMetadata?.name;
    if (domainName && domainName.trim() !== '' && domainName !== 'null' && domainName !== null) {
      try {
        const scoreResult = await this.domainScoreCacheService.getDomainScore(domainName);
        aiScore = scoreResult.totalScore || aiScore;
        this.logger.debug(`Retrieved cached score for ${domainName}: ${aiScore} (cached: ${scoreResult.isFromCache})`);
      } catch (error) {
        this.logger.warn(`Failed to get cached score for ${domainName}:`, error);
      }
    }

    // Use auction's domain name or fallback to NFT metadata name or create placeholder
    const finalDomainName = domainName || `domain-${auction.auctionId}.unknown`;

    return {
      tokenId: auction.domainTokenId || auction.auctionId,
      name: finalDomainName,
      metadata: domainMetadata || {
        tokenId: auction.domainTokenId || auction.auctionId,
        owner: auction.borrowerAddress || '0x0000000000000000000000000000000000000000',
        name: finalDomainName,
        description: 'Domain Ownership Token',
        image: '',
        externalUrl: '',
        attributes: []
      },
      aiScore,
      tld: domainMetadata?.tld || (finalDomainName ? finalDomainName.split('.').pop() : '') || '',
      characterLength: domainMetadata?.characterLength || (finalDomainName ? finalDomainName.split('.')[0].length : 0)
    };
  }

}
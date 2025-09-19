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
import { DomaNftService } from '../../domain/services/doma-nft.service';
import { DomainScoreCacheService } from '../../domain/services/domain-score-cache.service';
import {
  AuctionDto,
  UserAuctionDto,
  AuctionDomainDto,
  GetAuctionsQueryDto,
  GetAuctionsResponseDto,
  GetUserAuctionsResponseDto
} from '../dto/auction.dto';

@ApiTags('auctions')
@Controller('auctions')
export class AuctionsController {
  private readonly logger = new Logger(AuctionsController.name);

  constructor(
    private readonly indexerService: IndexerService,
    private readonly auctionPriceService: AuctionPriceService,
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
      // Get liquidated loans which become auctions
      const liquidatedLoansData = await this.indexerService.queryLoans({
        where: { eventType: 'liquidated' },
        limit: limit
      });

      this.logger.log(`Found ${liquidatedLoansData.loanEvents?.items?.length || 0} liquidated loans`);

      // Get auction events to check for bids/completion
      const auctionEventsData = await this.indexerService.queryAuctions({
        where: {},
        limit: 100 // Get more auction events to match with loans
      });

      const auctions = await this.buildAuctionsFromLiquidatedLoans(
        liquidatedLoansData.loanEvents?.items || [],
        auctionEventsData.auctionEvents?.items || []
      );

      // Apply status filter if specified
      const filteredAuctions = status ?
        auctions.filter(auction => auction.status === status) :
        auctions;

      this.logger.debug(`Processed auctions count: ${filteredAuctions.length}`);

      return {
        auctions: filteredAuctions,
        total: filteredAuctions.length,
        page,
        limit
      };
    } catch (error) {
      this.logger.error('Failed to get auctions:', error);
      throw new HttpException('Failed to fetch auctions', HttpStatus.INTERNAL_SERVER_ERROR);
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
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'
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
      // Get liquidated loans for this user
      const userLiquidatedLoansData = await this.indexerService.queryLoans({
        where: { borrowerAddress: address, eventType: 'liquidated' }
      });

      // Get auction events to check for bids/completion
      const auctionEventsData = await this.indexerService.queryAuctions({
        where: {},
        limit: 100
      });

      const baseAuctions = await this.buildAuctionsFromLiquidatedLoans(
        userLiquidatedLoansData.loanEvents?.items || [],
        auctionEventsData.auctionEvents?.items || []
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

  private async buildAuctionsFromLiquidatedLoans(liquidatedLoans: any[], auctionEvents: any[]): Promise<AuctionDto[]> {
    this.logger.log(`Building auctions from ${liquidatedLoans.length} liquidated loans`);

    // Create map of auction events by loanId for quick lookup
    const auctionEventsByLoanId = new Map();
    auctionEvents.forEach(event => {
      if (event.loanId) {
        if (!auctionEventsByLoanId.has(event.loanId)) {
          auctionEventsByLoanId.set(event.loanId, []);
        }
        auctionEventsByLoanId.get(event.loanId).push(event);
      }
    });

    const auctions: AuctionDto[] = [];

    for (const loan of liquidatedLoans) {
      try {
        // Convert liquidation timestamp - handle both string and number formats
        this.logger.debug(`Processing loan ${loan.loanId} with timestamp: ${loan.eventTimestamp} (type: ${typeof loan.eventTimestamp})`);

        const rawTimestamp = typeof loan.eventTimestamp === 'string' ?
          parseInt(loan.eventTimestamp, 10) :
          loan.eventTimestamp;

        // Validate timestamp is a valid number
        if (isNaN(rawTimestamp) || !isFinite(rawTimestamp)) {
          this.logger.error(`Invalid timestamp for loan ${loan.loanId}: ${loan.eventTimestamp}`);
          continue;
        }

        this.logger.debug(`Parsed timestamp for loan ${loan.loanId}: ${rawTimestamp}`);

        // The timestamps from GraphQL appear to be in milliseconds already
        // They're in the format like 1758225892000 which is year 2025
        const timestampMs = rawTimestamp;

        // Create date and check if it's valid
        const auctionDate = new Date(timestampMs);
        if (isNaN(auctionDate.getTime())) {
          this.logger.error(`Cannot create valid date for loan ${loan.loanId} from timestamp ${timestampMs}`);
          continue;
        }

        const auctionStartedAt = auctionDate.toISOString();
        this.logger.debug(`Auction ${loan.loanId} started at: ${auctionStartedAt}`);

        // Calculate starting price (2x loan amount as per business logic)
        const loanAmountBigInt = BigInt(loan.loanAmount || '0');
        const startingPrice = (loanAmountBigInt * 2n).toString();

        // Check auction events for this loan to determine current status
        const relatedAuctionEvents = auctionEventsByLoanId.get(loan.loanId) || [];
        const hasEndedEvent = relatedAuctionEvents.some(e => e.eventType === 'ended');
        const hasBidEvent = relatedAuctionEvents.some(e => e.eventType === 'bid_placed');
        const bidderAddress = hasBidEvent ?
          relatedAuctionEvents.find(e => e.eventType === 'bid_placed')?.bidderAddress :
          '0x0000000000000000000000000000000000000000';

        // Calculate current price using Dutch auction mechanics
        const { currentPrice, decayPerSecond } = this.auctionPriceService.calculateCurrentPrice(
          startingPrice,
          auctionStartedAt
        );

        // Determine auction status
        const status = this.auctionPriceService.calculateAuctionStatus(
          'liquidated', // Event type that started the auction
          auctionStartedAt,
          hasEndedEvent ? bidderAddress : '0x0000000000000000000000000000000000000000'
        );

        // Build domain information
        const domain: AuctionDomainDto = await this.buildDomainFromLoan(loan);

        // Create auction DTO
        const auction: AuctionDto = {
          auctionId: loan.loanId, // Use loanId as auctionId
          loanId: loan.loanId,
          poolId: loan.poolId || '',
          status,
          startingPrice,
          currentPrice,
          decayPerSecond,
          auctionStartedAt,
          domain,
          borrower: loan.borrowerAddress || '0x0000000000000000000000000000000000000000'
        };

        auctions.push(auction);
        this.logger.debug(`Built auction from loan ${loan.loanId}: ${loan.domainName}`);

      } catch (error) {
        this.logger.error(`Failed to build auction from loan ${loan.loanId}:`, error);
        // Continue processing other loans
      }
    }

    this.logger.log(`Successfully built ${auctions.length} auctions from liquidated loans`);
    return auctions;
  }

  private async buildDomainFromLoan(loan: any): Promise<AuctionDomainDto> {
    let domainMetadata = null;
    let aiScore = 0;

    // Try to get domain metadata from NFT service if we have a valid token ID
    if (loan.domainTokenId && loan.domainTokenId.trim() !== '' && loan.domainTokenId !== '0') {
      try {
        domainMetadata = await this.domaNftService.getNFTByTokenId(loan.domainTokenId);
        this.logger.debug(`Retrieved NFT metadata for ${loan.domainTokenId}: ${domainMetadata?.name || 'no name'}`);
      } catch (error) {
        this.logger.warn(`Failed to get NFT metadata for ${loan.domainTokenId}:`, error);
      }
    }

    // Try to get cached AI score if we have a valid domain name
    const domainName = loan.domainName || domainMetadata?.name;
    if (domainName && domainName.trim() !== '' && domainName !== 'null' && domainName !== null) {
      try {
        const scoreResult = await this.domainScoreCacheService.getDomainScore(domainName);
        aiScore = scoreResult.totalScore;
        this.logger.debug(`Retrieved cached score for ${domainName}: ${aiScore} (cached: ${scoreResult.isFromCache})`);
      } catch (error) {
        this.logger.warn(`Failed to get cached score for ${domainName}:`, error);
      }
    }

    // Use loan's domain name or fallback to NFT metadata name or create placeholder
    const finalDomainName = domainName || `domain-${loan.loanId}.unknown`;

    return {
      tokenId: loan.domainTokenId || loan.loanId,
      name: finalDomainName,
      metadata: domainMetadata || {
        tokenId: loan.domainTokenId || loan.loanId,
        owner: loan.borrowerAddress || '0x0000000000000000000000000000000000000000',
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
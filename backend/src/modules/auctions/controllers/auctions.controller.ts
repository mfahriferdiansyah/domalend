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
      // Get auction events for this specific auction
      const auctionData = await this.indexerService.queryAuctionDetail(auctionId);
      
      const auctionEvents = auctionData.auctionEvents?.items || [];
      if (auctionEvents.length === 0) {
        throw new HttpException('Auction not found', HttpStatus.NOT_FOUND);
      }

      // Sort events by timestamp
      const sortedEvents = auctionEvents.sort((a, b) => 
        parseInt(a.eventTimestamp) - parseInt(b.eventTimestamp)
      );

      // Build auction detail from events
      const firstEvent = sortedEvents[0];
      const lastEvent = sortedEvents[sortedEvents.length - 1];
      
      // Build event DTOs
      const events: AuctionEventDto[] = sortedEvents.map(event => ({
        auctionId: event.auctionId,
        loanId: event.loanId,
        domainTokenId: event.domainTokenId,
        domainName: event.domainName,
        borrowerAddress: event.borrowerAddress,
        bidderAddress: event.bidderAddress,
        startingPrice: event.startingPrice,
        currentPrice: event.currentPrice,
        finalPrice: event.finalPrice,
        recoveryRate: event.recoveryRate,
        eventType: event.eventType,
        eventTimestamp: new Date(parseInt(event.eventTimestamp)).toISOString()
      }));

      // Determine auction status
      const hasEndedEvent = events.some(e => e.eventType === 'ended');
      const status = hasEndedEvent ? 'completed' : 'active';

      // Get domain information if available
      let domain: AuctionDomainDto | undefined;
      if (firstEvent.domainTokenId) {
        try {
          domain = await this.buildDomainFromEvent(firstEvent);
        } catch (error) {
          this.logger.warn(`Failed to build domain info for auction ${auctionId}:`, error);
        }
      }

      // Build auction detail
      const auctionDetail: AuctionDetailDto = {
        auctionId: firstEvent.auctionId,
        loanId: firstEvent.loanId,
        domainTokenId: firstEvent.domainTokenId,
        domainName: firstEvent.domainName,
        borrowerAddress: firstEvent.borrowerAddress,
        status,
        startingPrice: firstEvent.startingPrice,
        currentPrice: lastEvent.currentPrice || lastEvent.finalPrice,
        finalPrice: lastEvent.finalPrice,
        recoveryRate: lastEvent.recoveryRate,
        currentBidder: lastEvent.bidderAddress,
        startedAt: events.length > 0 ? events[0].eventTimestamp : undefined,
        endedAt: hasEndedEvent ? events[events.length - 1].eventTimestamp : undefined,
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

    // Verify which domains are actually in auction before creating auction objects
    const tokenIds = liquidatedLoans
      .map(loan => loan.domainTokenId)
      .filter(tokenId => tokenId && tokenId.trim() !== '' && tokenId !== '0');

    this.logger.log(`Verifying ${tokenIds.length} domain token IDs for actual auction status...`);
    const domainAuctionStatus = await this.auctionVerificationService.verifyMultipleDomainsInAuction(tokenIds);

    // Filter to only include loans where domain is actually in DutchAuction contract
    const actualAuctionLoans = liquidatedLoans.filter(loan => {
      if (!loan.domainTokenId || loan.domainTokenId.trim() === '' || loan.domainTokenId === '0') {
        this.logger.warn(`Loan ${loan.loanId} has invalid domain token ID: ${loan.domainTokenId}`);
        return false;
      }

      const isInAuction = domainAuctionStatus.get(loan.domainTokenId) || false;
      if (!isInAuction) {
        this.logger.debug(`Loan ${loan.loanId} (${loan.domainName}) - domain not in auction, skipping`);
      }
      return isInAuction;
    });

    this.logger.log(`Filtered to ${actualAuctionLoans.length} loans with domains actually in auction`);

    const auctions: AuctionDto[] = [];

    for (const loan of actualAuctionLoans) {
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

    this.logger.log(`Successfully built ${auctions.length} auctions from verified active auctions`);
    return auctions;
  }

  private async buildDomainFromEvent(event: any): Promise<AuctionDomainDto> {
    let domainMetadata = null;
    let aiScore = 0;

    // Try to get domain metadata from NFT service if we have a valid token ID
    if (event.domainTokenId && event.domainTokenId.trim() !== '' && event.domainTokenId !== '0') {
      try {
        domainMetadata = await this.domaNftService.getNFTByTokenId(event.domainTokenId);
        this.logger.debug(`Retrieved NFT metadata for ${event.domainTokenId}: ${domainMetadata?.name || 'no name'}`);
      } catch (error) {
        this.logger.warn(`Failed to get NFT metadata for ${event.domainTokenId}:`, error);
      }
    }

    // Try to get cached AI score if we have a valid domain name
    const domainName = event.domainName || domainMetadata?.name;
    if (domainName && domainName.trim() !== '' && domainName !== 'null' && domainName !== null) {
      try {
        const scoreResult = await this.domainScoreCacheService.getDomainScore(domainName);
        aiScore = scoreResult.totalScore;
        this.logger.debug(`Retrieved cached score for ${domainName}: ${aiScore} (cached: ${scoreResult.isFromCache})`);
      } catch (error) {
        this.logger.warn(`Failed to get cached score for ${domainName}:`, error);
      }
    }

    // Use event's domain name or fallback to NFT metadata name or create placeholder
    const finalDomainName = domainName || `domain-${event.auctionId}.unknown`;

    return {
      tokenId: event.domainTokenId || event.auctionId,
      name: finalDomainName,
      metadata: domainMetadata || {
        tokenId: event.domainTokenId || event.auctionId,
        owner: event.borrowerAddress || '0x0000000000000000000000000000000000000000',
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
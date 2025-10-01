import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ethers } from 'ethers';

// Services
import { IndexerService } from '../../indexer/indexer.service';
import { DomaNftService } from '../services/doma-nft.service';
import { DomainScoreCacheService } from '../services/domain-score-cache.service';

// DTOs
import {
  DomainDetailDto,
  DomainDto,
  GetDomainDetailResponseDto,
  GetDomainsQueryDto,
  GetDomainsResponseDto,
  LoanDto,
  ScoringEventDto
} from '../../pools/dto/pool.dto';
import {
  AddressNFTBalanceDto,
  DomainPortfolioSummaryDto,
  DomaNFTDto,
  EnhancedDomainDto,
  GetUserDomainsResponseDto,
  NFTDetailsResponseDto
} from '../dto/domain.dto';

@ApiTags('domains')
@Controller('domains')
@UseGuards(ThrottlerGuard)
export class DomainController {
  private readonly logger = new Logger(DomainController.name);

  constructor(
    private readonly domaNftService: DomaNftService,
    private readonly domainScoreCacheService: DomainScoreCacheService,
    private readonly indexerService: IndexerService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all scored domains',
    description: 'Retrieve all domains with AI scores and analytics, with optional filtering and pagination'
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number',
    required: false,
    type: Number,
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of items per page',
    required: false,
    type: Number,
    example: 20
  })
  @ApiQuery({
    name: 'minAiScore',
    description: 'Minimum AI score filter',
    required: false,
    type: Number,
    example: 50
  })
  @ApiQuery({
    name: 'maxAiScore',
    description: 'Maximum AI score filter',
    required: false,
    type: Number,
    example: 100
  })
  @ApiQuery({
    name: 'liquidatedOnly',
    description: 'Show only liquidated domains',
    required: false,
    type: Boolean,
    example: false
  })
  @ApiQuery({
    name: 'sortBy',
    description: 'Sort field',
    required: false,
    enum: ['latestAiScore', 'totalLoansCreated', 'totalLoanVolume', 'firstScoreTimestamp'],
    example: 'latestAiScore'
  })
  @ApiQuery({
    name: 'order',
    description: 'Sort order',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc'
  })
  @ApiResponse({
    status: 200,
    description: 'Scored domains retrieved successfully',
    type: GetDomainsResponseDto
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getScoredDomains(@Query() query: GetDomainsQueryDto): Promise<GetDomainsResponseDto> {
    const { 
      page = 1, 
      limit = 20, 
      minAiScore, 
      maxAiScore, 
      liquidatedOnly, 
      sortBy = 'lastActivityTimestamp', 
      order = 'desc' 
    } = query;

    this.logger.log(`Getting scored domains: page=${page}, limit=${limit}, minAiScore=${minAiScore}, maxAiScore=${maxAiScore}, liquidatedOnly=${liquidatedOnly} (type: ${typeof liquidatedOnly})`);

    try {
      // Build where clause
      const where: any = {};
      
      if (minAiScore !== undefined) {
        where.latestAiScore_gte = minAiScore;
      }
      
      if (maxAiScore !== undefined) {
        where.latestAiScore_lte = maxAiScore;
      }
      
      // this.logger.log(`liquidatedOnly check: ${liquidatedOnly} === true? ${liquidatedOnly === true}`);
      // if (liquidatedOnly === true) {
      //   this.logger.log('Adding hasBeenLiquidated = true to where clause');
      //   where.hasBeenLiquidated = true;
      // } else if (liquidatedOnly === false) {
      //   this.logger.log('liquidatedOnly is false, adding hasBeenLiquidated = false to where clause');
      //   where.hasBeenLiquidated = false;
      // }

      this.logger.log(`Final where clause: ${JSON.stringify(where)}`);
      
      const domainData = await this.indexerService.queryDomains({
        where,
        limit: limit,
        orderBy: sortBy,
        orderDirection: order
      });

      const domains = this.buildDomainObjects(domainData.domainAnalyticss?.items || []);

      return {
        domains,
        total: domains.length,
        page,
        limit
      };
    } catch (error) {
      this.logger.error('Failed to get scored domains:', error);
      throw new HttpException('Failed to fetch scored domains', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':domainTokenId')
  @ApiOperation({
    summary: 'Get domain details by token ID',
    description: 'Retrieve comprehensive information about a specific domain including loans, auctions, and scoring history'
  })
  @ApiParam({
    name: 'domainTokenId',
    description: 'Domain token ID',
    example: '123456'
  })
  @ApiQuery({
    name: 'includeRelations',
    description: 'Whether to include loans, auctions, and scoring history',
    required: false,
    type: Boolean,
    example: true
  })
  @ApiResponse({
    status: 200,
    description: 'Domain details retrieved successfully',
    type: GetDomainDetailResponseDto
  })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getDomainDetail(
    @Param('domainTokenId') domainTokenId: string,
    @Query('includeRelations') includeRelations?: string
  ): Promise<GetDomainDetailResponseDto> {
    this.logger.log(`Getting domain detail for domainTokenId: ${domainTokenId}`);

    const shouldIncludeRelations = includeRelations !== 'false'; 
    
    try {
      const domainData = await this.indexerService.queryDomainDetail(domainTokenId, shouldIncludeRelations);

      const domainItem = domainData.domainAnalytics;
      if (!domainItem) {
        throw new HttpException('Domain not found', HttpStatus.NOT_FOUND);
      }
      const domainDetail: DomainDetailDto = {
        domainTokenId: domainItem.domainTokenId,
        domainName: domainItem.domainName,
        latestAiScore: domainItem.latestAiScore,
        totalScoringRequests: domainItem.totalScoringRequests,
        totalLoansCreated: domainItem.totalLoansCreated,
        totalLoanVolume: domainItem.totalLoanVolume,
        hasBeenLiquidated: domainItem.hasBeenLiquidated,
        firstScoreTimestamp: domainItem.firstScoreTimestamp,
        lastActivityTimestamp: domainItem.lastActivityTimestamp,
      };

      // Include relations if requested and available
      if (shouldIncludeRelations) {
        if (domainItem.loans?.items) {
          domainDetail.loans = this.buildLoanObjects(domainItem.loans.items);
        }

        if (domainItem.scoringEvents?.items) {
          domainDetail.scoringHistory = this.buildScoringEventObjects(domainItem.scoringEvents.items);
        }

        if (domainItem.auctions?.items) {
          domainDetail.auctions = domainItem.auctions.items;
        }
      }

      return { domain: domainDetail };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to get domain detail for ${domainTokenId}:`, error);
      throw new HttpException('Failed to fetch domain details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

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

  @Get('user/:address/scored')
  @ApiOperation({
    summary: 'Get user-owned unliquidated scored domains',
    description: 'Retrieve scored domains that the user actually owns and have not been liquidated, filtered from both Doma Protocol ownership and indexer scoring data'
  })
  @ApiParam({
    name: 'address',
    description: 'User wallet address',
    example: '0xaba3cf48a81225de43a642ca486c1c069ec11a53'
  })
  @ApiResponse({
    status: 200,
    description: 'User-owned unliquidated scored domains retrieved successfully',
    type: GetUserDomainsResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid Ethereum address format' })
  @ApiResponse({ status: 500, description: 'Failed to fetch user scored domains' })
  async getUserScoredDomains(@Param('address') address: string): Promise<{
    address: string;
    scoredDomains: EnhancedDomainDto[];
    totalCount: number;
  }> {
    this.logger.log(`Getting user-owned scored domains for address: ${address}`);

    if (!ethers.isAddress(address)) {
      throw new HttpException('Invalid Ethereum address', HttpStatus.BAD_REQUEST);
    }

    try {
      // Step 1: Get all domains owned by the user from Doma Protocol
      const ownedDomainsData = await this.domaNftService.getNFTBalanceForAddress(address);
      const ownedTokenIds = ownedDomainsData.ownedNFTs.map(domain => domain.tokenId);

      this.logger.log(`User owns ${ownedTokenIds.length} domains from Doma Protocol`);

      if (ownedTokenIds.length === 0) {
        return {
          address: address.toLowerCase(),
          scoredDomains: [],
          totalCount: 0
        };
      }

      // Step 2: Get all scored domains from indexer that match user's owned domains
      // Filter out liquidated domains as they cannot be used for new loans
      const scoredDomainsData = await this.indexerService.queryDomains({
        where: {
          domainTokenId_in: ownedTokenIds,
          hasBeenLiquidated: false // Only show unliquidated domains
        },
        limit: 1000, // Get all matches
        orderBy: 'latestAiScore',
        orderDirection: 'desc'
      });

      const scoredDomains = scoredDomainsData.domainAnalyticss?.items || [];
      this.logger.log(`Found ${scoredDomains.length} unliquidated scored domains matching user's ownership`);

      // Step 3: Create a map of owned domains for quick lookup
      const ownedDomainsMap = new Map(
        ownedDomainsData.ownedNFTs.map(domain => [domain.tokenId, domain])
      );

      // Step 4: Build enhanced domain objects with both ownership and scoring data
      const enhancedScoredDomains: EnhancedDomainDto[] = [];

      for (const scoredDomain of scoredDomains) {
        const ownedDomain = ownedDomainsMap.get(scoredDomain.domainTokenId);
        
        if (ownedDomain) {
          const enhancedDomain: EnhancedDomainDto = {
            // Base domain info from Doma Protocol
            tokenId: ownedDomain.tokenId,
            name: ownedDomain.name,
            owner: ownedDomain.owner,
            description: ownedDomain.description || '',
            image: ownedDomain.image || '',
            externalUrl: ownedDomain.externalUrl || '',
            attributes: ownedDomain.attributes || [],
            
            // AI scoring info from indexer
            aiScore: {
              score: scoredDomain.latestAiScore,
              confidence: 85, // Default confidence since not in analytics
              lastUpdated: scoredDomain.firstScoreTimestamp,
              factors: {
                age: Math.round(scoredDomain.latestAiScore * 0.2),
                extension: Math.round(scoredDomain.latestAiScore * 0.15),
                length: Math.round(scoredDomain.latestAiScore * 0.1),
                keywords: Math.round(scoredDomain.latestAiScore * 0.25),
                traffic: Math.round(scoredDomain.latestAiScore * 0.3)
              }
            },
            
            // Loan history from indexer
            loanHistory: {
              totalLoans: scoredDomain.totalLoansCreated || 0,
              totalBorrowed: scoredDomain.totalLoanVolume || '0',
              currentlyCollateralized: false, // Would need additional query to determine
              averageLoanAmount: scoredDomain.totalLoansCreated > 0 
                ? (BigInt(scoredDomain.totalLoanVolume || '0') / BigInt(scoredDomain.totalLoansCreated)).toString()
                : '0',
              successfulRepayments: 0, // Would need additional query
              liquidations: scoredDomain.hasBeenLiquidated ? 1 : 0
            }
          };

          enhancedScoredDomains.push(enhancedDomain);
        }
      }

      return {
        address: address.toLowerCase(),
        scoredDomains: enhancedScoredDomains,
        totalCount: enhancedScoredDomains.length
      };
    } catch (error) {
      this.logger.error(`Error getting user scored domains for address ${address}:`, error.message);
      throw new HttpException(
        `Failed to get user scored domains: ${error.message}`,
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

  private buildDomainObjects(domainEvents: any[]): DomainDto[] {
    return domainEvents.map(event => ({
      domainTokenId: event.domainTokenId,
      domainName: event.domainName,
      latestAiScore: event.latestAiScore,
      totalScoringRequests: event.totalScoringRequests,
      totalLoansCreated: event.totalLoansCreated,
      totalLoanVolume: event.totalLoanVolume,
      hasBeenLiquidated: event.hasBeenLiquidated,
      firstScoreTimestamp: event.firstScoreTimestamp,
      lastActivityTimestamp: event.lastActivityTimestamp
    }));
  }

  private buildLoanObjects(loans: any[]): LoanDto[] {
    // Convert loan records to LoanDto array - these are now from the loan table, not events
    return loans.map(loan => {
      const now = Date.now();
      const deadline = loan.repaymentDeadline ? parseInt(loan.repaymentDeadline) : now + 86400000;
      const isOverdue = loan.status === 'active' && deadline < now;

      return {
        loanId: loan.loanId,
        borrowerAddress: loan.borrowerAddress,
        domainTokenId: loan.domainTokenId,
        domainName: loan.domainName,
        loanAmount: (BigInt(loan.originalAmount || '0') / BigInt(1000000)).toString(), // Convert to USDC format
        aiScore: loan.aiScore,
        interestRate: loan.interestRate,
        status: isOverdue ? 'overdue' : loan.status,
        eventType: 'loan_record', // This is now a loan record, not an event
        eventTimestamp: loan.createdAt,
        repaymentDeadline: loan.repaymentDeadline,
        poolId: loan.poolId,
        liquidationAttempted: loan.liquidationAttempted,
        liquidationTimestamp: loan.liquidationTimestamp
      };
    });
  }

  private buildScoringEventObjects(scoringEvents: any[]): ScoringEventDto[] {
    return scoringEvents.map(event => ({
      id: event.id,
      domainTokenId: event.domainTokenId,
      domainName: event.domainName,
      requesterAddress: event.requesterAddress,
      aiScore: event.aiScore,
      confidence: event.confidence,
      reasoning: event.reasoning,
      requestTimestamp: event.requestTimestamp,
      status: event.status
    }));
  }
}
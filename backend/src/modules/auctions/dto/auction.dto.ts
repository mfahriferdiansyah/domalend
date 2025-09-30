import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { DomaNFTDto } from '../../domain/dto/domain.dto';

export class AuctionDomainDto {
  @ApiProperty({
    description: 'Domain token ID',
    example: '54344964066288468101530659531467425324551312134658892013131579195659464473615'
  })
  tokenId: string;

  @ApiProperty({
    description: 'Domain name',
    example: 'example.com'
  })
  name: string;

  @ApiProperty({
    description: 'Domain NFT metadata',
    type: () => DomaNFTDto
  })
  metadata: DomaNFTDto;

  @ApiProperty({
    description: 'AI domain score (0-100)',
    example: 85
  })
  aiScore: number;

  @ApiProperty({
    description: 'Top-level domain',
    example: 'com'
  })
  tld: string;

  @ApiProperty({
    description: 'Domain character length',
    example: 7
  })
  characterLength: number;
}

export class AuctionDto {
  @ApiProperty({
    description: 'Unique auction identifier',
    example: 'auction_123'
  })
  auctionId: string;

  @ApiProperty({
    description: 'Associated loan ID',
    example: 'loan_456'
  })
  loanId: string;

  @ApiProperty({
    description: 'Pool ID from the loan',
    example: 'pool_789'
  })
  poolId: string;

  @ApiProperty({
    description: 'Auction status',
    enum: ['active', 'completed', 'expired'],
    example: 'active'
  })
  status: 'active' | 'completed' | 'expired';

  @ApiProperty({
    description: 'Starting price (2x loan amount in USDC)',
    example: '2000000000'
  })
  startingPrice: string;

  @ApiProperty({
    description: 'Current calculated price in USDC',
    example: '1950000000'
  })
  currentPrice: string;

  @ApiProperty({
    description: 'Price decay per second for frontend countdown',
    example: '225694'
  })
  decayPerSecond: string;

  @ApiProperty({
    description: 'UTC timestamp when auction started',
    example: '2024-01-15T10:30:00.000Z'
  })
  auctionStartedAt: string;

  @ApiProperty({
    description: 'Domain information with enriched metadata',
    type: () => AuctionDomainDto
  })
  domain: AuctionDomainDto;

  @ApiProperty({
    description: 'Borrower address',
    example: '0xaba3cf48a81225de43a642ca486c1c069ec11a53'
  })
  borrower: string;
}

export class UserAuctionDto extends AuctionDto {
  @ApiProperty({
    description: 'Whether user is the borrower of this auction',
    example: true
  })
  userIsBorrower: boolean;
}

export class GetAuctionsQueryDto {
  @ApiProperty({
    description: 'Page number (1-based)',
    example: 1,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;

  @ApiProperty({
    description: 'Filter by auction status',
    enum: ['active', 'completed', 'expired'],
    required: false
  })
  @IsOptional()
  @IsEnum(['active', 'completed', 'expired'])
  status?: 'active' | 'completed' | 'expired';

  @ApiProperty({
    description: 'Sort by field',
    enum: ['auctionStartedAt', 'currentPrice', 'startingPrice'],
    example: 'auctionStartedAt',
    required: false
  })
  @IsOptional()
  @IsEnum(['auctionStartedAt', 'currentPrice', 'startingPrice'])
  sortBy?: string = 'auctionStartedAt';

  @ApiProperty({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc',
    required: false
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}

export class GetAuctionsResponseDto {
  @ApiProperty({
    description: 'List of auctions',
    type: () => [AuctionDto]
  })
  auctions: AuctionDto[];

  @ApiProperty({
    description: 'Total number of auctions',
    example: 50
  })
  total: number;

  @ApiProperty({
    description: 'Current page',
    example: 1
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 20
  })
  limit: number;
}

export class GetUserAuctionsResponseDto {
  @ApiProperty({
    description: 'List of user auctions',
    type: () => [UserAuctionDto]
  })
  auctions: UserAuctionDto[];

  @ApiProperty({
    description: 'User auction summary',
    type: 'object',
    properties: {
      totalAuctions: {
        type: 'number',
        description: 'Total number of auctions user is involved in',
        example: 3
      },
      activeAuctions: {
        type: 'number',
        description: 'Number of active auctions',
        example: 1
      }
    }
  })
  summary: {
    totalAuctions: number;
    activeAuctions: number;
  };
}

export class AuctionEventDto {
  @ApiProperty({
    description: 'Auction ID',
    example: 'auction_12345',
  })
  auctionId: string;

  @ApiProperty({
    description: 'Associated loan ID',
    example: 'loan_12345',
  })
  loanId: string;

  @ApiProperty({
    description: 'Domain token ID',
    example: '123456',
  })
  domainTokenId: string;

  @ApiProperty({
    description: 'Domain name',
    example: 'example.eth',
  })
  domainName: string;

  @ApiProperty({
    description: 'Borrower address',
    example: '0xaba3cf48a81225de43a642ca486c1c069ec11a53',
  })
  borrowerAddress: string;

  @ApiProperty({
    description: 'Bidder address',
    example: '0x47b245f2a3c7557d855e4d800890c4a524a42cc8',
    required: false,
  })
  bidderAddress?: string;

  @ApiProperty({
    description: 'Starting price of the auction',
    example: '1000000000000000000',
    required: false,
  })
  startingPrice?: string;

  @ApiProperty({
    description: 'Current price of the auction',
    example: '1500000000000000000',
    required: false,
  })
  currentPrice?: string;

  @ApiProperty({
    description: 'Final price if auction ended',
    example: '2000000000000000000',
    required: false,
  })
  finalPrice?: string;

  @ApiProperty({
    description: 'Recovery rate (final price / loan amount)',
    example: 1.5,
    required: false,
  })
  recoveryRate?: number;

  @ApiProperty({
    description: 'Event type',
    example: 'started',
    enum: ['started', 'bid_placed', 'ended'],
  })
  eventType: string;

  @ApiProperty({
    description: 'Event timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  eventTimestamp: string;
}

export class AuctionDetailDto {
  @ApiProperty({
    description: 'Auction ID',
    example: 'auction_12345',
  })
  auctionId: string;

  @ApiProperty({
    description: 'Associated loan ID',
    example: 'loan_12345',
  })
  loanId: string;

  @ApiProperty({
    description: 'Domain token ID',
    example: '123456',
  })
  domainTokenId: string;

  @ApiProperty({
    description: 'Domain name',
    example: 'example.eth',
  })
  domainName: string;

  @ApiProperty({
    description: 'Borrower address',
    example: '0xaba3cf48a81225de43a642ca486c1c069ec11a53',
  })
  borrowerAddress: string;

  @ApiProperty({
    description: 'Current status of the auction',
    example: 'active',
    enum: ['active', 'completed', 'expired'],
  })
  status: string;

  @ApiProperty({
    description: 'Starting price of the auction',
    example: '1000000000000000000',
    required: false,
  })
  startingPrice?: string;

  @ApiProperty({
    description: 'Current highest bid',
    example: '1500000000000000000',
    required: false,
  })
  currentPrice?: string;

  @ApiProperty({
    description: 'Final price if auction ended',
    example: '2000000000000000000',
    required: false,
  })
  finalPrice?: string;

  @ApiProperty({
    description: 'Recovery rate (final price / loan amount)',
    example: 1.5,
    required: false,
  })
  recoveryRate?: number;

  @ApiProperty({
    description: 'Current highest bidder',
    example: '0x47b245f2a3c7557d855e4d800890c4a524a42cc8',
    required: false,
  })
  currentBidder?: string;

  @ApiProperty({
    description: 'Auction start timestamp',
    example: '2024-01-15T10:30:00Z',
    required: false,
  })
  startedAt?: string;

  @ApiProperty({
    description: 'Auction end timestamp',
    example: '2024-01-16T10:30:00Z',
    required: false,
  })
  endedAt?: string;

  @ApiProperty({
    description: 'Domain information with enriched metadata',
    type: () => AuctionDomainDto,
    required: false,
  })
  domain?: AuctionDomainDto;

  @ApiProperty({
    description: 'All auction events in chronological order',
    type: () => [AuctionEventDto],
  })
  events: AuctionEventDto[];
}

export class GetAuctionDetailResponseDto {
  @ApiProperty({
    description: 'Auction details with event history',
    type: () => AuctionDetailDto,
  })
  auction: AuctionDetailDto;
}
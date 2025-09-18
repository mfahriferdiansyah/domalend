import { IsArray, IsString, IsOptional, IsBoolean, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DomainMetadata } from '../services/domain-metadata.service';
import { ScoreBreakdown } from '../services/domain-scoring.service';

export class BatchScoreDto {
  @ApiProperty({
    description: 'Array of domain token IDs to score',
    example: ['123456789', '987654321'],
    maxItems: 50,
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  tokenIds: string[];

  @ApiProperty({
    description: 'Use cached scores if available',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  useCache?: boolean = true;
}

export class UpdateScoreDto {
  @ApiProperty({
    description: 'Domain token ID',
    example: '123456789',
  })
  @IsString()
  tokenId: string;

  @ApiProperty({
    description: 'Force refresh even if cache is valid',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean = false;
}

export class DomainInfoDto {
  @ApiProperty({
    description: 'Domain token ID',
    example: '123456789',
  })
  tokenId: string;

  @ApiProperty({
    description: 'Domain metadata from Doma Protocol',
  })
  metadata: DomainMetadata;

  @ApiProperty({
    description: 'Domain score breakdown',
    required: false,
  })
  score?: ScoreBreakdown;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-01-01T12:00:00.000Z',
  })
  lastUpdated: string;
}

export class DomainSearchDto {
  @ApiProperty({
    description: 'Search query (domain name or partial match)',
    example: 'example',
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Minimum score threshold',
    example: 50,
    required: false,
  })
  @IsOptional()
  minScore?: number;

  @ApiProperty({
    description: 'Maximum score threshold',
    example: 90,
    required: false,
  })
  @IsOptional()
  maxScore?: number;

  @ApiProperty({
    description: 'TLD filter',
    example: 'com',
    required: false,
  })
  @IsOptional()
  @IsString()
  tld?: string;
}

export class DomaNFTAttributeDto {
  @ApiProperty({
    description: 'Trait type',
    example: 'TLD',
  })
  trait_type: string;

  @ApiProperty({
    description: 'Trait value',
    example: 'com',
  })
  value: string | number;

  @ApiProperty({
    description: 'Display type for the trait',
    example: 'date',
    required: false,
  })
  display_type?: string;
}

export class DomaNFTDto {
  @ApiProperty({
    description: 'Domain token ID',
    example: '54344964066288468101530659531467425324551312134658892013131579195659464473615',
  })
  tokenId: string;

  @ApiProperty({
    description: 'Owner address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
  })
  owner: string;

  @ApiProperty({
    description: 'Domain name',
    example: 'example.com',
  })
  name: string;

  @ApiProperty({
    description: 'NFT description',
    example: 'Domain Ownership Token',
  })
  description: string;

  @ApiProperty({
    description: 'Image URL',
    example: 'https://cdn-testnet.doma.xyz/tokens/example.png',
  })
  image: string;

  @ApiProperty({
    description: 'External URL',
    example: 'https://dashboard.doma.xyz',
  })
  externalUrl: string;

  @ApiProperty({
    description: 'NFT attributes',
    type: [DomaNFTAttributeDto],
  })
  attributes: DomaNFTAttributeDto[];

  @ApiProperty({
    description: 'Domain expiration date (Unix timestamp)',
    example: 1820826777,
    required: false,
  })
  expirationDate?: number;

  @ApiProperty({
    description: 'Top-level domain',
    example: 'com',
    required: false,
  })
  tld?: string;

  @ApiProperty({
    description: 'Domain character length',
    example: 7,
    required: false,
  })
  characterLength?: number;

  @ApiProperty({
    description: 'Domain registrar',
    example: 'D3 Registrar',
    required: false,
  })
  registrar?: string;
}

export class AddressNFTBalanceDto {
  @ApiProperty({
    description: 'Address queried',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
  })
  address: string;

  @ApiProperty({
    description: 'Number of NFTs owned',
    example: 1,
  })
  balance: number;

  @ApiProperty({
    description: 'Explanation note',
    example: 'Address owns 1 NFT(s). Use batch verification with known token IDs to get details.',
  })
  note: string;
}

export class BatchVerificationRequestDto {
  @ApiProperty({
    description: 'Token IDs to verify ownership for',
    example: ['54344964066288468101530659531467425324551312134658892013131579195659464473615'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  tokenIds: string[];
}

export class BatchVerificationResponseDto {
  @ApiProperty({
    description: 'Address that was checked',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
  })
  address: string;

  @ApiProperty({
    description: 'Number of token IDs checked',
    example: 5,
  })
  totalChecked: number;

  @ApiProperty({
    description: 'Number of NFTs owned by the address',
    example: 2,
  })
  ownedCount: number;

  @ApiProperty({
    description: 'List of NFTs owned by the address',
    type: [DomaNFTDto],
  })
  ownedNFTs: DomaNFTDto[];
}

export class NFTDetailsResponseDto {
  @ApiProperty({
    description: 'Token ID queried',
    example: '54344964066288468101530659531467425324551312134658892013131579195659464473615',
  })
  tokenId: string;

  @ApiProperty({
    description: 'Whether the NFT exists',
    example: true,
  })
  exists: boolean;

  @ApiProperty({
    description: 'NFT details if exists',
    type: DomaNFTDto,
    required: false,
  })
  nft?: DomaNFTDto;

  @ApiProperty({
    description: 'Whether the domain is expired',
    example: false,
    required: false,
  })
  expired?: boolean;

  @ApiProperty({
    description: 'Error or info message',
    example: 'NFT not found',
    required: false,
  })
  message?: string;
}
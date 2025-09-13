import { IsArray, IsString, IsOptional, IsBoolean, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DomainMetadata } from '../services/domain-metadata.service';
import { ScoreBreakdown, DomainValuationResult } from '../services/domain-scoring.service';

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
    description: 'Domain valuation result',
    required: false,
  })
  valuation?: DomainValuationResult;

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
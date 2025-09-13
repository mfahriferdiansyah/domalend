import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  HttpException, 
  HttpStatus,
  UseGuards,
  Logger
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery 
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

// Services
import { DomainScoringService, ScoreBreakdown, DomainValuationResult } from '../services/domain-scoring.service';
import { DomainMetadataService, DomainMetadata } from '../services/domain-metadata.service';
import { DomainValidationService } from '../services/domain-validation.service';

// DTOs
import { BatchScoreDto, DomainInfoDto } from '../dto/domain.dto';

@ApiTags('domains')
@Controller('domains')
@UseGuards(ThrottlerGuard)
export class DomainController {
  private readonly logger = new Logger(DomainController.name);

  constructor(
    private readonly domainScoringService: DomainScoringService,
    private readonly domainMetadataService: DomainMetadataService,
    private readonly domainValidationService: DomainValidationService,
  ) {}

  @Get(':tokenId/metadata')
  @ApiOperation({ summary: 'Get domain metadata from Doma Protocol' })
  @ApiParam({ name: 'tokenId', description: 'Domain token ID' })
  @ApiResponse({ status: 200, description: 'Domain metadata retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  async getDomainMetadata(@Param('tokenId') tokenId: string): Promise<DomainMetadata> {
    this.logger.log(`Fetching metadata for domain: ${tokenId}`);
    
    const metadata = await this.domainMetadataService.getDomainMetadata(tokenId);
    
    if (!metadata) {
      throw new HttpException(
        `Domain not found: ${tokenId}`,
        HttpStatus.NOT_FOUND
      );
    }
    
    return metadata;
  }

  @Get(':tokenId/score')
  @ApiOperation({ summary: 'Get comprehensive domain score' })
  @ApiParam({ name: 'tokenId', description: 'Domain token ID' })
  @ApiQuery({ name: 'useCache', required: false, description: 'Use cached score if available' })
  @ApiResponse({ status: 200, description: 'Domain score calculated successfully' })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  async getDomainScore(
    @Param('tokenId') tokenId: string,
    @Query('useCache') useCache: boolean = true
  ): Promise<ScoreBreakdown> {
    this.logger.log(`Calculating score for domain: ${tokenId}`);
    
    const score = await this.domainScoringService.scoreDomain(tokenId, useCache);
    
    if (!score) {
      throw new HttpException(
        `Unable to score domain: ${tokenId}`,
        HttpStatus.NOT_FOUND
      );
    }
    
    return score;
  }

  @Get(':tokenId/valuation')
  @ApiOperation({ summary: 'Get domain valuation and loan terms' })
  @ApiParam({ name: 'tokenId', description: 'Domain token ID' })
  @ApiQuery({ name: 'useCache', required: false, description: 'Use cached valuation if available' })
  @ApiResponse({ status: 200, description: 'Domain valuation calculated successfully' })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  async getDomainValuation(
    @Param('tokenId') tokenId: string,
    @Query('useCache') useCache: boolean = true
  ): Promise<DomainValuationResult> {
    this.logger.log(`Calculating valuation for domain: ${tokenId}`);
    
    const valuation = await this.domainScoringService.valuateDomain(tokenId, useCache);
    
    if (!valuation) {
      throw new HttpException(
        `Unable to valuate domain: ${tokenId}`,
        HttpStatus.NOT_FOUND
      );
    }
    
    return valuation;
  }

  @Get(':tokenId/info')
  @ApiOperation({ summary: 'Get comprehensive domain information' })
  @ApiParam({ name: 'tokenId', description: 'Domain token ID' })
  @ApiQuery({ name: 'useCache', required: false, description: 'Use cached data if available' })
  @ApiResponse({ status: 200, description: 'Complete domain information retrieved' })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  async getComprehensiveDomainInfo(
    @Param('tokenId') tokenId: string,
    @Query('useCache') useCache: boolean = true
  ): Promise<DomainInfoDto> {
    this.logger.log(`Fetching comprehensive info for domain: ${tokenId}`);
    
    const [metadata, score, valuation] = await Promise.all([
      this.domainMetadataService.getDomainMetadata(tokenId),
      this.domainScoringService.scoreDomain(tokenId, useCache),
      this.domainScoringService.valuateDomain(tokenId, useCache),
    ]);

    if (!metadata) {
      throw new HttpException(
        `Domain not found: ${tokenId}`,
        HttpStatus.NOT_FOUND
      );
    }

    return {
      tokenId,
      metadata,
      score,
      valuation,
      lastUpdated: new Date().toISOString(),
    };
  }

  @Post('batch-score')
  @ApiOperation({ summary: 'Score multiple domains in batch' })
  @ApiResponse({ status: 200, description: 'Batch scoring completed' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async batchScoreDomains(@Body() batchScoreDto: BatchScoreDto) {
    const { tokenIds } = batchScoreDto;
    
    if (!tokenIds || tokenIds.length === 0) {
      throw new HttpException('No token IDs provided', HttpStatus.BAD_REQUEST);
    }

    if (tokenIds.length > 50) {
      throw new HttpException('Too many token IDs (max 50)', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`Starting batch scoring for ${tokenIds.length} domains`);

    const results = await this.domainScoringService.batchScoreDomains(tokenIds);
    
    const successCount = results.size;
    const failureCount = tokenIds.length - successCount;

    const response = {
      totalProcessed: tokenIds.length,
      successCount,
      failureCount,
      results: Array.from(results.entries()).map(([tokenId, score]) => ({
        tokenId,
        success: true,
        score,
      })),
      failedTokenIds: tokenIds.filter(id => !results.has(id)),
    };

    this.logger.log(`Batch scoring completed: ${successCount} successful, ${failureCount} failed`);

    return response;
  }

  @Get(':tokenId/history')
  @ApiOperation({ summary: 'Get domain scoring history' })
  @ApiParam({ name: 'tokenId', description: 'Domain token ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of history records to return' })
  @ApiResponse({ status: 200, description: 'Scoring history retrieved successfully' })
  async getScoringHistory(
    @Param('tokenId') tokenId: string,
    @Query('limit') limit: number = 10
  ) {
    const history = await this.domainScoringService.getScoringHistory(tokenId, limit);
    
    return {
      tokenId,
      historyCount: history.length,
      history,
    };
  }

  @Get(':tokenId/exists')
  @ApiOperation({ summary: 'Check if domain exists in Doma Protocol' })
  @ApiParam({ name: 'tokenId', description: 'Domain token ID' })
  @ApiResponse({ status: 200, description: 'Domain existence check completed' })
  async checkDomainExists(@Param('tokenId') tokenId: string) {
    const exists = await this.domainMetadataService.domainExists(tokenId);
    
    return {
      tokenId,
      exists,
      timestamp: new Date().toISOString(),
    };
  }
}
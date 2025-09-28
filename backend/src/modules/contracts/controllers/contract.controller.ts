import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SmartContractService } from '../services/smart-contract.service';
import { ContractInteractionService } from '../services/contract-interaction.service';
import { DomaNftService } from '../../domain/services/doma-nft.service';
import { DomainScoreCacheService } from '../../domain/services/domain-score-cache.service';
import { SubmitScoreByTokenIdDto, SubmitScoreResponseDto } from '../dto/submit-score.dto';

@ApiTags('contracts')
@Controller('contracts')
export class ContractController {
  private readonly logger = new Logger(ContractController.name);

  constructor(
    private readonly smartContractService: SmartContractService,
    private readonly contractInteractionService: ContractInteractionService,
    private readonly domaNftService: DomaNftService,
    private readonly domainScoreCacheService: DomainScoreCacheService,
  ) {}

  @Post('submit-score')
  @ApiOperation({
    summary: 'Intelligent domain scoring and submission',
    description: 'Receives tokenId, resolves metadata, checks cache, scores if needed, and submits to blockchain'
  })
  @ApiBody({ type: SubmitScoreByTokenIdDto })
  @ApiResponse({
    status: 200,
    description: 'Score processed and submitted successfully',
    type: SubmitScoreResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid token ID or NFT not found' })
  @ApiResponse({ status: 500, description: 'Internal server error during scoring or submission' })
  async submitScore(@Body() submitScoreDto: SubmitScoreByTokenIdDto): Promise<SubmitScoreResponseDto> {
    const { tokenId } = submitScoreDto;
    this.logger.log(`Processing score submission for tokenId: ${tokenId}`);

    try {
      // 1. Get NFT metadata from tokenId
      const nftData = await this.domaNftService.getNFTByTokenId(tokenId);
      if (!nftData) {
        this.logger.warn(`NFT not found for tokenId: ${tokenId}`);
        return {
          success: false,
          error: 'NFT not found or does not exist',
          message: `No NFT found with tokenId: ${tokenId}`
        };
      }

      // 2. Extract domain name from NFT metadata
      const domainName = nftData.name;
      if (!domainName) {
        this.logger.warn(`No domain name found in NFT metadata for tokenId: ${tokenId}`);
        return {
          success: false,
          error: 'Domain name not found in NFT metadata',
          message: `NFT ${tokenId} does not contain a valid domain name`
        };
      }

      this.logger.log(`Resolved tokenId ${tokenId} to domain: ${domainName}`);

      // 3. Get domain score (from cache or generate new) with real tokenId
      const scoreResult = await this.domainScoreCacheService.getDomainScore(domainName, undefined, tokenId);

      this.logger.log(`Domain score for ${domainName}: ${scoreResult.totalScore} (cached: ${scoreResult.isFromCache})`);

      // 4. Submit score to smart contract
      const contractResult = await this.smartContractService.submitScore(
        tokenId,
        scoreResult.totalScore,
        domainName,
        scoreResult.confidence,
        scoreResult.reasoning
      );

      if (!contractResult.success) {
        this.logger.error(`Contract submission failed for ${domainName}: ${contractResult.error || 'Unknown error'}`);
        return {
          success: false,
          score: scoreResult.totalScore,
          domainName,
          cached: scoreResult.isFromCache,
          error: 'Contract submission failed',
          message: contractResult.error || 'Failed to submit score to blockchain'
        };
      }

      this.logger.log(`Successfully submitted score for ${domainName} (${scoreResult.totalScore}) - TX: ${contractResult.txHash}`);

      return {
        success: true,
        txHash: contractResult.txHash,
        score: scoreResult.totalScore,
        domainName,
        cached: scoreResult.isFromCache,
        message: `Score ${scoreResult.totalScore} submitted for ${domainName}`
      };

    } catch (error) {
      this.logger.error(`Error processing score submission for tokenId ${tokenId}:`, error.message);
      return {
        success: false,
        error: 'Internal server error',
        message: `Failed to process score submission: ${error.message}`
      };
    }
  }

  @Post('liquidate-loan')
  @ApiOperation({ summary: 'Liquidate a loan' })
  @ApiResponse({ status: 200, description: 'Loan liquidated successfully' })
  async liquidateLoan(@Body() liquidateDto: {
    loanId: string;
    domainTokenId: string;
    borrowerAddress: string;
  }) {
    return this.contractInteractionService.liquidateLoan(
      liquidateDto.loanId,
      liquidateDto.domainTokenId,
      liquidateDto.borrowerAddress,
    );
  }
}
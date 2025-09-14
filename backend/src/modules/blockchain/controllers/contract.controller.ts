import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContractInteractionService } from '../services/contract-interaction.service';

interface ScoreSubmissionRequest {
  domainTokenId: string;
  score: number;
  domainName: string;
  confidence: number;
  reasoning: string;
}

interface LiquidationRequest {
  loanId: string;
  domainTokenId: string;
  borrowerAddress: string;
  domainName?: string;
}

@ApiTags('contracts')
@Controller('api/contracts')
export class ContractController {
  private readonly logger = new Logger(ContractController.name);

  constructor(
    private readonly contractInteractionService: ContractInteractionService,
  ) {}

  @Post('submit-score')
  @ApiOperation({
    summary: 'Submit domain score to AIOracle smart contract',
    description: 'Called by indexer to submit AI-generated domain scores to the blockchain'
  })
  @ApiResponse({ status: 200, description: 'Score submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 500, description: 'Contract interaction failed' })
  async submitScore(@Body() request: ScoreSubmissionRequest) {
    this.logger.log(`Submitting score for domain ${request.domainName}: ${request.score}`);

    try {
      // Validate request
      if (!request.domainTokenId || !request.score || request.score < 0 || request.score > 100) {
        throw new HttpException('Invalid score submission data', HttpStatus.BAD_REQUEST);
      }

      // Submit score to AIOracle contract
      const result = await this.contractInteractionService.submitScore({
        domainTokenId: request.domainTokenId,
        score: request.score,
      });

      this.logger.log(`Score submitted successfully for ${request.domainName}: TX ${result.txHash}`);

      return {
        success: true,
        txHash: result.txHash,
        domainTokenId: request.domainTokenId,
        score: request.score,
      };

    } catch (error) {
      this.logger.error(`Failed to submit score for ${request.domainName}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Score submission failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('liquidate-loan')
  @ApiOperation({
    summary: 'Liquidate defaulted loan via LoanManager smart contract',
    description: 'Called by indexer to liquidate loans that have passed their repayment deadline'
  })
  @ApiResponse({ status: 200, description: 'Liquidation submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 500, description: 'Contract interaction failed' })
  async liquidateLoan(@Body() request: LiquidationRequest) {
    this.logger.log(`Liquidating loan ${request.loanId} for domain ${request.domainTokenId}`);

    try {
      // Validate request
      if (!request.loanId || !request.domainTokenId) {
        throw new HttpException('Invalid liquidation request data', HttpStatus.BAD_REQUEST);
      }

      // Trigger liquidation via LoanManager contract
      const result = await this.contractInteractionService.liquidateLoan({
        loanId: request.loanId,
        domainTokenId: request.domainTokenId,
      });

      this.logger.log(`Liquidation submitted successfully for loan ${request.loanId}: TX ${result.txHash}`);

      return {
        success: true,
        txHash: result.txHash,
        auctionId: result.auctionId,
        loanId: request.loanId,
        domainTokenId: request.domainTokenId,
      };

    } catch (error) {
      this.logger.error(`Failed to liquidate loan ${request.loanId}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Liquidation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SmartContractService } from '../services/smart-contract.service';
import { ContractInteractionService } from '../services/contract-interaction.service';

@ApiTags('contracts')
@Controller('contracts')
export class ContractController {
  constructor(
    private readonly smartContractService: SmartContractService,
    private readonly contractInteractionService: ContractInteractionService,
  ) {}

  @Post('submit-score')
  @ApiOperation({ summary: 'Submit domain score to blockchain' })
  @ApiResponse({ status: 200, description: 'Score submitted successfully' })
  async submitScore(@Body() submitScoreDto: {
    domainTokenId: string;
    score: number;
    domainName: string;
    confidence: number;
    reasoning: string;
  }) {
    return this.smartContractService.submitScore(
      submitScoreDto.domainTokenId,
      submitScoreDto.score,
      submitScoreDto.domainName,
      submitScoreDto.confidence,
      submitScoreDto.reasoning,
    );
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
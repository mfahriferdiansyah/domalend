import { Controller, Get, Post, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { LiquidationService } from '../services/liquidation.service';

@ApiTags('liquidation')
@Controller('liquidation')
export class LiquidationController {
  constructor(
    private readonly liquidationService: LiquidationService,
  ) {}

  @Get('pending')
  @ApiOperation({ summary: 'Get all pending loans' })
  @ApiResponse({ status: 200, description: 'Pending loans retrieved successfully' })
  async getPendingLoans() {
    try {
      const loans = await this.liquidationService.getPendingLoans();
      return {
        success: true,
        data: loans,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get pending loans: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent liquidations' })
  @ApiResponse({ status: 200, description: 'Recent liquidations retrieved successfully' })
  async getRecentLiquidations() {
    try {
      const liquidations = await this.liquidationService.getRecentLiquidations();
      return {
        success: true,
        data: liquidations,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get recent liquidations: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('trigger/:loanId')
  @ApiOperation({ summary: 'Manually trigger liquidation for a loan' })
  @ApiParam({ name: 'loanId', description: 'Loan ID to liquidate' })
  @ApiResponse({ status: 200, description: 'Liquidation triggered successfully' })
  @ApiResponse({ status: 400, description: 'Liquidation failed' })
  async triggerLiquidation(@Param('loanId') loanId: string) {
    try {
      const result = await this.liquidationService.triggerLiquidation(loanId);

      if (!result.success) {
        throw new HttpException(result.message, HttpStatus.BAD_REQUEST);
      }

      return {
        success: true,
        message: result.message,
        data: result.data,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to trigger liquidation: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

}
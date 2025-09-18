import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { LiquidationTracking } from '../../core/database/entities/liquidation-tracking.entity';
import { LiquidationService } from './services/liquidation.service';
import { LoanEventListenerService } from './services/loan-event-listener.service';
import { BlockchainLiquidationService } from './services/blockchain-liquidation.service';
import { LiquidationController } from './controllers/liquidation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([LiquidationTracking]),
    ScheduleModule.forRoot(), // Enable scheduled tasks
  ],
  providers: [
    LiquidationService,
    LoanEventListenerService,
    BlockchainLiquidationService,
  ],
  controllers: [
    LiquidationController,
  ],
  exports: [
    LiquidationService,
    LoanEventListenerService,
    BlockchainLiquidationService,
  ],
})
export class LiquidationModule {}
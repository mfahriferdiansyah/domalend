import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';

// Services
import { HealthController } from './health.controller';
import { CustomHealthIndicator } from './custom-health.indicator';

// External modules for health checks
import { ExternalApiModule } from '../external-api/external-api.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    ExternalApiModule,
    BlockchainModule,
  ],
  controllers: [HealthController],
  providers: [CustomHealthIndicator],
})
export class HealthModule {}
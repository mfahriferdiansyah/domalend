import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule } from '@nestjs/throttler';

// Feature Modules
import { DomainModule } from './modules/domain/domain.module';
import { AiModule } from './modules/ai/ai.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { ExternalApiModule } from './modules/external-api/external-api.module';
import { HealthModule } from './modules/health/health.module';

// Core Modules
import { DatabaseModule } from './core/database/database.module';
import { LoggerModule } from './core/logger/logger.module';

// Configuration
import configuration from './config/configuration';

@Module({
  imports: [
    // Core Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // HTTP Client
    HttpModule.register({
      timeout: 15000, // 15 seconds
      maxRedirects: 3,
    }),

    // Core Modules
    DatabaseModule,
    LoggerModule,

    // Feature Modules
    DomainModule,
    AiModule,
    BlockchainModule,
    ExternalApiModule,
    HealthModule,
  ],
})
export class AppModule {}
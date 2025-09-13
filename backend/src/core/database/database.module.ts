import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Entities
import { DomainScore } from './entities/domain-score.entity';
import { DomainValuation } from './entities/domain-valuation.entity';
import { ScoringHistory } from './entities/scoring-history.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig: any = {
          type: configService.get('database.type', 'sqlite') as 'sqlite' | 'postgres',
          entities: [DomainScore, DomainValuation, ScoringHistory],
          synchronize: configService.get('database.synchronize', true),
          logging: configService.get('database.logging', false),
          autoLoadEntities: true,
        };

        if (dbConfig.type === 'sqlite') {
          dbConfig.database = configService.get('database.database', './data/domalend.db');
        } else {
          dbConfig.url = configService.get('database.url');
          dbConfig.host = configService.get('database.host');
          dbConfig.port = configService.get('database.port');
          dbConfig.username = configService.get('database.username');
          dbConfig.password = configService.get('database.password');
          dbConfig.database = configService.get('database.database');
          dbConfig.ssl = configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false;
        }

        return dbConfig;
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([DomainScore, DomainValuation, ScoringHistory]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
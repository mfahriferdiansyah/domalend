import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

// AI Module for OpenAI integration
import { AiModule } from '../ai/ai.module';

// Entities
import { DomainScore } from '../../core/database/entities/domain-score.entity';
import { ScoringHistory } from '../../core/database/entities/scoring-history.entity';

// Services
import { DomainMetadataService } from './services/domain-metadata.service';
import { DomainAnalysisService } from './services/domain-analysis.service';
import { DomainValidationService } from './services/domain-validation.service';
import { HybridScoringService } from './services/hybrid-scoring.service';
import { DomainScoreCacheService } from './services/domain-score-cache.service';
import { DomaNftService } from './services/doma-nft.service';

// Controllers
import { DomainController } from './controllers/domain.controller';
import { ScoringController } from './controllers/scoring.controller';


@Module({
  imports: [
    TypeOrmModule.forFeature([DomainScore, ScoringHistory]),
    HttpModule,
    AiModule,
  ],
  providers: [
    DomainMetadataService,
    DomainAnalysisService,
    DomainValidationService,
    HybridScoringService,
    DomainScoreCacheService,
    DomaNftService,
  ],
  controllers: [
    DomainController,
    ScoringController,
  ],
  exports: [
    DomainMetadataService,
    DomainAnalysisService,
    HybridScoringService,
    DomainScoreCacheService,
    DomaNftService,
  ],
})
export class DomainModule {}
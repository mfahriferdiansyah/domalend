import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

// Entities
import { DomainScore } from '../../core/database/entities/domain-score.entity';
import { DomainValuation } from '../../core/database/entities/domain-valuation.entity';
import { ScoringHistory } from '../../core/database/entities/scoring-history.entity';

// Services
import { DomainScoringService } from './services/domain-scoring.service';
import { DomainMetadataService } from './services/domain-metadata.service';
import { DomainAnalysisService } from './services/domain-analysis.service';
import { DomainValidationService } from './services/domain-validation.service';
import { HybridScoringService } from './services/hybrid-scoring.service';
import { DomainScoreCacheService } from './services/domain-score-cache.service';

// Controllers
import { DomainController } from './controllers/domain.controller';
import { ScoringController } from './controllers/scoring.controller';
import { IndexerController } from './controllers/indexer.controller';

// External modules
import { AiModule } from '../ai/ai.module';
import { ExternalApiModule } from '../external-api/external-api.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DomainScore, DomainValuation, ScoringHistory]),
    HttpModule,
    AiModule,
    ExternalApiModule,
    BlockchainModule,
  ],
  providers: [
    DomainScoringService,
    DomainMetadataService,
    DomainAnalysisService,
    DomainValidationService,
    HybridScoringService,
    DomainScoreCacheService,
  ],
  controllers: [
    DomainController,
    ScoringController,
    IndexerController,
  ],
  exports: [
    DomainScoringService,
    DomainMetadataService,
    DomainAnalysisService,
    HybridScoringService,
    DomainScoreCacheService,
  ],
})
export class DomainModule {}
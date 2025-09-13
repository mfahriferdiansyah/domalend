import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

// Services
import { ExternalApiService } from './services/external-api.service';
import { TrafficAnalysisService } from './services/traffic-analysis.service';
import { KeywordAnalysisService } from './services/keyword-analysis.service';
import { AhrefsService } from './services/ahrefs.service';
import { SemrushService } from './services/semrush.service';
import { SimilarwebService } from './services/similarweb.service';
import { FreeEnhancementService } from './services/free-enhancement.service';

// Controllers
import { ExternalApiController } from './controllers/external-api.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 15000,
      maxRedirects: 3,
    }),
  ],
  providers: [
    ExternalApiService,
    TrafficAnalysisService,
    KeywordAnalysisService,
    AhrefsService,
    SemrushService,
    SimilarwebService,
    FreeEnhancementService,
  ],
  controllers: [ExternalApiController],
  exports: [
    ExternalApiService,
    TrafficAnalysisService,
    KeywordAnalysisService,
    AhrefsService,
    SemrushService,
    SimilarwebService,
    FreeEnhancementService,
  ],
})
export class ExternalApiModule {}
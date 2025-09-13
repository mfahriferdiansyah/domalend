import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

// AI Services
import { AIConfigService } from './services/ai-config.service';
import { AIDomainAnalyzerService } from './services/ai-domain-analyzer.service';
import { AIOutputFormatterService } from './services/ai-output-formatter.service';
import { OpenAIDomainAnalyzerService } from './services/openai-domain-analyzer.service';

@Module({
  imports: [
    HttpModule,
  ],
  providers: [
    AIConfigService,
    AIDomainAnalyzerService,
    AIOutputFormatterService,
    OpenAIDomainAnalyzerService,
  ],
  exports: [
    AIConfigService,
    AIDomainAnalyzerService,
    AIOutputFormatterService,
    OpenAIDomainAnalyzerService,
  ],
})
export class AiModule {}
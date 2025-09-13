import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ExternalApiService } from '../services/external-api.service';
import { TrafficAnalysisService } from '../services/traffic-analysis.service';
import { KeywordAnalysisService } from '../services/keyword-analysis.service';

@ApiTags('external')
@Controller('external-api')
export class ExternalApiController {
  private readonly logger = new Logger(ExternalApiController.name);

  constructor(
    private readonly externalApiService: ExternalApiService,
    private readonly trafficAnalysisService: TrafficAnalysisService,
    private readonly keywordAnalysisService: KeywordAnalysisService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Check health of external APIs' })
  @ApiResponse({ status: 200, description: 'External API health status' })
  async healthCheck() {
    return this.externalApiService.healthCheck();
  }

  @Get('traffic')
  @ApiOperation({ summary: 'Get traffic metrics for domain' })
  @ApiQuery({ name: 'domain', description: 'Domain name to analyze' })
  @ApiResponse({ status: 200, description: 'Traffic metrics retrieved' })
  async getTrafficMetrics(@Query('domain') domain: string) {
    if (!domain) {
      return { error: 'Domain parameter is required' };
    }

    try {
      const metrics = await this.trafficAnalysisService.getTrafficMetrics(domain);
      return metrics;
    } catch (error) {
      this.logger.error(`Failed to get traffic metrics for ${domain}:`, error.message);
      return { error: 'Failed to retrieve traffic metrics' };
    }
  }

  @Get('keywords')
  @ApiOperation({ summary: 'Analyze keywords and brandability for domain' })
  @ApiQuery({ name: 'domain', description: 'Domain name to analyze' })
  @ApiResponse({ status: 200, description: 'Keyword analysis completed' })
  async analyzeKeywords(@Query('domain') domain: string) {
    if (!domain) {
      return { error: 'Domain parameter is required' };
    }

    try {
      const analysis = await this.keywordAnalysisService.analyzeKeywords(domain);
      return analysis;
    } catch (error) {
      this.logger.error(`Failed to analyze keywords for ${domain}:`, error.message);
      return { error: 'Failed to analyze keywords' };
    }
  }

  @Get('test-connectivity')
  @ApiOperation({ summary: 'Test connectivity to external APIs' })
  @ApiQuery({ name: 'domain', required: false, description: 'Test domain (default: example.com)' })
  @ApiResponse({ status: 200, description: 'Connectivity test results' })
  async testConnectivity(@Query('domain') domain?: string) {
    try {
      const results = await this.externalApiService.testApiConnectivity(domain);
      return results;
    } catch (error) {
      this.logger.error('Connectivity test failed:', error.message);
      return { error: 'Connectivity test failed' };
    }
  }
}
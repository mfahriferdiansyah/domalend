import { Controller, Get, Logger } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

// Services
import { CustomHealthIndicator } from './custom-health.indicator';
import { ExternalApiService } from '../external-api/services/external-api.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly customHealthIndicator: CustomHealthIndicator,
    private readonly externalApiService: ExternalApiService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Comprehensive health check' })
  @ApiResponse({ status: 200, description: 'Health check results' })
  @HealthCheck()
  async check() {
    const result = await this.health.check([
      // Database health
      () => this.db.pingCheck('database'),
      
      // Memory health (heap should be under 300MB)
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      
      // Disk health (should have at least 250MB free)
      () => this.disk.checkStorage('storage', { 
        path: '/', 
        thresholdPercent: 0.9 
      }),
      
      // External API health
      () => this.customHealthIndicator.checkExternalApis('external_apis'),
      
      // Blockchain connectivity
      () => this.customHealthIndicator.checkBlockchain('blockchain'),
    ]);

    this.logger.log(`Health check completed: ${result.status}`);
    return result;
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is live' })
  async live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @HealthCheck()
  async ready() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.customHealthIndicator.checkExternalApis('external_apis'),
    ]);
  }

  @Get('external-apis')
  @ApiOperation({ summary: 'External APIs health status' })
  @ApiResponse({ status: 200, description: 'External APIs health status' })
  async externalApisHealth() {
    const healthStatus = await this.externalApiService.healthCheck();
    
    return {
      status: healthStatus.overall,
      details: healthStatus,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Basic application metrics' })
  @ApiResponse({ status: 200, description: 'Application metrics' })
  async metrics() {
    const memUsage = process.memoryUsage();
    
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      pid: process.pid,
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)} MB`,
      },
      cpu: {
        usage: process.cpuUsage(),
      },
    };
  }
}
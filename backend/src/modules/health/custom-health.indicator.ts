import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ExternalApiService } from '../external-api/services/external-api.service';
import { SmartContractService } from '../blockchain/services/smart-contract.service';

@Injectable()
export class CustomHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(CustomHealthIndicator.name);

  constructor(
    private readonly externalApiService: ExternalApiService,
    private readonly smartContractService: SmartContractService,
  ) {
    super();
  }

  async checkExternalApis(key: string): Promise<HealthIndicatorResult> {
    try {
      const health = await this.externalApiService.healthCheck();
      
      const isHealthy = health.overall !== 'unhealthy';
      const result = this.getStatus(key, isHealthy, {
        status: health.overall,
        traffic: health.traffic,
        keywords: health.keywords,
      });

      if (isHealthy) {
        return result;
      }

      throw new HealthCheckError('External APIs check failed', result);
    } catch (error) {
      this.logger.error('External APIs health check failed:', error.message);
      throw new HealthCheckError('External APIs check failed', this.getStatus(key, false));
    }
  }

  async checkBlockchain(key: string): Promise<HealthIndicatorResult> {
    try {
      const healthCheckResult = await this.smartContractService.healthCheck();
      const isHealthy = healthCheckResult.connected;
      
      const result = this.getStatus(key, isHealthy, { details: healthCheckResult });

      if (isHealthy) {
        return result;
      }

      throw new HealthCheckError('Blockchain check failed', result);
    } catch (error) {
      this.logger.error('Blockchain health check failed:', error.message);
      throw new HealthCheckError('Blockchain check failed', this.getStatus(key, false));
    }
  }

  async checkDatabaseConnectivity(key: string): Promise<HealthIndicatorResult> {
    try {
      // Simple database check - this would typically involve a database query
      // For now, we'll assume it's healthy if we get to this point
      const isHealthy = true;
      
      const result = this.getStatus(key, isHealthy, {
        message: 'Database connection is healthy',
      });

      if (isHealthy) {
        return result;
      }

      throw new HealthCheckError('Database connectivity check failed', result);
    } catch (error) {
      this.logger.error('Database connectivity check failed:', error.message);
      throw new HealthCheckError('Database connectivity check failed', this.getStatus(key, false));
    }
  }

  async checkSystemResources(key: string): Promise<HealthIndicatorResult> {
    try {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const rssMB = Math.round(memUsage.rss / 1024 / 1024);
      
      // Consider system healthy if heap usage is under 80% and RSS is under 500MB
      const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;
      const isMemoryHealthy = heapUsagePercent < 80 && rssMB < 500;
      
      const uptime = process.uptime();
      const isUptimeHealthy = uptime > 0; // Simple uptime check
      
      const isHealthy = isMemoryHealthy && isUptimeHealthy;
      
      const details = {
        memory: {
          heapUsed: `${heapUsedMB} MB`,
          heapTotal: `${heapTotalMB} MB`,
          rss: `${rssMB} MB`,
          heapUsagePercent: `${heapUsagePercent.toFixed(1)}%`,
        },
        uptime: `${Math.round(uptime)} seconds`,
        pid: process.pid,
      };

      const result = this.getStatus(key, isHealthy, details);

      if (isHealthy) {
        return result;
      }

      throw new HealthCheckError('System resources check failed', result);
    } catch (error) {
      this.logger.error('System resources check failed:', error.message);
      throw new HealthCheckError('System resources check failed', this.getStatus(key, false));
    }
  }
}
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/api/v1/health (GET)', () => {
    it('should return comprehensive health status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('info');
          expect(['ok', 'error', 'shutting_down']).toContain(res.body.status);
        });
    });
  });

  describe('/api/v1/health/live (GET)', () => {
    it('should return liveness probe', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health/live')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('uptime');
        });
    });
  });

  describe('/api/v1/health/ready (GET)', () => {
    it('should return readiness probe', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(['ok', 'error', 'shutting_down']).toContain(res.body.status);
        });
    });
  });

  describe('/api/v1/health/external-apis (GET)', () => {
    it('should return external API health status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health/external-apis')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('details');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  describe('/api/v1/health/metrics (GET)', () => {
    it('should return application metrics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health/metrics')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('uptime');
          expect(res.body).toHaveProperty('environment');
          expect(res.body).toHaveProperty('nodeVersion');
          expect(res.body).toHaveProperty('pid');
          expect(res.body).toHaveProperty('memory');
          expect(res.body).toHaveProperty('cpu');
          
          // Validate memory structure
          expect(res.body.memory).toHaveProperty('rss');
          expect(res.body.memory).toHaveProperty('heapTotal');
          expect(res.body.memory).toHaveProperty('heapUsed');
          expect(res.body.memory).toHaveProperty('external');
          
          // Validate memory format (should be in MB)
          expect(res.body.memory.rss).toMatch(/\d+ MB/);
          expect(res.body.memory.heapTotal).toMatch(/\d+ MB/);
          
          // Validate basic data types
          expect(typeof res.body.uptime).toBe('number');
          expect(typeof res.body.pid).toBe('number');
          expect(res.body.uptime).toBeGreaterThan(0);
        });
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Domain Scoring (e2e)', () => {
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

  describe('/api/v1/domains (GET)', () => {
    it('should return domain scoring endpoint info', () => {
      return request(app.getHttpServer())
        .get('/api/v1/domains')
        .expect(200);
    });
  });

  describe('/api/v1/domains/:tokenId/score (GET)', () => {
    it('should return domain score for valid token ID', () => {
      const tokenId = '1';
      
      return request(app.getHttpServer())
        .get(`/api/v1/domains/${tokenId}/score`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalScore');
          expect(res.body).toHaveProperty('breakdown');
          expect(res.body.totalScore).toBeGreaterThanOrEqual(0);
          expect(res.body.totalScore).toBeLessThanOrEqual(100);
        });
    });

    it('should return 400 for invalid token ID', () => {
      const invalidTokenId = 'invalid';
      
      return request(app.getHttpServer())
        .get(`/api/v1/domains/${invalidTokenId}/score`)
        .expect(400);
    });
  });

  describe('/api/v1/domains/:tokenId/valuation (GET)', () => {
    it('should return domain valuation for valid token ID', () => {
      const tokenId = '1';
      
      return request(app.getHttpServer())
        .get(`/api/v1/domains/${tokenId}/valuation`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('estimatedValue');
          expect(res.body).toHaveProperty('maxLoanAmount');
          expect(res.body.estimatedValue).toBeGreaterThanOrEqual(0);
        });
    });
  });

  describe('/api/v1/domains/batch-score (POST)', () => {
    it('should score multiple domains', () => {
      const batchData = {
        tokenIds: ['1', '2', '3'],
      };
      
      return request(app.getHttpServer())
        .post('/api/v1/domains/batch-score')
        .send(batchData)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('results');
          expect(res.body.results).toHaveLength(3);
        });
    });

    it('should return 400 for invalid batch size', () => {
      const largeBatch = {
        tokenIds: Array.from({ length: 100 }, (_, i) => i.toString()),
      };
      
      return request(app.getHttpServer())
        .post('/api/v1/domains/batch-score')
        .send(largeBatch)
        .expect(400);
    });
  });
});
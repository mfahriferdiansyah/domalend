import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Blockchain (e2e)', () => {
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

  describe('/api/v1/blockchain/network-info (GET)', () => {
    it('should return network information', () => {
      return request(app.getHttpServer())
        .get('/api/v1/blockchain/network-info')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('chainId');
          expect(res.body).toHaveProperty('blockNumber');
          expect(res.body).toHaveProperty('gasPrice');
        });
    });
  });

  describe('/api/v1/blockchain/domain/:tokenId/score (GET)', () => {
    it('should return domain score from blockchain', () => {
      const tokenId = '1';
      
      return request(app.getHttpServer())
        .get(`/api/v1/blockchain/domain/${tokenId}/score`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalScore');
          expect(res.body).toHaveProperty('isValid');
        });
    });
  });

  describe('/api/v1/blockchain/wallet/info (GET)', () => {
    it('should return wallet information', () => {
      return request(app.getHttpServer())
        .get('/api/v1/blockchain/wallet/info')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('address');
          expect(res.body).toHaveProperty('balance');
          expect(res.body).toHaveProperty('nonce');
        });
    });
  });

  describe('/api/v1/blockchain/gas-price (GET)', () => {
    it('should return current gas price', () => {
      return request(app.getHttpServer())
        .get('/api/v1/blockchain/gas-price')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('gasPrice');
          expect(res.body.gasPrice).toMatch(/\d+(\.\d+)? gwei/);
        });
    });
  });

  describe('/api/v1/blockchain/transaction/:hash (GET)', () => {
    it('should handle non-existent transaction', () => {
      const fakeHash = '0x' + '0'.repeat(64);
      
      return request(app.getHttpServer())
        .get(`/api/v1/blockchain/transaction/${fakeHash}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('error');
        });
    });
  });

  describe('/api/v1/blockchain/wallet/validate-address (POST)', () => {
    it('should validate correct Ethereum address', () => {
      const validAddress = '0x742d35Cc69f6c2c1Bc2C0c0Ba19B5f3a87bB7d9C';
      
      return request(app.getHttpServer())
        .post('/api/v1/blockchain/wallet/validate-address')
        .send({ address: validAddress })
        .expect(200)
        .expect((res) => {
          expect(res.body.isValid).toBe(true);
        });
    });

    it('should reject invalid address', () => {
      const invalidAddress = 'not-an-address';
      
      return request(app.getHttpServer())
        .post('/api/v1/blockchain/wallet/validate-address')
        .send({ address: invalidAddress })
        .expect(200)
        .expect((res) => {
          expect(res.body.isValid).toBe(false);
        });
    });
  });
});
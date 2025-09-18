import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { DomainScoringService } from './domain-scoring.service';
import { DomainMetadataService } from './domain-metadata.service';
import { DomainAnalysisService } from './domain-analysis.service';
import { KeywordAnalysisService } from '../../external-api/services/keyword-analysis.service';
import { TrafficAnalysisService } from '../../external-api/services/traffic-analysis.service';
import { SmartContractService } from '../../blockchain/services/smart-contract.service';
import { DomainScore } from '../entities/domain-score.entity';
import { ScoringHistory } from '../entities/scoring-history.entity';

describe('DomainScoringService', () => {
  let service: DomainScoringService;
  let domainScoreRepository: Repository<DomainScore>;
  let scoringHistoryRepository: Repository<ScoringHistory>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
  };

  const mockDomainMetadataService = {
    getDomainMetadata: jest.fn(),
    getTransactionHistory: jest.fn(),
  };

  const mockDomainAnalysisService = {
    calculateAgeScore: jest.fn(),
    calculateLengthScore: jest.fn(),
    calculateExtensionScore: jest.fn(),
    calculateDomaScore: jest.fn(),
  };

  const mockKeywordAnalysisService = {
    analyzeKeywords: jest.fn(),
  };

  const mockTrafficAnalysisService = {
    getTrafficMetrics: jest.fn(),
  };

  const mockSmartContractService = {
    updateDomainScore: jest.fn(),
    getDomainScore: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DomainScoringService,
        {
          provide: getRepositoryToken(DomainScore),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ScoringHistory),
          useValue: mockRepository,
        },
        {
          provide: DomainMetadataService,
          useValue: mockDomainMetadataService,
        },
        {
          provide: DomainAnalysisService,
          useValue: mockDomainAnalysisService,
        },
        {
          provide: KeywordAnalysisService,
          useValue: mockKeywordAnalysisService,
        },
        {
          provide: TrafficAnalysisService,
          useValue: mockTrafficAnalysisService,
        },
        {
          provide: SmartContractService,
          useValue: mockSmartContractService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DomainScoringService>(DomainScoringService);
    domainScoreRepository = module.get<Repository<DomainScore>>(
      getRepositoryToken(DomainScore),
    );
    scoringHistoryRepository = module.get<Repository<ScoringHistory>>(
      getRepositoryToken(ScoringHistory),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDetailedScore', () => {
    it('should calculate detailed score for a domain', async () => {
      const tokenId = 1;
      
      // Mock domain metadata
      mockDomainMetadataService.getDomainMetadata.mockResolvedValue({
        name: 'example.com',
        tokenId: 1,
        registrationDate: '2020-01-01T00:00:00Z',
        expirationDate: '2025-01-01T00:00:00Z',
        owner: '0x123...',
      });

      // Mock analysis results
      mockDomainAnalysisService.calculateAgeScore.mockReturnValue(15);
      mockDomainAnalysisService.calculateLengthScore.mockReturnValue(8);
      mockDomainAnalysisService.calculateExtensionScore.mockReturnValue(15);
      mockDomainAnalysisService.calculateDomaScore.mockReturnValue(5);

      mockKeywordAnalysisService.analyzeKeywords.mockResolvedValue({
        brandabilityScore: 80,
        memorabilityScore: 75,
        pronunciationScore: 85,
        typabilityScore: 90,
        containsCommonWords: true,
        containsNumbers: false,
        containsHyphens: false,
        suggestedCategories: ['Technology'],
      });

      mockTrafficAnalysisService.getTrafficMetrics.mockResolvedValue({
        monthlyVisitors: 10000,
        domainRating: 45,
        organicTraffic: 7000,
        backlinks: 150,
        referringDomains: 25,
        confidenceScore: 75,
        dataSource: 'heuristic',
      });

      const result = await service.calculateDetailedScore(tokenId);

      expect(result).toBeDefined();
      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
      expect(result).toHaveProperty('ageScore');
      expect(result).toHaveProperty('lengthScore');
      expect(result).toHaveProperty('extensionScore');
      expect(result).toHaveProperty('keywordScore');
      expect(result).toHaveProperty('trafficScore');
      expect(result).toHaveProperty('marketScore');
      expect(result).toHaveProperty('domaScore');
    });

    it('should handle domain not found', async () => {
      const tokenId = 999;
      
      mockDomainMetadataService.getDomainMetadata.mockResolvedValue(null);

      await expect(service.calculateDetailedScore(tokenId)).rejects.toThrow();
    });
  });

  describe('getDomainScore', () => {
    it('should return cached score if valid', async () => {
      const tokenId = 1;
      const cachedScore = {
        tokenId: 1,
        totalScore: 85,
        ageScore: 15,
        lengthScore: 8,
        extensionScore: 15,
        keywordScore: 20,
        trafficScore: 18,
        marketScore: 4,
        domaScore: 5,
        confidenceScore: 80,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(cachedScore);

      const result = await service.getDomainScore(tokenId);

      expect(result).toEqual(cachedScore);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { tokenId },
      });
    });

    it('should calculate new score if cache is stale', async () => {
      const tokenId = 1;
      const staleScore = {
        tokenId: 1,
        totalScore: 85,
        lastUpdated: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
      };

      mockRepository.findOne.mockResolvedValue(staleScore);
      
      // Mock all the dependencies for calculateDetailedScore
      mockDomainMetadataService.getDomainMetadata.mockResolvedValue({
        name: 'example.com',
        tokenId: 1,
        registrationDate: '2020-01-01T00:00:00Z',
        expirationDate: '2025-01-01T00:00:00Z',
        owner: '0x123...',
      });

      mockDomainAnalysisService.calculateAgeScore.mockReturnValue(15);
      mockDomainAnalysisService.calculateLengthScore.mockReturnValue(8);
      mockDomainAnalysisService.calculateExtensionScore.mockReturnValue(15);
      mockDomainAnalysisService.calculateDomaScore.mockReturnValue(5);

      mockKeywordAnalysisService.analyzeKeywords.mockResolvedValue({
        brandabilityScore: 80,
        memorabilityScore: 75,
        pronunciationScore: 85,
        typabilityScore: 90,
        containsCommonWords: true,
        containsNumbers: false,
        containsHyphens: false,
        suggestedCategories: ['Technology'],
      });

      mockTrafficAnalysisService.getTrafficMetrics.mockResolvedValue({
        monthlyVisitors: 10000,
        domainRating: 45,
        organicTraffic: 7000,
        backlinks: 150,
        referringDomains: 25,
        confidenceScore: 75,
        dataSource: 'heuristic',
      });

      mockRepository.save.mockResolvedValue({});
      mockRepository.create.mockReturnValue({});

      const result = await service.getDomainScore(tokenId);

      expect(result).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('batchScore', () => {
    it('should score multiple domains', async () => {
      const tokenIds = [1, 2, 3];
      
      // Mock existing scores
      mockRepository.find.mockResolvedValue([
        {
          tokenId: 1,
          totalScore: 85,
          lastUpdated: new Date(),
        },
      ]);

      // Mock domain metadata for missing scores
      mockDomainMetadataService.getDomainMetadata
        .mockResolvedValueOnce(null) // tokenId 2 not found
        .mockResolvedValueOnce({ // tokenId 3
          name: 'test.com',
          tokenId: 3,
          registrationDate: '2021-01-01T00:00:00Z',
          expirationDate: '2025-01-01T00:00:00Z',
          owner: '0x456...',
        });

      // Mock analysis for tokenId 3
      mockDomainAnalysisService.calculateAgeScore.mockReturnValue(10);
      mockDomainAnalysisService.calculateLengthScore.mockReturnValue(10);
      mockDomainAnalysisService.calculateExtensionScore.mockReturnValue(15);
      mockDomainAnalysisService.calculateDomaScore.mockReturnValue(5);

      mockKeywordAnalysisService.analyzeKeywords.mockResolvedValue({
        brandabilityScore: 70,
        memorabilityScore: 75,
        pronunciationScore: 80,
        typabilityScore: 85,
        containsCommonWords: false,
        containsNumbers: false,
        containsHyphens: false,
        suggestedCategories: ['Generic'],
      });

      mockTrafficAnalysisService.getTrafficMetrics.mockResolvedValue({
        monthlyVisitors: 5000,
        domainRating: 30,
        organicTraffic: 3500,
        backlinks: 50,
        referringDomains: 10,
        confidenceScore: 60,
        dataSource: 'heuristic',
      });

      mockRepository.save.mockResolvedValue({});
      mockRepository.create.mockReturnValue({});

      const results = await service.batchScore(tokenIds);

      expect(results).toHaveLength(3);
      expect(results[0]).toHaveProperty('success', true);
      expect(results[1]).toHaveProperty('success', false);
      expect(results[2]).toHaveProperty('success', true);
    });
  });

});
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HybridScoringService } from './hybrid-scoring.service';
import { OpenAIDomainAnalyzerService } from '../../external-api/services/openai-domain-analyzer.service';
import { TrafficAnalysisService } from '../../external-api/services/traffic-analysis.service';
import { KeywordAnalysisService } from '../../external-api/services/keyword-analysis.service';
import { FreeEnhancementService } from '../../external-api/services/free-enhancement.service';

describe('Standardized Domain Scoring System', () => {
  let service: HybridScoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HybridScoringService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: OpenAIDomainAnalyzerService,
          useValue: { analyzeWithOpenAI: jest.fn() },
        },
        {
          provide: TrafficAnalysisService,
          useValue: { getTrafficMetrics: jest.fn() },
        },
        {
          provide: KeywordAnalysisService,
          useValue: { analyzeKeywords: jest.fn() },
        },
        {
          provide: FreeEnhancementService,
          useValue: { getFreeEnhancements: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<HybridScoringService>(HybridScoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Brand Legitimacy Scoring Tests', () => {
    it('should score cocacola.com higher than cocacola.xyz', async () => {
      const cocacolaComScore = await service.generateStandardizedScore('cocacola.com');
      const cocacolaXyzScore = await service.generateStandardizedScore('cocacola.xyz');

      expect(cocacolaComScore.totalScore).toBeGreaterThan(cocacolaXyzScore.totalScore);
      expect(cocacolaComScore.brandScore.brandLegitimacyScore).toBeGreaterThan(
        cocacolaXyzScore.brandScore.brandLegitimacyScore
      );
    });

    it('should correctly identify official brands vs variations', async () => {
      const results = await Promise.all([
        service.generateStandardizedScore('cocacola.com'),
        service.generateStandardizedScore('cocacola.xyz'),
        service.generateStandardizedScore('randomdomain123.com'),
      ]);

      const [official, variation, unknown] = results;

      // Official brand should have highest legitimacy
      expect(official.brandAnalysis.isOfficialBrand).toBe(true);
      expect(official.brandAnalysis.brandVariationType).toBe('official');
      expect(official.brandScore.brandLegitimacyScore).toBeGreaterThanOrEqual(12);

      // Brand variation should have moderate legitimacy  
      expect(variation.brandAnalysis.isOfficialBrand).toBe(false);
      expect(variation.brandAnalysis.brandVariationType).toBe('variation');
      expect(variation.brandScore.brandLegitimacyScore).toBeGreaterThan(unknown.brandScore.brandLegitimacyScore);

      // Unknown domain should have low legitimacy
      expect(unknown.brandAnalysis.isOfficialBrand).toBe(false);
      expect(unknown.brandAnalysis.brandVariationType).toBe('unrelated');
      expect(unknown.brandScore.brandLegitimacyScore).toBeLessThanOrEqual(3);
    });

    it('should provide appropriate lending recommendations based on legitimacy', async () => {
      const officialResult = await service.generateStandardizedScore('apple.com');
      const variationResult = await service.generateStandardizedScore('apple.xyz');
      const unknownResult = await service.generateStandardizedScore('randomname.com');

      // Official brands should get better lending terms
      expect(officialResult.lendingRecommendation.recommendedLTV)
        .toBeGreaterThan(variationResult.lendingRecommendation.recommendedLTV);
      
      expect(variationResult.lendingRecommendation.recommendedLTV)
        .toBeGreaterThan(unknownResult.lendingRecommendation.recommendedLTV);

      // Interest rate modifiers should reflect risk
      expect(officialResult.lendingRecommendation.interestRateModifier)
        .toBeLessThan(unknownResult.lendingRecommendation.interestRateModifier);
    });
  });

  describe('Standardized Scoring Validation', () => {
    it('should maintain 100-point total scale', async () => {
      const domains = ['google.com', 'test123.xyz', 'random-long-domain-name.info'];
      
      for (const domain of domains) {
        const result = await service.generateStandardizedScore(domain);
        
        expect(result.totalScore).toBeGreaterThanOrEqual(0);
        expect(result.totalScore).toBeLessThanOrEqual(100);
        
        // Component scores should sum to total (within rounding tolerance)
        const componentSum = result.technicalScore.subtotal + 
                           result.brandScore.subtotal + 
                           result.marketScore.subtotal + 
                           result.qualityScore.subtotal;
        
        expect(Math.abs(result.totalScore - componentSum)).toBeLessThanOrEqual(1);
      }
    });

    it('should respect component score limits', async () => {
      const result = await service.generateStandardizedScore('example.com');

      // Technical scores (40 max)
      expect(result.technicalScore.domainAgeScore).toBeLessThanOrEqual(12);
      expect(result.technicalScore.lengthScore).toBeLessThanOrEqual(8);
      expect(result.technicalScore.tldScore).toBeLessThanOrEqual(10);
      expect(result.technicalScore.dnsHealthScore).toBeLessThanOrEqual(10);
      expect(result.technicalScore.subtotal).toBeLessThanOrEqual(40);

      // Brand scores (35 max)
      expect(result.brandScore.brandLegitimacyScore).toBeLessThanOrEqual(15);
      expect(result.brandScore.brandRecognitionScore).toBeLessThanOrEqual(10);
      expect(result.brandScore.brandabilityScore).toBeLessThanOrEqual(10);
      expect(result.brandScore.subtotal).toBeLessThanOrEqual(35);

      // Market scores (15 max)
      expect(result.marketScore.trafficScore).toBeLessThanOrEqual(10);
      expect(result.marketScore.marketTrendsScore).toBeLessThanOrEqual(5);
      expect(result.marketScore.subtotal).toBeLessThanOrEqual(15);

      // Quality scores (10 max)
      expect(result.qualityScore.confidenceBonus).toBeLessThanOrEqual(5);
      expect(result.qualityScore.domaRelevance).toBeLessThanOrEqual(5);
      expect(result.qualityScore.subtotal).toBeLessThanOrEqual(10);
    });

    it('should provide consistent data quality metrics', async () => {
      const result = await service.generateStandardizedScore('test.com');

      expect(result.dataQuality.overallDataConfidence).toBeGreaterThanOrEqual(0);
      expect(result.dataQuality.overallDataConfidence).toBeLessThanOrEqual(100);
      expect(result.dataQuality.externalDataSources).toBeGreaterThanOrEqual(0);
      expect(typeof result.dataQuality.aiAnalysisAvailable).toBe('boolean');
      expect(typeof result.dataQuality.technicalDataComplete).toBe('boolean');
    });
  });

  describe('Expected Scoring Ranges', () => {
    it('should score major brands in high range', async () => {
      const majorBrands = ['google.com', 'apple.com', 'microsoft.com'];
      
      for (const domain of majorBrands) {
        const result = await service.generateStandardizedScore(domain);
        
        // Major official brands should score 60+ with current fallback data
        expect(result.totalScore).toBeGreaterThanOrEqual(60);
        expect(result.brandScore.brandLegitimacyScore).toBeGreaterThanOrEqual(12);
        expect(result.lendingRecommendation.collateralQuality).toBe('good');
      }
    });

    it('should score unknown domains conservatively', async () => {
      const unknownDomains = ['random123.com', 'unknown-business.org', 'test-domain.info'];
      
      for (const domain of unknownDomains) {
        const result = await service.generateStandardizedScore(domain);
        
        // Unknown domains should score conservatively
        expect(result.totalScore).toBeLessThan(50);
        expect(result.brandScore.brandLegitimacyScore).toBeLessThanOrEqual(5);
        expect(result.lendingRecommendation.recommendedLTV).toBeLessThan(40);
      }
    });

    it('should provide appropriate risk assessment', async () => {
      const highValueResult = await service.generateStandardizedScore('cocacola.com');
      const lowValueResult = await service.generateStandardizedScore('unknown123.xyz');

      expect(['low', 'medium'].includes(highValueResult.riskLevel)).toBe(true);
      expect(['medium', 'high'].includes(lowValueResult.riskLevel)).toBe(true);
      
      expect(highValueResult.lendingRecommendation.recommendedLTV)
        .toBeGreaterThan(lowValueResult.lendingRecommendation.recommendedLTV);
    });
  });
});
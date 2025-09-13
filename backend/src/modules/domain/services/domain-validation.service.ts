import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DomainValidationService {
  private readonly logger = new Logger(DomainValidationService.name);

  /**
   * Validate if token ID is a valid format
   */
  validateTokenId(tokenId: string): boolean {
    // Token IDs should be numeric strings
    return /^\d+$/.test(tokenId) && tokenId.length > 0;
  }

  /**
   * Validate domain name format
   */
  validateDomainName(domainName: string): boolean {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
    return domainRegex.test(domainName) && domainName.length <= 253;
  }

  /**
   * Check if domain is suitable for lending
   */
  isDomainSuitableForLending(metadata: any): { suitable: boolean; reason?: string } {
    // Check if domain is expired
    if (new Date(metadata.expirationDate) <= new Date()) {
      return { suitable: false, reason: 'Domain is expired' };
    }

    // Check minimum time until expiration (30 days)
    const daysUntilExpiration = Math.floor(
      (new Date(metadata.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilExpiration < 30) {
      return { suitable: false, reason: 'Domain expires within 30 days' };
    }

    // Check if domain has suspicious characteristics
    const sld = metadata.name.split('.')[0];
    if (sld.length < 2) {
      return { suitable: false, reason: 'Domain name too short' };
    }

    if (sld.length > 63) {
      return { suitable: false, reason: 'Domain name too long' };
    }

    return { suitable: true };
  }

  /**
   * Validate score components
   */
  validateScoreBreakdown(score: any): boolean {
    const requiredFields = [
      'totalScore', 'ageScore', 'lengthScore', 'extensionScore',
      'keywordScore', 'trafficScore', 'marketScore', 'domaScore'
    ];

    for (const field of requiredFields) {
      if (typeof score[field] !== 'number' || score[field] < 0) {
        return false;
      }
    }

    // Check individual score limits
    if (score.ageScore > 20) return false;
    if (score.lengthScore > 10) return false;
    if (score.extensionScore > 15) return false;
    if (score.keywordScore > 25) return false;
    if (score.trafficScore > 20) return false;
    if (score.marketScore > 5) return false;
    if (score.domaScore > 5) return false;
    if (score.totalScore > 100) return false;

    return true;
  }

  /**
   * Sanitize domain name input
   */
  sanitizeDomainName(domainName: string): string {
    return domainName.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
  }

  /**
   * Validate batch operation limits
   */
  validateBatchSize(items: any[], maxSize: number = 50): boolean {
    return Array.isArray(items) && items.length > 0 && items.length <= maxSize;
  }
}
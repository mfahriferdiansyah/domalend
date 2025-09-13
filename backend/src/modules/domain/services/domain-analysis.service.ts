import { Injectable, Logger } from '@nestjs/common';
import { DomainMetadata } from './domain-metadata.service';

export interface DomainAnalysisResult {
  basic: {
    length: number;
    tld: string;
    sld: string;
    hasNumbers: boolean;
    hasHyphens: boolean;
    hasSpecialChars: boolean;
  };
  scoring: {
    ageScore: number;
    lengthScore: number;
    extensionScore: number;
    keywordScore: number;
    domaScore: number;
  };
  characteristics: {
    isPremiumLength: boolean;
    isPremiumTLD: boolean;
    isBrandable: boolean;
    isNumeric: boolean;
    isDictionaryWord: boolean;
    hasTrendingKeywords: boolean;
  };
}

@Injectable()
export class DomainAnalysisService {
  private readonly logger = new Logger(DomainAnalysisService.name);

  /**
   * Perform comprehensive domain analysis
   */
  analyzeDomain(domainName: string, metadata?: DomainMetadata): DomainAnalysisResult {
    const basic = this.analyzeBasicStructure(domainName);
    const scoring = this.calculateBasicScoring(domainName, metadata);
    const characteristics = this.analyzeCharacteristics(domainName, basic);

    return {
      basic,
      scoring,
      characteristics,
    };
  }

  /**
   * Calculate age score (0-20 points)
   */
  calculateAgeScore(registrationDate: Date): number {
    const now = new Date();
    const ageInYears = (now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    if (ageInYears >= 20) return 20;
    if (ageInYears >= 15) return 18;
    if (ageInYears >= 10) return 15;
    if (ageInYears >= 5) return 12;
    if (ageInYears >= 2) return 8;
    if (ageInYears >= 1) return 4;
    
    const ageInMonths = ageInYears * 12;
    if (ageInMonths >= 6) return 2;
    if (ageInMonths >= 3) return 1;
    
    return 0;
  }

  /**
   * Calculate length score (0-10 points)
   */
  calculateLengthScore(domainName: string): number {
    const sld = this.extractSLD(domainName);
    const length = sld.length;
    
    if (length <= 3) return 10; // Premium short domains
    if (length <= 6) return 9;  // Very good
    if (length <= 9) return 7;  // Good
    if (length <= 12) return 5; // Average
    if (length <= 15) return 3; // Below average
    return 1; // Long domains
  }

  /**
   * Calculate extension/TLD score (0-15 points)
   */
  calculateExtensionScore(domainName: string): number {
    const tld = this.extractTLD(domainName);
    
    const tldScores: Record<string, number> = {
      // Premium TLDs
      'com': 15,
      
      // High-value TLDs
      'net': 12, 'org': 12, 'io': 12,
      
      // Tech TLDs
      'ai': 10, 'tech': 10, 'dev': 10, 'app': 10,
      
      // Business TLDs
      'biz': 8, 'co': 8, 'me': 8,
      
      // Generic TLDs
      'info': 6, 'name': 6, 'pro': 6,
      
      // New gTLDs
      'xyz': 4, 'online': 4, 'site': 4,
      
      // Country codes (selected)
      'uk': 7, 'de': 7, 'jp': 7, 'ca': 6, 'au': 6,
    };
    
    return tldScores[tld] || 2; // Default for unknown TLDs
  }

  /**
   * Calculate basic keyword score (0-25 points)
   */
  calculateBasicKeywordScore(domainName: string): number {
    const sld = this.extractSLD(domainName);
    
    // Very short domains (premium brandable)
    if (sld.length <= 4) return 20;
    if (sld.length <= 6) return 15;
    
    const basic = this.analyzeBasicStructure(domainName);
    
    // Pure numeric domains
    if (basic.hasNumbers && !this.hasLetters(sld)) return 5;
    
    // Hyphenated domains
    if (basic.hasHyphens) return 6;
    
    // Mixed alphanumeric
    if (basic.hasNumbers && this.hasLetters(sld)) return 8;
    
    // Check for trending keywords
    const trendingBonus = this.calculateTrendingBonus(sld);
    
    // Base score for pure letter domains + trending bonus
    return Math.min(25, 12 + trendingBonus);
  }

  /**
   * Calculate Doma-specific score (0-5 points)
   */
  calculateDomaScore(metadata: DomainMetadata): number {
    let score = 0;
    
    // Tokenization bonus (early adopter)
    if (metadata.tokenizationDate) {
      const tokenizationAge = Date.now() - metadata.tokenizationDate.getTime();
      const monthsSinceTokenization = tokenizationAge / (1000 * 60 * 60 * 24 * 30);
      
      if (monthsSinceTokenization >= 6) score += 2;
      else if (monthsSinceTokenization >= 3) score += 1;
    }
    
    // Trading activity bonus
    if (metadata.transactions.length >= 5) score += 2;
    else if (metadata.transactions.length >= 2) score += 1;
    
    // Price appreciation bonus
    if (metadata.transactions.length >= 2) {
      const latest = parseFloat(metadata.transactions[0].price);
      const earliest = parseFloat(metadata.transactions[metadata.transactions.length - 1].price);
      
      if (latest > earliest * 1.5) score += 1; // 50%+ appreciation
    }
    
    return Math.min(score, 5);
  }

  /**
   * Private helper methods
   */
  private analyzeBasicStructure(domainName: string) {
    const sld = this.extractSLD(domainName);
    const tld = this.extractTLD(domainName);
    
    return {
      length: sld.length,
      tld,
      sld,
      hasNumbers: /\d/.test(sld),
      hasHyphens: /-/.test(sld),
      hasSpecialChars: /[^a-zA-Z0-9-]/.test(sld),
    };
  }

  private calculateBasicScoring(domainName: string, metadata?: DomainMetadata) {
    return {
      ageScore: metadata ? this.calculateAgeScore(metadata.registrationDate) : 0,
      lengthScore: this.calculateLengthScore(domainName),
      extensionScore: this.calculateExtensionScore(domainName),
      keywordScore: this.calculateBasicKeywordScore(domainName),
      domaScore: metadata ? this.calculateDomaScore(metadata) : 0,
    };
  }

  private analyzeCharacteristics(domainName: string, basic: any) {
    const sld = basic.sld;
    
    return {
      isPremiumLength: sld.length <= 4,
      isPremiumTLD: ['com', 'net', 'org', 'io', 'ai'].includes(basic.tld),
      isBrandable: this.isBrandable(sld),
      isNumeric: basic.hasNumbers && !this.hasLetters(sld),
      isDictionaryWord: this.isDictionaryWord(sld),
      hasTrendingKeywords: this.hasTrendingKeywords(sld),
    };
  }

  private extractSLD(domainName: string): string {
    return domainName.split('.')[0].toLowerCase();
  }

  private extractTLD(domainName: string): string {
    return domainName.split('.').pop()?.toLowerCase() || '';
  }

  private hasLetters(str: string): boolean {
    return /[a-zA-Z]/.test(str);
  }

  private calculateTrendingBonus(sld: string): number {
    const trendingKeywords = [
      'ai', 'ml', 'gpt', 'bot', 'tech', 'digital', 'smart', 'auto',
      'crypto', 'defi', 'nft', 'web3', 'dao', 'token', 'chain', 'swap',
      'cloud', 'saas', 'api', 'dev', 'code', 'app', 'mobile', 'social',
      'eco', 'green', 'sustain', 'clean', 'energy', 'solar', 'carbon'
    ];
    
    let bonus = 0;
    for (const keyword of trendingKeywords) {
      if (sld.includes(keyword)) {
        if (['ai', 'gpt', 'crypto', 'nft', 'web3'].includes(keyword)) {
          bonus += 8; // High trend value
        } else if (['tech', 'digital', 'smart', 'app'].includes(keyword)) {
          bonus += 5; // Medium trend value
        } else {
          bonus += 3; // Low trend value
        }
      }
    }
    
    return Math.min(bonus, 13); // Cap the trending bonus
  }

  private isBrandable(sld: string): boolean {
    // Simple brandability heuristics
    if (sld.length < 3 || sld.length > 12) return false;
    if (/\d/.test(sld) || /-/.test(sld)) return false;
    
    // Check vowel-consonant balance
    const vowels = (sld.match(/[aeiou]/g) || []).length;
    const vowelRatio = vowels / sld.length;
    
    return vowelRatio >= 0.2 && vowelRatio <= 0.6;
  }

  private isDictionaryWord(sld: string): boolean {
    // Simple dictionary check - in production, use a real dictionary API
    const commonWords = [
      'app', 'web', 'tech', 'digital', 'online', 'data', 'cloud', 'smart',
      'game', 'play', 'work', 'home', 'shop', 'store', 'buy', 'sell',
      'learn', 'book', 'news', 'blog', 'photo', 'video', 'music', 'art'
    ];
    
    return commonWords.includes(sld);
  }

  private hasTrendingKeywords(sld: string): boolean {
    const trendingKeywords = ['ai', 'crypto', 'nft', 'web3', 'defi', 'dao', 'tech', 'digital'];
    return trendingKeywords.some(keyword => sld.includes(keyword));
  }
}
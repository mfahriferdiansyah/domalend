import { Injectable, Logger } from '@nestjs/common';

export interface KeywordMetrics {
  brandabilityScore: number; // 0-100
  memorabilityScore: number; // 0-100
  pronunciationScore: number; // 0-100
  typabilityScore: number; // 0-100
  containsCommonWords: boolean;
  containsNumbers: boolean;
  containsHyphens: boolean;
  suggestedCategories: string[];
}

@Injectable()
export class KeywordAnalysisService {
  private readonly logger = new Logger(KeywordAnalysisService.name);

  async analyzeKeywords(domain: string): Promise<KeywordMetrics> {
    this.logger.log(`Analyzing keywords for domain: ${domain}`);
    
    const cleanDomain = this.extractSLD(domain);
    
    return {
      brandabilityScore: this.calculateBrandabilityScore(cleanDomain),
      memorabilityScore: this.calculateMemorabilityScore(cleanDomain),
      pronunciationScore: this.calculatePronunciationScore(cleanDomain),
      typabilityScore: this.calculateTypabilityScore(cleanDomain),
      containsCommonWords: this.containsCommonWords(cleanDomain),
      containsNumbers: this.containsNumbers(cleanDomain),
      containsHyphens: this.containsHyphens(cleanDomain),
      suggestedCategories: this.suggestCategories(cleanDomain),
    };
  }

  private extractSLD(domain: string): string {
    return domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('.')[0]
      .toLowerCase();
  }

  private calculateBrandabilityScore(sld: string): number {
    let score = 50; // Base score
    
    // Length factor
    if (sld.length >= 4 && sld.length <= 8) score += 20;
    else if (sld.length >= 3 && sld.length <= 12) score += 10;
    else score -= 10;
    
    // Vowel/consonant ratio
    const vowels = sld.match(/[aeiou]/g)?.length || 0;
    const consonants = sld.length - vowels;
    const ratio = vowels / Math.max(consonants, 1);
    if (ratio >= 0.3 && ratio <= 0.7) score += 15;
    
    // No numbers or hyphens bonus
    if (!/[0-9-]/.test(sld)) score += 15;
    
    return Math.min(100, Math.max(0, score));
  }

  private calculateMemorabilityScore(sld: string): number {
    let score = 50;
    
    // Short domains are more memorable
    if (sld.length <= 6) score += 25;
    else if (sld.length <= 10) score += 10;
    else score -= 15;
    
    // Repeating patterns
    if (this.hasRepeatingPatterns(sld)) score += 15;
    
    // Common word combinations
    if (this.containsCommonWords(sld)) score += 10;
    
    return Math.min(100, Math.max(0, score));
  }

  private calculatePronunciationScore(sld: string): number {
    let score = 70; // Start high
    
    // Consecutive consonants penalty
    const consecutiveConsonants = sld.match(/[bcdfghjklmnpqrstvwxyz]{3,}/g);
    if (consecutiveConsonants) score -= consecutiveConsonants.length * 15;
    
    // Silent letters penalty
    if (sld.includes('gh') || sld.includes('kn') || sld.includes('wr')) score -= 10;
    
    // Easy pronunciation bonus
    if (/^[a-z]*$/.test(sld) && sld.length <= 8) score += 10;
    
    return Math.min(100, Math.max(0, score));
  }

  private calculateTypabilityScore(sld: string): number {
    let score = 80;
    
    // Numbers and symbols penalty
    if (/[0-9]/.test(sld)) score -= 10;
    if (/-/.test(sld)) score -= 15;
    
    // Common keyboard patterns
    const keyboardPatterns = ['qwerty', 'asdf', 'zxcv', '123', 'abc'];
    if (keyboardPatterns.some(pattern => sld.includes(pattern))) score -= 20;
    
    // Length penalty for very long domains
    if (sld.length > 15) score -= (sld.length - 15) * 5;
    
    return Math.min(100, Math.max(0, score));
  }

  private hasRepeatingPatterns(sld: string): boolean {
    // Check for doubled letters
    if (/(.)\1/.test(sld)) return true;
    
    // Check for simple patterns like 'abab'
    for (let i = 0; i < sld.length - 3; i++) {
      if (sld[i] === sld[i + 2] && sld[i + 1] === sld[i + 3]) {
        return true;
      }
    }
    
    return false;
  }

  private containsCommonWords(sld: string): boolean {
    const commonWords = [
      'app', 'web', 'tech', 'digital', 'online', 'data', 'cloud', 'smart',
      'auto', 'home', 'shop', 'buy', 'sell', 'fast', 'easy', 'best',
      'new', 'pro', 'max', 'plus', 'super', 'ultra', 'mega', 'top'
    ];
    
    return commonWords.some(word => sld.includes(word));
  }

  private containsNumbers(sld: string): boolean {
    return /[0-9]/.test(sld);
  }

  private containsHyphens(sld: string): boolean {
    return /-/.test(sld);
  }

  private suggestCategories(sld: string): string[] {
    const categories: string[] = [];
    
    // Tech keywords
    if (/app|web|tech|digital|data|cloud|software|code/.test(sld)) {
      categories.push('Technology');
    }
    
    // Business keywords
    if (/business|corp|company|enterprise|solutions|services/.test(sld)) {
      categories.push('Business');
    }
    
    // E-commerce keywords
    if (/shop|store|buy|sell|market|commerce|retail/.test(sld)) {
      categories.push('E-commerce');
    }
    
    // Finance keywords
    if (/finance|money|bank|invest|crypto|wallet|pay/.test(sld)) {
      categories.push('Finance');
    }
    
    // Health keywords
    if (/health|medical|wellness|fitness|care|doctor/.test(sld)) {
      categories.push('Health');
    }
    
    // Default to generic if no specific category
    if (categories.length === 0) {
      categories.push('Generic');
    }
    
    return categories;
  }
}
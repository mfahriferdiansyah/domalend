import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AIConfigOptions {
  // Output Format Configuration
  outputFormat: 'structured' | 'narrative' | 'technical' | 'investor';
  responseStyle: 'conservative' | 'balanced' | 'optimistic';
  detailLevel: 'summary' | 'standard' | 'comprehensive';
  
  // Scoring Preferences
  scoringBias: {
    favorTechCompanies: boolean;
    favorEstablishedBrands: boolean;
    penalizeNewDomains: boolean;
    web3Bonus: boolean;
  };
  
  // Risk Assessment Style
  riskTolerance: 'strict' | 'moderate' | 'relaxed';
  lendingFocus: 'safety' | 'growth' | 'balanced';
  
  // Custom Prompts
  customSystemPrompt?: string;
  customScoringRules?: string[];
  industrySpecificRules?: Record<string, string>;
}

@Injectable()
export class AIConfigService {
  private currentConfig: AIConfigOptions;

  constructor(private readonly configService: ConfigService) {
    this.currentConfig = this.getDefaultConfig();
  }

  /**
   * Get different AI configuration profiles
   */
  getConfigProfile(profileName: string): AIConfigOptions {
    const profiles = {
      'conservative-lender': {
        outputFormat: 'structured' as const,
        responseStyle: 'conservative' as const,
        detailLevel: 'comprehensive' as const,
        scoringBias: {
          favorTechCompanies: false,
          favorEstablishedBrands: true,
          penalizeNewDomains: true,
          web3Bonus: false,
        },
        riskTolerance: 'strict' as const,
        lendingFocus: 'safety' as const,
      },

      'growth-focused': {
        outputFormat: 'narrative' as const,
        responseStyle: 'optimistic' as const,
        detailLevel: 'standard' as const,
        scoringBias: {
          favorTechCompanies: true,
          favorEstablishedBrands: false,
          penalizeNewDomains: false,
          web3Bonus: true,
        },
        riskTolerance: 'relaxed' as const,
        lendingFocus: 'growth' as const,
      },

      'balanced-institutional': {
        outputFormat: 'investor' as const,
        responseStyle: 'balanced' as const,
        detailLevel: 'comprehensive' as const,
        scoringBias: {
          favorTechCompanies: true,
          favorEstablishedBrands: true,
          penalizeNewDomains: false,
          web3Bonus: true,
        },
        riskTolerance: 'moderate' as const,
        lendingFocus: 'balanced' as const,
      },

      'web3-native': {
        outputFormat: 'technical' as const,
        responseStyle: 'optimistic' as const,
        detailLevel: 'standard' as const,
        scoringBias: {
          favorTechCompanies: true,
          favorEstablishedBrands: false,
          penalizeNewDomains: false,
          web3Bonus: true,
        },
        riskTolerance: 'relaxed' as const,
        lendingFocus: 'growth' as const,
        customScoringRules: [
          'Bonus +15 points for DeFi protocols',
          'Bonus +10 points for active DAOs',
          'Bonus +20 points for established crypto exchanges',
          'Penalty -10 points for traditional finance domains'
        ],
        industrySpecificRules: {
          'defi': 'Evaluate total value locked (TVL) and protocol security',
          'nft': 'Consider marketplace volume and community engagement',
          'dao': 'Assess governance token distribution and activity'
        }
      }
    };

    return profiles[profileName] || this.getDefaultConfig();
  }

  /**
   * Generate custom AI prompts based on configuration
   */
  generateCustomPrompt(domain: string, config: AIConfigOptions): string {
    const basePrompt = this.getBasePromptForStyle(config.responseStyle);
    const scoringGuidelines = this.getScoringGuidelinesForConfig(config);
    const outputInstructions = this.getOutputInstructionsForFormat(config.outputFormat);
    const industryRules = this.getIndustrySpecificRules(domain, config);

    return `
${config.customSystemPrompt || basePrompt}

DOMAIN TO ANALYZE: ${domain}

SCORING CONFIGURATION:
${scoringGuidelines}

OUTPUT REQUIREMENTS:
${outputInstructions}

${industryRules}

${this.getRiskToleranceInstructions(config.riskTolerance)}

RESPONSE FORMAT: Must be valid JSON only.
    `.trim();
  }

  /**
   * Set active configuration
   */
  setConfiguration(config: Partial<AIConfigOptions>) {
    this.currentConfig = { ...this.currentConfig, ...config };
  }

  /**
   * Get current configuration
   */
  getCurrentConfig(): AIConfigOptions {
    return this.currentConfig;
  }

  private getDefaultConfig(): AIConfigOptions {
    return {
      outputFormat: 'structured',
      responseStyle: 'balanced',
      detailLevel: 'standard',
      scoringBias: {
        favorTechCompanies: true,
        favorEstablishedBrands: true,
        penalizeNewDomains: false,
        web3Bonus: true,
      },
      riskTolerance: 'moderate',
      lendingFocus: 'balanced',
    };
  }

  private getBasePromptForStyle(style: string): string {
    const prompts = {
      conservative: 'You are a conservative risk assessment analyst. Prioritize capital preservation and established businesses. Be skeptical of new technologies and unproven business models.',
      
      balanced: 'You are a balanced financial analyst. Consider both growth potential and risk factors equally. Provide fair assessments based on factual business intelligence.',
      
      optimistic: 'You are a growth-focused investment analyst. Look for potential in innovative companies and emerging technologies while maintaining reasonable risk assessment.'
    };

    return prompts[style] || prompts.balanced;
  }

  private getScoringGuidelinesForConfig(config: AIConfigOptions): string {
    let guidelines = [];

    if (config.scoringBias.favorTechCompanies) {
      guidelines.push('- Give +10-15 bonus points to technology companies');
    }

    if (config.scoringBias.favorEstablishedBrands) {
      guidelines.push('- Give +20-25 bonus points to brands established 10+ years');
    }

    if (config.scoringBias.penalizeNewDomains) {
      guidelines.push('- Apply -15-20 penalty to domains under 2 years old');
    }

    if (config.scoringBias.web3Bonus) {
      guidelines.push('- Give +10-20 bonus for Web3, DeFi, or crypto-related domains');
    }

    return guidelines.length > 0 ? guidelines.join('\n') : '- Apply standard scoring methodology';
  }

  private getOutputInstructionsForFormat(format: string): string {
    const instructions = {
      structured: 'Provide clear numerical scores with brief explanations. Focus on factual data.',
      
      narrative: 'Provide detailed explanations for each score. Include market context and business rationale.',
      
      technical: 'Include technical metrics, code quality assessments, and platform-specific factors.',
      
      investor: 'Focus on ROI potential, market opportunity, competitive positioning, and financial projections.'
    };

    return instructions[format] || instructions.structured;
  }

  private getIndustrySpecificRules(domain: string, config: AIConfigOptions): string {
    if (!config.industrySpecificRules) return '';

    const sld = domain.split('.')[0].toLowerCase();
    const applicableRules = [];

    for (const [keyword, rule] of Object.entries(config.industrySpecificRules)) {
      if (sld.includes(keyword)) {
        applicableRules.push(`- ${rule}`);
      }
    }

    if (applicableRules.length > 0) {
      return `\nINDUSTRY-SPECIFIC CONSIDERATIONS:\n${applicableRules.join('\n')}`;
    }

    return '';
  }

  private getRiskToleranceInstructions(tolerance: string): string {
    const instructions = {
      strict: 'Be very conservative with scores. Require strong evidence for high scores. Default to lower risk ratings.',
      
      moderate: 'Balance risk and opportunity. Provide fair scores based on available evidence.',
      
      relaxed: 'Be more generous with scoring for innovative companies. Focus on growth potential alongside risk.'
    };

    return `RISK TOLERANCE: ${instructions[tolerance]}`;
  }
}
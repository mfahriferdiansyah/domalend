import { Injectable } from '@nestjs/common';

export interface ScoreBreakdown {
  ageScore: number;
  lengthScore: number;
  extensionScore: number;
  keywordScore: number;
  trafficScore: number;
  marketScore: number;
  domaScore: number;
}

export interface DomainValuation {
  tokenId: string;
  domainName: string;
  estimatedValue: number;
  confidence: number;
  scoreBreakdown: ScoreBreakdown;
  timestamp: Date;
}

@Injectable()
export class DomainScoringService {
  
  calculateTotalScore(scoreBreakdown: ScoreBreakdown): number {
    return Math.round(
      scoreBreakdown.ageScore + 
      scoreBreakdown.lengthScore + 
      scoreBreakdown.extensionScore + 
      scoreBreakdown.keywordScore + 
      scoreBreakdown.trafficScore + 
      scoreBreakdown.marketScore + 
      scoreBreakdown.domaScore
    );
  }

  createValuation(
    tokenId: string,
    domainName: string,
    scoreBreakdown: ScoreBreakdown,
    estimatedValue: number,
    confidence: number
  ): DomainValuation {
    return {
      tokenId,
      domainName,
      estimatedValue,
      confidence,
      scoreBreakdown,
      timestamp: new Date()
    };
  }
}
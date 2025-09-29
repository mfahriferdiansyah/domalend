// Legacy wrapper for the new standardized API hooks
// This file provides backward compatibility for existing components

import { useDomains, useSearchDomains as useSearchDomainsApi, useDomain } from '@/hooks/useDomaLendApi';

export interface DomainAnalytics {
  domainTokenId: string;
  domainName: string;
  latestAiScore: number;
  totalScoringRequests: number;
  totalLoansCreated: number;
  totalLoanVolume: string;
  hasBeenLiquidated: boolean;
  firstScoreTimestamp: string;
  lastActivityTimestamp: string;
}

export interface DomainWithRelations {
  domainTokenId: string;
  domainName: string;
  latestAiScore: number;
  totalScoringRequests: number;
  totalLoansCreated: number;
  totalLoanVolume: string;
  hasBeenLiquidated: boolean;
  firstScoreTimestamp: string;
  lastActivityTimestamp: string;
  loans?: LoanEvent[];
  scoringHistory?: ScoringEvent[];
  auctions?: AuctionEvent[];
}

export interface AuctionEvent {
  auctionId: string;
  loanId: string;
  domainTokenId: string;
  domainName: string | null;
  borrowerAddress: string | null;
  bidderAddress: string;
  startingPrice: string | null;
  currentPrice: string | null;
  finalPrice: string;
  recoveryRate: number;
  eventType: string;
  eventTimestamp: string;
}

export interface ScoringEvent {
  id: string;
  domainTokenId: string;
  domainName: string;
  requesterAddress: string;
  aiScore: number;
  confidence: number;
  reasoning: string;
  requestTimestamp: string;
  status: string;
}

export interface LoanEvent {
  loanId: string;
  borrowerAddress: string;
  domainTokenId: string;
  domainName: string;
  loanAmount: string;
  aiScore: number | null;
  interestRate: number | null;
  eventType: string;
  eventTimestamp: string;
  repaymentDeadline: string | null;
  liquidationAttempted: boolean;
  liquidationTimestamp: string | null;
}

// Wrapper for backward compatibility
export const useDomainAnalytics = () => {
  const { data, loading, error, refresh } = useDomains({ limit: 100, page: 1 });
  
  return { 
    data: data || [], 
    loading, 
    error, 
    refetch: refresh 
  };
};

export const useSearchDomains = (searchTerm: string) => {
  const { data, loading, error } = useSearchDomainsApi(searchTerm, { limit: 50, page: 1 });
  
  return { 
    data: data?.domains || [], 
    loading, 
    error 
  };
};

export const useDomainById = (domainTokenId: string | null) => {
  const { data, loading, error } = useDomain(domainTokenId || undefined, true);
  
  return { 
    data: data?.domain || null, 
    loading, 
    error 
  };
};
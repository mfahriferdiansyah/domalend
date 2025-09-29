import { useState, useEffect } from 'react';
import { domaLendAPI } from '@/services/domalend-api';

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

export const useDomainAnalytics = () => {
  const [data, setData] = useState<DomainAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await domaLendAPI.getDomains({
        limit: 100,
        page: 1
      });
      setData(response.domains || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch domain analytics');
      console.error('Error fetching domain analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
};


export const useSearchDomains = (searchTerm: string) => {
  const [data, setData] = useState<DomainAnalytics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setData([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await domaLendAPI.searchDomains(searchTerm, {
          limit: 50,
          page: 1
        });
        setData(response.domains || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search domains');
        console.error('Error searching domains:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchData, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  return { data, loading, error };
};

export const useDomainById = (domainTokenId: string | null) => {
  const [data, setData] = useState<DomainWithRelations | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!domainTokenId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await domaLendAPI.getDomainById(domainTokenId, true);
        setData(response.domain);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch domain details');
        console.error('Error fetching domain details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [domainTokenId]);

  return { data, loading, error };
};
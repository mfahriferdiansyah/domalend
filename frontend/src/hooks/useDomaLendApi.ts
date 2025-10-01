import { useCallback } from 'react';
import { domaLendAPI } from '@/services/domalend-api';
import { useApi, usePaginatedApi, useApiMutation } from './useApi';
import type { 
  Auction, 
  AuctionDetail, 
  DomainMetadata, 
  ScoreBreakdown, 
  DomainValuation,
  LiquidityPool 
} from '@/services/domalend-api';

// Dashboard hooks
export function useDashboard(address: string | undefined) {
  const apiCall = useCallback(async () => {
    if (!address) throw new Error('Address is required');
    return domaLendAPI.getUserDashboard(address);
  }, [address]);

  return useApi(apiCall, { immediate: !!address });
}

// Auction hooks
export function useAuctions(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  status?: 'active' | 'ended' | 'cancelled';
}) {
  const apiCall = useCallback(async ({ page, limit }: { page: number; limit: number }) => {
    const response = await domaLendAPI.getAuctions({
      page,
      limit,
      sortBy: 'auctionStartedAt',
      order: 'desc',
      ...params,
    });
    return {
      data: response.auctions,
      total: response.total,
      page: response.page,
      limit: response.limit,
    };
  }, [params]);

  return usePaginatedApi(apiCall);
}

export function useAuction(auctionId: string | undefined) {
  const apiCall = useCallback(async () => {
    if (!auctionId) throw new Error('Auction ID is required');
    const response = await domaLendAPI.getAuction(auctionId);
    return response.auction;
  }, [auctionId]);

  return useApi(apiCall, { immediate: !!auctionId });
}

export function usePlaceBid() {
  const mutationFn = useCallback(async (params: { auctionId: string; amount: number }) => {
    return domaLendAPI.placeBid(params.auctionId, params.amount);
  }, []);

  return useApiMutation(mutationFn);
}

export function useUserRelatedAuctions(address: string | undefined) {
  const apiCall = useCallback(async () => {
    if (!address) throw new Error('Address is required');
    return domaLendAPI.getUserRelatedAuctions(address);
  }, [address]);

  return useApi(apiCall, { immediate: !!address });
}

// Pool hooks
export function usePools(params?: {
  page?: number;
  limit?: number;
  minAiScore?: number;
  status?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}) {
  const apiCall = useCallback(async ({ page, limit }: { page: number; limit: number }) => {
    const response = await domaLendAPI.getPools({
      page,
      limit,
      minAiScore: 50,
      status: 'active',
      sortBy: 'createdAt',
      order: 'desc',
      ...params,
    });
    return {
      data: response.pools,
      total: response.total,
      page: response.page,
      limit: response.limit,
    };
  }, [params]);

  return usePaginatedApi(apiCall);
}

export function useUserPools(userAddress: string | undefined) {
  const apiCall = useCallback(async () => {
    if (!userAddress) throw new Error('User address is required');
    return domaLendAPI.getUserPools(userAddress);
  }, [userAddress]);

  return useApi(apiCall, { immediate: !!userAddress });
}

export function usePool(poolId: string | undefined, includeLoans = true, includeHistory = false) {
  const apiCall = useCallback(async () => {
    if (!poolId) throw new Error('Pool ID is required');
    return domaLendAPI.getPoolById(poolId, includeLoans, includeHistory);
  }, [poolId, includeLoans, includeHistory]);

  return useApi(apiCall, { immediate: !!poolId });
}

export function useCreatePool() {
  const mutationFn = useCallback(async (params: {
    name: string;
    description: string;
    poolType: 'custom' | 'crowdfunded';
    minLoanAmount: number;
    maxLoanAmount: number;
    maxLTV: number;
    minDomainScore: number;
    interestRate: number;
    criteria?: {
      allowedExtensions?: string[];
      maxAge?: number;
      minAge?: number;
      excludeNumbers?: boolean;
      excludeHyphens?: boolean;
    };
  }) => {
    return domaLendAPI.createPool(params);
  }, []);

  return useApiMutation(mutationFn);
}

export function useAddLiquidity() {
  const mutationFn = useCallback(async (params: { poolId: string; amount: number }) => {
    return domaLendAPI.addLiquidity(params.poolId, params.amount);
  }, []);

  return useApiMutation(mutationFn);
}

// Domain hooks
export function useDomains(params?: {
  page?: number;
  limit?: number;
  minAiScore?: number;
  maxAiScore?: number;
  liquidatedOnly?: boolean;
  sortBy?: string;
  order?: 'asc' | 'desc';
}) {
  const apiCall = useCallback(async ({ page, limit }: { page: number; limit: number }) => {
    const response = await domaLendAPI.getDomains({
      page,
      limit,
      minAiScore: 0,
      maxAiScore: 100,
      liquidatedOnly: false,
      ...params,
    });
    return {
      data: response.domains,
      total: response.total,
      page: response.page,
      limit: response.limit,
    };
  }, [params]);

  return usePaginatedApi(apiCall);
}

export function useSearchDomains(searchTerm: string, params?: {
  page?: number;
  limit?: number;
  minAiScore?: number;
  maxAiScore?: number;
}) {
  const apiCall = useCallback(async () => {
    if (!searchTerm || searchTerm.length < 2) return { domains: [], total: 0, page: 1, limit: 50 };
    return domaLendAPI.searchDomains(searchTerm, {
      page: 1,
      limit: 50,
      ...params,
    });
  }, [searchTerm, params]);

  return useApi(apiCall, { immediate: searchTerm.length >= 2 });
}

export function useDomain(domainTokenId: string | undefined, includeRelations = true) {
  const apiCall = useCallback(async () => {
    if (!domainTokenId) throw new Error('Domain token ID is required');
    return domaLendAPI.getDomainById(domainTokenId, includeRelations);
  }, [domainTokenId, includeRelations]);

  return useApi(apiCall, { immediate: !!domainTokenId });
}

export function useDomainMetadata(tokenId: string | undefined) {
  const apiCall = useCallback(async () => {
    if (!tokenId) throw new Error('Token ID is required');
    return domaLendAPI.getDomainMetadata(tokenId);
  }, [tokenId]);

  return useApi(apiCall, { immediate: !!tokenId });
}

export function useDomainScore(tokenId: string | undefined, useCache = true) {
  const apiCall = useCallback(async () => {
    if (!tokenId) throw new Error('Token ID is required');
    return domaLendAPI.getDomainScore(tokenId, useCache);
  }, [tokenId, useCache]);

  return useApi(apiCall, { immediate: !!tokenId });
}

export function useDomainValuation(tokenId: string | undefined, useCache = true) {
  const apiCall = useCallback(async () => {
    if (!tokenId) throw new Error('Token ID is required');
    return domaLendAPI.getDomainValuation(tokenId, useCache);
  }, [tokenId, useCache]);

  return useApi(apiCall, { immediate: !!tokenId });
}

// Loan hooks
export function useLoans(address?: string) {
  const apiCall = useCallback(async () => {
    return domaLendAPI.getLoans(address);
  }, [address]);

  return useApi(apiCall);
}

export function useLoan(loanId: string | undefined) {
  const apiCall = useCallback(async () => {
    if (!loanId) throw new Error('Loan ID is required');
    return domaLendAPI.getLoan(loanId);
  }, [loanId]);

  return useApi(apiCall, { immediate: !!loanId });
}

export function useCreateLoanRequest() {
  const mutationFn = useCallback(async (params: {
    domainTokenId: string;
    requestedAmount: number;
    term: number;
    poolId?: string;
  }) => {
    return domaLendAPI.createLoanRequest(params);
  }, []);

  return useApiMutation(mutationFn);
}

export function useRepayLoan() {
  const mutationFn = useCallback(async (params: { loanId: string; amount: number }) => {
    return domaLendAPI.repayLoan(params.loanId, params.amount);
  }, []);

  return useApiMutation(mutationFn);
}

// Market data hooks
export function useMarketStats() {
  const apiCall = useCallback(async () => {
    return domaLendAPI.getMarketStats();
  }, []);

  return useApi(apiCall);
}

// External API hooks
export function useUserDomains(address: string | undefined) {
  const apiCall = useCallback(async () => {
    if (!address) throw new Error('Address is required');
    const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://backend-doma.kadzu.dev';
    const response = await fetch(`${backendApiUrl}/domains/address/${address}`, {
      headers: {
        'accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user domains: ${response.statusText}`);
    }
    
    return response.json();
  }, [address]);

  return useApi(apiCall, { immediate: !!address });
}

export function useUserScoredDomains(address: string | undefined) {
  const apiCall = useCallback(async () => {
    if (!address) throw new Error('Address is required');
    const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://backend-doma.kadzu.dev';
    const response = await fetch(`${backendApiUrl}/domains/user/${address}/scored`, {
      headers: {
        'accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user scored domains: ${response.statusText}`);
    }
    
    return response.json();
  }, [address]);

  return useApi(apiCall, { immediate: !!address });
}
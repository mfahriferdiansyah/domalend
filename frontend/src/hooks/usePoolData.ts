// Legacy wrapper for the new standardized API hooks
// This file provides backward compatibility for existing components

import { usePools, useUserPools as useUserPoolsApi, usePool } from '@/hooks/useDomaLendApi';

export interface PoolData {
  poolId: string;
  poolName: string;
  totalLiquidity: string;
  availableLiquidity: string;
  apy: string;
  minLoanAmount: string;
  maxLoanAmount: string;
  minDuration: string;
  maxDuration: string;
  minAiScore: number;
  loanToValueRatio: string;
  poolType: 'instant' | 'custom' | 'crowdfunded';
  creator: string;
  activeLoans: number;
  totalLoanVolume?: string;
  liquidityProviderCount?: number;
  interestRate?: number;
  status?: string;
  createdAt?: string;
  loans: Array<{
    loanId: string;
    domainTokenId: string;
    domainName: string;
    borrower: string;
    amount: string;
    status: string;
    createdAt: string;
  }>;
}

export interface UserPoolData {
  poolId: string;
  poolName: string;
  contribution: string;
  earnings: string;
  apy: string;
  totalLiquidity: string;
}

// Wrapper for backward compatibility
export const usePoolData = () => {
  const { data, loading, error, refresh } = usePools();
  
  // Transform data to match legacy interface
  const transformedData = (data || []).map(pool => ({
    poolId: pool.poolId || pool.id,
    poolName: pool.poolId || pool.id, // Using poolId as name for now
    totalLiquidity: pool.totalLiquidity || '0',
    availableLiquidity: (parseInt(pool.totalLiquidity || '0') - parseInt(pool.totalLoanVolume || '0')).toString(), // Available = Total - Outstanding loans
    apy: `${(pool.interestRate / 100).toFixed(1)}%`,
    minLoanAmount: pool.minLoanAmount || '0',
    maxLoanAmount: pool.maxLoanAmount || '1000000',
    minDuration: pool.minDuration || '0',
    maxDuration: pool.maxDuration || '0',
    minAiScore: pool.minAiScore || 0,
    loanToValueRatio: '80%', // Default value since this field isn't in the new API
    poolType: (pool.poolType || 'custom') as 'instant' | 'custom' | 'crowdfunded',
    creator: pool.creator,
    activeLoans: pool.activeLoans || 0,
    loans: [] // We could populate this with actual loan data if needed
  }));

  return { 
    data: transformedData, 
    loading, 
    error, 
    refetch: refresh 
  };
};

export const useUserPoolData = (userAddress: string | undefined) => {
  const { data, loading, error, refresh } = useUserPoolsApi(userAddress);
  
  // Transform data to match legacy interface
  const transformedData = (data?.pools || []).map(pool => ({
    poolId: pool.poolId,
    poolName: pool.poolId, // Using poolId as name for now
    contribution: pool.userContribution,
    earnings: '0', // Calculate based on contribution and APY
    apy: `${(pool.interestRate / 100).toFixed(1)}%`,
    totalLiquidity: pool.totalLiquidity
  }));

  return { 
    data: transformedData, 
    loading, 
    error, 
    refetch: refresh 
  };
};

export const usePoolById = (poolId: string | null) => {
  const { data, loading, error, refresh } = usePool(poolId || undefined);
  
  // Transform data to match legacy interface
  const transformedData = data ? {
    poolId: data.pool.poolId,
    poolName: data.pool.poolId, // Using poolId as name for now
    totalLiquidity: data.pool.totalLiquidity,
    availableLiquidity: (parseInt(data.pool.totalLiquidity) - parseInt(data.pool.totalLoanVolume || '0')).toString(),
    apy: `${(data.pool.interestRate / 100).toFixed(1)}`,
    minLoanAmount: data.pool.minLoanAmount || '0',
    maxLoanAmount: data.pool.maxLoanAmount || '0',
    minAiScore: data.pool.minAiScore || 0,
    loanToValueRatio: '80%',
    poolType: (data.pool.poolType || 'custom') as 'instant' | 'custom' | 'crowdfunded',
    creator: data.pool.creator,
    totalLoanVolume: data.pool.totalLoanVolume || '0',
    liquidityProviderCount: data.pool.liquidityProviderCount || 0,
    interestRate: data.pool.interestRate,
    status: data.pool.status,
    createdAt: data.pool.createdAt,
    loans: (data.loans || []).map(loan => ({
      loanId: loan.loanId,
      domainTokenId: loan.domainTokenId,
      domainName: loan.domainName,
      borrower: loan.borrowerAddress,
      amount: loan.loanAmount,
      status: loan.status,
      createdAt: loan.eventTimestamp
    }))
  } : null;

  return { 
    data: transformedData, 
    loading, 
    error, 
    refetch: refresh 
  };
};
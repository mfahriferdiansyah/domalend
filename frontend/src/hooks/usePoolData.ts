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
  loanToValueRatio: string;
  poolType: 'instant' | 'custom' | 'crowdfunded';
  creator: string;
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
    poolId: pool.poolId,
    poolName: pool.poolId, // Using poolId as name for now
    totalLiquidity: pool.totalLiquidity,
    availableLiquidity: pool.totalLiquidity, // Assuming same for now
    apy: `${pool.interestRate}%`,
    minLoanAmount: '0',
    maxLoanAmount: '1000000',
    loanToValueRatio: '80%',
    poolType: (pool.poolType || 'custom') as 'instant' | 'custom' | 'crowdfunded',
    creator: pool.creator,
    loans: []
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
    apy: `${pool.interestRate}%`,
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
    availableLiquidity: data.pool.totalLiquidity,
    apy: `${data.pool.interestRate}%`,
    minLoanAmount: '0',
    maxLoanAmount: '1000000',
    loanToValueRatio: '80%',
    poolType: (data.pool.poolType || 'custom') as 'instant' | 'custom' | 'crowdfunded',
    creator: data.pool.creator,
    loans: (data.loans || []).map(loan => ({
      loanId: loan.loanId,
      domainTokenId: loan.domainTokenId,
      domainName: loan.domainName,
      borrower: loan.borrowerAddress,
      amount: loan.loanAmount,
      status: loan.eventType,
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
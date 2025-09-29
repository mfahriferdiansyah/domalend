import { useState, useEffect } from 'react';
import { domaLendAPI } from '@/services/domalend-api';

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

export const usePoolData = () => {
  const [data, setData] = useState<PoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await domaLendAPI.getPools();
        setData(response.pools || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch pool data');
        console.error('Error fetching pool data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error, refetch: () => fetchData() };
};

export const useUserPoolData = (userAddress: string | undefined) => {
  const [data, setData] = useState<UserPoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await domaLendAPI.getUserPools(userAddress);
        setData(response.pools || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user pool data');
        console.error('Error fetching user pool data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userAddress]);

  return { data, loading, error, refetch: () => userAddress && fetchData() };
};

export const usePoolById = (poolId: string | null) => {
  const [data, setData] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!poolId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await domaLendAPI.getPoolById(poolId, true);
        setData(response.pool);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch pool details');
        console.error('Error fetching pool details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [poolId]);

  return { data, loading, error, refetch: () => poolId && fetchData() };
};
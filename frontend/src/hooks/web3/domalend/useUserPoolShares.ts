import { useAccount } from 'wagmi';
import { usePool } from '@/hooks/useDomaLendApi';
import { useMemo } from 'react';

export const useUserPoolShares = (poolId: string) => {
  const { address } = useAccount();
  const { data: poolData, loading, error } = usePool(poolId, true, true); // Include history

  const userLiquidityData = useMemo(() => {
    if (!address || !poolData?.poolHistory || !Array.isArray(poolData.poolHistory)) {
      return {
        totalAdded: 0,
        totalRemoved: 0,
        currentLiquidity: 0,
        interestEarned: 0,
      };
    }

    let totalAdded = 0;
    let totalRemoved = 0;
    let interestEarned = 0;

    // Filter events for the current user
    const userEvents = poolData.poolHistory.filter(
      (event: any) => event.providerAddress?.toLowerCase() === address.toLowerCase()
    );

    // Calculate totals from history
    userEvents.forEach((event: any) => {
      if (event.eventType === 'liquidity_added' && event.liquidityAmount) {
        totalAdded += parseInt(event.liquidityAmount);
      } else if (event.eventType === 'liquidity_removed') {
        if (event.liquidityAmount) {
          totalRemoved += parseInt(event.liquidityAmount);
        }
        // Add any interest earned from removal events
        if (event.interestEarned) {
          interestEarned += parseInt(event.interestEarned);
        }
      }
    });

    const currentLiquidity = totalAdded - totalRemoved;

    return {
      totalAdded,
      totalRemoved,
      currentLiquidity: Math.max(0, currentLiquidity), // Ensure non-negative
      interestEarned,
    };
  }, [address, poolData?.poolHistory]);

  return {
    userLiquidityData,
    isLoading: loading,
    error,
    hasLiquidity: userLiquidityData.currentLiquidity > 0,
  };
};
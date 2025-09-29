import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useCallback } from 'react';
import { parseEther, formatEther, Address } from 'viem';

// Contract ABIs - These would be imported from your ABIs folder
const SATORU_LENDING_ABI = [
  {
    name: 'requestInstantLoan',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'domainTokenId', type: 'uint256' },
      { name: 'requestedAmount', type: 'uint256' },
      { name: 'term', type: 'uint256' },
      { name: 'poolId', type: 'uint256' }
    ],
    outputs: [{ name: 'loanId', type: 'uint256' }]
  },
  {
    name: 'createLiquidityPool',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'minScore', type: 'uint256' },
      { name: 'maxLTV', type: 'uint256' },
      { name: 'interestRate', type: 'uint256' }
    ],
    outputs: [{ name: 'poolId', type: 'uint256' }]
  },
  {
    name: 'addLiquidity',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'poolId', type: 'uint256' }
    ],
    outputs: [{ name: 'success', type: 'bool' }]
  },
  {
    name: 'getPool',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'uint256' }],
    outputs: [
      {
        name: 'pool',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'creator', type: 'address' },
          { name: 'totalLiquidity', type: 'uint256' },
          { name: 'availableLiquidity', type: 'uint256' },
          { name: 'minScore', type: 'uint256' },
          { name: 'maxLTV', type: 'uint256' },
          { name: 'interestRate', type: 'uint256' },
          { name: 'isActive', type: 'bool' }
        ]
      }
    ]
  }
] as const;

const LOAN_MANAGER_ABI = [
  {
    name: 'repayLoan',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'loanId', type: 'uint256' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: 'success', type: 'bool' }]
  },
  {
    name: 'getLoan',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'loanId', type: 'uint256' }],
    outputs: [
      {
        name: 'loan',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'borrower', type: 'address' },
          { name: 'domainTokenId', type: 'uint256' },
          { name: 'principal', type: 'uint256' },
          { name: 'currentBalance', type: 'uint256' },
          { name: 'interestRate', type: 'uint256' },
          { name: 'dueDate', type: 'uint256' },
          { name: 'status', type: 'uint8' }
        ]
      }
    ]
  },
  {
    name: 'liquidateCollateral',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'loanId', type: 'uint256' }],
    outputs: [{ name: 'auctionId', type: 'uint256' }]
  }
] as const;

const DUTCH_AUCTION_ABI = [
  {
    name: 'placeBid',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'auctionId', type: 'uint256' }],
    outputs: [{ name: 'success', type: 'bool' }]
  },
  {
    name: 'getCurrentPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'auctionId', type: 'uint256' }],
    outputs: [{ name: 'price', type: 'uint256' }]
  },
  {
    name: 'getAuction',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'auctionId', type: 'uint256' }],
    outputs: [
      {
        name: 'auction',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'domainTokenId', type: 'uint256' },
          { name: 'startingPrice', type: 'uint256' },
          { name: 'reservePrice', type: 'uint256' },
          { name: 'startTime', type: 'uint256' },
          { name: 'duration', type: 'uint256' },
          { name: 'highestBidder', type: 'address' },
          { name: 'highestBid', type: 'uint256' },
          { name: 'status', type: 'uint8' }
        ]
      }
    ]
  }
] as const;

const AI_ORACLE_ABI = [
  {
    name: 'requestScoring',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'domainTokenId', type: 'uint256' }],
    outputs: [{ name: 'requestId', type: 'bytes32' }]
  },
  {
    name: 'getDomainScore',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'domainTokenId', type: 'uint256' }],
    outputs: [
      { name: 'score', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' }
    ]
  }
] as const;

// Contract addresses - these would be from your deployment
const CONTRACT_ADDRESSES = {
  SATORU_LENDING: '0xc8b37c973976e06A99D7B259b11dEF258d9e067F' as Address,
  LOAN_MANAGER: '0x531cB6aB00A03CE568f082cC636eBE8D0C2eC0C3' as Address,
  DUTCH_AUCTION: '0xb22Eb9772966037D8cF6D094839Cc83164c30985' as Address,
  AI_ORACLE: '0xd0669621a9621E9F4f55721A60Abf2d0328CdffD' as Address,
  DOMA_PROTOCOL: '0x424bDf2E8a6F52Bd2c1C81D9437b0DC0309DF90f' as Address,
  USDC: '0x08CF67303E6ba2B80f5AFdE7ad926653145c6a7B' as Address
} as const;

export interface Pool {
  id: bigint;
  name: string;
  creator: Address;
  totalLiquidity: bigint;
  availableLiquidity: bigint;
  minScore: bigint;
  maxLTV: bigint;
  interestRate: bigint;
  isActive: boolean;
}

export interface Loan {
  id: bigint;
  borrower: Address;
  domainTokenId: bigint;
  principal: bigint;
  currentBalance: bigint;
  interestRate: bigint;
  dueDate: bigint;
  status: number;
}

export interface Auction {
  id: bigint;
  domainTokenId: bigint;
  startingPrice: bigint;
  reservePrice: bigint;
  startTime: bigint;
  duration: bigint;
  highestBidder: Address;
  highestBid: bigint;
  status: number;
}

export function useDomaLend() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { writeContractAsync: writeSatoruLending } = useWriteContract();
  const { writeContractAsync: writeLoanManager } = useWriteContract();
  const { writeContractAsync: writeDutchAuction } = useWriteContract();
  const { writeContractAsync: writeAIOracle } = useWriteContract();

  // Loan Operations
  const requestLoan = useCallback(async (
    domainTokenId: string,
    requestedAmount: string,
    term: number,
    poolId?: string
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const hash = await writeSatoruLending({
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'requestInstantLoan',
        args: [
          BigInt(domainTokenId),
          parseEther(requestedAmount),
          BigInt(term),
          poolId ? BigInt(poolId) : BigInt(0)
        ]
      });
      
      return { success: true, hash };
    } catch (err: any) {
      const message = err.message || 'Failed to request loan';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [writeSatoruLending]);

  const repayLoan = useCallback(async (loanId: string, amount: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const hash = await writeLoanManager({
        address: CONTRACT_ADDRESSES.LOAN_MANAGER,
        abi: LOAN_MANAGER_ABI,
        functionName: 'repayLoan',
        args: [BigInt(loanId), parseEther(amount)],
        value: parseEther(amount)
      });
      
      return { success: true, hash };
    } catch (err: any) {
      const message = err.message || 'Failed to repay loan';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [writeLoanManager]);

  // Pool Operations
  const createPool = useCallback(async (
    name: string,
    minScore: number,
    maxLTV: number,
    interestRate: number
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const hash = await writeSatoruLending({
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'createLiquidityPool',
        args: [name, BigInt(minScore), BigInt(maxLTV), BigInt(interestRate)]
      });
      
      return { success: true, hash };
    } catch (err: any) {
      const message = err.message || 'Failed to create pool';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [writeSatoruLending]);

  const addLiquidity = useCallback(async (poolId: string, amount: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const hash = await writeSatoruLending({
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'addLiquidity',
        args: [BigInt(poolId)],
        value: parseEther(amount)
      });
      
      return { success: true, hash };
    } catch (err: any) {
      const message = err.message || 'Failed to add liquidity';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [writeSatoruLending]);

  // Auction Operations
  const placeBid = useCallback(async (auctionId: string, bidAmount: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const hash = await writeDutchAuction({
        address: CONTRACT_ADDRESSES.DUTCH_AUCTION,
        abi: DUTCH_AUCTION_ABI,
        functionName: 'placeBid',
        args: [BigInt(auctionId)],
        value: parseEther(bidAmount)
      });
      
      return { success: true, hash };
    } catch (err: any) {
      const message = err.message || 'Failed to place bid';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [writeDutchAuction]);

  const liquidateCollateral = useCallback(async (loanId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const hash = await writeLoanManager({
        address: CONTRACT_ADDRESSES.LOAN_MANAGER,
        abi: LOAN_MANAGER_ABI,
        functionName: 'liquidateCollateral',
        args: [BigInt(loanId)]
      });
      
      return { success: true, hash };
    } catch (err: any) {
      const message = err.message || 'Failed to liquidate collateral';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [writeLoanManager]);

  // AI Oracle Operations
  const requestDomainScoring = useCallback(async (domainTokenId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const hash = await writeAIOracle({
        address: CONTRACT_ADDRESSES.AI_ORACLE,
        abi: AI_ORACLE_ABI,
        functionName: 'requestScoring',
        args: [BigInt(domainTokenId)]
      });
      
      return { success: true, hash };
    } catch (err: any) {
      const message = err.message || 'Failed to request domain scoring';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [writeAIOracle]);

  return {
    // State
    isLoading,
    error,
    
    // Loan functions
    requestLoan,
    repayLoan,
    liquidateCollateral,
    
    // Pool functions
    createPool,
    addLiquidity,
    
    // Auction functions
    placeBid,
    
    // AI Oracle functions
    requestDomainScoring,
    
    // Contract addresses
    contracts: CONTRACT_ADDRESSES
  };
}

// Hook for reading pool data
export function usePool(poolId: string | undefined) {
  const { data: pool, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESSES.SATORU_LENDING,
    abi: SATORU_LENDING_ABI,
    functionName: 'getPool',
    args: poolId ? [BigInt(poolId)] : undefined,
    query: {
      enabled: !!poolId
    }
  });

  return {
    pool: pool as Pool | undefined,
    isLoading,
    error
  };
}

// Hook for reading loan data
export function useLoan(loanId: string | undefined) {
  const { data: loan, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESSES.LOAN_MANAGER,
    abi: LOAN_MANAGER_ABI,
    functionName: 'getLoan',
    args: loanId ? [BigInt(loanId)] : undefined,
    query: {
      enabled: !!loanId
    }
  });

  return {
    loan: loan as Loan | undefined,
    isLoading,
    error
  };
}

// Hook for reading auction data
export function useAuction(auctionId: string | undefined) {
  const { data: auction, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESSES.DUTCH_AUCTION,
    abi: DUTCH_AUCTION_ABI,
    functionName: 'getAuction',
    args: auctionId ? [BigInt(auctionId)] : undefined,
    query: {
      enabled: !!auctionId
    }
  });

  const { data: currentPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.DUTCH_AUCTION,
    abi: DUTCH_AUCTION_ABI,
    functionName: 'getCurrentPrice',
    args: auctionId ? [BigInt(auctionId)] : undefined,
    query: {
      enabled: !!auctionId,
      refetchInterval: 30000 // Refetch every 30 seconds for live price updates
    }
  });

  return {
    auction: auction as Auction | undefined,
    currentPrice: currentPrice as bigint | undefined,
    isLoading,
    error
  };
}

// Hook for reading domain score
export function useDomainScore(domainTokenId: string | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESSES.AI_ORACLE,
    abi: AI_ORACLE_ABI,
    functionName: 'getDomainScore',
    args: domainTokenId ? [BigInt(domainTokenId)] : undefined,
    query: {
      enabled: !!domainTokenId
    }
  });

  const [score, timestamp] = data as [bigint, bigint] || [BigInt(0), BigInt(0)];

  return {
    score: Number(score),
    timestamp: Number(timestamp),
    isLoading,
    error
  };
}
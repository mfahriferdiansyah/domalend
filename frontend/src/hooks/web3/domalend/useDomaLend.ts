import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useConfig, useAccount } from 'wagmi';
import { useState, useCallback } from 'react';
import { parseEther, Address, parseUnits, maxUint256 } from 'viem';
import { readContract, simulateContract } from '@wagmi/core';

// Contract ABIs - These would be imported from your ABIs folder
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: 'success', type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: 'amount', type: 'uint256' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }]
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'decimals', type: 'uint8' }]
  }
] as const;

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
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'poolId', type: 'uint256' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: 'success', type: 'bool' }]
  },
  {
    name: 'removeLiquidity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'poolId', type: 'uint256' },
      { name: 'sharePercentage', type: 'uint256' }
    ],
    outputs: [{ name: 'success', type: 'bool' }]
  },
  {
    name: 'createLoanRequest',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'domainTokenId', type: 'uint256' },
          { name: 'requestedAmount', type: 'uint256' },
          { name: 'proposedInterestRate', type: 'uint256' },
          { name: 'campaignDuration', type: 'uint256' },
          { name: 'repaymentDeadline', type: 'uint256' }
        ]
      }
    ],
    outputs: [{ name: 'requestId', type: 'uint256' }]
  },
  {
    name: 'fundLoanRequest',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'requestId', type: 'uint256' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: 'success', type: 'bool' }]
  },
  {
    name: 'cancelLoanRequest',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'requestId', type: 'uint256' }
    ],
    outputs: [{ name: 'success', type: 'bool' }]
  },
  {
    name: 'canGetInstantLoan',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'domainTokenId', type: 'uint256' },
      { name: 'poolId', type: 'uint256' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [
      { name: 'eligible', type: 'bool' },
      { name: 'reason', type: 'string' }
    ]
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
  SATORU_LENDING: '0x76435A7eE4d2c1AB98D75e6b8927844aF1Fb2F2B' as Address,
  LOAN_MANAGER: '0x5365E0cf54Bccc157A0eFBb3aC77F826E27f9A49' as Address,
  DUTCH_AUCTION: '0xF4eC2e259036A841D7ebd8A34fDC97311Be063d1' as Address,
  AI_ORACLE: '0x43f0Ce9B2209D7F041525Af40f365a2B22DF53a1' as Address,
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
  const config = useConfig();
  
  const { writeContractAsync: writeSatoruLending } = useWriteContract();
  const { writeContractAsync: writeLoanManager } = useWriteContract();
  const { writeContractAsync: writeDutchAuction } = useWriteContract();
  const { writeContractAsync: writeAIOracle } = useWriteContract();
  const { writeContractAsync: writeERC20 } = useWriteContract();

  // Helper function for transaction simulation
  const simulateTransaction = useCallback(async (contractConfig: any) => {
    try {
      const simulation = await simulateContract(config, contractConfig);
      return { success: true, simulation };
    } catch (err: any) {
      console.error('Transaction simulation failed:', err);
      
      // Extract meaningful error message
      let errorMessage = 'Transaction would fail';
      if (err.message) {
        if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for transaction';
        } else if (err.message.includes('allowance')) {
          errorMessage = 'Insufficient token allowance';
        } else if (err.message.includes('revert')) {
          const revertMatch = err.message.match(/revert (.+?)(?:\n|$)/);
          if (revertMatch) {
            errorMessage = `Contract error: ${revertMatch[1]}`;
          }
        } else {
          errorMessage = `Transaction simulation failed: ${err.message}`;
        }
      }
      
      return { success: false, error: errorMessage };
    }
  }, [config]);

  // USDC Helper Functions
  const approveUSDC = useCallback(async (spender: Address, amount: bigint) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate the approval first
      const simulationConfig = {
        address: CONTRACT_ADDRESSES.USDC,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, amount]
      };

      const simulationResult = await simulateTransaction(simulationConfig);
      if (!simulationResult.success) {
        throw new Error(simulationResult.error);
      }

      const hash = await writeERC20({
        address: CONTRACT_ADDRESSES.USDC,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, amount]
      });
      
      return { success: true, hash };
    } catch (err: any) {
      const message = err.message || 'Failed to approve USDC';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [writeERC20, simulateTransaction]);

  const checkUSDCAllowance = useCallback(async (owner: Address, spender: Address): Promise<bigint> => {
    try {
      const result = await readContract(config, {
        address: CONTRACT_ADDRESSES.USDC,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [owner, spender]
      });
      
      return result as bigint;
    } catch (err) {
      console.warn('Failed to check USDC allowance, assuming 0:', err);
      return BigInt(0);
    }
  }, [config]);

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
      const args = [
        BigInt(domainTokenId),
        parseUnits(requestedAmount, 6), // Using USDC decimals
        BigInt(term),
        poolId ? BigInt(poolId) : BigInt(0)
      ];

      // Simulate the transaction first
      const simulationConfig = {
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'requestInstantLoan',
        args
      };

      const simulationResult = await simulateTransaction(simulationConfig);
      if (!simulationResult.success) {
        throw new Error(simulationResult.error);
      }

      const hash = await writeSatoruLending({
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'requestInstantLoan',
        args
      });
      
      return { success: true, hash };
    } catch (err: any) {
      const message = err.message || 'Failed to request loan';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [writeSatoruLending, simulateTransaction]);

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
      // Simulate the transaction first
      const simulationConfig = {
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'createLiquidityPool',
        args: [name, BigInt(minScore), BigInt(maxLTV), BigInt(interestRate)]
      };

      const simulationResult = await simulateTransaction(simulationConfig);
      if (!simulationResult.success) {
        throw new Error(simulationResult.error);
      }

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
  }, [writeSatoruLending, simulateTransaction]);

  const addLiquidity = useCallback(async (poolId: string, amount: string, userAddress: Address, skipApprovalCheck = false): Promise<any> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const amountBigInt = parseUnits(amount, 6); // USDC has 6 decimals
      
      // Check current allowance (skip if this is a follow-up call after approval)
      if (!skipApprovalCheck) {
        const currentAllowance = await checkUSDCAllowance(userAddress, CONTRACT_ADDRESSES.SATORU_LENDING);
        
        // If allowance is insufficient, request approval and then continue
        if (currentAllowance < amountBigInt) {
          const approvalResult = await approveUSDC(CONTRACT_ADDRESSES.SATORU_LENDING, maxUint256);
          if (!approvalResult.success) {
            return approvalResult;
          }
          
          // Wait for approval transaction to be confirmed
          setIsLoading(true); // Keep loading state
          
          // Recursively call addLiquidity after approval, skipping allowance check
          const liquidityResult: any = await addLiquidity(poolId, amount, userAddress, true);
          
          return {
            success: liquidityResult.success,
            hash: liquidityResult.hash,
            approvalHash: approvalResult.hash,
            message: liquidityResult.success 
              ? 'USDC approved and liquidity added successfully!'
              : 'USDC approved but liquidity addition failed. Please try again.',
            error: liquidityResult.error
          };
        }
      }

      // Simulate the transaction first
      const simulationConfig = {
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'addLiquidity',
        args: [BigInt(poolId), amountBigInt]
      };

      const simulationResult = await simulateTransaction(simulationConfig);
      if (!simulationResult.success) {
        throw new Error(simulationResult.error);
      }

      // Execute the actual transaction
      const hash = await writeSatoruLending({
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'addLiquidity',
        args: [BigInt(poolId), amountBigInt]
      });
      
      return { success: true, hash };
    } catch (err: any) {
      const message = err.message || 'Failed to add liquidity';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [writeSatoruLending, approveUSDC, checkUSDCAllowance, simulateTransaction]);

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

  // Additional Pool Operations
  const removeLiquidity = useCallback(async (poolId: string, sharePercentage: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const hash = await writeSatoruLending({
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'removeLiquidity',
        args: [BigInt(poolId), BigInt(sharePercentage)]
      });
      
      return { success: true, hash };
    } catch (err: any) {
      const message = err.message || 'Failed to remove liquidity';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [writeSatoruLending, simulateTransaction]);

  // Loan Request Operations
  const createLoanRequest = useCallback(async (
    domainTokenId: string,
    requestedAmount: string,
    proposedInterestRate: number,
    campaignDuration: number,
    repaymentDeadline: number
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const hash = await writeSatoruLending({
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'createLoanRequest',
        args: [{
          domainTokenId: BigInt(domainTokenId),
          requestedAmount: parseEther(requestedAmount),
          proposedInterestRate: BigInt(proposedInterestRate),
          campaignDuration: BigInt(campaignDuration),
          repaymentDeadline: BigInt(repaymentDeadline)
        }]
      });
      
      return { success: true, hash };
    } catch (err: any) {
      const message = err.message || 'Failed to create loan request';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [writeSatoruLending, simulateTransaction]);

  const fundLoanRequest = useCallback(async (requestId: string, amount: string, userAddress: Address, skipApprovalCheck = false): Promise<any> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const amountBigInt = parseUnits(amount, 6); // USDC has 6 decimals
      
      // Check current allowance (skip if this is a follow-up call after approval)
      if (!skipApprovalCheck) {
        const currentAllowance = await checkUSDCAllowance(userAddress, CONTRACT_ADDRESSES.SATORU_LENDING);
        
        // If allowance is insufficient, request approval and then continue
        if (currentAllowance < amountBigInt) {
          const approvalResult = await approveUSDC(CONTRACT_ADDRESSES.SATORU_LENDING, maxUint256);
          if (!approvalResult.success) {
            return approvalResult;
          }
          
          // Wait for approval transaction to be confirmed
          setIsLoading(true); // Keep loading state
          
          // Recursively call fundLoanRequest after approval, skipping allowance check
          const fundingResult: any = await fundLoanRequest(requestId, amount, userAddress, true);
          
          return {
            success: fundingResult.success,
            hash: fundingResult.hash,
            approvalHash: approvalResult.hash,
            message: fundingResult.success 
              ? 'USDC approved and loan funded successfully!'
              : 'USDC approved but loan funding failed. Please try again.',
            error: fundingResult.error
          };
        }
      }

      // Simulate the transaction first
      const simulationConfig = {
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'fundLoanRequest',
        args: [BigInt(requestId), amountBigInt]
      };

      const simulationResult = await simulateTransaction(simulationConfig);
      if (!simulationResult.success) {
        throw new Error(simulationResult.error);
      }

      const hash = await writeSatoruLending({
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'fundLoanRequest',
        args: [BigInt(requestId), amountBigInt]
      });
      
      return { success: true, hash };
    } catch (err: any) {
      const message = err.message || 'Failed to fund loan request';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [writeSatoruLending, approveUSDC, checkUSDCAllowance, simulateTransaction]);

  const cancelLoanRequest = useCallback(async (requestId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const hash = await writeSatoruLending({
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'cancelLoanRequest',
        args: [BigInt(requestId)]
      });
      
      return { success: true, hash };
    } catch (err: any) {
      const message = err.message || 'Failed to cancel loan request';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [writeSatoruLending, simulateTransaction]);

  return {
    // State
    isLoading,
    error,
    
    // USDC functions
    approveUSDC,
    checkUSDCAllowance,
    
    // Loan functions
    requestLoan,
    repayLoan,
    liquidateCollateral,
    
    // Pool functions
    createPool,
    addLiquidity,
    removeLiquidity,
    
    // Loan request functions
    createLoanRequest,
    fundLoanRequest,
    cancelLoanRequest,
    
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

// Hook for checking instant loan eligibility
export function useInstantLoanEligibility(
  domainTokenId: string | undefined,
  poolId: string | undefined,
  amount: string | undefined
) {
  const { address } = useAccount();
  
  // Prepare contract arguments
  const contractArgs: readonly [bigint, bigint, bigint] | undefined = domainTokenId && poolId && amount ? [
    BigInt(domainTokenId),
    BigInt(poolId),
    parseUnits(amount, 6) // Use 6 decimals for USDC
  ] as const : undefined;
  
  // Log all parameters when they change
  console.log('🔍 SATORU_LENDING.canGetInstantLoan() Parameters:', {
    contractAddress: CONTRACT_ADDRESSES.SATORU_LENDING,
    connectedAddress: address,
    domainTokenId,
    poolId,
    amount,
    contractArgs: contractArgs ? [
      contractArgs[0].toString(), // BigInt domainTokenId as string
      contractArgs[1].toString(), // BigInt poolId as string
      contractArgs[2].toString(), // BigInt amount as string (in USDC 6 decimals)
    ] : undefined,
    amountInUSDC: amount,
    enabled: !!(domainTokenId && poolId && amount)
  });

  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESSES.SATORU_LENDING,
    abi: SATORU_LENDING_ABI,
    functionName: 'canGetInstantLoan',
    args: contractArgs,
    account: address,
    query: {
      enabled: !!(domainTokenId && poolId && amount && address)
    }
  });

  const [eligible, reason] = data as [boolean, string] || [false, ''];
  
  // Log the response from contract
  console.log('📋 SATORU_LENDING.canGetInstantLoan() Response:', {
    eligible,
    reason,
    isLoading,
    error: error?.message,
    rawData: data
  });

  return {
    eligible,
    reason,
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

// Hook for reading USDC allowance
export function useUSDCAllowance(owner: Address | undefined, spender: Address) {
  const { data: allowance, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: owner ? [owner, spender] : undefined,
    query: {
      enabled: !!owner
    }
  });

  return {
    allowance: allowance as bigint || BigInt(0),
    isLoading,
    error
  };
}

// Hook for reading USDC balance
export function useUSDCBalance(account: Address | undefined) {
  const { data: balance, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: {
      enabled: !!account
    }
  });

  return {
    balance: balance as bigint || BigInt(0),
    isLoading,
    error
  };
}
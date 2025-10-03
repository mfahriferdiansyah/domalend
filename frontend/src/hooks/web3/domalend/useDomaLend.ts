import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useConfig, useAccount } from 'wagmi';
import { useState, useCallback } from 'react';
import { parseEther, Address, parseUnits, maxUint256 } from 'viem';
import { readContract, simulateContract, waitForTransactionReceipt } from '@wagmi/core';

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

// ERC721 ABI for domain approval
const ERC721_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' }
    ],
    outputs: []
  },
  {
    name: 'getApproved',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: 'approved', type: 'address' }]
  },
  {
    name: 'setApprovalForAll',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' }
    ],
    outputs: []
  },
  {
    name: 'isApprovedForAll',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'operator', type: 'address' }
    ],
    outputs: [{ name: 'approved', type: 'bool' }]
  }
] as const;

const SATORU_LENDING_ABI = [
  {
    name: 'requestInstantLoan',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'domainTokenId', type: 'uint256' },
          { name: 'poolId', type: 'uint256' },
          { name: 'requestedAmount', type: 'uint256' },
          { name: 'loanDuration', type: 'uint256' }
        ]
      }
    ],
    outputs: [{ name: 'loanId', type: 'uint256' }]
  },
  {
    name: 'createLiquidityPool',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'initialLiquidity', type: 'uint256' },
          { name: 'minAiScore', type: 'uint256' },
          { name: 'maxDomainExpiration', type: 'uint256' },
          { name: 'interestRate', type: 'uint256' },
          { name: 'minLoanAmount', type: 'uint256' },
          { name: 'maxLoanAmount', type: 'uint256' },
          { name: 'minDuration', type: 'uint256' },
          { name: 'maxDuration', type: 'uint256' },
          { name: 'allowAdditionalProviders', type: 'bool' }
        ]
      }
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
    outputs: []
  },
  {
    name: 'removeLiquidity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'poolId', type: 'uint256' },
      { name: 'sharePercentage', type: 'uint256' }
    ],
    outputs: []
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
    outputs: []
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
    name: 'getPoolInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'uint256' }],
    outputs: [
      { name: 'creator', type: 'address' },
      { name: 'totalLiquidity', type: 'uint256' },
      { name: 'availableLiquidity', type: 'uint256' },
      { name: 'minAiScore', type: 'uint256' },
      { name: 'interestRate', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
      { name: 'totalLoansIssued', type: 'uint256' }
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
    name: 'paidScoreRequest',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'domainTokenId', type: 'uint256' }],
    outputs: [{ name: 'requestId', type: 'uint256' }]
  },
  {
    name: 'paymentToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'token', type: 'address' }]
  },
  {
    name: 'paidScoringFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'fee', type: 'uint256' }]
  },
  {
    name: 'getDomainScore',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'domainTokenId', type: 'uint256' }],
    outputs: [
      { name: 'score', type: 'uint256' },
      { name: 'isValid', type: 'bool' },
      { name: 'timestamp', type: 'uint256' }
    ]
  },
  {
    name: 'hasValidScore',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'domainTokenId', type: 'uint256' }],
    outputs: [{ name: 'isValid', type: 'bool' }]
  },
  {
    name: 'isScoreValid',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'domainTokenId', type: 'uint256' }],
    outputs: [{ name: 'isValid', type: 'bool' }]
  },
  {
    name: 'needsRefresh',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'domainTokenId', type: 'uint256' }],
    outputs: [{ name: 'needsRefresh', type: 'bool' }]
  },
  {
    name: 'getScoreAge',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'domainTokenId', type: 'uint256' }],
    outputs: [{ name: 'ageInSeconds', type: 'uint256' }]
  }
] as const;

// Contract addresses - loaded from environment variables
const CONTRACT_ADDRESSES = {
  SATORU_LENDING: (process.env.NEXT_PUBLIC_SATORU_LENDING_ADDRESS || '0x76435A7eE4d2c1AB98D75e6b8927844aF1Fb2F2B') as Address,
  LOAN_MANAGER: (process.env.NEXT_PUBLIC_LOAN_MANAGER_ADDRESS || '0x5365E0cf54Bccc157A0eFBb3aC77F826E27f9A49') as Address,
  DUTCH_AUCTION: (process.env.NEXT_PUBLIC_DUTCH_AUCTION_ADDRESS || '0xF4eC2e259036A841D7ebd8A34fDC97311Be063d1') as Address,
  AI_ORACLE: (process.env.NEXT_PUBLIC_AI_ORACLE_ADDRESS || '0x43f0Ce9B2209D7F041525Af40f365a2B22DF53a1') as Address,
  DOMA_PROTOCOL: (process.env.NEXT_PUBLIC_DOMA_PROTOCOL_ADDRESS || '0x416A260A6ab809D417D1374624C7647A80F1dfCe') as Address,
  USDC: (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x08CF67303E6ba2B80f5AFdE7ad926653145c6a7B') as Address
} as const;

export interface Pool {
  id: bigint;
  creator: Address;
  totalLiquidity: bigint;
  availableLiquidity: bigint;
  minAiScore: bigint;
  maxDomainExpiration: bigint;
  interestRate: bigint;
  minLoanAmount: bigint;
  maxLoanAmount: bigint;
  minDuration: bigint;
  maxDuration: bigint;
  allowAdditionalProviders: boolean;
  isActive: boolean;
}

export interface CreatePoolParams {
  initialLiquidity: string;
  minAiScore: number;
  maxDomainExpiration: number;
  interestRate: number;
  minLoanAmount: string;
  maxLoanAmount: string;
  minDuration: number;
  maxDuration: number;
  allowAdditionalProviders: boolean;
}

export interface TransactionProgress {
  step: string;
  stepIndex: number;
  totalSteps: number;
  message: string;
  txHash?: string;
}

export interface TransactionResult {
  success: boolean;
  hash?: string;
  approvalHash?: string;
  message?: string;
  error?: string;
  requiresApproval?: boolean;
}

// Legacy types for backward compatibility
export interface PoolCreationProgress extends TransactionProgress {}
export interface PoolCreationResult extends TransactionResult {}

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
  const { address } = useAccount();
  
  const { writeContractAsync: writeSatoruLending } = useWriteContract();
  const { writeContractAsync: writeLoanManager } = useWriteContract();
  const { writeContractAsync: writeDutchAuction } = useWriteContract();
  const { writeContractAsync: writeAIOracle } = useWriteContract();
  const { writeContractAsync: writeERC20 } = useWriteContract();
  const { writeContractAsync: writeERC721 } = useWriteContract();

  // Helper function for transaction simulation
  // Helper function to format error messages consistently
  const formatErrorMessage = useCallback((err: any, context: string = 'Transaction'): string => {
    const fullError = err.message || err.toString();
    
    if (fullError.toLowerCase().includes('user rejected') || fullError.toLowerCase().includes('user denied')) {
      return 'Transaction was cancelled by user';
    } else if (fullError.toLowerCase().includes('insufficient funds')) {
      return 'Insufficient funds for transaction';
    } else if (fullError.toLowerCase().includes('allowance') || fullError.toLowerCase().includes('approve')) {
      return 'Insufficient token allowance';
    } else if (fullError.toLowerCase().includes('network') || fullError.toLowerCase().includes('rpc')) {
      return 'Network error occurred. Please check your connection and try again';
    } else if (fullError.includes('revert')) {
      const revertMatch = fullError.match(/revert (.+?)(?:\n|$|\.)/i);
      if (revertMatch) {
        return `Contract error: ${revertMatch[1]}`;
      } else {
        return 'Transaction would be reverted by the contract';
      }
    } else if (fullError.length > 200) {
      // For very long errors, try to extract the first meaningful line
      const lines = fullError.split('\n');
      const firstLine = lines[0];
      if (firstLine.length > 50 && firstLine.length < 150) {
        return firstLine;
      } else {
        return `${context} failed - see details for more information`;
      }
    } else {
      return fullError;
    }
  }, []);

  const simulateTransaction = useCallback(async (contractConfig: any) => {
    try {
      const simulation = await simulateContract(config, contractConfig);
      return { success: true, simulation };
    } catch (err: any) {
      console.error('Transaction simulation failed:', err);
      const errorMessage = formatErrorMessage(err, 'Transaction simulation');
      return { success: false, error: errorMessage };
    }
  }, [config, formatErrorMessage]);

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
  // Helper function to check domain approval
  const checkDomainApproval = useCallback(async (domainTokenId: string): Promise<boolean> => {
    try {
      const result = await readContract(config, {
        address: CONTRACT_ADDRESSES.DOMA_PROTOCOL,
        abi: ERC721_ABI,
        functionName: 'getApproved',
        args: [BigInt(domainTokenId)]
      });
      
      console.log('🔍 Domain approval check:', {
        domainTokenId,
        approvedAddress: result,
        loanManagerContract: CONTRACT_ADDRESSES.LOAN_MANAGER,
        isApproved: result === CONTRACT_ADDRESSES.LOAN_MANAGER
      });
      
      return result === CONTRACT_ADDRESSES.LOAN_MANAGER;
    } catch (err) {
      console.error('Error checking domain approval:', err);
      return false;
    }
  }, [config]);

  // Helper function to approve domain
  const approveDomain = useCallback(async (domainTokenId: string): Promise<TransactionResult> => {
    try {
      // Simulate the approval first
      const simulationConfig = {
        address: CONTRACT_ADDRESSES.DOMA_PROTOCOL,
        abi: ERC721_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.LOAN_MANAGER, BigInt(domainTokenId)]
      };

      const simulationResult = await simulateTransaction(simulationConfig);
      if (!simulationResult.success) {
        throw new Error(simulationResult.error);
      }

      const hash = await writeERC721({
        address: CONTRACT_ADDRESSES.DOMA_PROTOCOL,
        abi: ERC721_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.LOAN_MANAGER, BigInt(domainTokenId)]
      });

      return { success: true, hash };
    } catch (err: any) {
      const message = err.message || 'Failed to approve domain';
      return { success: false, error: message };
    }
  }, [writeERC721, simulateTransaction]);

  const requestLoan = useCallback(async (
    domainTokenId: string,
    requestedAmount: string,
    term: number,
    poolId?: string,
    onProgress?: (progress: TransactionProgress) => void
  ): Promise<TransactionResult> => {
    console.log('🚀 [requestLoan] Starting instant loan request process', {
      domainTokenId,
      requestedAmount,
      term,
      poolId,
      timestamp: new Date().toISOString()
    });

    setIsLoading(true);
    setError(null);
    
    try {
      let stepIndex = 0;
      let requiresApproval = false;
      let approvalHash: string | undefined;

      console.log('💰 [requestLoan] Parsed loan parameters', {
        domainTokenId,
        originalAmount: requestedAmount,
        termInSeconds: term,
        poolId: poolId || '0'
      });

      // Step 1: Check if domain is already approved
      console.log('🔍 [requestLoan] Step 1: Checking domain approval');
      
      onProgress?.({
        step: 'checking_domain_approval',
        stepIndex: stepIndex++,
        totalSteps: 5, // Will adjust based on whether approval is needed
        message: 'Checking domain approval for collateral use...'
      });

      const isApproved = await checkDomainApproval(domainTokenId);
      
      console.log('🔍 [requestLoan] Domain approval check result', {
        domainTokenId,
        isApproved,
        loanManagerContract: CONTRACT_ADDRESSES.LOAN_MANAGER
      });

      requiresApproval = !isApproved;
      
      console.log('📋 [requestLoan] Approval requirement determined', {
        requiresApproval,
        totalSteps: requiresApproval ? 6 : 3
      });
      
      onProgress?.({
        step: 'checking_domain_approval',
        stepIndex: 0,
        totalSteps: requiresApproval ? 6 : 3,
        message: requiresApproval 
          ? 'Domain approval required for collateral use.'
          : 'Domain already approved. Proceeding to loan request.'
      });

      if (requiresApproval) {
        console.log('✅ [requestLoan] Step 2: Starting domain approval process');
        
        // Step 2: Simulate domain approval
        onProgress?.({
          step: 'simulating_domain_approval',
          stepIndex: stepIndex++,
          totalSteps: 6,
          message: 'Simulating domain approval transaction...'
        });
        
        const domainApprovalSimulationConfig = {
          address: CONTRACT_ADDRESSES.DOMA_PROTOCOL,
          abi: ERC721_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.LOAN_MANAGER, BigInt(domainTokenId)]
        };

        console.log('🧪 [requestLoan] Simulating domain approval', {
          config: {
            address: CONTRACT_ADDRESSES.DOMA_PROTOCOL,
            functionName: 'approve',
            spender: CONTRACT_ADDRESSES.LOAN_MANAGER,
            tokenId: domainTokenId
          }
        });

        const domainApprovalSimulationResult = await simulateTransaction(domainApprovalSimulationConfig);
        
        console.log('🧪 [requestLoan] Domain approval simulation result', {
          success: domainApprovalSimulationResult.success,
          error: domainApprovalSimulationResult.error
        });
        
        if (!domainApprovalSimulationResult.success) {
          throw new Error(`Domain approval simulation failed: ${domainApprovalSimulationResult.error}`);
        }
        
        // Step 3: Execute domain approval
        console.log('📝 [requestLoan] Step 3: Executing domain approval');
        
        onProgress?.({
          step: 'approving_domain',
          stepIndex: stepIndex++,
          totalSteps: 6,
          message: 'Please confirm the domain approval in your wallet...'
        });
        
        const approvalResult = await approveDomain(domainTokenId);
        
        console.log('📝 [requestLoan] Domain approval execution result', {
          success: approvalResult.success,
          hash: approvalResult.hash,
          error: approvalResult.error
        });
        
        if (!approvalResult.success) {
          console.error('❌ [requestLoan] Domain approval failed', approvalResult.error);
          return {
            success: false,
            error: approvalResult.error,
            requiresApproval: true
          };
        }
        
        approvalHash = approvalResult.hash;
        
        console.log('✅ [requestLoan] Domain approval confirmed', {
          approvalHash,
          spender: CONTRACT_ADDRESSES.LOAN_MANAGER,
          tokenId: domainTokenId
        });
        
        onProgress?.({
          step: 'approving_domain',
          stepIndex: stepIndex - 1,
          totalSteps: 6,
          message: 'Domain approval confirmed! Waiting for confirmation...',
          txHash: approvalHash
        });

        // Step 4: Wait for approval confirmation
        console.log('⏳ [requestLoan] Step 4: Waiting for domain approval confirmation');
        
        onProgress?.({
          step: 'waiting_approval_confirmation',
          stepIndex: stepIndex++,
          totalSteps: 6,
          message: 'Waiting for domain approval to be confirmed on-chain...'
        });
        
        try {
          const receipt = await waitForTransactionReceipt(config, {
            hash: approvalHash as `0x${string}`,
            timeout: 60_000 // 60 seconds timeout
          });
          
          console.log('✅ [requestLoan] Domain approval confirmed on-chain', {
            txHash: approvalHash,
            blockNumber: receipt.blockNumber.toString(),
            status: receipt.status
          });

          onProgress?.({
            step: 'waiting_approval_confirmation',
            stepIndex: stepIndex - 1,
            totalSteps: 6,
            message: 'Domain approval confirmed on-chain!',
            txHash: approvalHash
          });
        } catch (waitError) {
          console.warn('⚠️ [requestLoan] Could not wait for approval confirmation, proceeding anyway', waitError);
          
          // Fallback: Add a delay and proceed
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
          
          onProgress?.({
            step: 'waiting_approval_confirmation',
            stepIndex: stepIndex - 1,
            totalSteps: 6,
            message: 'Domain approval transaction sent, proceeding...',
            txHash: approvalHash
          });
        }
      } else {
        // Adjust step index if no approval needed
        stepIndex = 1; // Skip approval steps
      }

      const totalSteps = requiresApproval ? 6 : 3;
      
      // Prepare contract arguments
      const args = [{
        domainTokenId: BigInt(domainTokenId),
        poolId: poolId ? BigInt(poolId) : BigInt(0),
        requestedAmount: parseUnits(requestedAmount, 6), // Using USDC decimals
        loanDuration: BigInt(term)
      }] as const;

      console.log('🏗️ [requestLoan] Prepared contract parameters', {
        contractParams: {
          domainTokenId: args[0].domainTokenId.toString(),
          poolId: args[0].poolId.toString(),
          requestedAmount: args[0].requestedAmount.toString(),
          loanDuration: args[0].loanDuration.toString()
        },
        totalSteps,
        currentStepIndex: stepIndex
      });

      // Step 5 (or 2): Simulate instant loan request
      console.log('🧪 [requestLoan] Step 5/2: Simulating instant loan request');
      
      onProgress?.({
        step: 'simulating_instant_loan',
        stepIndex: stepIndex++,
        totalSteps,
        message: 'Simulating instant loan request transaction...'
      });

      const simulationConfig = {
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'requestInstantLoan',
        args
      };

      console.log('🧪 [requestLoan] Simulation config', {
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        functionName: 'requestInstantLoan'
      });

      const simulationResult = await simulateTransaction(simulationConfig);
      
      console.log('🧪 [requestLoan] Simulation result', {
        success: simulationResult.success,
        error: simulationResult.error
      });
      
      if (!simulationResult.success) {
        throw new Error(`Instant loan request simulation failed: ${simulationResult.error}`);
      }

      // Step 6 (or 3): Execute instant loan request
      console.log('🚀 [requestLoan] Step 6/3: Executing instant loan request');
      
      onProgress?.({
        step: 'requesting_instant_loan',
        stepIndex: stepIndex++,
        totalSteps,
        message: 'Please confirm the instant loan request in your wallet...'
      });

      const hash = await writeSatoruLending({
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'requestInstantLoan',
        args
      });
      
      console.log('🚀 [requestLoan] Execution result', {
        success: true,
        hash,
        contractAddress: CONTRACT_ADDRESSES.SATORU_LENDING
      });

      // Final success
      onProgress?.({
        step: 'requesting_instant_loan',
        stepIndex: stepIndex - 1,
        totalSteps,
        message: 'Instant loan request completed successfully!',
        txHash: hash
      });

      const finalResult = {
        success: true,
        hash,
        approvalHash,
        requiresApproval,
        message: requiresApproval 
          ? 'Domain approved and instant loan requested successfully!'
          : 'Instant loan requested successfully!'
      };

      console.log('🎉 [requestLoan] Instant loan request completed successfully', {
        result: finalResult,
        totalSteps: totalSteps,
        timestamp: new Date().toISOString()
      });

      return finalResult;
    } catch (err: any) {
      const message = formatErrorMessage(err, 'Instant loan request');
      
      console.error('❌ [requestLoan] Instant loan request failed', {
        error: message,
        originalError: err,
        domainTokenId,
        requestedAmount,
        term,
        poolId,
        timestamp: new Date().toISOString(),
        stack: err.stack
      });
      
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
      console.log('🏁 [requestLoan] Instant loan request process ended', {
        timestamp: new Date().toISOString()
      });
    }
  }, [writeSatoruLending, simulateTransaction, checkDomainApproval, approveDomain, formatErrorMessage]);

  const repayLoan = useCallback(async (
    loanId: string, 
    amount: string, 
    userAddress: Address,
    onProgress?: (progress: TransactionProgress) => void,
    skipApprovalCheck = false
  ): Promise<TransactionResult> => {
    console.log('🚀 [repayLoan] Starting loan repayment process', {
      loanId,
      amount,
      userAddress,
      skipApprovalCheck,
      timestamp: new Date().toISOString()
    });

    setIsLoading(true);
    setError(null);
    
    try {
      const amountBigInt = parseUnits(amount, 6); // USDC has 6 decimals
      let stepIndex = 0;
      let requiresApproval = false;
      let approvalHash: string | undefined;

      console.log('💰 [repayLoan] Parsed repayment amount', {
        originalAmount: amount,
        parsedAmount: amountBigInt.toString(),
        decimals: 6
      });

      // Step 1: Check current allowance (skip if this is a follow-up call after approval)
      if (!skipApprovalCheck) {
        console.log('🔍 [repayLoan] Step 1: Checking USDC allowance');
        
        onProgress?.({
          step: 'checking_allowance',
          stepIndex: stepIndex++,
          totalSteps: 5, // Will adjust based on whether approval is needed
          message: 'Checking your USDC spending allowance...'
        });
        
        const currentAllowance = await checkUSDCAllowance(userAddress, CONTRACT_ADDRESSES.LOAN_MANAGER);
        
        console.log('🔍 [repayLoan] Allowance check result', {
          userAddress,
          spender: CONTRACT_ADDRESSES.LOAN_MANAGER,
          currentAllowance: currentAllowance.toString(),
          requiredAmount: amountBigInt.toString(),
          isAllowanceSufficient: currentAllowance >= amountBigInt
        });
        
        requiresApproval = currentAllowance < amountBigInt;
        
        console.log('📋 [repayLoan] Approval requirement determined', {
          requiresApproval,
          totalSteps: requiresApproval ? 5 : 3
        });
        
        onProgress?.({
          step: 'checking_allowance',
          stepIndex: 0,
          totalSteps: requiresApproval ? 5 : 3,
          message: requiresApproval 
            ? 'Insufficient USDC allowance detected. Approval required.'
            : 'USDC allowance sufficient. Proceeding to loan repayment.'
        });
        
        // If allowance is insufficient, request approval
        if (requiresApproval) {
          console.log('✅ [repayLoan] Step 2: Starting approval process');
          
          // Step 2: Simulate approval
          onProgress?.({
            step: 'simulating_approval',
            stepIndex: stepIndex++,
            totalSteps: 5,
            message: 'Simulating USDC approval transaction...'
          });
          
          const approvalSimulationConfig = {
            address: CONTRACT_ADDRESSES.USDC,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [CONTRACT_ADDRESSES.LOAN_MANAGER, maxUint256]
          };

          console.log('🧪 [repayLoan] Simulating USDC approval', {
            config: {
              address: CONTRACT_ADDRESSES.USDC,
              functionName: 'approve',
              spender: CONTRACT_ADDRESSES.LOAN_MANAGER,
              amount: maxUint256.toString()
            }
          });

          const approvalSimulationResult = await simulateTransaction(approvalSimulationConfig);
          
          console.log('🧪 [repayLoan] Approval simulation result', {
            success: approvalSimulationResult.success,
            error: approvalSimulationResult.error
          });
          
          if (!approvalSimulationResult.success) {
            throw new Error(`Approval simulation failed: ${approvalSimulationResult.error}`);
          }
          
          // Step 3: Execute approval
          console.log('📝 [repayLoan] Step 3: Executing USDC approval');
          
          onProgress?.({
            step: 'approving_usdc',
            stepIndex: stepIndex++,
            totalSteps: 5,
            message: 'Please confirm the USDC approval in your wallet...'
          });
          
          const approvalResult = await approveUSDC(CONTRACT_ADDRESSES.LOAN_MANAGER, maxUint256);
          
          console.log('📝 [repayLoan] USDC approval execution result', {
            success: approvalResult.success,
            hash: approvalResult.hash,
            error: approvalResult.error
          });
          
          if (!approvalResult.success) {
            console.error('❌ [repayLoan] USDC approval failed', approvalResult.error);
            return {
              success: false,
              error: approvalResult.error,
              requiresApproval: true
            };
          }
          
          approvalHash = approvalResult.hash;
          
          console.log('✅ [repayLoan] USDC approval confirmed', {
            approvalHash,
            spender: CONTRACT_ADDRESSES.LOAN_MANAGER,
            amount: maxUint256.toString()
          });
          
          onProgress?.({
            step: 'approving_usdc',
            stepIndex: stepIndex - 1,
            totalSteps: 5,
            message: 'USDC approval confirmed!',
            txHash: approvalHash
          });
        } else {
          // Adjust total steps if no approval needed
          stepIndex = 1; // Skip approval steps
        }
      }

      const totalSteps = requiresApproval ? 6 : 3;
      const args = [BigInt(loanId), amountBigInt] as const;

      console.log('🏗️ [repayLoan] Prepared contract parameters', {
        loanId: args[0].toString(),
        amount: args[1].toString(),
        totalSteps,
        currentStepIndex: stepIndex
      });

      // Step 4 (or 2): Simulate loan repayment
      console.log('🧪 [repayLoan] Step 4/2: Simulating loan repayment');
      
      onProgress?.({
        step: 'simulating_repayment',
        stepIndex: stepIndex++,
        totalSteps,
        message: 'Simulating loan repayment transaction...'
      });

      const simulationConfig = {
        address: CONTRACT_ADDRESSES.LOAN_MANAGER,
        abi: LOAN_MANAGER_ABI,
        functionName: 'repayLoan',
        args
      };

      console.log('🧪 [repayLoan] Simulation config', {
        address: CONTRACT_ADDRESSES.LOAN_MANAGER,
        functionName: 'repayLoan',
        loanId: args[0].toString(),
        amount: args[1].toString()
      });

      const simulationResult = await simulateTransaction(simulationConfig);
      
      console.log('🧪 [repayLoan] Simulation result', {
        success: simulationResult.success,
        error: simulationResult.error
      });
      
      if (!simulationResult.success) {
        throw new Error(`Loan repayment simulation failed: ${simulationResult.error}`);
      }

      // Step 5 (or 3): Execute loan repayment
      console.log('🚀 [repayLoan] Step 5/3: Executing loan repayment');
      
      onProgress?.({
        step: 'repaying_loan',
        stepIndex: stepIndex++,
        totalSteps,
        message: 'Please confirm the loan repayment in your wallet...'
      });

      const hash = await writeLoanManager({
        address: CONTRACT_ADDRESSES.LOAN_MANAGER,
        abi: LOAN_MANAGER_ABI,
        functionName: 'repayLoan',
        args
      });
      
      console.log('🚀 [repayLoan] Execution result', {
        success: true,
        hash,
        contractAddress: CONTRACT_ADDRESSES.LOAN_MANAGER
      });

      // Final success
      onProgress?.({
        step: 'repaying_loan',
        stepIndex: stepIndex - 1,
        totalSteps,
        message: 'Loan repayment completed successfully!',
        txHash: hash
      });

      const finalResult = {
        success: true,
        hash,
        approvalHash,
        requiresApproval,
        message: requiresApproval 
          ? 'USDC approved and loan repayment completed successfully!'
          : 'Loan repayment completed successfully!'
      };

      console.log('🎉 [repayLoan] Loan repayment completed successfully', {
        result: finalResult,
        totalSteps: totalSteps,
        timestamp: new Date().toISOString()
      });

      return finalResult;
    } catch (err: any) {
      const message = err.message || 'Failed to repay loan';
      
      console.error('❌ [repayLoan] Loan repayment failed', {
        error: message,
        originalError: err,
        loanId,
        amount,
        userAddress,
        skipApprovalCheck,
        timestamp: new Date().toISOString(),
        stack: err.stack
      });
      
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
      console.log('🏁 [repayLoan] Loan repayment process ended', {
        timestamp: new Date().toISOString()
      });
    }
  }, [writeLoanManager, simulateTransaction, approveUSDC, checkUSDCAllowance]);

  // Pool Operations
  const createPool = useCallback(async (
    params: CreatePoolParams,
    userAddress: Address,
    onProgress?: (progress: TransactionProgress) => void,
    skipApprovalCheck = false
  ): Promise<TransactionResult> => {
    console.log('🚀 [createPool] Starting pool creation process', {
      params,
      userAddress,
      skipApprovalCheck,
      timestamp: new Date().toISOString()
    });

    setIsLoading(true);
    setError(null);
    
    try {
      const initialLiquidityBigInt = parseUnits(params.initialLiquidity, 6); // USDC has 6 decimals
      let stepIndex = 0;
      let requiresApproval = false;
      let approvalHash: string | undefined;

      console.log('💰 [createPool] Parsed initial liquidity', {
        originalAmount: params.initialLiquidity,
        parsedAmount: initialLiquidityBigInt.toString(),
        decimals: 6
      });
      
      // Step 1: Check current allowance (skip if this is a follow-up call after approval)
      if (!skipApprovalCheck) {
        console.log('🔍 [createPool] Step 1: Checking USDC allowance');
        
        onProgress?.({
          step: 'checking_allowance',
          stepIndex: stepIndex++,
          totalSteps: 5, // Will adjust based on whether approval is needed
          message: 'Checking your USDC spending allowance...'
        });
        
        const currentAllowance = await checkUSDCAllowance(userAddress, CONTRACT_ADDRESSES.SATORU_LENDING);
        
        console.log('🔍 [createPool] Allowance check result', {
          userAddress,
          spender: CONTRACT_ADDRESSES.SATORU_LENDING,
          currentAllowance: currentAllowance.toString(),
          requiredAmount: initialLiquidityBigInt.toString(),
          isAllowanceSufficient: currentAllowance >= initialLiquidityBigInt
        });
        
        // Determine if approval is needed and notify frontend
        requiresApproval = currentAllowance < initialLiquidityBigInt;
        
        console.log('📋 [createPool] Approval requirement determined', {
          requiresApproval,
          totalSteps: requiresApproval ? 5 : 3
        });
        
        onProgress?.({
          step: 'checking_allowance',
          stepIndex: 0,
          totalSteps: requiresApproval ? 5 : 3,
          message: requiresApproval 
            ? 'Insufficient USDC allowance detected. Approval required.'
            : 'USDC allowance sufficient. Proceeding to pool creation.'
        });
        
        // If allowance is insufficient, request approval and then continue
        if (requiresApproval) {
          console.log('✅ [createPool] Step 2: Starting approval process');
          
          // Step 2: Simulate approval
          onProgress?.({
            step: 'simulating_approval',
            stepIndex: stepIndex++,
            totalSteps: 5,
            message: 'Simulating USDC approval transaction...'
          });
          
          const approvalSimulationConfig = {
            address: CONTRACT_ADDRESSES.USDC,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [CONTRACT_ADDRESSES.SATORU_LENDING, maxUint256]
          };

          console.log('🧪 [createPool] Simulating USDC approval', {
            config: {
              address: CONTRACT_ADDRESSES.USDC,
              functionName: 'approve',
              spender: CONTRACT_ADDRESSES.SATORU_LENDING,
              amount: maxUint256.toString()
            }
          });

          const approvalSimulationResult = await simulateTransaction(approvalSimulationConfig);
          
          console.log('🧪 [createPool] Approval simulation result', {
            success: approvalSimulationResult.success,
            error: approvalSimulationResult.error
          });
          
          if (!approvalSimulationResult.success) {
            throw new Error(`Approval simulation failed: ${approvalSimulationResult.error}`);
          }
          
          // Step 3: Execute approval
          console.log('📝 [createPool] Step 3: Executing USDC approval');
          
          onProgress?.({
            step: 'approving_usdc',
            stepIndex: stepIndex++,
            totalSteps: 5,
            message: 'Please confirm the USDC approval in your wallet...'
          });
          
          const approvalResult = await approveUSDC(CONTRACT_ADDRESSES.SATORU_LENDING, maxUint256);
          
          console.log('📝 [createPool] USDC approval execution result', {
            success: approvalResult.success,
            hash: approvalResult.hash,
            error: approvalResult.error
          });
          
          if (!approvalResult.success) {
            console.error('❌ [createPool] USDC approval failed', approvalResult.error);
            return {
              success: false,
              error: approvalResult.error,
              requiresApproval: true
            };
          }
          
          approvalHash = approvalResult.hash;
          
          console.log('✅ [createPool] USDC approval confirmed', {
            approvalHash,
            spender: CONTRACT_ADDRESSES.SATORU_LENDING,
            amount: maxUint256.toString()
          });
          
          onProgress?.({
            step: 'approving_usdc',
            stepIndex: stepIndex - 1,
            totalSteps: 5,
            message: 'USDC approval confirmed!',
            txHash: approvalHash
          });
        } else {
          // Adjust total steps if no approval needed
          stepIndex = 1; // Skip approval steps
        }
      }

      const totalSteps = requiresApproval ? 6 : 3;
      
      const contractParams = {
        initialLiquidity: initialLiquidityBigInt,
        minAiScore: BigInt(params.minAiScore),
        maxDomainExpiration: BigInt(params.maxDomainExpiration),
        interestRate: BigInt(params.interestRate),
        minLoanAmount: parseUnits(params.minLoanAmount, 6),
        maxLoanAmount: parseUnits(params.maxLoanAmount, 6),
        minDuration: BigInt(params.minDuration),
        maxDuration: BigInt(params.maxDuration),
        allowAdditionalProviders: params.allowAdditionalProviders
      };

      console.log('🏗️ [createPool] Prepared contract parameters', {
        contractParams: {
          initialLiquidity: contractParams.initialLiquidity.toString(),
          minAiScore: contractParams.minAiScore.toString(),
          maxDomainExpiration: contractParams.maxDomainExpiration.toString(),
          interestRate: contractParams.interestRate.toString(),
          minLoanAmount: contractParams.minLoanAmount.toString(),
          maxLoanAmount: contractParams.maxLoanAmount.toString(),
          minDuration: contractParams.minDuration.toString(),
          maxDuration: contractParams.maxDuration.toString(),
          allowAdditionalProviders: contractParams.allowAdditionalProviders
        },
        totalSteps,
        currentStepIndex: stepIndex
      });

      // Step 4 (or 2): Simulate pool creation
      console.log('🧪 [createPool] Step 4/2: Simulating pool creation');
      
      onProgress?.({
        step: 'simulating_pool_creation',
        stepIndex: stepIndex++,
        totalSteps,
        message: 'Simulating pool creation transaction...'
      });

      const simulationConfig = {
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'createLiquidityPool',
        args: [contractParams]
      };

      console.log('🧪 [createPool] Pool creation simulation config', {
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        functionName: 'createLiquidityPool',
        argsPreview: {
          type: 'CreatePoolParams',
          initialLiquidity: contractParams.initialLiquidity.toString(),
          interestRate: contractParams.interestRate.toString()
        }
      });

      const simulationResult = await simulateTransaction(simulationConfig);
      
      console.log('🧪 [createPool] Pool creation simulation result', {
        success: simulationResult.success,
        error: simulationResult.error
      });
      
      if (!simulationResult.success) {
        throw new Error(`Pool creation simulation failed: ${simulationResult.error}`);
      }

      // Step 5 (or 3): Execute pool creation
      console.log('🚀 [createPool] Step 5/3: Executing pool creation');
      
      onProgress?.({
        step: 'creating_pool',
        stepIndex: stepIndex++,
        totalSteps,
        message: 'Please confirm the pool creation in your wallet...'
      });

      const hash = await writeSatoruLending({
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'createLiquidityPool',
        args: [contractParams]
      });
      
      console.log('🚀 [createPool] Pool creation execution result', {
        success: true,
        hash,
        contractAddress: CONTRACT_ADDRESSES.SATORU_LENDING
      });
      
      // Final success
      onProgress?.({
        step: 'creating_pool',
        stepIndex: stepIndex - 1,
        totalSteps,
        message: 'Pool created successfully!',
        txHash: hash
      });
      
      const finalResult = { 
        success: true, 
        hash,
        approvalHash,
        requiresApproval,
        message: requiresApproval 
          ? 'USDC approved and pool created successfully!'
          : 'Pool created successfully!'
      };
      
      console.log('🎉 [createPool] Pool creation completed successfully', {
        result: finalResult,
        totalSteps: totalSteps,
        timestamp: new Date().toISOString()
      });
      
      return finalResult;
    } catch (err: any) {
      const message = formatErrorMessage(err, 'Pool creation');
      
      console.error('❌ [createPool] Pool creation failed', {
        error: message,
        originalError: err,
        params,
        userAddress,
        skipApprovalCheck,
        timestamp: new Date().toISOString(),
        stack: err.stack
      });
      
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
      console.log('🏁 [createPool] Pool creation process ended', {
        timestamp: new Date().toISOString()
      });
    }
  }, [writeSatoruLending, simulateTransaction, approveUSDC, checkUSDCAllowance]);

  const addLiquidity = useCallback(async (
    poolId: string, 
    amount: string, 
    userAddress: Address,
    onProgress?: (progress: TransactionProgress) => void,
    skipApprovalCheck = false
  ): Promise<TransactionResult> => {
    console.log('🚀 [addLiquidity] Starting liquidity addition process', {
      poolId,
      amount,
      userAddress,
      skipApprovalCheck,
      timestamp: new Date().toISOString()
    });

    setIsLoading(true);
    setError(null);
    
    try {
      const amountBigInt = parseUnits(amount, 6); // USDC has 6 decimals
      let stepIndex = 0;
      let requiresApproval = false;
      let approvalHash: string | undefined;

      console.log('💰 [addLiquidity] Parsed liquidity amount', {
        originalAmount: amount,
        parsedAmount: amountBigInt.toString(),
        decimals: 6,
        poolId
      });

      // Step 1: Check current allowance (skip if this is a follow-up call after approval)
      if (!skipApprovalCheck) {
        console.log('🔍 [addLiquidity] Step 1: Checking USDC allowance');
        
        onProgress?.({
          step: 'checking_allowance',
          stepIndex: stepIndex++,
          totalSteps: 5, // Will adjust based on whether approval is needed
          message: 'Checking your USDC spending allowance...'
        });
        
        const currentAllowance = await checkUSDCAllowance(userAddress, CONTRACT_ADDRESSES.SATORU_LENDING);
        
        console.log('🔍 [addLiquidity] Allowance check result', {
          userAddress,
          spender: CONTRACT_ADDRESSES.SATORU_LENDING,
          currentAllowance: currentAllowance.toString(),
          requiredAmount: amountBigInt.toString(),
          isAllowanceSufficient: currentAllowance >= amountBigInt
        });
        
        requiresApproval = currentAllowance < amountBigInt;
        
        console.log('📋 [addLiquidity] Approval requirement determined', {
          requiresApproval,
          totalSteps: requiresApproval ? 5 : 3
        });
        
        onProgress?.({
          step: 'checking_allowance',
          stepIndex: 0,
          totalSteps: requiresApproval ? 5 : 3,
          message: requiresApproval 
            ? 'Insufficient USDC allowance detected. Approval required.'
            : 'USDC allowance sufficient. Proceeding to liquidity addition.'
        });
        
        // If allowance is insufficient, request approval
        if (requiresApproval) {
          console.log('✅ [addLiquidity] Step 2: Starting approval process');
          
          // Step 2: Simulate approval
          onProgress?.({
            step: 'simulating_approval',
            stepIndex: stepIndex++,
            totalSteps: 5,
            message: 'Simulating USDC approval transaction...'
          });
          
          const approvalSimulationConfig = {
            address: CONTRACT_ADDRESSES.USDC,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [CONTRACT_ADDRESSES.SATORU_LENDING, maxUint256]
          };

          console.log('🧪 [addLiquidity] Simulating USDC approval', {
            config: {
              address: CONTRACT_ADDRESSES.USDC,
              functionName: 'approve',
              spender: CONTRACT_ADDRESSES.SATORU_LENDING,
              amount: maxUint256.toString()
            }
          });

          const approvalSimulationResult = await simulateTransaction(approvalSimulationConfig);
          
          console.log('🧪 [addLiquidity] Approval simulation result', {
            success: approvalSimulationResult.success,
            error: approvalSimulationResult.error
          });
          
          if (!approvalSimulationResult.success) {
            throw new Error(`Approval simulation failed: ${approvalSimulationResult.error}`);
          }
          
          // Step 3: Execute approval
          console.log('📝 [addLiquidity] Step 3: Executing USDC approval');
          
          onProgress?.({
            step: 'approving_usdc',
            stepIndex: stepIndex++,
            totalSteps: 5,
            message: 'Please confirm the USDC approval in your wallet...'
          });
          
          const approvalResult = await approveUSDC(CONTRACT_ADDRESSES.SATORU_LENDING, maxUint256);
          
          console.log('📝 [addLiquidity] USDC approval execution result', {
            success: approvalResult.success,
            hash: approvalResult.hash,
            error: approvalResult.error
          });
          
          if (!approvalResult.success) {
            console.error('❌ [addLiquidity] USDC approval failed', approvalResult.error);
            return {
              success: false,
              error: approvalResult.error,
              requiresApproval: true
            };
          }
          
          approvalHash = approvalResult.hash;
          
          console.log('✅ [addLiquidity] USDC approval confirmed', {
            approvalHash,
            spender: CONTRACT_ADDRESSES.SATORU_LENDING,
            amount: maxUint256.toString()
          });
          
          onProgress?.({
            step: 'approving_usdc',
            stepIndex: stepIndex - 1,
            totalSteps: 5,
            message: 'USDC approval confirmed!',
            txHash: approvalHash
          });
        } else {
          // Adjust total steps if no approval needed
          stepIndex = 1; // Skip approval steps
        }
      }

      const totalSteps = requiresApproval ? 6 : 3;
      const args = [BigInt(poolId), amountBigInt] as const;

      console.log('🏗️ [addLiquidity] Prepared contract parameters', {
        poolId: args[0].toString(),
        amount: args[1].toString(),
        totalSteps,
        currentStepIndex: stepIndex
      });

      // Step 4 (or 2): Simulate liquidity addition
      console.log('🧪 [addLiquidity] Step 4/2: Simulating liquidity addition');
      
      onProgress?.({
        step: 'simulating_liquidity_addition',
        stepIndex: stepIndex++,
        totalSteps,
        message: 'Simulating liquidity addition transaction...'
      });

      const simulationConfig = {
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'addLiquidity',
        args
      };

      console.log('🧪 [addLiquidity] Simulation config', {
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        functionName: 'addLiquidity',
        poolId: args[0].toString(),
        amount: args[1].toString()
      });

      const simulationResult = await simulateTransaction(simulationConfig);
      
      console.log('🧪 [addLiquidity] Simulation result', {
        success: simulationResult.success,
        error: simulationResult.error
      });
      
      if (!simulationResult.success) {
        throw new Error(`Liquidity addition simulation failed: ${simulationResult.error}`);
      }

      // Step 5 (or 3): Execute liquidity addition
      console.log('🚀 [addLiquidity] Step 5/3: Executing liquidity addition');
      
      onProgress?.({
        step: 'adding_liquidity',
        stepIndex: stepIndex++,
        totalSteps,
        message: 'Please confirm the liquidity addition in your wallet...'
      });

      const hash = await writeSatoruLending({
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'addLiquidity',
        args
      });
      
      console.log('🚀 [addLiquidity] Execution result', {
        success: true,
        hash,
        contractAddress: CONTRACT_ADDRESSES.SATORU_LENDING
      });

      // Final success
      onProgress?.({
        step: 'adding_liquidity',
        stepIndex: stepIndex - 1,
        totalSteps,
        message: 'Liquidity added successfully!',
        txHash: hash
      });

      const finalResult = {
        success: true,
        hash,
        approvalHash,
        requiresApproval,
        message: requiresApproval 
          ? 'USDC approved and liquidity added successfully!'
          : 'Liquidity added successfully!'
      };

      console.log('🎉 [addLiquidity] Liquidity addition completed successfully', {
        result: finalResult,
        totalSteps: totalSteps,
        timestamp: new Date().toISOString()
      });

      return finalResult;
    } catch (err: any) {
      const message = err.message || 'Failed to add liquidity';
      
      console.error('❌ [addLiquidity] Liquidity addition failed', {
        error: message,
        originalError: err,
        poolId,
        amount,
        userAddress,
        skipApprovalCheck,
        timestamp: new Date().toISOString(),
        stack: err.stack
      });
      
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
      console.log('🏁 [addLiquidity] Liquidity addition process ended', {
        timestamp: new Date().toISOString()
      });
    }
  }, [writeSatoruLending, approveUSDC, checkUSDCAllowance, simulateTransaction]);

  // Auction Operations
  const placeBid = useCallback(async (auctionId: string, bidAmount: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const args = [BigInt(auctionId)] as const;
      const value = parseEther(bidAmount);

      // Simulate the transaction first
      const simulationConfig = {
        address: CONTRACT_ADDRESSES.DUTCH_AUCTION,
        abi: DUTCH_AUCTION_ABI,
        functionName: 'placeBid',
        args,
        value
      };

      const simulationResult = await simulateTransaction(simulationConfig);
      if (!simulationResult.success) {
        throw new Error(simulationResult.error);
      }

      const hash = await writeDutchAuction({
        address: CONTRACT_ADDRESSES.DUTCH_AUCTION,
        abi: DUTCH_AUCTION_ABI,
        functionName: 'placeBid',
        args,
        value
      });
      
      return { success: true, hash };
    } catch (err: any) {
      const message = err.message || 'Failed to place bid';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [writeDutchAuction, simulateTransaction]);

  const liquidateCollateral = useCallback(async (loanId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const args = [BigInt(loanId)] as const;

      // Simulate the transaction first
      const simulationConfig = {
        address: CONTRACT_ADDRESSES.LOAN_MANAGER,
        abi: LOAN_MANAGER_ABI,
        functionName: 'liquidateCollateral',
        args
      };

      const simulationResult = await simulateTransaction(simulationConfig);
      if (!simulationResult.success) {
        throw new Error(simulationResult.error);
      }

      const hash = await writeLoanManager({
        address: CONTRACT_ADDRESSES.LOAN_MANAGER,
        abi: LOAN_MANAGER_ABI,
        functionName: 'liquidateCollateral',
        args
      });
      
      return { success: true, hash };
    } catch (err: any) {
      const message = err.message || 'Failed to liquidate collateral';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [writeLoanManager, simulateTransaction]);

  // AI Oracle Operations
  const requestDomainScoring = useCallback(async (
    domainTokenId: string,
    onProgress?: (progress: TransactionProgress) => void
  ): Promise<TransactionResult & { requestId?: string }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const args = [BigInt(domainTokenId)] as const;
      let stepIndex = 0;
      let requiresApproval = false;
      let approvalHash: string | undefined;

      if (!address) {
        throw new Error('Wallet not connected');
      }

      // Step 1: Get payment token and fee from contract
      const [paymentTokenAddress, paidScoringFee] = await Promise.all([
        readContract(config, {
          address: CONTRACT_ADDRESSES.AI_ORACLE,
          abi: AI_ORACLE_ABI,
          functionName: 'paymentToken'
        }),
        readContract(config, {
          address: CONTRACT_ADDRESSES.AI_ORACLE,
          abi: AI_ORACLE_ABI,
          functionName: 'paidScoringFee'
        })
      ]);

      const feeBigInt = paidScoringFee as bigint;

      // Step 2: Check current allowance
      onProgress?.({
        step: 'checking_allowance',
        stepIndex: stepIndex++,
        totalSteps: 3, // Will adjust based on whether approval is needed
        message: 'Checking payment token allowance...'
      });

      const currentAllowance = await readContract(config, {
        address: paymentTokenAddress as Address,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, CONTRACT_ADDRESSES.AI_ORACLE]
      });

      requiresApproval = (currentAllowance as bigint) < feeBigInt;

      if (requiresApproval) {
        onProgress?.({
          step: 'approving_payment',
          stepIndex: stepIndex++,
          totalSteps: 4,
          message: 'Approving payment token...'
        });

        // Approve payment token
        const approvalResult = await writeERC20({
          address: paymentTokenAddress as Address,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.AI_ORACLE, feeBigInt]
        });

        if (!approvalResult) {
          throw new Error('Failed to approve payment token');
        }

        approvalHash = approvalResult;
      }

      // Step 3: Simulate the scoring request
      onProgress?.({
        step: 'simulating_request',
        stepIndex: stepIndex++,
        totalSteps: requiresApproval ? 4 : 3,
        message: 'Simulating scoring request...'
      });

      const simulationConfig = {
        address: CONTRACT_ADDRESSES.AI_ORACLE,
        abi: AI_ORACLE_ABI,
        functionName: 'paidScoreRequest',
        args
      };

      const simulationResult = await simulateTransaction(simulationConfig);
      if (!simulationResult.success) {
        throw new Error(simulationResult.error);
      }

      // Step 4: Execute the scoring request
      onProgress?.({
        step: 'requesting_scoring',
        stepIndex: stepIndex++,
        totalSteps: requiresApproval ? 4 : 3,
        message: 'Requesting domain scoring...'
      });

      const hash = await writeAIOracle({
        address: CONTRACT_ADDRESSES.AI_ORACLE,
        abi: AI_ORACLE_ABI,
        functionName: 'paidScoreRequest',
        args
      });

      // Wait for transaction receipt to get the requestId from events
      const receipt = await waitForTransactionReceipt(config, { hash });
      
      // Parse the PaidScoringRequested event to get requestId
      let requestId: string | undefined;
      for (const log of receipt.logs) {
        try {
          // This is a simplified event parsing - you might want to use a proper ABI decoder
          if (log.topics[0] && log.address.toLowerCase() === CONTRACT_ADDRESSES.AI_ORACLE.toLowerCase()) {
            // The requestId should be in the event data
            // For now, we'll just indicate success without the specific requestId
            requestId = 'pending'; // Could be extracted from event logs if needed
            break;
          }
        } catch {
          // Continue if log parsing fails
        }
      }
      
      return { 
        success: true, 
        hash, 
        requestId,
        approvalHash,
        requiresApproval
      };
    } catch (err: any) {
      const message = err.message || 'Failed to request domain scoring';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [writeAIOracle, writeERC20, simulateTransaction, config, address]);

  // Additional Pool Operations
  const removeLiquidity = useCallback(async (
    poolId: string, 
    sharePercentage: number,
    onProgress?: (progress: TransactionProgress) => void
  ): Promise<TransactionResult> => {
    console.log('🚀 [removeLiquidity] Starting liquidity removal process', {
      poolId,
      sharePercentage,
      timestamp: new Date().toISOString()
    });

    setIsLoading(true);
    setError(null);
    
    try {
      let stepIndex = 0;
      const totalSteps = 2;

      console.log('📊 [removeLiquidity] Prepared withdrawal parameters', {
        poolId,
        sharePercentage: sharePercentage.toString(),
        sharePercentageNote: 'Percentage of user\'s share to withdraw'
      });

      const args = [BigInt(poolId), BigInt(sharePercentage)] as const;

      console.log('🏗️ [removeLiquidity] Prepared contract parameters', {
        poolId: args[0].toString(),
        sharePercentage: args[1].toString(),
        totalSteps
      });

      // Step 1: Simulate liquidity removal
      console.log('🧪 [removeLiquidity] Step 1: Simulating liquidity removal');
      
      onProgress?.({
        step: 'simulating_liquidity_removal',
        stepIndex: stepIndex++,
        totalSteps,
        message: 'Simulating liquidity removal transaction...'
      });

      const simulationConfig = {
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'removeLiquidity',
        args
      };

      console.log('🧪 [removeLiquidity] Simulation config', {
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        functionName: 'removeLiquidity',
        poolId: args[0].toString(),
        sharePercentage: args[1].toString()
      });

      const simulationResult = await simulateTransaction(simulationConfig);
      
      console.log('🧪 [removeLiquidity] Simulation result', {
        success: simulationResult.success,
        error: simulationResult.error
      });
      
      if (!simulationResult.success) {
        throw new Error(`Liquidity removal simulation failed: ${simulationResult.error}`);
      }

      // Step 2: Execute liquidity removal
      console.log('🚀 [removeLiquidity] Step 2: Executing liquidity removal');
      
      onProgress?.({
        step: 'removing_liquidity',
        stepIndex: stepIndex++,
        totalSteps,
        message: 'Please confirm the liquidity removal in your wallet...'
      });

      const hash = await writeSatoruLending({
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'removeLiquidity',
        args
      });
      
      console.log('🚀 [removeLiquidity] Execution result', {
        success: true,
        hash,
        contractAddress: CONTRACT_ADDRESSES.SATORU_LENDING
      });

      // Final success
      onProgress?.({
        step: 'removing_liquidity',
        stepIndex: stepIndex - 1,
        totalSteps,
        message: 'Liquidity removed successfully!',
        txHash: hash
      });

      const finalResult = {
        success: true,
        hash,
        message: 'Liquidity removed successfully!'
      };

      console.log('🎉 [removeLiquidity] Liquidity removal completed successfully', {
        result: finalResult,
        totalSteps: totalSteps,
        timestamp: new Date().toISOString()
      });

      return finalResult;
    } catch (err: any) {
      const message = err.message || 'Failed to remove liquidity';
      
      console.error('❌ [removeLiquidity] Liquidity removal failed', {
        error: message,
        originalError: err,
        poolId,
        sharePercentage,
        timestamp: new Date().toISOString(),
        stack: err.stack
      });
      
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
      console.log('🏁 [removeLiquidity] Liquidity removal process ended', {
        timestamp: new Date().toISOString()
      });
    }
  }, [writeSatoruLending, simulateTransaction]);

  // Loan Request Operations
  const createLoanRequest = useCallback(async (
    domainTokenId: string,
    requestedAmount: string,
    proposedInterestRate: number,
    campaignDuration: number,
    repaymentDeadline: number,
    onProgress?: (progress: TransactionProgress) => void
  ): Promise<TransactionResult> => {
    console.log('🚀 [createLoanRequest] Starting loan request creation process', {
      domainTokenId,
      requestedAmount,
      proposedInterestRate,
      campaignDuration,
      repaymentDeadline,
      timestamp: new Date().toISOString()
    });

    setIsLoading(true);
    setError(null);
    
    try {
      const requestedAmountBigInt = parseUnits(requestedAmount, 6); // USDC has 6 decimals
      let stepIndex = 0;
      const totalSteps = 2;

      console.log('💰 [createLoanRequest] Parsed requested amount', {
        originalAmount: requestedAmount,
        parsedAmount: requestedAmountBigInt.toString(),
        decimals: 6
      });

      const args = [{
        domainTokenId: BigInt(domainTokenId),
        requestedAmount: requestedAmountBigInt,
        proposedInterestRate: BigInt(proposedInterestRate),
        campaignDuration: BigInt(campaignDuration),
        repaymentDeadline: BigInt(repaymentDeadline)
      }] as const;

      console.log('🏗️ [createLoanRequest] Prepared contract parameters', {
        contractParams: {
          domainTokenId: args[0].domainTokenId.toString(),
          requestedAmount: args[0].requestedAmount.toString(),
          proposedInterestRate: args[0].proposedInterestRate.toString(),
          campaignDuration: args[0].campaignDuration.toString(),
          repaymentDeadline: args[0].repaymentDeadline.toString()
        }
      });

      // Step 1: Simulate loan request creation
      console.log('🧪 [createLoanRequest] Step 1: Simulating loan request creation');
      
      onProgress?.({
        step: 'simulating_loan_request',
        stepIndex: stepIndex++,
        totalSteps,
        message: 'Simulating loan request creation...'
      });

      const simulationConfig = {
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'createLoanRequest',
        args
      };

      console.log('🧪 [createLoanRequest] Simulation config', {
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        functionName: 'createLoanRequest'
      });

      const simulationResult = await simulateTransaction(simulationConfig);
      
      console.log('🧪 [createLoanRequest] Simulation result', {
        success: simulationResult.success,
        error: simulationResult.error
      });
      
      if (!simulationResult.success) {
        throw new Error(`Loan request simulation failed: ${simulationResult.error}`);
      }

      // Step 2: Execute loan request creation
      console.log('🚀 [createLoanRequest] Step 2: Executing loan request creation');
      
      onProgress?.({
        step: 'creating_loan_request',
        stepIndex: stepIndex++,
        totalSteps,
        message: 'Please confirm the loan request creation in your wallet...'
      });

      const hash = await writeSatoruLending({
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'createLoanRequest',
        args
      });
      
      console.log('🚀 [createLoanRequest] Execution result', {
        success: true,
        hash,
        contractAddress: CONTRACT_ADDRESSES.SATORU_LENDING
      });

      // Final success
      onProgress?.({
        step: 'creating_loan_request',
        stepIndex: stepIndex - 1,
        totalSteps,
        message: 'Loan request created successfully!',
        txHash: hash
      });

      const finalResult = {
        success: true,
        hash,
        message: 'Loan request created successfully!'
      };

      console.log('🎉 [createLoanRequest] Loan request creation completed successfully', {
        result: finalResult,
        timestamp: new Date().toISOString()
      });

      return finalResult;
    } catch (err: any) {
      const message = err.message || 'Failed to create loan request';
      
      console.error('❌ [createLoanRequest] Loan request creation failed', {
        error: message,
        originalError: err,
        domainTokenId,
        requestedAmount,
        timestamp: new Date().toISOString(),
        stack: err.stack
      });
      
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
      console.log('🏁 [createLoanRequest] Loan request creation process ended', {
        timestamp: new Date().toISOString()
      });
    }
  }, [writeSatoruLending, simulateTransaction]);

  const fundLoanRequest = useCallback(async (
    requestId: string, 
    amount: string, 
    userAddress: Address,
    onProgress?: (progress: TransactionProgress) => void,
    skipApprovalCheck = false
  ): Promise<TransactionResult> => {
    console.log('🚀 [fundLoanRequest] Starting loan funding process', {
      requestId,
      amount,
      userAddress,
      skipApprovalCheck,
      timestamp: new Date().toISOString()
    });

    setIsLoading(true);
    setError(null);
    
    try {
      const amountBigInt = parseUnits(amount, 6); // USDC has 6 decimals
      let stepIndex = 0;
      let requiresApproval = false;
      let approvalHash: string | undefined;

      console.log('💰 [fundLoanRequest] Parsed funding amount', {
        originalAmount: amount,
        parsedAmount: amountBigInt.toString(),
        decimals: 6,
        requestId
      });

      // Step 1: Check current allowance (skip if this is a follow-up call after approval)
      if (!skipApprovalCheck) {
        console.log('🔍 [fundLoanRequest] Step 1: Checking USDC allowance');
        
        onProgress?.({
          step: 'checking_allowance',
          stepIndex: stepIndex++,
          totalSteps: 5, // Will adjust based on whether approval is needed
          message: 'Checking your USDC spending allowance...'
        });
        
        const currentAllowance = await checkUSDCAllowance(userAddress, CONTRACT_ADDRESSES.SATORU_LENDING);
        
        console.log('🔍 [fundLoanRequest] Allowance check result', {
          userAddress,
          spender: CONTRACT_ADDRESSES.SATORU_LENDING,
          currentAllowance: currentAllowance.toString(),
          requiredAmount: amountBigInt.toString(),
          isAllowanceSufficient: currentAllowance >= amountBigInt
        });
        
        requiresApproval = currentAllowance < amountBigInt;
        
        console.log('📋 [fundLoanRequest] Approval requirement determined', {
          requiresApproval,
          totalSteps: requiresApproval ? 5 : 3
        });
        
        onProgress?.({
          step: 'checking_allowance',
          stepIndex: 0,
          totalSteps: requiresApproval ? 5 : 3,
          message: requiresApproval 
            ? 'Insufficient USDC allowance detected. Approval required.'
            : 'USDC allowance sufficient. Proceeding to loan funding.'
        });
        
        // If allowance is insufficient, request approval
        if (requiresApproval) {
          console.log('✅ [fundLoanRequest] Step 2: Starting approval process');
          
          // Step 2: Simulate approval
          onProgress?.({
            step: 'simulating_approval',
            stepIndex: stepIndex++,
            totalSteps: 5,
            message: 'Simulating USDC approval transaction...'
          });
          
          const approvalSimulationConfig = {
            address: CONTRACT_ADDRESSES.USDC,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [CONTRACT_ADDRESSES.SATORU_LENDING, maxUint256]
          };

          console.log('🧪 [fundLoanRequest] Simulating USDC approval', {
            config: {
              address: CONTRACT_ADDRESSES.USDC,
              functionName: 'approve',
              spender: CONTRACT_ADDRESSES.SATORU_LENDING,
              amount: maxUint256.toString()
            }
          });

          const approvalSimulationResult = await simulateTransaction(approvalSimulationConfig);
          
          console.log('🧪 [fundLoanRequest] Approval simulation result', {
            success: approvalSimulationResult.success,
            error: approvalSimulationResult.error
          });
          
          if (!approvalSimulationResult.success) {
            throw new Error(`Approval simulation failed: ${approvalSimulationResult.error}`);
          }
          
          // Step 3: Execute approval
          console.log('📝 [fundLoanRequest] Step 3: Executing USDC approval');
          
          onProgress?.({
            step: 'approving_usdc',
            stepIndex: stepIndex++,
            totalSteps: 5,
            message: 'Please confirm the USDC approval in your wallet...'
          });
          
          const approvalResult = await approveUSDC(CONTRACT_ADDRESSES.SATORU_LENDING, maxUint256);
          
          console.log('📝 [fundLoanRequest] USDC approval execution result', {
            success: approvalResult.success,
            hash: approvalResult.hash,
            error: approvalResult.error
          });
          
          if (!approvalResult.success) {
            console.error('❌ [fundLoanRequest] USDC approval failed', approvalResult.error);
            return {
              success: false,
              error: approvalResult.error,
              requiresApproval: true
            };
          }
          
          approvalHash = approvalResult.hash;
          
          console.log('✅ [fundLoanRequest] USDC approval confirmed', {
            approvalHash,
            spender: CONTRACT_ADDRESSES.SATORU_LENDING,
            amount: maxUint256.toString()
          });
          
          onProgress?.({
            step: 'approving_usdc',
            stepIndex: stepIndex - 1,
            totalSteps: 5,
            message: 'USDC approval confirmed!',
            txHash: approvalHash
          });
        } else {
          // Adjust total steps if no approval needed
          stepIndex = 1; // Skip approval steps
        }
      }

      const totalSteps = requiresApproval ? 6 : 3;
      const args = [BigInt(requestId), amountBigInt] as const;

      console.log('🏗️ [fundLoanRequest] Prepared contract parameters', {
        requestId: args[0].toString(),
        amount: args[1].toString(),
        totalSteps,
        currentStepIndex: stepIndex
      });

      // Step 4 (or 2): Simulate loan funding
      console.log('🧪 [fundLoanRequest] Step 4/2: Simulating loan funding');
      
      onProgress?.({
        step: 'simulating_loan_funding',
        stepIndex: stepIndex++,
        totalSteps,
        message: 'Simulating loan funding transaction...'
      });

      const simulationConfig = {
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'fundLoanRequest',
        args
      };

      console.log('🧪 [fundLoanRequest] Simulation config', {
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        functionName: 'fundLoanRequest',
        requestId: args[0].toString(),
        amount: args[1].toString()
      });

      const simulationResult = await simulateTransaction(simulationConfig);
      
      console.log('🧪 [fundLoanRequest] Simulation result', {
        success: simulationResult.success,
        error: simulationResult.error
      });
      
      if (!simulationResult.success) {
        throw new Error(`Loan funding simulation failed: ${simulationResult.error}`);
      }

      // Step 5 (or 3): Execute loan funding
      console.log('🚀 [fundLoanRequest] Step 5/3: Executing loan funding');
      
      onProgress?.({
        step: 'funding_loan',
        stepIndex: stepIndex++,
        totalSteps,
        message: 'Please confirm the loan funding in your wallet...'
      });

      const hash = await writeSatoruLending({
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'fundLoanRequest',
        args
      });
      
      console.log('🚀 [fundLoanRequest] Execution result', {
        success: true,
        hash,
        contractAddress: CONTRACT_ADDRESSES.SATORU_LENDING
      });

      // Final success
      onProgress?.({
        step: 'funding_loan',
        stepIndex: stepIndex - 1,
        totalSteps,
        message: 'Loan funded successfully!',
        txHash: hash
      });

      const finalResult = {
        success: true,
        hash,
        approvalHash,
        requiresApproval,
        message: requiresApproval 
          ? 'USDC approved and loan funded successfully!'
          : 'Loan funded successfully!'
      };

      console.log('🎉 [fundLoanRequest] Loan funding completed successfully', {
        result: finalResult,
        totalSteps: totalSteps,
        timestamp: new Date().toISOString()
      });

      return finalResult;
    } catch (err: any) {
      const message = err.message || 'Failed to fund loan request';
      
      console.error('❌ [fundLoanRequest] Loan funding failed', {
        error: message,
        originalError: err,
        requestId,
        amount,
        userAddress,
        skipApprovalCheck,
        timestamp: new Date().toISOString(),
        stack: err.stack
      });
      
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
      console.log('🏁 [fundLoanRequest] Loan funding process ended', {
        timestamp: new Date().toISOString()
      });
    }
  }, [writeSatoruLending, approveUSDC, checkUSDCAllowance, simulateTransaction]);

  const cancelLoanRequest = useCallback(async (requestId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const args = [BigInt(requestId)] as const;

      // Simulate the transaction first
      const simulationConfig = {
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'cancelLoanRequest',
        args
      };

      const simulationResult = await simulateTransaction(simulationConfig);
      if (!simulationResult.success) {
        throw new Error(simulationResult.error);
      }

      const hash = await writeSatoruLending({
        address: CONTRACT_ADDRESSES.SATORU_LENDING,
        abi: SATORU_LENDING_ABI,
        functionName: 'cancelLoanRequest',
        args
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
  const { data: poolData, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESSES.SATORU_LENDING,
    abi: SATORU_LENDING_ABI,
    functionName: 'getPoolInfo',
    args: poolId ? [BigInt(poolId)] : undefined,
    query: {
      enabled: !!poolId
    }
  });

  const pool = poolData ? {
    id: BigInt(poolId || '0'),
    creator: poolData[0] as Address,
    totalLiquidity: poolData[1] as bigint,
    availableLiquidity: poolData[2] as bigint,
    minAiScore: poolData[3] as bigint,
    interestRate: poolData[4] as bigint,
    isActive: poolData[5] as boolean,
    totalLoansIssued: poolData[6] as bigint,
    // These are not returned by getPoolInfo, would need separate calls or contract updates
    maxDomainExpiration: BigInt(0),
    minLoanAmount: BigInt(0),
    maxLoanAmount: BigInt(0),
    minDuration: BigInt(0),
    maxDuration: BigInt(0),
    allowAdditionalProviders: false
  } as Pool : undefined;

  return {
    pool,
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

  const [score, isValid, timestamp] = data as [bigint, boolean, bigint] || [BigInt(0), false, BigInt(0)];

  return {
    score: Number(score),
    isValid: isValid || false,
    timestamp: Number(timestamp),
    isLoading,
    error
  };
}

// Hook for checking if domain has valid score (same as hasValidScore in contract)
export function useHasValidScore(domainTokenId: string | undefined) {
  const { data: hasValid, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESSES.AI_ORACLE,
    abi: AI_ORACLE_ABI,
    functionName: 'hasValidScore',
    args: domainTokenId ? [BigInt(domainTokenId)] : undefined,
    query: {
      enabled: !!domainTokenId
    }
  });

  return {
    hasValidScore: hasValid as boolean || false,
    isLoading,
    error
  };
}

// Hook for getting score age
export function useScoreAge(domainTokenId: string | undefined) {
  const { data: ageInSeconds, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESSES.AI_ORACLE,
    abi: AI_ORACLE_ABI,
    functionName: 'getScoreAge',
    args: domainTokenId ? [BigInt(domainTokenId)] : undefined,
    query: {
      enabled: !!domainTokenId
    }
  });

  return {
    ageInSeconds: Number(ageInSeconds || 0),
    ageInHours: Number(ageInSeconds || 0) / 3600,
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
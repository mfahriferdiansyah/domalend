import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LiquidityProgress } from '@/components/ui/liquidity-progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SiteIcon } from '@/components/ui/site-icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TransactionStep, transactionSteps } from '@/components/ui/transaction-progress';
import { usePool as usePoolRaw, useUserDomains, useUserScoredDomains } from '@/hooks/useDomaLendApi';
import { useUserDomainsWithScoring } from '@/hooks/useUserDomainsWithScoring';
import { usePoolById } from '@/hooks/usePoolData';
import { TransactionProgress, useDomainScore, useDomaLend, useInstantLoanEligibility, useUSDCAllowance, useUSDCBalance } from '@/hooks/web3/domalend/useDomaLend';
import { useUserPoolShares } from '@/hooks/web3/domalend/useUserPoolShares';
import { formatBasisPoints, formatUSDC } from '@/utils/formatting';
import {
  AlertCircle,
  ArrowLeft,
  DollarSign,
  Droplets,
  History,
  TrendingUp,
  Users,
  X
} from 'lucide-react';
import { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';

// Helper function to format APY with smart detection
const formatAPY = (apy: string | number | undefined, interestRate?: string | number): string => {
  // Use interestRate first if available (raw basis points)
  if (interestRate) {
    return formatBasisPoints(interestRate) + '%';
  }

  if (!apy) return '0.00%';

  // Remove % symbol if present and parse
  const apyStr = apy.toString().replace('%', '');
  const apyNum = parseFloat(apyStr);

  if (isNaN(apyNum)) return '0.00%';

  // If value is greater than 100, likely basis points
  if (apyNum > 100) {
    return formatBasisPoints(apyNum) + '%';
  }

  // Otherwise treat as already formatted percentage
  return apyNum.toFixed(2) + '%';
};

const PoolDetailPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const poolId = typeof id === 'string' ? id : '';

  const { data: pool, loading, error } = usePoolById(poolId);
  const { data: rawPoolData, loading: rawDataLoading, error: rawDataError } = usePoolRaw(poolId, true, true); // Include both loans and history

  // Debug pool history data
  const { addLiquidity, removeLiquidity, requestLoan, isLoading: isTransactionLoading, error: transactionError, contracts } = useDomaLend();
  const { address } = useAccount();
  const { data: userDomainsData } = useUserDomains(address);
  const { data: userScoredDomainsData } = useUserScoredDomains(address);
  const { eligibleDomains, domainScoringStatus, loading: domainsLoading, error: domainsError, refresh: refreshDomains } = useUserDomainsWithScoring(address);

  // USDC related hooks
  const { allowance: usdcAllowance } = useUSDCAllowance(address, contracts.SATORU_LENDING);
  const { balance: usdcBalance } = useUSDCBalance(address);
  
  // User liquidity position hook
  const { userLiquidityData, hasLiquidity } = useUserPoolShares(poolId);

  const [liquidityAmount, setLiquidityAmount] = useState('');
  const [withdrawPercentage, setWithdrawPercentage] = useState('');

  // Dialog states
  const [addLiquidityDialogOpen, setAddLiquidityDialogOpen] = useState(false);
  const [withdrawLiquidityDialogOpen, setWithdrawLiquidityDialogOpen] = useState(false);
  const [dialogLiquidityAmount, setDialogLiquidityAmount] = useState('');
  const [dialogWithdrawPercentage, setDialogWithdrawPercentage] = useState('');

  // Progress dialog states
  const [isAddLiquidityProgressOpen, setIsAddLiquidityProgressOpen] = useState(false);
  const [addLiquiditySteps, setAddLiquiditySteps] = useState<TransactionStep[]>([]);
  const [currentAddLiquidityStep, setCurrentAddLiquidityStep] = useState<string>('');
  const [isAddLiquidityCompleted, setIsAddLiquidityCompleted] = useState(false);
  const [addLiquidityError, setAddLiquidityError] = useState<string>('');

  const [isRemoveLiquidityProgressOpen, setIsRemoveLiquidityProgressOpen] = useState(false);
  const [removeLiquiditySteps, setRemoveLiquiditySteps] = useState<TransactionStep[]>([]);
  const [currentRemoveLiquidityStep, setCurrentRemoveLiquidityStep] = useState<string>('');
  const [isRemoveLiquidityCompleted, setIsRemoveLiquidityCompleted] = useState(false);
  const [removeLiquidityError, setRemoveLiquidityError] = useState<string>('');

  // Helper functions for progress steps
  const initializeAddLiquiditySteps = (requiresApproval: boolean): TransactionStep[] => {
    return requiresApproval 
      ? [...transactionSteps.addLiquidity.withApproval]
      : [...transactionSteps.addLiquidity.withoutApproval];
  };

  const updateAddLiquidityStep = (stepId: string, status: TransactionStep['status'], txHash?: string) => {
    setAddLiquiditySteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, txHash }
        : step
    ));
  };

  const handleAddLiquidityProgress = (progress: TransactionProgress) => {
    setCurrentAddLiquidityStep(progress.step);
    
    // After checking allowance, adjust steps if no approval is needed
    if (progress.step === 'checking_allowance' && !progress.txHash) {
      if (progress.message.includes('sufficient')) {
        const stepsWithoutApproval = initializeAddLiquiditySteps(false);
        stepsWithoutApproval[0].status = 'completed';
        setAddLiquiditySteps(stepsWithoutApproval);
        return;
      }
    }
    
    // Update current step to in_progress
    updateAddLiquidityStep(progress.step, 'in_progress');
    
    // If there's a transaction hash, mark as completed
    if (progress.txHash) {
      updateAddLiquidityStep(progress.step, 'completed', progress.txHash);
    }
  };

  const initializeRemoveLiquiditySteps = (): TransactionStep[] => {
    return [...transactionSteps.removeLiquidity];
  };

  const updateRemoveLiquidityStep = (stepId: string, status: TransactionStep['status'], txHash?: string) => {
    setRemoveLiquiditySteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, txHash }
        : step
    ));
  };

  const handleRemoveLiquidityProgress = (progress: TransactionProgress) => {
    setCurrentRemoveLiquidityStep(progress.step);
    
    // Update current step to in_progress
    updateRemoveLiquidityStep(progress.step, 'in_progress');
    
    // If there's a transaction hash, mark as completed
    if (progress.txHash) {
      updateRemoveLiquidityStep(progress.step, 'completed', progress.txHash);
    }
  };

  // Instant loan state
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanDuration, setLoanDuration] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState('loans');

  const userOwnedDomains = userDomainsData?.ownedNFTs || [];
  const userScoredDomains = userScoredDomainsData?.scoredDomains || [];

  // Use the new filtered domains that are eligible for loans
  // This includes proper scoring verification and collateral usage checks
  const userDomains = eligibleDomains;

  // Debug logging with enhanced domain analysis
  console.log('Pool Detail Debug:', {
    address,
    userOwnedDomains: userOwnedDomains.length,
    userScoredDomains: userScoredDomains.length,
    eligibleDomainsForLoan: userDomains.length,
    selectedDomainId,
    domainScoringStatus,
    eligibleDomainsList: userDomains.map((d: any) => ({
      name: d.name,
      tokenId: d.tokenId,
      latestScore: d.analytics?.latestAiScore,
      hasCompletedScoring: !!d.scoringHistory?.some((e: any) => e.status === 'completed')
    }))
  });

  // Check loan eligibility
  const { eligible, reason, isLoading: isCheckingEligibility } = useInstantLoanEligibility(
    selectedDomainId,
    poolId,
    loanAmount
  );
  
  // Debug: Check smart contract score vs indexer score
  const { score: contractScore, timestamp: contractTimestamp } = useDomainScore(selectedDomainId);
  const selectedDomain = userDomains.find((d: any) => d.tokenId === selectedDomainId);
  
  // Log comparison between contract and indexer scores
  if (selectedDomainId) {
    console.log('🔍 Score Comparison Debug:', {
      domainId: selectedDomainId,
      contractScore,
      contractTimestamp,
      hasAnalytics: !!selectedDomain?.analytics,
      analyticsScore: selectedDomain?.analytics?.latestAiScore,
      hasScoringHistory: !!selectedDomain?.scoringHistory?.length,
      scoringEvents: selectedDomain?.scoringHistory
    });
  }

  // Debug eligibility check
  console.log('Eligibility Debug:', {
    selectedDomainId,
    poolId,
    loanAmount,
    eligible,
    reason,
    isCheckingEligibility
  });

  // Helper function for score color badges
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 75) return 'bg-blue-100 text-blue-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Helper function to truncate token ID
  const truncateTokenId = (tokenId: string, startChars = 8, endChars = 6) => {
    if (!tokenId) return 'N/A';
    if (tokenId.length <= startChars + endChars) return tokenId;
    return `${tokenId.slice(0, startChars)}...${tokenId.slice(-endChars)}`;
  };

  // Helper function to get domain status for non-eligible domains
  const getDomainStatusInfo = (domain: any) => {
    const status = domainScoringStatus.find(s => s.tokenId === domain.tokenId);
    if (!status) return { text: 'Unknown', color: 'gray' };
    
    if (!status.hasAnalytics) return { text: 'Not scored', color: 'gray' };
    if (!status.hasScoringEvents) return { text: 'Scoring incomplete', color: 'orange' };
    if (!status.hasCompletedScoring) return { text: 'Scoring in progress', color: 'blue' };
    if (status.isUsedAsCollateral) return { text: 'Used as collateral', color: 'red' };
    if (status.isLiquidated) return { text: 'Liquidated', color: 'red' };
    if (status.latestScore <= 0) return { text: 'Invalid score', color: 'red' };
    return { text: 'Eligible', color: 'green' };
  };

  const handleAddLiquidity = async () => {
    if (!liquidityAmount || !poolId || !address) {
      toast.error('Please enter a valid amount and connect your wallet');
      return;
    }

    try {
      // Open progress dialog
      setIsAddLiquidityProgressOpen(true);
      setIsAddLiquidityCompleted(false);
      setAddLiquidityError('');
      
      // Initialize with default steps (will be updated based on approval needs)
      const initialSteps = initializeAddLiquiditySteps(true); // Start with approval assumption
      setAddLiquiditySteps(initialSteps);

      const result = await addLiquidity(poolId, liquidityAmount, address, handleAddLiquidityProgress);

      if (result.success) {
        // Mark all remaining steps as completed
        setAddLiquiditySteps(prev => prev.map(step => 
          step.status === 'pending' || step.status === 'in_progress' 
            ? { ...step, status: 'completed' }
            : step
        ));
        
        setIsAddLiquidityCompleted(true);
        setLiquidityAmount('');
        
        toast.success(result.message || 'Liquidity added successfully!');
      } else {
        throw new Error(result.error || 'Failed to add liquidity');
      }
    } catch (error: any) {
      console.error('Error adding liquidity:', error);
      setAddLiquidityError(error.message || 'Failed to add liquidity. Please try again.');
      
      // Mark current step as failed
      if (currentAddLiquidityStep) {
        updateAddLiquidityStep(currentAddLiquidityStep, 'failed');
      }
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!withdrawPercentage || !poolId) {
      toast.error('Please enter a valid percentage');
      return;
    }

    const percentage = parseInt(withdrawPercentage);
    if (percentage < 1 || percentage > 100) {
      toast.error('Percentage must be between 1 and 100');
      return;
    }

    try {
      // Open progress dialog
      setIsRemoveLiquidityProgressOpen(true);
      setIsRemoveLiquidityCompleted(false);
      setRemoveLiquidityError('');
      
      // Initialize steps for liquidity removal
      const initialSteps = initializeRemoveLiquiditySteps();
      setRemoveLiquiditySteps(initialSteps);

      const result = await removeLiquidity(poolId, percentage, handleRemoveLiquidityProgress);

      if (result.success) {
        // Mark all remaining steps as completed
        setRemoveLiquiditySteps(prev => prev.map(step => 
          step.status === 'pending' || step.status === 'in_progress' 
            ? { ...step, status: 'completed' }
            : step
        ));
        
        setIsRemoveLiquidityCompleted(true);
        setWithdrawPercentage('');
        
        toast.success(result.message || 'Liquidity removed successfully!');
      } else {
        throw new Error(result.error || 'Failed to remove liquidity');
      }
    } catch (error: any) {
      console.error('Error removing liquidity:', error);
      setRemoveLiquidityError(error.message || 'Failed to remove liquidity. Please try again.');
      
      // Mark current step as failed
      if (currentRemoveLiquidityStep) {
        updateRemoveLiquidityStep(currentRemoveLiquidityStep, 'failed');
      }
    }
  };

  const handleRequestInstantLoan = async () => {
    if (!selectedDomainId || !loanAmount || !loanDuration || !poolId) {
      toast.error('Please fill in all loan details');
      return;
    }

    if (!eligible) {
      toast.error(`Loan not eligible: ${reason}`);
      return;
    }

    try {
      const result = await requestLoan(
        selectedDomainId,
        loanAmount,
        parseInt(loanDuration),
        poolId
      );

      if (result.success) {
        toast.success(`Instant loan request submitted! Transaction hash: ${result.hash}`);
        setSelectedDomainId('');
        setLoanAmount('');
        setLoanDuration('');
      } else {
        throw new Error(result.error || 'Failed to request instant loan');
      }
    } catch (error) {
      console.error('Error requesting instant loan:', error);
      toast.error('Failed to request instant loan. Please try again.');
    }
  };

  // Dialog handlers
  const handleAddLiquidityFromDialog = async () => {
    if (!dialogLiquidityAmount || !poolId || !address) {
      toast.error('Please enter a valid amount and connect your wallet');
      return;
    }

    try {
      // Close the input dialog and open progress dialog
      setAddLiquidityDialogOpen(false);
      setIsAddLiquidityProgressOpen(true);
      setIsAddLiquidityCompleted(false);
      setAddLiquidityError('');
      
      // Initialize with default steps (will be updated based on approval needs)
      const initialSteps = initializeAddLiquiditySteps(true); // Start with approval assumption
      setAddLiquiditySteps(initialSteps);

      const result = await addLiquidity(poolId, dialogLiquidityAmount, address, handleAddLiquidityProgress);

      if (result.success) {
        // Mark all remaining steps as completed
        setAddLiquiditySteps(prev => prev.map(step => 
          step.status === 'pending' || step.status === 'in_progress' 
            ? { ...step, status: 'completed' }
            : step
        ));
        
        setIsAddLiquidityCompleted(true);
        setDialogLiquidityAmount('');
        
        toast.success(result.message || 'Liquidity added successfully!');
      } else {
        throw new Error(result.error || 'Failed to add liquidity');
      }
    } catch (error: any) {
      console.error('Error adding liquidity:', error);
      setAddLiquidityError(error.message || 'Failed to add liquidity. Please try again.');
      
      // Mark current step as failed
      if (currentAddLiquidityStep) {
        updateAddLiquidityStep(currentAddLiquidityStep, 'failed');
      }
    }
  };

  const handleRemoveLiquidityFromDialog = async () => {
    if (!dialogWithdrawPercentage || !poolId) {
      toast.error('Please enter a valid percentage');
      return;
    }

    const percentage = parseInt(dialogWithdrawPercentage);
    if (percentage < 1 || percentage > 100) {
      toast.error('Percentage must be between 1 and 100');
      return;
    }

    try {
      // Close the input dialog and open progress dialog
      setWithdrawLiquidityDialogOpen(false);
      setIsRemoveLiquidityProgressOpen(true);
      setIsRemoveLiquidityCompleted(false);
      setRemoveLiquidityError('');
      
      // Initialize steps for liquidity removal
      const initialSteps = initializeRemoveLiquiditySteps();
      setRemoveLiquiditySteps(initialSteps);

      const result = await removeLiquidity(poolId, percentage, handleRemoveLiquidityProgress);

      if (result.success) {
        // Mark all remaining steps as completed
        setRemoveLiquiditySteps(prev => prev.map(step => 
          step.status === 'pending' || step.status === 'in_progress' 
            ? { ...step, status: 'completed' }
            : step
        ));
        
        setIsRemoveLiquidityCompleted(true);
        setDialogWithdrawPercentage('');
        
        toast.success(result.message || 'Liquidity removed successfully!');
      } else {
        throw new Error(result.error || 'Failed to remove liquidity');
      }
    } catch (error: any) {
      console.error('Error removing liquidity:', error);
      setRemoveLiquidityError(error.message || 'Failed to remove liquidity. Please try again.');
      
      // Mark current step as failed
      if (currentRemoveLiquidityStep) {
        updateRemoveLiquidityStep(currentRemoveLiquidityStep, 'failed');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="h-96 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-6">
                <div className="h-48 bg-gray-200 rounded"></div>
                <div className="h-48 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !pool) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-12">
            <Link href="/explore" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pools
            </Link>
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Pool Not Found</h2>
            <p className="text-gray-600 mb-4">
              {error || 'The requested pool could not be found.'}
            </p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link href="/explore" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pools
          </Link>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{pool.poolName}</h1>
              <div className="flex items-center gap-4">
                <Badge
                  className={
                    pool.poolType === 'instant'
                      ? 'bg-green-100 text-green-800'
                      : pool.poolType === 'custom'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                  }
                >
                  {pool.poolType} Pool
                </Badge>
                <span className="text-sm text-gray-500">Pool ID: {pool.poolId}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setWithdrawLiquidityDialogOpen(true)}
                disabled={isTransactionLoading || !hasLiquidity}
                title={!hasLiquidity ? "You don't have any liquidity in this pool" : undefined}
              >
                Withdraw Liquidity
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setActiveTab('request');
                  // Scroll to the tabs section
                  setTimeout(() => {
                    const tabsElement = document.querySelector('.w-full');
                    if (tabsElement) {
                      tabsElement.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 100);
                }}
                disabled={isTransactionLoading}
              >
                Request Loan
              </Button>
              <Button
                onClick={() => setAddLiquidityDialogOpen(true)}
                disabled={isTransactionLoading}
              >
                Add Liquidity
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Pool Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Pool Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-white rounded-lg">
                    <Droplets className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-lg font-bold">${formatUSDC(pool.totalLiquidity || '0')}</div>
                    <div className="text-sm text-gray-600">Total Liquidity</div>
                  </div>

                  <div className="text-center p-4 bg-white rounded-lg">
                    <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-lg font-bold text-blue-700">{formatAPY(pool.apy, pool.interestRate)}</div>
                    <div className="text-sm text-gray-600">Current APY</div>
                  </div>

                  <div className="text-center p-4 bg-white rounded-lg">
                    <DollarSign className="h-8 w-8 text-blue-700 mx-auto mb-2" />
                    <div className="text-lg font-bold">${formatUSDC(pool.availableLiquidity || '0')}</div>
                    <div className="text-sm text-gray-600">Available</div>
                  </div>

                  <div className="text-center p-4 bg-white rounded-lg">
                    <Users className="h-8 w-8 text-blue-800 mx-auto mb-2" />
                    <div className="text-lg font-bold">{rawPoolData?.pool?.activeLoans || pool.loans?.length || 0}</div>
                    <div className="text-sm text-gray-600">Active Loans</div>
                  </div>
                </div>

                {/* Utilization Rate Progress Bar */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Utilization Rate</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {(() => {
                        const total = parseInt(pool.totalLiquidity || '0');
                        const available = parseInt(pool.availableLiquidity || '0');
                        const utilized = total - available;
                        const utilizationRate = total > 0 ? (utilized / total) * 100 : 0;
                        return `${utilizationRate.toFixed(1)}%`;
                      })()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${(() => {
                          const total = parseInt(pool.totalLiquidity || '0');
                          const available = parseInt(pool.availableLiquidity || '0');
                          const utilized = total - available;
                          const utilizationRate = total > 0 ? (utilized / total) * 100 : 0;
                          return Math.min(utilizationRate, 100);
                        })()}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>
                      Utilized: ${(() => {
                        const total = parseInt(pool.totalLiquidity || '0');
                        const available = parseInt(pool.availableLiquidity || '0');
                        const utilized = total - available;
                        return formatUSDC(utilized);
                      })()}
                    </span>
                    <span>
                      Total: ${formatUSDC(pool.totalLiquidity || '0')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pool Details Tabs */}
            <Card>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <CardHeader>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="loans">Active Loans</TabsTrigger>
                    <TabsTrigger value="request">Request Loan</TabsTrigger>
                    <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>
                </CardHeader>

                <CardContent>
                  <TabsContent value="loans" className="space-y-4">
                    {pool.loans && pool.loans.length > 0 ? (
                      <div className="space-y-3">
                        {pool.loans.map((loan) => (
                          <div key={loan.loanId} className="p-4 border rounded-lg hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <SiteIcon
                                  domain={loan.domainName}
                                  size={24}
                                  className="flex-shrink-0"
                                />
                                <div>
                                  <Link
                                    href={`/domain/${loan.domainTokenId}`}
                                    className="font-semibold text-blue-600 hover:text-blue-800"
                                  >
                                    {loan.domainName}
                                  </Link>
                                  <div className="text-sm text-gray-600">
                                    Borrower: {loan.borrower.slice(0, 6)}...{loan.borrower.slice(-4)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(loan.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">${formatUSDC(loan.amount)}</div>
                                <Badge className={
                                  loan.status === 'active' ? 'bg-green-100 text-green-800' :
                                    loan.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                }>
                                  {loan.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No active loans in this pool</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="request" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          Request Instant Loan
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {!address && (
                          <Alert className="border-yellow-200 bg-yellow-50">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-yellow-800">
                              Please connect your wallet to request a loan
                            </AlertDescription>
                          </Alert>
                        )}

                        {address && domainsLoading && (
                          <Alert className="border-blue-200 bg-blue-50">
                            <AlertCircle className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-800">
                              <div className="flex items-center gap-2">
                                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                Loading your domains and checking eligibility...
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}

                        {address && domainsError && (
                          <Alert className="border-red-200 bg-red-50">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                              <div className="flex items-center justify-between">
                                <span>Failed to load domains: {domainsError}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={refreshDomains}
                                  className="text-xs px-2 py-1 h-6 ml-2"
                                >
                                  Retry
                                </Button>
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}

                        {address && userDomains.length === 0 && !domainsLoading && (
                          <Alert className="border-amber-200 bg-amber-50">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-800">
                              {userOwnedDomains.length === 0 ? (
                                <>
                                  You don&apos;t own any domains yet. 
                                  <Link href="/domains" className="underline hover:text-amber-900 ml-1">
                                    View available domains
                                  </Link>
                                </>
                              ) : (
                                <>
                                  No domains are eligible for instant loans. Domains must be properly scored and not currently used as collateral.
                                  <br />
                                  <Link href="/domains/add" className="underline hover:text-amber-900 ml-1">
                                    Score your domains here
                                  </Link>
                                  {domainScoringStatus.length > 0 && (
                                    <details className="mt-2">
                                      <summary className="cursor-pointer text-sm">View domain status details</summary>
                                      <div className="mt-2 space-y-1 text-xs">
                                        {domainScoringStatus.map((status: any) => (
                                          <div key={status.tokenId} className="flex justify-between">
                                            <span>{status.name}:</span>
                                            <span>
                                              {!status.hasAnalytics ? 'Not scored' :
                                               !status.hasScoringEvents ? 'Scoring incomplete' :
                                               !status.hasCompletedScoring ? 'Scoring in progress' :
                                               status.isUsedAsCollateral ? 'Used as collateral' :
                                               status.isLiquidated ? 'Liquidated' :
                                               status.latestScore <= 0 ? 'Invalid score' : 'Eligible'}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </details>
                                  )}
                                </>
                              )}
                            </AlertDescription>
                          </Alert>
                        )}

                        {address && userDomains.length > 0 && (
                          <>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <Label htmlFor="domain">Select Domain Collateral</Label>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={refreshDomains}
                                  disabled={domainsLoading}
                                  className="text-xs px-2 py-1 h-6"
                                >
                                  {domainsLoading ? (
                                    <div className="animate-spin h-3 w-3 border border-gray-400 border-t-transparent rounded-full"></div>
                                  ) : (
                                    "Refresh"
                                  )}
                                </Button>
                              </div>
                              <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                                <SelectTrigger className="h-auto min-h-[2.5rem]">
                                  <SelectValue placeholder="Choose a domain" />
                                </SelectTrigger>
                                <SelectContent className="min-w-[500px] max-h-[300px]">
                                  {/* Show all owned domains with status indicators */}
                                  {userOwnedDomains.map((domain: any) => {
                                    const isEligible = userDomains.some(eligible => eligible.tokenId === domain.tokenId);
                                    const statusInfo = getDomainStatusInfo(domain);
                                    return (
                                    <SelectItem 
                                      key={domain.tokenId} 
                                      value={domain.tokenId}
                                      disabled={!isEligible}
                                      className={`py-3 px-3 ${isEligible ? 'cursor-pointer hover:bg-gray-50 focus:bg-gray-50' : 'cursor-not-allowed opacity-60 bg-gray-50'}`}
                                    >
                                      <div className="flex items-center justify-between w-full min-w-0">
                                        <div className="flex-1 min-w-0 mr-3">
                                          <div className="flex items-center gap-2 mb-1">
                                            <SiteIcon 
                                              domain={domain.name} 
                                              size={16} 
                                              className="flex-shrink-0"
                                            />
                                            <span 
                                              className="font-medium truncate" 
                                              title={domain.name}
                                            >
                                              {domain.name}
                                            </span>
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            ID: {truncateTokenId(domain.tokenId)}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          {/* Status Badge */}
                                          <Badge className={`text-xs px-2 py-1 ${
                                            statusInfo.color === 'green' ? 'bg-green-100 text-green-800' :
                                            statusInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                                            statusInfo.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                                            statusInfo.color === 'red' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                          }`}>
                                            {statusInfo.text}
                                          </Badge>
                                          
                                          {/* Score Badge */}
                                          {domain.analytics?.latestAiScore && (
                                            <Badge className={`${getScoreColor(domain.analytics.latestAiScore)} text-xs px-2 py-1`}>
                                              {domain.analytics.latestAiScore}/100
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label htmlFor="loanAmount">Loan Amount (USDC)</Label>
                              <Input
                                id="loanAmount"
                                type="number"
                                placeholder="Enter loan amount"
                                value={loanAmount}
                                onChange={(e) => setLoanAmount(e.target.value)}
                                min="0"
                                step="0.01"
                              />
                              {pool && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Pool range: ${formatUSDC(pool.minLoanAmount || '0')} - ${formatUSDC(pool.maxLoanAmount || '0')}
                                </p>
                              )}
                            </div>

                            <div>
                              <Label htmlFor="loanDuration">Loan Duration (days)</Label>
                              <Input
                                id="loanDuration"
                                type="number"
                                placeholder="Enter loan duration"
                                value={loanDuration}
                                onChange={(e) => setLoanDuration(e.target.value)}
                                min="1"
                                step="1"
                              />
                            </div>

                            {/* Eligibility Check */}
                            {selectedDomainId && loanAmount && (
                              <div className="p-3 border rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold">Eligibility Check</h4>
                                  {isCheckingEligibility && <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>}
                                </div>
                                {!isCheckingEligibility && (
                                  <div className={`flex items-center gap-2 ${eligible ? 'text-green-600' : 'text-red-600'}`}>
                                    <span>{eligible ? '✓' : '✗'}</span>
                                    <span>{eligible ? 'Eligible for instant loan' : reason}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            <Button
                              onClick={handleRequestInstantLoan}
                              disabled={!selectedDomainId || !loanAmount || !loanDuration || !eligible || isTransactionLoading}
                              className="w-full"
                            >
                              {isTransactionLoading ? 'Requesting Loan...' : 'Request Instant Loan'}
                            </Button>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="liquidity" className="space-y-6">
                    {/* Add Liquidity Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          Add Liquidity
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {address && (
                          <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>USDC Balance:</span>
                              <span className="font-medium">{(Number(usdcBalance) / 1e6).toLocaleString()} USDC</span>
                            </div>
                          </div>
                        )}
                        <div>
                          <Label htmlFor="liquidityAmount">Amount (USDC)</Label>
                          <Input
                            id="liquidityAmount"
                            type="number"
                            placeholder="Enter amount to add"
                            value={liquidityAmount}
                            onChange={(e) => setLiquidityAmount(e.target.value)}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <Button
                          onClick={handleAddLiquidity}
                          disabled={!liquidityAmount || isTransactionLoading}
                          className="w-full"
                        >
                          {isTransactionLoading ? 'Adding Liquidity...' : 'Add Liquidity'}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Remove Liquidity Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          Remove Liquidity
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* User's Current Position */}
                        {hasLiquidity && (
                          <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                            <div className="text-sm font-medium text-blue-900">Your Current Position</div>
                            <div className="flex justify-between text-sm">
                              <span>Total Liquidity:</span>
                              <span className="font-medium">${(userLiquidityData.currentLiquidity / 1e6).toLocaleString()} USDC</span>
                            </div>
                            {userLiquidityData.interestEarned > 0 && (
                              <div className="flex justify-between text-sm text-green-600">
                                <span>Interest Earned:</span>
                                <span className="font-medium">${(userLiquidityData.interestEarned / 1e6).toLocaleString()} USDC</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {!hasLiquidity && address && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-600">You don&apos;t have any liquidity in this pool.</div>
                          </div>
                        )}
                        
                        <div>
                          <Label htmlFor="withdrawPercentage">Percentage to Withdraw</Label>
                          <Input
                            id="withdrawPercentage"
                            type="number"
                            placeholder="Enter percentage (1-100)"
                            value={withdrawPercentage}
                            onChange={(e) => setWithdrawPercentage(e.target.value)}
                            min="1"
                            max="100"
                            step="1"
                            disabled={!hasLiquidity}
                          />
                        </div>
                        
                        {hasLiquidity && (
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setWithdrawPercentage('25')}
                            >
                              25% (${((userLiquidityData.currentLiquidity * 0.25) / 1e6).toLocaleString()})
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setWithdrawPercentage('50')}
                            >
                              50% (${((userLiquidityData.currentLiquidity * 0.50) / 1e6).toLocaleString()})
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setWithdrawPercentage('75')}
                            >
                              75% (${((userLiquidityData.currentLiquidity * 0.75) / 1e6).toLocaleString()})
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setWithdrawPercentage('100')}
                            >
                              100% (${(userLiquidityData.currentLiquidity / 1e6).toLocaleString()})
                            </Button>
                          </div>
                        )}
                        
                        <Button
                          onClick={handleRemoveLiquidity}
                          disabled={!withdrawPercentage || isTransactionLoading || !hasLiquidity}
                          variant="destructive"
                          className="w-full"
                        >
                          {isTransactionLoading ? 'Removing Liquidity...' : 'Remove Liquidity'}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Transaction Error Display */}
                    {transactionError && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          Transaction error: {transactionError}
                        </AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>

                  <TabsContent value="history" className="space-y-4">
                    {rawDataLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading pool history...</p>
                      </div>
                    ) : rawDataError ? (
                      <div className="text-center py-8 text-red-500">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                        <p>Error loading pool history: {rawDataError}</p>
                      </div>
                    ) : rawPoolData?.poolHistory && Array.isArray(rawPoolData.poolHistory) && rawPoolData.poolHistory.length > 0 ? (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pool History ({rawPoolData.poolHistory.length} events)</h3>
                        {rawPoolData.poolHistory.map((event) => (
                          <div key={event.id} className="p-4 border rounded-lg hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={
                                    event.eventType === 'created' ? 'bg-blue-100 text-blue-800' :
                                      event.eventType === 'liquidity_added' ? 'bg-green-100 text-green-800' :
                                        event.eventType === 'liquidity_removed' ? 'bg-red-100 text-red-800' :
                                          event.eventType === 'updated' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                  }>
                                    {event.eventType.replace(/_/g, ' ')}
                                  </Badge>
                                  <span className="text-sm text-gray-500">
                                    {new Date(event.eventTimestamp).toLocaleDateString()} {new Date(event.eventTimestamp).toLocaleTimeString()}
                                  </span>
                                </div>

                                <div className="space-y-1">
                                  {event.providerAddress && (
                                    <div className="text-sm text-gray-600">
                                      Provider: {event.providerAddress.slice(0, 6)}...{event.providerAddress.slice(-4)}
                                    </div>
                                  )}
                                  {event.liquidityAmount && (
                                    <div className="text-sm text-gray-600">
                                      Amount: ${(parseInt(event.liquidityAmount) / 1000000).toLocaleString()} USDC
                                    </div>
                                  )}
                                  {event.minAiScore && (
                                    <div className="text-sm text-gray-600">
                                      Min AI Score: {event.minAiScore}
                                    </div>
                                  )}
                                  {event.interestRate && (
                                    <div className="text-sm text-gray-600">
                                      Interest Rate: {formatBasisPoints(event.interestRate)}%
                                    </div>
                                  )}
                                </div>

                                <div className="text-xs text-gray-400 mt-2">
                                  Block: {event.blockNumber} | Tx: {event.transactionHash.slice(0, 10)}...
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No pool history available</p>
                        <p className="text-sm text-gray-400 mt-2">
                          History will appear here once there are liquidity events or pool updates
                        </p>
                        {/* Debug info */}
                        <details className="mt-4 text-xs text-gray-400">
                          <summary>Debug Info</summary>
                          <pre className="text-left mt-2 bg-gray-100 p-2 rounded">
                            {JSON.stringify({
                              hasRawData: !!rawPoolData,
                              poolHistory: rawPoolData?.poolHistory,
                              poolHistoryType: typeof rawPoolData?.poolHistory,
                              poolHistoryLength: rawPoolData?.poolHistory?.length
                            }, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </TabsContent>

                </CardContent>
              </Tabs>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pool Information */}
            <Card>
              <CardHeader>
                <CardTitle>Pool Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600">Loan Range</div>
                  <div className="font-semibold">
                    ${formatUSDC(pool.minLoanAmount || '0')} - ${formatUSDC(pool.maxLoanAmount || '0')}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">Loan-to-Value Ratio</div>
                  <div className="font-semibold">{pool.loanToValueRatio}%</div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">Pool Creator</div>
                  <div className="font-semibold text-xs">
                    {pool.creator.slice(0, 6)}...{pool.creator.slice(-4)}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">Min AI Score Required</div>
                  <div className="font-semibold">{pool.minAiScore}/100</div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">Total Loan Volume</div>
                  <div className="font-semibold">${formatUSDC(pool.totalLoanVolume || '0')}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">Liquidity Providers</div>
                  <div className="font-semibold">{pool.liquidityProviderCount || 0}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">Pool Status</div>
                  <div className="font-semibold">
                    <Badge className={pool.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {pool.status}
                    </Badge>
                  </div>
                </div>

                {pool.createdAt && (
                  <div>
                    <div className="text-sm text-gray-600">Created</div>
                    <div className="font-semibold text-xs">
                      {new Date(pool.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pool Risk Information */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Lending pools carry risk. Past performance doesn&apos;t guarantee future returns.
                Please review pool terms carefully before adding liquidity.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        {/* Add Liquidity Dialog */}
        <Dialog open={addLiquidityDialogOpen} onOpenChange={setAddLiquidityDialogOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle>Add Liquidity to Pool</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddLiquidityDialogOpen(false)}
                className="h-6 w-6 p-0 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Enter the amount of USDC you want to add to this liquidity pool.
              </p>
              {address && (
                <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>USDC Balance:</span>
                    <span className="font-medium">{(Number(usdcBalance) / 1e6).toLocaleString()} USDC</span>
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="dialogLiquidityAmount">Amount (USDC)</Label>
                <Input
                  id="dialogLiquidityAmount"
                  type="number"
                  placeholder="Enter amount to add"
                  value={dialogLiquidityAmount}
                  onChange={(e) => setDialogLiquidityAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setAddLiquidityDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddLiquidityFromDialog}
                disabled={!dialogLiquidityAmount || isTransactionLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isTransactionLoading ? 'Adding Liquidity...' : 'Add Liquidity'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Withdraw Liquidity Dialog */}
        <Dialog open={withdrawLiquidityDialogOpen} onOpenChange={setWithdrawLiquidityDialogOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle>Withdraw Liquidity</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWithdrawLiquidityDialogOpen(false)}
                className="h-6 w-6 p-0 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Enter the percentage of your liquidity position you want to withdraw.
              </p>
              
              {/* User's Current Position */}
              {hasLiquidity && (
                <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                  <div className="text-sm font-medium text-blue-900">Your Current Position</div>
                  <div className="flex justify-between text-sm">
                    <span>Total Liquidity Provided:</span>
                    <span className="font-medium">${(userLiquidityData.currentLiquidity / 1e6).toLocaleString()} USDC</span>
                  </div>
                  {userLiquidityData.interestEarned > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Interest Earned:</span>
                      <span className="font-medium">${(userLiquidityData.interestEarned / 1e6).toLocaleString()} USDC</span>
                    </div>
                  )}
                </div>
              )}
              
              {!hasLiquidity && address && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">You don&apos;t have any liquidity in this pool.</div>
                </div>
              )}
              
              <div>
                <Label htmlFor="dialogWithdrawPercentage">Percentage to Withdraw</Label>
                <Input
                  id="dialogWithdrawPercentage"
                  type="number"
                  placeholder="Enter percentage (1-100)"
                  value={dialogWithdrawPercentage}
                  onChange={(e) => setDialogWithdrawPercentage(e.target.value)}
                  min="1"
                  max="100"
                  step="1"
                  disabled={!hasLiquidity}
                />
              </div>
              
              {/* Show actual amounts for percentages */}
              {hasLiquidity && (
                <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDialogWithdrawPercentage('25')}
                    >
                      25% (${((userLiquidityData.currentLiquidity * 0.25) / 1e6).toLocaleString()})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDialogWithdrawPercentage('50')}
                    >
                      50% (${((userLiquidityData.currentLiquidity * 0.50) / 1e6).toLocaleString()})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDialogWithdrawPercentage('75')}
                    >
                      75% (${((userLiquidityData.currentLiquidity * 0.75) / 1e6).toLocaleString()})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDialogWithdrawPercentage('100')}
                    >
                      100% (${(userLiquidityData.currentLiquidity / 1e6).toLocaleString()})
                    </Button>
                </div>
              )}
              
              {/* Show preview of withdrawal amount */}
              {hasLiquidity && dialogWithdrawPercentage && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700">Withdrawal Preview</div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>Amount to withdraw:</span>
                    <span className="font-medium">
                      ${((userLiquidityData.currentLiquidity * (parseInt(dialogWithdrawPercentage) || 0) / 100) / 1e6).toLocaleString()} USDC
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Remaining liquidity:</span>
                    <span>
                      ${((userLiquidityData.currentLiquidity * (100 - (parseInt(dialogWithdrawPercentage) || 0)) / 100) / 1e6).toLocaleString()} USDC
                    </span>
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setWithdrawLiquidityDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRemoveLiquidityFromDialog}
                  disabled={!dialogWithdrawPercentage || isTransactionLoading || !hasLiquidity}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                >
                  {isTransactionLoading ? 'Removing Liquidity...' : 'Remove Liquidity'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Liquidity Progress Dialog */}
        <LiquidityProgress
          isOpen={isAddLiquidityProgressOpen}
          onClose={() => {
            setIsAddLiquidityProgressOpen(false);
            setAddLiquiditySteps([]);
            setCurrentAddLiquidityStep('');
            setIsAddLiquidityCompleted(false);
            setAddLiquidityError('');
          }}
          steps={addLiquiditySteps}
          currentStepId={currentAddLiquidityStep}
          isCompleted={isAddLiquidityCompleted}
          error={addLiquidityError}
          type="add"
        />

        {/* Remove Liquidity Progress Dialog */}
        <LiquidityProgress
          isOpen={isRemoveLiquidityProgressOpen}
          onClose={() => {
            setIsRemoveLiquidityProgressOpen(false);
            setRemoveLiquiditySteps([]);
            setCurrentRemoveLiquidityStep('');
            setIsRemoveLiquidityCompleted(false);
            setRemoveLiquidityError('');
          }}
          steps={removeLiquiditySteps}
          currentStepId={currentRemoveLiquidityStep}
          isCompleted={isRemoveLiquidityCompleted}
          error={removeLiquidityError}
          type="remove"
        />
      </div>
    </div>
  );
};

export default PoolDetailPage;
import { NextPage } from 'next';
import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
// Card import removed - using custom divs for chart containers
// Pool-related imports
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Table imports removed for custom grid layout
import { PoolCreationProgress as PoolCreationProgressDialog, PoolCreationStep } from '@/components/ui/pool-creation-progress';
import { usePoolsSummary } from '@/hooks/useDomaLendApi';
import { usePoolData } from '@/hooks/usePoolData';
import { CreatePoolParams, PoolCreationProgress, useDomaLend, useUSDCBalance } from '@/hooks/web3/domalend/useDomaLend';
import { formatUSDC } from '@/utils/formatting';
import { AlertCircle, ArrowUpRight, Droplets, Plus, RefreshCw, Search, X } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatUnits } from 'viem';
import { useAccount } from 'wagmi';

// Helper function to format duration from seconds to human readable
const formatDuration = (seconds: string | number): string => {
  const secs = typeof seconds === 'string' ? parseInt(seconds) : seconds;
  const days = Math.floor(secs / 86400);
  return `${days}d`;
};

// Helper function to format loan range
const formatLoanRange = (min: string, max: string): string => {
  const minFormatted = formatUSDC(min);
  const maxFormatted = formatUSDC(max);
  if (minFormatted === maxFormatted) return `$${minFormatted}`;
  return `$${minFormatted}-$${maxFormatted}`;
};

const PoolsPage: NextPage = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Use Pool API hooks
  const { data: pools, loading, error, refetch } = usePoolData();
  const { data: summaryData, loading: summaryLoading } = usePoolsSummary();
  const { createPool, isLoading: isCreatingPool, error: createPoolError } = useDomaLend();
  const { address } = useAccount();
  const { balance: usdcBalance, isLoading: isLoadingBalance } = useUSDCBalance(address);

  // Pool creation state - using refs for persistent state that won't be affected by re-renders
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const isProgressDialogOpenRef = useRef(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const progressStepsRef = useRef<PoolCreationStep[]>([]);
  const [progressSteps, setProgressSteps] = useState<PoolCreationStep[]>([]);
  const currentStepRef = useRef<string>('');
  const [currentStep, setCurrentStep] = useState<string>('');
  const isCompletedRef = useRef(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const progressErrorRef = useRef<string>('');
  const [progressError, setProgressError] = useState<string>('');
  
  const [poolForm, setPoolForm] = useState({
    initialLiquidity: '',
    minAiScore: '',
    maxDomainExpiration: '',
    interestRate: '',
    minLoanAmount: '',
    maxLoanAmount: '',
    minDuration: '',
    maxDuration: '',
    allowAdditionalProviders: true
  });

  // Helper functions to update both ref and state for persistent dialog state
  const setProgressDialogOpen = useCallback((open: boolean) => {
    isProgressDialogOpenRef.current = open;
    setIsProgressDialogOpen(open);
  }, []);

  const setProgressStepsSync = useCallback((steps: PoolCreationStep[] | ((prev: PoolCreationStep[]) => PoolCreationStep[])) => {
    const newSteps = typeof steps === 'function' ? steps(progressStepsRef.current) : steps;
    progressStepsRef.current = newSteps;
    setProgressSteps(newSteps);
  }, []);

  const setCurrentStepSync = useCallback((step: string) => {
    currentStepRef.current = step;
    setCurrentStep(step);
  }, []);

  const setIsCompletedSync = useCallback((completed: boolean) => {
    isCompletedRef.current = completed;
    setIsCompleted(completed);
  }, []);

  const setProgressErrorSync = useCallback((error: string) => {
    progressErrorRef.current = error;
    setProgressError(error);
  }, []);

  // Filter pools based on search term
  const filteredPools = useMemo(() => {
    if (!searchTerm.trim()) return pools;
    const term = searchTerm.toLowerCase().trim();
    return pools.filter(pool =>
      pool.poolName.toLowerCase().includes(term) ||
      pool.poolId.toLowerCase().includes(term)
    );
  }, [pools, searchTerm]);

  const getAPYColor = (apy: string) => {
    const apyNum = parseFloat(apy.replace('%', ''));
    if (apyNum >= 10) return 'text-green-600 font-medium';
    if (apyNum >= 5) return 'text-blue-600 font-medium';
    return 'text-gray-600 font-medium';
  };

  // Initialize progress steps
  const initializeProgressSteps = (requiresApproval: boolean): PoolCreationStep[] => {
    const baseSteps: PoolCreationStep[] = [
      {
        id: 'checking_allowance',
        title: 'Checking USDC Allowance',
        description: 'Verifying your current USDC spending approval...',
        status: 'pending'
      }
    ];

    if (requiresApproval) {
      baseSteps.push(
        {
          id: 'simulating_approval',
          title: 'Simulating USDC Approval',
          description: 'Testing the approval transaction...',
          status: 'pending'
        },
        {
          id: 'approving_usdc',
          title: 'Approving USDC Spending',
          description: 'Please confirm the approval transaction in your wallet...',
          status: 'pending'
        }
      );
    }

    baseSteps.push(
      {
        id: 'simulating_pool_creation',
        title: 'Simulating Pool Creation',
        description: 'Testing the pool creation transaction...',
        status: 'pending'
      },
      {
        id: 'creating_pool',
        title: 'Creating Pool',
        description: 'Please confirm the pool creation transaction in your wallet...',
        status: 'pending'
      }
    );

    return baseSteps;
  };

  // Update progress step status
  const updateProgressStep = useCallback((stepId: string, status: PoolCreationStep['status'], txHash?: string) => {
    setProgressStepsSync(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, txHash }
        : step
    ));
  }, [setProgressStepsSync]);

  // Handle progress updates from the hook
  const handleProgress = useCallback((progress: PoolCreationProgress) => {
    setCurrentStepSync(progress.step);
    
    // After checking allowance, adjust steps if no approval is needed
    if (progress.step === 'checking_allowance' && !progress.txHash) {
      // Check if we're transitioning directly to pool creation (no approval needed)
      if (progress.message.includes('sufficient')) {
        const stepsWithoutApproval = initializeProgressSteps(false);
        // Mark checking_allowance as completed
        stepsWithoutApproval[0].status = 'completed';
        setProgressStepsSync(stepsWithoutApproval);
        return; // Skip the normal progress update since we just updated steps
      }
    }
    
    // Update current step to in_progress
    updateProgressStep(progress.step, 'in_progress');
    
    // If there's a transaction hash, mark as completed
    if (progress.txHash) {
      updateProgressStep(progress.step, 'completed', progress.txHash);
    }
  }, [setCurrentStepSync, setProgressStepsSync, updateProgressStep]);

  const handleCreatePool = async () => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!poolForm.initialLiquidity || !poolForm.minAiScore || !poolForm.maxDomainExpiration ||
      !poolForm.interestRate || !poolForm.minLoanAmount || !poolForm.maxLoanAmount ||
      !poolForm.minDuration || !poolForm.maxDuration) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if user has sufficient USDC balance
    const requestedLiquidity = parseFloat(poolForm.initialLiquidity);
    const userBalance = parseFloat(formatUSDCBalance(usdcBalance));
    if (requestedLiquidity > userBalance) {
      toast.error(`Insufficient USDC balance. You have ${userBalance.toFixed(2)} USDC but trying to provide ${requestedLiquidity.toFixed(2)} USDC`);
      return;
    }

    try {
      // Close create dialog and open progress dialog
      setIsCreateDialogOpen(false);
      setProgressDialogOpen(true);
      setIsCompletedSync(false);
      setProgressErrorSync('');
      
      // Initialize with default steps (will be updated once we know if approval is needed)
      const initialSteps = initializeProgressSteps(true); // Start with approval assumption
      setProgressStepsSync(initialSteps);

      const params: CreatePoolParams = {
        initialLiquidity: poolForm.initialLiquidity,
        minAiScore: parseInt(poolForm.minAiScore),
        maxDomainExpiration: parseInt(poolForm.maxDomainExpiration),
        // Convert percentage to basis points (12% = 1200 basis points)
        interestRate: Math.round(parseFloat(poolForm.interestRate) * 100),
        minLoanAmount: poolForm.minLoanAmount,
        maxLoanAmount: poolForm.maxLoanAmount,
        // Convert days to seconds (1 day = 86400 seconds)
        minDuration: parseInt(poolForm.minDuration) * 86400,
        maxDuration: parseInt(poolForm.maxDuration) * 86400,
        allowAdditionalProviders: poolForm.allowAdditionalProviders
      };

      const result = await createPool(params, address, handleProgress);

      if (result.success) {
        // Mark all remaining steps as completed
        setProgressStepsSync(prev => prev.map(step => 
          step.status === 'pending' || step.status === 'in_progress' 
            ? { ...step, status: 'completed' }
            : step
        ));
        
        setIsCompletedSync(true);
        
        // Reset form
        setPoolForm({
          initialLiquidity: '',
          minAiScore: '',
          maxDomainExpiration: '',
          interestRate: '',
          minLoanAmount: '',
          maxLoanAmount: '',
          minDuration: '',
          maxDuration: '',
          allowAdditionalProviders: true
        });
        
        // Refresh pools data - dialog state is now protected from re-renders
        refetch();
      } else {
        throw new Error(result.error || 'Failed to create pool');
      }
    } catch (error: any) {
      console.error('Error creating pool:', error);
      setProgressErrorSync(error.message || 'Failed to create pool. Please try again.');
      
      // Mark current step as failed
      if (currentStepRef.current) {
        updateProgressStep(currentStepRef.current, 'failed');
      }
    }
  };

  const handleCloseProgressDialog = useCallback(() => {
    setProgressDialogOpen(false);
    setProgressStepsSync([]);
    setCurrentStepSync('');
    setIsCompletedSync(false);
    setProgressErrorSync('');
  }, [setProgressDialogOpen, setProgressStepsSync, setCurrentStepSync, setIsCompletedSync, setProgressErrorSync]);

  // Ensure dialog state persists across re-renders
  useEffect(() => {
    if (isProgressDialogOpenRef.current !== isProgressDialogOpen) {
      setIsProgressDialogOpen(isProgressDialogOpenRef.current);
    }
    if (progressStepsRef.current !== progressSteps) {
      setProgressSteps(progressStepsRef.current);
    }
    if (currentStepRef.current !== currentStep) {
      setCurrentStep(currentStepRef.current);
    }
    if (isCompletedRef.current !== isCompleted) {
      setIsCompleted(isCompletedRef.current);
    }
    if (progressErrorRef.current !== progressError) {
      setProgressError(progressErrorRef.current);
    }
  }, [isProgressDialogOpen, progressSteps, currentStep, isCompleted, progressError]);

  // Format USDC balance for display
  const formatUSDCBalance = (balance: bigint) => {
    return formatUnits(balance, 6);
  };

  // Handle max button click for initial liquidity
  const handleMaxLiquidity = () => {
    if (usdcBalance) {
      const formattedBalance = formatUSDCBalance(usdcBalance);
      updateFormField('initialLiquidity', formattedBalance);
    }
  };

  const updateFormField = (field: string, value: string) => {
    setPoolForm(prev => ({
      ...prev,
      [field]: field === 'allowAdditionalProviders' ? value === 'true' : value
    }));
  };

  if (loading || summaryLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="animate-pulse">
            {/* Header */}
            <div className="mb-8 flex justify-between items-center">
              <div>
                <div className="h-8 bg-gray-200 rounded mb-2 w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-48"></div>
              </div>
              <div className="h-10 bg-gray-200 rounded w-32"></div>
            </div>

            {/* Stats Overview - 4 columns */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="h-12 bg-gray-200 rounded-xl w-full"></div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-3 px-4 py-3 mb-2">
              <div className="col-span-2 h-4 bg-gray-200 rounded"></div>
              <div className="col-span-2 h-4 bg-gray-200 rounded"></div>
              <div className="col-span-2 h-4 bg-gray-200 rounded"></div>
              <div className="col-span-1 h-4 bg-gray-200 rounded"></div>
              <div className="col-span-1 h-4 bg-gray-200 rounded"></div>
              <div className="col-span-2 h-4 bg-gray-200 rounded"></div>
              <div className="col-span-1 h-4 bg-gray-200 rounded"></div>
              <div className="col-span-1 h-4 bg-gray-200 rounded"></div>
            </div>

            {/* Pool Rows */}
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-3 px-4 py-4 bg-white rounded-xl border border-gray-200">
                  {/* Pool Name */}
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                  {/* Total Liquidity */}
                  <div className="col-span-2 text-right">
                    <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
                  </div>
                  {/* Available */}
                  <div className="col-span-2 text-right">
                    <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
                  </div>
                  {/* APY */}
                  <div className="col-span-1 text-right">
                    <div className="h-4 bg-gray-200 rounded w-12 ml-auto"></div>
                  </div>
                  {/* Min Score */}
                  <div className="col-span-1 text-center">
                    <div className="h-4 bg-gray-200 rounded w-8 mx-auto"></div>
                  </div>
                  {/* Duration Range */}
                  <div className="col-span-2 text-center">
                    <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
                  </div>
                  {/* Loan Range */}
                  <div className="col-span-1 text-center">
                    <div className="h-4 bg-gray-200 rounded w-12 mx-auto"></div>
                  </div>
                  {/* Actions */}
                  <div className="col-span-1 flex items-center gap-2">
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Explore</h1>
            <p className="text-gray-600">Discover pools</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Pool
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader className="flex flex-row items-center justify-between">
                <DialogTitle>Create New Lending Pool</DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="initialLiquidity">Initial Liquidity (USDC)</Label>
                  <div className="relative">
                    <Input
                      id="initialLiquidity"
                      type="number"
                      placeholder="e.g., 10000"
                      min="0"
                      step="0.01"
                      value={poolForm.initialLiquidity}
                      onChange={(e) => updateFormField('initialLiquidity', e.target.value)}
                      className="pr-16"
                    />
                    {address && usdcBalance > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleMaxLiquidity}
                        className="absolute right-1 top-1 h-8 px-3 text-xs text-blue-600 hover:text-blue-800"
                      >
                        MAX
                      </Button>
                    )}
                  </div>
                  {address && (
                    <div className="text-xs text-gray-600 mt-1">
                      {isLoadingBalance ? (
                        'Loading balance...'
                      ) : (
                        <span>
                          Balance: {formatUSDCBalance(usdcBalance)} USDC
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="minAiScore">Minimum AI Score</Label>
                  <Input
                    id="minAiScore"
                    type="number"
                    placeholder="e.g., 75"
                    min="0"
                    max="100"
                    value={poolForm.minAiScore}
                    onChange={(e) => updateFormField('minAiScore', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="maxDomainExpiration">Max Domain Expiration (days)</Label>
                  <Input
                    id="maxDomainExpiration"
                    type="number"
                    placeholder="e.g., 365"
                    min="1"
                    value={poolForm.maxDomainExpiration}
                    onChange={(e) => updateFormField('maxDomainExpiration', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="interestRate">Interest Rate (%)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    placeholder="e.g., 12"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={poolForm.interestRate}
                    onChange={(e) => updateFormField('interestRate', e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Annual percentage rate for loans</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minLoanAmount">Min Loan Amount (USDC)</Label>
                    <Input
                      id="minLoanAmount"
                      type="number"
                      placeholder="e.g., 100"
                      min="1"
                      step="0.01"
                      value={poolForm.minLoanAmount}
                      onChange={(e) => updateFormField('minLoanAmount', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxLoanAmount">Max Loan Amount (USDC)</Label>
                    <Input
                      id="maxLoanAmount"
                      type="number"
                      placeholder="e.g., 5000"
                      min="1"
                      step="0.01"
                      value={poolForm.maxLoanAmount}
                      onChange={(e) => updateFormField('maxLoanAmount', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minDuration">Min Duration (days)</Label>
                    <Input
                      id="minDuration"
                      type="number"
                      placeholder="e.g., 1"
                      min="1"
                      value={poolForm.minDuration}
                      onChange={(e) => updateFormField('minDuration', e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum loan term</p>
                  </div>
                  <div>
                    <Label htmlFor="maxDuration">Max Duration (days)</Label>
                    <Input
                      id="maxDuration"
                      type="number"
                      placeholder="e.g., 30"
                      min="1"
                      value={poolForm.maxDuration}
                      onChange={(e) => updateFormField('maxDuration', e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum loan term</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    id="allowAdditionalProviders"
                    type="checkbox"
                    checked={poolForm.allowAdditionalProviders}
                    onChange={(e) => updateFormField('allowAdditionalProviders', e.target.checked.toString())}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="allowAdditionalProviders">Allow additional liquidity providers</Label>
                </div>

                {createPoolError && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {createPoolError}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreatePool}
                    disabled={isCreatingPool}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {isCreatingPool ? 'Creating...' : 'Create Pool'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
              <Button
                variant="link"
                onClick={refetch}
                className="ml-2 p-0 h-auto text-red-800 underline"
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="relative overflow-hidden rounded-lg bg-white shadow h-32">
            {parseInt(summaryData?.summary.tvl || '0') > 0 && (
              <svg viewBox="0 0 300 120" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,80 Q75,75 150,70 T300,65 L300,120 L0,120 Z"
                  fill="url(#purpleGradient)"
                />
                <path
                  d="M0,80 Q75,75 150,70 T300,65"
                  stroke="#a855f7"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            )}
            <div className="relative z-10 p-6">
              <p className="text-sm font-medium text-gray-600">TVL</p>
              <p className="text-2xl font-bold">
                ${formatUSDC(summaryData?.summary.tvl || '0')}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg bg-white shadow h-32">
            {parseInt(summaryData?.summary.availableLiquidity || '0') > 0 && (
              <svg viewBox="0 0 300 120" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,60 Q75,55 150,65 T300,70 L300,120 L0,120 Z"
                  fill="url(#greenGradient)"
                />
                <path
                  d="M0,60 Q75,55 150,65 T300,70"
                  stroke="#22c55e"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            )}
            <div className="relative z-10 p-6">
              <p className="text-sm font-medium text-gray-600">Available Liquidity</p>
              <p className="text-2xl font-bold">
                ${formatUSDC(summaryData?.summary.availableLiquidity || '0')}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg bg-white shadow h-32">
            {parseInt(summaryData?.summary.totalActiveLoanAmount || '0') > 0 && (
              <svg viewBox="0 0 300 120" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,70 Q75,80 150,72 T300,65 L300,120 L0,120 Z"
                  fill="url(#orangeGradient)"
                />
                <path
                  d="M0,70 Q75,80 150,72 T300,65"
                  stroke="#f97316"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            )}
            <div className="relative z-10 p-6">
              <p className="text-sm font-medium text-gray-600">Total Active Loan</p>
              <p className="text-2xl font-bold">
                ${formatUSDC(summaryData?.summary.totalActiveLoanAmount || '0')}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg bg-white shadow h-32">
            {(summaryData?.summary.averageApy || 0) > 0 && (
              <svg viewBox="0 0 300 120" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,50 Q75,45 150,47 T300,75 L300,120 L0,120 Z"
                  fill="url(#blueGradient)"
                />
                <path
                  d="M0,50 Q75,45 150,47 T300,75"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            )}
            <div className="relative z-10 p-6">
              <p className="text-sm font-medium text-gray-600">Avg. APR</p>
              <p className="text-2xl font-bold">
                {((summaryData?.summary.averageApy || 0) / 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search for pools"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full h-12 rounded-xl"
            />
            {loading && (
              <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 animate-spin" />
            )}
          </div>
        </div>

        {/* Pools Table */}
        <div>
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-3 text-sm font-medium text-gray-700 bg-transparent">
            <div className="col-span-2">Pool Name</div>
            <div className="col-span-2 text-right">Total Liquidity</div>
            <div className="col-span-2 text-right">Available</div>
            <div className="col-span-1 text-right">APY</div>
            <div className="col-span-1 text-center">Min Score</div>
            <div className="col-span-2 text-center">Duration Range</div>
            <div className="col-span-1 text-center">Loan Range</div>
            <div className="col-span-1"></div>
          </div>

          {/* Table Rows */}
          {filteredPools.map((pool) => {
            // Calculate utilization rate: (totalLiquidity - availableLiquidity) / totalLiquidity * 100
            const totalLiq = parseFloat(pool.totalLiquidity || '0');
            const availableLiq = parseFloat(pool.availableLiquidity || '0');
            const utilizationRate = totalLiq > 0 ? ((totalLiq - availableLiq) / totalLiq) * 100 : 0;
            const isLowUtilization = utilizationRate < 20;

            return (
              <Link key={pool.poolId} href={`/pool/${pool.poolId}`} className="block mb-2">
                <div
                  className={isLowUtilization ? "rounded-xl p-0.5 bg-gradient-to-r from-blue-500 to-purple-500" : ""}
                >
                  <div className={`grid grid-cols-12 gap-3 px-4 py-4 bg-white rounded-xl hover:shadow-md transition-all duration-200 cursor-pointer ${isLowUtilization ? '' : 'border border-gray-200'
                    }`}>
                    {/* Pool Name Column */}
                    <div className="col-span-2 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Droplets className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{pool.poolName || pool.poolId}</span>
                        </div>
                      </div>
                    </div>

                    {/* Total Liquidity */}
                    <div className="col-span-2 text-right font-medium">
                      ${formatUSDC(pool.totalLiquidity || '0')}
                    </div>

                    {/* Available Liquidity */}
                    <div className="col-span-2 text-right font-medium">
                      ${formatUSDC(pool.availableLiquidity || '0')}
                    </div>

                    {/* APY */}
                    <div className="col-span-1 text-right">
                      <span className={getAPYColor(pool.apy)}>
                        {pool.apy}
                      </span>
                    </div>

                    {/* Min AI Score */}
                    <div className="col-span-1 text-center">
                      <span className="text-sm font-medium text-gray-700">
                        {pool.minAiScore}
                      </span>
                    </div>

                    {/* Duration Range */}
                    <div className="col-span-2 text-center">
                      <span className="text-sm text-gray-600">
                        {formatDuration(pool.minDuration)} - {formatDuration(pool.maxDuration)}
                      </span>
                    </div>

                    {/* Loan Range */}
                    <div className="col-span-1 text-center font-medium text-sm">
                      {formatLoanRange(pool.minLoanAmount, pool.maxLoanAmount)}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {filteredPools.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No pools found matching your search.</p>
          </div>
        )}
      </div>

      {/* Progress Dialog */}
      <PoolCreationProgressDialog
        isOpen={isProgressDialogOpen}
        onClose={handleCloseProgressDialog}
        steps={progressSteps}
        currentStepId={currentStep}
        isCompleted={isCompleted}
        error={progressError}
      />
    </div>
  );
};

export default PoolsPage;
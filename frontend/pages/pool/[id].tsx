import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePoolById } from '@/hooks/usePoolData';
import { useDomaLend, useInstantLoanEligibility, useUSDCAllowance, useUSDCBalance } from '@/hooks/web3/domalend/useDomaLend';
import { useUserDomains, usePool as usePoolRaw, useUserScoredDomains } from '@/hooks/useDomaLendApi';
import { formatUSDC, formatBasisPoints } from '@/utils/formatting';
import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccount } from 'wagmi';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  History,
  Wallet,
  DollarSign,
  Droplets,
  TrendingUp,
  Users
} from 'lucide-react';
import { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';

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

  // USDC related hooks
  const { allowance: usdcAllowance } = useUSDCAllowance(address, contracts.SATORU_LENDING);
  const { balance: usdcBalance } = useUSDCBalance(address);

  const [liquidityAmount, setLiquidityAmount] = useState('');
  const [withdrawPercentage, setWithdrawPercentage] = useState('');

  // Dialog states
  const [addLiquidityDialogOpen, setAddLiquidityDialogOpen] = useState(false);
  const [withdrawLiquidityDialogOpen, setWithdrawLiquidityDialogOpen] = useState(false);
  const [dialogLiquidityAmount, setDialogLiquidityAmount] = useState('');
  const [dialogWithdrawPercentage, setDialogWithdrawPercentage] = useState('');

  // Instant loan state
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanDuration, setLoanDuration] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState('loans');

  const userOwnedDomains = userDomainsData?.ownedNFTs || [];
  const userScoredDomains = userScoredDomainsData?.scoredDomains || [];

  // Use scored domains if available, fallback to owned domains for compatibility
  const userDomains = userScoredDomains.length > 0 ? userScoredDomains : userOwnedDomains;

  // Debug logging
  console.log('Pool Detail Debug:', {
    address,
    userOwnedDomains: userOwnedDomains.length,
    userScoredDomains: userScoredDomains.length,
    selectedDomainId,
    userScoredDomainsData,
    userDomainsData
  });

  // Check loan eligibility
  const { eligible, reason, isLoading: isCheckingEligibility } = useInstantLoanEligibility(
    selectedDomainId,
    poolId,
    loanAmount
  );

  // Debug eligibility check
  console.log('Eligibility Debug:', {
    selectedDomainId,
    poolId,
    loanAmount,
    eligible,
    reason,
    isCheckingEligibility
  });

  const handleAddLiquidity = async () => {
    if (!liquidityAmount || !poolId || !address) {
      toast.error('Please enter a valid amount and connect your wallet');
      return;
    }

    try {
      const result = await addLiquidity(poolId, liquidityAmount, address);

      if (result.success) {
        if ('approvalHash' in result) {
          // Both approval and liquidity addition happened
          toast.success(result.message || 'USDC approved and liquidity added successfully!');
          setLiquidityAmount('');
        } else if ('needsApproval' in result) {
          // Old flow - should not happen with new implementation
          toast.success(result.message || 'USDC approval successful!');
        } else {
          // Direct liquidity addition (already had approval)
          toast.success(`Liquidity added successfully! Transaction hash: ${result.hash}`);
          setLiquidityAmount('');
        }
      } else {
        throw new Error(result.error || 'Failed to add liquidity');
      }
    } catch (error) {
      console.error('Error adding liquidity:', error);
      toast.error('Failed to add liquidity. Please try again.');
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
      const result = await removeLiquidity(poolId, percentage);

      if (result.success) {
        toast.success(`Liquidity removed successfully! Transaction hash: ${result.hash}`);
        setWithdrawPercentage('');
      } else {
        throw new Error(result.error || 'Failed to remove liquidity');
      }
    } catch (error) {
      console.error('Error removing liquidity:', error);
      toast.error('Failed to remove liquidity. Please try again.');
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
      const result = await addLiquidity(poolId, dialogLiquidityAmount, address);

      if (result.success) {
        if ('approvalHash' in result) {
          // Both approval and liquidity addition happened
          toast.success(result.message || 'USDC approved and liquidity added successfully!');
          setDialogLiquidityAmount('');
          setAddLiquidityDialogOpen(false);
        } else if ('needsApproval' in result) {
          // Old flow - should not happen with new implementation
          toast.success(result.message || 'USDC approval successful!');
        } else {
          // Direct liquidity addition (already had approval)
          toast.success(`Liquidity added successfully! Transaction hash: ${result.hash}`);
          setDialogLiquidityAmount('');
          setAddLiquidityDialogOpen(false);
        }
      } else {
        throw new Error(result.error || 'Failed to add liquidity');
      }
    } catch (error) {
      console.error('Error adding liquidity:', error);
      toast.error('Failed to add liquidity. Please try again.');
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
      const result = await removeLiquidity(poolId, percentage);

      if (result.success) {
        toast.success(`Liquidity removed successfully! Transaction hash: ${result.hash}`);
        setDialogWithdrawPercentage('');
        setWithdrawLiquidityDialogOpen(false);
      } else {
        throw new Error(result.error || 'Failed to remove liquidity');
      }
    } catch (error) {
      console.error('Error removing liquidity:', error);
      toast.error('Failed to remove liquidity. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
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
    );
  }

  if (error || !pool) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Link href="/pools" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
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
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/pools" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
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
              disabled={isTransactionLoading}
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
                        <DollarSign className="h-5 w-5" />
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

                      {address && userDomains.length === 0 && (
                        <Alert className="border-blue-200 bg-blue-50">
                          <AlertCircle className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-blue-800">
                            You need to own domains to request loans. Visit the domains page to add domains to your wallet.
                          </AlertDescription>
                        </Alert>
                      )}

                      {address && userDomains.length > 0 && (
                        <>
                          <div>
                            <Label htmlFor="domain">Select Domain Collateral</Label>
                            <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a domain" />
                              </SelectTrigger>
                              <SelectContent>
                                {userDomains.map((domain: any) => (
                                  <SelectItem key={domain.tokenId} value={domain.tokenId}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{domain.name} (ID: {domain.tokenId})</span>
                                      {domain.aiScore && (
                                        <span className="text-xs text-blue-600 font-medium ml-2">
                                          Score: {domain.aiScore.score}/100
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
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
                        <Droplets className="h-5 w-5" />
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
                          <div className="flex justify-between text-sm">
                            <span>Current Allowance:</span>
                            <span className="font-medium">
                              {usdcAllowance >= BigInt(1e18) ? '∞' : (Number(usdcAllowance) / 1e6).toLocaleString()} USDC
                            </span>
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
                        <TrendingUp className="h-5 w-5" />
                        Remove Liquidity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWithdrawPercentage('25')}
                        >
                          25%
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWithdrawPercentage('50')}
                        >
                          50%
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWithdrawPercentage('75')}
                        >
                          75%
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWithdrawPercentage('100')}
                        >
                          100%
                        </Button>
                      </div>
                      <Button
                        onClick={handleRemoveLiquidity}
                        disabled={!withdrawPercentage || isTransactionLoading}
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

              {pool.defaultRate !== undefined && (
                <div>
                  <div className="text-sm text-gray-600">Default Rate</div>
                  <div className="font-semibold text-red-600">{(pool.defaultRate * 100).toFixed(1)}%</div>
                </div>
              )}

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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Liquidity to Pool</DialogTitle>
            <DialogDescription>
              Enter the amount of USDC you want to add to this liquidity pool.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {address && (
              <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>USDC Balance:</span>
                  <span className="font-medium">{(Number(usdcBalance) / 1e6).toLocaleString()} USDC</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Current Allowance:</span>
                  <span className="font-medium">
                    {usdcAllowance >= BigInt(1e18) ? '∞' : (Number(usdcAllowance) / 1e6).toLocaleString()} USDC
                  </span>
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddLiquidityDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddLiquidityFromDialog}
              disabled={!dialogLiquidityAmount || isTransactionLoading}
            >
              {isTransactionLoading ? 'Adding Liquidity...' : 'Add Liquidity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Liquidity Dialog */}
      <Dialog open={withdrawLiquidityDialogOpen} onOpenChange={setWithdrawLiquidityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Liquidity</DialogTitle>
            <DialogDescription>
              Enter the percentage of your liquidity position you want to withdraw.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogWithdrawPercentage('25')}
              >
                25%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogWithdrawPercentage('50')}
              >
                50%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogWithdrawPercentage('75')}
              >
                75%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogWithdrawPercentage('100')}
              >
                100%
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWithdrawLiquidityDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRemoveLiquidityFromDialog}
              disabled={!dialogWithdrawPercentage || isTransactionLoading}
              variant="destructive"
            >
              {isTransactionLoading ? 'Removing Liquidity...' : 'Remove Liquidity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PoolDetailPage;
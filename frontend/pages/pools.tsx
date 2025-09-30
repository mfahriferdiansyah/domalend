import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePoolData } from '@/hooks/usePoolData';
import { usePools as usePoolsRaw } from '@/hooks/useDomaLendApi';
import { ApiErrorState } from '@/components/common/api-error-boundary';
import { GridLoadingState } from '@/components/common/api-loading-state';
import { useDomaLend } from '@/hooks/web3/domalend/useDomaLend';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowUpRight,
  Droplets,
  TrendingUp,
  Users,
  DollarSign,
  AlertCircle,
  Plus
} from 'lucide-react';
import { NextPage } from 'next';
import Link from 'next/link';

const PoolsPage: NextPage = () => {
  const { data: pools, loading, error, refetch } = usePoolData();
  const { data: rawPoolsResponse, loading: rawLoading } = usePoolsRaw();
  const { createPool, isLoading: isCreatingPool, error: createPoolError } = useDomaLend();

  // Helper function to get active loans count from raw data
  const getActiveLoansCount = (poolId: string) => {
    if (!rawPoolsResponse) return 0;
    const rawPool = rawPoolsResponse.find(p => p.poolId === poolId);
    return rawPool?.activeLoans || 0;
  };

  // Pool creation state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [poolForm, setPoolForm] = useState({
    name: '',
    minScore: '',
    maxLTV: '',
    interestRate: ''
  });

  const handleCreatePool = async () => {
    if (!poolForm.name || !poolForm.minScore || !poolForm.maxLTV || !poolForm.interestRate) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const result = await createPool(
        poolForm.name,
        parseInt(poolForm.minScore),
        parseInt(poolForm.maxLTV),
        parseInt(poolForm.interestRate)
      );

      if (result.success) {
        toast.success(`Pool created successfully! Transaction hash: ${result.hash}`);
        setIsCreateDialogOpen(false);
        setPoolForm({
          name: '',
          minScore: '',
          maxLTV: '',
          interestRate: ''
        });
        // Refresh pools data
        refetch();
      } else {
        throw new Error(result.error || 'Failed to create pool');
      }
    } catch (error) {
      console.error('Error creating pool:', error);
      toast.error('Failed to create pool. Please try again.');
    }
  };

  const updateFormField = (field: string, value: string) => {
    setPoolForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <GridLoadingState items={6} columns={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ApiErrorState
          error={error}
          onRetry={refetch}
          fullHeight={true}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Lending Pools</h1>
          <p className="text-gray-600">Provide liquidity and earn returns on domain lending</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Pool
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Lending Pool</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="poolName">Pool Name</Label>
                  <Input
                    id="poolName"
                    placeholder="e.g., High-Value Domains Pool"
                    value={poolForm.name}
                    onChange={(e) => updateFormField('name', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="minScore">Minimum AI Score</Label>
                  <Input
                    id="minScore"
                    type="number"
                    placeholder="e.g., 75"
                    min="0"
                    max="100"
                    value={poolForm.minScore}
                    onChange={(e) => updateFormField('minScore', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="maxLTV">Maximum Loan-to-Value (%)</Label>
                  <Input
                    id="maxLTV"
                    type="number"
                    placeholder="e.g., 70"
                    min="1"
                    max="90"
                    value={poolForm.maxLTV}
                    onChange={(e) => updateFormField('maxLTV', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="interestRate">Interest Rate (%)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    placeholder="e.g., 12"
                    min="1"
                    max="50"
                    step="0.1"
                    value={poolForm.interestRate}
                    onChange={(e) => updateFormField('interestRate', e.target.value)}
                  />
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
                    className="flex-1"
                  >
                    {isCreatingPool ? 'Creating...' : 'Create Pool'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pool Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pools</p>
                <p className="text-2xl font-bold">{pools.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Liquidity</p>
                <p className="text-2xl font-bold">
                  ${pools.reduce((acc, pool) => {
                    const liquidity = parseFloat(pool.totalLiquidity || '0');
                    return acc + (isNaN(liquidity) ? 0 : liquidity);
                  }, 0).toLocaleString()}
                </p>
              </div>
              <Droplets className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg APY</p>
                <p className="text-2xl font-bold text-green-600">
                  {pools.length > 0
                    ? (pools.reduce((acc, pool) => {
                      const apy = parseFloat(pool.apy?.replace('%', '') || '0');
                      return acc + (isNaN(apy) ? 0 : apy);
                    }, 0) / pools.length).toFixed(1)
                    : '0.0'}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Loans</p>
                <p className="text-2xl font-bold">
                  {rawPoolsResponse?.reduce((acc, pool) => acc + (pool.activeLoans || 0), 0) || 0}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pools.map((pool) => (
          <Card key={pool.poolId} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{pool.poolName}</CardTitle>
                <Badge
                  className={
                    pool.poolType === 'instant'
                      ? 'bg-green-100 text-green-800'
                      : pool.poolType === 'crowdfunded'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                  }
                >
                  {pool.poolType}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">APY</span>
                    <div className="font-semibold text-green-600">{pool.apy}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Liquidity</span>
                    <div className="font-semibold">
                      ${(parseInt(pool.totalLiquidity || '0') || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Available</span>
                    <div className="font-semibold">
                      ${(parseInt(pool.availableLiquidity || '0') || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Active Loans</span>
                    <div className="font-semibold">{getActiveLoansCount(pool.poolId)}</div>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  <div>
                    Loan Range: ${(parseInt(pool.minLoanAmount || '0') || 0).toLocaleString()} - ${(parseInt(pool.maxLoanAmount || '0') || 0).toLocaleString()}
                  </div>
                  <div>LTV Ratio: {pool.loanToValueRatio}</div>
                </div>

                <div className="flex gap-2">
                  <Link href={`/pool/${pool.poolId}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      View Details
                      <ArrowUpRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pools.length === 0 && !loading && (
        <div className="text-center py-12">
          <Droplets className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Pools Available</h3>
          <p className="text-gray-600 mb-4">Be the first to create a lending pool and start earning returns.</p>
          <Button>Create First Pool</Button>
        </div>
      )}
    </div>
  );
};

export default PoolsPage;
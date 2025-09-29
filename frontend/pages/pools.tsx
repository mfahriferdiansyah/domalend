import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePoolData } from '@/hooks/usePoolData';
import {
  ArrowUpRight,
  Droplets,
  TrendingUp,
  Users,
  DollarSign
} from 'lucide-react';
import { NextPage } from 'next';
import Link from 'next/link';

const PoolsPage: NextPage = () => {
  const { data: pools, loading, error } = usePoolData();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Error Loading Pools</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
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
          <Button variant="outline" size="sm">Create Pool</Button>
          <Button>Add Liquidity</Button>
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
                  ${pools.reduce((acc, pool) => acc + parseFloat(pool.totalLiquidity || '0'), 0).toLocaleString()}
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
                    ? (pools.reduce((acc, pool) => acc + parseFloat(pool.apy || '0'), 0) / pools.length).toFixed(1)
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
                  {pools.reduce((acc, pool) => acc + (pool.loans?.length || 0), 0)}
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
                      : pool.poolType === 'custom'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
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
                    <div className="font-semibold text-green-600">{pool.apy}%</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Liquidity</span>
                    <div className="font-semibold">${parseInt(pool.totalLiquidity || '0').toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Available</span>
                    <div className="font-semibold">${parseInt(pool.availableLiquidity || '0').toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Active Loans</span>
                    <div className="font-semibold">{pool.loans?.length || 0}</div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  <div>Loan Range: ${parseInt(pool.minLoanAmount || '0').toLocaleString()} - ${parseInt(pool.maxLoanAmount || '0').toLocaleString()}</div>
                  <div>LTV Ratio: {pool.loanToValueRatio}%</div>
                </div>
                
                <div className="flex gap-2">
                  <Link href={`/pool/${pool.poolId}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      View Details
                      <ArrowUpRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                  <Button size="sm" className="flex-1">
                    Add Liquidity
                  </Button>
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
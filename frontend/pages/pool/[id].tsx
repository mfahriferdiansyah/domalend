import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePoolById } from '@/hooks/usePoolData';
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

const PoolDetailPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const poolId = typeof id === 'string' ? id : '';
  
  const { data: pool, loading, error } = usePoolById(poolId);

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
            <Button variant="outline">
              Withdraw
            </Button>
            <Button>
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
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Droplets className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-lg font-bold">${parseInt(pool.totalLiquidity || '0').toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Liquidity</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <div className="text-lg font-bold text-green-600">{pool.apy}%</div>
                  <div className="text-sm text-gray-600">Current APY</div>
                </div>
                
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <DollarSign className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <div className="text-lg font-bold">${parseInt(pool.availableLiquidity || '0').toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Available</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Users className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <div className="text-lg font-bold">{pool.loans?.length || 0}</div>
                  <div className="text-sm text-gray-600">Active Loans</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pool Details Tabs */}
          <Card>
            <Tabs defaultValue="loans" className="w-full">
              <CardHeader>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="loans">Active Loans</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
                              <div className="font-semibold">${parseInt(loan.amount).toLocaleString()}</div>
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
                
                <TabsContent value="history" className="space-y-4">
                  <div className="text-center py-8 text-gray-500">
                    <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Transaction history coming soon</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="analytics" className="space-y-4">
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Pool analytics coming soon</p>
                  </div>
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
                  ${parseInt(pool.minLoanAmount || '0').toLocaleString()} - ${parseInt(pool.maxLoanAmount || '0').toLocaleString()}
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
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full">
                <Wallet className="h-4 w-4 mr-2" />
                Add Liquidity
              </Button>
              <Button variant="outline" className="w-full">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Performance
              </Button>
              <Button variant="outline" className="w-full">
                <History className="h-4 w-4 mr-2" />
                Transaction History
              </Button>
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
    </div>
  );
};

export default PoolDetailPage;
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SiteIcon } from '@/components/ui/site-icon';
import domaLendAPI from '@/services/domalend-api';
// Removed separate domains API call - now included in /dashboard endpoint
import {
  AlertCircle,
  ArrowUpRight,
  Calendar,
  Clock,
  DollarSign,
  Droplets,
  Gavel,
  Star,
  Target,
  TrendingUp
} from 'lucide-react';
import { NextPage } from 'next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

interface DashboardData {
  stats: {
    totalPortfolio: string;
    activeLoansCount: number;
    activeLoansValue: string;
    liquidityProvided: string;
    liquidityPoolsCount: number;
    totalEarnings: string;
  };
  userLoans: Array<{
    loanId: string;
    domainName: string;
    domainTokenId: string;
    loanAmount: string;
    originalAmount: string;
    currentBalance: string;
    totalRepaid: string;
    repaymentDate: string;
    status: 'active' | 'overdue' | 'repaid' | 'liquidated';
    aiScore: number;
    interestRate: number;
    poolId: string;
    createdAt: string;
    liquidationAttempted: boolean;
    liquidationTimestamp?: string;
  }>;
  liquidityPositions: Array<{
    poolName: string;
    poolId: string;
    apy: string;
    contribution: string;
    earnings: string;
  }>;
  auctionOpportunities: Array<{
    domainName: string;
    currentBid: string;
    estimatedValue: string;
    timeRemaining: string;
    belowEstimatePercent: string;
  }>;
  recentActivity: Array<{
    type: 'loan_payment' | 'liquidity_added' | 'new_loan' | 'auction_bid';
    description: string;
    date: string;
    amount: string;
  }>;
  ownedNFTs: Array<{
    tokenId: string;
    name: string;
    owner: string;
    metadata?: {
      attributes?: Array<{
        trait_type: string;
        value: string | number;
      }>;
    };
  }>;
  scoredDomains: Array<{
    tokenId: string;
    owner: string;
    name: string;
    description: string;
    image: string;
    externalUrl: string;
    attributes: Array<{
      display_type?: string;
      trait_type: string;
      value: string | number;
    }>;
    expirationDate: number;
    tld: string;
    characterLength: number;
    registrar: string;
    loanHistory: {
      totalLoans: number;
      totalBorrowed: string;
      currentlyCollateralized: boolean;
      averageLoanAmount: string;
      successfulRepayments: number;
      liquidations: number;
    };
    aiScore: {
      score: number;
      confidence: number;
      lastUpdated: string;
      factors: {
        age: number;
        extension: number;
        length: number;
        keywords: number;
        traffic: number;
      };
    };
  }>;
}

const DashboardPage: NextPage = () => {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loanFilter, setLoanFilter] = useState<'all' | 'active' | 'repaid' | 'liquidated' | 'overdue'>('all');

  // User domains are now included in the /dashboard endpoint response

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Add debugging info
      console.log('Dashboard: address =', address, 'isConnected =', isConnected);

      if (!address || !isConnected) {
        console.log('Dashboard: Not fetching data - missing address or not connected');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('Dashboard: Fetching data for address:', address);

        const response = await domaLendAPI.getUserDashboard(address);
        console.log('Dashboard: API response:', response);
        setData(response.dashboard);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [address, isConnected]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'new_loan': return <DollarSign className="h-4 w-4" />;
      case 'loan_payment': return <TrendingUp className="h-4 w-4" />;
      case 'auction_bid': return <Gavel className="h-4 w-4" />;
      case 'liquidity_added': return <Droplets className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'new_loan': return 'bg-blue-100 text-blue-800';
      case 'loan_payment': return 'bg-green-100 text-green-800';
      case 'auction_bid': return 'bg-purple-100 text-purple-800';
      case 'liquidity_added': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLoanStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'repaid': return 'bg-blue-100 text-blue-800';
      case 'liquidated': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFilteredLoans = (loans: DashboardData['userLoans']) => {
    if (loanFilter === 'all') return loans;
    return loans.filter(loan => loan.status === loanFilter);
  };

  const getLoanStats = (loans: DashboardData['userLoans']) => {
    const stats = {
      all: loans.length,
      active: loans.filter(l => l.status === 'active').length,
      overdue: loans.filter(l => l.status === 'overdue').length,
      repaid: loans.filter(l => l.status === 'repaid').length,
      liquidated: loans.filter(l => l.status === 'liquidated').length,
    };
    return stats;
  };

  const DashboardContent = () => {
    if (loading) {
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="animate-pulse">
              {/* Header */}
              <div className="mb-8 flex justify-between items-center">
                <div>
                  <div className="h-8 bg-gray-200 rounded mb-2 w-48"></div>
                  <div className="h-4 bg-gray-200 rounded w-64"></div>
                </div>
              </div>

              {/* Portfolio Overview - 3 columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                ))}
              </div>

              {/* Main Content Grid - 2 columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Loan History Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="h-6 bg-gray-200 rounded mb-4 w-32"></div>
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-8 bg-gray-200 rounded w-16"></div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-6 h-6 bg-gray-200 rounded"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded mb-1 w-24"></div>
                            <div className="h-3 bg-gray-200 rounded w-32"></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="h-4 bg-gray-200 rounded mb-1 w-16"></div>
                          <div className="h-5 bg-gray-200 rounded w-12"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Liquidity Positions Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="h-6 bg-gray-200 rounded mb-4 w-40"></div>
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                          <div className="h-5 bg-gray-200 rounded w-12"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="h-3 bg-gray-200 rounded mb-1 w-20"></div>
                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                          </div>
                          <div>
                            <div className="h-3 bg-gray-200 rounded mb-1 w-16"></div>
                            <div className="h-4 bg-gray-200 rounded w-14"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Listed Domains Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-5 h-5 bg-gray-200 rounded"></div>
                    <div className="h-6 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded"></div>
                          <div>
                            <div className="h-4 bg-gray-200 rounded mb-1 w-24"></div>
                            <div className="h-3 bg-gray-200 rounded w-32"></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-5 bg-gray-200 rounded w-12"></div>
                          <div className="w-8 h-8 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scored Domains Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-5 h-5 bg-gray-200 rounded"></div>
                    <div className="h-6 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded"></div>
                          <div>
                            <div className="h-4 bg-gray-200 rounded mb-1 w-24"></div>
                            <div className="h-3 bg-gray-200 rounded w-32"></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="h-4 bg-gray-200 rounded mb-1 w-8"></div>
                            <div className="h-3 bg-gray-200 rounded w-12"></div>
                          </div>
                          <div className="w-8 h-8 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Auction Activity Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="h-6 bg-gray-200 rounded mb-4 w-40"></div>
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-200 rounded mx-auto mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2 w-32 mx-auto"></div>
                    <div className="h-3 bg-gray-200 rounded mb-4 w-48 mx-auto"></div>
                    <div className="h-8 bg-gray-200 rounded w-24 mx-auto"></div>
                  </div>
                </div>

                {/* Recent Activity Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="h-6 bg-gray-200 rounded mb-4 w-32"></div>
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded mb-1 w-32"></div>
                          <div className="h-3 bg-gray-200 rounded w-20"></div>
                        </div>
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (!data) {
      // If wallet is connected but data failed to load, show error
      if (address && isConnected) {
        return (
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Dashboard Data Failed to Load</h2>
              <p className="text-gray-600 mb-4">
                Unable to retrieve your dashboard information at this time.
              </p>
              <div className="space-x-2">
                <Button onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Force refetch
                    const fetchData = async () => {
                      try {
                        setLoading(true);
                        setError(null);
                        const response = await domaLendAPI.getUserDashboard(address);
                        setData(response.dashboard);
                      } catch (err) {
                        console.error('Manual fetch failed:', err);
                        setError('Failed to load dashboard data.');
                      } finally {
                        setLoading(false);
                      }
                    };
                    fetchData();
                  }}
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        );
      }

      // If wallet is not connected, show connect message
      return (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Welcome to DomaLend</h2>
            <p className="text-gray-600 mb-4">Connect your wallet to view your dashboard</p>
            {openConnectModal && (
              <Button onClick={openConnectModal}>
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500 mb-4">
              The `/dashboard/user/{address}` endpoint is not working properly.
            </p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-600">Overview of your lending portfolio</p>
            </div>
          </div>

          {/* Portfolio Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="relative overflow-hidden rounded-lg bg-white shadow h-32">
              {parseInt(data.stats.totalPortfolio) > 0 && (
                <svg viewBox="0 0 300 120" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,80 Q75,75 150,70 T300,65 L300,120 L0,120 Z"
                    fill="url(#blueGradient)"
                  />
                  <path
                    d="M0,80 Q75,75 150,70 T300,65"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
              )}
              <div className="relative z-10 p-6">
                <p className="text-sm font-medium text-gray-600">Total Portfolio</p>
                <p className="text-2xl font-bold">
                  ${parseInt(data.stats.totalPortfolio).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg bg-white shadow h-32">
              {parseInt(data.stats.activeLoansValue) > 0 && (
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
                <p className="text-sm font-medium text-gray-600">Active Loans</p>
                <p className="text-2xl font-bold">
                  ${parseInt(data.stats.activeLoansValue).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">{data.stats.activeLoansCount} loans</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg bg-white shadow h-32">
              {parseInt(data.stats.liquidityProvided) > 0 && (
                <svg viewBox="0 0 300 120" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="dropletGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,70 Q75,80 150,72 T300,65 L300,120 L0,120 Z"
                    fill="url(#dropletGradient)"
                  />
                  <path
                    d="M0,70 Q75,80 150,72 T300,65"
                    stroke="#06b6d4"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
              )}
              <div className="relative z-10 p-6">
                <p className="text-sm font-medium text-gray-600">Liquidity Provided</p>
                <p className="text-2xl font-bold">
                  ${parseInt(data.stats.liquidityProvided).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">{data.stats.liquidityPoolsCount} pools</p>
              </div>
            </div>

            {/* <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Earnings</p>
                  <p className="text-2xl font-bold text-green-600">${parseInt(data.stats.totalEarnings).toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">All time</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card> */}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Loan History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Loan History</span>
                </CardTitle>
                <div className="flex gap-2 mt-4 flex-wrap">
                  {(() => {
                    const stats = getLoanStats(data.userLoans);
                    return ['all', 'active', 'overdue', 'repaid', 'liquidated'].map((status) => (
                      <Button
                        key={status}
                        variant={loanFilter === status ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLoanFilter(status as any)}
                        className="text-xs"
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)} ({stats[status as keyof typeof stats]})
                      </Button>
                    ));
                  })()}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {(() => {
                    const filteredLoans = getFilteredLoans(data.userLoans);
                    return filteredLoans.map((loan) => (
                      <div key={loan.loanId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          <SiteIcon
                            domain={loan.domainName}
                            size={24}
                            className="flex-shrink-0"
                          />
                          <div className="flex-1">
                            <div className="font-semibold">{loan.domainName}</div>
                          <div className="text-sm text-gray-600">
                            Due: {loan.repaymentDate}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ID: {loan.loanId} • Pool: {loan.poolId} • AI Score: {loan.aiScore}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${parseInt(loan.loanAmount).toLocaleString()}</div>
                          <Badge className={getLoanStatusColor(loan.status)}>
                            {loan.status}
                          </Badge>
                          {loan.status === 'liquidated' && loan.liquidationTimestamp && (
                            <div className="text-xs text-gray-500 mt-1">
                              Liquidated: {new Date(parseInt(loan.liquidationTimestamp)).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                  {getFilteredLoans(data.userLoans).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No {loanFilter === 'all' ? '' : loanFilter} loans</p>
                      {loanFilter === 'all' && (
                        <Link href="/domains">
                          <Button className="mt-2" size="sm">Browse Domains</Button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Liquidity Positions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Liquidity Positions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.liquidityPositions.map((position, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold">{position.poolName}</div>
                        <Badge className="bg-blue-100 text-blue-800">
                          {position.apy}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Contribution:</span>
                          <div className="font-semibold">${parseInt(position.contribution).toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Earnings:</span>
                          <div className="font-semibold text-green-600">${parseInt(position.earnings).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {data.liquidityPositions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No liquidity positions</p>
                      <Link href="/pools">
                        <Button className="mt-2" size="sm">Browse Pools</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>


            {/* Listed Domains Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Gavel className="h-5 w-5" />
                    Listed on Doma
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.ownedNFTs && data.ownedNFTs.length > 0 ? (
                  <div className="space-y-3">
                    {data.ownedNFTs.map((domain) => (
                      <div key={domain.tokenId} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <SiteIcon
                            domain={domain.name || `domain-${domain.tokenId}`}
                            size={40}
                            className="flex-shrink-0"
                          />
                          <div>
                            <div className="font-semibold">{domain.name || `Domain #${domain.tokenId}`}</div>
                            <div className="text-sm text-gray-600 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Listed on marketplace
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-orange-100 text-orange-800">
                            Listed
                          </Badge>
                          <Link href={`/domains/${domain.tokenId}`}>
                            <Button variant="ghost" size="sm">
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}

                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Gavel className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="mb-2">No domains listed yet</p>
                    <p className="text-sm text-gray-400 mb-4">
                      List your domains on the Doma marketplace to earn from sales
                    </p>
                    <Link href="/domains">
                      <Button size="sm">List a Domain</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scored Domains Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Scored Domains
                  </span>

                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.scoredDomains && data.scoredDomains.length > 0 ? (
                  <div className="space-y-3">
                    {data.scoredDomains.map((domain) => (
                      <div key={domain.tokenId} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <SiteIcon
                            domain={domain.name}
                            size={40}
                            className="flex-shrink-0"
                          />
                          <div>
                            <div className="font-semibold">{domain.name}</div>
                            <div className="text-sm text-gray-600 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              .{domain.tld} • {domain.characterLength} chars
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-sm font-semibold text-green-600">
                              {domain.aiScore.score}/100
                            </div>
                            <div className="text-xs text-gray-500">
                              {domain.aiScore.confidence}% confidence
                            </div>
                          </div>
                          <Link href={`/domains/${domain.tokenId}`}>
                            <Button variant="ghost" size="sm">
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}

                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="mb-2">No scored domains yet</p>
                    <p className="text-sm text-gray-400 mb-4">
                      Add domains to your portfolio and request AI scoring to get started
                    </p>
                    <Link href="/domains/add">
                      <Button size="sm">Score a Domain</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>


            {/* Additional Sections */}
            {/* My Auction Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>My Auction Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Gavel className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="mb-2">No active auction activity</p>
                  <p className="text-sm text-gray-400 mb-4">
                    This will show auctions related to your domains, loans, or bids
                  </p>
                  <Link href="/auctions">
                    <Button size="sm">Browse Auctions</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{activity.description}</div>
                        <div className="text-xs text-gray-600">
                          {activity.date}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">
                        ${parseInt(activity.amount).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {data.recentActivity.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No recent activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    );
  };

  return <DashboardContent />;
};

export default DashboardPage;
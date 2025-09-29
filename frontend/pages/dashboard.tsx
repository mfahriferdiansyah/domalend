import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import domaLendAPI from '@/services/domalend-api';
import {
  AlertCircle,
  Clock,
  DollarSign,
  Droplets,
  Gavel,
  Target,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { NextPage } from 'next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

interface DashboardData {
  stats: {
    totalPortfolio: string;
    portfolioChangePercent: string;
    activeLoansCount: number;
    activeLoansValue: string;
    liquidityProvided: string;
    liquidityPoolsCount: number;
    totalEarnings: string;
  };
  activeLoans: Array<{
    domainName: string;
    loanAmount: string;
    nextPaymentDate: string;
    status: 'active' | 'overdue' | 'completed';
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
}

const DashboardPage: NextPage = () => {
  const { address, isConnected } = useAccount();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!address || !isConnected) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await domaLendAPI.getUserDashboard(address);
        setData(response.dashboard);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');

        // Fallback to mock data for development
        const mockData: DashboardData = {
          stats: {
            totalPortfolio: '45780',
            portfolioChangePercent: '12.3',
            activeLoansCount: 2,
            activeLoansValue: '8950',
            liquidityProvided: '25600',
            liquidityPoolsCount: 2,
            totalEarnings: '3420'
          },
          activeLoans: [
            {
              domainName: 'example.com',
              loanAmount: '2800',
              nextPaymentDate: '10/15/2024',
              status: 'active'
            },
            {
              domainName: 'crypto.org',
              loanAmount: '6500',
              nextPaymentDate: '9/1/2024',
              status: 'overdue'
            }
          ],
          liquidityPositions: [
            {
              poolName: 'Premium Domain Pool',
              poolId: '1',
              apy: '12.5%',
              contribution: '15000',
              earnings: '1875'
            },
            {
              poolName: 'Instant Approval Pool',
              poolId: '2',
              apy: '15.8%',
              contribution: '10600',
              earnings: '1674'
            }
          ],
          auctionOpportunities: [
            {
              domainName: 'example.com',
              currentBid: '6300',
              estimatedValue: '8500',
              timeRemaining: 'Ends in 48h',
              belowEstimatePercent: '26'
            },
            {
              domainName: 'crypto.org',
              currentBid: '11700',
              estimatedValue: '15000',
              timeRemaining: 'Ends in 72h',
              belowEstimatePercent: '22'
            }
          ],
          recentActivity: [
            {
              type: 'loan_payment',
              description: 'Loan payment for example.com',
              date: '9/10/2024',
              amount: '320'
            },
            {
              type: 'liquidity_added',
              description: 'Added liquidity to Premium Domain Pool',
              date: '9/8/2024',
              amount: '5000'
            },
            {
              type: 'new_loan',
              description: 'New loan for defi.io',
              date: '9/5/2024',
              amount: '2240'
            }
          ]
        };
        setData(mockData);
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

  const DashboardContent = () => {
    if (loading) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Welcome to DomaLend</h2>
            <p className="text-gray-600 mb-4">Connect your wallet to view your dashboard</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">Overview of your lending portfolio</p>
          </div>
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Portfolio</p>
                  <p className="text-2xl font-bold">${parseInt(data.stats.totalPortfolio).toLocaleString()}</p>
                  <div className="flex items-center mt-1">
                    {parseFloat(data.stats.portfolioChangePercent) >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    <span className={`text-xs ${parseFloat(data.stats.portfolioChangePercent) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {Math.abs(parseFloat(data.stats.portfolioChangePercent))}% this month
                    </span>
                  </div>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Loans</p>
                  <p className="text-2xl font-bold">${parseInt(data.stats.activeLoansValue).toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">{data.stats.activeLoansCount} loans</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Liquidity Provided</p>
                  <p className="text-2xl font-bold">${parseInt(data.stats.liquidityProvided).toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">{data.stats.liquidityPoolsCount} pools</p>
                </div>
                <Droplets className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Loans */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Active Loans</span>
                <Link href="/loans">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.activeLoans.map((loan, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-semibold">{loan.domainName}</div>
                      <div className="text-sm text-gray-600">
                        Next payment: {loan.nextPaymentDate}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${parseInt(loan.loanAmount).toLocaleString()}</div>
                      <Badge className={
                        loan.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }>
                        {loan.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {data.activeLoans.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No active loans</p>
                    <Link href="/domains">
                      <Button className="mt-2" size="sm">Browse Domains</Button>
                    </Link>
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
                <Link href="/pools">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
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

          {/* Auction Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Auction Opportunities</span>
                <Link href="/auctions">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.auctionOpportunities.map((auction, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold">{auction.domainName}</div>
                        <div className="text-sm text-gray-600">
                          {auction.timeRemaining}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${parseInt(auction.currentBid).toLocaleString()}</div>
                        <div className="text-sm text-green-600">
                          Est. ${parseInt(auction.estimatedValue).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        {auction.belowEstimatePercent}% below estimate
                      </div>
                      <Button size="sm" variant="outline">
                        Place Bid
                      </Button>
                    </div>
                  </div>
                ))}
                {data.auctionOpportunities.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No active auctions</p>
                  </div>
                )}
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
    );
  };

  return <DashboardContent />;
};

export default DashboardPage;
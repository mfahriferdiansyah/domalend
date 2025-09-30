import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  Users, 
  DollarSign, 
  Clock,
  Target,
  Droplets,
  Brain,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { usePrivyAuth } from '@/hooks/use-privy-auth';

interface MarketStats {
  totalValueLocked: number;
  totalLoansIssued: number;
  averageAPY: number;
  totalActiveLoans: number;
  totalAuctions: number;
  totalPools: number;
}

const DomaLendPage: NextPage = () => {
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { ready, authenticated } = usePrivyAuth();

  useEffect(() => {
    // Mock stats - will be replaced with API call
    const mockStats: MarketStats = {
      totalValueLocked: 2850000,
      totalLoansIssued: 1250,
      averageAPY: 14.2,
      totalActiveLoans: 89,
      totalAuctions: 12,
      totalPools: 8
    };
    
    setStats(mockStats);
    setLoading(false);
  }, []);

  const features = [
    {
      icon: <Brain className="h-8 w-8 text-blue-600" />,
      title: "AI-Powered Valuation",
      description: "Advanced machine learning models analyze domain age, keywords, traffic, and market data for precise valuations."
    },
    {
      icon: <Shield className="h-8 w-8 text-blue-600" />,
      title: "Secure Collateral",
      description: "Your domain NFTs are safely held in smart contracts with automated liquidation protection."
    },
    {
      icon: <Zap className="h-8 w-8 text-blue-600" />,
      title: "Instant Loans",
      description: "Get approved in minutes with our instant loan pools powered by algorithmic risk assessment."
    },
    {
      icon: <Users className="h-8 w-8 text-blue-600" />,
      title: "Community Driven",
      description: "Create custom lending pools with your own criteria or join community-funded opportunities."
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: "Connect Your Domains",
      description: "Link your Doma Protocol domain NFTs to start the lending process."
    },
    {
      step: 2,
      title: "Get AI Valuation",
      description: "Our AI analyzes your domain and provides a comprehensive score and valuation."
    },
    {
      step: 3,
      title: "Request Loan",
      description: "Choose from instant approval pools or create custom loan requests."
    },
    {
      step: 4,
      title: "Receive Funds",
      description: "Get your loan instantly while keeping domain ownership rights."
    }
  ];

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 bg-blue-50 text-blue-700 border-blue-200">
              🚀 Now Live on Doma Protocol
            </Badge>
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Unlock Liquidity from Your{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Domain NFTs
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              The first AI-powered lending platform for domain collateral. Get instant loans, 
              earn yield as a lender, or bid on premium domains in Dutch auctions.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {ready && authenticated ? (
                <>
                  <Link href="/dashboard">
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                      Open Dashboard
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/domains">
                    <Button size="lg" variant="outline" className="px-8">
                      Browse Domains
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/domains">
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                      Get Started
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/auctions">
                    <Button size="lg" variant="outline" className="px-8">
                      View Auctions
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-20">
            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${stats.totalValueLocked.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">TVL</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalLoansIssued}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Loans Issued</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.averageAPY}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg APY</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalActiveLoans}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active Loans</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Droplets className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalPools}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Liquidity Pools</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalAuctions}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Live Auctions</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose DomaLend?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Revolutionary features that make domain lending safe, efficient, and profitable for everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Get started with domain lending in four simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Unlock Your Domain&apos;s Value?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of domain owners who are already earning with DomaLend.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {ready && authenticated ? (
              <Link href="/dashboard">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Link href="/domains">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8">
                  Start Lending
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            )}
            <Link href="/pools">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 px-8">
                Become a Lender
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">D</span>
                </div>
                <span className="text-xl font-bold">DomaLend</span>
              </div>
              <p className="text-gray-400">
                AI-powered domain lending platform built on Doma Protocol.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/domains" className="hover:text-white">Browse Domains</Link></li>
                <li><Link href="/loans" className="hover:text-white">My Loans</Link></li>
                <li><Link href="/auctions" className="hover:text-white">Auctions</Link></li>
                <li><Link href="/pools" className="hover:text-white">Liquidity Pools</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-white">API</a></li>
                <li><a href="#" className="hover:text-white">Support</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Discord</a></li>
                <li><a href="#" className="hover:text-white">Twitter</a></li>
                <li><a href="#" className="hover:text-white">Telegram</a></li>
                <li><a href="#" className="hover:text-white">GitHub</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2024 DomaLend. Built with ❤️ for the Doma Protocol ecosystem.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DomaLendPage;
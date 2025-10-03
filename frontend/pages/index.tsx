import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/ui/product-card';
import {
  Shield,
  ArrowRight,
  X
} from 'lucide-react';
import Link from 'next/link';
import { usePrivyAuth } from '@/hooks/use-privy-auth';

interface MarketStats {
  totalValueLocked: number;
  totalLoansIssued: number;
  averageAPY: number;
  totalActiveLoans: number;
}

const DomaLendPage: NextPage = () => {
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock stats - will be replaced with API call
    const mockStats: MarketStats = {
      totalValueLocked: 2850000,
      totalLoansIssued: 1250,
      averageAPY: 14.2,
      totalActiveLoans: 89
    };

    setStats(mockStats);
    setLoading(false);
  }, []);

  // Product cards data
  const productCards = stats ? [
    {
      badge: {
        text: 'Verifiable AI-Powered',
        variant: 'green' as const
      },
      title: 'Verifiable AI Domain Lending',
      description: 'Borrow against your domains with verifiable AI agents on Doma Chain ensuring transparent, trustless, and decentralized scoring.',
      illustration: (
        <div className="w-48 h-48 relative">
          {/* Three AI Robots */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-full h-full">

              {/* Robot 1 - Center */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-16 h-20 bg-gradient-to-b from-green-400 to-green-500 rounded-3xl relative">
                  {/* Robot head */}
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gradient-to-b from-green-300 to-green-400 rounded-2xl">
                    {/* Eyes */}
                    <div className="absolute top-3 left-2 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <div className="absolute top-3 right-2 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    {/* Antenna */}
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0.5 h-3 bg-green-600"></div>
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                  </div>

                  {/* Arms */}
                  <div className="absolute top-2 -left-2 w-4 h-2 bg-green-400 rounded-full"></div>
                  <div className="absolute top-2 -right-2 w-4 h-2 bg-green-400 rounded-full"></div>

                  {/* Central processing unit */}
                  <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-gray-800 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-500 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Robot 2 - Left */}
              <div className="absolute top-1/2 left-0 transform -translate-y-1/2">
                <div className="w-16 h-20 bg-gradient-to-b from-green-400 to-green-500 rounded-3xl relative">
                  {/* Robot head */}
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gradient-to-b from-green-300 to-green-400 rounded-2xl">
                    {/* Eyes */}
                    <div className="absolute top-3 left-2 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <div className="absolute top-3 right-2 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    {/* Antenna */}
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0.5 h-3 bg-green-600"></div>
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                  </div>

                  {/* Arms */}
                  <div className="absolute top-2 -left-2 w-4 h-2 bg-green-400 rounded-full"></div>
                  <div className="absolute top-2 -right-2 w-4 h-2 bg-green-400 rounded-full"></div>

                  {/* Central processing unit */}
                  <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-gray-800 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-500 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Robot 3 - Right */}
              <div className="absolute top-1/2 right-0 transform -translate-y-1/2">
                <div className="w-16 h-20 bg-gradient-to-b from-green-400 to-green-500 rounded-3xl relative">
                  {/* Robot head */}
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gradient-to-b from-green-300 to-green-400 rounded-2xl">
                    {/* Eyes */}
                    <div className="absolute top-3 left-2 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <div className="absolute top-3 right-2 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    {/* Antenna */}
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0.5 h-3 bg-green-600"></div>
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                  </div>

                  {/* Arms */}
                  <div className="absolute top-2 -left-2 w-4 h-2 bg-green-400 rounded-full"></div>
                  <div className="absolute top-2 -right-2 w-4 h-2 bg-green-400 rounded-full"></div>

                  {/* Central processing unit */}
                  <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-gray-800 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-500 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Connection lines between robots */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 192 192">
                <line x1="64" y1="96" x2="96" y2="96" stroke="#10B981" strokeWidth="2" opacity="0.6" />
                <line x1="128" y1="96" x2="96" y2="96" stroke="#10B981" strokeWidth="2" opacity="0.6" />
              </svg>
            </div>
          </div>

          {/* Background glow */}
          <div className="absolute inset-4 bg-gradient-to-br from-green-100 to-green-200 rounded-full opacity-30 blur-sm"></div>
        </div>
      )
    },

    {
      badge: {
        text: `${stats.totalLoansIssued} Domains Scored`,
        variant: 'blue' as const
      },
      title: 'Domain as a Collateral',
      description: 'Use your domain names as collateral to secure loans. Domain value assessment and smart contract escrow ensure secure lending backed by digital assets.',
      illustration: (
        <div className="w-48 h-32 relative">
          {/* Domain Collateral Visualization */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4">
            {/* Domain representation */}
            <div className="flex items-center justify-center mb-3">
              <div className="bg-white rounded-lg px-3 py-2 shadow-sm border-2 border-blue-300">
                <div className="text-xs font-semibold text-blue-700">mydomain.com</div>
              </div>
            </div>

            {/* Arrow pointing down */}
            <div className="flex justify-center mb-2">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-blue-500"></div>
            </div>

            {/* Escrow/Lock visualization */}
            <div className="flex items-center justify-center mb-2">
              <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200 relative">
                <div className="w-8 h-6 bg-blue-200 rounded flex items-center justify-center">
                  <div className="w-3 h-3 border-2 border-blue-600 rounded-sm"></div>
                </div>
                {/* Lock icon */}
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 border border-white rounded-sm"></div>
                </div>
              </div>
            </div>

            {/* Loan value indicator */}
            <div className="flex justify-center">
              <div className="bg-blue-100 rounded px-2 py-1 text-xs font-medium text-blue-700">
                $5,000 Loan
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      badge: {
        text: `${stats.averageAPY}% Fixed APR`,
        variant: 'orange' as const
      },
      title: 'Fixed APR Lending Pools',
      description: 'Earn predictable returns as a lender with fixed APR rates. Create custom lending pools or join existing ones with transparent terms.',
      illustration: (
        <div className="w-48 h-32 relative">
          {/* Bank/Pool Building */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4">

            {/* Main bank building */}
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Building structure */}
              <div className="w-24 h-20 bg-gradient-to-b from-orange-300 to-orange-400 rounded-t-lg relative">

                {/* Columns */}
                <div className="absolute inset-x-2 top-2 flex justify-between">
                  <div className="w-2 h-12 bg-orange-500 rounded-sm"></div>
                  <div className="w-2 h-12 bg-orange-500 rounded-sm"></div>
                  <div className="w-2 h-12 bg-orange-500 rounded-sm"></div>
                </div>

                {/* Roof */}
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[16px] border-r-[16px] border-b-[12px] border-l-transparent border-r-transparent border-b-orange-600"></div>

                {/* Door */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-8 bg-orange-600 rounded-t-lg"></div>

                {/* Sign with APR */}
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 bg-white rounded px-2 py-0.5 text-xs shadow-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <div className="w-6 h-0.5 bg-orange-400 rounded"></div>
                  </div>
                </div>
              </div>

              {/* Money flowing in from sides */}
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                <div className="flex flex-col gap-1">
                  <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-yellow-600 flex items-center justify-center">
                    <div className="text-xs text-yellow-800">$</div>
                  </div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full border-2 border-yellow-600 flex items-center justify-center">
                    <div className="text-xs text-yellow-800">$</div>
                  </div>
                </div>
                {/* Arrow pointing to bank */}
                <div className="absolute right-0 top-2 w-4 h-0.5 bg-yellow-600"></div>
                <div className="absolute right-0 top-1.5 w-0 h-0 border-l-2 border-t-1 border-b-1 border-l-yellow-600 border-t-transparent border-b-transparent"></div>
              </div>

              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <div className="flex flex-col gap-1">
                  <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-yellow-600 flex items-center justify-center">
                    <div className="text-xs text-yellow-800">$</div>
                  </div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full border-2 border-yellow-600 flex items-center justify-center">
                    <div className="text-xs text-yellow-800">$</div>
                  </div>
                </div>
                {/* Arrow pointing to bank */}
                <div className="absolute left-0 top-2 w-4 h-0.5 bg-yellow-600"></div>
                <div className="absolute left-0 top-1.5 w-0 h-0 border-r-2 border-t-1 border-b-1 border-r-yellow-600 border-t-transparent border-b-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      badge: {
        text: `${stats.totalActiveLoans} Active Loans`,
        variant: 'purple' as const
      },
      title: 'Transparent Liquidation',
      description: 'Smart contract-based liquidation with real-time domain revaluation and transparent auction processes.',
      illustration: (
        <div className="w-48 h-32 relative">
          {/* Liquidation Monitor Dashboard */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4">
            {/* Header with monitor icon */}
            <div className="flex items-center justify-between mb-3">
              <div className="w-6 h-6 bg-purple-600 rounded-lg flex items-center justify-center">
                <div className="w-4 h-3 border-2 border-white rounded-sm"></div>
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
              </div>
            </div>

            {/* Main content */}
            <div className="space-y-2">
              {/* Price chart */}
              <div className="bg-white rounded-lg p-2 h-12">
                <svg className="w-full h-full" viewBox="0 0 160 32">
                  <path d="M4,28 L20,24 L36,26 L52,18 L68,20 L84,14 L100,16 L116,10 L132,12 L148,8 L156,6"
                    fill="none" stroke="#A855F7" strokeWidth="2" />
                  <circle cx="148" cy="8" r="2" fill="#A855F7" />
                  {/* Warning threshold line */}
                  <line x1="0" y1="16" x2="160" y2="16" stroke="#EF4444" strokeWidth="1" strokeDasharray="2,2" opacity="0.7" />
                </svg>
              </div>

              {/* Status indicators */}
              <div className="grid grid-cols-3 gap-1">
                <div className="bg-white rounded p-1 text-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mx-auto mb-1"></div>
                  <div className="h-1 bg-purple-200 rounded"></div>
                </div>
                <div className="bg-white rounded p-1 text-center">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mx-auto mb-1"></div>
                  <div className="h-1 bg-purple-200 rounded"></div>
                </div>
                <div className="bg-white rounded p-1 text-center">
                  <div className="w-2 h-2 bg-purple-300 rounded-full mx-auto mb-1"></div>
                  <div className="h-1 bg-purple-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ] : [];

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mt-20 mb-28">
            <Badge variant="outline" className="mb-4 bg-white text-black border-gray-200 flex items-center gap-2 w-[350px] mx-auto justify-center">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              Domain&apos;s lending powered by verifiable AI Agent
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mt-6 mb-6">
              The <span className="text-gray-600">verifiable AI agent</span> powering{' '}
              <br />
              Domain&apos;s <span className="font-black">lending.</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto">
              DomaLend deploys verifiable AI agents for
              <br />
              transparent domain scoring, fixed APR lending, and trustless collateral management.
            </p>
          </div>

          {/* Main Product Grid - 2x2 layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
            {productCards.map((card, index) => (
              <ProductCard
                key={index}
                badge={card.badge}
                title={card.title}
                description={card.description}
                illustration={card.illustration}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-10 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-4">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Powered by cutting-edge technology
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our verifiable AI lending platform leverages industry-leading protocols and infrastructure.
            </p>
          </div>

          {/* Tech Stack Logos */}
          <div className="flex flex-wrap justify-center items-center gap-12 mb-16">
            <div className="flex items-center justify-center">
              <a href="https://doma.xyz/" target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                <img src="/icons/stack-doma.svg" alt="Doma Protocol" className="h-8 w-auto filter grayscale brightness-50 opacity-70 hover:opacity-100 hover:filter-none hover:brightness-100 transition-all duration-300" />
              </a>
            </div>
            <div className="flex items-center justify-center">
              <a href="https://www.eigencloud.xyz/" target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                <img src="/icons/stack-eigenlayer.svg" alt="EigenLayer" className="h-28 w-auto filter grayscale opacity-60 hover:opacity-100 hover:filter-none transition-all duration-300" />
              </a>
            </div>
            <div className="flex items-center justify-center">
              <a href="https://ponder.sh/" target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                <img src="/icons/stack-ponder.svg" alt="Ponder" className="h-8 w-auto filter grayscale brightness-0 opacity-70 hover:opacity-100 hover:filter-none hover:brightness-100 transition-all duration-300" />
              </a>
            </div>
            <div className="flex items-center justify-center">
              <a href="https://reclaimprotocol.org/" target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                <img src="/icons/stack-recclaim-protocol.svg" alt="Reclaim Protocol" className="h-12 w-auto filter grayscale brightness-50 opacity-70 hover:opacity-100 hover:filter-none hover:brightness-100 transition-all duration-300" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* DLEND Token Section */}
      <section className="py-10 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-gray-900 text-white border-gray-800 overflow-hidden">
            <CardContent className="p-8">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold mb-4">$DLEND</h3>
                  <p className="text-gray-300 mb-6 max-w-md">
                    DomaLend is pioneering verifiable AI agents in DeFi. DLEND powers our
                    trustless AI infrastructure on Doma Protocol.
                  </p>
                  <Button className="bg-white text-gray-900 hover:bg-gray-100">
                    Learn more →
                  </Button>
                </div>
                <div className="flex-shrink-0 ml-8">
                  {/* Token illustration */}
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full flex items-center justify-center p-2">
                      <img src="/icons/domalend-white.png" alt="DomaLend Logo" className="w-full h-full object-contain" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Follow Along Section */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-left mb-10">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Follow along.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mx-auto">
            {/* X (Twitter) */}
            <Link href="https://x.com/domalend" target="_blank" rel="noopener noreferrer">
              <Card className="hover:shadow-lg transition-shadow duration-300 border border-gray-200 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                        <X className="h-4 w-4 text-gray-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        X
                      </h3>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </div>
                  <p className="text-gray-600 text-sm">
                    Follow @domalend on X for latest announcements.
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* Github */}
            <Link href="https://github.com/mfahriferdiansyah/domalend" target="_blank" rel="noopener noreferrer">
              <Card className="hover:shadow-lg transition-shadow duration-300 border border-gray-200 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                        <svg className="h-4 w-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Github
                      </h3>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </div>
                  <p className="text-gray-600 text-sm">
                    Follow @domalend on Github for latest updates.
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Get the latest from DomaLend.
          </h2>

          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="you@domalend.com"
              className="flex-1 h-9 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6">
              Subscribe
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Unsubscribe at any time.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-14 w-14 bg-white rounded-lg flex items-center justify-center p-1">
                  <img src="/icons/domalend-blue.png" alt="DomaLend Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-xl font-bold text-gray-900">DomaLend</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-gray-900">Products</h4>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="/domains" className="hover:text-gray-900">Verifiable AI Lending</Link></li>
                <li><Link href="/loans" className="hover:text-gray-900">Fixed APR Pools</Link></li>
                <li><Link href="/auctions" className="hover:text-gray-900">AI Analytics</Link></li>
                <li><Link href="/pools" className="hover:text-gray-900">Smart Liquidation</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-gray-900">Resources</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Blog</a></li>
                <li><a href="#" className="hover:text-gray-900">Documentation</a></li>
                <li><a href="#" className="hover:text-gray-900">Developer Alerts</a></li>
                <li><a href="#" className="hover:text-gray-900">DomaLend Quarterly</a></li>
                <li><a href="#" className="hover:text-gray-900">Brand</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-gray-900">Community</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-gray-900">$DCLOUD</a></li>
                <li><a href="#" className="hover:text-gray-900">Vote</a></li>
                <li><a href="#" className="hover:text-gray-900">Forum</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 text-sm">
              © 2025. Designed with love.
            </p>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-600 hover:text-gray-900">
                Privacy
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900">
                Terms
              </a>
              <div className="flex items-center gap-3">
                <a href="#" className="text-gray-600 hover:text-gray-900">
                  𝕏
                </a>
                <a href="#" className="text-gray-600 hover:text-gray-900">
                  💬
                </a>
                <a href="#" className="text-gray-600 hover:text-gray-900">
                  📧
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DomaLendPage;
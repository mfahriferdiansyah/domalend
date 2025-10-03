import { NextPage } from 'next';
import { useMemo, useState } from 'react';
// Card import removed - using custom divs for chart containers
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SiteIcon } from '@/components/ui/site-icon';
import { useDomainAnalytics, useSearchDomains, type DomainAnalytics } from '@/hooks/useDomainData';
import { useDomainsSummary } from '@/hooks/useDomaLendApi';
import { AlertCircle, ArrowUpRight, Plus, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';

// Utility function to format USDC amounts (6 decimals) for display
const formatUSDC = (amount: string | number): string => {
  const numAmount = typeof amount === 'string' ? parseInt(amount) : amount;
  const usdcAmount = numAmount / 1_000_000; // Convert from 6 decimals to human readable
  return usdcAmount.toLocaleString();
};

interface EnhancedDomain extends DomainAnalytics {
  valuation: {
    estimatedValue: number;
  };
  isAvailable: boolean;
}

const DomainsPage: NextPage = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Use Ponder API hooks
  const { data: allDomains, loading: allDomainsLoading, error: allDomainsError, refetch } = useDomainAnalytics();
  const { data: searchResults, loading: searchLoading, error: searchError } = useSearchDomains(searchTerm);
  const { data: summaryData, loading: summaryLoading } = useDomainsSummary();

  // Determine which data source to use - use search only when term is 2+ chars due to API limitation
  const isSearching = searchTerm.trim().length >= 2;
  
  // If searching with 1 character, filter all domains client-side
  const clientFilteredDomains = useMemo(() => {
    if (searchTerm.trim().length === 1) {
      const term = searchTerm.toLowerCase().trim();
      return allDomains.filter(domain =>
        domain.domainName.toLowerCase().includes(term)
      );
    }
    return [];
  }, [allDomains, searchTerm]);

  const domains = isSearching ? searchResults : 
                 (searchTerm.trim().length === 1 ? clientFilteredDomains : allDomains);
  const loading = isSearching ? searchLoading : allDomainsLoading;
  const error = isSearching ? searchError : allDomainsError;

  // Transform Ponder data to enhanced domain format
  const enhancedDomains: EnhancedDomain[] = useMemo(() => {
    return domains.map(domain => {
      // Calculate estimated value based on AI score and loan volume
      const totalVolume = parseFloat(domain.totalLoanVolume) || 0;
      const score = domain.latestAiScore;

      const estimatedValue = Math.max(
        totalVolume * 1.5, // Base on historical loan volume
        score * 100, // Base on AI score
        1000 // Minimum value
      );

      return {
        ...domain,
        valuation: {
          estimatedValue: Math.floor(estimatedValue),
        },
        isAvailable: !domain.hasBeenLiquidated && domain.latestAiScore > 0,
      };
    });
  }, [domains]);

  const filteredDomains = enhancedDomains;

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-blue-600 font-medium';
    if (score >= 60) return 'text-orange-600 font-medium';
    return 'text-red-600 font-medium';
  };

  if ((loading && !isSearching) || summaryLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="animate-pulse">
            {/* Header */}
            <div className="mb-8 flex justify-between items-center">
              <div>
                <div className="h-8 bg-gray-200 rounded mb-2 w-48"></div>
                <div className="h-4 bg-gray-200 rounded w-40"></div>
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
            <div className="grid grid-cols-10 gap-4 px-4 py-3 mb-2">
              <div className="col-span-4 h-4 bg-gray-200 rounded"></div>
              <div className="col-span-2 h-4 bg-gray-200 rounded"></div>
              <div className="col-span-1 h-4 bg-gray-200 rounded"></div>
              <div className="col-span-2 h-4 bg-gray-200 rounded"></div>
              <div className="col-span-1 h-4 bg-gray-200 rounded"></div>
            </div>

            {/* Domain Rows */}
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="grid grid-cols-10 gap-4 px-4 py-4 bg-white rounded-xl border border-gray-200">
                  {/* Domain Column */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                    </div>
                  </div>

                  {/* Estimated Value */}
                  <div className="col-span-2 text-right">
                    <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
                  </div>

                  {/* Score */}
                  <div className="col-span-1 text-right">
                    <div className="h-4 bg-gray-200 rounded w-8 ml-auto"></div>
                  </div>

                  {/* Status */}
                  <div className="col-span-2 text-right">
                    <div className="h-5 bg-gray-200 rounded w-16 ml-auto"></div>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Scored Domains</h1>
            <p className="text-gray-600">Discover domains</p>
          </div>
          <Link href="/domains/add">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Score Domain
            </Button>
          </Link>
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
            {(summaryData?.totalScoredDomains || 0) > 0 && (
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
              <p className="text-sm font-medium text-gray-600">Total Scored</p>
              <p className="text-2xl font-bold">
                {(summaryData?.totalScoredDomains || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg bg-white shadow h-32">
            {(summaryData?.averageAiScore || 0) > 0 && (
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
              <p className="text-sm font-medium text-gray-600">Avg. Score</p>
              <p className="text-2xl font-bold">
                {summaryData?.averageAiScore || 0}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg bg-white shadow h-32">
            {(summaryData?.totalActiveDomains || 0) > 0 && (
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
              <p className="text-sm font-medium text-gray-600">Active Domains</p>
              <p className="text-2xl font-bold">
                {(summaryData?.totalActiveDomains || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg bg-white shadow h-32">
            {(summaryData?.totalLiquidatedDomains || 0) > 0 && (
              <svg viewBox="0 0 300 120" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,50 Q75,45 150,47 T300,75 L300,120 L0,120 Z"
                  fill="url(#redGradient)"
                />
                <path
                  d="M0,50 Q75,45 150,47 T300,75"
                  stroke="#ef4444"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            )}
            <div className="relative z-10 p-6">
              <p className="text-sm font-medium text-gray-600">Liquidated</p>
              <p className="text-2xl font-bold">
                {(summaryData?.totalLiquidatedDomains || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search for domains"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full h-12 rounded-xl"
            />
            {searchLoading && (
              <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 animate-spin" />
            )}
          </div>
        </div>

        {/* Domains Table */}
        <div className="space-y-2">
          {/* Table Header */}
          <div className="grid grid-cols-10 gap-4 px-4 py-3 text-sm font-medium text-gray-700 bg-transparent">
            <div className="col-span-4">Domain</div>
            <div className="col-span-2 text-right">Estimated Value</div>
            <div className="col-span-1 text-right">Score</div>
            <div className="col-span-2 text-right">Status</div>
            <div className="col-span-1"></div>
          </div>

          {/* Table Rows */}
          {filteredDomains.map((domain) => {
            const isMediumRisk = domain.latestAiScore > 75;

            return (
              <Link key={domain.domainTokenId} href={`/domain/${domain.domainTokenId}`} className="block mb-2">
                <div
                  className={isMediumRisk ? "rounded-xl p-0.5 bg-gradient-to-r from-blue-500 to-purple-500" : ""}
                >
                  <div className={`grid grid-cols-10 gap-4 px-4 py-4 bg-white rounded-xl hover:shadow-md transition-all duration-200 ${isMediumRisk ? '' : 'border border-gray-200'
                    }`}>
                    {/* Domain Column */}
                    <div className="col-span-4 flex items-center gap-3">
                      <SiteIcon
                        domain={domain.domainName}
                        size={32}
                        className="flex-shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{domain.domainName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Estimated Value */}
                    <div className="col-span-2 text-right font-medium">
                      ${formatUSDC(domain.valuation.estimatedValue)}
                    </div>

                    {/* Score */}
                    <div className="col-span-1 text-right">
                      <span className={getScoreColor(domain.latestAiScore)}>
                        {domain.latestAiScore}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="col-span-2 text-right">
                      {domain.hasBeenLiquidated ? (
                        <Badge className="bg-white text-black text-xs border border-gray-200 inline-flex items-center gap-1 px-2 py-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                          Liquidated
                        </Badge>
                      ) : (
                        <Badge className="bg-white text-black text-xs border border-gray-200 inline-flex items-center gap-1 px-2 py-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          Active
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center gap-2">
                      <Link href={`/domain/${domain.domainTokenId}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {filteredDomains.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No domains found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DomainsPage;
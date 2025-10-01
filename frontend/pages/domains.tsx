import { useState, useMemo } from 'react';
import { NextPage } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Filter, Grid, List, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import Link from 'next/link';
import { useDomainAnalytics, useSearchDomains, type DomainAnalytics } from '@/hooks/useDomainData';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Utility function to truncate token ID
  const truncateTokenId = (tokenId: string, startChars = 8, endChars = 8) => {
    if (tokenId.length <= startChars + endChars) return tokenId;
    return `${tokenId.slice(0, startChars)}...${tokenId.slice(-endChars)}`;
  };

  // Use Ponder API hooks
  const { data: allDomains, loading: allDomainsLoading, error: allDomainsError, refetch } = useDomainAnalytics();
  const { data: searchResults, loading: searchLoading, error: searchError } = useSearchDomains(searchTerm);

  // Determine which data source to use
  const isSearching = searchTerm.length >= 2;
  const domains = isSearching ? searchResults : allDomains;
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
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 75) return 'bg-blue-100 text-blue-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading && !isSearching) {
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Scored Domains</h1>
          <p className="text-gray-600">Discover domains</p>
        </div>
        <Link href="/domains/add">
          <Button>
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

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search domains..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          {searchLoading && (
            <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 animate-spin" />
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

          <div className="flex rounded-md border">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {filteredDomains.length} domains found
          {isSearching && ` matching "${searchTerm}"`}
        </p>
        {!loading && (
          <Button variant="ghost" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        )}
      </div>

      {/* Domains Grid */}
      <div className={`grid gap-6 ${viewMode === 'grid'
        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1'
        }`}>
        {filteredDomains.map((domain) => (
          <Link key={domain.domainTokenId} href={`/domain/${domain.domainTokenId}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold">
                    {domain.domainName}
                  </CardTitle>
                  <Badge className={getScoreColor(domain.latestAiScore)}>
                    Score: {domain.latestAiScore}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Token ID: {truncateTokenId(domain.domainTokenId)}
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Estimated Value:</span>
                      <div className="font-semibold">${formatUSDC(domain.valuation.estimatedValue)}</div>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Loans: {domain.totalLoansCreated}</span>
                    <span>Requests: {domain.totalScoringRequests}</span>
                  </div>

                  {domain.hasBeenLiquidated && (
                    <div className="text-xs text-red-600 font-medium">
                      ⚠️ Previously liquidated
                    </div>
                  )}

                  <div className="pt-3 border-t">
                    <Button className="w-full" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredDomains.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No domains found matching your search.</p>
        </div>
      )}
    </div>
  );
};

export default DomainsPage;
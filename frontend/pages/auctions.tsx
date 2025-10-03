import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Filter, Grid, List, Clock, TrendingDown, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Auction } from '@/services/domalend-api';
import { useAuctions, usePlaceBid } from '@/hooks/useDomaLendApi';
import { ApiErrorState } from '@/components/common/api-error-boundary';
import { Pagination } from '@/components/common/pagination';

interface AuctionWithCalculated extends Auction {
  timeLeft: number; // in hours
  currentPriceNumber: number;
  startingPriceNumber: number;
  priceDecayRate: number;
}

const AuctionsPage: NextPage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [bidAmounts, setBidAmounts] = useState<Record<string, string>>({});
  
  const { 
    data: auctions = [], 
    loading, 
    error, 
    pagination,
    refresh,
    goToPage,
    nextPage,
    prevPage
  } = useAuctions();
  
  const { mutate: placeBid, loading: bidLoading } = usePlaceBid();
  
  // Process auctions to add calculated fields
  const processedAuctions: AuctionWithCalculated[] = (auctions || []).map(auction => {
    // Convert from micro units (6 decimals) to dollars
    const startingPriceNumber = parseFloat(auction.startingPrice) / 1e6;
    const currentPriceNumber = parseFloat(auction.currentPrice) / 1e6;
    const decayPerSecond = parseFloat(auction.decayPerSecond);

    // Calculate time left based on auction start time and current price decay

    // Calculate price decay rate per day
    const priceDecayRate = (decayPerSecond * 86400) / startingPriceNumber * 100;

    // Estimate remaining time based on price decay to reserve price (rough estimate)
    const reservePrice = currentPriceNumber * 0.5; // Assume reserve is 50% of current
    const timeToReserve = (currentPriceNumber - reservePrice) / (decayPerSecond / 1e6);
    const timeLeft = Math.max(0, timeToReserve / 3600); // Convert to hours

    return {
      ...auction,
      timeLeft,
      currentPriceNumber,
      startingPriceNumber,
      priceDecayRate
    };
  });

  // Update prices every minute for active auctions
  useEffect(() => {
    const interval = setInterval(() => {
      refresh(); // Refresh auction data every minute
    }, 60000);

    return () => clearInterval(interval);
  }, [refresh]);

  const formatTimeLeft = (hours: number) => {
    if (hours <= 0) return 'Ended';
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (days > 0) {
      return `${days}d ${remainingHours}h`;
    }
    return `${remainingHours}h`;
  };

  const handleBidChange = (auctionId: string, value: string) => {
    setBidAmounts(prev => ({ ...prev, [auctionId]: value }));
  };

  const handlePlaceBid = async (auctionId: string) => {
    const bidAmount = bidAmounts[auctionId];
    if (!bidAmount) return;

    try {
      await placeBid({ auctionId, amount: parseFloat(bidAmount) });
      setBidAmounts(prev => ({ ...prev, [auctionId]: '' }));
      refresh(); // Refresh auction data after successful bid
    } catch (error) {
      console.error('Failed to place bid:', error);
    }
  };

  const filteredAuctions = processedAuctions.filter(auction => {
    // Filter by search term
    const matchesSearch = !searchTerm.trim() ||
      auction.domain.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      auction.auctionId.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      auction.loanId.toLowerCase().includes(searchTerm.toLowerCase().trim());

    if (!matchesSearch) return false;

    // Filter by tab
    switch (activeTab) {
      case 'active': return auction.status === 'active';
      case 'ending-soon': return auction.status === 'active' && auction.timeLeft <= 24;
      case 'ended': return auction.status === 'ended';
      case 'all': return true;
      default: return true;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'ended': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalActive = processedAuctions.filter(a => a.status === 'active').length;
  const endingSoon = processedAuctions.filter(a => a.status === 'active' && a.timeLeft <= 24).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="animate-pulse">
            {/* Header */}
            <div className="mb-8">
              <div className="h-8 bg-gray-200 rounded mb-2 w-32"></div>
              <div className="h-4 bg-gray-200 rounded w-64"></div>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 flex flex-col gap-4">
              <div className="h-12 bg-gray-200 rounded-xl w-full"></div>
              <div className="flex gap-2 justify-end">
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="flex rounded-md border">
                  <div className="h-8 w-8 bg-gray-200 rounded-l"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded-r"></div>
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-4 flex justify-between items-center">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>

            {/* Auctions Grid */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6">
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-4 mb-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-6 bg-gray-200 rounded w-32"></div>
                        <div className="h-5 bg-gray-200 rounded w-16"></div>
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-40 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-36"></div>
                    </div>
                    <div className="text-right">
                      <div className="h-5 bg-gray-200 rounded w-12 mb-2"></div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                      </div>
                    </div>
                  </div>

                  {/* Card Content - 3 columns */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Price Information */}
                    <div className="space-y-4">
                      <div>
                        <div className="h-4 bg-gray-200 rounded mb-2 w-24"></div>
                        <div className="h-8 bg-gray-200 rounded w-20 mb-1"></div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 bg-gray-200 rounded"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {[...Array(4)].map((_, j) => (
                          <div key={j} className="flex justify-between">
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                            <div className="h-3 bg-gray-200 rounded w-12"></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Auction Progress */}
                    <div className="space-y-4">
                      <div>
                        <div className="h-4 bg-gray-200 rounded mb-2 w-28"></div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <div className="h-3 bg-gray-200 rounded w-20"></div>
                            <div className="h-3 bg-gray-200 rounded w-8"></div>
                          </div>
                          <div className="h-2 bg-gray-200 rounded w-full"></div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {[...Array(4)].map((_, j) => (
                          <div key={j} className="flex">
                            <div className="h-3 bg-gray-200 rounded w-12 mr-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bidding Section */}
                    <div className="space-y-4">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                      <div className="space-y-3">
                        <div>
                          <div className="h-10 bg-gray-200 rounded w-full"></div>
                          <div className="h-3 bg-gray-200 rounded w-32 mt-1"></div>
                        </div>
                        <div className="h-10 bg-gray-200 rounded w-full"></div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <ApiErrorState error={error} onRetry={refresh} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Auctions</h1>
        <p className="text-gray-600">Bid on liquidated domains with decreasing prices</p>
      </div>



      {/* Search and Filters */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search auctions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 rounded-xl w-full"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setActiveTab('all')}>
                All ({processedAuctions.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('active')}>
                Active ({totalActive})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('ending-soon')}>
                Ending Soon ({endingSoon})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('ended')}>
                Ended ({processedAuctions.filter(a => a.status === 'ended').length})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
          {filteredAuctions.length} auctions found
          {searchTerm.trim() && ` matching "${searchTerm}"`}
          {activeTab !== 'all' && ` • Showing ${activeTab.replace('-', ' ')}`}
        </p>

        <Button variant="ghost" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Auctions Grid */}
      <div className={`grid gap-6 ${viewMode === 'grid'
          ? 'grid-cols-1 lg:grid-cols-2'
          : 'grid-cols-1'
        }`}>
        {filteredAuctions.map((auction) => (
          <Card key={auction.auctionId} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="flex items-center gap-2 mb-1">
                    <Link href={`/domain/${auction.domain.tokenId}`} className="hover:underline truncate">
                      {auction.domain.name}
                    </Link>
                    <Badge variant="outline" className="flex-shrink-0">Score: {auction.domain.aiScore}</Badge>
                  </CardTitle>
                  <p className="text-sm text-gray-600 truncate">
                    <Link href={`/auctions/${auction.auctionId}`} className="hover:underline">
                      Auction ID: {auction.auctionId}
                    </Link>
                  </p>
                  <p className="text-xs text-gray-500 truncate">Borrower: {auction.borrower.slice(0, 6)}...{auction.borrower.slice(-4)}</p>
                </div>
                <div className="text-right">
                  <Badge className={getStatusColor(auction.status)}>
                    {auction.status.charAt(0).toUpperCase() + auction.status.slice(1)}
                  </Badge>
                  {auction.status === 'active' && (
                    <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      {formatTimeLeft(auction.timeLeft)}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Price Information */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Current Price</h4>
                    <div className="text-2xl font-bold text-blue-600">
                      ${auction.currentPriceNumber.toFixed(2)}
                    </div>
                    {auction.status === 'active' && (
                      <div className="flex items-center gap-1 text-sm text-red-600 mt-1">
                        <TrendingDown className="h-4 w-4" />
                        -{auction.priceDecayRate.toFixed(2)}% per day
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Starting Price:</span>
                      <span>${auction.startingPriceNumber.toFixed(2)}</span>
                    </div>
                    {auction.finalPrice && auction.status === 'ended' ? (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Final Price:</span>
                        <span>${(parseFloat(auction.finalPrice) / 1e18).toFixed(2)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reserve Price:</span>
                        <span>${(auction.currentPriceNumber * 0.5).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Decay/Second:</span>
                      <span>{(parseFloat(auction.decayPerSecond) / 1e6).toFixed(8)}</span>
                    </div>
                  </div>
                </div>

                {/* Auction Progress */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Auction Progress</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Price Decrease</span>
                        <span>{Math.round(((auction.startingPriceNumber - auction.currentPriceNumber) / auction.startingPriceNumber) * 100)}%</span>
                      </div>
                      <Progress
                        value={((auction.startingPriceNumber - auction.currentPriceNumber) / auction.startingPriceNumber) * 100}
                        className="h-2"
                      />
                    </div>
                  </div>

                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-gray-600">Started: </span>
                      <span className="font-semibold">{new Date(parseInt(auction.auctionStartedAt)).toLocaleDateString()}</span>
                    </div>
                    {auction.endedAt && (
                      <div>
                        <span className="text-gray-600">Ended: </span>
                        <span className="font-semibold">{new Date(parseInt(auction.endedAt)).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">TLD: </span>
                      <span className="font-semibold">{auction.domain.tld}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Length: </span>
                      <span className="font-semibold">{auction.domain.characterLength} chars</span>
                    </div>
                  </div>
                </div>

                {/* Bidding Section */}
                <div className="space-y-4">
                  {auction.status === 'active' ? (
                    <>
                      <h4 className="font-semibold text-sm">Place Bid</h4>
                      <div className="space-y-3">
                        <div>
                          <Input
                            type="number"
                            placeholder="Enter bid amount"
                            value={bidAmounts[auction.auctionId] || ''}
                            onChange={(e) => handleBidChange(auction.auctionId, e.target.value)}
                            min={auction.currentPriceNumber * 0.5}
                            max={auction.currentPriceNumber}
                            step="0.01"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Min: ${(auction.currentPriceNumber * 0.5).toFixed(2)} •
                            Max: ${auction.currentPriceNumber.toFixed(2)}
                          </p>
                        </div>

                        <Button
                          className="w-full"
                          onClick={() => handlePlaceBid(auction.auctionId)}
                          disabled={!bidAmounts[auction.auctionId] || bidLoading}
                        >
                          {bidLoading ? 'Placing Bid...' : 'Place Bid'}
                        </Button>
                      </div>

                      <div className="text-xs text-gray-600 space-y-1">
                        <div>Loan ID: {auction.loanId}</div>
                        {auction.poolId && <div>Pool ID: {auction.poolId}</div>}
                      </div>
                    </>
                  ) : auction.status === 'ended' ? (
                    <div className="text-center">
                      <div className="text-sm text-gray-600 space-y-1">
                        {auction.finalPrice && (
                          <div>Final Price: ${(parseFloat(auction.finalPrice) / 1e18).toFixed(2)}</div>
                        )}
                        {auction.currentBidder && (
                          <div>Winner: {auction.currentBidder.slice(0, 6)}...{auction.currentBidder.slice(-4)}</div>
                        )}
                        {auction.recoveryRate && (
                          <div>Recovery Rate: {auction.recoveryRate.toFixed(2)}x</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-sm font-semibold text-red-600">
                        Auction Cancelled
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* View Details Button - Always at bottom */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link href={`/auctions/${auction.auctionId}`}>
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAuctions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No auctions found in this category.</p>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={goToPage}
          onPrevious={prevPage}
          onNext={nextPage}
          className="mt-8"
        />
      )}
      </div>
    </div>
  );
};

export default AuctionsPage;
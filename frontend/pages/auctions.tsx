import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Filter, Grid, List, Clock, TrendingDown, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { domaLendAPI, Auction } from '@/services/domalend-api';

interface AuctionWithCalculated extends Auction {
  timeLeft: number; // in hours
  currentPriceNumber: number;
  startingPriceNumber: number;
  priceDecayRate: number;
}

const AuctionsPage: NextPage = () => {
  const [auctions, setAuctions] = useState<AuctionWithCalculated[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [bidAmounts, setBidAmounts] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAuctions, setTotalAuctions] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchAuctions = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const response = await domaLendAPI.getAuctions({
        page,
        limit: 20,
        sortBy: 'auctionStartedAt',
        order: 'desc'
      });

      const processedAuctions: AuctionWithCalculated[] = response.auctions.map(auction => {
        // Convert from micro units (6 decimals) to dollars
        const startingPriceNumber = parseFloat(auction.startingPrice) / 1e6;
        const currentPriceNumber = parseFloat(auction.currentPrice) / 1e6;
        const decayPerSecond = parseFloat(auction.decayPerSecond);

        // Calculate time left based on auction start time and current price decay
        const startTime = parseInt(auction.auctionStartedAt);
        const now = Date.now();
        const elapsedSeconds = (now - startTime) / 1000;

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

      setAuctions(processedAuctions);
      setTotalAuctions(response.total);
      setTotalPages(Math.ceil(response.total / 20));
      setCurrentPage(page);
    } catch (err) {
      console.error('Failed to fetch auctions:', err);
      setError('Failed to load auctions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions(currentPage);

    // Update prices every minute
    const interval = setInterval(() => {
      setAuctions(prevAuctions =>
        prevAuctions.map(auction => {
          if (auction.status === 'active' && auction.timeLeft > 0) {
            const decayPerSecond = parseFloat(auction.decayPerSecond) / 1e6;
            const newPrice = Math.max(
              auction.currentPriceNumber - (decayPerSecond * 60), // 60 seconds
              auction.currentPriceNumber * 0.5 // Assume reserve is 50%
            );
            return {
              ...auction,
              currentPriceNumber: newPrice,
              timeLeft: Math.max(0, auction.timeLeft - (1 / 60)) // Decrease by 1 minute
            };
          }
          return auction;
        })
      );
    }, 60000);

    return () => clearInterval(interval);
  }, [currentPage]);

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

    // TODO: Implement bid placement logic
    console.log(`Placing bid of $${bidAmount} on auction ${auctionId}`);
  };

  const filteredAuctions = auctions.filter(auction => {
    // Filter by search term
    const matchesSearch = searchTerm.length < 2 ||
      auction.domain.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      auction.auctionId.includes(searchTerm) ||
      auction.loanId.includes(searchTerm);

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

  const totalActive = auctions.filter(a => a.status === 'active').length;
  const endingSoon = auctions.filter(a => a.status === 'active' && a.timeLeft <= 24).length;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
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
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => fetchAuctions(currentPage)}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Auctions</h1>
        <p className="text-gray-600">Bid on liquidated domains with decreasing prices</p>
      </div>



      {/* Search and Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search auctions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setActiveTab('all')}>
                All ({auctions.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('active')}>
                Active ({totalActive})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('ending-soon')}>
                Ending Soon ({endingSoon})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('ended')}>
                Ended ({auctions.filter(a => a.status === 'ended').length})
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
          {searchTerm.length >= 2 && ` matching "${searchTerm}"`}
          {activeTab !== 'all' && ` • Showing ${activeTab.replace('-', ' ')}`}
        </p>

        <Button variant="ghost" size="sm" onClick={() => fetchAuctions(currentPage)}>
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

                        <div className="space-y-2">
                          <Button
                            className="w-full"
                            onClick={() => handlePlaceBid(auction.auctionId)}
                            disabled={!bidAmounts[auction.auctionId]}
                          >
                            Place Bid
                          </Button>
                          <Link href={`/auctions/${auction.auctionId}`}>
                            <Button variant="outline" className="w-full">
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </div>

                      <div className="text-xs text-gray-600 space-y-1">
                        <div>Loan ID: {auction.loanId}</div>
                        {auction.poolId && <div>Pool ID: {auction.poolId}</div>}
                      </div>
                    </>
                  ) : auction.status === 'ended' ? (
                    <div className="text-center">
                      <div className="text-sm text-gray-600 space-y-1 mb-4">
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
                      <Link href={`/auctions/${auction.auctionId}`}>
                        <Button variant="outline" className="w-full">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-sm font-semibold text-red-600 mb-4">
                        Auction Cancelled
                      </div>
                      <Link href={`/auctions/${auction.auctionId}`}>
                        <Button variant="outline" className="w-full">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
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
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalAuctions)} of {totalAuctions} auctions
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAuctions(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAuctions(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctionsPage;
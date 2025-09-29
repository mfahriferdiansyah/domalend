import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { NextPage } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Clock, TrendingDown, AlertCircle, DollarSign, Calendar, User, Hash } from 'lucide-react';
import Link from 'next/link';
import { domaLendAPI, AuctionDetail, AuctionEvent } from '@/services/domalend-api';

const AuctionDetailPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState('');

  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchAuctionDetail(id);
    }
  }, [id]);

  const fetchAuctionDetail = async (auctionId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await domaLendAPI.getAuction(auctionId);
      setAuction(response.auction);
    } catch (err) {
      console.error('Failed to fetch auction detail:', err);
      setError('Failed to load auction details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = async () => {
    if (!auction || !bidAmount) return;

    // TODO: Implement bid placement logic
    console.log(`Placing bid of $${bidAmount} on auction ${auction.auctionId}`);
  };

  const formatTimeLeft = (startTime: string, endTime?: string) => {
    if (endTime) {
      const duration = parseInt(endTime) - parseInt(startTime);
      const hours = Math.floor(duration / (1000 * 60 * 60));
      return `${hours}h`;
    }
    
    const elapsed = Date.now() - parseInt(startTime);
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    return `${hours}h elapsed`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'ended': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'started': return 'bg-blue-100 text-blue-800';
      case 'ended': return 'bg-green-100 text-green-800';
      case 'bid_placed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error || 'Auction not found'}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const currentPrice = parseFloat(auction.currentPrice) / 1e6;
  const startingPrice = parseFloat(auction.startingPrice) / 1e6;
  const finalPrice = auction.finalPrice ? parseFloat(auction.finalPrice) / 1e6 : null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Auctions
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{auction.domainName}</h1>
            <p className="text-gray-600">Auction #{auction.auctionId}</p>
          </div>
          <Badge className={getStatusColor(auction.status)}>
            {auction.status.charAt(0).toUpperCase() + auction.status.slice(1)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Auction Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Domain Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>Domain Information</span>
                <Badge variant="outline">Score: {auction.domain.aiScore}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-semibold">{auction.domain.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">TLD</p>
                  <p className="font-semibold">{auction.domain.tld}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Length</p>
                  <p className="font-semibold">{auction.domain.characterLength} chars</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Registrar</p>
                  <p className="font-semibold">{auction.domain.metadata.registrar}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Token ID</p>
                  <p className="font-mono text-xs truncate" title={auction.domainTokenId}>
                    {auction.domainTokenId.slice(0, 10)}...{auction.domainTokenId.slice(-10)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Owner</p>
                  <p className="font-mono text-xs truncate" title={auction.domain.metadata.owner}>
                    {auction.domain.metadata.owner.slice(0, 6)}...{auction.domain.metadata.owner.slice(-4)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price Information */}
          <Card>
            <CardHeader>
              <CardTitle>Price Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Current Price</p>
                  <p className="text-4xl font-bold text-blue-600">
                    ${auction.status === 'ended' && finalPrice ? finalPrice.toFixed(2) : currentPrice.toFixed(2)}
                  </p>
                  {auction.status === 'active' && (
                    <div className="flex items-center justify-center gap-1 text-sm text-red-600 mt-2">
                      <TrendingDown className="h-4 w-4" />
                      Decreasing by {(parseFloat(auction.decayPerSecond) / 1e6).toFixed(8)}/sec
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-gray-600">Starting Price</p>
                    <p className="font-semibold">${startingPrice.toFixed(2)}</p>
                  </div>
                  {auction.status === 'ended' && finalPrice ? (
                    <div className="text-center p-3 bg-green-50 rounded">
                      <p className="text-gray-600">Final Price</p>
                      <p className="font-semibold text-green-600">${finalPrice.toFixed(2)}</p>
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-yellow-50 rounded">
                      <p className="text-gray-600">Current Price</p>
                      <p className="font-semibold text-yellow-600">${currentPrice.toFixed(2)}</p>
                    </div>
                  )}
                  {auction.recoveryRate && (
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <p className="text-gray-600">Recovery Rate</p>
                      <p className="font-semibold text-blue-600">{auction.recoveryRate.toFixed(2)}x</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Auction Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auction.events.map((event, index) => (
                  <div key={index} className="flex items-start gap-4 p-3 border rounded">
                    <div className="flex-shrink-0">
                      <Badge className={getEventTypeColor(event.eventType)}>
                        {event.eventType.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold">
                          {event.eventType === 'started' && 'Auction Started'}
                          {event.eventType === 'ended' && 'Auction Ended'}
                          {event.eventType === 'bid_placed' && 'Bid Placed'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(event.eventTimestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        {event.bidderAddress && (
                          <p>Bidder: {event.bidderAddress.slice(0, 6)}...{event.bidderAddress.slice(-4)}</p>
                        )}
                        {event.currentPrice && (
                          <p>Price: ${(parseFloat(event.currentPrice) / 1e6).toFixed(2)}</p>
                        )}
                        {event.finalPrice && (
                          <p>Final Price: ${(parseFloat(event.finalPrice) / 1e6).toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Bidding Section */}
          {auction.status === 'active' ? (
            <Card>
              <CardHeader>
                <CardTitle>Place Bid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Input
                      type="number"
                      placeholder="Enter bid amount"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      min={currentPrice * 0.5}
                      max={currentPrice}
                      step="0.01"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Min: ${(currentPrice * 0.5).toFixed(2)} • Max: ${currentPrice.toFixed(2)}
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handlePlaceBid}
                    disabled={!bidAmount}
                  >
                    Place Bid
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Auction Ended</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-2">
                  {auction.currentBidder && (
                    <p className="text-sm">
                      <span className="text-gray-600">Winner: </span>
                      <span className="font-mono">{auction.currentBidder.slice(0, 6)}...{auction.currentBidder.slice(-4)}</span>
                    </p>
                  )}
                  {finalPrice && (
                    <p className="text-lg font-semibold text-green-600">
                      Final Price: ${finalPrice.toFixed(2)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Auction Details */}
          <Card>
            <CardHeader>
              <CardTitle>Auction Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Auction ID:</span>
                  <span className="font-mono">{auction.auctionId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Loan ID:</span>
                  <span className="font-mono">{auction.loanId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Borrower:</span>
                  <span className="font-mono">{auction.borrowerAddress.slice(0, 6)}...{auction.borrowerAddress.slice(-4)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Started:</span>
                  <span>{new Date(parseInt(auction.startedAt)).toLocaleDateString()}</span>
                </div>
                {auction.endedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Ended:</span>
                    <span>{new Date(parseInt(auction.endedAt)).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Duration:</span>
                  <span>{formatTimeLeft(auction.startedAt, auction.endedAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Domain Links */}
          <Card>
            <CardHeader>
              <CardTitle>Related Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link 
                  href={`/domain/${auction.domainTokenId}`} 
                  className="block text-blue-600 hover:underline text-sm"
                >
                  View Domain Details
                </Link>
                <Link 
                  href={auction.domain.metadata.externalUrl} 
                  target="_blank" 
                  className="block text-blue-600 hover:underline text-sm"
                >
                  Domain Dashboard
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuctionDetailPage;
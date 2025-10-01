import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Globe, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  AlertCircle, 
  ExternalLink,
  CreditCard,
  BarChart3,
  History
} from 'lucide-react';
import Link from 'next/link';
import { useDomainById } from '@/hooks/useDomainData';

const DomainDetailPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const domainId = typeof id === 'string' ? id : '';

  // Utility function to truncate token ID
  const truncateTokenId = (tokenId: string | undefined, startChars = 8, endChars = 8) => {
    if (!tokenId) return 'N/A';
    if (tokenId.length <= startChars + endChars) return tokenId;
    return `${tokenId.slice(0, startChars)}...${tokenId.slice(-endChars)}`;
  };

  const { data: domain, loading, error } = useDomainById(domainId);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-6">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !domain || !domain.domainTokenId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link href="/domains" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Domains
        </Link>
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error || 'Domain not found'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 75) return 'bg-blue-100 text-blue-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const estimatedValue = Math.max(
    parseFloat(domain.totalLoanVolume) * 1.5,
    domain.latestAiScore * 100,
    1000
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/domains" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Domains
        </Link>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Globe className="h-8 w-8 text-blue-600" />
              {domain.domainName}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Token ID: {truncateTokenId(domain.domainTokenId)}</span>
              <Badge className={getScoreColor(domain.latestAiScore)}>
                AI Score: {domain.latestAiScore}
              </Badge>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => window.open(`https://${domain.domainName}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Domain
            </Button>
            <Button 
              onClick={() => window.open(`https://dashboard-testnet.doma.xyz/domain/${domain.domainName}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Doma
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ${Math.floor(estimatedValue).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Estimated Value</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {domain.totalLoansCreated}
                  </div>
                  <div className="text-sm text-gray-600">Total Loans</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    ${parseFloat(domain.totalLoanVolume).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Loan Volume</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {domain.totalScoringRequests}
                  </div>
                  <div className="text-sm text-gray-600">Assessments</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Information */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="loans">Loans</TabsTrigger>
              <TabsTrigger value="scoring">Scoring</TabsTrigger>
              <TabsTrigger value="auctions">Auctions</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Domain Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">AI Score</label>
                      <div className="text-lg font-semibold">
                        {domain.latestAiScore}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <div className="text-lg font-semibold">
                        {domain.hasBeenLiquidated ? (
                          <span className="text-red-600">Previously Liquidated</span>
                        ) : (
                          <span className="text-green-600">Active</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Total Scoring Requests</label>
                      <div className="text-lg font-semibold">{domain.totalScoringRequests}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Latest Assessment</label>
                      <div className="text-lg font-semibold">
                        {new Date(parseInt(domain.lastActivityTimestamp)).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {domain.hasBeenLiquidated && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>Notice:</strong> This domain has been previously liquidated. 
                    Please review the loan history before considering new loans.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
            
            <TabsContent value="loans" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Loan History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {domain.loans && domain.loans.length > 0 ? (
                      <div className="space-y-3">
                        {domain.loans.map((loan, index) => (
                          <div key={`${loan.loanId}-${index}`} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="font-medium">Loan #{loan.loanId}</span>
                                <Badge className="ml-2" variant="outline">
                                  {loan.eventType}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(parseInt(loan.eventTimestamp)).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Amount:</span>
                                <div className="font-semibold">${parseFloat(loan.loanAmount).toLocaleString()}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">AI Score:</span>
                                <div className="font-semibold">{loan.aiScore || 'N/A'}</div>
                              </div>
                              {loan.interestRate && (
                                <div>
                                  <span className="text-gray-600">Interest Rate:</span>
                                  <div className="font-semibold">{(loan.interestRate / 100).toFixed(2)}%</div>
                                </div>
                              )}
                              {loan.repaymentDeadline && (
                                <div>
                                  <span className="text-gray-600">Repayment Due:</span>
                                  <div className="font-semibold">
                                    {new Date(parseInt(loan.repaymentDeadline)).toLocaleDateString()}
                                  </div>
                                </div>
                              )}
                            </div>
                            {loan.liquidationAttempted && (
                              <div className="mt-2 text-sm text-red-600">
                                ⚠️ Liquidation attempted
                                {loan.liquidationTimestamp && (
                                  <span className="ml-2">
                                    on {new Date(parseInt(loan.liquidationTimestamp)).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No loans have been taken against this domain yet.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="scoring" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Scoring History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {domain.scoringHistory && domain.scoringHistory.length > 0 ? (
                      <div className="space-y-3">
                        {domain.scoringHistory.map((scoring) => (
                          <div key={scoring.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="font-medium">Score: {scoring.aiScore}</span>
                                <Badge className="ml-2" variant="outline">
                                  {scoring.status}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(parseInt(scoring.requestTimestamp)).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Confidence:</span>
                                <div className="font-semibold">{scoring.confidence}%</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Requester:</span>
                                <div className="font-semibold text-xs">
                                  {truncateTokenId(scoring.requesterAddress, 6, 6)}
                                </div>
                              </div>
                            </div>
                            {scoring.reasoning && (
                              <div className="mt-3">
                                <span className="text-gray-600 text-sm">Reasoning:</span>
                                <div className="text-sm mt-1 p-2 bg-gray-50 rounded">
                                  {scoring.reasoning}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No scoring history available for this domain.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="auctions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Auction History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {domain.auctions && domain.auctions.length > 0 ? (
                      <div className="space-y-3">
                        {domain.auctions.map((auction) => (
                          <div key={auction.auctionId} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="font-medium">Auction #{auction.auctionId}</span>
                                <Badge className="ml-2" variant="outline">
                                  {auction.eventType}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(parseInt(auction.eventTimestamp)).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Final Price:</span>
                                <div className="font-semibold">${parseFloat(auction.finalPrice).toLocaleString()}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Recovery Rate:</span>
                                <div className="font-semibold">{(auction.recoveryRate * 100).toFixed(2)}%</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Winner:</span>
                                <div className="font-semibold text-xs">
                                  {truncateTokenId(auction.bidderAddress, 6, 6)}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">Related Loan:</span>
                                <div className="font-semibold">#{auction.loanId}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No auctions have been held for this domain.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Risk Assessment</label>
                      <div className="text-lg font-semibold">
                        {domain.latestAiScore >= 80 ? 'Low Risk' :
                         domain.latestAiScore >= 60 ? 'Medium Risk' : 'High Risk'}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Lending Capacity</label>
                      <div className="text-lg font-semibold">
                        Up to ${Math.floor(estimatedValue * 0.7).toLocaleString()}
                      </div>
                      <p className="text-xs text-gray-500">Based on 70% of estimated value</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Scoring History</label>
                      <div className="text-lg font-semibold">{domain.totalScoringRequests} assessments</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Key Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">AI Score</span>
                <span className="font-semibold">{domain.latestAiScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Loans</span>
                <span className="font-semibold">{domain.totalLoansCreated}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Loan Volume</span>
                <span className="font-semibold">${parseFloat(domain.totalLoanVolume).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className={`font-semibold ${domain.hasBeenLiquidated ? 'text-red-600' : 'text-green-600'}`}>
                  {domain.hasBeenLiquidated ? 'Liquidated' : 'Active'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Last Updated */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  Last updated: {new Date(parseInt(domain.lastActivityTimestamp)).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DomainDetailPage;
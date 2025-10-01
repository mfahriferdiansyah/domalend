import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Types
export interface DomainMetadata {
  tokenId: string;
  name: string;
  extension: string;
  owner: string;
  registrar: string;
  registrationDate: string;
  expirationDate: string;
  age: number;
  length: number;
  isActive: boolean;
}

export interface ScoreBreakdown {
  overallScore: number;
  ageScore: number;
  lengthScore: number;
  extensionScore: number;
  keywordScore: number;
  trafficScore: number;
  backlinksScore: number;
  brandabilityScore: number;
  factors: {
    age: number;
    length: number;
    extension: string;
    hasNumbers: boolean;
    hasHyphens: boolean;
    keywordRelevance: number;
    trafficMetrics?: {
      monthlyVisits: number;
      bounceRate: number;
      avgSessionDuration: number;
    };
  };
}

export interface DomainValuation {
  estimatedValue: number;
  maxLoanAmount: number;
  ltvRatio: number;
  interestRate: number;
  confidence: number;
  comparables: Array<{
    domain: string;
    salePrice: number;
    saleDate: string;
    similarity: number;
  }>;
}

export interface Loan {
  loanId: string;
  borrower: string;
  domainTokenId: string;
  domainName: string;
  originalAmount: string;          // Updated to match backend
  currentBalance: string;          // Now string to match backend
  totalRepaid: string;             // New field from loan table
  interestRate: number;
  aiScore?: number;                // New field from loan table
  poolId?: string;                 // New field from loan table
  status: 'active' | 'repaid' | 'defaulted' | 'liquidated'; // Updated statuses
  repaymentDeadline: string;       // Updated field name
  createdAt: string;               // Updated field name
  lastUpdated: string;             // New field from loan table
  liquidationAttempted: boolean;   // New field from loan table
  
  // Legacy fields for compatibility
  principal: number;
  term: number;
  startDate: string;
  dueDate: string;
  collateralValue: number;
  ltvRatio: number;
  monthlyPayment: number;
  nextPaymentDue: string;
  paymentsRemaining: number;
}

export interface AuctionDomain {
  tokenId: string;
  name: string;
  metadata: {
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
  };
  aiScore: number;
  tld: string;
  characterLength: number;
}

export interface AuctionEvent {
  auctionId: string;
  loanId: string;
  domainTokenId: string;
  domainName: string;
  borrowerAddress: string;
  bidderAddress: string | null;
  startingPrice: string;
  currentPrice: string | null;
  finalPrice: string | null;
  recoveryRate: number;
  eventType: 'started' | 'ended' | 'bid_placed';
  eventTimestamp: string;
}

export interface Auction {
  auctionId: string;
  loanId: string;
  poolId: string;
  status: 'active' | 'ended' | 'cancelled';
  startingPrice: string;
  currentPrice: string;
  finalPrice?: string;
  recoveryRate?: number;
  currentBidder?: string;
  decayPerSecond: string;
  auctionStartedAt: string;
  endedAt?: string;
  domain: AuctionDomain;
  borrower: string;
}

export interface AuctionDetail extends Auction {
  domainTokenId: string;
  domainName: string;
  borrowerAddress: string;
  startedAt: string;
  events: AuctionEvent[];
}

export interface LiquidityPool {
  poolId: string;
  name: string;
  description: string;
  creator: string;
  poolType: 'instant' | 'custom' | 'crowdfunded';
  totalLiquidity: number;
  availableLiquidity: number;
  totalLoansIssued: number;
  averageAPY: number;
  minLoanAmount: number;
  maxLoanAmount: number;
  maxLTV: number;
  minDomainScore: number;
  interestRate: number;
  lenders: Array<{
    address: string;
    contribution: number;
    share: number;
  }>;
  criteria: {
    allowedExtensions?: string[];
    maxAge?: number;
    minAge?: number;
    excludeNumbers?: boolean;
    excludeHyphens?: boolean;
  };
  isActive: boolean;
  createdAt: string;
}

class DomaLendAPI {
  private api: AxiosInstance;
  
  constructor(baseURL?: string) {
    this.api = axios.create({
      baseURL: baseURL || process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://backend-doma.kadzu.dev',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for auth
    this.api.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        throw error;
      }
    );
  }

  // Domain APIs
  async getDomainMetadata(tokenId: string): Promise<DomainMetadata> {
    const response = await this.api.get(`/domains/${tokenId}/metadata`);
    return response.data;
  }

  async getDomainScore(tokenId: string, useCache = true): Promise<ScoreBreakdown> {
    const response = await this.api.get(`/domains/${tokenId}/score`, {
      params: { useCache }
    });
    return response.data;
  }

  async getDomainValuation(tokenId: string, useCache = true): Promise<DomainValuation> {
    const response = await this.api.get(`/domains/${tokenId}/valuation`, {
      params: { useCache }
    });
    return response.data;
  }

  async getDomainInfo(tokenId: string, useCache = true): Promise<{
    tokenId: string;
    metadata: DomainMetadata;
    score: ScoreBreakdown;
    valuation: DomainValuation;
    lastUpdated: string;
  }> {
    const response = await this.api.get(`/domains/${tokenId}/info`, {
      params: { useCache }
    });
    return response.data;
  }

  async batchScoreDomains(tokenIds: string[]): Promise<{
    totalProcessed: number;
    successCount: number;
    failureCount: number;
    results: Array<{
      tokenId: string;
      success: boolean;
      score?: ScoreBreakdown;
    }>;
    failedTokenIds: string[];
  }> {
    const response = await this.api.post('/domains/batch-score', { tokenIds });
    return response.data;
  }

  async getScoringHistory(tokenId: string, limit = 10): Promise<{
    tokenId: string;
    historyCount: number;
    history: Array<{
      score: number;
      timestamp: string;
      factors: any;
    }>;
  }> {
    const response = await this.api.get(`/domains/${tokenId}/history`, {
      params: { limit }
    });
    return response.data;
  }

  async checkDomainExists(tokenId: string): Promise<{
    tokenId: string;
    exists: boolean;
    timestamp: string;
  }> {
    const response = await this.api.get(`/domains/${tokenId}/exists`);
    return response.data;
  }

  // Loan APIs
  async getLoans(address?: string): Promise<Loan[]> {
    const response = await this.api.get('/loans', {
      params: address ? { borrower: address } : undefined
    });
    return response.data;
  }

  async getLoan(loanId: string): Promise<Loan> {
    const response = await this.api.get(`/loans/${loanId}`);
    return response.data;
  }

  async createLoanRequest(data: {
    domainTokenId: string;
    requestedAmount: number;
    term: number; // in months
    poolId?: string;
  }): Promise<{
    success: boolean;
    loanId?: string;
    message: string;
  }> {
    const response = await this.api.post('/loans/request', data);
    return response.data;
  }

  async repayLoan(loanId: string, amount: number): Promise<{
    success: boolean;
    remainingBalance: number;
    nextPaymentDue: string;
    message: string;
  }> {
    const response = await this.api.post(`/loans/${loanId}/repay`, { amount });
    return response.data;
  }

  async getLoanHistory(loanId: string): Promise<Array<{
    type: 'payment' | 'interest_accrued' | 'late_fee';
    amount: number;
    timestamp: string;
    transactionHash?: string;
  }>> {
    const response = await this.api.get(`/loans/${loanId}/history`);
    return response.data;
  }

  // Auction APIs
  async getAuctions(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
    status?: 'active' | 'ended' | 'cancelled';
  }): Promise<{
    auctions: Auction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await this.api.get('/auctions', {
      params: {
        page: 1,
        limit: 20,
        sortBy: 'auctionStartedAt',
        order: 'desc',
        ...params
      }
    });
    return response.data;
  }

  async getAuction(auctionId: string): Promise<{ auction: AuctionDetail }> {
    const response = await this.api.get(`/auctions/${auctionId}`);
    return response.data;
  }

  async placeBid(auctionId: string, amount: number): Promise<{
    success: boolean;
    newCurrentPrice?: number;
    message: string;
    transactionHash?: string;
  }> {
    const response = await this.api.post(`/auctions/${auctionId}/bid`, { amount });
    return response.data;
  }

  async getAuctionBids(auctionId: string): Promise<Array<{
    bidder: string;
    amount: number;
    timestamp: string;
    transactionHash: string;
  }>> {
    const response = await this.api.get(`/auctions/${auctionId}/bids`);
    return response.data;
  }

  async getUserRelatedAuctions(address: string): Promise<{
    auctions: Auction[];
    total: number;
  }> {
    const response = await this.api.get(`/auctions/user/${address}`, {
      params: {
        limit: 10,
        status: 'active'
      }
    });
    return response.data;
  }

  // Pool APIs - Updated for new pool + poolHistory schema
  async getPools(params?: {
    page?: number;
    limit?: number;
    minAiScore?: number;
    status?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Promise<{
    pools: Array<{
      poolId: string;
      creator: string;
      minAiScore: number;
      interestRate: number;
      createdAt: string;
      totalLiquidity: string;          // Now calculated automatically in pool table
      liquidityProviderCount: number;  // From participantCount in pool table
      activeLoans: number;
      totalLoanVolume: string;
      defaultRate: number;
      status: string;                  // 'active' | 'paused' | 'closed'
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await this.api.get('/pools', {
      params: {
        page: 1,
        limit: 20,
        minAiScore: 50,
        status: 'active',
        sortBy: 'createdAt',
        order: 'desc',
        ...params
      }
    });
    return response.data;
  }

  async getUserPools(userAddress: string): Promise<{
    pools: Array<{
      poolId: string;
      creator: string;
      minAiScore: number;
      interestRate: number;
      createdAt: string;
      totalLiquidity: string;          // Now calculated automatically in pool table
      liquidityProviderCount: number;  // From participantCount in pool table
      activeLoans: number;
      totalLoanVolume: string;
      defaultRate: number;
      status: string;                  // 'active' | 'paused' | 'closed'
      userContribution: string;        // Calculated from poolHistory events
      userContributedAt: string;       // From earliest poolHistory event
      userIsCreator: boolean;
    }>;
    summary: {
      totalPools: number;
      totalContribution: string;
    };
  }> {
    const response = await this.api.get(`/pools/user/${userAddress}`);
    return response.data;
  }

  async getPoolById(poolId: string, includeLoans = true, includeHistory = false): Promise<{
    pool: {
      poolId: string;
      creator: string;
      minAiScore: number;
      interestRate: number;
      createdAt: string;
      totalLiquidity: string;          // Now calculated automatically in pool table
      liquidityProviderCount: number;  // From participantCount in pool table
      activeLoans: number;
      totalLoanVolume: string;
      defaultRate: number;
      status: string;                  // 'active' | 'paused' | 'closed'
    };
    loans?: Array<{
      loanId: string;
      borrowerAddress: string;
      domainTokenId: string;
      domainName: string;
      loanAmount: string;
      aiScore: number | null;
      interestRate: number;
      eventType: string;
      eventTimestamp: string;
      repaymentDeadline: string;
      liquidationAttempted: boolean;
      liquidationTimestamp: string | null;
    }>;
    poolHistory?: Array<{
      id: string;
      poolId: string;
      eventType: string;
      providerAddress?: string;
      liquidityAmount?: string;
      minAiScore?: number;
      interestRate?: number;
      eventTimestamp: string;
      blockNumber: string;
      transactionHash: string;
    }>;
  }> {
    const response = await this.api.get(`/pools/${poolId}`, {
      params: { includeLoans, includeHistory }
    });
    return response.data;
  }

  async getPoolsLegacy(): Promise<LiquidityPool[]> {
    const response = await this.api.get('/pools');
    return response.data;
  }

  async getPool(poolId: string): Promise<LiquidityPool> {
    const response = await this.api.get(`/pools/${poolId}`);
    return response.data;
  }

  async createPool(data: {
    name: string;
    description: string;
    poolType: 'custom' | 'crowdfunded';
    minLoanAmount: number;
    maxLoanAmount: number;
    maxLTV: number;
    minDomainScore: number;
    interestRate: number;
    criteria?: {
      allowedExtensions?: string[];
      maxAge?: number;
      minAge?: number;
      excludeNumbers?: boolean;
      excludeHyphens?: boolean;
    };
  }): Promise<{
    success: boolean;
    poolId?: string;
    message: string;
  }> {
    const response = await this.api.post('/pools', data);
    return response.data;
  }

  async addLiquidity(poolId: string, amount: number): Promise<{
    success: boolean;
    newTotalLiquidity: number;
    userShare: number;
    message: string;
    transactionHash?: string;
  }> {
    const response = await this.api.post(`/pools/${poolId}/add-liquidity`, { amount });
    return response.data;
  }

  async removeLiquidity(poolId: string, amount: number): Promise<{
    success: boolean;
    newTotalLiquidity: number;
    userShare: number;
    message: string;
    transactionHash?: string;
  }> {
    const response = await this.api.post(`/pools/${poolId}/remove-liquidity`, { amount });
    return response.data;
  }

  async getPoolStats(poolId: string): Promise<{
    totalEarnings: number;
    averageAPY: number;
    utilizationRate: number;
    totalLoansIssued: number;
    defaultRate: number;
    monthlyStats: Array<{
      month: string;
      earnings: number;
      loansIssued: number;
      apy: number;
    }>;
  }> {
    const response = await this.api.get(`/pools/${poolId}/stats`);
    return response.data;
  }

  // Domains list API
  async getDomains(params?: {
    page?: number;
    limit?: number;
    minAiScore?: number;
    maxAiScore?: number;
    liquidatedOnly?: boolean;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Promise<{
    domains: Array<{
      domainTokenId: string;
      domainName: string;
      latestAiScore: number;
      totalScoringRequests: number;
      totalLoansCreated: number;
      totalLoanVolume: string;
      hasBeenLiquidated: boolean;
      firstScoreTimestamp: string;
      lastActivityTimestamp: string;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await this.api.get('/domains', {
      params: {
        page: 1,
        limit: 20,
        minAiScore: 0,
        maxAiScore: 100,
        liquidatedOnly: false,
        ...params
      }
    });
    return response.data;
  }

  async searchDomains(searchTerm: string, params?: {
    page?: number;
    limit?: number;
    minAiScore?: number;
    maxAiScore?: number;
  }): Promise<{
    domains: Array<{
      domainTokenId: string;
      domainName: string;
      latestAiScore: number;
      totalScoringRequests: number;
      totalLoansCreated: number;
      totalLoanVolume: string;
      hasBeenLiquidated: boolean;
      firstScoreTimestamp: string;
      lastActivityTimestamp: string;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await this.api.get('/domains/search', {
      params: {
        q: searchTerm,
        page: 1,
        limit: 50,
        ...params
      }
    });
    return response.data;
  }

  async getDomainById(domainTokenId: string, includeRelations = true): Promise<{
    domain: {
      domainTokenId: string;
      domainName: string;
      latestAiScore: number;
      totalScoringRequests: number;
      totalLoansCreated: number;
      totalLoanVolume: string;
      hasBeenLiquidated: boolean;
      firstScoreTimestamp: string;
      lastActivityTimestamp: string;
      loans?: Array<{
        loanId: string;
        borrowerAddress: string;
        domainTokenId: string;
        domainName: string;
        loanAmount: string;
        aiScore: number | null;
        interestRate: number | null;
        eventType: string;
        eventTimestamp: string;
        repaymentDeadline: string | null;
        liquidationAttempted: boolean;
        liquidationTimestamp: string | null;
      }>;
      scoringHistory?: Array<{
        id: string;
        domainTokenId: string;
        domainName: string;
        requesterAddress: string;
        aiScore: number;
        confidence: number;
        reasoning: string;
        requestTimestamp: string;
        status: string;
      }>;
      auctions?: Array<{
        auctionId: string;
        loanId: string;
        domainTokenId: string;
        domainName: string | null;
        borrowerAddress: string | null;
        bidderAddress: string;
        startingPrice: string | null;
        currentPrice: string | null;
        finalPrice: string;
        recoveryRate: number;
        eventType: string;
        eventTimestamp: string;
      }>;
    };
  }> {
    const response = await this.api.get(`/domains/${domainTokenId}`, {
      params: { includeRelations }
    });
    return response.data;
  }

  // Dashboard API
  async getUserDashboard(address: string): Promise<{
    dashboard: {
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
    };
  }> {
    const response = await this.api.get(`/dashboard/user/${address}`);
    return response.data;
  }

  async getMarketStats(): Promise<{
    totalValueLocked: number;
    totalLoansIssued: number;
    averageAPY: number;
    totalActiveLoans: number;
    totalAuctions: number;
    totalPools: number;
    monthlyVolume: number;
  }> {
    const response = await this.api.get('/analytics/market');
    return response.data;
  }
}

// Create singleton instance
export const domaLendAPI = new DomaLendAPI();
export default domaLendAPI;
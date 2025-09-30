import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);
  private readonly graphqlEndpoint: string;

  constructor(private configService: ConfigService) {
    this.graphqlEndpoint = this.configService.get<string>('ponder.graphqlUrl') || 'http://localhost:42069/graphql';
    this.logger.log(`Indexer GraphQL endpoint: ${this.graphqlEndpoint}`);
  }

  async queryLoans(filters: any): Promise<any> {
    const { where, limit = 20 } = filters;
    const query = `
      query GetLoans($where: loanFilter, $limit: Int) {
        loans(
          where: $where,
          limit: $limit,
          orderBy: "createdAt",
          orderDirection: "desc"
        ) {
          items {
            id
            loanId
            borrowerAddress
            domainTokenId
            domainName
            originalAmount
            currentBalance
            totalRepaid
            aiScore
            status
            repaymentDeadline
            poolId
            createdAt
            lastUpdated
            liquidationAttempted
          }
        }
      }
    `;

    return this.executeQuery(query, { where, limit });
  }

  async queryLoanHistory(filters: any): Promise<any> {
    const { where, limit = 20 } = filters;
    const query = `
      query GetLoanHistory($where: loanHistoryFilter, $limit: Int) {
        loanHistorys(
          where: $where,
          limit: $limit,
          orderBy: "createdAt",
          orderDirection: "desc"
        ) {
          items {
            id
            loanId
            status
            borrowerAddress
            domainTokenId
            domainName
            amount
            remainingBalance
            aiScore
            interestRate
            poolId
            createdAt
            blockNumber
            transactionHash
          }
        }
      }
    `;

    return this.executeQuery(query, { where, limit });
  }

  async queryPools(filters: any): Promise<any> {
    const { where, limit = 20, includeLoans = false } = filters;
    const loansFragment = includeLoans ? `
      loans {
        items {
          id
          loanId
          borrowerAddress
          domainTokenId
          domainName
          originalAmount
          currentBalance
          totalRepaid
          aiScore
          status
          repaymentDeadline
          createdAt
          lastUpdated
          liquidationAttempted
        }
      }` : '';

    const query = `
      query GetPools($where: poolFilter, $limit: Int) {
        pools(
          where: $where,
          limit: $limit,
          orderBy: "createdAt",
          orderDirection: "desc"
        ) {
          items {
            id
            poolId
            creatorAddress
            totalLiquidity
            minAiScore
            interestRate
            participantCount
            status
            createdAt
            lastUpdated
            blockNumber
            transactionHash
            ${loansFragment}
          }
        }
      }
    `;

    return this.executeQuery(query, { where, limit });
  }

  async queryPoolHistory(filters: any): Promise<any> {
    const { where, limit = 20 } = filters;
    const query = `
      query GetPoolHistory($where: poolHistoryFilter, $limit: Int) {
        poolHistorys(
          where: $where,
          limit: $limit,
          orderBy: "eventTimestamp",
          orderDirection: "desc"
        ) {
          items {
            id
            poolId
            eventType
            providerAddress
            liquidityAmount
            minAiScore
            interestRate
            eventTimestamp
            blockNumber
            transactionHash
          }
        }
      }
    `;

    return this.executeQuery(query, { where, limit });
  }

  async queryPoolLoanStats(poolIds: string[]): Promise<any> {
    const query = `
      query GetPoolLoanStats($where: loanFilter) {
        loans(
          where: $where
        ) {
          items {
            poolId
            status
            originalAmount
          }
        }
      }
    `;

    return this.executeQuery(query, { where: { poolId_in: poolIds } });
  }

  async queryLoansByPool(poolId: string, limit: number = 20): Promise<any> {
    const query = `
      query GetLoansByPool($where: loanFilter, $limit: Int) {
        loans(
          where: $where,
          limit: $limit,
          orderBy: "createdAt",
          orderDirection: "desc"
        ) {
          items {
            loanId
            borrowerAddress
            domainTokenId
            domainName
            originalAmount
            aiScore
            interestRate
            status
            createdAt
            repaymentDeadline
            poolId
            liquidationAttempted
            liquidationTimestamp
          }
        }
      }
    `;

    return this.executeQuery(query, { where: { poolId }, limit });
  }

  async queryDomains(filters: any): Promise<any> {
    const { where, limit = 20, orderBy = 'lastActivityTimestamp', orderDirection = 'desc' } = filters;
    const query = `
      query GetDomains($where: domainAnalyticsFilter, $limit: Int, $orderBy: String, $orderDirection: String) {
        domainAnalyticss(
          where: $where,
          limit: $limit,
          orderBy: $orderBy,
          orderDirection: $orderDirection
        ) {
          items {
            domainTokenId
            domainName
            latestAiScore
            totalScoringRequests
            totalLoansCreated
            totalLoanVolume
            hasBeenLiquidated
            firstScoreTimestamp
            lastActivityTimestamp
          }
        }
      }
    `;

    return this.executeQuery(query, { where, limit, orderBy, orderDirection });
  }

  async queryDomainDetail(domainTokenId: string, includeRelations: boolean = true): Promise<any> {
    const relationsFragment = includeRelations ? `
      loans {
        items {
          loanId
          borrowerAddress
          domainTokenId
          domainName
          loanAmount
          aiScore
          interestRate
          eventType
          eventTimestamp
          repaymentDeadline
          liquidationAttempted
          liquidationTimestamp
        }
      }
      auctions {
        items {
          auctionId
          loanId
          domainTokenId
          domainName
          borrowerAddress
          bidderAddress
          startingPrice
          currentPrice
          finalPrice
          recoveryRate
          eventType
          eventTimestamp
        }
      }
      scoringEvents {
        items {
          id
          domainTokenId
          domainName
          requesterAddress
          aiScore
          confidence
          reasoning
          requestTimestamp
          status
        }
      }` : '';

    const query = `
      query GetDomainDetail($domainTokenId: String!) {
        domainAnalytics(id: $domainTokenId) {
          domainTokenId
          domainName
          latestAiScore
          totalScoringRequests
          totalLoansCreated
          totalLoanVolume
          hasBeenLiquidated
          firstScoreTimestamp
          lastActivityTimestamp
          ${relationsFragment}
        }
      }
    `;

    return this.executeQuery(query, { domainTokenId });
  }

  async queryAuctions(filters: any): Promise<any> {
    const { where, limit = 20, orderBy = 'createdAt', orderDirection = 'desc' } = filters;
    const query = `
      query GetAuctions($where: auctionFilter, $limit: Int, $orderBy: String, $orderDirection: String) {
        auctions(
          where: $where,
          limit: $limit,
          orderBy: $orderBy,
          orderDirection: $orderDirection
        ) {
          items {
            id
            auctionId
            loanId
            domainTokenId
            domainName
            borrowerAddress
            currentBidderAddress
            aiScore
            startingPrice
            currentPrice
            finalPrice
            status
            recoveryRate
            startedAt
            endedAt
            lastUpdated
            createdAt
            blockNumber
            transactionHash
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          totalCount
        }
      }
    `;

    return this.executeQuery(query, { where, limit, orderBy, orderDirection });
  }

  async queryAuctionDetail(auctionId: string): Promise<any> {
    const query = `
      query GetAuctionDetail($auctionId: String!) {
        auction(id: $auctionId) {
          id
          auctionId
          loanId
          domainTokenId
          domainName
          borrowerAddress
          currentBidderAddress
          aiScore
          startingPrice
          currentPrice
          finalPrice
          status
          recoveryRate
          startedAt
          endedAt
          lastUpdated
          createdAt
          blockNumber
          transactionHash
          loan {
            loanId
            borrowerAddress
            domainTokenId
            domainName
            originalAmount
            aiScore
            interestRate
            status
            createdAt
            repaymentDeadline
          }
          domain {
            domainTokenId
            domainName
            latestAiScore
            totalScoringRequests
            totalLoansCreated
            totalLoanVolume
            hasBeenLiquidated
            firstScoreTimestamp
            lastActivityTimestamp
          }
          history(orderBy: "createdAt", orderDirection: "asc") {
            items {
              id
              auctionId
              status
              bidderAddress
              bidAmount
              currentPrice
              finalPrice
              createdAt
              blockNumber
              transactionHash
            }
          }
        }
      }
    `;

    return this.executeQuery(query, { auctionId });
  }

  async queryUserDashboardData(userAddress: string): Promise<any> {
    const query = `
      query GetUserDashboard($userAddress: String!) {
        # Get user's loans
        userLoans: loans(
          where: { borrowerAddress: $userAddress }
          orderBy: "createdAt"
          orderDirection: "desc"
          limit: 50
        ) {
          items {
            loanId
            borrowerAddress
            domainTokenId
            domainName
            originalAmount
            aiScore
            interestRate
            status
            createdAt
            repaymentDeadline
            poolId
            liquidationAttempted
            liquidationTimestamp
          }
        }

        # Get user's pools (created pools)
        userPools: pools(
          where: { creatorAddress: $userAddress }
          orderBy: "createdAt"
          orderDirection: "desc"
          limit: 20
        ) {
          items {
            id
            poolId
            creatorAddress
            totalLiquidity
            minAiScore
            interestRate
            participantCount
            status
            createdAt
            lastUpdated
          }
        }

        # Get user's pool history (liquidity provision)
        userPoolHistory: poolHistorys(
          where: { providerAddress: $userAddress }
          orderBy: "eventTimestamp"
          orderDirection: "desc"
          limit: 50
        ) {
          items {
            poolId
            eventType
            providerAddress
            liquidityAmount
            eventTimestamp
          }
        }

        # Get user's auction activities
        userAuctions: auctions(
          where: { 
            OR: [
              { borrowerAddress: $userAddress }
              { currentBidderAddress: $userAddress }
            ]
          }
          orderBy: "createdAt"
          orderDirection: "desc"
          limit: 20
        ) {
          items {
            id
            auctionId
            loanId
            domainTokenId
            domainName
            borrowerAddress
            currentBidderAddress
            startingPrice
            currentPrice
            finalPrice
            status
            recoveryRate
            startedAt
            endedAt
          }
        }

        # Get recent auctions for opportunities
        recentAuctions: auctions(
          where: { status: "active" }
          orderBy: "startedAt"
          orderDirection: "desc"
          limit: 10
        ) {
          items {
            id
            auctionId
            domainTokenId
            domainName
            startingPrice
            currentPrice
            status
            startedAt
            endedAt
          }
        }
      }
    `;

    return this.executeQuery(query, { userAddress });
  }

  async queryUserPoolStats(userAddress: string): Promise<any> {
    const query = `
      query GetUserPoolStats($userAddress: String!) {
        poolHistorys(
          where: { providerAddress: $userAddress }
        ) {
          items {
            poolId
            liquidityAmount
            eventType
            eventTimestamp
          }
        }
      }
    `;

    return this.executeQuery(query, { userAddress });
  }

  private async executeQuery(query: string, variables: any): Promise<any> {
    try {
      // Log the GraphQL query and variables for debugging
      this.logger.log(`Executing GraphQL query:`, {
        endpoint: this.graphqlEndpoint,
        query: query.replace(/\s+/g, ' ').trim(),
        variables: JSON.stringify(variables)
      });

      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL query failed: ${response.status}`);
      }

      const result = await response.json();

      // Log the response for debugging
      this.logger.log(`GraphQL response:`, JSON.stringify(result, null, 2));

      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      return result.data;
    } catch (error) {
      this.logger.error(`Indexer query failed:`, error);
      throw new HttpException('Failed to fetch data from indexer', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
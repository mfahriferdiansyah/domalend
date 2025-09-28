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
      query GetLoans($where: loanEventFilter, $limit: Int) {
        loanEvents(
          where: $where,
          limit: $limit,
          orderBy: "eventTimestamp",
          orderDirection: "desc"
        ) {
          items {
            loanId
            borrowerAddress
            domainTokenId
            domainName
            loanAmount
            aiScore
            eventType
            eventTimestamp
            repaymentDeadline
            poolId
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
      }` : '';

    const query = `
      query GetPools($where: poolEventFilter, $limit: Int) {
        poolEvents(
          where: $where,
          limit: $limit,
          orderBy: "eventTimestamp",
          orderDirection: "desc"
        ) {
          items {
            poolId
            creatorAddress
            minAiScore
            interestRate
            liquidityAmount
            eventType
            eventTimestamp
            providerAddress
            ${loansFragment}
          }
        }
      }
    `;

    return this.executeQuery(query, { where, limit });
  }

  async queryPoolLoanStats(poolIds: string[]): Promise<any> {
    const query = `
      query GetPoolLoanStats($where: loanEventFilter) {
        loanEvents(
          where: $where
        ) {
          items {
            poolId
            eventType
            loanAmount
          }
        }
      }
    `;

    return this.executeQuery(query, { where: { poolId_in: poolIds } });
  }

  async queryLoansByPool(poolId: string, limit: number = 20): Promise<any> {
    const query = `
      query GetLoansByPool($where: loanEventFilter, $limit: Int) {
        loanEvents(
          where: $where,
          limit: $limit,
          orderBy: "eventTimestamp",
          orderDirection: "desc"
        ) {
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
    const { where, limit = 20 } = filters;
    const query = `
      query GetAuctions($where: auctionEventFilter, $limit: Int) {
        auctionEvents(
          where: $where,
          limit: $limit
        ) {
          items {
            auctionId
            loanId
            domainTokenId
            domainName
            borrowerAddress
            bidderAddress
            startingPrice
            currentPrice
            eventType
            eventTimestamp
          }
        }
      }
    `;

    return this.executeQuery(query, { where, limit });
  }

  async queryAuctionDetail(auctionId: string): Promise<any> {
    const query = `
      query GetAuctionDetail($auctionId: String!) {
        auctionEvents(
          where: { auctionId: $auctionId }
          orderBy: "eventTimestamp"
          orderDirection: "asc"
        ) {
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
      }
    `;

    return this.executeQuery(query, { auctionId });
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
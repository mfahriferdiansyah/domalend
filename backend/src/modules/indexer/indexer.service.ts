import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);
  private readonly graphqlEndpoint = 'http://localhost:42069/graphql';

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
    const { where, limit = 20 } = filters;
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

  private async executeQuery(query: string, variables: any): Promise<any> {
    try {
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
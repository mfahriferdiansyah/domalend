import { gql } from "graphql-request";

export const queryFaucetTokenss = gql`{
    faucetTokenss(orderBy: "timestamp", orderDirection: "desc") {
        items {
          token
          id
          timestamp
          transactionId
          blockNumber
        }
    }
}`

export const queryRequestTokenss = gql`{
    faucetRequestss {
        items {
          id
          receiver
          requester
          timestamp
          token
          blockNumber
          transactionId
        }
  }
}`
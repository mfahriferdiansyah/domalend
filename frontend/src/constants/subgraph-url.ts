import { getGraphQLUrl } from '@/utils/env'

export const IDRT_SUBGRAPH_URL = "https://api.studio.thegraph.com/query/93430/idrt/v0.0.1";

export const WETH_SUBGRAPH_URL = "https://api.studio.thegraph.com/query/93430/weth/v0.0.1";

export const GTX_GRAPHQL_URL = (chainId?: number): string => {
    return getGraphQLUrl(chainId)
}

export const PERPETUAL_GRAPHQL_URL = "https://gtx-monad-perpetual-indexer.bobbyfiando.com";

import {
  PoolsResponse,
  PoolsPonderResponse,
  TradesResponse,
  TradesPonderResponse,
  OrdersResponse,
  OrdersPonderResponse,
  BalancesResponse,
  BalancesPonderResponse,
  PoolItem,
  TradeItem,
  OrderItem,
  BalanceItem,
  RecentTradesResponse,
  RecentTradesPonderResponse,
  RecentTradeItem,
  TradeHistoryResponse,
  TradeHistoryPonderResponse,
  TradeHistoryItem,
  OpenOrderItem,
  OpenOrdersResponse,
  OpenOrdersPonderResponse,
} from '@/graphql/gtx/clob';
import { AccountData, TradeData } from './market-api';
import { TradeEvent } from '@/services/market-websocket';

export function transformPoolsData(
  data: PoolsResponse | PoolsPonderResponse | undefined
): PoolItem[] {
  if (!data) return [];

  if ('poolss' in data) {
    // Handle PonderResponse
    return data.poolss.items;
  } else if ('pools' in data) {
    // Handle regular Response
    return data.pools;
  }

  return [];
}

export function transformTradesData(
  data: TradesResponse | TradesPonderResponse | undefined
): TradeItem[] {
  if (!data) return [];

  if ('tradess' in data) {
    // Handle PonderResponse
    return data.tradess.items;
  } else if ('trades' in data) {
    // Handle regular Response
    return data.trades;
  }

  return [];
}

/**
 * Transform WebSocket trade data to match the format expected by transformTradesData
 * @param wsTradeData Single WebSocket trade event or array of events
 * @param poolId Current pool ID
 * @param poolSymbol Current pool symbol
 * @returns TradeItem or array of TradeItem objects
 */
export function transformWebSocketTradeToTradeItem(
  wsTradeData: TradeEvent | null,
  poolId: string,
  poolSymbol: string
): TradeItem | null;
export function transformWebSocketTradeToTradeItem(
  wsTradeData: TradeEvent[],
  poolId: string,
  poolSymbol: string
): TradeItem[];
export function transformWebSocketTradeToTradeItem(
  wsTradeData: TradeEvent | TradeEvent[] | null,
  poolId: string,
  poolSymbol: string
): TradeItem | TradeItem[] | null {
  if (!wsTradeData) return null;
  
  // Handle single TradeEvent
  if (!Array.isArray(wsTradeData)) {
    const trade = wsTradeData;
    // Convert single WebSocket trade to TradeItem
    return {
      id: trade.t, // Trade ID
      orderId: trade.t, // Using trade ID as order ID since WS doesn't provide order ID
      poolId: poolId,
      pool: poolSymbol,
      price: trade.p, // Price
      quantity: trade.q, // Quantity
      timestamp: trade.T, // Trade time
      transactionId: trade.t, // Using trade ID as transaction ID
      order: {
        expiry: 0, // Default value as WS doesn't provide this
        filled: trade.q, // Assuming the trade is fully filled
        id: trade.t, // Using trade ID as order ID
        orderId: trade.t, // Using trade ID as order ID
        poolId: poolId,
        price: trade.p,
        type: 'LIMIT', // Default value as WS doesn't provide this
        timestamp: trade.T,
        status: 'FILLED', // Default value as WS doesn't provide this
        side: trade.m ? 'Sell' : 'Buy', // If buyer is maker, then seller initiated the trade
        quantity: trade.q,
        user: {
          amount: '0', // Default value as WS doesn't provide this
          currency: {
            address: '',
            name: '',
            symbol: '',
            decimals: 0
          },
          lockedAmount: '0', // Default value as WS doesn't provide this
          symbol: '',
          user: '0x', // Default value as WS doesn't provide this
        },
        pool: {
          coin: poolSymbol,
          id: poolId,
          lotSize: '0', // Default value as WS doesn't provide this
          maxOrderAmount: '0', // Default value as WS doesn't provide this
          orderBook: '',
          timestamp: trade.T,
          baseCurrency: {
            address: '',
            name: '',
            symbol: '',
            decimals: 0
          },
          quoteCurrency: {
            address: '',
            name: '',
            symbol: '',
            decimals: 0
          }
        }
      }
    };
  }
  
  // Handle array of TradeEvents
  if (wsTradeData.length === 0) return [];

  return wsTradeData.map((trade) => {
    // Convert WebSocket trade format to TradeItem format
    return {
      id: trade.t, // Trade ID
      orderId: trade.t, // Using trade ID as order ID since WS doesn't provide order ID
      poolId: poolId,
      pool: poolSymbol,
      price: trade.p, // Price
      quantity: trade.q, // Quantity
      timestamp: trade.T, // Trade time
      transactionId: trade.t, // Using trade ID as transaction ID
      order: {
        expiry: 0, // Default value as WS doesn't provide this
        filled: trade.q, // Assuming the trade is fully filled
        id: trade.t, // Using trade ID as order ID
        orderId: trade.t, // Using trade ID as order ID
        poolId: poolId,
        price: trade.p,
        type: 'LIMIT', // Default value as WS doesn't provide this
        timestamp: trade.T,
        status: 'FILLED', // Default value as WS doesn't provide this
        side: trade.m ? 'Sell' : 'Buy', // If buyer is maker, then seller initiated the trade
        quantity: trade.q,
        user: {
          amount: '0', // Default value as WS doesn't provide this
          currency: {
            address: '',
            name: '',
            symbol: '',
            decimals: 0
          },
          lockedAmount: '0', // Default value as WS doesn't provide this
          symbol: '',
          user: '0x', // Default value as WS doesn't provide this
        },
        pool: {
          coin: poolSymbol,
          id: poolId,
          lotSize: '0', // Default value as WS doesn't provide this
          maxOrderAmount: '0', // Default value as WS doesn't provide this
          orderBook: '',
          timestamp: trade.T,
          baseCurrency: {
            address: '',
            name: '',
            symbol: '',
            decimals: 0
          },
          quoteCurrency: {
            address: '',
            name: '',
            symbol: '',
            decimals: 0
          }
        }
      }
    };
  });
}

/**
 * Transform API trade data to match the format expected by transformTradesData
 * @param apiTradeData Array of API trade data
 * @param poolId Current pool ID
 * @param poolSymbol Current pool symbol
 * @returns Array of TradeItem objects
 */
export function transformApiTradeToTradeItem(
  apiTradeData: TradeData[],
  poolId: string,
  poolSymbol: string
): TradeItem[] {
  if (!apiTradeData || apiTradeData.length === 0) return [];

  return apiTradeData.map((trade) => {
    // Convert API trade format to TradeItem format
    return {
      id: trade.id,
      orderId: trade.id, // Using trade ID as order ID
      poolId: poolId,
      pool: poolSymbol,
      price: trade.price,
      quantity: trade.qty,
      timestamp: trade.time,
      transactionId: trade.id, // Using trade ID as transaction ID
      order: {
        expiry: 0, // Default value as API doesn't provide this
        filled: trade.qty, // Assuming the trade is fully filled
        id: trade.id, // Using trade ID as order ID
        orderId: trade.id, // Using trade ID as order ID
        poolId: poolId,
        price: trade.price,
        type: 'LIMIT', // Default value as API doesn't provide this
        timestamp: trade.time,
        status: 'FILLED', // Default value as API doesn't provide this
        side: trade.isBuyerMaker ? 'Sell' : 'Buy', // If buyer is maker, then seller initiated the trade
        quantity: trade.qty,
        user: {
          amount: '0', // Default value as API doesn't provide this
          currency: {
            address: '',
            name: '',
            symbol: '',
            decimals: 0
          },
          lockedAmount: '0', // Default value as API doesn't provide this
          symbol: '',
          user: '0x', // Default value as API doesn't provide this
        },
        pool: {
          coin: poolSymbol,
          id: poolId,
          lotSize: '0', // Default value as API doesn't provide this
          maxOrderAmount: '0', // Default value as API doesn't provide this
          orderBook: '',
          timestamp: trade.time,
          baseCurrency: {
            address: '',
            name: '',
            symbol: '',
            decimals: 0
          },
          quoteCurrency: {
            address: '',
            name: '',
            symbol: '',
            decimals: 0
          }
        }
      }
    };
  });
}

export function transformRecentTradesData(
  data: RecentTradesResponse | RecentTradesPonderResponse | undefined
): RecentTradeItem[] {
  if (!data) return [];

  if ('orderBookTradess' in data) {
    // Handle PonderResponse
    return data.orderBookTradess.items;
  } else if ('trades' in data) {
    // Handle regular Response
    return data.orderBookTrades;
  }

  return [];
}

export function transformOrdersData(
  data: OrdersResponse | OrdersPonderResponse | undefined
): OrderItem[] {
  // Both types use 'orderss' but with different structures
  if (!data) return [];

  if ('orderss' in data) {
    if ('items' in data.orderss) {
      // Handle PonderResponse
      return data.orderss.items;
    } else {
      // Handle regular Response
      return data.orderss;
    }
  }

  return [];
}

export function transformOpenOrdersData(
  data: OpenOrdersResponse | OpenOrdersPonderResponse | undefined
): OpenOrderItem[] {
  // Both types use 'orderss' but with different structures

  if (!data) return [];

  if ('orderss' in data) {
    if ('items' in data.orderss) {
      // Handle PonderResponse
      return data.orderss.items;
    } else {
      // Handle regular Response
      return data.orderss;
    }
  }

  return [];
}

export function transformTradeHistoryData(
  data: TradeHistoryResponse | TradeHistoryPonderResponse | undefined
): TradeHistoryItem[] {
  if (!data) return [];

  if ('orderHistorys' in data) {
    if ('items' in data.orderHistorys) {
      // Handle PonderResponse
      return data.orderHistorys.items;
    } else {
      // Handle regular Response
      return data.orderHistorys;
    }
  }

  return [];
}

export function transformBalancesData(
  data: BalancesResponse | BalancesPonderResponse | undefined
): BalanceItem[] {
  if (!data) return [];

  // Both types use 'balancess' but with different structures
  if ('balancess' in data) {
    if ('items' in data.balancess) {
      // Handle PonderResponse
      return data.balancess.items;
    } else {
      // Handle regular Response
      return data.balancess;
    }
  }

  return [];
}

/**
 * Transform account data from the API to the format expected by the TradingHistory component
 */
export function transformAccountDataToBalances(
  accountData: AccountData | null | undefined
): BalanceItem[] {
  if (!accountData || !accountData.balances) return [];
  
  return accountData.balances.map((balance: { asset: string; free: string; locked: string }) => ({
    id: `${balance.asset.toLowerCase()}`,
    currency: {
      address: '',
      name: balance.asset,
      symbol: balance.asset,
      decimals: 18 // Default decimals, adjust if you have this information
    },
    amount: balance.free,
    lockedAmount: balance.locked,
    user: '' // Not available in API data
  }));
}

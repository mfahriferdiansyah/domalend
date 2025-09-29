export interface PoolsPonderResponse {
  poolss: {
    items: Pool[];
  };
}

export interface PoolsResponse {
  pools: Pool[];
}


export interface Pool {
  id: string;
  coin: string;
  timestamp: number;
  maxOrderAmount: string;
}

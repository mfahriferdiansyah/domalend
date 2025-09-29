import urlsConfigData from "@/constants/urls/urls-config.json";

// Type assertion for the imported JSON
const typedUrlsConfig = urlsConfigData as { INDEXER_URLS: { [chainId: string]: string } };

// Use the same URLs as the indexer
export const MARKET_DATA_API_URLS = typedUrlsConfig.INDEXER_URLS;

// Helper function to get market data API URL by chain ID
export function getMarketDataApiUrl(chainId: string | number): string {
  const chainIdString = chainId.toString();
  const url = MARKET_DATA_API_URLS[chainIdString];
  
  if (!url) {
    throw new Error(`Market Data API URL for chain ID ${chainIdString} not found in configuration`);
  }
  
  return url;
}

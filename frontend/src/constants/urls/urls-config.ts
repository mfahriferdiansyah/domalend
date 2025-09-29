import urlsConfigData from "@/constants/urls/urls-config.json";

interface IndexerUrls {
    [chainId: string]: string;
}

interface ExplorerUrls {
    [chainId: string]: string;
}

interface UrlsConfig {
    INDEXER_URLS: IndexerUrls;
    EXPLORER_URLS: ExplorerUrls;
    WEBSOCKET_URLS: ExplorerUrls;
}

// Type assertion for the imported JSON
const typedUrlsConfig = urlsConfigData as UrlsConfig;

// Extract URL configs with proper typing
export const INDEXER_URLS = typedUrlsConfig.INDEXER_URLS;
export const EXPLORER_URLS = typedUrlsConfig.EXPLORER_URLS;
export const WEBSOCKET_URLS = typedUrlsConfig.WEBSOCKET_URLS;

// Helper function to get indexer URL by chain ID
export function getIndexerUrl(chainId: string | number): string {
    const chainIdString = chainId.toString();
    const url = INDEXER_URLS[chainIdString];
    
    if (!url) {
        throw new Error(`Indexer URL for chain ID ${chainIdString} not found in configuration`);
    }
    
    return url;
}

// Helper function to get websocket URL by chain ID
export function getWebsocketUrl(chainId: string | number): string {
    const chainIdString = chainId.toString();
    const url = WEBSOCKET_URLS[chainIdString];
    
    if (!url) {
        throw new Error(`Websocket URL for chain ID ${chainIdString} not found in configuration`);
    }
    
    return url;
}

// Helper function to get explorer URL by chain ID
export function getExplorerUrl(chainId: string | number): string {
    const chainIdString = chainId.toString();
    const url = EXPLORER_URLS[chainIdString];
    
    if (!url) {
        throw new Error(`Explorer URL for chain ID ${chainIdString} not found in configuration`);
    }
    
    return url;
}

// Helper function to build a complete explorer transaction URL
export function getExplorerTxUrl(chainId: string | number, txHash: string): string {
    return `${getExplorerUrl(chainId)}${txHash}`;
}

// Helper function to add a new indexer URL to the configuration
export function addIndexerUrl(chainId: string | number, url: string): void {
    const chainIdString = chainId.toString();
    INDEXER_URLS[chainIdString] = url;
}

// Helper function to add a new explorer URL to the configuration
export function addExplorerUrl(chainId: string | number, url: string): void {
    const chainIdString = chainId.toString();
    EXPLORER_URLS[chainIdString] = url;
}
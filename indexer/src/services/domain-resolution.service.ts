/**
 * Domain Resolution Service - Uses Viem for Doma Protocol integration
 * Converts tokenId to domain name via Doma Protocol contract
 */

import { createPublicClient, http, type Address } from 'viem';
import { defineChain } from 'viem';

// Define Doma testnet chain
const domaTestnet = defineChain({
  id: 97476,
  name: 'Doma Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Doma',
    symbol: 'DOMA',
  },
  rpcUrls: {
    default: { http: ['https://rpc-testnet.doma.xyz'] },
  },
  blockExplorers: {
    default: {
      name: 'Doma Explorer',
      url: 'https://explorer-testnet.doma.xyz',
    },
  },
});

// Basic Doma Protocol ABI for domain resolution
const DOMA_PROTOCOL_ABI = [
  {
    type: 'function',
    name: 'getDomainName',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'tokenURI',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'ownerOf',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
] as const;

export class DomainResolutionService {
  private client;
  private domaProtocolAddress: Address;

  constructor() {
    this.client = createPublicClient({
      chain: domaTestnet,
      transport: http(process.env.DOMA_RPC_URL || 'https://rpc-testnet.doma.xyz'),
    });
    
    this.domaProtocolAddress = (process.env.DOMA_PROTOCOL_ADDRESS as Address) || 
      '0x424bDf2E8a6F52Bd2c1C81D9437b0DC0309DF90f';
  }

  /**
   * Resolve domain token ID to domain name
   * PRIMARY METHOD for tokenId → domain name conversion
   * FIXED: Uses metadata API pattern instead of non-existent getDomainName()
   */
  async resolveDomainName(tokenId: bigint): Promise<string> {
    try {
      console.log(`[DomainResolver] Resolving tokenId: ${tokenId}`);

      // Get tokenURI from contract
      const tokenURI = await this.client.readContract({
        address: this.domaProtocolAddress,
        abi: DOMA_PROTOCOL_ABI,
        functionName: 'tokenURI',
        args: [tokenId],
      }) as string;

      if (!tokenURI) {
        throw new Error('No tokenURI returned');
      }

      console.log(`[DomainResolver] Got tokenURI for ${tokenId}: ${tokenURI}`);

      // Fetch metadata JSON from tokenURI
      const response = await fetch(tokenURI);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const metadata = await response.json();

      // Extract domain name from metadata
      const domainName = metadata.name || metadata.domain || metadata.title;

      if (domainName && domainName.length > 0) {
        console.log(`[DomainResolver] ✅ Resolved ${tokenId} → ${domainName}`);
        return domainName;
      }

      throw new Error('No domain name found in metadata');

    } catch (error) {
      console.error(`[DomainResolver] ❌ Resolution failed for ${tokenId}:`, error);
      throw error;
    }
  }

  /**
   * Batch resolve multiple token IDs
   */
  async batchResolveDomainNames(tokenIds: bigint[]): Promise<{tokenId: bigint, domainName: string}[]> {
    console.log(`[DomainResolver] Batch resolving ${tokenIds.length} tokenIds`);
    
    const results = await Promise.allSettled(
      tokenIds.map(async (tokenId) => ({
        tokenId,
        domainName: await this.resolveDomainName(tokenId)
      }))
    );
    
    return results
      .map((result, index) => {
        const tokenId = tokenIds[index];
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`[DomainResolver] Batch resolve failed for ${tokenId}:`, result.reason);
          return {
            tokenId: tokenId || 0n,
            domainName: `domain-${tokenId || 0}.error`
          };
        }
      })
      .filter(result => result.tokenId !== 0n); // Filter out invalid entries
  }

  /**
   * Verify domain ownership (security check)
   */
  async verifyDomainOwnership(tokenId: bigint, expectedOwner: Address): Promise<boolean> {
    try {
      const actualOwner = await this.client.readContract({
        address: this.domaProtocolAddress,
        abi: DOMA_PROTOCOL_ABI,
        functionName: 'ownerOf',
        args: [tokenId],
      }) as Address;
      
      const isOwner = actualOwner.toLowerCase() === expectedOwner.toLowerCase();
      
      if (!isOwner) {
        console.warn(`[DomainResolver] ⚠️ Ownership mismatch for ${tokenId}: expected ${expectedOwner}, got ${actualOwner}`);
      }
      
      return isOwner;
    } catch (error) {
      console.error(`[DomainResolver] ❌ Ownership verification failed for ${tokenId}:`, error);
      return false;
    }
  }

  /**
   * Parse domain name from tokenURI metadata
   * This depends on Doma Protocol's specific URI format
   */
  private parseDomainFromURI(uri: string): string {
    try {
      // Handle different URI formats
      
      // Format 1: data:application/json;base64,{encoded}
      if (uri.startsWith('data:application/json;base64,')) {
        const parts = uri.split(',');
        if (parts.length < 2) return 'malformed.domain';

        const encoded = parts[1];
        if (!encoded) return 'invalid.domain';
        const decoded = atob(encoded);
        const metadata = JSON.parse(decoded);
        
        // Common metadata fields for domain name
        return metadata.name || metadata.domain || metadata.title || 'unknown.domain';
      }
      
      // Format 2: IPFS URI
      if (uri.startsWith('ipfs://')) {
        // For IPFS, we'd need to fetch the metadata
        // For now, return placeholder
        console.warn(`[DomainResolver] IPFS URI not supported yet: ${uri}`);
        return 'ipfs.domain';
      }
      
      // Format 3: HTTP URI
      if (uri.startsWith('http')) {
        // For HTTP, we'd need to fetch the metadata
        // For now, return placeholder
        console.warn(`[DomainResolver] HTTP URI not supported yet: ${uri}`);
        return 'http.domain';
      }
      
      // Format 4: Direct domain name
      if (uri.includes('.')) {
        return uri;
      }
      
      return 'unknown.domain';
      
    } catch (error) {
      console.error(`[DomainResolver] ❌ URI parsing failed:`, error);
      return 'unknown.domain';
    }
  }

  /**
   * Health check for Doma Protocol connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to read a contract function to verify connection
      await this.client.getChainId();
      return true;
    } catch (error) {
      console.error('[DomainResolver] Health check failed:', error);
      return false;
    }
  }

  /**
   * Get domain metadata (if available)
   */
  async getDomainMetadata(tokenId: bigint): Promise<{
    name: string;
    owner: Address;
    uri: string;
  } | null> {
    try {
      const [name, owner, uri] = await Promise.all([
        this.resolveDomainName(tokenId),
        this.client.readContract({
          address: this.domaProtocolAddress,
          abi: DOMA_PROTOCOL_ABI,
          functionName: 'ownerOf',
          args: [tokenId],
        }) as Promise<Address>,
        this.client.readContract({
          address: this.domaProtocolAddress,
          abi: DOMA_PROTOCOL_ABI,
          functionName: 'tokenURI',
          args: [tokenId],
        }) as Promise<string>,
      ]);
      
      return { name, owner, uri };
    } catch (error) {
      console.error(`[DomainResolver] ❌ Metadata fetch failed for ${tokenId}:`, error);
      return null;
    }
  }
}
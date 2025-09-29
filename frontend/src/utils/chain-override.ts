/**
 * Simple Chain Override Utility
 * 
 * This utility provides a simple way to override the chainId used for contract interactions
 * via environment variables, without needing to modify individual hooks.
 */

import { domaTestnet } from '@/configs/wagmi';

// Available chains for override
const AVAILABLE_CHAINS = {
  DOMA_TESTNET: domaTestnet.id,      // 97476
} as const;

/**
 * Get the forced chain ID from environment variables
 * Returns null if no forcing is configured
 */
function getForcedChainId(): number | null {
  // Get the forced chain ID from environment
  const forcedChainIdEnv = process.env.NEXT_PUBLIC_FORCE_CHAIN_ID;
  
  if (!forcedChainIdEnv) {
    return null; // No forcing configured
  }
  
  const forcedChainId = parseInt(forcedChainIdEnv);
  
  if (isNaN(forcedChainId)) {
    console.warn('[CHAIN_OVERRIDE] Invalid NEXT_PUBLIC_FORCE_CHAIN_ID:', forcedChainIdEnv);
    return null;
  }
  
  return forcedChainId;
}

/**
 * Get the chain ID to use for contract interactions
 * Returns forced chain if configured, otherwise returns the current chain
 */
export function getEffectiveChainId(currentChainId: number): number {
  const forcedChainId = getForcedChainId();
  
  if (forcedChainId !== null) {
    // Log chain override for debugging
    if (process.env.NODE_ENV === 'development' && forcedChainId !== currentChainId) {
      console.log(`[CHAIN_OVERRIDE] Using forced chain ${forcedChainId} instead of current chain ${currentChainId}`);
    }
    
    return forcedChainId;
  }
  
  return currentChainId;
}

/**
 * Check if chain forcing is enabled
 */
export function isChainForcingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FORCE_CHAIN_ID !== undefined;
}

/**
 * Get the name of a chain for display purposes
 */
export function getChainName(chainId: number): string {
  switch (chainId) {
    case AVAILABLE_CHAINS.DOMA_TESTNET:
      return 'Doma Testnet';
    default:
      return `Chain ${chainId}`;
  }
}

/**
 * Hook to get the effective chain ID for contract interactions
 */
export function useEffectiveChainId(currentChainId: number): number {
  return getEffectiveChainId(currentChainId);
}

// Export available chains for reference
export { AVAILABLE_CHAINS };
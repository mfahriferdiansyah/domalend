import { ContractName, getContractAddress, DEFAULT_CHAIN } from "@/constants/contract/contract-address"
import type { HexAddress } from "@/types/general/address"

/**
 * Gets token addresses for a specific chain
 * @param chainId - The chain ID to get token addresses for (defaults to DEFAULT_CHAIN)
 * @returns Object containing token addresses for the specified chain
 */
export const getTokenAddresses = (chainId: string | number = DEFAULT_CHAIN) => {
  try {
    return {
      WETH: getContractAddress(chainId, ContractName.weth) as HexAddress,
      WBTC: getContractAddress(chainId, ContractName.wbtc) as HexAddress,
      USDC: getContractAddress(chainId, ContractName.usdc) as HexAddress
    }
  } catch (error) {
    console.error(`Failed to get token addresses for chain ${chainId}:`, error)
    // Return empty object as fallback
    return {} as Record<string, HexAddress>
  }
}

/**
 * Gets token objects for a specific chain
 * @param chainId - The chain ID to get tokens for (defaults to DEFAULT_CHAIN)
 * @returns Array of token objects with symbol and address
 */
export const getTokensForChain = (chainId: string | number = DEFAULT_CHAIN) => {
  const addresses = getTokenAddresses(chainId)

  return [
    { symbol: "WETH", address: addresses.WETH },
    { symbol: "WBTC", address: addresses.WBTC },
    { symbol: "USDC", address: addresses.USDC }
  ].filter(token => token.address) // Filter out any undefined addresses
}
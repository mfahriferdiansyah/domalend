import getConfig from 'next/config'
import { DEFAULT_CHAIN, ContractName, getContractAddress } from '@/constants/contract/contract-address'
import { USE_SUBGRAPH } from '@/constants/features/features-config'
import { getIndexerUrl, getExplorerUrl as getExplorerUrlFromConfig } from '@/constants/urls/urls-config'

const { publicRuntimeConfig } = getConfig()

// Helper function to get chain ID string
const getChainIdStr = (chainId?: number): string => {
    return chainId ? chainId.toString() : DEFAULT_CHAIN
}

export const getGraphQLUrl = (chainId?: number): string => {
    try {
        const chainIdStr = getChainIdStr(chainId);
        return getIndexerUrl(chainIdStr);
    } catch (error) {
        throw new Error(`GraphQL URL not found for chain ${getChainIdStr(chainId)}`);
    }
};

export const getUseSubgraph = (): boolean => {
    return USE_SUBGRAPH
}

export const getExplorerUrl = (chainId?: number): string => {
    try {
        const chainIdStr = getChainIdStr(chainId);
        return getExplorerUrlFromConfig(chainIdStr);
    } catch (error) {
        console.error(`Explorer URL not found for chain ${getChainIdStr(chainId)}`);
        return '';
    }
};

// Methods that can use contract-address.ts directly
export const getBalanceManagerAddress = (chainId?: number): string => {
    try {
        // Try to get from contract addresses first
        return getContractAddress(chainId || DEFAULT_CHAIN, ContractName.clobBalanceManager)
    } catch (error) {
        // Fall back to environment variables if not found in contract config
        const chainIdStr = getChainIdStr(chainId)
        const envVarName = `NEXT_PUBLIC_BALANCE_MANAGER_${chainIdStr}_ADDRESS`
        const address = publicRuntimeConfig[envVarName]
        
        if (!address) {
            console.error(`Balance Manager address not found for chain ${chainIdStr}`)
            throw new Error(`Balance Manager address not found for chain ${chainIdStr}`)
        }
        
        return address
    }
}

export const getPoolManagerAddress = (chainId?: number): string => {
    try {
        // Try to get from contract addresses first
        return getContractAddress(chainId || DEFAULT_CHAIN, ContractName.clobPoolManager)
    } catch (error) {
        // Fall back to environment variables if not found in contract config
        const chainIdStr = getChainIdStr(chainId)
        const envVarName = `NEXT_PUBLIC_POOL_MANAGER_${chainIdStr}_ADDRESS`
        const address = publicRuntimeConfig[envVarName]
        
        if (!address) {
            console.error(`Pool Manager address not found for chain ${chainIdStr}`)
            throw new Error(`Pool Manager address not found for chain ${chainIdStr}`)
        }
        
        return address
    }
}

export const getGTXRouterAddress = (chainId?: number): string => {
    try {
        // Try to get from contract addresses first
        return getContractAddress(chainId || DEFAULT_CHAIN, ContractName.clobRouter)
    } catch (error) {
        // Fall back to environment variables if not found in contract config
        const chainIdStr = getChainIdStr(chainId)
        const envVarName = `NEXT_PUBLIC_GTX_ROUTER_${chainIdStr}_ADDRESS`
        const address = publicRuntimeConfig[envVarName]
        
        if (!address) {
            console.error(`GTX Router address not found for chain ${chainIdStr}`)
            throw new Error(`GTX Router address not found for chain ${chainIdStr}`)
        }
        
        return address
    }
}
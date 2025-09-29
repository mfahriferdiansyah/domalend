import { getExplorerUrl } from '@/utils/env'

export const EXPLORER_URL = (chainId?: number): string => {
    return getExplorerUrl(chainId)
}

/**
 * Debug component to verify chain forcing is working correctly
 * Only renders in development mode
 */

import { useChainId } from 'wagmi';
import { useEffectiveChainId, getChainName, isChainForcingEnabled } from '@/utils/chain-override';

export default function ChainForceDebug() {
  const currentChainId = useChainId();
  const effectiveChainId = useEffectiveChainId(currentChainId);
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  const isForcing = isChainForcingEnabled();
  const isChainDifferent = currentChainId !== effectiveChainId;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-lg text-xs font-mono border border-gray-600 z-50">
      <div className="text-yellow-400 font-bold mb-2">🔧 Chain Force Debug</div>
      
      <div className="space-y-1">
        <div>
          <span className="text-gray-400">Current Chain:</span>{' '}
          <span className="text-blue-400">{getChainName(currentChainId)} ({currentChainId})</span>
        </div>
        
        <div>
          <span className="text-gray-400">Effective Chain:</span>{' '}
          <span className={isChainDifferent ? "text-green-400" : "text-blue-400"}>
            {getChainName(effectiveChainId)} ({effectiveChainId})
          </span>
        </div>
        
        <div>
          <span className="text-gray-400">Force Enabled:</span>{' '}
          <span className={isForcing ? "text-green-400" : "text-red-400"}>
            {isForcing ? 'YES' : 'NO'}
          </span>
        </div>
        
        {isChainDifferent && (
          <div className="text-green-400 font-bold mt-2">
            ✅ Chain forcing active!
          </div>
        )}
        
        <div className="text-xs text-gray-500 mt-2">
          ENV: NEXT_PUBLIC_FORCE_CHAIN_ID={process.env.NEXT_PUBLIC_FORCE_CHAIN_ID || 'not set'}
        </div>
      </div>
    </div>
  );
}
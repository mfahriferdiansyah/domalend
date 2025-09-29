import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useChainId } from 'wagmi';
import { toast } from 'sonner';
import { getEffectiveChainId, getChainName, isChainForcingEnabled } from '@/utils/chain-override';

interface UsePageChainForceResult {
  isChainCorrect: boolean;
  isCheckingChain: boolean;
  isSwitchingChain: boolean;
  targetChainId: number;
  currentChainId: number;
  effectiveChainId: number;
  forceChainSwitch: () => Promise<boolean>;
}

/**
 * Hook to handle page-level chain forcing
 * Checks and switches chain when page loads if chain forcing is enabled
 */
export function usePageChainForce(): UsePageChainForceResult {
  const { isConnected } = useAccount();
  const currentChainId = useChainId();
  const effectiveChainId = getEffectiveChainId(currentChainId);
  const [isCheckingChain, setIsCheckingChain] = useState(false);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  
  const isChainCorrect = currentChainId === effectiveChainId;
  const needsChainSwitch = isChainForcingEnabled() && !isChainCorrect;
  
  /**
   * Force switch to the target chain
   */
  const forceChainSwitch = async (): Promise<boolean> => {
    if (!needsChainSwitch) {
      return true; // Already on correct chain
    }
    
    if (!embeddedWallet) {
      toast.error('Embedded wallet not found. Please reconnect your wallet.');
      return false;
    }
    
    setIsSwitchingChain(true);
    try {
      const targetChain = getChainName(effectiveChainId);
      toast.info(`Switching to ${targetChain} for trading...`);
      
      await embeddedWallet.switchChain(effectiveChainId);
      
      toast.success(`Successfully switched to ${targetChain}`);
      return true;
      
    } catch (error: any) {
      console.error('Chain switch failed:', error);
      
      let errorMessage = 'Failed to switch network';
      if (error.message?.includes('not configured')) {
        errorMessage = `${getChainName(effectiveChainId)} is not configured`;
      } else if (error.message?.includes('rejected') || error.message?.includes('denied')) {
        errorMessage = 'Network switch cancelled by user';
      }
      
      toast.error(errorMessage);
      return false;
      
    } finally {
      setIsSwitchingChain(false);
    }
  };
  
  /**
   * Auto-check and switch chain on page load
   */
  useEffect(() => {
    const autoSwitchChain = async () => {
      if (!needsChainSwitch || !embeddedWallet) {
        return;
      }
      
      setIsCheckingChain(true);
      
      // Add a small delay to ensure wallet is fully connected
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show informational message about required chain
      const targetChain = getChainName(effectiveChainId);
      const currentChain = getChainName(currentChainId);
      
      console.log(`[PAGE_CHAIN_FORCE] Trading requires ${targetChain}, currently on ${currentChain}`);
      
      // Automatically switch chain
      await forceChainSwitch();
      
      setIsCheckingChain(false);
    };
    
    autoSwitchChain();
  }, [needsChainSwitch, embeddedWallet?.address]); // Only run when wallet or chain force requirement changes
  
  return {
    isChainCorrect,
    isCheckingChain,
    isSwitchingChain,
    targetChainId: effectiveChainId,
    currentChainId,
    effectiveChainId,
    forceChainSwitch,
  };
}
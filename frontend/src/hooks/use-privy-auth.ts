'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';

export function usePrivyAuth() {
  const { address, isConnected, isConnecting, status } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Helper function to connect wallet
  const connectWallet = () => {
    const injectedConnector = connectors.find(connector => connector.id === 'io.metamask');
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  // Helper function to login (same as connect for wallet-only auth)
  const login = connectWallet;

  // Helper function to logout (disconnect wallet)
  const logout = disconnect;

  return {
    // Core auth state
    ready: status !== 'connecting',
    authenticated: isConnected,
    login,
    logout,
    connectWallet,
    
    // Helper properties
    hasWallet: isConnected,
    walletAddress: address,
    hasSocialLogin: false, // No social login with wagmi only
    socialLoginMethod: undefined,
    displayName: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Anonymous',
    embeddedWallet: undefined,
    
    // Computed states
    isFullyAuthenticated: isConnected,
    needsWalletConnection: !isConnected,
    authenticationMethod: isConnected ? 'wallet' : 'none',
    
    // Removed Privy-specific methods
    linkWallet: () => {},
    unlinkWallet: () => {},
    exportWallet: () => {},
  };
}
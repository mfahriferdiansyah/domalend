'use client';

import React, { useState, useEffect } from 'react';
import { usePrivyAuth } from '@/hooks/use-privy-auth';
import { PrivyAuthButton } from './privy-auth-button';
import { ButtonConnectWallet } from '@/components/button-connect-wallet.tsx/button-connect-wallet';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';

interface AuthWrapperProps {
  children: React.ReactNode;
  requireWallet?: boolean;
}

export function AuthWrapper({ children, requireWallet = false }: AuthWrapperProps) {
  const { ready, authenticated, isFullyAuthenticated, needsWalletConnection } = usePrivyAuth();
  const [useTraditionalWallet, setUseTraditionalWallet] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're only rendering on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render until we're on the client and Privy is ready
  if (!isClient || !ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // If user is fully authenticated or doesn't need wallet, show children
  if (isFullyAuthenticated || (authenticated && !requireWallet)) {
    return <>{children}</>;
  }

  // Show authentication options
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6 p-4">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Welcome to GTX</h1>
        <p className="text-gray-400">
          {!authenticated 
            ? "Sign in to start trading"
            : needsWalletConnection
            ? "Connect your wallet to continue"
            : "Choose your authentication method"
          }
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        {/* Toggle between auth methods */}
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setUseTraditionalWallet(!useTraditionalWallet)}
            className="text-sm"
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Switch to {useTraditionalWallet ? 'Social Login' : 'Wallet Only'}
          </Button>
        </div>

        {/* Authentication component */}
        <div className="flex flex-col items-center space-y-4">
          {useTraditionalWallet ? (
            <div className="space-y-2 text-center">
              <p className="text-sm text-gray-400">Connect with your wallet</p>
              <ErrorBoundary>
                <ButtonConnectWallet />
              </ErrorBoundary>
            </div>
          ) : (
            <div className="space-y-2 text-center">
              <p className="text-sm text-gray-400">
                Sign in with social media or wallet
              </p>
              <ErrorBoundary>
                <PrivyAuthButton />
              </ErrorBoundary>
            </div>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-md text-center space-y-2">
        <h3 className="text-lg font-semibold">Why sign in?</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Trade perpetuals and spot markets</li>
          <li>• Access advanced trading features</li>
          <li>• Track your portfolio and history</li>
          <li>• Secure your funds with multi-factor auth</li>
        </ul>
      </div>
    </div>
  );
}
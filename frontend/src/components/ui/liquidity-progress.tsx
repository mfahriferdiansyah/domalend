import React from 'react';
import { TransactionProgress, TransactionStep, transactionSteps } from './transaction-progress';

interface LiquidityProgressProps {
  isOpen: boolean;
  onClose: () => void;
  steps: TransactionStep[];
  currentStepId?: string;
  isCompleted: boolean;
  error?: string;
  type: 'add' | 'remove';
}

export const LiquidityProgress: React.FC<LiquidityProgressProps> = ({ type, ...props }) => {
  const getConfig = () => {
    switch (type) {
      case 'add':
        return {
          title: 'Liquidity Addition',
          successMessage: '🎉 Liquidity added successfully! You are now earning interest on your contribution.',
          completedButtonText: 'View Pool',
          failedButtonText: 'Try Again'
        };
      case 'remove':
        return {
          title: 'Liquidity Removal',
          successMessage: '🎉 Liquidity removed successfully! Your USDC has been returned to your wallet.',
          completedButtonText: 'View Portfolio',
          failedButtonText: 'Try Again'
        };
      default:
        return {
          title: 'Liquidity Transaction',
          successMessage: '🎉 Transaction completed successfully!',
          completedButtonText: 'Close',
          failedButtonText: 'Try Again'
        };
    }
  };

  const config = getConfig();

  return (
    <TransactionProgress
      {...props}
      {...config}
    />
  );
};

// Predefined step configurations
export const liquiditySteps = {
  addLiquidity: transactionSteps.addLiquidity,
  removeLiquidity: transactionSteps.removeLiquidity
};
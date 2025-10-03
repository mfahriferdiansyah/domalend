import React from 'react';
import { TransactionProgress, TransactionStep, transactionSteps } from './transaction-progress';

// Legacy type exports for backward compatibility
export interface PoolCreationStep extends TransactionStep {}

interface PoolCreationProgressProps {
  isOpen: boolean;
  onClose: () => void;
  steps: PoolCreationStep[];
  currentStepId?: string;
  isCompleted: boolean;
  error?: string;
}

export const PoolCreationProgress: React.FC<PoolCreationProgressProps> = (props) => {
  return (
    <TransactionProgress
      {...props}
      title="Pool Creation"
      successMessage="🎉 Your liquidity pool has been created successfully! Users can now add liquidity and borrow against their domains."
      completedButtonText="View Pools"
      failedButtonText="Try Again"
    />
  );
};

// Legacy exports for backward compatibility
export const createPoolSteps = transactionSteps.createPool;
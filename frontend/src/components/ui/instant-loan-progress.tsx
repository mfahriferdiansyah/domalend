import React from 'react';
import { TransactionProgress, TransactionStep } from './transaction-progress';

// Types for instant loan progress
export interface InstantLoanStep extends TransactionStep {}

interface InstantLoanProgressProps {
  isOpen: boolean;
  onClose: () => void;
  steps: InstantLoanStep[];
  currentStepId?: string;
  isCompleted: boolean;
  error?: string;
}

export const InstantLoanProgress: React.FC<InstantLoanProgressProps> = (props) => {
  return (
    <TransactionProgress
      {...props}
      title="Instant Loan Request"
      successMessage="🎉 Your instant loan request has been submitted successfully! You should receive the funds shortly."
      completedButtonText="Close"
      failedButtonText="Try Again"
    />
  );
};
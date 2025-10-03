import React from 'react';
import { TransactionProgress, TransactionStep, transactionSteps } from './transaction-progress';

interface LoanProgressProps {
  isOpen: boolean;
  onClose: () => void;
  steps: TransactionStep[];
  currentStepId?: string;
  isCompleted: boolean;
  error?: string;
  type: 'create' | 'repay' | 'fund';
}

export const LoanProgress: React.FC<LoanProgressProps> = ({ type, ...props }) => {
  const getConfig = () => {
    switch (type) {
      case 'create':
        return {
          title: 'Loan Request Creation',
          successMessage: '🎉 Your loan request has been created successfully! Lenders can now fund your request.',
          completedButtonText: 'View Loan Requests',
          failedButtonText: 'Try Again'
        };
      case 'repay':
        return {
          title: 'Loan Repayment',
          successMessage: '🎉 Your loan has been repaid successfully! Your domain collateral is now unlocked.',
          completedButtonText: 'View Loans',
          failedButtonText: 'Try Again'
        };
      case 'fund':
        return {
          title: 'Loan Funding',
          successMessage: '🎉 Loan funded successfully! The borrower has received the funds.',
          completedButtonText: 'View Portfolio',
          failedButtonText: 'Try Again'
        };
      default:
        return {
          title: 'Loan Transaction',
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
export const loanSteps = {
  createLoanRequest: transactionSteps.createLoanRequest,
  repayLoan: transactionSteps.repayLoan,
  fundLoanRequest: transactionSteps.fundLoanRequest
};
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, Loader2, XCircle, ExternalLink } from 'lucide-react';

export interface TransactionStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  txHash?: string;
}

interface TransactionProgressProps {
  isOpen: boolean;
  onClose: () => void;
  steps: TransactionStep[];
  currentStepId?: string;
  isCompleted: boolean;
  error?: string;
  title?: string;
  successMessage?: string;
  completedButtonText?: string;
  failedButtonText?: string;
}

const StepIcon = ({ status }: { status: TransactionStep['status'] }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'in_progress':
      return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-600" />;
    default:
      return <Circle className="h-5 w-5 text-gray-300" />;
  }
};

const getStepTextColor = (status: TransactionStep['status']) => {
  switch (status) {
    case 'completed':
      return 'text-green-600';
    case 'in_progress':
      return 'text-blue-600';
    case 'failed':
      return 'text-red-600';
    default:
      return 'text-gray-500';
  }
};

const formatErrorMessage = (error: string): string => {
  // Handle common error patterns and make them more user-friendly
  
  // User rejected transaction
  if (error.toLowerCase().includes('user rejected') || error.toLowerCase().includes('user denied')) {
    return 'Transaction was cancelled by user.';
  }
  
  // Insufficient funds
  if (error.toLowerCase().includes('insufficient funds')) {
    return 'Insufficient funds to complete the transaction. Please check your wallet balance.';
  }
  
  // Insufficient allowance
  if (error.toLowerCase().includes('allowance') || error.toLowerCase().includes('approve')) {
    return 'Insufficient token allowance. Please approve the token spending first.';
  }
  
  // Network/RPC errors
  if (error.toLowerCase().includes('network') || error.toLowerCase().includes('rpc')) {
    return 'Network error occurred. Please check your connection and try again.';
  }
  
  // Contract revert errors - extract the revert reason if possible
  const revertMatch = error.match(/revert (.+?)(?:\n|$|\.)/i);
  if (revertMatch) {
    return `Contract error: ${revertMatch[1]}`;
  }
  
  // If error is too long (>200 chars), truncate and provide key parts
  if (error.length > 200) {
    // Try to extract the most important part
    const lines = error.split('\n');
    const firstLine = lines[0];
    
    // If first line is descriptive enough, use it
    if (firstLine.length > 50 && firstLine.length < 150) {
      return firstLine;
    }
    
    // Otherwise, truncate with ellipsis
    return error.substring(0, 180) + '...';
  }
  
  return error;
};

export const TransactionProgress: React.FC<TransactionProgressProps> = ({
  isOpen,
  onClose,
  steps,
  currentStepId,
  isCompleted,
  error,
  title = 'Transaction',
  successMessage = '🎉 Transaction completed successfully!',
  completedButtonText = 'Close',
  failedButtonText = 'Try Again'
}) => {
  const [showFullError, setShowFullError] = React.useState(false);
  const getExplorerUrl = (txHash: string) => {
    const explorerBaseUrl = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://etherscan.io';
    return `${explorerBaseUrl}/tx/${txHash}`;
  };

  const getDialogTitle = () => {
    if (isCompleted) {
      return (
        <>
          <CheckCircle className="h-5 w-5 text-green-600" />
          {title} Completed Successfully!
        </>
      );
    } else if (error) {
      return (
        <>
          <XCircle className="h-5 w-5 text-red-600" />
          {title} Failed
        </>
      );
    } else {
      return (
        <>
          <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
          Processing {title}...
        </>
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-w-[90vw] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getDialogTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => {
              const isCurrentStep = step.id === currentStepId;
              const isLastStep = index === steps.length - 1;

              return (
                <div key={step.id} className="relative">
                  {/* Connector Line */}
                  {!isLastStep && (
                    <div className="absolute left-2.5 top-8 w-0.5 h-8 bg-gray-200"></div>
                  )}
                  
                  {/* Step Content */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <StepIcon status={step.status} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium ${getStepTextColor(step.status)}`}>
                        {step.title}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {step.description}
                      </div>
                      
                      {/* Transaction Hash */}
                      {step.txHash && (
                        <div className="flex items-center gap-2 mt-2">
                          <a
                            href={getExplorerUrl(step.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            View Transaction
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="text-sm text-red-800">
                <strong>Error:</strong>
                <div className="mt-1 break-words overflow-wrap-anywhere">
                  {showFullError ? error : formatErrorMessage(error)}
                </div>
                {error.length > 200 && !showFullError && (
                  <button
                    onClick={() => setShowFullError(true)}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Show full error details
                  </button>
                )}
                {showFullError && (
                  <button
                    onClick={() => setShowFullError(false)}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Show less
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Success Message */}
          {isCompleted && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="text-sm text-green-800">
                {successMessage}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end pt-4">
            {isCompleted || error ? (
              <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
                {isCompleted ? completedButtonText : failedButtonText}
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={onClose}
                disabled={!error}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Predefined step configurations for different transaction types
export const transactionSteps = {
  // Pool Creation Steps
  createPool: {
    withApproval: [
      {
        id: 'checking_allowance',
        title: 'Checking USDC Allowance',
        description: 'Verifying your current USDC spending approval...',
        status: 'pending' as const
      },
      {
        id: 'simulating_approval',
        title: 'Simulating USDC Approval',
        description: 'Testing the approval transaction...',
        status: 'pending' as const
      },
      {
        id: 'approving_usdc',
        title: 'Approving USDC Spending',
        description: 'Please confirm the approval transaction in your wallet...',
        status: 'pending' as const
      },
      {
        id: 'simulating_pool_creation',
        title: 'Simulating Pool Creation',
        description: 'Testing the pool creation transaction...',
        status: 'pending' as const
      },
      {
        id: 'creating_pool',
        title: 'Creating Pool',
        description: 'Please confirm the pool creation transaction in your wallet...',
        status: 'pending' as const
      }
    ],
    withoutApproval: [
      {
        id: 'checking_allowance',
        title: 'Checking USDC Allowance',
        description: 'Verifying your current USDC spending approval...',
        status: 'pending' as const
      },
      {
        id: 'simulating_pool_creation',
        title: 'Simulating Pool Creation',
        description: 'Testing the pool creation transaction...',
        status: 'pending' as const
      },
      {
        id: 'creating_pool',
        title: 'Creating Pool',
        description: 'Please confirm the pool creation transaction in your wallet...',
        status: 'pending' as const
      }
    ]
  },

  // Loan Request Creation Steps
  createLoanRequest: [
    {
      id: 'simulating_loan_request',
      title: 'Simulating Loan Request',
      description: 'Testing the loan request creation transaction...',
      status: 'pending' as const
    },
    {
      id: 'creating_loan_request',
      title: 'Creating Loan Request',
      description: 'Please confirm the loan request creation in your wallet...',
      status: 'pending' as const
    }
  ],

  // Loan Repayment Steps
  repayLoan: {
    withApproval: [
      {
        id: 'checking_allowance',
        title: 'Checking USDC Allowance',
        description: 'Verifying your current USDC spending approval...',
        status: 'pending' as const
      },
      {
        id: 'simulating_approval',
        title: 'Simulating USDC Approval',
        description: 'Testing the approval transaction...',
        status: 'pending' as const
      },
      {
        id: 'approving_usdc',
        title: 'Approving USDC Spending',
        description: 'Please confirm the approval transaction in your wallet...',
        status: 'pending' as const
      },
      {
        id: 'simulating_repayment',
        title: 'Simulating Loan Repayment',
        description: 'Testing the repayment transaction...',
        status: 'pending' as const
      },
      {
        id: 'repaying_loan',
        title: 'Repaying Loan',
        description: 'Please confirm the loan repayment in your wallet...',
        status: 'pending' as const
      }
    ],
    withoutApproval: [
      {
        id: 'checking_allowance',
        title: 'Checking USDC Allowance',
        description: 'Verifying your current USDC spending approval...',
        status: 'pending' as const
      },
      {
        id: 'simulating_repayment',
        title: 'Simulating Loan Repayment',
        description: 'Testing the repayment transaction...',
        status: 'pending' as const
      },
      {
        id: 'repaying_loan',
        title: 'Repaying Loan',
        description: 'Please confirm the loan repayment in your wallet...',
        status: 'pending' as const
      }
    ]
  },

  // Liquidity Addition Steps
  addLiquidity: {
    withApproval: [
      {
        id: 'checking_allowance',
        title: 'Checking USDC Allowance',
        description: 'Verifying your current USDC spending approval...',
        status: 'pending' as const
      },
      {
        id: 'simulating_approval',
        title: 'Simulating USDC Approval',
        description: 'Testing the approval transaction...',
        status: 'pending' as const
      },
      {
        id: 'approving_usdc',
        title: 'Approving USDC Spending',
        description: 'Please confirm the approval transaction in your wallet...',
        status: 'pending' as const
      },
      {
        id: 'simulating_liquidity_addition',
        title: 'Simulating Liquidity Addition',
        description: 'Testing the liquidity addition transaction...',
        status: 'pending' as const
      },
      {
        id: 'adding_liquidity',
        title: 'Adding Liquidity',
        description: 'Please confirm the liquidity addition in your wallet...',
        status: 'pending' as const
      }
    ],
    withoutApproval: [
      {
        id: 'checking_allowance',
        title: 'Checking USDC Allowance',
        description: 'Verifying your current USDC spending approval...',
        status: 'pending' as const
      },
      {
        id: 'simulating_liquidity_addition',
        title: 'Simulating Liquidity Addition',
        description: 'Testing the liquidity addition transaction...',
        status: 'pending' as const
      },
      {
        id: 'adding_liquidity',
        title: 'Adding Liquidity',
        description: 'Please confirm the liquidity addition in your wallet...',
        status: 'pending' as const
      }
    ]
  },

  // Liquidity Removal Steps
  removeLiquidity: [
    {
      id: 'simulating_liquidity_removal',
      title: 'Simulating Liquidity Removal',
      description: 'Testing the liquidity removal transaction...',
      status: 'pending' as const
    },
    {
      id: 'removing_liquidity',
      title: 'Removing Liquidity',
      description: 'Please confirm the liquidity removal in your wallet...',
      status: 'pending' as const
    }
  ],

  // Loan Funding Steps
  fundLoanRequest: {
    withApproval: [
      {
        id: 'checking_allowance',
        title: 'Checking USDC Allowance',
        description: 'Verifying your current USDC spending approval...',
        status: 'pending' as const
      },
      {
        id: 'simulating_approval',
        title: 'Simulating USDC Approval',
        description: 'Testing the approval transaction...',
        status: 'pending' as const
      },
      {
        id: 'approving_usdc',
        title: 'Approving USDC Spending',
        description: 'Please confirm the approval transaction in your wallet...',
        status: 'pending' as const
      },
      {
        id: 'simulating_loan_funding',
        title: 'Simulating Loan Funding',
        description: 'Testing the loan funding transaction...',
        status: 'pending' as const
      },
      {
        id: 'funding_loan',
        title: 'Funding Loan',
        description: 'Please confirm the loan funding in your wallet...',
        status: 'pending' as const
      }
    ],
    withoutApproval: [
      {
        id: 'checking_allowance',
        title: 'Checking USDC Allowance',
        description: 'Verifying your current USDC spending approval...',
        status: 'pending' as const
      },
      {
        id: 'simulating_loan_funding',
        title: 'Simulating Loan Funding',
        description: 'Testing the loan funding transaction...',
        status: 'pending' as const
      },
      {
        id: 'funding_loan',
        title: 'Funding Loan',
        description: 'Please confirm the loan funding in your wallet...',
        status: 'pending' as const
      }
    ]
  },

  // Domain Scoring Steps
  domainScoring: {
    withApproval: [
      {
        id: 'checking_allowance',
        title: 'Checking USDC Allowance',
        description: 'Verifying your current USDC spending approval for scoring fee...',
        status: 'pending' as const
      },
      {
        id: 'simulating_approval',
        title: 'Simulating USDC Approval',
        description: 'Testing the approval transaction...',
        status: 'pending' as const
      },
      {
        id: 'approving_usdc',
        title: 'Approving USDC Spending',
        description: 'Please confirm the approval transaction in your wallet...',
        status: 'pending' as const
      },
      {
        id: 'simulating_scoring',
        title: 'Simulating Domain Scoring Request',
        description: 'Testing the scoring request transaction...',
        status: 'pending' as const
      },
      {
        id: 'requesting_scoring',
        title: 'Requesting Domain Scoring',
        description: 'Please confirm the scoring request in your wallet...',
        status: 'pending' as const
      }
    ],
    withoutApproval: [
      {
        id: 'checking_allowance',
        title: 'Checking USDC Allowance',
        description: 'Verifying your current USDC spending approval for scoring fee...',
        status: 'pending' as const
      },
      {
        id: 'simulating_scoring',
        title: 'Simulating Domain Scoring Request',
        description: 'Testing the scoring request transaction...',
        status: 'pending' as const
      },
      {
        id: 'requesting_scoring',
        title: 'Requesting Domain Scoring',
        description: 'Please confirm the scoring request in your wallet...',
        status: 'pending' as const
      }
    ]
  }
};
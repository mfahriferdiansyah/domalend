import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@heroui/react';
import { AlertCircle, ArrowLeft, Globe, Info, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';
import { useUserDomains } from '@/hooks/useDomaLendApi';
import { ApiErrorState } from '@/components/common/api-error-boundary';
import { GridLoadingState } from '@/components/common/api-loading-state';
import { useDomaLend, useUSDCAllowance, useUSDCBalance, TransactionProgress, useDomainScore } from '@/hooks/web3/domalend/useDomaLend';
import { TransactionStep, transactionSteps, TransactionProgress as TransactionProgressComponent } from '@/components/ui/transaction-progress';
import { formatUSDC } from '@/utils/formatting';

interface DomainNFT {
  tokenId: string;
  owner: string;
  name: string;
  description: string;
  image: string;
  externalUrl: string;
  attributes: Array<{
    trait_type: string;
    value: string;
    display_type?: string;
  }>;
  expirationDate: number;
  tld: string;
  characterLength: number;
  registrar: string;
  analytics?: {
    domainTokenId: string;
    domainName: string;
    latestAiScore: number;
    totalScoringRequests: number;
    totalLoansCreated: number;
    totalLoanVolume: string;
    hasBeenLiquidated: boolean;
    firstScoreTimestamp: string;
    lastActivityTimestamp: string;
  };
}

interface UserDomainsResponse {
  address: string;
  balance: number;
  ownedNFTs: DomainNFT[];
  note: string;
}

const AddDomainPage: NextPage = () => {
  const router = useRouter();
  const [selectedDomain, setSelectedDomain] = useState<DomainNFT | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  const { address, isConnected } = useAccount();
  const { data: userDomainsData, loading: isLoading, error, refresh } = useUserDomains(address);
  const { requestDomainScoring, isLoading: isSubmittingScore, error: scoreError, contracts } = useDomaLend();
  
  // USDC related hooks for scoring fee
  const { allowance: usdcAllowance } = useUSDCAllowance(address, contracts.AI_ORACLE);
  const { balance: usdcBalance } = useUSDCBalance(address);
  
  // Progress dialog states
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [progressSteps, setProgressSteps] = useState<TransactionStep[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [progressError, setProgressError] = useState<string>('');
  
  // Scoring fee is $1 USDC (1 * 10^6 due to 6 decimals)
  const SCORING_FEE = 1000000;

  const userDomains = userDomainsData?.ownedNFTs || [];

  const handleDomainSelect = (domain: DomainNFT) => {
    setSelectedDomain(domain);
  };

  const handleChooseClick = () => {
    if (selectedDomain) {
      setStep('confirm');
    }
  };

  // Helper functions for progress steps
  const initializeScoringSteps = (requiresApproval: boolean): TransactionStep[] => {
    return requiresApproval 
      ? [...transactionSteps.domainScoring.withApproval]
      : [...transactionSteps.domainScoring.withoutApproval];
  };

  const updateScoringStep = (stepId: string, status: TransactionStep['status'], txHash?: string) => {
    setProgressSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, txHash }
        : step
    ));
  };

  const handleScoringProgress = (progress: TransactionProgress) => {
    setCurrentStep(progress.step);
    
    // After checking allowance, adjust steps if no approval is needed
    if (progress.step === 'checking_allowance' && !progress.txHash) {
      if (progress.message.includes('sufficient')) {
        const stepsWithoutApproval = initializeScoringSteps(false);
        stepsWithoutApproval[0].status = 'completed';
        setProgressSteps(stepsWithoutApproval);
        return;
      }
    }
    
    // Update current step to in_progress
    updateScoringStep(progress.step, 'in_progress');
    
    // If there's a transaction hash, mark as completed
    if (progress.txHash) {
      updateScoringStep(progress.step, 'completed', progress.txHash);
    }
  };

  const handleConfirmSubmit = async () => {
    if (!selectedDomain || !address) {
      toast.error('Please select a domain and connect your wallet');
      return;
    }

    // Check balance first
    if (Number(usdcBalance || 0) < SCORING_FEE) {
      toast.error('Insufficient USDC balance. You need at least $1.00 USDC to submit a domain for scoring.');
      return;
    }

    try {
      // Open progress dialog
      setIsProgressOpen(true);
      setIsCompleted(false);
      setProgressError('');
      
      // Initialize with default steps (will be updated based on approval needs)
      const initialSteps = initializeScoringSteps(true); // Start with approval assumption
      setProgressSteps(initialSteps);

      // For now, use the existing hook without progress callback until we update it
      const result = await requestDomainScoring(selectedDomain.tokenId);
      
      if (result.success) {
        // Mark all remaining steps as completed
        setProgressSteps(prev => prev.map(step => 
          step.status === 'pending' || step.status === 'in_progress' 
            ? { ...step, status: 'completed' }
            : step
        ));
        
        setIsCompleted(true);
        toast.success('Domain scoring request submitted successfully!');
        
        // Navigate to domains page after a delay
        setTimeout(() => {
          router.push('/domains');
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to submit domain score');
      }
    } catch (error: any) {
      console.error('Error submitting domain score:', error);
      setProgressError(error.message || 'Failed to submit domain score. Please try again.');
      
      // Mark current step as failed
      if (currentStep) {
        updateScoringStep(currentStep, 'failed');
      }
    }
  };

  const formatExpirationDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // Component to display domain score
  const DomainScoreDisplay: React.FC<{ 
    tokenId: string; 
    analytics?: {
      latestAiScore: number;
      firstScoreTimestamp: string;
      totalScoringRequests: number;
    }
  }> = ({ tokenId, analytics }) => {
    const { score, timestamp, isLoading } = useDomainScore(tokenId);
    
    // Use analytics data if available, otherwise fall back to smart contract call
    const finalScore = analytics?.latestAiScore || score;
    const finalTimestamp = analytics?.firstScoreTimestamp ? 
      parseInt(analytics.firstScoreTimestamp) / 1000 : timestamp;
    const hasScore = analytics ? analytics.latestAiScore > 0 : (score > 0 && timestamp > 0);
    
    if (!analytics && isLoading) {
      return <span className="text-xs text-gray-400">Loading score...</span>;
    }
    
    if (!hasScore) {
      return <span className="text-xs text-gray-400">Not scored</span>;
    }
    
    // Color based on score range
    const getScoreColor = (score: number) => {
      if (score >= 80) return 'text-green-600';
      if (score >= 60) return 'text-yellow-600';
      if (score >= 40) return 'text-orange-600';
      return 'text-red-600';
    };
    
    return (
      <div className="text-right">
        <div className={`text-xs font-medium ${getScoreColor(finalScore)}`}>
          Score: {finalScore}/100
        </div>
        <div className="text-xs text-gray-400">
          {new Date(finalTimestamp * 1000).toLocaleDateString()}
        </div>
        {analytics && analytics.totalScoringRequests > 1 && (
          <div className="text-xs text-gray-400">
            Scored {analytics.totalScoringRequests}x
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/domains" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Domains
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit Domain Score</h1>
        <p className="text-gray-600">Select a domain from your wallet to submit for scoring</p>
      </div>

      {/* Connection Warning */}
      {!isConnected && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Please connect your wallet to view and submit your domains
          </AlertDescription>
        </Alert>
      )}

      {/* Domain Selection */}
      {step === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Your Domains
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <ApiErrorState 
                error={error} 
                onRetry={refresh}
                fullHeight={false}
              />
            ) : isLoading ? (
              <GridLoadingState items={3} columns={1} className="py-4" />
            ) : userDomains.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No domains found</h3>
                <p className="text-gray-500">You don&apos;t have any domains in your wallet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Select a domain to submit for scoring. Previously scored domains will show their current score.
                </p>
                {userDomains.map((domain: DomainNFT) => (
                  <div
                    key={domain.tokenId}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedDomain?.tokenId === domain.tokenId
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => handleDomainSelect(domain)}
                  >
                    <div className="flex items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg text-gray-900">{domain.name}</h3>
                          {selectedDomain?.tokenId === domain.tokenId && (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{domain.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>TLD: .{domain.tld}</span>
                          <span>Length: {domain.characterLength} chars</span>
                          <span>Expires: {formatExpirationDate(domain.expirationDate)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-400">Registrar: {domain.registrar}</p>
                          <DomainScoreDisplay 
                            tokenId={domain.tokenId} 
                            analytics={domain.analytics} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-4 pt-4 mt-6 border-t">
              <Button
                type="button"
                onClick={handleChooseClick}
                disabled={!selectedDomain}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
              >
                Choose
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Step */}
      {step === 'confirm' && selectedDomain && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Confirm Domain Submission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white border border-blue-400 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Selected Domain</h3>
              <div className="flex items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-lg text-gray-900">{selectedDomain.name}</h4>
                  <p className="text-sm text-gray-700 mt-1">{selectedDomain.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                    <span>TLD: .{selectedDomain.tld}</span>
                    <span>Length: {selectedDomain.characterLength} chars</span>
                    <span>Expires: {formatExpirationDate(selectedDomain.expirationDate)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Token ID: {selectedDomain.tokenId}</p>
                </div>
              </div>
            </div>

            {/* Fee Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-800">
                    Domain scoring requires a fee of <span className="font-semibold">$1.00 USDC</span> to cover AI Oracle processing costs.
                  </p>
                </div>
              </div>
            </div>

            {/* Insufficient Balance Warning */}
            {address && Number(usdcBalance || 0) < SCORING_FEE && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  Insufficient USDC balance. You need at least $1.00 USDC to submit a domain for scoring.
                </AlertDescription>
              </Alert>
            )}

            {scoreError && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  Smart contract error: {scoreError}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('select')}
                className="flex-1"
              >
                Back to Selection
              </Button>
              <Button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting || isSubmittingScore || (Number(usdcBalance || 0) < SCORING_FEE)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
              >
                {(isSubmitting || isSubmittingScore) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {(isSubmitting || isSubmittingScore) ? 'Submitting...' : 'Submit Domain Score'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Domain Scoring Progress Dialog */}
      <TransactionProgressComponent
        isOpen={isProgressOpen}
        onClose={() => {
          setIsProgressOpen(false);
          setProgressSteps([]);
          setCurrentStep('');
          setIsCompleted(false);
          setProgressError('');
        }}
        steps={progressSteps}
        currentStepId={currentStep}
        isCompleted={isCompleted}
        error={progressError}
        title="Domain Scoring"
        successMessage="🎉 Domain scoring request submitted successfully! The AI Oracle will process your domain within 24 hours."
        completedButtonText="Go to Domains"
        failedButtonText="Try Again"
      />
      </div>
    </div>
  );
};

export default AddDomainPage;
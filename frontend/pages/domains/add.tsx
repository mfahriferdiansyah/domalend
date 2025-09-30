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
import { useDomaLend } from '@/hooks/web3/domalend/useDomaLend';

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
  const { requestDomainScoring, isLoading: isSubmittingScore, error: scoreError } = useDomaLend();

  const userDomains = userDomainsData?.ownedNFTs || [];

  const handleDomainSelect = (domain: DomainNFT) => {
    setSelectedDomain(domain);
    setStep('confirm');
  };

  const handleConfirmSubmit = async () => {
    if (!selectedDomain) {
      toast.error('Please select a domain');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await requestDomainScoring(selectedDomain.tokenId);
      
      if (result.success) {
        toast.success(`Domain scoring request submitted! Transaction hash: ${result.hash}`);
        router.push('/domains');
      } else {
        throw new Error(result.error || 'Failed to submit domain score');
      }
    } catch (error) {
      console.error('Error submitting domain score:', error);
      toast.error('Failed to submit domain score. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatExpirationDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
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
                  Select a domain to submit for scoring:
                </p>
                {userDomains.map((domain: DomainNFT) => (
                  <div
                    key={domain.tokenId}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleDomainSelect(domain)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">{domain.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{domain.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>TLD: .{domain.tld}</span>
                          <span>Length: {domain.characterLength} chars</span>
                          <span>Expires: {formatExpirationDate(domain.expirationDate)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Registrar: {domain.registrar}</p>
                      </div>
                      <div className="ml-4">
                        <img 
                          src={domain.image} 
                          alt={domain.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-4 pt-4 mt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/domains')}
                className="flex-1"
              >
                Cancel
              </Button>
              {userDomains.length > 0 && (
                <Button
                  type="button"
                  onClick={refresh}
                  disabled={isLoading}
                  variant="outline"
                >
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Refresh
                </Button>
              )}
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Selected Domain</h3>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-lg text-blue-800">{selectedDomain.name}</h4>
                  <p className="text-sm text-blue-700 mt-1">{selectedDomain.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-blue-600">
                    <span>TLD: .{selectedDomain.tld}</span>
                    <span>Length: {selectedDomain.characterLength} chars</span>
                    <span>Expires: {formatExpirationDate(selectedDomain.expirationDate)}</span>
                  </div>
                  <p className="text-xs text-blue-500 mt-1">Token ID: {selectedDomain.tokenId}</p>
                </div>
                <div className="ml-4">
                  <img 
                    src={selectedDomain.image} 
                    alt={selectedDomain.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                </div>
              </div>
            </div>

            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertDescription>
                By submitting this domain, you are requesting a score evaluation. This action will create a blockchain transaction to request scoring from the AI Oracle smart contract.
              </AlertDescription>
            </Alert>

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
                disabled={isSubmitting || isSubmittingScore}
                className="flex-1"
              >
                {(isSubmitting || isSubmittingScore) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {(isSubmitting || isSubmittingScore) ? 'Submitting...' : 'Submit Domain Score'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AddDomainPage;
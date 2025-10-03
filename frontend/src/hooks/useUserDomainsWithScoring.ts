import { useState, useEffect } from 'react';
import { useActiveLoans } from './useActiveLoans';

interface ScoringEvent {
  id: string;
  domainTokenId: string;
  domainName: string;
  requesterAddress: string;
  aiScore: number;
  confidence: number;
  reasoning: string;
  requestTimestamp: string;
  status: string;
}

interface DomainAnalytics {
  domainTokenId: string;
  domainName: string;
  latestAiScore: number;
  totalScoringRequests: number;
  totalLoansCreated: number;
  totalLoanVolume: string;
  hasBeenLiquidated: boolean;
  firstScoreTimestamp: string;
  lastActivityTimestamp: string;
}

interface DomainWithScoring {
  tokenId: string;
  owner: string;
  name: string;
  description: string;
  image: string;
  externalUrl: string;
  attributes: any[];
  expirationDate: number;
  tld: string;
  characterLength: number;
  registrar: string;
  analytics?: DomainAnalytics;
  scoringHistory?: ScoringEvent[];
}

interface UserDomainsWithScoringResponse {
  address: string;
  balance: number;
  ownedNFTs: DomainWithScoring[];
  note: string;
}

export const useUserDomainsWithScoring = (address: string | undefined) => {
  const [userDomains, setUserDomains] = useState<DomainWithScoring[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { isDomainUsedAsCollateral, loading: loansLoading } = useActiveLoans();

  const fetchUserDomainsWithScoring = async () => {
    if (!address) {
      setUserDomains([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // First, get all user domains with analytics
      const response = await fetch(`http://localhost:3001/domains/address/${address}?includeAnalytics=true`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: UserDomainsWithScoringResponse = await response.json();
      
      if (!result.ownedNFTs) {
        setUserDomains([]);
        return;
      }

      // For domains that have analytics, fetch detailed scoring history
      const domainsWithDetailedScoring = await Promise.all(
        result.ownedNFTs.map(async (domain) => {
          // If the domain has analytics, fetch detailed scoring history
          if (domain.analytics) {
            try {
              const detailResponse = await fetch(
                `http://localhost:3001/domains/${domain.tokenId}?includeRelations=true`
              );
              
              if (detailResponse.ok) {
                const detailResult = await detailResponse.json();
                return {
                  ...domain,
                  scoringHistory: detailResult.domain?.scoringHistory || []
                };
              }
            } catch (error) {
              console.warn(`Failed to fetch scoring history for domain ${domain.name}:`, error);
            }
          }
          
          return {
            ...domain,
            scoringHistory: []
          };
        })
      );

      setUserDomains(domainsWithDetailedScoring);
    } catch (err) {
      console.error('Error fetching user domains with scoring:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user domains');
      setUserDomains([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDomainsWithScoring();
  }, [address]);

  // Filter domains that are eligible for instant loans
  const getEligibleDomainsForLoan = (): DomainWithScoring[] => {
    return userDomains.filter((domain) => {
      // 1. Must have analytics (meaning it has been processed)
      if (!domain.analytics) {
        return false;
      }

      // 2. Must have actual scoring events (not just analytics entry)
      if (!domain.scoringHistory || domain.scoringHistory.length === 0) {
        return false;
      }

      // 3. Must have at least one completed scoring event
      const hasCompletedScoring = domain.scoringHistory.some(
        (event) => event.status === 'completed'
      );
      if (!hasCompletedScoring) {
        return false;
      }

      // 4. Must have a valid AI score (greater than 0)
      if (!domain.analytics.latestAiScore || domain.analytics.latestAiScore <= 0) {
        return false;
      }

      // 5. Must not be currently used as collateral
      if (isDomainUsedAsCollateral(domain.tokenId)) {
        return false;
      }

      // 6. Must not have been liquidated
      if (domain.analytics.hasBeenLiquidated) {
        return false;
      }

      return true;
    });
  };

  // Get scoring status for all domains
  const getDomainScoringStatus = () => {
    return userDomains.map((domain) => ({
      tokenId: domain.tokenId,
      name: domain.name,
      hasAnalytics: !!domain.analytics,
      hasScoringEvents: domain.scoringHistory && domain.scoringHistory.length > 0,
      hasCompletedScoring: domain.scoringHistory?.some(event => event.status === 'completed') || false,
      isUsedAsCollateral: isDomainUsedAsCollateral(domain.tokenId),
      isLiquidated: domain.analytics?.hasBeenLiquidated || false,
      latestScore: domain.analytics?.latestAiScore || 0,
      eligible: getEligibleDomainsForLoan().some(eligible => eligible.tokenId === domain.tokenId)
    }));
  };

  return {
    userDomains,
    eligibleDomains: getEligibleDomainsForLoan(),
    domainScoringStatus: getDomainScoringStatus(),
    loading: loading || loansLoading,
    error,
    refresh: fetchUserDomainsWithScoring,
  };
};
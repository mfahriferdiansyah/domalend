import { useState, useEffect } from 'react';

interface ActiveLoan {
  id: string;
  domainTokenId: string;
  domainName: string;
  status: string;
}

interface ActiveLoansResponse {
  data: {
    loans: {
      items: ActiveLoan[];
    };
  };
}

export const useActiveLoans = () => {
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveLoans = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://indexer-doma.kadzu.dev/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetActiveLoans {
              loans(where: { status: "active" }) {
                items {
                  id
                  domainTokenId
                  domainName
                  status
                }
              }
            }
          `,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ActiveLoansResponse = await response.json();
      
      if (result.data?.loans?.items) {
        setActiveLoans(result.data.loans.items);
      } else {
        setActiveLoans([]);
      }
    } catch (err) {
      console.error('Error fetching active loans:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch active loans');
      setActiveLoans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveLoans();
  }, []);

  // Helper function to check if a domain is being used as collateral
  const isDomainUsedAsCollateral = (domainTokenId: string): boolean => {
    return activeLoans.some(loan => loan.domainTokenId === domainTokenId);
  };

  // Get all token IDs currently used as collateral
  const getUsedCollateralTokenIds = (): string[] => {
    return activeLoans.map(loan => loan.domainTokenId);
  };

  return {
    activeLoans,
    loading,
    error,
    refresh: fetchActiveLoans,
    isDomainUsedAsCollateral,
    getUsedCollateralTokenIds,
  };
};
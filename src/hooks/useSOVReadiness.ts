import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SOVReadiness {
  isReady: boolean;
  pendingContracts: number;
  loading: boolean;
  message: string;
}

interface Contract {
  id: string;
  contract_sum: number | null;
  trade: string | null;
  to_org_id: string | null;
  from_org_id: string | null;
}

interface SOV {
  id: string;
  contract_id: string | null;
}

export function useSOVReadiness(
  projectId: string | undefined,
  userOrgId: string | undefined,
  isProjectCreator: boolean = false
): SOVReadiness & { refetch: () => void } {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [sovs, setSovs] = useState<SOV[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [contractsResult, sovsResult] = await Promise.all([
        supabase
          .from('project_contracts')
          .select('id, contract_sum, trade, to_org_id, from_org_id')
          .eq('project_id', projectId),
        supabase
          .from('project_sov')
          .select('id, contract_id, is_locked')
          .eq('project_id', projectId),
      ]);

      setContracts((contractsResult.data || []) as Contract[]);
      setSovs((sovsResult.data || []) as SOV[]);
    } catch (error) {
      console.error('Error fetching SOV readiness data:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute readiness status - only check if SOVs EXIST for primary contracts
  const readiness = useMemo((): SOVReadiness => {
    if (loading) {
      return {
        isReady: false,
        pendingContracts: 0,
        loading: true,
        message: 'Checking SOV status...'
      };
    }

    // Filter to primary contracts only (exclude Work Order trades) with contract_sum > 0
    // Payer (to_org_id) manages SOVs, but project creator can manage all
    const isWorkOrderContract = (c: Contract) =>
      c.trade === 'Work Order' || c.trade === 'Work Order Labor';

    const primaryContracts = contracts.filter(
      c => (c.contract_sum || 0) > 0 && 
           !isWorkOrderContract(c) &&
           (!userOrgId || (isProjectCreator ? (c.from_org_id === userOrgId || c.to_org_id === userOrgId) : c.to_org_id === userOrgId))
    );

    // Edge case: No primary contracts with value - SOV is ready (nothing to configure)
    if (primaryContracts.length === 0) {
      return {
        isReady: true,
        pendingContracts: 0,
        loading: false,
        message: 'No contracts require SOV setup.'
      };
    }

    // Check which contracts have LOCKED SOVs
    const contractsWithLockedSOVs = new Set(
      sovs.filter(s => (s as any).is_locked === true).map(s => s.contract_id).filter(Boolean)
    );
    const contractsWithoutLockedSOVs = primaryContracts.filter(c => !contractsWithLockedSOVs.has(c.id));
    const pendingContracts = contractsWithoutLockedSOVs.length;

    // Ready if all primary contracts have locked SOVs
    const isReady = pendingContracts === 0;

    // Generate message
    let message = '';
    if (isReady) {
      message = 'All SOVs are locked and ready.';
    } else {
      message = `Lock SOVs for ${pendingContracts} contract${pendingContracts > 1 ? 's' : ''} before creating invoices.`;
    }

    return {
      isReady,
      pendingContracts,
      loading: false,
      message
    };
  }, [contracts, sovs, loading]);

  return {
    ...readiness,
    refetch: fetchData
  };
}

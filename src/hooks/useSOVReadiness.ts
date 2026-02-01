import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SOVReadiness {
  isReady: boolean;
  pendingContracts: number;
  unlockedSOVs: number;
  loading: boolean;
  message: string;
}

interface Contract {
  id: string;
  contract_sum: number | null;
  trade: string | null;
}

interface SOV {
  id: string;
  contract_id: string | null;
  is_locked: boolean;
}

export function useSOVReadiness(projectId: string | undefined): SOVReadiness {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [sovs, setSovs] = useState<SOV[]>([]);
  const [loading, setLoading] = useState(true);

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
          .select('id, contract_sum, trade')
          .eq('project_id', projectId),
        supabase
          .from('project_sov')
          .select('id, contract_id, is_locked')
          .eq('project_id', projectId)
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

  // Compute readiness status
  const readiness = useMemo((): SOVReadiness => {
    if (loading) {
      return {
        isReady: false,
        pendingContracts: 0,
        unlockedSOVs: 0,
        loading: true,
        message: 'Checking SOV status...'
      };
    }

    // Filter to primary contracts only (exclude Work Order trades) with contract_sum > 0
    const isWorkOrderContract = (c: Contract) =>
      c.trade === 'Work Order' || c.trade === 'Work Order Labor';

    const primaryContracts = contracts.filter(
      c => (c.contract_sum || 0) > 0 && !isWorkOrderContract(c)
    );

    // Edge case: No primary contracts with value - SOV is ready (nothing to configure)
    if (primaryContracts.length === 0) {
      return {
        isReady: true,
        pendingContracts: 0,
        unlockedSOVs: 0,
        loading: false,
        message: 'No contracts require SOV setup.'
      };
    }

    // Check which contracts have SOVs
    const contractsWithSOVs = new Set(sovs.map(s => s.contract_id).filter(Boolean));
    const contractsWithoutSOVs = primaryContracts.filter(c => !contractsWithSOVs.has(c.id));

    // Check which SOVs are unlocked
    const unlockedSOVs = sovs.filter(
      s => !s.is_locked && primaryContracts.some(c => c.id === s.contract_id)
    );

    const pendingContracts = contractsWithoutSOVs.length;
    const unlockedCount = unlockedSOVs.length;

    // Determine readiness
    const isReady = pendingContracts === 0 && unlockedCount === 0;

    // Generate message
    let message = '';
    if (isReady) {
      message = 'All SOVs are created and locked.';
    } else if (pendingContracts > 0 && unlockedCount > 0) {
      message = `${pendingContracts} contract${pendingContracts > 1 ? 's need' : ' needs'} SOV setup, ${unlockedCount} SOV${unlockedCount > 1 ? 's need' : ' needs'} to be locked.`;
    } else if (pendingContracts > 0) {
      message = `Create and lock SOVs for ${pendingContracts} contract${pendingContracts > 1 ? 's' : ''} before creating work orders.`;
    } else if (unlockedCount > 0) {
      message = `Lock ${unlockedCount} SOV${unlockedCount > 1 ? 's' : ''} to 100% before creating work orders.`;
    }

    return {
      isReady,
      pendingContracts,
      unlockedSOVs: unlockedCount,
      loading: false,
      message
    };
  }, [contracts, sovs, loading]);

  return readiness;
}

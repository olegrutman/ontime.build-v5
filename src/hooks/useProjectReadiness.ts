import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReadinessItem {
  key: string;
  label: string;
  complete: boolean;
  informational?: boolean;
}

export interface ProjectReadiness {
  percent: number;
  checklist: ReadinessItem[];
  loading: boolean;
  recalculate: () => void;
  firstContractId: string | null;
}

export function useProjectReadiness(projectId: string | undefined): ProjectReadiness {
  const [checklist, setChecklist] = useState<ReadinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstContractId, setFirstContractId] = useState<string | null>(null);

  const calculate = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);

    try {
      // Parallel queries
      const [
        contractsRes,
        sovRes,
        participantsRes,
      ] = await Promise.all([
        supabase.from('project_contracts').select('id, contract_sum, material_responsibility, retainage_percent, status').eq('project_id', projectId),
        supabase.from('project_sov').select('id').eq('project_id', projectId),
        supabase.from('project_participants').select('id, role, invite_status, organizations:organization_id(name)').eq('project_id', projectId),
      ]);

      const contracts = contractsRes.data || [];
      const sovs = sovRes.data || [];
      const participants = participantsRes.data || [];

      setFirstContractId(contracts.length > 0 ? contracts[0].id : null);

      // 1. Organization exists (always true)
      const orgExists = true;

      // 2. Contract sum entered
      const hasContractSum = contracts.some(c => c.contract_sum != null && c.contract_sum > 0);

      // 3. SOV created
      const hasSov = sovs.length > 0;

      // 4. Required team members invited (>1 participant)
      const hasTeam = participants.length > 1;

      const pendingOrgs = participants
        .filter(p => p.invite_status !== 'ACCEPTED')
        .map(p => (p as any).organizations?.name)
        .filter(Boolean);
      const allAccepted = participants.length > 1 && pendingOrgs.length === 0;
      const acceptedLabel = allAccepted
        ? 'All invites accepted'
        : pendingOrgs.length > 0
          ? `Awaiting: ${pendingOrgs.join(', ')}`
          : 'All invites accepted';

      // 6. Material responsibility selected
      const hasMaterialResp = contracts.some(c => c.material_responsibility != null && c.material_responsibility !== '');

      // 7. Supplier assigned if materials required
      const hasSupplier = !hasMaterialResp || participants.some(p => p.role === 'SUPPLIER');

      // 8. Retainage defined
      const hasRetainage = contracts.some(c => c.retainage_percent != null && c.retainage_percent > 0);

      // 9. Contract mode selected (at least one Active contract)
      const hasActiveContract = contracts.some(c => c.status === 'Active');

      const items: ReadinessItem[] = [
        { key: 'org', label: 'Organization exists', complete: orgExists },
        { key: 'contract_sum', label: 'Contract sum entered', complete: hasContractSum },
        { key: 'sov', label: 'Schedule of Values created', complete: hasSov },
        { key: 'team', label: 'Team members invited', complete: hasTeam },
        { key: 'accepted', label: acceptedLabel, complete: allAccepted },
        { key: 'material_resp', label: 'Material responsibility selected', complete: hasMaterialResp },
        { key: 'supplier', label: 'Supplier assigned', complete: hasSupplier },
        { key: 'retainage', label: 'Retainage defined', complete: hasRetainage },
        { key: 'active_contract', label: 'Contract mode selected', complete: hasActiveContract },
      ];


      setChecklist(items);
    } catch (err) {
      console.error('Error calculating readiness:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { calculate(); }, [calculate]);

  const blocking = checklist.filter(i => !i.informational);
  const completedCount = blocking.filter(i => i.complete).length;
  const percent = blocking.length > 0 ? Math.round((completedCount / blocking.length) * 100) : 0;

  return { percent, checklist, loading, recalculate: calculate, firstContractId };
}

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { DT } from '@/lib/design-tokens';
import { CheckCircle2, Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ContractSOVEditor } from '@/components/sov';
import { Skeleton } from '@/components/ui/skeleton';

interface PhaseSOVProps {
  projectId: string;
  onComplete: () => void;
  onStepChange?: (step: string) => void;
}

export function PhaseSOV({ projectId, onComplete, onStepChange }: PhaseSOVProps) {
  const { userOrgRoles } = useAuth();

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['project_contracts', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_contracts').select('*').eq('project_id', projectId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: sovs = [] } = useQuery({
    queryKey: ['project_sovs_lock_check', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_sov').select('id, contract_id, is_locked').eq('project_id', projectId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalValue = useMemo(
    () => contracts.reduce((sum, c) => sum + (c.contract_sum || 0), 0),
    [contracts],
  );

  // Gate activation on at least one locked SOV
  const hasLockedSOV = sovs.some(s => s.is_locked);
  const primaryContracts = contracts.filter(c => (c.contract_sum || 0) > 0 && c.trade !== 'Work Order' && c.trade !== 'Work Order Labor');
  const allPrimaryLocked = primaryContracts.length > 0 && primaryContracts.every(c =>
    sovs.some(s => s.contract_id === c.id && s.is_locked)
  );

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-5 px-5 py-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Total contract value:</span>
        <span className="font-semibold text-foreground" style={DT.mono}>${totalValue.toLocaleString()}</span>
      </div>

      <ContractSOVEditor projectId={projectId} />

      <div className="flex flex-col items-end gap-2 pt-4 border-t border-border">
        {!hasLockedSOV && sovs.length > 0 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="w-3 h-3" /> Lock all SOVs before activating
          </p>
        )}
        <Button onClick={onComplete} disabled={!allPrimaryLocked} className="min-h-[44px]">
          <CheckCircle2 className="w-4 h-4 mr-1" />
          Finish Setup & Activate Project
        </Button>
      </div>
    </div>
  );
}

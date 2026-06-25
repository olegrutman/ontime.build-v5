import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ContractSOVEditor } from '@/components/sov';
import { Skeleton } from '@/components/ui/skeleton';

interface PhaseSOVProps {
  projectId: string;
  onComplete: () => void;
  onStepChange?: (step: string) => void;
}

export function PhaseSOV({ projectId, onComplete }: PhaseSOVProps) {
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['project_contracts', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_contracts').select('id, contract_sum').eq('project_id', projectId);
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

  const hasLockedSOV = sovs.some(s => s.is_locked);
  const allLocked = sovs.length > 0 && sovs.every(s => s.is_locked);

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-5 px-5 py-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Total contract value:</span>
        <span className="font-mono font-semibold text-foreground">${totalValue.toLocaleString()}</span>
      </div>

      <ContractSOVEditor projectId={projectId} />

      <div className="flex flex-col items-end gap-2 pt-4 border-t border-border">
        {!hasLockedSOV && sovs.length > 0 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="w-3 h-3" /> Lock SOV before activating
          </p>
        )}
        <Button onClick={onComplete} disabled={!allLocked} className="min-h-[44px]">
          <CheckCircle2 className="w-4 h-4 mr-1" />
          Finish Setup & Activate Project
        </Button>
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DT } from '@/lib/design-tokens';
import { CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
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

  const totalValue = useMemo(
    () => contracts.reduce((sum, c) => sum + (c.contract_sum || 0), 0),
    [contracts],
  );

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6 max-w-full mx-auto">
      <div className="max-w-[680px] mx-auto">
        <h2 className="text-lg font-bold font-heading" style={DT.heading}>
          Schedule of Values
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Generate, review, and lock the SOV for each contract. Total contract value:{' '}
          <span className="font-semibold" style={DT.mono}>${totalValue.toLocaleString()}</span>
        </p>
      </div>

      {/* Render the existing SOV editor which handles generation/editing per contract */}
      <ContractSOVEditor projectId={projectId} />

      <div className="max-w-[680px] mx-auto flex justify-end pt-4 border-t border-border">
        <Button onClick={onComplete} className="min-h-[44px]">
          <CheckCircle2 className="w-4 h-4 mr-1" />
          Finish Setup & Activate Project
        </Button>
      </div>
    </div>
  );
}

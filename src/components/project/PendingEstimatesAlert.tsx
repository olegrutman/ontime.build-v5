import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

interface PendingEstimatesAlertProps {
  projectId: string;
  onReview: () => void;
}

/**
 * Surfaces supplier estimates waiting on this org's approval directly on the
 * project overview, so a decision never sits unseen inside a nested tab.
 */
export function PendingEstimatesAlert({ projectId, onReview }: PendingEstimatesAlertProps) {
  const { userOrgRoles } = useAuth();
  const currentOrgId = userOrgRoles[0]?.organization_id;
  const [pending, setPending] = useState<{ id: string; name: string; total: number | null }[]>([]);

  useEffect(() => {
    if (!projectId || !currentOrgId) return;
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from('supplier_estimates')
        .select('id, name, total_amount, supplier_org_id')
        .eq('project_id', projectId)
        .eq('status', 'SUBMITTED');

      if (!active) return;
      setPending(
        (data || [])
          .filter((e: any) => e.supplier_org_id !== currentOrgId)
          .map((e: any) => ({ id: e.id, name: e.name, total: e.total_amount }))
      );
    };

    load();
    return () => { active = false; };
  }, [projectId, currentOrgId]);

  if (pending.length === 0) return null;

  const total = pending.reduce((sum, e) => sum + (e.total || 0), 0);

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <FileText className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {pending.length} material {pending.length === 1 ? 'estimate' : 'estimates'} waiting for your approval
          </p>
          <p className="text-[0.8rem] text-muted-foreground truncate">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)} total ·{' '}
            {pending.map(e => e.name).join(', ')}
          </p>
        </div>
      </div>
      <Button size="sm" onClick={onReview} className="shrink-0">
        Review &amp; approve
      </Button>
    </div>
  );
}

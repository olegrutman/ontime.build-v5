import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Flag, Send, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/components/auth/RequirePermission';
import { correctionLabel, type OrderCorrection } from '@/lib/coCorrection';
import { COCorrectionBadge } from './COCorrectionBadge';

export function COCorrectionCard({ corrections, myOrgId, projectId, onRefresh }: { corrections: OrderCorrection[]; myOrgId: string; projectId: string; onRefresh: () => void }) {
  const qc = useQueryClient();
  const canCreate = usePermission('canCreateChangeOrders');
  const canApprove = usePermission('canApprove');
  const [saving, setSaving] = useState(false);
  const active = corrections.filter(c => correctionLabel(c));
  if (!active.length) return null;
  async function act(c: OrderCorrection, approve?: boolean) {
    setSaving(true);
    try {
      const result = approve === undefined
        ? await supabase.rpc('submit_co_correction', { _co_id: c.co_id, _from_org_id: c.from_org_id })
        : await supabase.rpc('decide_co_correction', { _co_id: c.co_id, _from_org_id: c.from_org_id, _approve: approve });
      if (result.error) throw result.error;
      await Promise.all([qc.invalidateQueries({ queryKey: ['co-corrections', projectId] }), qc.invalidateQueries({ queryKey: ['co-price-revisions', c.co_id] })]);
      onRefresh();
      toast.success(approve === undefined ? 'Correction submitted for approval' : approve ? 'Correction approved' : 'Correction returned for changes');
    } catch (error) { toast.error((error as { message?: string }).message ?? 'Could not update correction'); }
    finally { setSaving(false); }
  }
  return <section className="border border-secondary/40 bg-secondary/5 rounded-2xl p-4 space-y-3">
    <h3 className="flex items-center gap-2 font-heading text-base font-bold uppercase text-foreground"><Flag className="h-4 w-4 text-secondary" />Order corrections</h3>
    {active.map(c => <div key={c.from_org_id} className="space-y-3">
      <COCorrectionBadge correction={c} />
      <p className="text-xs text-muted-foreground">Scope or billable details changed. Existing approval remains in effect until the correction is accepted.</p>
      <div className="flex flex-wrap gap-2">
        {c.state !== 'pending' && c.from_org_id === myOrgId && canCreate && <Button disabled={saving} onClick={() => void act(c)}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Submit correction</Button>}
        {c.state === 'pending' && c.to_org_id === myOrgId && canApprove && <>
          <Button disabled={saving} onClick={() => void act(c, true)}><Check className="h-4 w-4" />Approve correction</Button>
          <Button variant="outline" disabled={saving} onClick={() => void act(c, false)}><X className="h-4 w-4" />Return for correction</Button>
        </>}
      </div>
    </div>)}
  </section>;
}
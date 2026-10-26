import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/components/auth/RequirePermission';
import { canSubmitPriceRevision, canDecidePriceRevision, revisionPriceChange } from '@/lib/coPriceRevision';
import type { ChangeOrder } from '@/types/changeOrder';

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function COPriceRevisionCard({ co, myOrgId, isTC, isGC, currentLabor, onRefresh }: {
  co: ChangeOrder; myOrgId: string; isTC: boolean; isGC: boolean; currentLabor: number; onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const canCreate = usePermission('canCreateChangeOrders');
  const canApprove = usePermission('canApprove');
  const [saving, setSaving] = useState(false);
  const { data: revisions = [] } = useQuery({
    queryKey: ['co-price-revisions', co.id],
    enabled: (isTC || isGC) && ['approved', 'contracted'].includes(co.status),
    queryFn: async () => {
      const { data, error } = await supabase.from('co_price_revisions').select('*').eq('co_id', co.id).order('submitted_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const pending = revisions.find(revision => revision.status === 'pending');
  const latest = revisions[0];
  const canSubmit = isTC && canSubmitPriceRevision(co.status, co.org_id, myOrgId, canCreate);
  const changed = Math.abs(currentLabor - Number(co.tc_submitted_price ?? 0)) > 0.005;
  if (!pending && !(canSubmit && changed) && !latest) return null;

  async function act(approve?: boolean) {
    setSaving(true);
    try {
      const result = approve === undefined
        ? await supabase.rpc('submit_co_price_revision', { _co_id: co.id })
        : pending ? await supabase.rpc('decide_co_price_revision', { _revision_id: pending.id, _approve: approve }) : null;
      if (!result) return;
      if (result.error) throw result.error;
      await queryClient.invalidateQueries({ queryKey: ['co-price-revisions', co.id] });
      await queryClient.invalidateQueries({ queryKey: ['project-contracts'] });
      toast.success(approve === undefined ? 'Revised price submitted for approval' : approve ? 'Revised price approved' : 'Revised price rejected; original approval retained');
      onRefresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : String((error as { message?: string }).message ?? 'Could not update the price revision'));
    } finally { setSaving(false); }
  }

  const revision = pending ?? latest;
  const scope = Array.isArray(revision?.scope_snapshot) ? revision.scope_snapshot as { item: string; description?: string; amount: number }[] : [];
  return (
    <section className="border border-border rounded-2xl bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-base font-bold uppercase">Revised price approval</h3>
        <span className="text-xs font-medium text-muted-foreground">{pending ? 'Awaiting contractor decision' : latest ? `Revision ${latest.status}` : 'Pricing correction'}</span>
      </div>
      {revision && (
        <>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span>Original <strong className="font-mono">{money(Number(revision.previous_price))}</strong></span>
            <span>Revised <strong className="font-mono">{money(Number(revision.proposed_price))}</strong></span>
            <span>Difference <strong className="font-mono">{money(revisionPriceChange(Number(revision.previous_price), Number(revision.proposed_price)))}</strong></span>
          </div>
          {pending && scope.length > 0 && <ul className="divide-y divide-border">{scope.map((item, index) => <li key={index} className="flex items-start justify-between gap-4 py-2 text-sm"><span className="min-w-0 break-words">{item.item}{item.description && <span className="block text-xs text-muted-foreground">{item.description}</span>}</span><span className="font-mono shrink-0">{money(Number(item.amount))}</span></li>)}</ul>}
        </>
      )}
      {pending && <p className="text-xs text-muted-foreground">The original approved price remains in effect until this revision is accepted.</p>}
      <div className="flex flex-wrap gap-2">
        {!pending && canSubmit && changed && <Button disabled={saving} onClick={() => void act()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Submit revised price</Button>}
        {pending && isGC && canDecidePriceRevision(pending.status, pending.to_org_id, myOrgId, canApprove) && <>
          <Button disabled={saving} onClick={() => void act(true)}><Check className="h-4 w-4" />Approve revised price</Button>
          <Button variant="outline" disabled={saving} onClick={() => void act(false)}><X className="h-4 w-4" />Reject revision</Button>
        </>}
      </div>
    </section>
  );
}
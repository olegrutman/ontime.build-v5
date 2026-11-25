import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ChangeOrder, COPricingType } from '@/types/changeOrder';
import { PRICING_TYPE_GUIDE, pricingTypeChangeMode } from '@/lib/pricingTypeChoice';
import { PricingTypeChoice } from './PricingTypeChoice';

interface Props { co: ChangeOrder; myOrgId?: string; part: 'button' | 'pending' }

function refresh(qc: ReturnType<typeof useQueryClient>, co: ChangeOrder) {
  qc.invalidateQueries({ queryKey: ['co-detail', co.id] });
  qc.invalidateQueries({ queryKey: ['change-orders', co.project_id] });
  qc.invalidateQueries({ queryKey: ['co-pricing-type-request', co.id] });
}

/** Header control: creator changes the order's pricing type; after submission the other company approves. */
export function COPricingTypeChange({ co, myOrgId, part }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<COPricingType>(co.pricing_type);
  const [cap, setCap] = useState(co.nte_cap ? String(co.nte_cap) : '');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const isCreator = !!myOrgId && co.org_id === myOrgId;

  const { data: pending } = useQuery({
    queryKey: ['co-pricing-type-request', co.id],
    queryFn: async () => {
      const { data } = await supabase.from('co_pricing_type_requests').select('*').eq('co_id', co.id).eq('status', 'pending').maybeSingle();
      return data;
    },
  });
  const { data: invoiced = false } = useQuery({
    queryKey: ['co-invoiced', co.id],
    enabled: isCreator,
    queryFn: async () => {
      const { data: invs } = await supabase.from('invoices').select('status').contains('co_ids', [co.id]);
      return (invs ?? []).some(i => String(i.status).toUpperCase() !== 'REJECTED');
    },
  });

  const mode = pricingTypeChangeMode(co, invoiced);
  const isApprover = !!pending && pending.to_org_id === myOrgId;

  async function submit() {
    setBusy(true);
    const { data, error } = await supabase.rpc('change_co_pricing_type', {
      _co_id: co.id, _to_type: target, _nte_cap: target === 'nte' ? Number(cap) : null, _reason: reason || null,
    });
    setBusy(false);
    if (error) { toast({ title: 'Could not change pricing type', description: error.message, variant: 'destructive' }); return; }
    toast({ title: data === 'applied' ? `Now ${PRICING_TYPE_GUIDE[target].name}` : 'Sent for approval', description: data === 'applied' ? undefined : 'The order keeps its current type until the other company approves.' });
    setOpen(false); setReason('');
    refresh(qc, co);
  }

  async function decide(approve: boolean) {
    if (!pending) return;
    setBusy(true);
    const { error } = await supabase.rpc('decide_co_pricing_type_request', { _request_id: pending.id, _approve: approve, _note: note || null });
    setBusy(false);
    if (error) { toast({ title: 'Could not save decision', description: error.message, variant: 'destructive' }); return; }
    toast({ title: approve ? 'Pricing type change approved' : isApprover ? 'Pricing type change declined' : 'Request cancelled' });
    setNote('');
    refresh(qc, co);
  }

  if (part === 'pending') {
    if (!pending) return null;
    const toName = PRICING_TYPE_GUIDE[pending.to_type as COPricingType]?.name ?? pending.to_type;
    const fromName = PRICING_TYPE_GUIDE[pending.from_type as COPricingType]?.name ?? pending.from_type;
    return (
      <div className="mt-3 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-xs">
        <p className="font-semibold text-white">Pricing type change waiting for approval: {fromName} → {toName}
          {pending.to_type === 'nte' && pending.nte_cap ? ` (ceiling $${Number(pending.nte_cap).toLocaleString('en-US')})` : ''}</p>
        {pending.reason && <p className="mt-0.5 break-words text-white/65">Reason: {pending.reason}</p>}
        <p className="mt-0.5 text-white/65">The order stays {fromName} until this is approved.</p>
        {isApprover ? (
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Reason (required to decline)" className="h-8 border-white/20 bg-white/10 text-xs text-white placeholder:text-white/40" />
            <div className="flex shrink-0 gap-2">
              <Button size="sm" className="h-8" disabled={busy} onClick={() => decide(true)}>Approve</Button>
              <Button size="sm" variant="outline" className="h-8 bg-transparent text-white border-white/20 hover:bg-white/10 hover:text-white" disabled={busy || !note.trim()} onClick={() => decide(false)}>Decline</Button>
            </div>
          </div>
        ) : isCreator ? (
          <Button size="sm" variant="outline" className="mt-2 h-8 bg-transparent text-white border-white/20 hover:bg-white/10 hover:text-white" disabled={busy} onClick={() => decide(false)}>Cancel request</Button>
        ) : null}
      </div>
    );
  }

  if (pending || !isCreator) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => { setTarget(co.pricing_type); setCap(co.nte_cap ? String(co.nte_cap) : ''); setOpen(true); }}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[0.68rem] font-semibold text-white/80 hover:bg-white/10 hover:text-white"
      >
        <ArrowLeftRight className="h-3.5 w-3.5" /> Change pricing type
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Change pricing type</DialogTitle>
            <DialogDescription>
              {mode === 'direct' && 'This order has not been submitted yet, so the change applies right away. Hours, materials and equipment you entered are kept.'}
              {mode === 'approval' && 'This order was already submitted. The other company must approve the change; until then the current type and approval stay in place.'}
              {mode === 'blocked' && (invoiced ? 'This order has already been invoiced, so its pricing type can no longer change.' : 'This order is closed, withdrawn or rejected, so its pricing type can no longer change.')}
            </DialogDescription>
          </DialogHeader>
          {mode !== 'blocked' && (
            <div className="space-y-3">
              <PricingTypeChoice value={target} onChange={setTarget} stacked />
              {target === 'nte' && (
                <label className="block text-xs font-medium">Ceiling amount ($)
                  <Input type="number" min={1} inputMode="decimal" value={cap} onChange={e => setCap(e.target.value)} className="mt-1" />
                </label>
              )}
              {mode === 'approval' && (
                <label className="block text-xs font-medium">Why are you changing it? (optional)
                  <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className="mt-1" />
                </label>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            {mode !== 'blocked' && (
              <Button
                disabled={busy || (target === co.pricing_type && (target !== 'nte' || Number(cap) === Number(co.nte_cap))) || (target === 'nte' && !(Number(cap) > 0))}
                onClick={submit}
              >
                {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {mode === 'direct' ? 'Change type' : 'Send for approval'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

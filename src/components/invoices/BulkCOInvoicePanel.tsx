import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { buildInvoiceNumber } from '@/lib/invoiceNumber';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { BillingPeriodPicker, validateBillingPeriod } from './BillingPeriodPicker';

export interface BulkBillableCO {
  co_id: string;
  co_number: string | null;
  title: string | null;
  description: string | null;
  contract_id: string;
  to_org_name: string | null;
  grand_total: number;
  already_billed: number;
  remaining: number;
}

export interface BulkContract {
  id: string;
  retainage_percent: number | null;
  from_org_name?: string;
  to_org_name?: string;
}

interface Props {
  projectId: string;
  userId: string;
  cos: BulkBillableCO[];
  contracts: BulkContract[];
  onCancel: () => void;
  onDone: () => void;
}

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

function shortNum(n: string | null) {
  const m = n?.match(/(\d+)\s*$/);
  return m ? `CO-${m[1]}` : n || 'CO';
}

export function BulkCOInvoicePanel({ projectId, userId, cos, contracts, onCancel, onDone }: Props) {
  const billable = useMemo(() => cos.filter(c => c.remaining > 0.005), [cos]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(billable.map(c => c.co_id)));
  const [combine, setCombine] = useState(true);
  const [periodStart, setPeriodStart] = useState<Date | undefined>();
  const [periodEnd, setPeriodEnd] = useState<Date | undefined>();
  const [periodConfirmed, setPeriodConfirmed] = useState(false);
  const [showWarn, setShowWarn] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const picked = billable.filter(c => selected.has(c.co_id));
  const total = picked.reduce((s, c) => s + c.remaining, 0);
  const groups = useMemo(() => {
    const m = new Map<string, BulkBillableCO[]>();
    picked.forEach(c => m.set(c.contract_id, [...(m.get(c.contract_id) || []), c]));
    return m;
  }, [picked]);
  const invoiceCount = combine ? groups.size : picked.length;
  const dateError = validateBillingPeriod(periodStart, periodEnd, periodConfirmed);
  const allOn = picked.length === billable.length && billable.length > 0;

  const toggle = (id: string) =>
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const lineFor = (co: BulkBillableCO, invoiceId: string, idx: number, ret: number) => {
    const label = `${(co.title || 'Change Order').trim()} (${shortNum(co.co_number)})`;
    return {
      invoice_id: invoiceId,
      sov_item_id: null,
      source_co_id: co.co_id,
      description: label.length > 240 ? label.slice(0, 237) + '…' : label,
      line_notes: co.description || null,
      scheduled_value: co.grand_total,
      previous_billed: co.already_billed,
      current_billed: co.remaining,
      total_billed: co.already_billed + co.remaining,
      billed_percent: 100,
      retainage_percent: ret,
      retainage_amount: co.remaining * (ret / 100),
      sort_order: idx,
    };
  };

  // Itemize each CO into its priced rows (labor per scope line, materials, equipment).
  // Falls back to one summary line when the CO is partly billed or its items don't add up to the amount due.
  const itemRowsFor = async (co: BulkBillableCO, billingOrgId: string | null) => {
    if (co.already_billed > 0.005) return null;
    const [li, le, mat, eq] = await Promise.all([
      supabase.from('co_line_items').select('id, item_name, sort_order').eq('co_id', co.co_id),
      supabase.from('co_labor_entries').select('co_line_item_id, line_total, org_id, is_actual_cost').eq('co_id', co.co_id).eq('is_actual_cost', false),
      supabase.from('co_material_items').select('description, quantity, uom, billed_amount, line_number').eq('co_id', co.co_id),
      supabase.from('co_equipment_items').select('description, billed_amount').eq('co_id', co.co_id),
    ]);
    const labor = (le.data || []).filter(e => !billingOrgId || e.org_id === billingOrgId);
    const lines = (li.data || [])
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(l => ({
        label: l.item_name || 'Labor',
        amount: labor.filter(e => e.co_line_item_id === l.id).reduce((s, e) => s + Number(e.line_total || 0), 0),
      }))
      .filter(r => r.amount > 0.005);
    const mats = (mat.data || [])
      .sort((a, b) => a.line_number - b.line_number)
      .map(m => ({ label: `Material: ${m.description}${m.quantity ? ` (${m.quantity} ${m.uom || ''})`.replace(' )', ')') : ''}`, amount: Number(m.billed_amount || 0) }))
      .filter(r => r.amount > 0.005);
    const eqs = (eq.data || [])
      .map(e => ({ label: `Equipment: ${e.description}`, amount: Number(e.billed_amount || 0) }))
      .filter(r => r.amount > 0.005);
    const sum = (rows: { amount: number }[]) => rows.reduce((s, r) => s + r.amount, 0);
    // Try with materials+equipment, then labor+materials, then labor only — must match the approved amount to the cent.
    for (const rows of [[...lines, ...mats, ...eqs], [...lines, ...mats], [...lines, ...eqs], lines]) {
      if (rows.length > 1 && Math.abs(sum(rows) - co.remaining) < 0.01) return rows;
    }
    return null;
  };

  const linesForCO = async (co: BulkBillableCO, invoiceId: string, startIdx: number, ret: number, billingOrgId: string | null) => {
    const rows = await itemRowsFor(co, billingOrgId);
    if (!rows) return [lineFor(co, invoiceId, startIdx, ret)];
    const tag = shortNum(co.co_number);
    const coTitle = (co.title || 'Change Order').trim();
    return rows.map((r, i) => {
      const label = `${tag} · ${r.label}`;
      return {
        invoice_id: invoiceId,
        sov_item_id: null,
        source_co_id: co.co_id,
        description: label.length > 240 ? label.slice(0, 237) + '…' : label,
        line_notes: i === 0 ? `${coTitle}${co.description ? ` — ${co.description}` : ''}` : null,
        scheduled_value: r.amount,
        previous_billed: 0,
        current_billed: r.amount,
        total_billed: r.amount,
        billed_percent: 100,
        retainage_percent: ret,
        retainage_amount: r.amount * (ret / 100),
        sort_order: startIdx + i,
      };
    });
  };

  const createOne = async (contractId: string, list: BulkBillableCO[]) => {
    const contract = contracts.find(c => c.id === contractId);
    const ret = contract?.retainage_percent || 0;
    const { data: pc } = await supabase.from('project_contracts').select('from_org_id').eq('id', contractId).maybeSingle();
    const billingOrgId = (pc as { from_org_id?: string } | null)?.from_org_id ?? null;
    const gross = list.reduce((s, c) => s + c.remaining, 0);
    const retAmt = gross * (ret / 100);
    const number = await buildInvoiceNumber({
      projectId,
      fromOrgName: contract?.from_org_name,
      toOrgName: contract?.to_org_name ?? list[0].to_org_name,
      coNumber: list.length === 1 ? list[0].co_number : null,
      multiCoCount: list.length,
    });
    const { data: inv, error } = await supabase
      .from('invoices')
      .insert({
        project_id: projectId,
        contract_id: contractId,
        sov_id: null,
        co_ids: list.map(c => c.co_id),
        invoice_number: number,
        billing_period_start: format(periodStart!, 'yyyy-MM-dd'),
        billing_period_end: format(periodEnd!, 'yyyy-MM-dd'),
        subtotal: gross,
        retainage_amount: retAmt,
        total_amount: gross - retAmt,
        notes: notes || null,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw error;
    const allLines: ReturnType<typeof lineFor>[] = [];
    for (const c of list) allLines.push(...(await linesForCO(c, inv.id, allLines.length, ret, billingOrgId)));
    const { error: lErr } = await supabase
      .from('invoice_line_items')
      .insert(allLines as never);
    if (lErr) throw lErr;
    await supabase.from('project_activity').insert({
      project_id: projectId,
      activity_type: 'INVOICE_CREATED',
      description: `Invoice ${number} created for ${list.map(c => shortNum(c.co_number)).join(', ')} (${money(gross)})`,
      actor_user_id: userId,
    });
  };

  const submit = async () => {
    if (!picked.length) return;
    if (dateError) {
      setShowWarn(true);
      toast.error(dateError);
      return;
    }
    setSaving(true);
    try {
      if (combine) {
        for (const [cid, list] of groups) await createOne(cid, list);
      } else {
        for (const co of picked) await createOne(co.contract_id, [co]);
      }
      toast.success(invoiceCount === 1 ? 'Invoice created' : `${invoiceCount} invoices created`);
      onDone();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create invoices');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <Label>Select change orders to bill</Label>
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => setSelected(allOn ? new Set() : new Set(billable.map(c => c.co_id)))}
          >
            {allOn ? 'Clear all' : 'Select all'}
          </button>
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
          <div className="bg-muted/50 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Approved change orders
            </span>
          </div>
          <div className="max-h-64 divide-y divide-border overflow-y-auto bg-card">
            {billable.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">All approved change orders are fully billed.</div>
            )}
            {billable.map(co => (
              <label key={co.co_id} className="flex cursor-pointer items-center p-3 transition-colors hover:bg-muted/40">
                <Checkbox checked={selected.has(co.co_id)} onCheckedChange={() => toggle(co.co_id)} />
                <div className="ml-3 min-w-0 flex-1">
                  <div className="truncate text-sm text-foreground">
                    {shortNum(co.co_number)} · {co.title || 'Change Order'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {co.to_org_name ? `Bill to ${co.to_org_name}` : 'Upstream party'}
                    {co.already_billed > 0 && ` · ${money(co.already_billed)} already billed`}
                  </div>
                </div>
                <div className="font-mono text-sm font-medium text-foreground">{money(co.remaining)}</div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">How should they be invoiced?</Label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: true, t: 'One combined invoice', d: 'One invoice number, every item listed under its change order' },
            { v: false, t: 'Separate invoice per CO', d: 'Each change order gets its own itemized invoice' },
          ].map(o => (
            <button
              key={String(o.v)}
              type="button"
              onClick={() => setCombine(o.v)}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors',
                combine === o.v ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/40',
              )}
            >
              <div className="text-sm font-medium text-foreground">{o.t}</div>
              <div className="text-xs text-muted-foreground">{o.d}</div>
            </button>
          ))}
        </div>
        {combine && groups.size > 1 && (
          <p className="mt-2 text-xs text-muted-foreground">
            These change orders bill to {groups.size} different companies, so {groups.size} invoices will be created — one per company.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-sm">Billing Period</Label>
          {!periodConfirmed && (
            <span className="text-[10px] uppercase tracking-wide text-destructive">Required</span>
          )}
        </div>
        <BillingPeriodPicker
          periodStart={periodStart}
          periodEnd={periodEnd}
          confirmed={periodConfirmed}
          showRequiredWarning={showWarn}
          onChange={(s, e, confirmed) => {
            setPeriodStart(s);
            setPeriodEnd(e);
            setPeriodConfirmed(confirmed && Boolean(s && e));
            if (confirmed) setShowWarn(false);
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>Notes (Optional)</Label>
        <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-primary/5 px-4 py-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-primary">Gross Amount</div>
          <div className="font-mono text-2xl font-bold text-foreground">{money(total)}</div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          {picked.length} {picked.length === 1 ? 'change order' : 'change orders'} selected
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={submit} disabled={saving || !picked.length || !!dateError}>
          {saving
            ? 'Creating...'
            : invoiceCount === 1
              ? `Create 1 invoice · ${money(total)}`
              : `Create ${invoiceCount} invoices · ${money(total)}`}
        </Button>
      </div>
    </div>
  );
}

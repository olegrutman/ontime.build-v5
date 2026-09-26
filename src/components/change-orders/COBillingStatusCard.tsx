import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Receipt, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toCents } from '@/lib/money';
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from '@/types/invoice';

interface Props {
  coId: string;
  projectId: string;
  status: string;
  /** Viewer's approved billable amount for this CO. */
  approvedTotal: number;
}

interface BilledInvoice {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  amount: number;
}

export type COBillingState = 'not_billed' | 'draft' | 'invoiced' | 'partly_paid' | 'paid';

export function deriveCOBillingState(invoices: { status: string; amount: number }[], approvedTotal: number) {
  const live = invoices.filter(i => i.status !== 'VOIDED' && i.status !== 'REJECTED');
  const sent = live.filter(i => i.status !== 'DRAFT');
  const billed = toCents(sent.reduce((s, i) => s + i.amount, 0));
  const paid = toCents(live.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0));
  let state: COBillingState = 'not_billed';
  if (paid > 0 && paid + 0.01 >= Math.max(approvedTotal, billed)) state = 'paid';
  else if (paid > 0) state = 'partly_paid';
  else if (sent.length) state = 'invoiced';
  else if (live.length) state = 'draft';
  return { state, billed, paid };
}

const LABEL: Record<COBillingState, string> = {
  not_billed: 'Approved · not billed',
  draft: 'Invoice in draft',
  invoiced: 'Invoiced · awaiting payment',
  partly_paid: 'Partly paid',
  paid: 'Paid in full',
};

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const d = (s: string | null) => (s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null);

export function COBillingStatusCard({ coId, projectId, status, approvedTotal }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { userOrgRoles } = useAuth();
  const orgId = userOrgRoles?.[0]?.organization_id ?? null;
  const key = ['co-billing-status', coId, orgId];

  const { data: invoices = [] } = useQuery({
    queryKey: key,
    enabled: status === 'approved' || status === 'contracted',
    queryFn: async (): Promise<BilledInvoice[]> => {
      const [{ data: lines }, { data: byArray }] = await Promise.all([
        supabase.from('invoice_line_items').select('invoice_id, current_billed').eq('source_co_id', coId),
        supabase.from('invoices').select('id').contains('co_ids', [coId]),
      ]);
      const lineSum = new Map<string, number>();
      (lines ?? []).forEach((l: any) => lineSum.set(l.invoice_id, (lineSum.get(l.invoice_id) ?? 0) + Number(l.current_billed || 0)));
      const ids = Array.from(new Set([...lineSum.keys(), ...(byArray ?? []).map((i: any) => i.id)]));
      if (!ids.length) return [];
      const { data: invs } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, submitted_at, approved_at, paid_at, total_amount, co_ids, created_at, contract_id')
        .in('id', ids)
        .order('created_at');
      // Only invoices the viewer's company SENT count — the sender is the contract's from_org_id.
      const cIds = Array.from(new Set((invs ?? []).map((i: any) => i.contract_id).filter(Boolean)));
      const { data: ctrs } = cIds.length
        ? await supabase.from('project_contracts').select('id, from_org_id').in('id', cIds)
        : { data: [] as any[] };
      const fromOrg = new Map(((ctrs ?? []) as any[]).map(c => [c.id, c.from_org_id]));
      const mine = (invs ?? []).filter((i: any) => !orgId || fromOrg.get(i.contract_id) === orgId);
      return mine.map((i: any) => ({
        id: i.id,
        invoice_number: i.invoice_number,
        status: i.status,
        submitted_at: i.submitted_at,
        approved_at: i.approved_at,
        paid_at: i.paid_at,
        amount: lineSum.has(i.id)
          ? lineSum.get(i.id)!
          : Number(i.total_amount || 0) / Math.max(i.co_ids?.length ?? 1, 1),
      }));
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`co-billing-${coId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `project_id=eq.${projectId}` }, () =>
        qc.invalidateQueries({ queryKey: key }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coId, projectId]);

  if (status !== 'approved' && status !== 'contracted') return null;

  const { state, billed, paid } = deriveCOBillingState(invoices, approvedTotal);
  const steps = ['Approved', 'Invoiced', 'Paid'];
  const reached = state === 'paid' ? 3 : state === 'invoiced' || state === 'partly_paid' ? 2 : 1;

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">Billing &amp; payment</span>
        </div>
        <span
          className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-full',
            state === 'paid' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
              : state === 'not_billed' ? 'bg-muted text-muted-foreground'
              : 'bg-secondary/15 text-secondary',
          )}
        >
          {LABEL[state]}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {steps.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={cn('h-1.5 rounded-full', i < reached ? 'bg-emerald-500' : 'bg-muted')} />
            <p className="mt-1 text-[0.6rem] uppercase tracking-wider text-muted-foreground">{s}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 font-mono text-sm">
        <div><p className="text-[0.6rem] uppercase font-sans text-muted-foreground">Approved</p>{fmt(approvedTotal)}</div>
        <div><p className="text-[0.6rem] uppercase font-sans text-muted-foreground">Billed</p>{fmt(billed)}</div>
        <div><p className="text-[0.6rem] uppercase font-sans text-muted-foreground">Paid</p>{fmt(paid)}</div>
      </div>

      {invoices.length > 0 ? (
        <ul className="divide-y rounded-xl border">
          {invoices.map(inv => (
            <li key={inv.id}>
              <button
                type="button"
                onClick={() => navigate(`/project/${projectId}/invoices`)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/50"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{inv.invoice_number}</span>
                  <span className="block text-xs text-muted-foreground">
                    {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                    {inv.paid_at ? ` · paid ${d(inv.paid_at)}` : inv.approved_at ? ` · approved ${d(inv.approved_at)}` : inv.submitted_at ? ` · sent ${d(inv.submitted_at)}` : ''}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 font-mono text-sm">
                  {inv.status === 'PAID' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                  {fmt(inv.amount)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No invoice yet for this change order.</p>
      )}
    </div>
  );
}

import { useState, type ReactNode } from 'react';
import { Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import type { ProjectFinancials } from '@/hooks/useProjectFinancials';
import { C, fontVal, fontMono, fontLabel, fmt, KpiCard, Pill, BarRow, THead, TdN, TdM, TRow, WarnItem, cellStyle, type PillType } from '@/components/shared/KpiCard';
import { KpiGrid } from '@/components/shared/KpiGrid';
import { QuickActionsBar } from '@/components/project/QuickActionsBar';
import { LadderCard } from '@/components/shared/LadderCard';
import { Sparkline } from '@/components/shared/Sparkline';
import { useProjectMonthlyBilling } from '@/hooks/useProjectMonthlyBilling';

/* ═══════════════════════════════════════════════════ */

interface Props {
  projectId: string;
  projectName?: string;
  financials: ProjectFinancials;
  onNavigate: (tab: string) => void;
  isTM?: boolean;
}

const NOT_SET = 'Not set';
/** Money formatter that never invents a number. */
const money = (v: number | null | undefined) =>
  typeof v === 'number' && Number.isFinite(v) ? fmt(v) : NOT_SET;
/** Percent formatter that never divides by zero or an absent denominator. */
const pct = (num: number, den: number | null) =>
  den !== null && den > 0 ? Math.round((num / den) * 100) : null;
const pctTxt = (p: number | null) => (p === null ? NOT_SET : `${p}%`);

export function FCProjectOverview({ projectId, projectName = 'Project', financials, onNavigate, isTM = false }: Props) {
  const { userOrgRoles } = useAuth();
  const currentOrgId = userOrgRoles[0]?.organization?.id;

  /* ─── The FC's own contract row — the ONLY source of this crew's money ───
     Contracts are stored biller → payer, so a Field Crew row has the crew as
     from_org_id (from_role = 'Field Crew'). Match either side to be safe. */
  const { data: contractData = null, isLoading: contractLoading } = useQuery({
    queryKey: ['fc-own-contract', projectId, currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return null;
      const { data, error } = await supabase
        .from('project_contracts')
        .select('id, contract_sum, co_approved_sum, retainage_percent, labor_budget, from_org_id, to_org_id, from_role, to_role, status, trade')
        .eq('project_id', projectId)
        .or(`from_org_id.eq.${currentOrgId},to_org_id.eq.${currentOrgId}`);
      if (error) throw error;
      const all = data || [];
      const rows = all.filter(
        (c: any) => c.trade !== 'Work Order' && c.trade !== 'Work Order Labor',
      );
      // Prefer the crew's own billing row (crew is the biller)
      const primary =
        rows.find((c: any) => c.from_org_id === currentOrgId && c.from_role === 'Field Crew') ||
        rows.find((c: any) => c.from_org_id === currentOrgId) ||
        rows.find((c: any) => c.to_role === 'Field Crew') ||
        rows[0] ||
        null;
      // Work-order contracts are still this crew's money: their invoices must be
      // counted in billed / paid, even though the base contract card ignores them.
      return { primary, allIds: all.map((c: any) => c.id) };
    },
    enabled: !!projectId && !!currentOrgId,
  });
  const myContract = contractData?.primary ?? null;
  const myContractIds: string[] = contractData?.allIds ?? [];


  // Zero rows is a NORMAL state: the TC has not set this crew's contract value yet.
  const contractValue: number | null =
    typeof myContract?.contract_sum === 'number' && Number.isFinite(myContract.contract_sum)
      ? Number(myContract.contract_sum)
      : null;
  // A contract row exists even at $0 (T&M-only crews). Only a missing row is
  // "not set" — the old `> 0` test showed the warning banner forever.
  const hasContract = contractValue !== null;
  const hasContractValue = contractValue !== null && contractValue > 0;
  const coApprovedPortion = Number((myContract as any)?.co_approved_sum || 0);
  const baseContractValue = contractValue !== null ? Math.max(0, contractValue - coApprovedPortion) : null;
  const retainagePct: number | null =
    typeof myContract?.retainage_percent === 'number' ? Number(myContract.retainage_percent) : null;
  const retainageAmount = hasContractValue && retainagePct !== null ? (contractValue! * retainagePct) / 100 : null;

  const laborBudget = (typeof myContract?.labor_budget === 'number' ? Number(myContract.labor_budget) : financials.laborBudget) || 0;

  // Editable internal budget (the crew's own cost budget — theirs to set)
  const [draftBudget, setDraftBudget] = useState(laborBudget);
  const [editingBudget, setEditingBudget] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);

  const saveBudget = async () => {
    if (!myContract?.id) { toast.error('No contract found'); return; }
    setSavingBudget(true);
    const ok = await financials.updateLaborBudget(myContract.id, draftBudget);
    setSavingBudget(false);
    if (ok) {
      toast.success('Internal budget saved');
      financials.refetch();
      setEditingBudget(false);
    } else {
      toast.error('Failed to save budget');
    }
  };

  const tcName = (() => {
    const c = myContract || financials.downstreamContract || financials.upstreamContract;
    if (!c) return 'Trade Contractor';
    const anyC = c as any;
    if (currentOrgId && anyC.from_org_id === currentOrgId) return anyC.to_org_name || 'Trade Contractor';
    if (currentOrgId && anyC.to_org_id === currentOrgId) return anyC.from_org_name || 'Trade Contractor';
    return anyC.from_org_name || anyC.to_org_name || 'Trade Contractor';
  })();

  /* Invoices — the crew's OWN billing only. The shared financials hook totals
     every invoice on the project (including TC → GC), so read this crew's
     contract invoices directly and use the full list, not the recent-5 slice. */
  const { data: myInvoices = [] } = useQuery({
    queryKey: ['fc-own-invoices', projectId, myContractIds.join(',')],
    queryFn: async () => {
      if (myContractIds.length === 0) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, subtotal, total_amount, created_at, contract_id')
        .eq('project_id', projectId)
        .in('contract_id', myContractIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && myContractIds.length > 0,
  });

  const paidInvoices = myInvoices.filter((i: any) => i.status === 'PAID');
  const pendingInvoices = myInvoices.filter((i: any) => ['SUBMITTED', 'APPROVED'].includes(i.status));
  const totalPaid = paidInvoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
  const totalPendingSubmitted = pendingInvoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
  const totalInvoiced = myInvoices
    .filter((i: any) => ['SUBMITTED', 'APPROVED', 'PAID'].includes(i.status))
    .reduce((s: number, i: any) => s + (i.total_amount || 0), 0);


  // 6-month invoice trend for sparklines
  const { data: monthly = [] } = useProjectMonthlyBilling(projectId);
  const billedSeries = monthly.map(m => m.billed);
  const paidSeries = monthly.map(m => m.paid);
  const hasTrend = monthly.some(m => m.billed > 0 || m.paid > 0);

  // Change orders / Work orders — scope + status only. No money columns.
  const { data: changeOrders = [] } = useQuery({
    queryKey: ['fc-project-cos', projectId, currentOrgId, isTM],
    queryFn: async () => {
      if (!currentOrgId) return [];

      const ownedPromise = supabase
        .from('change_orders_role_view')
        .select('id, co_number, title, status, created_at')
        .eq('project_id', projectId)
        .eq('org_id', currentOrgId)
        .order('created_at', { ascending: false });

      const collabPromise = supabase
        .from('change_order_collaborators')
        .select('co_id, change_orders!inner(id, co_number, title, status, created_at, project_id)')
        .eq('organization_id', currentOrgId)
        .eq('change_orders.project_id', projectId)
        .neq('status', 'rejected');

      const [ownedRes, collabRes] = await Promise.all([ownedPromise, collabPromise]);

      const owned = ownedRes.data || [];
      const collabCOs = (collabRes.data || [])
        .map((c: any) => c.change_orders)
        .filter(Boolean);

      const all = [...owned];
      const existingIds = new Set(owned.map((c: any) => c.id));
      for (const co of collabCOs) {
        if (!existingIds.has(co.id)) {
          all.push(co);
          existingIds.add(co.id);
        }
      }

      return all.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!projectId,
  });

  const approvedCOs = changeOrders.filter((co: any) => ['approved', 'completed', 'contracted'].includes(co.status));
  const pendingCOs = changeOrders.filter((co: any) => !['approved', 'completed', 'contracted', 'rejected'].includes(co.status));
  const completedCOs = changeOrders.filter((co: any) => co.status === 'completed');

  // FC labor hours (for T&M mode) — hours are theirs; rates stay masked.
  const { data: fcLaborData = [] } = useQuery({
    queryKey: ['fc-labor-hours', projectId, currentOrgId, changeOrders.length],
    queryFn: async () => {
      if (!currentOrgId) return [];
      const coIds = changeOrders.map((co: any) => co.id);
      if (coIds.length === 0) return [];
      const { data } = await supabase
        .from('co_labor_entries_role_view')
        .select('hours, co_id')
        .eq('org_id', currentOrgId)
        .in('co_id', coIds);
      return data || [];
    },
    enabled: isTM && !!currentOrgId && changeOrders.length > 0,
  });

  const totalHours = fcLaborData.reduce((s: number, e: any) => s + (e.hours || 0), 0);

  /* ─── Derived money — every figure traces to project_contracts ─── */
  const totalPending = hasContract ? Math.max(0, contractValue! - totalPaid) : null;
  const remainingToEarn = hasContract ? Math.max(0, contractValue! - totalInvoiced) : null;
  const collectedPct = pct(totalPaid, hasContract ? contractValue : null);

  // Work progress: dollars when a contract exists, scope-count progress in T&M
  const woProgressPct = changeOrders.length > 0 ? Math.round((completedCOs.length / changeOrders.length) * 100) : null;
  const progressPct = isTM ? woProgressPct : pct(totalInvoiced, hasContract ? contractValue : null);

  // Warnings
  const warnings: { color: string; icon: string; title: string; sub: string; value: string; pill: string; pillType: PillType; tab: string }[] = [];
  if (pendingInvoices.length > 0) {
    warnings.push({ color: C.yellow, icon: '💰', title: `Invoice Awaiting ${tcName} Approval`, sub: `${pendingInvoices.length} invoice${pendingInvoices.length > 1 ? 's' : ''} submitted`, value: fmt(totalPendingSubmitted), pill: 'Pending', pillType: 'pw', tab: 'invoices' });
  }
  if (!isTM && remainingToEarn !== null && remainingToEarn > 0 && (progressPct ?? 0) < 100) {
    warnings.push({ color: C.blue, icon: '📅', title: 'Work Remaining', sub: `${100 - (progressPct ?? 0)}% of your contract not yet invoiced`, value: fmt(remainingToEarn), pill: 'Upcoming', pillType: 'pb', tab: 'invoices' });
  }
  if (isTM && pendingCOs.length > 0) {
    warnings.push({ color: C.yellow, icon: '📝', title: `${pendingCOs.length} Pending WO${pendingCOs.length > 1 ? 's' : ''}`, sub: 'Awaiting approval', value: `${pendingCOs.length} WOs`, pill: 'Review', pillType: 'pw', tab: 'change-orders' });
  }

  const contractNotice = !contractLoading && !hasContract ? (
    <div style={{ padding: '12px 14px', borderRadius: 12, background: C.amberPale, border: `1px solid ${C.border}`, fontSize: '0.78rem', color: C.muted, ...fontLabel }}>
      <strong style={{ color: C.ink }}>Contract not set yet.</strong> {tcName} has not set your contract value for this project. Your scope, hours and work orders are all shown below — dollar figures appear once {tcName} sets the value.
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <QuickActionsBar projectId={projectId} role="FC" isTM={isTM} onNavigate={onNavigate} />
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, ...fontLabel }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.purple, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: C.faint }}>Contract Party</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: C.ink }}>Field Crew · {tcName}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onNavigate('invoices')} style={{ padding: '8px 16px', borderRadius: 8, background: C.amber, color: '#fff', fontWeight: 700, fontSize: '0.76rem', border: 'none', cursor: 'pointer', ...fontLabel }}>Submit Invoice to {tcName}</button>
          <button onClick={() => onNavigate(isTM ? 'change-orders' : 'daily-log')} style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.76rem', border: `1px solid ${C.border}`, cursor: 'pointer', ...fontLabel }}>{isTM ? 'View Work Orders' : 'View My Tasks'}</button>
        </div>
      </div>

      {contractNotice}

      {/* ─── Detailed KPI Cards ─── */}
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: C.faint, fontWeight: 700, paddingTop: 4 }}>
        Detail
      </div>

      <KpiGrid>

        {isTM ? (
          <>
            {/* ═══ T&M MODE: WO-driven cards ═══ */}

            {/* Card 1 — My Contract */}
            <KpiCard accent={C.amber} icon="🤝" iconBg={C.amberPale} label="MY CONTRACT" value={money(contractValue)} sub={`Set by ${tcName} · read-only`} pills={hasContract ? [{ type: 'pa', text: 'Active' }] : [{ type: 'pm', text: NOT_SET }]} spark={hasTrend ? <Sparkline data={billedSeries} color={C.amberD} fill={C.amber} /> : undefined} idx={0}>
              <div style={{ padding: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <THead cols={['Item', 'Value']} />
                  <tbody>
                    <TRow cells={[<TdN>Contract Value</TdN>, <TdM>{money(contractValue)}</TdM>]} />
                    <TRow cells={[<TdN>Retainage</TdN>, <TdM>{retainagePct !== null ? `${retainagePct}%${retainageAmount !== null ? ` · ${fmt(retainageAmount)}` : ''}` : NOT_SET}</TdM>]} />
                    <TRow cells={[<TdN>Invoiced to Date</TdN>, <TdM>{fmt(totalInvoiced)}</TdM>]} isTotal />
                  </tbody>
                </table>
              </div>
            </KpiCard>

            {/* Card 2 — Work Progress (WO completion) */}
            <KpiCard accent={C.navy} icon="⚒" iconBg={C.surface2} label="WORK PROGRESS" value={pctTxt(woProgressPct)} sub={`${completedCOs.length} of ${changeOrders.length} WOs completed`} pills={[{ type: (woProgressPct ?? 0) >= 80 ? 'pg' : (woProgressPct ?? 0) >= 40 ? 'pa' : 'pm', text: (woProgressPct ?? 0) >= 100 ? 'Complete' : 'In Progress' }]} idx={1}>
              <div style={{ padding: 12 }}>
                {woProgressPct !== null && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: C.muted, marginBottom: 4, ...fontLabel }}>
                      <span>WO Completion</span>
                      <span style={{ ...fontMono, fontSize: '0.76rem', color: C.ink }}>{woProgressPct}%</span>
                    </div>
                    <div style={{ width: '100%', height: 10, borderRadius: 6, background: C.border, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(woProgressPct, 100)}%`, height: '100%', borderRadius: 6, background: woProgressPct >= 80 ? C.green : C.amber, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <THead cols={['Status', 'Count']} />
                  <tbody>
                    <TRow cells={[<TdN>Total WOs</TdN>, <TdM>{changeOrders.length}</TdM>]} />
                    <TRow cells={[<TdN>Approved</TdN>, <TdM>{approvedCOs.length}</TdM>]} />
                    <TRow cells={[<TdN>Completed</TdN>, <TdM>{completedCOs.length}</TdM>]} />
                    <TRow cells={[<TdN>Pending</TdN>, <TdM>{pendingCOs.length}</TdM>]} />
                  </tbody>
                </table>
              </div>
            </KpiCard>

            {/* Card 3 — Work Orders list (scope + status only) */}
            <KpiCard accent={C.blue} icon="📋" iconBg={C.blueBg} label="WORK ORDERS" value={`${changeOrders.length} WOs`} sub={`${approvedCOs.length} approved · ${pendingCOs.length} pending`} pills={pendingCOs.length > 0 ? [{ type: 'pw', text: `${pendingCOs.length} pending` }] : [{ type: 'pg', text: 'All clear' }]} idx={2}>
              <div style={{ padding: 12 }}>
                {changeOrders.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <THead cols={['WO #', 'Title', 'Status']} />
                    <tbody>
                      {changeOrders.slice(0, 8).map((co: any) => (
                        <TRow key={co.id} cells={[
                          <TdN>{co.co_number || '—'}</TdN>,
                          co.title || '—',
                          <Pill type={['approved', 'completed', 'contracted'].includes(co.status) ? 'pg' : co.status === 'rejected' ? 'pr' : 'pw'}>{co.status}</Pill>,
                        ]} />
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No work orders yet</div>
                )}
                <button onClick={() => onNavigate('change-orders')} style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 10, ...fontLabel }}>View All Work Orders</button>
              </div>
            </KpiCard>

            {/* Card 4 — Paid by TC */}
            <KpiCard accent={C.green} icon="✅" iconBg={C.greenBg} label={`PAID BY ${tcName.toUpperCase()}`} value={fmt(totalPaid)} sub={`${paidInvoices.length} invoices paid`} pills={[{ type: 'pg', text: `${paidInvoices.length} paid` }]} spark={hasTrend ? <Sparkline data={paidSeries} color={C.green} fill={C.green} /> : undefined} idx={3}>
              <div style={{ padding: 12 }}>
                {paidInvoices.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <THead cols={['Invoice #', 'Amount', 'Status']} />
                    <tbody>
                      {paidInvoices.map(inv => (
                        <TRow key={inv.id} cells={[
                          <TdN>{inv.invoice_number}</TdN>,
                          <TdM>{fmt(inv.total_amount)}</TdM>,
                          <Pill type="pg">Paid</Pill>,
                        ]} />
                      ))}
                      <TRow cells={[<TdN>{paidInvoices.length} paid</TdN>, <TdM>{fmt(totalPaid)}</TdM>, '—']} isTotal />
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No payments received yet</div>
                )}
              </div>
            </KpiCard>

            {/* Card 5 — Pending from TC */}
            <KpiCard accent={C.yellow} icon="⏳" iconBg={C.yellowBg} label={`PENDING FROM ${tcName.toUpperCase()}`} value={pendingInvoices.length > 0 ? fmt(totalPendingSubmitted) : money(totalPending)} sub={pendingInvoices.length > 0 ? `${pendingInvoices.length} invoice${pendingInvoices.length > 1 ? 's' : ''} awaiting approval` : hasContract ? 'No pending invoices' : `Contract not set by ${tcName}`} pills={pendingInvoices.length > 0 ? [{ type: 'pw', text: `${tcName} reviewing` }] : [{ type: hasContract ? 'pg' : 'pm', text: hasContract ? 'All clear' : NOT_SET }]} idx={4}>
              <div style={{ padding: '12px 16px' }}>
                {pendingInvoices.length > 0 ? (
                  pendingInvoices.map(inv => (
                    <div key={inv.id} style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: C.ink }}>{inv.invoice_number}</span>
                        <Pill type="pw">Pending</Pill>
                      </div>
                      <div style={{ fontSize: '1.4rem', color: C.ink, ...fontVal }}>{fmt(inv.total_amount)}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No pending invoices</div>
                )}
              </div>
            </KpiCard>

            {/* Card 6 — Hours Logged */}
            <KpiCard accent={C.purple} icon="⏱" iconBg={C.purpleBg} label="HOURS LOGGED" value={`${totalHours.toFixed(1)} hrs`} sub={totalHours > 0 ? `${fcLaborData.length} entries` : 'No labor hours logged'} pills={totalHours > 0 ? [{ type: 'pa', text: `${fcLaborData.length} entries` }] : [{ type: 'pm', text: 'No hours' }]} idx={5}>
              <div style={{ padding: 12 }}>
                {fcLaborData.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <THead cols={['Metric', 'Value']} />
                    <tbody>
                      <TRow cells={[<TdN>Total Hours</TdN>, <TdM>{totalHours.toFixed(1)}</TdM>]} />
                      <TRow cells={[<TdN>Entries</TdN>, <TdM>{fcLaborData.length}</TdM>]} />
                      <TRow cells={[<TdN>Work Orders</TdN>, <TdM>{changeOrders.length}</TdM>]} isTotal />
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No labor hours logged yet</div>
                )}
              </div>
            </KpiCard>
          </>
        ) : (
          <>
            {/* ═══ FIXED-CONTRACT MODE ═══ */}

            {/* Card 1 — My Contract */}
            <KpiCard accent={C.amber} icon="🤝" iconBg={C.amberPale} label="MY CONTRACT" value={money(contractValue)} sub={`Set by ${tcName} · read-only`} pills={hasContract ? [{ type: 'pa', text: 'Active' }] : [{ type: 'pm', text: NOT_SET }]} idx={0}>
              <div style={{ padding: '12px 16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <THead cols={['Item', 'Value', 'Notes']} />
                  <tbody>
                    <TRow cells={[<TdN>Contract Value (set by {tcName})</TdN>, <TdM>{money(contractValue)}</TdM>, 'Lump sum']} />
                    <TRow cells={[<TdN>Retainage</TdN>, <TdM>{retainagePct !== null ? `${retainagePct}%` : NOT_SET}</TdM>, retainageAmount !== null ? fmt(retainageAmount) : '—']} />
                    <TRow cells={[<TdN>Change Orders</TdN>, <TdM>{approvedCOs.length}</TdM>, `${approvedCOs.length} approved · ${pendingCOs.length} pending`]} />
                    <tr style={{ cursor: 'pointer' }} className="hover:bg-[rgba(245,166,35,.05)]">
                      <td style={cellStyle}>
                        <TdN>Internal Cost Budget</TdN>
                      </td>
                      <td style={cellStyle}>
                        {editingBudget ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
                            <span style={{ fontSize: '0.78rem', color: C.muted }}>$</span>
                            <input
                              autoFocus
                              type="number"
                              value={draftBudget || ''}
                              onChange={e => setDraftBudget(parseInt(e.target.value) || 0)}
                              onKeyDown={e => { if (e.key === 'Enter') saveBudget(); if (e.key === 'Escape') { setEditingBudget(false); setDraftBudget(laborBudget); } }}
                              style={{ width: 100, padding: '2px 6px', borderRadius: 6, border: `1px solid ${C.amber}`, fontSize: '0.78rem', outline: 'none', ...fontMono }}
                            />
                            <button onClick={saveBudget} disabled={savingBudget} style={{ padding: '2px 8px', borderRadius: 6, background: C.amber, color: '#fff', fontSize: '0.68rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                              {savingBudget ? '…' : '✓'}
                            </button>
                            <button onClick={() => { setEditingBudget(false); setDraftBudget(laborBudget); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 2 }}>
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setEditingBudget(true); }}>
                            <TdM>{laborBudget > 0 ? fmt(laborBudget) : 'Set budget'}</TdM>
                            <Pencil size={11} style={{ color: C.faint }} />
                          </div>
                        )}
                      </td>
                      <td style={cellStyle}>{laborBudget > 0 ? 'Labor + materials' : <span style={{ color: C.amber, fontSize: '0.68rem', fontWeight: 600 }}>Click to set</span>}</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: C.blueBg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.72rem', color: C.muted, ...fontLabel }}>
                  <span style={{ fontSize: 14 }}>ℹ️</span>
                  <span>Your contract value is set by <strong style={{ color: C.ink }}>{tcName}</strong>. Contact {tcName} to negotiate changes.</span>
                </div>
              </div>
            </KpiCard>

            {/* Card 2 — Invoicing against contract */}
            <KpiCard accent={C.green} icon="🧾" iconBg={C.greenBg} label="BILLED TO DATE" value={fmt(totalInvoiced)} sub={hasContract ? `${pctTxt(progressPct)} of your contract invoiced` : `Contract not set by ${tcName}`} pills={hasContract ? [{ type: 'pa', text: pctTxt(progressPct) }] : [{ type: 'pm', text: NOT_SET }]} spark={hasTrend ? <Sparkline data={billedSeries} color={C.amberD} fill={C.amber} /> : undefined} idx={1}>
              <div style={{ padding: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <THead cols={['Metric', 'Value']} />
                  <tbody>
                    <TRow cells={[<TdN>Contract Value</TdN>, <TdM>{money(contractValue)}</TdM>]} />
                    <TRow cells={[<TdN>Invoiced to Date</TdN>, <TdM>{fmt(totalInvoiced)}</TdM>]} />
                    <TRow cells={[<TdN>Collected</TdN>, <TdM>{fmt(totalPaid)}</TdM>]} />
                    <TRow cells={[<TdN>Remaining to Invoice</TdN>, <TdM>{money(remainingToEarn)}</TdM>]} isTotal />
                  </tbody>
                </table>
              </div>
            </KpiCard>

            {/* Card 3 — Change Orders (scope + status only) */}
            <KpiCard accent={C.blue} icon="📋" iconBg={C.blueBg} label="CHANGE ORDERS" value={`${approvedCOs.length} COs`} sub={`${approvedCOs.length} approved · ${pendingCOs.length} pending`} pills={approvedCOs.length > 0 ? [{ type: 'pb', text: `${approvedCOs.length} approved` }] : [{ type: 'pm', text: 'None' }]} idx={2}>
              <div style={{ padding: 12 }}>
                {changeOrders.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <THead cols={['CO #', 'Description', 'Status']} />
                    <tbody>
                      {changeOrders.slice(0, 8).map((co: any) => (
                        <TRow key={co.id} cells={[
                          <TdN>{co.co_number || '—'}</TdN>,
                          co.title || '—',
                          <Pill type={['approved', 'completed', 'contracted'].includes(co.status) ? 'pg' : co.status === 'rejected' ? 'pr' : 'pw'}>{co.status}</Pill>,
                        ]} />
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No change orders yet</div>
                )}
                <button onClick={() => onNavigate('change-orders')} style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 10, ...fontLabel }}>+ Submit CO Request to {tcName}</button>
              </div>
            </KpiCard>

            {/* Card 4 — Paid by TC */}
            <KpiCard accent={C.green} icon="✅" iconBg={C.greenBg} label={`PAID BY ${tcName.toUpperCase()}`} value={fmt(totalPaid)} sub={hasContract ? `${pctTxt(collectedPct)} of contract collected · ${paidInvoices.length} invoices paid` : `${paidInvoices.length} invoices paid`} pills={[{ type: 'pg', text: hasContract ? `${pctTxt(collectedPct)} received` : `${paidInvoices.length} paid` }]} spark={hasTrend ? <Sparkline data={paidSeries} color={C.green} fill={C.green} /> : undefined} idx={3}>
              <div style={{ padding: 12 }}>
                {paidInvoices.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <THead cols={['Invoice #', 'Amount', 'Status']} />
                    <tbody>
                      {paidInvoices.map(inv => (
                        <TRow key={inv.id} cells={[
                          <TdN>{inv.invoice_number}</TdN>,
                          <TdM>{fmt(inv.total_amount)}</TdM>,
                          <Pill type="pg">Paid</Pill>,
                        ]} />
                      ))}
                      <TRow cells={[<TdN>{paidInvoices.length} paid</TdN>, <TdM>{fmt(totalPaid)}</TdM>, '—']} isTotal />
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No payments received yet</div>
                )}
              </div>
            </KpiCard>

            {/* Card 5 — Pending from TC */}
            <KpiCard accent={C.yellow} icon="⏳" iconBg={C.yellowBg} label={`PENDING FROM ${tcName.toUpperCase()}`} value={pendingInvoices.length > 0 ? fmt(totalPendingSubmitted) : money(totalPending)} sub={pendingInvoices.length > 0 ? `${pendingInvoices.length} invoice${pendingInvoices.length > 1 ? 's' : ''} awaiting ${tcName} approval` : hasContract ? 'No pending invoices' : `Contract not set by ${tcName}`} pills={pendingInvoices.length > 0 ? [{ type: 'pw', text: `${tcName} reviewing` }] : [{ type: hasContract ? 'pg' : 'pm', text: hasContract ? 'All clear' : NOT_SET }]} idx={4}>
              <div style={{ padding: '12px 16px' }}>
                {pendingInvoices.length > 0 ? (
                  pendingInvoices.map(inv => (
                    <div key={inv.id} style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: C.ink }}>{inv.invoice_number}</span>
                        <Pill type="pw">Pending {tcName} Approval</Pill>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: C.muted, marginBottom: 4 }}>To: {tcName}</div>
                      <div style={{ fontSize: '1.4rem', color: C.ink, ...fontVal }}>{fmt(inv.total_amount)}</div>
                      <div style={{ fontSize: '0.67rem', color: C.muted, marginTop: 6 }}>{tcName} is reviewing this invoice. You will be notified when approved.</div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No pending invoices</div>
                )}
              </div>
            </KpiCard>

            {/* Card 6 — Work Progress */}
            <KpiCard accent={C.navy} icon="⚒" iconBg={C.surface2} label="WORK PROGRESS" value={pctTxt(progressPct)} sub={hasContract ? `${fmt(totalInvoiced)} invoiced of ${money(contractValue)} contract` : `Contract not set by ${tcName}`} pills={[{ type: (progressPct ?? 0) >= 80 ? 'pg' : (progressPct ?? 0) >= 40 ? 'pa' : 'pm', text: progressPct === null ? NOT_SET : progressPct >= 100 ? 'Complete' : 'On Track' }]} idx={5}>
              <div style={{ padding: 12 }}>
                {progressPct !== null && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: C.muted, marginBottom: 4, ...fontLabel }}>
                      <span>Overall Progress</span>
                      <span style={{ ...fontMono, fontSize: '0.76rem', color: C.ink }}>{progressPct}%</span>
                    </div>
                    <div style={{ width: '100%', height: 10, borderRadius: 6, background: C.border, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(progressPct, 100)}%`, height: '100%', borderRadius: 6, background: progressPct >= 80 ? C.green : C.amber, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <THead cols={['Metric', 'Value']} />
                  <tbody>
                    <TRow cells={[<TdN>Contract Value</TdN>, <TdM>{money(contractValue)}</TdM>]} />
                    <TRow cells={[<TdN>Invoiced to Date</TdN>, <TdM>{fmt(totalInvoiced)}</TdM>]} />
                    <TRow cells={[<TdN>Paid</TdN>, <TdM>{fmt(totalPaid)}</TdM>]} />
                    <TRow cells={[<TdN>Remaining</TdN>, <TdM>{money(remainingToEarn)}</TdM>]} isTotal />
                  </tbody>
                </table>
              </div>
            </KpiCard>
          </>
        )}
      </KpiGrid>

      {/* Earnings Tracker — only when the contract value exists */}
      {hasContract && (() => {
        const denom = contractValue!;
        const invPct = (totalInvoiced / denom) * 100;
        const paidPct = (totalPaid / denom) * 100;
        const pendPct = totalPending !== null ? (totalPending / denom) * 100 : 0;
        const remPct = remainingToEarn !== null ? (remainingToEarn / denom) * 100 : 0;
        return (
          <LadderCard
            title={`💰 Earnings Tracker — ${projectName}`}
            totalLabel="My Contract"
            totalValue={fmt(denom)}
            segments={[
              { pct: paidPct, color: C.greenDark },
              { pct: Math.max(invPct - paidPct, 0), color: C.green },
              { pct: pendPct, color: C.yellow },
            ]}
            rows={[
              { label: 'My Contract', value: fmt(denom), pct: 100, barColor: C.amber },
              { label: 'Invoiced', value: fmt(totalInvoiced), pct: invPct, barColor: C.green, headline: true },
              { label: 'Collected', value: fmt(totalPaid), pct: paidPct, barColor: C.greenDark, headline: true },
              ...(totalPending !== null && totalPending > 0 ? [{ label: 'Pending', value: fmt(totalPending), pct: pendPct, barColor: C.yellow }] : []),
              { label: 'Remaining to Earn', value: money(remainingToEarn), pct: remPct, barColor: C.border },
            ]}
          />
        );
      })()}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', ...fontLabel }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, fontSize: '0.78rem', fontWeight: 700, color: C.ink }}>🚨 Attention — {projectName}</div>
          {warnings.map((w, i) => (
            <WarnItem key={i} color={w.color} icon={w.icon} title={w.title} sub={w.sub} value={w.value} pill={w.pill} pillType={w.pillType} onClick={() => onNavigate(w.tab)} />
          ))}
        </div>
      )}
    </div>
  );
}

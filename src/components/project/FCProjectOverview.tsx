import { useState, type ReactNode } from 'react';
import { Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import type { ProjectFinancials } from '@/hooks/useProjectFinancials';
import { C, fontVal, fontMono, fontLabel, fmt, KpiCard, Pill, BarRow, THead, TdN, TdM, TRow, WarnItem, cellStyle, type PillType } from '@/components/shared/KpiCard';
import { KpiGrid } from '@/components/shared/KpiGrid';
import { CanonicalKpiGrid } from '@/components/project/kpi/CanonicalKpiGrid';

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
// Clamped at 100: invoice totals are tax-inclusive while contracts are pre-tax.
const pct = (num: number, den: number | null) =>
  den !== null && den > 0 ? Math.min(100, Math.round((num / den) * 100)) : null;
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
        .select('id, contract_sum, co_approved_sum, original_contract_sum, retainage_percent, labor_budget, from_org_id, to_org_id, from_role, to_role, status, trade')
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

      {/* ─── Canonical financial cards — one ledger, one formula per number ─── */}
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: C.faint, fontWeight: 700, paddingTop: 4 }}>
        Financials
      </div>
      <CanonicalKpiGrid
        ledger={financials.ledger}
        extras={{
          billsTo: tcName,
          paidParties: 'crew costs',
          approvedCOCount: approvedCOs.length,
          pendingCOCount: pendingCOs.length,
          coWord: isTM ? 'WO' : 'CO',
        }}
      />

      {/* Legacy financial detail cards and progress bars removed: overview money now renders only from CanonicalKpiGrid. */}

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

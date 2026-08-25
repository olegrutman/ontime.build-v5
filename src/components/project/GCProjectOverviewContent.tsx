import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Pencil, X, UserPlus, Package, RotateCw, Loader2 } from 'lucide-react';
import { resendProjectInvite } from '@/lib/inviteUtils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { AddTeamMemberDialog } from '@/components/project/AddTeamMemberDialog';
import type { ProjectFinancials } from '@/hooks/useProjectFinancials';
import type { OrgType } from '@/types/organization';
import { C, fontLabel, fmt, type PillType } from '@/components/shared/KpiCard';
import { CanonicalKpiGrid } from '@/components/project/kpi/CanonicalKpiGrid';

import { useBuyerMaterialsAnalytics } from '@/hooks/useBuyerMaterialsAnalytics';
import { BuyerMaterialsAnalyticsSection } from '@/components/project/BuyerMaterialsAnalyticsSection';
import { OverviewAttentionStrip } from '@/components/project/OverviewAttentionStrip';
import { OwnerBillingsPanel } from '@/components/project/gc/OwnerBillingsPanel';
import { ProjectHealthHero, computeHealthStatus, buildHealthSummary } from '@/components/project/overview/ProjectHealthHero';
import { QuickActionsBar } from '@/components/project/QuickActionsBar';
import { APPROVED_CO_STATUSES } from '@/hooks/coAggregation';
import { baseContractSum } from '@/lib/contractSums';


import { parseMoney } from '@/lib/money';

function EditField({ label, value, onSave, type = 'text' }: {
  label: string; value: string; onSave: (v: string) => void; type?: 'text' | 'number' | 'select' | 'textarea';
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const confirm = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}`, ...fontLabel }}>
      <span style={{ fontSize: '0.72rem', color: C.muted, fontWeight: 600, minWidth: 130, paddingTop: 4 }}>{label}</span>
      {editing ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1 }}>
          {type === 'textarea' ? (
            <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}
              style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.amber}`, fontSize: '0.76rem', resize: 'vertical', minHeight: 48, outline: 'none', ...fontLabel }} />
          ) : type === 'select' ? (
            <select autoFocus value={draft} onChange={(e) => { setDraft(e.target.value); onSave(e.target.value); setEditing(false); }}
              style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.amber}`, fontSize: '0.76rem', outline: 'none', ...fontLabel }}>
              <option>Lump Sum</option><option>T&M</option><option>GMP</option>
            </select>
          ) : (
            <input autoFocus type={type} value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') cancel(); }} onBlur={confirm}
              style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.amber}`, fontSize: '0.76rem', outline: 'none', ...fontLabel }} />
          )}
          {type === 'textarea' && <button onClick={confirm} style={{ padding: '4px 10px', borderRadius: 6, background: C.amber, color: '#fff', fontSize: '0.68rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}>✓</button>}
          <button onClick={cancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 2 }}><X size={14} /></button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: C.ink }}>{value}</span>
          <Pencil size={12} style={{ color: C.faint }} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */

interface Props {
  projectId: string;
  projectName?: string;
  financials: ProjectFinancials;
  onNavigate: (tab: string) => void;
  isTM?: boolean;
}

const roleDotColors: Record<string, string> = {
  'General Contractor': C.blue,
  'Trade Contractor': C.green,
  'Field Crew': C.purple,
  'Supplier': C.amber,
};
const roleLabel: Record<string, string> = {
  'General Contractor': 'General Contractor', 'Trade Contractor': 'Trade Contractor', 'Field Crew': 'Field Crew', 'Supplier': 'Supplier',
};

export function GCProjectOverviewContent({ projectId, projectName = 'Project', financials, onNavigate, isTM = false }: Props) {
  const { userOrgRoles } = useAuth();
  const viewerOrgType = (userOrgRoles[0]?.organization?.type as OrgType) ?? null;
  const canInvite = viewerOrgType === 'GC' || viewerOrgType === 'TC';
  const myOrgName = userOrgRoles[0]?.organization?.name || 'Your Company';
  const currentOrgId = userOrgRoles[0]?.organization?.id;

  const ownerBudgetReal = financials.ownerContractValue || 0;
  const upContract = financials.upstreamContract;
  // BASE subcontract value: `contract_sum` already includes approved COs, and CO
  // cost is added separately below, so using the raw sum double-counted them.
  const tcContractVal = baseContractSum(upContract as any);

  const tcName = (() => {
    if (!upContract) return 'Trade Contractor';
    if (currentOrgId && upContract.from_org_id === currentOrgId) return upContract.to_org_name || 'Trade Contractor';
    if (currentOrgId && upContract.to_org_id === currentOrgId) return upContract.from_org_name || 'Trade Contractor';
    return upContract.to_org_name || upContract.from_org_name || 'Trade Contractor';
  })();

  // ─── Owner Budget editing ───
  const [draftOwnerBudget, setDraftOwnerBudget] = useState(ownerBudgetReal);
  const [dirtyOwner, setDirtyOwner] = useState(false);
  const [savingOwner, setSavingOwner] = useState(false);

  useEffect(() => {
    setDraftOwnerBudget(ownerBudgetReal);
    setDirtyOwner(false);
  }, [ownerBudgetReal]);

  const ownerGcContract = financials.contracts?.find(
    (c: any) => c.from_role === 'Owner' && c.to_role === 'General Contractor'
  );

  const saveOwnerBudget = async () => {
    const targetId = ownerGcContract?.id || upContract?.id;
    if (!targetId) return;
    setSavingOwner(true);
    const ok = await financials.updateOwnerContract(targetId, draftOwnerBudget);
    setSavingOwner(false);
    if (ok) {
      financials.refetch();
      setDirtyOwner(false);
    }
  };

  const ownerBudget = draftOwnerBudget;
  const marginDollar = ownerBudget - tcContractVal;
  const marginPct = ownerBudget > 0 ? ((marginDollar / ownerBudget) * 100).toFixed(1) : '0';

  // ─── Contract editing ───
  const [contractDraft, setContractDraft] = useState({
    contractor: tcName,
    value: String(tcContractVal),
    type: 'Lump Sum',
    signedDate: '',
    scope: '',
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setContractDraft(prev => ({
      ...prev,
      contractor: tcName,
      value: String(tcContractVal),
    }));
  }, [tcName, tcContractVal]);

  const updateField = (field: keyof typeof contractDraft, val: string) => {
    setContractDraft(p => ({ ...p, [field]: val }));
    setDirty(true);
  };
  const saveContract = async () => {
    if (upContract) {
      const newVal = parseMoney(contractDraft.value);
      await financials.updateContract(upContract.id, newVal, upContract.retainage_percent);
      financials.refetch();
    }
    setDirty(false);
  };

  // ─── Change Orders / Work Orders ───
  const { data: changeOrders = [] } = useQuery({
    queryKey: ['project-cos-overview', projectId],
    queryFn: async () => {
      const { data: cos } = await supabase
        .from('change_orders')
        .select('id, co_number, title, status, gc_budget, tc_submitted_price, materials_responsible, equipment_responsible, co_material_responsible_override, co_equipment_responsible_override')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (!cos || cos.length === 0) return [];

      // Materials/equipment are fetched for BOTH modes: change orders carry them
      // too, and hard-coding 0 outside T&M made GC-side CO cost labor-only.
      const coIds = cos.map(c => c.id);
      const [matRes, eqRes] = await Promise.all([
        supabase.from('co_material_items').select('co_id, billed_amount, line_cost').in('co_id', coIds),
        supabase.from('co_equipment_items').select('co_id, billed_amount, cost').in('co_id', coIds),
      ]);
      const matByWO: Record<string, number> = {};
      const eqByWO: Record<string, number> = {};
      const matCostByWO: Record<string, number> = {};
      const eqCostByWO: Record<string, number> = {};
      (matRes.data || []).forEach(m => {
        matByWO[m.co_id] = (matByWO[m.co_id] || 0) + (m.billed_amount || 0);
        matCostByWO[m.co_id] = (matCostByWO[m.co_id] || 0) + ((m as any).line_cost || 0);
      });
      (eqRes.data || []).forEach(e => {
        eqByWO[e.co_id] = (eqByWO[e.co_id] || 0) + (e.billed_amount || 0);
        eqCostByWO[e.co_id] = (eqCostByWO[e.co_id] || 0) + ((e as any).cost || 0);
      });
      return cos.map(c => ({
        ...c,
        wo_materials_total: matByWO[c.id] || 0,
        wo_equipment_total: eqByWO[c.id] || 0,
        wo_materials_cost: matCostByWO[c.id] || 0,
        wo_equipment_cost: eqCostByWO[c.id] || 0,
      }));
    },
  });

  // `contracted` is downstream of approval — excluding it made approved COs read
  // as "pending" here while the financial hook counted them as contract value.
  const isApprovedCO = (s: string) => (APPROVED_CO_STATUSES as readonly string[]).includes(s);
  const approvedCOs = changeOrders.filter(co => isApprovedCO(co.status));
  const pendingCOs = changeOrders.filter(co => !isApprovedCO(co.status) && co.status !== 'rejected');
  /**
   * GC revenue per CO = the owner price only. The TC's price is what the GC OWES,
   * never what the owner pays, so an unpriced CO earns 0 revenue (and shows as a
   * margin leak) instead of silently borrowing the TC number.
   */
  const coRevenueTotal = financials.approvedCORevenue;
  const coCostTotal = financials.approvedCOCost;
  const coWord = isTM ? 'WO' : 'CO';

  // ─── RFIs ───
  const { data: rfis = [] } = useQuery({
    queryKey: ['project-rfis-overview', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_rfis')
        .select('id, rfi_number, subject, status, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const openRfis = rfis.filter(r => r.status === 'open' || r.status === 'in_review');
  const resolvedRfis = rfis.filter(r => r.status === 'resolved' || r.status === 'closed');

  // ─── Invoices ─── party-scoped: the GC's payables (TC + suppliers), not every
  // invoice on the project. `recentInvoices` is an unscoped 5-row slice.
  const gcPaidAmount = financials.payablesPaid;
  const pendingPayableCount = financials.payablesPendingCount;
  const pendingPayableAmount = financials.payablesPendingAmount;

  // ─── Team data ───
  const [team, setTeam] = useState<{ id: string; role: string; invited_org_name: string | null; invited_name: string | null; invited_email: string | null; status: string }[]>([]);
  const [materialResp, setMaterialResp] = useState<string | null>(null);
  const [designatedSupplier, setDesignatedSupplier] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [settingMatResp, setSettingMatResp] = useState(false);
  const [contractIdForMatResp, setContractIdForMatResp] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    const [teamRes, contractRes, supplierRes] = await Promise.all([
      supabase.from('project_team').select('id, role, invited_org_name, invited_name, invited_email, status').eq('project_id', projectId),
      supabase.from('project_contracts').select('id, material_responsibility').eq('project_id', projectId).limit(1),
      supabase.from('project_designated_suppliers').select('invited_name').eq('project_id', projectId).neq('status', 'removed').maybeSingle(),
    ]);
    const teamData = teamRes.data || [];
    setTeam(teamData);
    setMaterialResp(contractRes.data?.[0]?.material_responsibility ?? null);
    setContractIdForMatResp(contractRes.data?.[0]?.id ?? null);
    // Fallback: check project_team for a Supplier role member
    const supplierFromTeam = teamData.find(m => m.role === 'Supplier' && m.status === 'Accepted');
    setDesignatedSupplier(supplierRes.data?.invited_name ?? supplierFromTeam?.invited_org_name ?? null);
  }, [projectId]);

  const handleSetMaterialResp = async (value: 'GC' | 'TC') => {
    if (!contractIdForMatResp) return;
    setSettingMatResp(true);
    await supabase.from('project_contracts').update({ material_responsibility: value }).eq('id', contractIdForMatResp);
    setMaterialResp(value);
    setSettingMatResp(false);
  };

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const acceptedTeam = team.filter(m => m.status === 'Accepted');

  // ─── Resend invite ───
  const [resending, setResending] = useState<string | null>(null);
  const handleResend = async (member: typeof team[0]) => {
    setResending(member.id);
    try {
      await resendProjectInvite(projectId, member.id);
      toast.success(`Invitation resent to ${member.invited_email || member.invited_org_name || 'member'}`);
      fetchTeam();
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend invite');
    } finally {
      setResending(null);
    }
  };

  // ─── Materials ───
  const matEstimate = financials.materialEstimate || financials.approvedEstimateSum || 0;
  const matOrdered = financials.materialOrdered;
  const matDelivered = financials.materialDelivered;
  const matPending = financials.materialOrderedPending;
  const matPct = matEstimate > 0 ? Math.round((matOrdered / matEstimate) * 100) : 0;

  // ─── Buyer materials analytics (only when GC is materials-responsible) ───
  const buyerAnalyticsQuery = useBuyerMaterialsAnalytics({
    projectId,
    buyerOrgId: currentOrgId,
    estimateTotal: matEstimate,
    enabled: !!financials.isGCMaterialResponsible,
  });

  // ─── Warnings ───
  const warnings: { color: string; icon: string; title: string; sub: string; value: string; pill: string; pillType: PillType; tab: string }[] = [];
  if (pendingPayableCount > 0) {
    warnings.push({ color: C.red, icon: '💰', title: `${pendingPayableCount} Invoice${pendingPayableCount > 1 ? 's' : ''} Awaiting Your Approval`, sub: `From ${tcName} + suppliers`, value: fmt(pendingPayableAmount), pill: 'Action Needed', pillType: 'pr', tab: 'invoices' });
  }
  if (matPending > 0) {
    warnings.push({ color: C.yellow, icon: '🚚', title: 'Material Orders Pending Delivery', sub: `${fmt(matPending)} in transit`, value: fmt(matPending), pill: 'Pending', pillType: 'pw', tab: 'purchase-orders' });
  }
  if (openRfis.length > 0) {
    warnings.push({ color: C.blue, icon: '❓', title: `${openRfis.length} Open RFI${openRfis.length > 1 ? 's' : ''}`, sub: 'Respond to open questions', value: `${openRfis.length} RFIs`, pill: 'Action Needed', pillType: 'pb', tab: 'rfis' });
  }
  if (pendingCOs.length > 0) {
    warnings.push({ color: C.yellow, icon: '📝', title: `${pendingCOs.length} Pending ${isTM ? 'Work Order' : 'Change Order'}${pendingCOs.length > 1 ? 's' : ''}`, sub: 'Review and approve', value: `${pendingCOs.length} ${isTM ? 'WOs' : 'COs'}`, pill: 'Review', pillType: 'pw', tab: 'change-orders' });
  }

  const draftContractVal = parseMoney(contractDraft.value);

  // ─── Single source of truth for margin (hero, summary strip, margin card) ───
  // The approved supplier estimate IS the material contract between the
  // materials-responsible party and the supplier. When no estimate is approved
  // yet we fall back to committed POs so the card is never blind to real spend.
  const materialFromPOs = !!financials.isGCMaterialResponsible && matEstimate <= 0 && matOrdered > 0;
  const materialCommitment = financials.isGCMaterialResponsible
    ? (matEstimate > 0 ? matEstimate : matOrdered)
    : 0;
  const materialLabel = materialFromPOs
    ? 'Committed POs (no approved estimate)'
    : 'Materials contract (approved supplier estimates)';
  const revisedIn = ownerBudget + coRevenueTotal;
  const revisedOut = draftContractVal + coCostTotal + materialCommitment;
  const projectedMargin = revisedIn - revisedOut;
  const projectedMarginPct = revisedIn > 0 ? (projectedMargin / revisedIn) * 100 : 0;
  const projectedMarginPctStr = projectedMarginPct.toFixed(1);
  // Undelivered material is exposure, not yet cost — surfaced separately.
  const materialOveragePastContract = materialCommitment > 0 ? Math.max(0, matOrdered - materialCommitment) : 0;
  const materialAtRiskOnDelivery = matPending + materialOveragePastContract;

  // Legacy gross-margin figures (contract-only) kept for the TC contract card.
  const liveMargin = ownerBudget - draftContractVal;
  const liveMarginPct = ownerBudget > 0 ? ((liveMargin / ownerBudget) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      <QuickActionsBar projectId={projectId} role="GC" isTM={isTM} onNavigate={onNavigate} />
      {/* Needs Attention — TOP placement, compact horizontal chips */}
      <OverviewAttentionStrip warnings={warnings} projectName={projectName} onNavigate={onNavigate} />

      {/* ─── Project Health Hero — sourced only from the canonical ledger ─── */}
      {(() => {
        const ledger = financials.ledger;
        const approvedNet = ledger.coNetMargin.value;
        const pendingNetAtRisk = ledger.pendingCONetAtRisk.value;
        const cashPosition = ledger.marginToDate.value;
        const hasContract = ledger.revisedContract.known;
        const status = computeHealthStatus(ledger.forecastMarginPct, cashPosition, pendingNetAtRisk, approvedNet, hasContract);
        const summary = buildHealthSummary({
          projectedMarginPct: ledger.forecastMarginPct, cashPosition, pendingNetAtRisk, approvedNet, hasContract,
          roleLabel: 'owner',
        });
        return (
          <ProjectHealthHero
            status={status}
            projectedMargin={ledger.forecastMargin.value}
            projectedMarginPct={ledger.forecastMarginPct}
            summary={summary}
            awaitingUpstream={!hasContract}
            miniStats={[
              { label: 'Cash Position', value: fmt(cashPosition), tone: cashPosition >= 0 ? 'pos' : 'neg' },
              { label: 'Approved CO Net', value: fmt(approvedNet), tone: approvedNet >= 0 ? 'pos' : 'neg' },
              { label: 'Pending at Risk', value: fmt(pendingNetAtRisk), tone: pendingNetAtRisk >= 0 ? 'neutral' : 'neg' },
            ]}
          />
        );
      })()}

      {/* ─── Canonical financial cards — one ledger, one formula per number ─── */}
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: C.faint, fontWeight: 700, paddingTop: 4 }}>
        Financials
      </div>
      <CanonicalKpiGrid
        ledger={financials.ledger}
        extras={{
          billsTo: 'owner',
          paidParties: `${tcName} + suppliers`,
          approvedCOCount: approvedCOs.length,
          pendingCOCount: pendingCOs.length,
          coWord,
        }}
      />

      {/* Legacy financial detail cards removed: overview money now renders only from CanonicalKpiGrid. */}

      {/* Owner Billings ledger — GC only, drives Margin to Date */}
      {financials.gcOrgId && (
        <OwnerBillingsPanel
          projectId={projectId}
          gcOrgId={financials.gcOrgId}
          onChanged={financials.refetch}
        />
      )}


      {/* Buyer Materials Analytics — only when GC handles materials */}
      {financials.isGCMaterialResponsible && (
        <BuyerMaterialsAnalyticsSection
          analytics={buyerAnalyticsQuery.data}
          loading={buyerAnalyticsQuery.isLoading}
          onNavigate={onNavigate}
        />
      )}

    </div>
  );
}

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
import { C, fontVal, fontMono, fontLabel, fmt, KpiCard, Pill, THead, TdN, TdM, TRow, WarnItem, type PillType } from '@/components/shared/KpiCard';
import { CanonicalKpiGrid } from '@/components/project/kpi/CanonicalKpiGrid';

import { KpiGrid } from '@/components/shared/KpiGrid';
import { useBuyerMaterialsAnalytics } from '@/hooks/useBuyerMaterialsAnalytics';
import { BuyerMaterialsAnalyticsSection } from '@/components/project/BuyerMaterialsAnalyticsSection';
import { OverviewAttentionStrip } from '@/components/project/OverviewAttentionStrip';
import { OwnerBillingsPanel } from '@/components/project/gc/OwnerBillingsPanel';
import { ProjectHealthHero, computeHealthStatus, buildHealthSummary } from '@/components/project/overview/ProjectHealthHero';
import { OverviewSummaryStrip } from '@/components/project/overview/OverviewSummaryStrip';
import { QuickActionsBar } from '@/components/project/QuickActionsBar';
import { APPROVED_CO_STATUSES } from '@/hooks/coAggregation';
import { baseContractSum } from '@/lib/contractSums';

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
      const newVal = parseInt(contractDraft.value.replace(/[^0-9]/g, '')) || 0;
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
  const coOwnerValue = (co: any) => co.gc_budget || 0;
  const coIsPriced = (co: any) => (co.gc_budget || 0) > 0;
  const coRevenueTotal = approvedCOs.reduce((s, co) => s + coOwnerValue(co), 0);
  /**
   * GC-side CO cost. An approved CO is money the GC OWES, so it hits the bottom
   * line on the cost side:
   *   • owed to the TC = the frozen billable snapshot (already excludes
   *     anything the GC procures itself)
   *   • GC-procured materials / equipment = what the GC pays at cost on its own
   *     POs for that CO
   * A category is counted on exactly one side, never both, so the material
   * commitment and the CO cost can't double up.
   */
  const contractMaterialResp = (upContract as any)?.material_responsibility ?? null;
  const coCostOf = (co: any) => {
    const matResp = co.co_material_responsible_override ?? co.materials_responsible ?? contractMaterialResp ?? 'TC';
    const eqResp = co.co_equipment_responsible_override ?? co.equipment_responsible ?? contractMaterialResp ?? 'TC';
    const owedToTC = co.tc_submitted_price || 0;
    const gcMaterials = matResp === 'GC' ? (co.wo_materials_cost || 0) : 0;
    const gcEquipment = eqResp === 'GC' ? (co.wo_equipment_cost || 0) : 0;
    return { owedToTC, gcMaterials, gcEquipment, total: owedToTC + gcMaterials + gcEquipment };
  };
  const sumCost = (list: any[], key: 'owedToTC' | 'gcMaterials' | 'gcEquipment' | 'total') =>
    list.reduce((s, co) => s + coCostOf(co)[key], 0);

  const coLaborCost = sumCost(approvedCOs, 'owedToTC');
  const coMaterialsCost = sumCost(approvedCOs, 'gcMaterials');
  const coEquipmentCost = sumCost(approvedCOs, 'gcEquipment');
  const coCostTotal = coLaborCost + coMaterialsCost + coEquipmentCost;
  // Markup is only meaningful on COs that actually have an owner price.
  const pricedCOs = approvedCOs.filter(coIsPriced);
  const unpricedCOs = approvedCOs.filter(co => !coIsPriced(co));
  const pricedCOCost = sumCost(pricedCOs, 'total');
  const unpricedCOCost = sumCost(unpricedCOs, 'total');
  const coMarkup = coRevenueTotal - pricedCOCost;
  const coMarkupPct = pricedCOCost > 0 ? (coMarkup / pricedCOCost) * 100 : 0;
  const coNoBudgetCount = unpricedCOs.length;
  const coAtLossCount = pricedCOs.filter(co => coOwnerValue(co) < coCostOf(co).total).length;
  const pendingCOCostTotal = sumCost(pendingCOs, 'total');
  const pendingCORevenueTotal = pendingCOs.reduce((s, co) => s + coOwnerValue(co), 0);
  const coWord = isTM ? 'WO' : 'CO';

  /** The three CO cards every GC sees: what COs cost, what they sell for, what's coming. */
  const gcCoCards = (
    <>
      {/* CO cost committed — COs hit the GC's bottom line as cost first */}
      <KpiCard accent={C.red} icon="🧾" iconBg={C.redBg}
        label={`${coWord} COST COMMITTED`}
        value={coCostTotal > 0 ? fmt(coCostTotal) : '—'}
        sub={`Owed to ${tcName} ${fmt(coLaborCost)}${coMaterialsCost + coEquipmentCost > 0 ? ` · You procure ${fmt(coMaterialsCost + coEquipmentCost)}` : ''}`}
        pills={coCostTotal > 0
          ? [{ type: 'pr' as PillType, text: `${approvedCOs.length} approved` }]
          : [{ type: 'pm' as PillType, text: 'No cost yet' }]}
        idx={1}>
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: '0.66rem', color: C.muted, marginBottom: 8 }}>
            Formula: owed to {tcName} + materials/equipment you procure for these {coWord}s (at cost). Items the {tcName} carries are inside their price — never counted twice.
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <THead cols={['Cost Type', 'Value']} />
            <tbody>
              <TRow cells={[<TdN>Owed to {tcName} (approved {coWord} price)</TdN>, <TdM>{fmt(coLaborCost)}</TdM>]} />
              <TRow cells={[<TdN>Materials you procure (at cost)</TdN>, <TdM>{fmt(coMaterialsCost)}</TdM>]} />
              <TRow cells={[<TdN>Equipment you procure (at cost)</TdN>, <TdM>{fmt(coEquipmentCost)}</TdM>]} />
              <TRow cells={[<TdN>Total {coWord} cost committed</TdN>, <TdM>{fmt(coCostTotal)}</TdM>]} isTotal />
            </tbody>
          </table>
          {approvedCOs.length > 0 && (
            <>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: C.faint, marginTop: 12, marginBottom: 8 }}>Per {coWord}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <THead cols={[`${coWord} #`, `To ${tcName}`, 'You procure', 'Total']} />
                <tbody>
                  {approvedCOs.slice(0, 8).map(co => {
                    const c = coCostOf(co);
                    return (
                      <TRow key={co.id} cells={[
                        <TdN>{co.co_number || '—'}</TdN>,
                        <TdM>{fmt(c.owedToTC)}</TdM>,
                        <TdM>{fmt(c.gcMaterials + c.gcEquipment)}</TdM>,
                        <TdM>{fmt(c.total)}</TdM>,
                      ]} />
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      </KpiCard>

      {/* CO revenue & markup — what you sell those COs to the owner for */}
      <KpiCard accent={C.amber} icon="💰" iconBg={C.amberPale}
        label={`${coWord} REVENUE & MARKUP`}
        value={coRevenueTotal > 0 ? fmt(coRevenueTotal) : '—'}
        sub={coCostTotal > 0
          ? `${fmt(coMarkup)} markup · ${coMarkupPct.toFixed(1)}% over cost`
          : 'No approved COs priced to the owner yet'}
        pills={[
          ...(coNoBudgetCount > 0 ? [{ type: 'pr' as PillType, text: `${coNoBudgetCount} no owner price` }] : []),
          ...(coAtLossCount > 0 ? [{ type: 'pr' as PillType, text: `${coAtLossCount} below cost` }] : []),
          ...(coNoBudgetCount === 0 && coAtLossCount === 0 && coRevenueTotal > 0 ? [{ type: 'pg' as PillType, text: 'All priced' }] : []),
        ]}
        idx={2}>
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: '0.66rem', color: C.muted, marginBottom: 8 }}>
            Formula: Σ owner price (GC budget) of approved {coWord}s − {coWord} cost committed. A {coWord} with no owner price is passed through at 0% markup.
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <THead cols={[`${coWord} #`, 'Owner price', 'Your cost', 'Markup']} />
            <tbody>
              {approvedCOs.length > 0 ? approvedCOs.slice(0, 8).map(co => {
                const cost = coCostOf(co).total;
                const rev = coOwnerValue(co);
                const mk = rev - cost;
                return (
                  <TRow key={co.id} cells={[
                    <TdN>{co.co_number || '—'}{!co.gc_budget && <span style={{ color: C.red, marginLeft: 4, fontSize: '0.62rem', fontWeight: 700 }}>NO PRICE</span>}</TdN>,
                    <TdM>{fmt(rev)}</TdM>,
                    <TdM>{fmt(cost)}</TdM>,
                    <TdM>{mk < 0 ? `-${fmt(Math.abs(mk))}` : fmt(mk)}</TdM>,
                  ]} />
                );
              }) : (
                <TRow cells={[<TdN>No approved {coWord}s</TdN>, '—', '—', '—']} />
              )}
              {approvedCOs.length > 0 && (
                <TRow cells={[<TdN>Total</TdN>, <TdM>{fmt(coRevenueTotal)}</TdM>, <TdM>{fmt(coCostTotal)}</TdM>, <TdM>{fmt(coMarkup)}</TdM>]} isTotal />
              )}
            </tbody>
          </table>
          {coNoBudgetCount > 0 && (
            <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: C.redBg, color: C.red, fontSize: '0.68rem', fontWeight: 600 }}>
              {coNoBudgetCount} approved {coWord}{coNoBudgetCount > 1 ? 's' : ''} owe money with no owner price set — set the owner budget on each to stop the margin leak.
            </div>
          )}
        </div>
      </KpiCard>

      {/* CO exposure — pending COs about to hit the bottom line */}
      <KpiCard accent={C.blue} icon="⏳" iconBg={C.blueBg}
        label={`${coWord} EXPOSURE (PENDING)`}
        value={pendingCOCostTotal > 0 ? fmt(pendingCOCostTotal) : '—'}
        sub={pendingCOs.length > 0
          ? `${pendingCOs.length} pending · ${fmt(pendingCORevenueTotal)} owner value if approved`
          : 'Nothing pending'}
        pills={pendingCOs.length > 0
          ? [{ type: 'pw' as PillType, text: `${pendingCOs.length} pending` }]
          : [{ type: 'pg' as PillType, text: 'All clear' }]}
        idx={3}>
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: '0.66rem', color: C.muted, marginBottom: 8 }}>
            Formula: Σ cost of submitted {coWord}s if you approve them. Not in revenue or cost yet — this is what's about to hit your bottom line.
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <THead cols={[`${coWord} #`, 'Title', 'Cost if approved', 'Status']} />
            <tbody>
              {pendingCOs.length > 0 ? pendingCOs.slice(0, 8).map(co => (
                <TRow key={co.id} cells={[
                  <TdN>{co.co_number || '—'}</TdN>,
                  co.title || '—',
                  <TdM>{fmt(coCostOf(co).total)}</TdM>,
                  <Pill type="pw">{co.status}</Pill>,
                ]} />
              )) : (
                <TRow cells={[<TdN>Nothing pending</TdN>, '—', '—', '—']} />
              )}
              {pendingCOs.length > 0 && (
                <TRow cells={[<TdN>Total exposure</TdN>, '—', <TdM>{fmt(pendingCOCostTotal)}</TdM>, '—']} isTotal />
              )}
            </tbody>
          </table>
          <button onClick={() => onNavigate('change-orders')} style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 10, ...fontLabel }}>Review {coWord}s</button>
        </div>
      </KpiCard>
    </>
  );

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

  const draftContractVal = parseInt(contractDraft.value.replace(/[^0-9]/g, '')) || 0;

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

      {/* ─── Project Health Hero + 3-zone Summary ─── */}
      {(() => {
        const approvedNet = coRevenueTotal - coCostTotal;
        const pendingNetAtRisk = financials.pendingCONetAtRisk;
        const cashPosition = financials.marginToDateAmount;
        const hasContract = revisedIn > 0;
        const status = computeHealthStatus(projectedMarginPct, cashPosition, pendingNetAtRisk, approvedNet, hasContract);
        const summary = buildHealthSummary({
          projectedMarginPct, cashPosition, pendingNetAtRisk, approvedNet, hasContract,
          roleLabel: 'owner',
        });
        const received = financials.ownerBillingsCollected || financials.receivablesCollected;
        const paid = financials.payablesPaid;
        return (
          <>
            <ProjectHealthHero
              status={status}
              projectedMargin={projectedMargin}
              projectedMarginPct={projectedMarginPct}
              summary={summary}
              awaitingUpstream={!hasContract}
              miniStats={[
                { label: 'Cash Position', value: fmt(received - paid), tone: (received - paid) >= 0 ? 'pos' : 'neg' },
                { label: 'Approved CO Net', value: fmt(approvedNet), tone: approvedNet >= 0 ? 'pos' : 'neg' },
                { label: 'Pending at Risk', value: fmt(pendingNetAtRisk), tone: pendingNetAtRisk >= 0 ? 'neutral' : 'neg' },
              ]}
            />
            <OverviewSummaryStrip
              receivablePartyLabel="owner"
              payablePartyLabel={`${tcName} + suppliers`}
              awaitingUpstream={!hasContract}
              contract={{
                label: 'Owner Contract',
                revisedIn,
                revisedOut,
                margin: projectedMargin,
                marginPct: projectedMarginPct,
                materialCommitment,
                materialLabel,
              }}
              cashFlow={{
                received,
                paid,
                cashPosition: received - paid,
                paidToSuppliers: financials.materialPaid,
                paidToSubs: Math.max(0, paid - financials.materialPaid),
                owedToYou: Math.max(0, revisedIn - received),
                youOwe: hasContract ? Math.max(0, revisedOut - paid) : Math.max(0, financials.gcPayablesInvoiced - paid),

              }}
              changeOrders={{
                approvedCount: approvedCOs.length,
                pendingCount: pendingCOs.length,
                approvedNet,
                pendingNetAtRisk,
              }}
            />
          </>
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
          coWord: isTM ? 'WO' : 'CO',
        }}
      />

      {/* ─── Detailed KPI Cards — drilldown grid ─── */}
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: C.faint, fontWeight: 700, paddingTop: 4 }}>
        Detail
      </div>


      {/* KPI Cards — 4-col grid */}
      <KpiGrid>

        {isTM ? (
          <>
            {/* ═══ T&M MODE: WO-driven cards 1-4 ═══ */}

            {gcCoCards}
            {/* Margin + margin-to-date now come from the canonical grid above. */}


            {/* Card 4 — Work Orders (list + create) */}
            <KpiCard accent={C.blue} icon="📝" iconBg={C.blueBg} label="WORK ORDERS" value={changeOrders.length > 0 ? `${changeOrders.length} WOs` : '0 WOs'} sub={`${approvedCOs.length} approved · ${pendingCOs.length} pending`} pills={pendingCOs.length > 0 ? [{ type: 'pw', text: `${pendingCOs.length} pending` }] : [{ type: 'pg', text: 'All clear' }]} idx={3}>
              <div style={{ padding: 12 }}>
                {changeOrders.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <THead cols={['WO #', 'Title', 'GC Budget', 'Total Cost', 'Status']} />
                    <tbody>
                      {changeOrders.slice(0, 8).map(co => {
                        const woTotalCost = (co.tc_submitted_price || 0) + (co.wo_materials_total || 0) + (co.wo_equipment_total || 0);
                        return (
                          <TRow key={co.id} cells={[
                            <TdN>{co.co_number || '—'}</TdN>,
                            co.title || '—',
                            <TdM>{coOwnerValue(co) ? fmt(coOwnerValue(co)) : '—'}</TdM>,
                            <TdM>{woTotalCost > 0 ? fmt(woTotalCost) : '—'}</TdM>,
                            <Pill type={isApprovedCO(co.status) ? 'pg' : co.status === 'rejected' ? 'pr' : 'pw'}>{co.status}</Pill>,
                          ]} />
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No work orders yet</div>
                )}
                <button onClick={() => onNavigate('change-orders')} style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 10, ...fontLabel }}>+ Create Work Order</button>
              </div>
            </KpiCard>
          </>
        ) : (
          <>
            {/* ═══ FIXED-CONTRACT MODE: Original cards 1-4 ═══ */}

            {/* Card 1 — Owner Budget */}
            <KpiCard accent={C.amber} icon="💼" iconBg={C.amberPale} label="OWNER BUDGET" value={ownerBudget > 0 ? fmt(ownerBudget) : '—'} sub={ownerBudget > 0 ? `${fmt(financials.ownerBillingsTotal)} billed to owner to date` : 'Set owner contract value in setup'} pills={ownerBudget > 0 ? [{ type: 'pa', text: 'This Project' }] : [{ type: 'pm', text: 'Not Set' }]} idx={0}>
              <div style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                <EditField label="Owner Contract Value" value={`$${draftOwnerBudget.toLocaleString()}`} onSave={(v) => { const n = parseInt(v.replace(/[^0-9]/g, '')) || 0; setDraftOwnerBudget(n); setDirtyOwner(n !== ownerBudgetReal); }} type="number" />
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                  <THead cols={['Budget Item', 'Value']} />
                  <tbody>
                    <TRow cells={[<TdN>Approved COs to Owner</TdN>, <TdM>+{fmt(coRevenueTotal)}</TdM>]} />
                    <TRow cells={[<TdN>Revised Contract Total</TdN>, <TdM>{fmt(ownerBudget + coRevenueTotal)}</TdM>]} isTotal />
                    <TRow cells={[<TdN>Billed to Owner to Date</TdN>, <TdM>{fmt(financials.ownerBillingsTotal)}</TdM>]} />
                    <TRow cells={[<TdN>Unbilled approved CO revenue</TdN>, <TdM>{fmt(Math.max(0, coRevenueTotal - Math.max(0, financials.ownerBillingsTotal - ownerBudget)))}</TdM>]} />
                    <TRow cells={[<TdN>Remaining</TdN>, <TdM>{fmt(ownerBudget + coRevenueTotal - financials.ownerBillingsTotal)}</TdM>]} />
                  </tbody>
                </table>
                {dirtyOwner && (
                  <button onClick={saveOwnerBudget} disabled={savingOwner} style={{ width: '100%', padding: '10px', borderRadius: 8, background: C.amber, color: '#fff', fontWeight: 700, fontSize: '0.78rem', border: 'none', cursor: 'pointer', marginTop: 12, opacity: savingOwner ? 0.6 : 1, ...fontLabel }}>{savingOwner ? 'Saving…' : 'Save Owner Budget'}</button>
                )}
                {dirtyOwner && <div style={{ fontSize: '0.6rem', color: C.amber, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.amber, display: 'inline-block' }} />Unsaved changes</div>}
              </div>
            </KpiCard>

            {/* Card 2 — TC Contract (EDITABLE) */}
            <KpiCard accent={C.green} icon="🤝" iconBg={C.greenBg} label={`${tcName.toUpperCase()} CONTRACT`} value={tcContractVal > 0 ? fmt(draftContractVal) : '—'} sub={tcContractVal > 0 ? `${tcName} · ${liveMarginPct}% your margin` : 'No contract found'} pills={tcContractVal > 0 ? [{ type: 'pg', text: `${fmt(liveMargin)} margin` }, { type: 'pn', text: `${liveMarginPct}%` }] : [{ type: 'pm', text: 'Not Set' }]} idx={1}>
              <div style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: C.faint, marginBottom: 8 }}>Contract Terms</div>
                <EditField label="Trade Contractor" value={contractDraft.contractor} onSave={(v) => updateField('contractor', v)} />
                <EditField label="Contract Value" value={`$${draftContractVal.toLocaleString()}`} onSave={(v) => updateField('value', v.replace(/[^0-9]/g, ''))} type="number" />
                <EditField label="Contract Type" value={contractDraft.type} onSave={(v) => updateField('type', v)} type="select" />
                {dirty && (
                  <button onClick={saveContract} style={{ width: '100%', padding: '10px', borderRadius: 8, background: C.amber, color: '#fff', fontWeight: 700, fontSize: '0.78rem', border: 'none', cursor: 'pointer', marginTop: 12, ...fontLabel }}>Save Contract Changes</button>
                )}
                {dirty && <div style={{ fontSize: '0.6rem', color: C.amber, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.amber, display: 'inline-block' }} />Unsaved changes</div>}

                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: C.faint, marginTop: 16, marginBottom: 8 }}>Margin Breakdown</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <THead cols={['Item', 'Value']} />
                  <tbody>
                    <TRow cells={[<TdN>Owner Budget</TdN>, <TdM>{fmt(ownerBudget)}</TdM>]} />
                    <TRow cells={[<TdN>{tcName}</TdN>, <TdM>{fmt(draftContractVal)}</TdM>]} />
                    <TRow cells={[<TdN>Your Gross Margin</TdN>, <TdM>{fmt(liveMargin)}</TdM>]} isTotal />
                    <TRow cells={[<TdN>CO Revenue (owner)</TdN>, <TdM>+{fmt(coRevenueTotal)}</TdM>]} />
                    <TRow cells={[<TdN>CO Cost (to {tcName})</TdN>, <TdM>-{fmt(coCostTotal)}</TdM>]} />
                    {materialCommitment > 0 && (
                      <TRow cells={[<TdN>{materialLabel}</TdN>, <TdM>-{fmt(materialCommitment)}</TdM>]} />
                    )}
                    <TRow cells={[<TdN>Your Net Margin</TdN>, <TdM>{fmt(projectedMargin)}</TdM>]} isTotal />
                  </tbody>
                </table>
              </div>
            </KpiCard>

            {/* Card 3 — Materials delivery tracking only (margin lives in the canonical grid). */}
            <KpiCard accent={C.purple} icon="🧱" iconBg={C.purpleBg} label="MATERIALS TRACKING" value={materialCommitment > 0 ? fmt(materialCommitment) : '—'} sub={materialCommitment > 0 ? `${materialLabel} · ${fmt(matOrdered)} ordered · ${fmt(matDelivered)} delivered` : `Materials inside ${tcName}'s subcontract`} pills={materialCommitment > 0 ? [{ type: 'pb', text: 'Your commitment' }] : [{ type: 'pm', text: `${tcName} procures` }]} idx={2}>
              <div style={{ padding: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <THead cols={['Metric', 'Value']} />
                  <tbody>
                    <TRow cells={[<TdN>{materialLabel}</TdN>, <TdM>{materialCommitment > 0 ? fmt(materialCommitment) : '—'}</TdM>]} isTotal />
                    <TRow cells={[<TdN>Ordered</TdN>, <TdM>{fmt(matOrdered)}</TdM>]} />
                    <TRow cells={[<TdN>Delivered</TdN>, <TdM>{fmt(matDelivered)}</TdM>]} />
                    <TRow cells={[<TdN>Pending delivery</TdN>, <TdM>{fmt(matPending)}</TdM>]} />
                    <TRow cells={[<TdN>At risk on delivery</TdN>, <TdM>{fmt(materialAtRiskOnDelivery)}</TdM>]} />
                    <TRow cells={[<TdN>Variance (contract − ordered)</TdN>, <TdM>{materialCommitment > 0 ? fmt(materialCommitment - matOrdered) : '—'}</TdM>]} isTotal />
                  </tbody>
                </table>
                {!financials.isGCMaterialResponsible && (
                  <div style={{ marginTop: 10, fontSize: '0.7rem', color: C.muted, lineHeight: 1.45 }}>
                    Materials procured by {tcName} — inside their subcontract, so not counted again here.
                  </div>
                )}
              </div>
            </KpiCard>



            {/* Margin + margin-to-date now come from the canonical grid above. */}


            {/* Card 4 — Change Orders */}
            {gcCoCards}

            <KpiCard accent={C.blue} icon="📝" iconBg={C.blueBg} label="CHANGE ORDERS" value={changeOrders.length > 0 ? `${changeOrders.length} COs` : '0 COs'} sub={`${approvedCOs.length} approved · ${pendingCOs.length} pending`} pills={pendingCOs.length > 0 ? [{ type: 'pw', text: `${pendingCOs.length} pending` }] : [{ type: 'pg', text: 'All clear' }]} idx={3}>
              <div style={{ padding: 12 }}>
                {changeOrders.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <THead cols={['CO #', 'Title', 'GC Budget', 'TC Price', 'Status']} />
                    <tbody>
                      {changeOrders.slice(0, 8).map(co => (
                        <TRow key={co.id} cells={[
                          <TdN>{co.co_number || '—'}</TdN>,
                          co.title || '—',
                          <TdM>{coOwnerValue(co) ? fmt(coOwnerValue(co)) : '—'}</TdM>,
                          <TdM>{co.tc_submitted_price ? fmt(co.tc_submitted_price) : '—'}</TdM>,
                          <Pill type={isApprovedCO(co.status) ? 'pg' : co.status === 'rejected' ? 'pr' : 'pw'}>{co.status}</Pill>,
                        ]} />
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No change orders yet</div>
                )}
                <button onClick={() => onNavigate('change-orders')} style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 10, ...fontLabel }}>+ Create Change Order</button>
              </div>
            </KpiCard>
          </>
        )}

        {/* Cards 5-8 — shared between T&M and fixed-contract modes */}

        {/* Card 5 — Materials Budget */}
        <KpiCard accent={C.purple} icon="📦" iconBg={C.purpleBg} label="MATERIALS" value={matOrdered > 0 ? fmt(matOrdered) : '—'} sub={matEstimate > 0 ? `${fmt(matEstimate)} estimated · ${matPct}% ordered` : 'No material estimates'} pills={matPct > 100 ? [{ type: 'pr', text: 'Over budget' }] : matPct > 0 ? [{ type: 'pg', text: `${matPct}% of est` }] : [{ type: 'pm', text: 'No orders' }]} idx={4}>
          <div style={{ padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Metric', 'Value']} />
              <tbody>
                <TRow cells={[<TdN>Material Estimate</TdN>, <TdM>{fmt(matEstimate)}</TdM>]} />
                <TRow cells={[<TdN>Total Ordered</TdN>, <TdM>{fmt(matOrdered)}</TdM>]} />
                <TRow cells={[<TdN>Delivered</TdN>, <TdM>{fmt(matDelivered)}</TdM>]} />
                <TRow cells={[<TdN>Pending Delivery</TdN>, <TdM>{fmt(matPending)}</TdM>]} />
                <TRow cells={[<TdN>Variance</TdN>, <TdM>{fmt(matEstimate - matOrdered)}</TdM>]} isTotal />
              </tbody>
            </table>
            <button onClick={() => onNavigate('purchase-orders')} style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 10, ...fontLabel }}>+ Create Purchase Order</button>
          </div>
        </KpiCard>

        {/* Card 6 — Open RFIs */}
        <KpiCard accent={C.red} icon="❓" iconBg={C.redBg} label="RFIs" value={`${openRfis.length} Open`} sub={`${rfis.length} total · ${resolvedRfis.length} resolved`} pills={openRfis.length > 0 ? [{ type: 'pr', text: `${openRfis.length} need response` }] : [{ type: 'pg', text: 'All resolved' }]} idx={5}>
          <div style={{ padding: 12 }}>
            {rfis.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <THead cols={['RFI #', 'Subject', 'Status', 'Action']} />
                <tbody>
                  {rfis.slice(0, 6).map(r => (
                    <TRow key={r.id} cells={[
                      <TdN>{r.rfi_number || '—'}</TdN>,
                      r.subject || '—',
                      <Pill type={r.status === 'open' ? 'pr' : r.status === 'in_review' ? 'pw' : 'pg'}>{r.status}</Pill>,
                      <span onClick={() => onNavigate('rfis')} style={{ color: C.blue, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>View →</span>,
                    ]} />
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No RFIs yet</div>
            )}
            <button onClick={() => onNavigate('rfis')} style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 10, ...fontLabel }}>+ Create RFI</button>
          </div>
        </KpiCard>

        {/* Card 7 — Invoices */}
        <KpiCard accent={C.green} icon="✅" iconBg={C.greenBg} label="INVOICES PAID" value={fmt(gcPaidAmount)} sub={`Paid to ${tcName} + suppliers · ${pendingPayableCount} awaiting your approval`} pills={pendingPayableCount > 0 ? [{ type: 'pw', text: `${pendingPayableCount} pending` }] : [{ type: 'pg', text: 'On track' }]} idx={6}>
          <div style={{ padding: 12 }}>
            {financials.recentInvoices.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <THead cols={['Invoice #', 'Amount', 'Status']} />
                <tbody>
                  {financials.recentInvoices.map(inv => (
                    <TRow key={inv.id} cells={[
                      <TdN>{inv.invoice_number}</TdN>,
                      <TdM>{fmt(inv.total_amount)}</TdM>,
                      <Pill type={inv.status === 'PAID' ? 'pg' : inv.status === 'SUBMITTED' ? 'pw' : inv.status === 'APPROVED' ? 'pb' : 'pm'}>{inv.status}</Pill>,
                    ]} />
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No invoices yet</div>
            )}
            <button onClick={() => onNavigate('invoices')} style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 10, ...fontLabel }}>View All Invoices</button>
          </div>
        </KpiCard>

        {/* Card 8 — Team */}
        <KpiCard accent={C.blue} icon="👥" iconBg={C.blueBg} label="PROJECT TEAM" value={team.length === acceptedTeam.length ? `${team.length} Members` : `${acceptedTeam.length}/${team.length} Members`} sub={team.length === 0 ? 'No team members yet' : team.length === acceptedTeam.length ? 'All members accepted' : `${acceptedTeam.length} accepted · ${team.length - acceptedTeam.length} pending`} pills={designatedSupplier ? [{ type: 'pa', text: 'Supplier set' }] : [{ type: 'pm', text: 'No supplier' }]} idx={7}>
          <div style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: 12 }}>
              {team.map(member => {
                const label = roleLabel[member.role] || member.role;
                const memberOrgType = member.role === 'General Contractor' ? 'GC' : member.role === 'Trade Contractor' ? 'TC' : member.role === 'Field Crew' ? 'FC' : 'SUPPLIER';
                const isInvited = member.status === 'Invited';
                const isResending = resending === member.id;
                return (
                  <div key={member.id} className="group" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: roleDotColors[member.role] || C.muted, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isInvited ? C.faint : C.ink }}>{member.invited_org_name || 'Unknown'}</span>
                      {member.invited_name && <span style={{ fontSize: '0.65rem', color: C.faint, lineHeight: 1.2 }}>{member.invited_name}</span>}
                    </span>
                    {isInvited && (
                      <>
                        <span style={{ fontSize: '0.58rem', fontWeight: 600, padding: '1px 6px', borderRadius: 8, border: `1px solid ${C.border}`, color: C.faint }}>Invited</span>
                        {canInvite && (
                          <button
                            disabled={isResending}
                            onClick={() => handleResend(member)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: C.muted, display: 'flex', alignItems: 'center' }}
                            title="Resend invitation"
                          >
                            {isResending ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}
                          </button>
                        )}
                      </>
                    )}
                    {materialResp === memberOrgType && <Package size={12} style={{ color: C.amber }} />}
                  </div>
                );
              })}
            </div>

            {materialResp ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: C.muted, marginBottom: 8 }}>
                <Package size={12} /> Materials managed by: <strong style={{ color: C.ink }}>{materialResp === 'GC' ? myOrgName : tcName}</strong>
                {canInvite && (
                  <span onClick={() => { setMaterialResp(null); }} style={{ color: C.blue, cursor: 'pointer', marginLeft: 4, fontSize: '0.65rem', fontWeight: 600 }}>Change</span>
                )}
              </div>
            ) : canInvite && contractIdForMatResp ? (
              <div style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 8, background: C.amberPale, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: C.ink, marginBottom: 6, ...fontLabel }}>Who handles materials?</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button disabled={settingMatResp} onClick={() => handleSetMaterialResp('GC')} style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.ink, fontWeight: 600, fontSize: '0.7rem', cursor: 'pointer', opacity: settingMatResp ? 0.5 : 1, ...fontLabel }}>{myOrgName}</button>
                  <button disabled={settingMatResp} onClick={() => handleSetMaterialResp('TC')} style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.ink, fontWeight: 600, fontSize: '0.7rem', cursor: 'pointer', opacity: settingMatResp ? 0.5 : 1, ...fontLabel }}>{tcName}</button>
                </div>
              </div>
            ) : !materialResp ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: C.muted, marginBottom: 8 }}>
                <Package size={12} /> Material owner not set
              </div>
            ) : null}

            {designatedSupplier && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: C.muted, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.amber }} />
                Supplier: <strong style={{ color: C.ink }}>{designatedSupplier}</strong>
              </div>
            )}

            {canInvite && (
              <button
                onClick={() => setAddDialogOpen(true)}
                style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...fontLabel }}
              >
                <UserPlus size={13} /> Add Member
              </button>
            )}

            <AddTeamMemberDialog
              open={addDialogOpen}
              onOpenChange={setAddDialogOpen}
              projectId={projectId}
              creatorOrgType={viewerOrgType}
              onMemberAdded={() => fetchTeam()}
            />
          </div>
        </KpiCard>
      </KpiGrid>

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

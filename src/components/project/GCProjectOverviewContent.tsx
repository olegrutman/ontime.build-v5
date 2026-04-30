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
import { KpiGrid } from '@/components/shared/KpiGrid';
import { useBuyerMaterialsAnalytics } from '@/hooks/useBuyerMaterialsAnalytics';
import { BuyerMaterialsAnalyticsSection } from '@/components/project/BuyerMaterialsAnalyticsSection';

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
  const tcContractVal = upContract?.contract_sum || 0;
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

  const saveOwnerBudget = async () => {
    if (!upContract?.id) return;
    setSavingOwner(true);
    const ok = await financials.updateOwnerContract(upContract.id, draftOwnerBudget);
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
    queryKey: ['project-cos-overview', projectId, isTM],
    queryFn: async () => {
      const { data: cos } = await supabase
        .from('change_orders')
        .select('id, co_number, title, status, gc_budget, tc_submitted_price, materials_responsible, equipment_responsible')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (!cos || cos.length === 0) return [];

      if (isTM) {
        // For T&M, also fetch material + equipment totals per WO
        const coIds = cos.map(c => c.id);
        const [matRes, eqRes] = await Promise.all([
          supabase.from('co_material_items').select('co_id, billed_amount').in('co_id', coIds),
          supabase.from('co_equipment_items').select('co_id, billed_amount').in('co_id', coIds),
        ]);
        const matByWO: Record<string, number> = {};
        const eqByWO: Record<string, number> = {};
        (matRes.data || []).forEach(m => { matByWO[m.co_id] = (matByWO[m.co_id] || 0) + (m.billed_amount || 0); });
        (eqRes.data || []).forEach(e => { eqByWO[e.co_id] = (eqByWO[e.co_id] || 0) + (e.billed_amount || 0); });
        return cos.map(c => ({
          ...c,
          wo_materials_total: matByWO[c.id] || 0,
          wo_equipment_total: eqByWO[c.id] || 0,
        }));
      }
      return cos.map(c => ({ ...c, wo_materials_total: 0, wo_equipment_total: 0, materials_responsible: null, equipment_responsible: null }));
    },
  });

  const approvedCOs = changeOrders.filter(co => co.status === 'approved' || co.status === 'completed');
  const pendingCOs = changeOrders.filter(co => !['approved', 'completed', 'rejected'].includes(co.status));
  const coRevenueTotal = approvedCOs.reduce((s, co) => s + (co.gc_budget || 0), 0);
  // For T&M: only count mat/equip in TC cost when TC is the responsible party per WO
  const coLaborCost = approvedCOs.reduce((s, co) => s + (co.tc_submitted_price || 0), 0);
  const coMaterialsCost = approvedCOs.reduce((s, co) => {
    const matResp = (co as any).materials_responsible ?? 'TC';
    return s + (matResp === 'TC' ? (co.wo_materials_total || 0) : 0);
  }, 0);
  const coEquipmentCost = approvedCOs.reduce((s, co) => {
    const eqResp = (co as any).equipment_responsible ?? 'TC';
    return s + (eqResp === 'TC' ? (co.wo_equipment_total || 0) : 0);
  }, 0);
  const coCostTotal = coLaborCost + coMaterialsCost + coEquipmentCost;

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

  // ─── Invoices ───
  const paidInvoices = financials.recentInvoices.filter(i => i.status === 'PAID');
  const pendingInvoices = financials.recentInvoices.filter(i => i.status === 'SUBMITTED');

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
  if (pendingInvoices.length > 0) {
    warnings.push({ color: C.red, icon: '💰', title: `${pendingInvoices.length} Invoice${pendingInvoices.length > 1 ? 's' : ''} Awaiting Approval`, sub: 'Review and approve pending invoices', value: fmt(pendingInvoices.reduce((s, i) => s + i.total_amount, 0)), pill: 'Action Needed', pillType: 'pr', tab: 'invoices' });
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
  const liveMargin = ownerBudget - draftContractVal;
  const liveMarginPct = ownerBudget > 0 ? ((liveMargin / ownerBudget) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      {/* Needs Attention — TOP placement, compact horizontal chips */}
      <OverviewAttentionStrip warnings={warnings} projectName={projectName} onNavigate={onNavigate} />

      {/* KPI Cards — 4-col grid */}
      <KpiGrid>

        {isTM ? (
          <>
            {/* ═══ T&M MODE: WO-driven cards 1-4 ═══ */}

            {/* Card 1 — WO Revenue */}
            <KpiCard accent={C.amber} icon="💰" iconBg={C.amberPale} label="WO REVENUE (BILLED TO OWNER)" value={coRevenueTotal > 0 ? fmt(coRevenueTotal) : '—'} sub={`${approvedCOs.length} approved WOs · sum of GC budgets`} pills={coRevenueTotal > 0 ? [{ type: 'pa', text: `${approvedCOs.length} WOs` }] : [{ type: 'pm', text: 'No WOs' }]} idx={0}>
              <div style={{ padding: 12 }}>
                {changeOrders.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <THead cols={['WO #', 'Title', 'GC Budget', 'Status']} />
                    <tbody>
                      {changeOrders.slice(0, 8).map(co => (
                        <TRow key={co.id} cells={[
                          <TdN>{co.co_number || '—'}</TdN>,
                          co.title || '—',
                          <TdM>{co.gc_budget ? fmt(co.gc_budget) : '—'}</TdM>,
                          <Pill type={co.status === 'approved' || co.status === 'completed' ? 'pg' : co.status === 'rejected' ? 'pr' : 'pw'}>{co.status}</Pill>,
                        ]} />
                      ))}
                      {approvedCOs.length > 0 && (
                        <TRow cells={[<TdN>{approvedCOs.length} approved</TdN>, '—', <TdM>{fmt(coRevenueTotal)}</TdM>, '—']} isTotal />
                      )}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No work orders yet</div>
                )}
              </div>
            </KpiCard>

            {/* Card 2 — TC Cost (labor + materials + equipment) */}
            <KpiCard accent={C.green} icon="🤝" iconBg={C.greenBg} label={`TC COST (TOTAL)`} value={coCostTotal > 0 ? fmt(coCostTotal) : '—'} sub={`Labor ${fmt(coLaborCost)} · Materials ${fmt(coMaterialsCost)} · Equip ${fmt(coEquipmentCost)}`} pills={coCostTotal > 0 ? [{ type: 'pg', text: `${approvedCOs.length} WOs` }] : [{ type: 'pm', text: 'No cost' }]} idx={1}>
              <div style={{ padding: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <THead cols={['Cost Type', 'Value']} />
                  <tbody>
                    <TRow cells={[<TdN>Labor (TC Submitted)</TdN>, <TdM>{fmt(coLaborCost)}</TdM>]} />
                    <TRow cells={[<TdN>Materials (billed)</TdN>, <TdM>{fmt(coMaterialsCost)}</TdM>]} />
                    <TRow cells={[<TdN>Equipment (billed)</TdN>, <TdM>{fmt(coEquipmentCost)}</TdM>]} />
                    <TRow cells={[<TdN>Total TC Cost</TdN>, <TdM>{fmt(coCostTotal)}</TdM>]} isTotal />
                  </tbody>
                </table>
                {approvedCOs.length > 0 && (
                  <>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: C.faint, marginTop: 12, marginBottom: 8 }}>Per Work Order</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <THead cols={['WO #', 'Labor', 'Mat+Eq', 'Total']} />
                      <tbody>
                        {approvedCOs.slice(0, 8).map(co => {
                          const woTotal = (co.tc_submitted_price || 0) + (co.wo_materials_total || 0) + (co.wo_equipment_total || 0);
                          return (
                            <TRow key={co.id} cells={[
                              <TdN>{co.co_number || '—'}</TdN>,
                              <TdM>{fmt(co.tc_submitted_price || 0)}</TdM>,
                              <TdM>{fmt((co.wo_materials_total || 0) + (co.wo_equipment_total || 0))}</TdM>,
                              <TdM>{fmt(woTotal)}</TdM>,
                            ]} />
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            </KpiCard>

            {/* Card 3 — Your Margin (WO-driven) */}
            {(() => {
              const woMargin = coRevenueTotal - coCostTotal;
              const woMarginPct = coRevenueTotal > 0 ? ((woMargin / coRevenueTotal) * 100).toFixed(1) : '0';
              return (
                <KpiCard accent={C.navy} icon="📊" iconBg={C.surface2} label="YOUR MARGIN" value={coRevenueTotal > 0 ? fmt(woMargin) : '—'} sub={coRevenueTotal > 0 ? `${woMarginPct}% · WO revenue minus TC cost` : 'Create WOs to see margin'} pills={coRevenueTotal > 0 ? [{ type: Number(woMarginPct) > 15 ? 'pg' : Number(woMarginPct) > 5 ? 'pw' : 'pr', text: `${woMarginPct}%` }] : []} idx={2}>
                  <div style={{ padding: 12 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <THead cols={['Metric', 'Value']} />
                      <tbody>
                        <TRow cells={[<TdN>WO Revenue (GC Budget)</TdN>, <TdM>{fmt(coRevenueTotal)}</TdM>]} />
                        <TRow cells={[<TdN>TC Labor Cost</TdN>, <TdM>{fmt(coLaborCost)}</TdM>]} />
                        <TRow cells={[<TdN>Materials Cost</TdN>, <TdM>{fmt(coMaterialsCost)}</TdM>]} />
                        <TRow cells={[<TdN>Equipment Cost</TdN>, <TdM>{fmt(coEquipmentCost)}</TdM>]} />
                        <TRow cells={[<TdN>Total TC Cost</TdN>, <TdM>{fmt(coCostTotal)}</TdM>]} />
                        <TRow cells={[<TdN>Your Margin</TdN>, <TdM>{fmt(woMargin)}</TdM>]} isTotal />
                        <TRow cells={[<TdN>Paid to Date</TdN>, <TdM>{fmt(financials.totalPaid)}</TdM>]} />
                        <TRow cells={[<TdN>Outstanding</TdN>, <TdM>{fmt(financials.outstanding)}</TdM>]} />
                      </tbody>
                    </table>
                  </div>
                </KpiCard>
              );
            })()}

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
                            <TdM>{co.gc_budget ? fmt(co.gc_budget) : '—'}</TdM>,
                            <TdM>{woTotalCost > 0 ? fmt(woTotalCost) : '—'}</TdM>,
                            <Pill type={co.status === 'approved' || co.status === 'completed' ? 'pg' : co.status === 'rejected' ? 'pr' : 'pw'}>{co.status}</Pill>,
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
            <KpiCard accent={C.amber} icon="💼" iconBg={C.amberPale} label="OWNER BUDGET" value={ownerBudget > 0 ? fmt(ownerBudget) : '—'} sub={ownerBudget > 0 ? `${fmt(financials.billedToDate)} invoiced to date` : 'Set owner contract value in setup'} pills={ownerBudget > 0 ? [{ type: 'pa', text: 'This Project' }] : [{ type: 'pm', text: 'Not Set' }]} idx={0}>
              <div style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                <EditField label="Owner Contract Value" value={`$${draftOwnerBudget.toLocaleString()}`} onSave={(v) => { const n = parseInt(v.replace(/[^0-9]/g, '')) || 0; setDraftOwnerBudget(n); setDirtyOwner(n !== ownerBudgetReal); }} type="number" />
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                  <THead cols={['Budget Item', 'Value']} />
                  <tbody>
                    <TRow cells={[<TdN>Approved COs to Owner</TdN>, <TdM>+{fmt(coRevenueTotal)}</TdM>]} />
                    <TRow cells={[<TdN>Revised Contract Total</TdN>, <TdM>{fmt(ownerBudget + coRevenueTotal)}</TdM>]} isTotal />
                    <TRow cells={[<TdN>Invoiced to Date</TdN>, <TdM>{fmt(financials.billedToDate)}</TdM>]} />
                    <TRow cells={[<TdN>Remaining</TdN>, <TdM>{fmt(ownerBudget + coRevenueTotal - financials.billedToDate)}</TdM>]} />
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
                    <TRow cells={[<TdN>CO Cost (to {tcName})</TdN>, <TdM>+{fmt(coCostTotal)}</TdM>]} />
                    <TRow cells={[<TdN>Your Net Margin</TdN>, <TdM>{fmt(liveMargin + coRevenueTotal - coCostTotal)}</TdM>]} isTotal />
                  </tbody>
                </table>
              </div>
            </KpiCard>

            {/* Card 3 — Your Margin */}
            <KpiCard accent={C.navy} icon="📊" iconBg={C.surface2} label="YOUR MARGIN" value={ownerBudget > 0 ? fmt(liveMargin + coRevenueTotal - coCostTotal) : '—'} sub={ownerBudget > 0 ? `${liveMarginPct}% gross · incl. CO impact` : 'Set owner budget to see margin'} pills={ownerBudget > 0 ? [{ type: Number(liveMarginPct) > 15 ? 'pg' : Number(liveMarginPct) > 5 ? 'pw' : 'pr', text: `${liveMarginPct}%` }] : []} idx={2}>
              <div style={{ padding: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <THead cols={['Metric', 'Value']} />
                  <tbody>
                    <TRow cells={[<TdN>Owner Budget</TdN>, <TdM>{fmt(ownerBudget)}</TdM>]} />
                    <TRow cells={[<TdN>{tcName}</TdN>, <TdM>{fmt(tcContractVal)}</TdM>]} />
                    <TRow cells={[<TdN>Base Margin</TdN>, <TdM>{fmt(marginDollar)}</TdM>]} />
                    <TRow cells={[<TdN>CO Revenue</TdN>, <TdM>+{fmt(coRevenueTotal)}</TdM>]} />
                    <TRow cells={[<TdN>CO Cost</TdN>, <TdM>-{fmt(coCostTotal)}</TdM>]} />
                    <TRow cells={[<TdN>CO Net</TdN>, <TdM>{fmt(coRevenueTotal - coCostTotal)}</TdM>]} />
                    <TRow cells={[<TdN>Your Total Margin</TdN>, <TdM>{fmt(marginDollar + coRevenueTotal - coCostTotal)}</TdM>]} isTotal />
                    <TRow cells={[<TdN>Paid to Date</TdN>, <TdM>{fmt(financials.totalPaid)}</TdM>]} />
                    <TRow cells={[<TdN>Outstanding</TdN>, <TdM>{fmt(financials.outstanding)}</TdM>]} />
                  </tbody>
                </table>
              </div>
            </KpiCard>

            {/* Card 4 — Change Orders */}
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
                          <TdM>{co.gc_budget ? fmt(co.gc_budget) : '—'}</TdM>,
                          <TdM>{co.tc_submitted_price ? fmt(co.tc_submitted_price) : '—'}</TdM>,
                          <Pill type={co.status === 'approved' || co.status === 'completed' ? 'pg' : co.status === 'rejected' ? 'pr' : 'pw'}>{co.status}</Pill>,
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
        <KpiCard accent={C.green} icon="✅" iconBg={C.greenBg} label="INVOICES PAID" value={fmt(financials.totalPaid)} sub={`${paidInvoices.length} paid · ${pendingInvoices.length} pending`} pills={pendingInvoices.length > 0 ? [{ type: 'pw', text: `${pendingInvoices.length} pending` }] : [{ type: 'pg', text: 'On track' }]} idx={6}>
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
        <KpiCard accent={C.blue} icon="👥" iconBg={C.blueBg} label="PROJECT TEAM" value={team.length === acceptedTeam.length ? `${team.length} Members` : `${acceptedTeam.length}/${team.length} Members`} sub={materialResp ? `Materials: ${materialResp === 'GC' ? myOrgName : tcName}` : 'Material owner not set'} pills={designatedSupplier ? [{ type: 'pa', text: 'Supplier set' }] : [{ type: 'pm', text: 'No supplier' }]} idx={7}>
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

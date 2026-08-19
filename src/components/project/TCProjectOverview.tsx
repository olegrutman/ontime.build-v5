import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { Pencil, X, UserPlus, RotateCw, Loader2, Search, Building2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { AddTeamMemberDialog } from '@/components/project/AddTeamMemberDialog';
import { resendProjectInvite } from '@/lib/inviteUtils';
import type { ProjectFinancials } from '@/hooks/useProjectFinancials';
import type { OrgType } from '@/types/organization';
import { baseContractSum } from '@/lib/contractSums';
import { C, fontVal, fontMono, fontLabel, fmt, KpiCard, Pill, BarRow, THead, TdN, TdM, TRow, WarnItem, cellStyle, type PillType } from '@/components/shared/KpiCard';
import { CanonicalKpiGrid } from '@/components/project/kpi/CanonicalKpiGrid';

import { KpiGrid } from '@/components/shared/KpiGrid';
import { useBuyerMaterialsAnalytics } from '@/hooks/useBuyerMaterialsAnalytics';
import { BuyerMaterialsAnalyticsSection } from '@/components/project/BuyerMaterialsAnalyticsSection';
import { OverviewAttentionStrip } from '@/components/project/OverviewAttentionStrip';
import { ProjectHealthHero, computeHealthStatus, buildHealthSummary } from '@/components/project/overview/ProjectHealthHero';
import { OverviewSummaryStrip } from '@/components/project/overview/OverviewSummaryStrip';
import { QuickActionsBar } from '@/components/project/QuickActionsBar';

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
  'General Contractor': C.blue, 'Trade Contractor': C.green, 'Field Crew': C.navy, 'Supplier': C.amber,
};
const roleLabel: Record<string, string> = {
  'General Contractor': 'General Contractor', 'Trade Contractor': 'Trade Contractor', 'Field Crew': 'Field Crew', 'Supplier': 'Supplier',
};

export function TCProjectOverview({ projectId, projectName = 'Project', financials, onNavigate, isTM = false }: Props) {
  const { userOrgRoles } = useAuth();
  const currentOrgId = userOrgRoles[0]?.organization?.id;
  const viewerOrgType = (userOrgRoles[0]?.organization?.type as OrgType) ?? null;

  // ─── Buyer materials analytics (only when TC is materials-responsible) ───
  const matEstimateForAnalytics = financials.materialEstimate || financials.approvedEstimateSum || 0;
  const buyerAnalyticsQuery = useBuyerMaterialsAnalytics({
    projectId,
    buyerOrgId: currentOrgId,
    estimateTotal: matEstimateForAnalytics,
    enabled: !!financials.isTCMaterialResponsible,
  });

  // ─── GC Contract (upstream, read-only) ───
  const gcContract = financials.upstreamContract;
  // contract_sum is the REVISED value (approved COs already folded in by the DB
  // trigger). CO adds are shown as their own line, so start from the base.
  const gcContractVal = baseContractSum(gcContract);
  const gcName = (() => {
    if (!gcContract) return 'General Contractor';
    if (currentOrgId && gcContract.from_org_id === currentOrgId) return gcContract.to_org_name || 'General Contractor';
    if (currentOrgId && gcContract.to_org_id === currentOrgId) return gcContract.from_org_name || 'General Contractor';
    return gcContract.from_org_name || gcContract.to_org_name || 'General Contractor';
  })();

  // ─── FC Contract (downstream, editable) ───
  const fcContract = financials.downstreamContract;
  const fcContractVal = baseContractSum(fcContract);
  const fcName = (() => {
    if (!fcContract) return '';
    if (currentOrgId && fcContract.from_org_id === currentOrgId) return fcContract.to_org_name || '';
    if (currentOrgId && fcContract.to_org_id === currentOrgId) return fcContract.from_org_name || '';
    return fcContract.to_org_name || fcContract.from_org_name || '';
  })();

  // ─── FC org search ───
  interface FcOrgSelection { org_id: string; org_name: string; contact_email: string; contact_name: string; contact_user_id: string }
  const [selectedFcOrg, setSelectedFcOrg] = useState<FcOrgSelection | null>(null);
  const [fcSearchQuery, setFcSearchQuery] = useState('');
  const [fcSearchResults, setFcSearchResults] = useState<FcOrgSelection[]>([]);
  const [fcSearchLoading, setFcSearchLoading] = useState(false);
  const [fcSearchOpen, setFcSearchOpen] = useState(false);
  const fcSearchRef = useRef<HTMLDivElement>(null);

  // Pre-populate with existing FC
  useEffect(() => {
    if (fcName && fcContract) {
      setSelectedFcOrg({ org_id: fcContract.from_org_id || fcContract.to_org_id || '', org_name: fcName, contact_email: '', contact_name: '', contact_user_id: '' });
    }
  }, [fcName, fcContract]);

  // Search FC orgs
  useEffect(() => {
    if (fcSearchQuery.length < 2) { setFcSearchResults([]); setFcSearchOpen(false); return; }
    const t = setTimeout(async () => {
      setFcSearchLoading(true);
      const { data, error } = await supabase.rpc('search_existing_team_targets', {
        _query: fcSearchQuery, _project_id: projectId, _limit: 10,
      });
      setFcSearchLoading(false);
      if (!error && data) {
        const fcOrgs = (data as any[]).filter(r => r.org_type === 'FC');
        setFcSearchResults(fcOrgs.map(r => ({ org_id: r.org_id, org_name: r.org_name, contact_email: r.contact_email, contact_name: r.contact_name, contact_user_id: r.contact_user_id })));
        setFcSearchOpen(true);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [fcSearchQuery, projectId]);

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (fcSearchRef.current && !fcSearchRef.current.contains(e.target as Node)) setFcSearchOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── FC Contract editing ───
  const [fcDraft, setFcDraft] = useState({
    value: String(fcContractVal),
    type: 'Lump Sum',
    scope: '',
  });
  const [fcDirty, setFcDirty] = useState(false);

  useEffect(() => {
    setFcDraft(prev => ({ ...prev, value: String(fcContractVal) }));
  }, [fcContractVal]);

  const updateFcField = (field: keyof typeof fcDraft, val: string) => {
    setFcDraft(p => ({ ...p, [field]: val }));
    setFcDirty(true);
  };

  const saveFcContract = async () => {
    const newVal = parseInt(fcDraft.value.replace(/[^0-9]/g, '')) || 0;
    const targetOrg = selectedFcOrg;

    if (!targetOrg?.org_id) {
      toast.error('Please select a Field Crew organization first');
      return;
    }

    if (newVal <= 0) {
      toast.error('Please enter a contract value before saving');
      return;
    }

    try {
      // Check if FC is already on the team
      const isAlreadyOnTeam = team.some(m => m.invited_org_name === targetOrg.org_name || m.role === 'Field Crew');

      if (!isAlreadyOnTeam) {
        // Auto-invite: insert into project_team
        const { error: teamErr } = await supabase.from('project_team').insert({
          project_id: projectId,
          role: 'Field Crew',
          org_id: targetOrg.org_id,
          invited_org_name: targetOrg.org_name,
          invited_name: targetOrg.contact_name || null,
          invited_email: targetOrg.contact_email || null,
          user_id: targetOrg.contact_user_id || null,
          status: 'Invited',
        });
        if (teamErr) throw teamErr;

        // Insert project_participants for the contact user
        if (targetOrg.contact_user_id) {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          await supabase.from('project_participants').insert({
            project_id: projectId,
            organization_id: targetOrg.org_id,
            role: 'FC' as const,
            invite_status: 'INVITED',
            invited_by: currentUser?.id || '',
          });

          // Send notification
          await supabase.from('notifications').insert({
            recipient_user_id: targetOrg.contact_user_id,
            recipient_org_id: targetOrg.org_id,
            type: 'PROJECT_INVITE' as const,
            title: 'Project Invitation',
            body: `You have been invited to join a project as Field Crew`,
            entity_id: projectId,
            entity_type: 'project',
            action_url: `/project/${projectId}/overview`,
          });
        }

        toast.success(`${targetOrg.org_name} invited as Field Crew`);
      }

      // Create or update the FC contract
      if (fcContract) {
        // The input holds the BASE value; contract_sum stores base + approved COs.
        const revised = newVal + (fcContract.co_approved_sum || 0);
        const ok = await financials.updateContract(fcContract.id, revised, fcContract.retainage_percent);
        if (!ok) throw new Error('Failed to update contract');
      } else {
        // Create new downstream contract (TC = from, FC = to)
        const { error: insertErr } = await supabase.from('project_contracts').insert({
          project_id: projectId,
          from_org_id: currentOrgId,
          to_org_id: targetOrg.org_id,
          from_role: 'Trade Contractor',
          to_role: 'Field Crew',
          contract_sum: newVal,
        });
        if (insertErr) throw insertErr;
      }

      financials.refetch();
      fetchTeam();
      setFcDirty(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save FC contract');
    }
  };

  const draftFcVal = parseInt(fcDraft.value.replace(/[^0-9]/g, '')) || 0;

  // ─── Change Orders (fetch first so T&M can derive contract values) ───
  const { data: changeOrders = [] } = useQuery({
    queryKey: ['tc-project-cos', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('change_orders')
        .select('id, co_number, title, status, gc_budget, tc_submitted_price, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!projectId,
  });

  const approvedCOs = changeOrders.filter(co => ['approved', 'completed', 'contracted'].includes(co.status));
  const pendingCOs = changeOrders.filter(co => !['approved', 'completed', 'contracted', 'rejected'].includes(co.status));
  // Net CO margin counts all non-rejected COs (approved + pending)
  const countedCOs = changeOrders.filter(co => co.status !== 'rejected');
  // CO revenue/cost come from the canonical aggregation in useProjectFinancials
  // (labor line items + non-GC-procured materials/equipment). The old local
  // helpers read `display_total` / `fc_cost_total`, columns that do not exist on
  // change_orders — cost always resolved to 0, so the card claimed "$0 paid to
  // Field Crew" and net margin equalled gross revenue.
  const coRevenue = financials.approvedCORevenue + financials.pendingCORevenue;
  const coCost = financials.approvedCOCost + financials.pendingCOCost;
  const coNetMargin = coRevenue - coCost;
  // Approved-only rollups (for revised contract totals)
  const approvedCoRevenue = financials.approvedCORevenue;
  const approvedCoCost = financials.approvedCOCost;



  // ─── T&M: derive "contract" values from WOs when no project_contracts exist ───
  const effectiveGCVal = isTM && gcContractVal === 0 ? approvedCoRevenue : gcContractVal;
  const effectiveFCVal = isTM && draftFcVal === 0 ? approvedCoCost : draftFcVal;

  // ─── Margins ───
  const tcGrossMargin = effectiveGCVal - effectiveFCVal;
  const tcMarginPct = effectiveGCVal > 0 ? ((tcGrossMargin / effectiveGCVal) * 100).toFixed(1) : '0';

  // ─── RFIs ───
  const { data: rfis = [] } = useQuery({
    queryKey: ['tc-project-rfis', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_rfis')
        .select('id, rfi_number, subject, status')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!projectId,
  });
  const openRfis = rfis.filter(r => r.status === 'open' || r.status === 'in_review');

  // ─── Invoices ───
  // Counts/amounts are party-scoped in the hook. `recentInvoices` is an unscoped
  // 5-row slice, so it used to miss receivables and count FC payables as ours.
  const paidInvoicesUp = financials.recentInvoices.filter(i => i.status === 'PAID');
  const totalReceivedFromGC = financials.receivablesCollected;
  const pendingFromGCCount = financials.receivablesPendingCount;
  const totalPendingSubmittedFromGC = financials.receivablesPendingAmount;

  // Payables — split supplier (materials) out of money paid to the crew.
  const totalPaidPayables = financials.payablesPaid;
  const totalPaidToFC = financials.payablesPaidToSubs;
  const totalPaidToSuppliers = financials.materialPaid;
  const fcPendingSubmitted = financials.payablesPendingAmount;
  const fcPendingCount = financials.payablesPendingCount;

  // ─── Totals (revised contracts use approved-only COs) ───
  const revisedGCTotal = isTM ? approvedCoRevenue : gcContractVal + approvedCoRevenue;
  // Approved supplier estimates are the TC↔supplier material contract when the
  // TC is materials-responsible — a real committed cost, not a budget note.
  // No approved estimate yet → fall back to committed POs so the card is never
  // blind to real spend.
  const matOrderedTC = financials.materialOrdered || 0;
  const matDeliveredTC = financials.materialDelivered || 0;
  const matPendingTC = financials.materialOrderedPending || 0;
  const materialFromPOs = !!financials.isTCMaterialResponsible && matEstimateForAnalytics <= 0 && matOrderedTC > 0;
  const materialCommitment = financials.isTCMaterialResponsible
    ? (matEstimateForAnalytics > 0 ? matEstimateForAnalytics : matOrderedTC)
    : 0;
  const materialLabel = materialFromPOs
    ? 'Committed POs (no approved estimate)'
    : 'Materials contract (approved supplier estimates)';
  const materialAtRiskOnDelivery = matPendingTC + (materialCommitment > 0 ? Math.max(0, matOrderedTC - materialCommitment) : 0);
  const revisedFCTotal = (isTM ? approvedCoCost : draftFcVal + approvedCoCost) + materialCommitment;
  // One margin number for hero, summary strip and the margin card.
  const netTCMarginAll = revisedGCTotal - revisedFCTotal;
  const netTCMarginAllPct = revisedGCTotal > 0 ? ((netTCMarginAll / revisedGCTotal) * 100).toFixed(1) : '0';
  const netTCMargin = isTM ? coNetMargin : tcGrossMargin + coNetMargin;
  // Pending = everything not paid (contract total minus collected)
  const totalPendingFromGC = Math.max(0, revisedGCTotal - totalReceivedFromGC);
  const fcPendingAmount = Math.max(0, revisedFCTotal - totalPaidToFC);
  // Clamped: collected amounts are tax-inclusive while contracts are pre-tax, so
  // a fully-billed job could otherwise read above 100%.
  const gcReceivedPct = revisedGCTotal > 0 ? Math.min(100, Math.round((totalReceivedFromGC / revisedGCTotal) * 100)) : 0;
  const fcPaidPct = revisedFCTotal > 0 ? Math.min(100, Math.round((totalPaidToFC / revisedFCTotal) * 100)) : 0;

  // ─── Warnings ───
  const warnings: { color: string; icon: string; title: string; sub: string; value: string; pill: string; pillType: PillType; tab: string }[] = [];
  if (totalPendingSubmittedFromGC > 0) {
    warnings.push({ color: C.yellow, icon: '💰', title: `Invoice Awaiting ${gcName} Approval`, sub: `${pendingFromGCCount} invoice${pendingFromGCCount > 1 ? 's' : ''} pending`, value: fmt(totalPendingSubmittedFromGC), pill: `Chasing ${gcName}`, pillType: 'pw', tab: 'invoices' });
  }
  if (fcPendingSubmitted > 0) {
    warnings.push({ color: C.red, icon: '💰', title: `${fcName || 'Field Crew'} Invoice Awaiting Your Approval`, sub: `${fcPendingCount} invoice${fcPendingCount > 1 ? 's' : ''} from ${fcName || 'Field Crew'} / suppliers`, value: fmt(fcPendingSubmitted), pill: `You owe ${fcName || 'Field Crew'}`, pillType: 'pr', tab: 'invoices' });
  }
  if (openRfis.length > 0) {
    warnings.push({ color: C.blue, icon: '❓', title: `${openRfis.length} Open RFI${openRfis.length > 1 ? 's' : ''} Need Response`, sub: `${gcName} waiting on answers`, value: `${openRfis.length} RFIs`, pill: 'Action Needed', pillType: 'pb', tab: 'rfis' });
  }
  if (pendingCOs.length > 0) {
    warnings.push({ color: C.yellow, icon: '📝', title: `${pendingCOs.length} Pending ${isTM ? 'Work Order' : 'Change Order'}${pendingCOs.length > 1 ? 's' : ''}`, sub: 'Review and approve', value: `${pendingCOs.length} ${isTM ? 'WOs' : 'COs'}`, pill: 'Review', pillType: 'pw', tab: 'change-orders' });
  }
  // ─── Team data ───
  const [team, setTeam] = useState<{ id: string; role: string; invited_org_name: string | null; invited_name: string | null; invited_email: string | null; status: string }[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const [materialResp, setMaterialResp] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    const [teamRes, contractRes] = await Promise.all([
      supabase.from('project_team').select('id, role, invited_org_name, invited_name, invited_email, status').eq('project_id', projectId),
      supabase.from('project_contracts').select('material_responsibility').eq('project_id', projectId).not('material_responsibility', 'is', null).limit(1),
    ]);
    setTeam(teamRes.data || []);
    setMaterialResp(contractRes.data?.[0]?.material_responsibility ?? null);
  }, [projectId]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const acceptedTeam = team.filter(m => m.status === 'Accepted');

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

  return (
    <div className="space-y-4">
      <QuickActionsBar projectId={projectId} role="TC" isTM={isTM} onNavigate={onNavigate} />
      {/* Contract party card */}
      <div
        className="rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={{ background: C.surface, border: `1px solid ${C.border}`, ...fontLabel }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1.4px', fontWeight: 800, color: C.faint }}>Contract Party</div>
            <div className="truncate" style={{ fontSize: '0.88rem', fontWeight: 700, color: C.ink }}>Trade Contractor · {userOrgRoles[0]?.organization?.name || 'Your Company'}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
          <button onClick={() => onNavigate('invoices')} style={{ padding: '9px 14px', borderRadius: 10, background: C.amber, color: '#fff', fontWeight: 700, fontSize: '0.72rem', border: 'none', cursor: 'pointer', ...fontLabel }}>Submit Invoice<span className="max-sm:hidden"> to {gcName}</span></button>
          <button onClick={() => onNavigate(isTM ? 'change-orders' : 'sov')} style={{ padding: '9px 14px', borderRadius: 10, background: 'transparent', color: C.muted, fontWeight: 700, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', ...fontLabel }}>{isTM ? 'Work Orders' : <>Contract<span className="max-sm:hidden"> · {gcName}</span></>}</button>
        </div>
      </div>


      {/* Needs Attention — TOP placement, compact horizontal chips */}
      <OverviewAttentionStrip warnings={warnings} projectName={projectName} onNavigate={onNavigate} />

      {/* ─── Project Health Hero + 3-zone Summary ─── */}
      {(() => {
        const approvedNet = approvedCoRevenue - approvedCoCost;
        const pendingNetAtRisk = financials.pendingCONetAtRisk;
        const projectedMargin = revisedGCTotal - revisedFCTotal;
        const projectedMarginPct = revisedGCTotal > 0 ? (projectedMargin / revisedGCTotal) * 100 : 0;
        const cashPosition = financials.marginToDateAmount;
        const hasContract = revisedGCTotal > 0;
        const status = computeHealthStatus(projectedMarginPct, cashPosition, pendingNetAtRisk, approvedNet, hasContract);
        const summary = buildHealthSummary({
          projectedMarginPct, cashPosition, pendingNetAtRisk, approvedNet, hasContract,
          roleLabel: gcName,
        });
        return (
          <>
            <ProjectHealthHero
              status={status}
              projectedMargin={projectedMargin}
              projectedMarginPct={projectedMarginPct}
              summary={summary}
              miniStats={[
                { label: 'Cash Position', value: fmt(cashPosition), tone: cashPosition >= 0 ? 'pos' : 'neg' },
                { label: 'Approved CO Net', value: fmt(approvedNet), tone: approvedNet >= 0 ? 'pos' : 'neg' },
                { label: 'Pending at Risk', value: fmt(pendingNetAtRisk), tone: pendingNetAtRisk >= 0 ? 'neutral' : 'neg' },
              ]}
            />
            <OverviewSummaryStrip
              receivablePartyLabel={gcName}
              payablePartyLabel={`${fcName || 'Field Crew'} + suppliers`}
              contract={{
                label: 'Trade Contract',
                revisedIn: revisedGCTotal,
                revisedOut: revisedFCTotal,
                margin: projectedMargin,
                marginPct: projectedMarginPct,
                materialCommitment,
                materialLabel,
              }}
              cashFlow={{
                received: totalReceivedFromGC,
                paid: totalPaidToFC,
                cashPosition,
                paidToSuppliers: financials.materialPaid,
                paidToSubs: Math.max(0, totalPaidToFC - financials.materialPaid),
                owedToYou: Math.max(0, revisedGCTotal - totalReceivedFromGC),
                youOwe: Math.max(0, revisedFCTotal - totalPaidToFC),
                retainage: financials.receivablesRetainage,
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
          billsTo: gcName,
          paidParties: `${fcName || 'Field Crew'} + suppliers`,
          approvedCOCount: approvedCOs.length,
          pendingCOCount: pendingCOs.length,
          coWord: isTM ? 'WO' : 'CO',
        }}
      />

      {/* ─── Detailed KPI Cards — drilldown grid ─── */}
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: C.faint, fontWeight: 700, paddingTop: 4 }}>
        Detail
      </div>

      <KpiGrid>


        {/* Card 2 — FC Contract (EDITABLE) */}
        <KpiCard accent={C.green} icon="👷" iconBg={C.greenBg} label={isTM ? `${(selectedFcOrg?.org_name || fcName || 'FIELD CREW').toUpperCase()} COST TRACKING` : `${(selectedFcOrg?.org_name || fcName || 'FIELD CREW').toUpperCase()} CONTRACT (YOU SET THIS)`} value={draftFcVal > 0 ? fmt(draftFcVal) : '—'} sub={draftFcVal > 0 ? `${selectedFcOrg?.org_name || fcName || 'Field Crew'} · ${tcMarginPct}% labor-only margin` : 'No contract found'} pills={draftFcVal > 0 ? [{ type: 'pg', text: `${fmt(tcGrossMargin)} margin` }, { type: 'pn', text: `${tcMarginPct}%` }] : [{ type: 'pm', text: 'Not Set' }]} idx={1}>
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: C.faint, marginBottom: 8 }}>{isTM ? 'FC Terms' : 'FC Contract Terms'}</div>
            {/* FC Org Search */}
            {(() => {
              const existingFc = team.find(m => m.role === 'Field Crew');
              const hasFcOnTeam = !!existingFc && !selectedFcOrg;
              return (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}`, ...fontLabel }}>
                  <span style={{ fontSize: '0.72rem', color: C.muted, fontWeight: 600, minWidth: 130, paddingTop: 4 }}>Field Crew</span>
                  {selectedFcOrg || hasFcOnTeam ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
                      <Building2 size={14} style={{ color: C.navy }} />
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: C.ink }}>{selectedFcOrg?.org_name || existingFc?.invited_org_name || 'Field Crew'}</span>
                      {!hasFcOnTeam && (
                        <button onClick={() => { setSelectedFcOrg(null); setFcSearchQuery(''); setFcDirty(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.faint, padding: 2 }}><X size={14} /></button>
                      )}
                    </div>
                  ) : (
                    <div ref={fcSearchRef} style={{ position: 'relative', flex: 1 }}>
                      <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: C.faint }} />
                        <input
                          value={fcSearchQuery}
                          onChange={(e) => setFcSearchQuery(e.target.value)}
                          onFocus={() => fcSearchQuery.length >= 2 && setFcSearchOpen(true)}
                          placeholder="Search FC organizations..."
                          style={{ width: '100%', padding: '4px 8px 4px 28px', borderRadius: 6, border: `1px solid ${C.amber}`, fontSize: '0.76rem', outline: 'none', ...fontLabel }}
                        />
                        {fcSearchLoading && <Loader2 size={14} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: C.faint, animation: 'spin 1s linear infinite' }} />}
                      </div>
                      {fcSearchOpen && fcSearchResults.length > 0 && (
                        <div style={{ position: 'absolute', zIndex: 50, width: '100%', marginTop: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,.1)', maxHeight: 200, overflowY: 'auto' }}>
                          {fcSearchResults.map((r) => (
                            <button key={r.org_id} type="button" onClick={() => { setSelectedFcOrg(r); setFcSearchQuery(''); setFcSearchOpen(false); setFcDirty(true); }}
                              style={{ width: '100%', padding: '8px 12px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, fontSize: '0.76rem', ...fontLabel }}
                              className="hover:bg-[#F7F9FC]">
                              <Building2 size={14} style={{ color: C.navy, flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, color: C.ink }}>{r.org_name}</div>
                                {r.contact_name && <div style={{ fontSize: '0.64rem', color: C.muted }}>{r.contact_name}{r.contact_email ? ` · ${r.contact_email}` : ''}</div>}
                              </div>
                              <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: C.navy, color: '#fff' }}>FC</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {fcSearchOpen && fcSearchResults.length === 0 && fcSearchQuery.length >= 2 && !fcSearchLoading && (
                        <div style={{ position: 'absolute', zIndex: 50, width: '100%', marginTop: 4, padding: '10px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,.1)', fontSize: '0.72rem', color: C.muted, ...fontLabel }}>
                          No FC organizations found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
            <EditField label="Contract Value" value={`$${draftFcVal.toLocaleString()}`} onSave={(v) => updateFcField('value', v.replace(/[^0-9]/g, ''))} type="number" />
            <EditField label="Contract Type" value={fcDraft.type} onSave={(v) => updateFcField('type', v)} type="select" />
            <EditField label="Scope Summary" value={fcDraft.scope || 'Click to add scope'} onSave={(v) => updateFcField('scope', v)} type="textarea" />
            {fcDirty && (
              <button onClick={saveFcContract} style={{ width: '100%', padding: '10px', borderRadius: 8, background: C.amber, color: '#fff', fontWeight: 700, fontSize: '0.78rem', border: 'none', cursor: 'pointer', marginTop: 12, ...fontLabel }}>Save {selectedFcOrg?.org_name || fcName || 'Field Crew'} Contract</button>
            )}
            {fcDirty && <div style={{ fontSize: '0.6rem', color: C.amber, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.amber, display: 'inline-block' }} />Unsaved changes</div>}

            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: C.faint, marginTop: 16, marginBottom: 8 }}>Margin Breakdown</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Item', 'Value']} />
              <tbody>
                <TRow cells={[<TdN>{isTM ? 'WO Revenue' : `${gcName} (your revenue)`}</TdN>, <TdM>{fmt(effectiveGCVal)}</TdM>]} />
                <TRow cells={[<TdN>{isTM ? 'TC Labor Cost' : `${fcName || 'Field Crew'} (your cost)`}</TdN>, <TdM>{fmt(effectiveFCVal)}</TdM>]} />
                <TRow cells={[<TdN>Your Gross Margin</TdN>, <span style={{ ...fontMono, fontSize: '0.78rem', color: C.green }}>{fmt(tcGrossMargin)}</span>]} isTotal />
                <TRow cells={[<TdN>Labor-only Margin % (base contracts)</TdN>, <span style={{ ...fontMono, fontSize: '0.78rem', color: C.green }}>{tcMarginPct}%</span>]} />
                {!isTM && <TRow cells={[<TdN>Approved CO Revenue (from {gcName})</TdN>, <TdM>+{fmt(approvedCoRevenue)}</TdM>]} />}
                {!isTM && <TRow cells={[<TdN>CO Cost (to {fcName || 'Field Crew'})</TdN>, <TdM>-{fmt(coCost)}</TdM>]} />}
                {materialCommitment > 0 && <TRow cells={[<TdN>{materialLabel}</TdN>, <TdM>-{fmt(materialCommitment)}</TdM>]} />}
                <TRow cells={[<TdN>Your Net Margin{isTM ? '' : ` after COs`}</TdN>, <span style={{ ...fontMono, fontSize: '0.78rem', color: netTCMarginAll >= 0 ? C.green : C.red }}>{fmt(netTCMarginAll)}</span>]} isTotal />
              </tbody>
            </table>
          </div>
        </KpiCard>

        {/* Card 3 — Materials tracking only. Margin + margin-to-date moved to the
            canonical grid so there is exactly one margin formula per role. */}
        <KpiCard accent={C.purple} icon="🧱" iconBg={C.purpleBg} label="MATERIALS TRACKING" value={materialCommitment > 0 ? fmt(materialCommitment) : '—'} sub={materialCommitment > 0 ? `${materialLabel} · ${fmt(matOrderedTC)} ordered · ${fmt(matDeliveredTC)} delivered` : `Materials procured by ${gcName} — not in your cost`} pills={materialCommitment > 0 ? [{ type: 'pb', text: 'Your commitment' }] : [{ type: 'pm', text: `${gcName} procures` }]} idx={2}>
          <div style={{ padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Metric', 'Value']} />
              <tbody>
                <TRow cells={[<TdN>{materialLabel}</TdN>, <TdM>{materialCommitment > 0 ? fmt(materialCommitment) : '—'}</TdM>]} isTotal />
                <TRow cells={[<TdN>Ordered</TdN>, <TdM>{fmt(matOrderedTC)}</TdM>]} />
                <TRow cells={[<TdN>Delivered</TdN>, <TdM>{fmt(matDeliveredTC)}</TdM>]} />
                <TRow cells={[<TdN>Pending delivery</TdN>, <TdM>{fmt(matPendingTC)}</TdM>]} />
                <TRow cells={[<TdN>At risk on delivery</TdN>, <TdM>{fmt(materialAtRiskOnDelivery)}</TdM>]} />
                <TRow cells={[<TdN>Variance (contract − ordered)</TdN>, <TdM>{materialCommitment > 0 ? fmt(materialCommitment - matOrderedTC) : '—'}</TdM>]} isTotal />
              </tbody>
            </table>
            {!financials.isTCMaterialResponsible && (
              <div style={{ marginTop: 10, fontSize: '0.7rem', color: C.muted, lineHeight: 1.45 }}>
                Materials procured by {gcName} — outside your contract, so not counted in your cost or margin.
              </div>
            )}
          </div>
        </KpiCard>


        {/* Revenue / cost / margin / CO margin now live in the canonical grid above. */}
        {/* Card 4 — CO / WO register (detail only, no competing math) */}
        <KpiCard accent={C.blue} icon="📋" iconBg={C.blueBg} label={isTM ? 'WO REGISTER' : 'CO REGISTER'} value={`${changeOrders.length} ${isTM ? 'WOs' : 'COs'}`} sub={`${approvedCOs.length} approved · ${pendingCOs.length} pending — see ${isTM ? 'WOs' : 'COs'} card above for margin`} pills={changeOrders.length > 0 ? [{ type: 'pb', text: `${approvedCOs.length} approved` }] : [{ type: 'pm', text: 'None' }]} idx={3}>
          <div style={{ padding: 12 }}>
            {changeOrders.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <THead cols={[`${isTM ? 'WO' : 'CO'} #`, 'Description', 'GC Budget', 'Your Price', 'Variance', 'Status']} />
                <tbody>
                  {changeOrders.slice(0, 8).map(co => {
                    const gcB = co.gc_budget || 0;
                    const tcP = co.tc_submitted_price || 0;
                    const variance = tcP > 0 && gcB > 0 ? gcB - tcP : 0;
                    return (
                      <TRow key={co.id} cells={[
                        <TdN>{co.co_number || '—'}</TdN>,
                        co.title || '—',
                        <TdM>{gcB > 0 ? fmt(gcB) : '—'}</TdM>,
                        <TdM>{tcP > 0 ? fmt(tcP) : '—'}</TdM>,
                        <span style={{ ...fontMono, fontSize: '0.78rem', color: variance >= 0 ? C.green : C.red }}>{tcP > 0 && gcB > 0 ? `${variance >= 0 ? '+' : ''}${fmt(variance)}` : '—'}</span>,
                        <Pill type={['approved', 'completed', 'contracted'].includes(co.status) ? 'pg' : co.status === 'rejected' ? 'pr' : 'pw'}>{co.status}</Pill>,
                      ]} />
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No {isTM ? 'work orders' : 'change orders'} yet</div>
            )}
            <button onClick={() => onNavigate('change-orders')} style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 10, ...fontLabel }}>+ Submit {isTM ? 'WO' : 'CO'} to {gcName}</button>
          </div>
        </KpiCard>


        {/* Card 5 — Received from GC */}
        <KpiCard accent={C.green} icon="✅" iconBg={C.greenBg} label={`RECEIVED FROM ${gcName.toUpperCase()}`} value={fmt(totalReceivedFromGC)} sub={`${gcReceivedPct}% of ${gcName} contract collected`} pills={[{ type: 'pg', text: `${gcReceivedPct}% received` }]} idx={4}>
          <div style={{ padding: 12 }}>
            {paidInvoicesUp.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <THead cols={['Invoice #', 'Amount', 'Status']} />
                <tbody>
                  {paidInvoicesUp.map(inv => (
                    <TRow key={inv.id} cells={[
                      <TdN>{inv.invoice_number}</TdN>,
                      <TdM>{fmt(inv.total_amount)}</TdM>,
                      <Pill type="pg">Paid</Pill>,
                    ]} />
                  ))}
                  <TRow cells={[<TdN>{paidInvoicesUp.length} paid</TdN>, <TdM>{fmt(totalReceivedFromGC)}</TdM>, '—']} isTotal />
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No payments received yet</div>
            )}
          </div>
        </KpiCard>

        {/* Card 6 — Awaiting GC approval (submitted invoices) + unbilled backlog.
            These are two different numbers, so they no longer share one headline. */}
        <KpiCard accent={C.yellow} icon="⏳" iconBg={C.yellowBg} label={`AWAITING ${gcName.toUpperCase()} APPROVAL`} value={totalPendingSubmittedFromGC > 0 ? fmt(totalPendingSubmittedFromGC) : '$0'} sub={pendingFromGCCount > 0 ? `${pendingFromGCCount} invoice${pendingFromGCCount > 1 ? 's' : ''} submitted · ${fmt(totalPendingFromGC)} still unbilled` : `No invoices pending · ${fmt(totalPendingFromGC)} still unbilled`} pills={pendingFromGCCount > 0 ? [{ type: 'pw', text: `Chasing ${gcName}` }] : [{ type: 'pg', text: 'All clear' }]} idx={5}>
          <div style={{ padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Metric', 'Value']} />
              <tbody>
                <TRow cells={[<TdN>Submitted, awaiting approval</TdN>, <TdM>{fmt(totalPendingSubmittedFromGC)}</TdM>]} />
                <TRow cells={[<TdN>Invoices pending</TdN>, <TdM>{pendingFromGCCount}</TdM>]} />
                <TRow cells={[<TdN>Collected to date</TdN>, <TdM>{fmt(totalReceivedFromGC)}</TdM>]} />
                <TRow cells={[<TdN>Not yet billed (backlog)</TdN>, <TdM>{fmt(totalPendingFromGC)}</TdM>]} isTotal />
              </tbody>
            </table>
            <button onClick={() => onNavigate('invoices')} style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 10, ...fontLabel }}>View Invoices</button>
          </div>
        </KpiCard>

        {/* Card 7 — Paid to FC */}
        <KpiCard accent={C.navy} icon="💸" iconBg={C.surface2} label={`PAID TO ${(fcName || 'FIELD CREW').toUpperCase()}`} value={fmt(totalPaidToFC)} sub={`${fcName || 'Field Crew'} · ${fcPaidPct}% of contract paid`} pills={[{ type: 'pn', text: `${fcPaidPct}% paid out` }]} idx={6}>
          <div style={{ padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Metric', 'Value']} />
              <tbody>
                <TRow cells={[<TdN>{fcName || 'Field Crew'} Contract Value</TdN>, <TdM>{fmt(draftFcVal)}</TdM>]} />
                <TRow cells={[<TdN>Total Paid to {fcName || 'Field Crew'}</TdN>, <TdM>{fmt(totalPaidToFC)}</TdM>]} />
                <TRow cells={[<TdN>Remaining</TdN>, <TdM>{fmt(draftFcVal - totalPaidToFC)}</TdM>]} isTotal />
              </tbody>
            </table>
          </div>
        </KpiCard>

        {/* Card 8 — FC Invoice Pending (You Owe FC) */}
        <KpiCard accent={C.red} icon="⏳" iconBg={C.redBg} label={`PENDING — YOU OWE ${(fcName || 'FIELD CREW').toUpperCase()}`} value={fcPendingAmount > 0 ? fmt(fcPendingAmount) : '$0'} sub={fcPendingAmount > 0 ? `${fcName || 'Field Crew'} submitted · awaiting your approval` : `No pending ${fcName || 'Field Crew'} invoices`} pills={fcPendingAmount > 0 ? [{ type: 'pr', text: `${fcName || 'Field Crew'} waiting on you` }] : [{ type: 'pg', text: 'All clear' }]} idx={7}>
          <div style={{ padding: 12 }}>
            {fcPendingAmount > 0 ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: C.ink, fontSize: '0.82rem' }}>FC Invoice</span>
                    <Pill type="pw">Pending Your Approval</Pill>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: C.muted, marginBottom: 2 }}>From: {fcName}</div>
                  <div style={{ fontSize: '1.6rem', color: C.ink, ...fontVal }}>{fmt(fcPendingAmount)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <button onClick={() => onNavigate('invoices')} style={{ flex: 1, padding: '10px', borderRadius: 8, background: C.green, color: '#fff', fontWeight: 700, fontSize: '0.76rem', border: 'none', cursor: 'pointer', ...fontLabel }}>✓ Approve</button>
                  <button onClick={() => onNavigate('invoices')} style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'transparent', color: C.red, fontWeight: 700, fontSize: '0.76rem', border: `1px solid ${C.red}`, cursor: 'pointer', ...fontLabel }}>✗ Reject with Note</button>
                </div>
                <div style={{ fontSize: '0.68rem', color: C.muted, ...fontLabel }}>
                  Note: Approve FC invoice once GC pays you, or approve early based on your cash flow.
                </div>
              </>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No pending {fcName || 'Field Crew'} invoices</div>
            )}
          </div>
        </KpiCard>

        {/* Card 9 — Team */}
        <KpiCard accent={C.blue} icon="👥" iconBg={C.blueBg} label="PROJECT TEAM" value={team.length === acceptedTeam.length ? `${team.length} Members` : `${acceptedTeam.length}/${team.length} Members`} sub="Manage your project team" pills={team.length > 0 ? [{ type: 'pb', text: `${team.length} total` }] : [{ type: 'pm', text: 'No members' }]} idx={8}>
          <div style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: 12 }}>
              {team.map(member => {
                const label = roleLabel[member.role] || member.role;
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
                        <button
                          disabled={isResending}
                          onClick={() => handleResend(member)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: C.muted, display: 'flex', alignItems: 'center' }}
                          title="Resend invitation"
                        >
                          {isResending ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
              {team.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No team members yet</div>
              )}
            </div>

            {materialResp && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${C.border}`, marginBottom: 8 }}>
                <Package size={13} style={{ color: C.muted, flexShrink: 0 }} />
                <span style={{ fontSize: '0.72rem', color: C.muted }}>Materials:</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: C.ink }}>
                  {materialResp === 'GC' ? 'General Contractor' : materialResp === 'TC' ? 'Trade Contractor' : materialResp}
                </span>
              </div>
            )}

            <button
              onClick={() => setAddDialogOpen(true)}
              style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...fontLabel }}
            >
              <UserPlus size={13} /> Invite {fcName || 'Field Crew'}
            </button>

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

      {/* Cash Flow Ladder */}
      {/* Mobile: compact horizontal summary */}
      <div className="sm:hidden" style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: '14px 16px', ...fontLabel }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: C.ink, marginBottom: 10 }}>💧 {isTM ? 'WO Cash Flow' : 'Cash Flow'}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: C.faint, fontWeight: 600 }}>{isTM ? 'Revenue' : 'GC'}</div>
            <div style={{ fontSize: '0.95rem', color: C.ink, ...fontVal }}>{fmt(effectiveGCVal)}</div>
          </div>
          <div style={{ fontSize: '0.9rem', color: C.muted }}>→</div>
          <div style={{ textAlign: 'center', flex: 1, background: C.amberPale, borderRadius: 8, padding: '4px 6px', border: `1.5px solid ${C.amber}` }}>
            <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: C.amberD, fontWeight: 600 }}>You</div>
            <div style={{ fontSize: '0.95rem', color: C.ink, ...fontVal }}>{fmt(effectiveGCVal)}</div>
          </div>
          <div style={{ fontSize: '0.9rem', color: C.muted }}>→</div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: C.faint, fontWeight: 600 }}>{isTM ? 'Labor' : 'FC'}</div>
            <div style={{ fontSize: '0.95rem', color: C.ink, ...fontVal }}>{fmt(effectiveFCVal)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <div style={{ background: C.greenBg, border: `1px solid ${C.green}`, borderRadius: 8, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: C.green, fontWeight: 700 }}>Margin</span>
            <span style={{ fontSize: '0.82rem', color: C.green, ...fontMono }}>{fmt(netTCMargin)}</span>
          </div>
        </div>
      </div>
      {/* Desktop: full Cash Flow Ladder */}
      <div className="hidden sm:block" style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: '20px 24px', ...fontLabel }}>
        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: C.ink, marginBottom: 16 }}>💧 {isTM ? 'WO Cash Flow' : 'Cash Flow'} — {projectName}</div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }} className="max-md:flex-col">
          {/* GC Column */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ background: C.navy, color: '#fff', borderRadius: 10, padding: '14px 12px', marginBottom: 8 }}>
              <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.7, marginBottom: 4 }}>{isTM ? 'WO Revenue' : 'General Contractor'}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, marginBottom: 2 }}>{isTM ? `${approvedCOs.length} approved WOs` : gcName}</div>
              <div style={{ fontSize: '1.1rem', ...fontVal }}>{fmt(effectiveGCVal)}</div>
            </div>
            <div style={{ fontSize: '1.2rem', color: C.muted }}>↓</div>
            <div style={{ fontSize: '0.65rem', color: C.faint, marginTop: 2 }}>{isTM ? 'GC Budget total' : `TC Contract: ${fmt(effectiveGCVal)}`}</div>
          </div>
          {/* TC Column (You) */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ background: C.amberPale, border: `2px solid ${C.amber}`, borderRadius: 10, padding: '14px 12px', marginBottom: 8 }}>
              <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: C.amberD, marginBottom: 4 }}>YOU (Trade Contractor)</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: C.ink, marginBottom: 2 }}>{userOrgRoles[0]?.organization?.name || 'Your Company'}</div>
              <div style={{ fontSize: '1.1rem', color: C.ink, ...fontVal }}>{fmt(effectiveGCVal)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ fontSize: '1.2rem', color: C.muted }}>↓</div>
              <div style={{ background: C.greenBg, border: `1px solid ${C.green}`, borderRadius: 8, padding: '6px 12px' }}>
                <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: C.green, fontWeight: 700 }}>Your Margin</div>
                <div style={{ fontSize: '0.88rem', color: C.green, ...fontMono }}>{fmt(netTCMargin)}</div>
              </div>
            </div>
            <div style={{ fontSize: '0.65rem', color: C.faint, marginTop: 4 }}>{isTM ? `TC Labor: ${fmt(effectiveFCVal)}` : `FC Contract: ${fmt(effectiveFCVal)}`}</div>
          </div>
          {/* FC / Labor Column */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ background: C.navy, color: '#fff', borderRadius: 10, padding: '14px 12px', marginBottom: 8 }}>
              <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.7, marginBottom: 4 }}>{isTM ? 'TC Labor Cost' : 'Field Crew'}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, marginBottom: 2 }}>{isTM ? 'Your submitted labor' : fcName}</div>
              <div style={{ fontSize: '1.1rem', ...fontVal }}>{fmt(effectiveFCVal)}</div>
            </div>
            <div style={{ fontSize: '0.65rem', color: C.faint, marginTop: 4 }}>Internal costs managed by Field Crew</div>
          </div>
        </div>
      </div>

      {/* Buyer Materials Analytics — only when TC handles materials */}
      {financials.isTCMaterialResponsible && (
        <BuyerMaterialsAnalyticsSection
          analytics={buyerAnalyticsQuery.data}
          loading={buyerAnalyticsQuery.isLoading}
          onNavigate={onNavigate}
        />
      )}

    </div>
  );
}

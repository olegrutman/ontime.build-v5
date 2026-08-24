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
import { C, fontLabel, fmt, type PillType } from '@/components/shared/KpiCard';
import { CanonicalKpiGrid } from '@/components/project/kpi/CanonicalKpiGrid';

import { useBuyerMaterialsAnalytics } from '@/hooks/useBuyerMaterialsAnalytics';
import { BuyerMaterialsAnalyticsSection } from '@/components/project/BuyerMaterialsAnalyticsSection';
import { OverviewAttentionStrip } from '@/components/project/OverviewAttentionStrip';
import { ProjectHealthHero, computeHealthStatus, buildHealthSummary } from '@/components/project/overview/ProjectHealthHero';
import { OverviewSummaryStrip } from '@/components/project/overview/OverviewSummaryStrip';
import { QuickActionsBar } from '@/components/project/QuickActionsBar';


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
  'General Contractor': C.blue, 'Trade Contractor': C.green, 'Field Crew': C.navy, 'Supplier': C.amber,
};
const roleLabel: Record<string, string> = {
  'General Contractor': 'General Contractor', 'Trade Contractor': 'Trade Contractor', 'Field Crew': 'Field Crew', 'Supplier': 'Supplier',
};

export function TCProjectOverview({ projectId, projectName = 'Project', financials, onNavigate, isTM = false }: Props) {
  const { user, userOrgRoles } = useAuth();
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
    const newVal = parseMoney(fcDraft.value);
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
        // The input holds the BASE value; updateContract re-adds approved COs itself.
        const ok = await financials.updateContract(fcContract.id, newVal, fcContract.retainage_percent);

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

  const draftFcVal = parseMoney(fcDraft.value);

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

  // ─── Invoices submitted TO me, awaiting my approval (real rows, real actions) ───
  const pendingPayableInvoices = financials.payablesPendingInvoices;
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const approveInvoice = async (invoiceId: string) => {
    setActingId(invoiceId);
    try {
      // Actor comes from the session, never from the row — RLS decides if this
      // update is allowed, and a 0-row result means it was not.
      const { data, error } = await supabase
        .from('invoices')
        .update({ status: 'APPROVED', approved_at: new Date().toISOString(), approved_by: user?.id ?? null })
        .eq('id', invoiceId)
        .eq('status', 'SUBMITTED')
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('You are not allowed to approve this invoice, or it is no longer submitted.');
      toast.success('Invoice approved');
      financials.refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve invoice');
    } finally {
      setActingId(null);
    }
  };

  const rejectInvoice = async (invoiceId: string) => {
    if (!rejectNote.trim()) return;
    setActingId(invoiceId);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({ status: 'REJECTED', rejected_at: new Date().toISOString(), rejected_by: user?.id ?? null, rejection_reason: rejectNote.trim() })
        .eq('id', invoiceId)
        .eq('status', 'SUBMITTED')
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('You are not allowed to reject this invoice, or it is no longer submitted.');
      toast.success('Invoice rejected with note');
      setRejectingId(null);
      setRejectNote('');
      financials.refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject invoice');
    } finally {
      setActingId(null);
    }
  };

  // ─── My cost (external crews are subcontract cost, never internal labor) ───
  const myCoCost = financials.coCostBreakdown;
  const myCoPendingCost = financials.coPendingCostBreakdown;
  const myCostTotal = draftFcVal + myCoCost.total + materialCommitment;
  const myCostBasisPill = financials.isTCMaterialResponsible ? 'Incl. materials' : 'Labor + my COs';

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

      {/* Legacy financial detail cards and cash-flow ladder removed: overview money now renders only from CanonicalKpiGrid. */}

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

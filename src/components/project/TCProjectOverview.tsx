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
import { C, fontVal, fontMono, fontLabel, fmt, KpiCard, Pill, BarRow, THead, TdN, TdM, TRow, WarnItem, cellStyle, type PillType } from '@/components/shared/KpiCard';
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
  'General Contractor': C.blue, 'Trade Contractor': C.green, 'Field Crew': C.navy, 'Supplier': C.amber,
};
const roleLabel: Record<string, string> = {
  'General Contractor': 'General Contractor', 'Trade Contractor': 'Trade Contractor', 'Field Crew': 'Field Crew', 'Supplier': 'Supplier',
};

export function TCProjectOverview({ projectId, projectName = 'Project', financials, onNavigate, isTM = false }: Props) {
  const { userOrgRoles } = useAuth();
  const currentOrgId = userOrgRoles[0]?.organization?.id;
  const viewerOrgType = (userOrgRoles[0]?.organization?.type as OrgType) ?? null;

  // ─── GC Contract (upstream, read-only) ───
  const gcContract = financials.upstreamContract;
  const gcContractVal = gcContract?.contract_sum || 0;
  const gcName = (() => {
    if (!gcContract) return 'General Contractor';
    if (currentOrgId && gcContract.from_org_id === currentOrgId) return gcContract.to_org_name || 'General Contractor';
    if (currentOrgId && gcContract.to_org_id === currentOrgId) return gcContract.from_org_name || 'General Contractor';
    return gcContract.from_org_name || gcContract.to_org_name || 'General Contractor';
  })();

  // ─── FC Contract (downstream, editable) ───
  const fcContract = financials.downstreamContract;
  const fcContractVal = fcContract?.contract_sum || 0;
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
  const coRevenue = approvedCOs.reduce((s, co) => s + (co.gc_budget || 0), 0);
  const coCost = approvedCOs.reduce((s, co) => s + (co.tc_submitted_price || 0), 0);
  const coNetMargin = coRevenue - coCost;

  // ─── T&M: derive "contract" values from WOs when no project_contracts exist ───
  const effectiveGCVal = isTM && gcContractVal === 0 ? coRevenue : gcContractVal;
  const effectiveFCVal = isTM && draftFcVal === 0 ? coCost : draftFcVal;

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
  const paidInvoicesUp = financials.recentInvoices.filter(i => i.status === 'PAID');
  const pendingInvoicesUp = financials.recentInvoices.filter(i => i.status === 'SUBMITTED');
  const totalReceivedFromGC = financials.receivablesCollected;
  const totalPendingFromGC = pendingInvoicesUp.reduce((s, i) => s + i.total_amount, 0);

  // FC invoices (payables)
  const totalPaidToFC = financials.payablesPaid;
  const fcPendingAmount = financials.payablesInvoiced - financials.payablesPaid;

  // ─── Totals ───
  const revisedGCTotal = isTM ? coRevenue : gcContractVal + coRevenue;
  const revisedFCTotal = isTM ? coCost : draftFcVal + coCost;
  const netTCMargin = isTM ? coNetMargin : tcGrossMargin + coNetMargin;
  const gcReceivedPct = revisedGCTotal > 0 ? Math.round((totalReceivedFromGC / revisedGCTotal) * 100) : 0;
  const fcPaidPct = revisedFCTotal > 0 ? Math.round((totalPaidToFC / revisedFCTotal) * 100) : 0;

  // ─── Warnings ───
  const warnings: { color: string; icon: string; title: string; sub: string; value: string; pill: string; pillType: PillType; tab: string }[] = [];
  if (totalPendingFromGC > 0) {
    warnings.push({ color: C.yellow, icon: '💰', title: `Invoice Awaiting ${gcName} Approval`, sub: `${pendingInvoicesUp.length} invoice${pendingInvoicesUp.length > 1 ? 's' : ''} pending`, value: fmt(totalPendingFromGC), pill: `Chasing ${gcName}`, pillType: 'pw', tab: 'invoices' });
  }
  if (fcPendingAmount > 0) {
    warnings.push({ color: C.red, icon: '💰', title: `${fcName || 'Field Crew'} Invoice Awaiting Your Approval`, sub: `${fcName || 'Field Crew'} submitted`, value: fmt(fcPendingAmount), pill: `You owe ${fcName || 'Field Crew'}`, pillType: 'pr', tab: 'invoices' });
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, ...fontLabel }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.green, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: C.ink }}>{projectName}</div>
            <div style={{ fontSize: '0.72rem', color: C.muted }}>Trade Contractor · {userOrgRoles[0]?.organization?.name || 'Your Company'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onNavigate('invoices')} style={{ padding: '8px 16px', borderRadius: 8, background: C.amber, color: '#fff', fontWeight: 700, fontSize: '0.76rem', border: 'none', cursor: 'pointer', ...fontLabel }}>Submit Invoice<span className="max-sm:hidden"> to {gcName}</span></button>
          <button onClick={() => onNavigate(isTM ? 'change-orders' : 'sov')} style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.76rem', border: `1px solid ${C.border}`, cursor: 'pointer', ...fontLabel }}>{isTM ? 'View Work Orders' : <>View Contract<span className="max-sm:hidden"> · {gcName}</span></>}</button>
        </div>
      </div>

      {/* 8 KPI Cards — 4-col grid */}
      <KpiGrid>

        {/* Card 1 — GC Contract / T&M Revenue */}
        <KpiCard accent={C.amber} icon="🤝" iconBg={C.amberPale} label={isTM ? `WO REVENUE (FROM ${gcName.toUpperCase()})` : `${gcName.toUpperCase()} CONTRACT (YOUR REVENUE)`} value={effectiveGCVal > 0 ? fmt(effectiveGCVal) : '—'} sub={isTM ? `Sum of ${approvedCOs.length} approved WO${approvedCOs.length !== 1 ? 's' : ''}` : `${gcName} · read-only`} pills={effectiveGCVal > 0 ? [{ type: 'pa', text: 'Revenue' }, { type: 'pn', text: isTM ? `${approvedCOs.length} WOs` : `${gcName} set this` }] : [{ type: 'pm', text: isTM ? 'No approved WOs' : 'Not Set' }]} idx={0}>
          <div style={{ padding: '12px 16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Item', 'Value']} />
              <tbody>
                <TRow cells={[<TdN>{isTM ? 'Approved WO Revenue' : `Contract Value (set by ${gcName})`}</TdN>, <TdM>{fmt(effectiveGCVal)}</TdM>]} />
                {!isTM && <TRow cells={[<TdN>Approved COs (billed to {gcName})</TdN>, <TdM>+{fmt(coRevenue)}</TdM>]} />}
                {!isTM && <TRow cells={[<TdN>Revised Total</TdN>, <TdM>{fmt(revisedGCTotal)}</TdM>]} isTotal />}
                <TRow cells={[<TdN>Received from {gcName}</TdN>, <TdM>{fmt(totalReceivedFromGC)}</TdM>]} />
                <TRow cells={[<TdN>Pending from {gcName}</TdN>, <TdM>{fmt(totalPendingFromGC)}</TdM>]} />
                <TRow cells={[<TdN>Remaining to Bill</TdN>, <TdM>{fmt((isTM ? effectiveGCVal : revisedGCTotal) - totalReceivedFromGC - totalPendingFromGC)}</TdM>]} isTotal />
              </tbody>
            </table>
            <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: C.blueBg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.72rem', color: C.muted, ...fontLabel }}>
              <span style={{ fontSize: 14 }}>ℹ️</span>
              <span>{isTM ? `Revenue is the sum of approved Work Order gc_budget values (${approvedCOs.length} WOs).` : <>This contract value was set by {gcName}. Contact <strong style={{ color: C.ink }}>{gcName}</strong> to request changes.</>}</span>
            </div>
          </div>
        </KpiCard>

        {/* Card 2 — FC Contract (EDITABLE) */}
        <KpiCard accent={C.green} icon="👷" iconBg={C.greenBg} label={isTM ? `${(selectedFcOrg?.org_name || fcName || 'FIELD CREW').toUpperCase()} COST TRACKING` : `${(selectedFcOrg?.org_name || fcName || 'FIELD CREW').toUpperCase()} CONTRACT (YOU SET THIS)`} value={draftFcVal > 0 ? fmt(draftFcVal) : '—'} sub={draftFcVal > 0 ? `${selectedFcOrg?.org_name || fcName || 'Field Crew'} · ${tcMarginPct}% your margin` : 'No contract found'} pills={draftFcVal > 0 ? [{ type: 'pg', text: `${fmt(tcGrossMargin)} margin` }, { type: 'pn', text: `${tcMarginPct}%` }] : [{ type: 'pm', text: 'Not Set' }]} idx={1}>
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
                <TRow cells={[<TdN>Your Margin %</TdN>, <span style={{ ...fontMono, fontSize: '0.78rem', color: C.green }}>{tcMarginPct}%</span>]} />
                {!isTM && <TRow cells={[<TdN>CO Revenue (from {gcName})</TdN>, <TdM>+{fmt(coRevenue)}</TdM>]} />}
                {!isTM && <TRow cells={[<TdN>CO Cost (to {fcName || 'Field Crew'})</TdN>, <TdM>+{fmt(coCost)}</TdM>]} />}
                <TRow cells={[<TdN>Your Net Margin{isTM ? '' : ` after COs`}</TdN>, <span style={{ ...fontMono, fontSize: '0.78rem', color: C.green }}>{fmt(netTCMargin)}</span>]} isTotal />
              </tbody>
            </table>
          </div>
        </KpiCard>

        {/* Card 3 — TC Gross Margin */}
        <KpiCard accent={C.green} icon="📈" iconBg={C.greenBg} label={isTM ? 'WO MARGIN' : 'YOUR GROSS MARGIN'} value={effectiveGCVal > 0 ? fmt(tcGrossMargin) : '—'} sub={effectiveGCVal > 0 ? (isTM ? `${tcMarginPct}% · WO revenue minus TC labor cost` : `${tcMarginPct}% · ${gcName} contract minus ${fcName || 'Field Crew'} contract`) : (isTM ? 'No approved WOs yet' : 'Set contracts to see margin')} pills={effectiveGCVal > 0 ? [{ type: 'pg', text: `${tcMarginPct}%` }] : []} idx={2}>
          <div style={{ padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Metric', 'Value']} />
              <tbody>
                <TRow cells={[<TdN>{isTM ? 'WO Revenue' : gcName}</TdN>, <TdM>{fmt(effectiveGCVal)}</TdM>]} />
                <TRow cells={[<TdN>{isTM ? 'TC Labor Cost' : (fcName || 'Field Crew')}</TdN>, <TdM>{fmt(effectiveFCVal)}</TdM>]} />
                <TRow cells={[<TdN>{isTM ? 'WO Margin' : 'Base Margin'}</TdN>, <TdM>{fmt(tcGrossMargin)}</TdM>]} isTotal />
                {!isTM && <TRow cells={[<TdN>CO Revenue</TdN>, <TdM>+{fmt(coRevenue)}</TdM>]} />}
                {!isTM && <TRow cells={[<TdN>CO Cost</TdN>, <TdM>-{fmt(coCost)}</TdM>]} />}
                <TRow cells={[<TdN>Your Net Margin</TdN>, <TdM>{fmt(netTCMargin)}</TdM>]} isTotal />
              </tbody>
            </table>
          </div>
        </KpiCard>

        {/* Card 4 — CO Net Margin */}
        <KpiCard accent={C.blue} icon="📋" iconBg={C.blueBg} label={isTM ? 'WO BREAKDOWN' : 'CO NET MARGIN'} value={coRevenue > 0 ? `+${fmt(coNetMargin)}` : `0 ${isTM ? 'WOs' : 'COs'}`} sub={coRevenue > 0 ? (isTM ? `Revenue ${fmt(coRevenue)} · Labor Cost ${fmt(coCost)}` : `Billed ${fmt(coRevenue)} to ${gcName} · Paid ${fmt(coCost)} to ${fcName || 'Field Crew'}`) : `No approved ${isTM ? 'work orders' : 'change orders'}`} pills={approvedCOs.length > 0 ? [{ type: 'pb', text: `${approvedCOs.length} ${isTM ? 'WOs' : 'COs'}` }] : [{ type: 'pm', text: 'None' }]} idx={3}>
          <div style={{ padding: 12 }}>
            {changeOrders.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <THead cols={[`${isTM ? 'WO' : 'CO'} #`, 'Description', isTM ? 'GC Budget' : `Billed to ${gcName}`, isTM ? 'TC Labor' : `Paid to ${fcName || 'Field Crew'}`, 'Your Net', 'Status']} />
                <tbody>
                  {changeOrders.slice(0, 8).map(co => {
                    const gcB = co.gc_budget || 0;
                    const tcP = co.tc_submitted_price || 0;
                    return (
                      <TRow key={co.id} cells={[
                        <TdN>{co.co_number || '—'}</TdN>,
                        co.title || '—',
                        <TdM>{fmt(gcB)}</TdM>,
                        <TdM>{fmt(tcP)}</TdM>,
                        <span style={{ ...fontMono, fontSize: '0.78rem', color: gcB - tcP >= 0 ? C.green : C.red }}>+{fmt(gcB - tcP)}</span>,
                        <Pill type={['approved', 'completed', 'contracted'].includes(co.status) ? 'pg' : co.status === 'rejected' ? 'pr' : 'pw'}>{co.status}</Pill>,
                      ]} />
                    );
                  })}
                  {approvedCOs.length > 0 && (
                    <TRow cells={[<TdN>{approvedCOs.length} {isTM ? 'WOs' : 'COs'}</TdN>, '—', <TdM>+{fmt(coRevenue)}</TdM>, <TdM>{fmt(coCost)}</TdM>, <TdM>+{fmt(coNetMargin)}</TdM>, '—']} isTotal />
                  )}
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

        {/* Card 6 — Pending from GC */}
        <KpiCard accent={C.yellow} icon="⏳" iconBg={C.yellowBg} label={`PENDING FROM ${gcName.toUpperCase()}`} value={totalPendingFromGC > 0 ? fmt(totalPendingFromGC) : '$0'} sub={totalPendingFromGC > 0 ? `${pendingInvoicesUp.length} invoice${pendingInvoicesUp.length > 1 ? 's' : ''} awaiting ${gcName} approval` : 'No pending invoices'} pills={totalPendingFromGC > 0 ? [{ type: 'pw', text: `Chasing ${gcName}` }] : [{ type: 'pg', text: 'All clear' }]} idx={5}>
          <div style={{ padding: 12 }}>
            {pendingInvoicesUp.length > 0 ? (
              <>
                {pendingInvoicesUp.map(inv => (
                  <div key={inv.id} style={{ padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <TdN>{inv.invoice_number}</TdN>
                      <Pill type="pw">Pending</Pill>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: C.muted, marginBottom: 4 }}>To: {gcName}</div>
                    <div style={{ fontSize: '1.4rem', color: C.ink, ...fontVal }}>{fmt(inv.total_amount)}</div>
                  </div>
                ))}
                <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: 8, ...fontLabel }}>Awaiting {gcName} approval. You will be notified when approved.</div>
                <button onClick={() => onNavigate('invoices')} style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 10, ...fontLabel }}>Send Follow-Up to {gcName}</button>
              </>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No pending invoices</div>
            )}
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

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', ...fontLabel }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🚨</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: C.ink }}>Needs Attention — {projectName}</span>
          </div>
          {warnings.map((w, i) => (
            <WarnItem key={i} color={w.color} icon={w.icon} title={w.title} sub={w.sub} value={w.value} pill={w.pill} pillType={w.pillType} onClick={() => onNavigate(w.tab)} />
          ))}
        </div>
      )}
    </div>
  );
}

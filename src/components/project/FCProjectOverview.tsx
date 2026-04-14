import { useState, type ReactNode } from 'react';
import { Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import type { ProjectFinancials } from '@/hooks/useProjectFinancials';
import { C, fontVal, fontMono, fontLabel, fmt, KpiCard, Pill, BarRow, THead, TdN, TdM, TRow, WarnItem, cellStyle, type PillType } from '@/components/shared/KpiCard';
import { KpiGrid } from '@/components/shared/KpiGrid';

/* ═══════════════════════════════════════════════════ */

interface Props {
  projectId: string;
  projectName?: string;
  financials: ProjectFinancials;
  onNavigate: (tab: string) => void;
  isTM?: boolean;
}

export function FCProjectOverview({ projectId, projectName = 'Project', financials, onNavigate, isTM = false }: Props) {
  const { userOrgRoles } = useAuth();
  const currentOrgId = userOrgRoles[0]?.organization?.id;

  // FC's contract (set by TC) — read-only
  const fcContract = financials.downstreamContract || financials.upstreamContract;
  const contractSum = fcContract?.contract_sum || 0;
  const laborBudget = financials.laborBudget || 0;

  // Editable internal budget
  const [draftBudget, setDraftBudget] = useState(laborBudget);
  const [editingBudget, setEditingBudget] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);

  const saveBudget = async () => {
    if (!fcContract?.id) { toast.error('No contract found'); return; }
    setSavingBudget(true);
    const ok = await financials.updateLaborBudget(fcContract.id, draftBudget);
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
    if (!fcContract) return 'Trade Contractor';
    if (currentOrgId && fcContract.from_org_id === currentOrgId) return fcContract.to_org_name || 'Trade Contractor';
    if (currentOrgId && fcContract.to_org_id === currentOrgId) return fcContract.from_org_name || 'Trade Contractor';
    return fcContract.from_org_name || fcContract.to_org_name || 'Trade Contractor';
  })();

  // Invoices
  const paidInvoices = financials.recentInvoices.filter(i => i.status === 'PAID');
  const pendingInvoices = financials.recentInvoices.filter(i => i.status === 'SUBMITTED');
  const totalPaid = financials.totalPaid;
  const totalPending = pendingInvoices.reduce((s, i) => s + i.total_amount, 0);
  const totalInvoiced = financials.billedToDate;

  // Change orders / Work orders
  const { data: changeOrders = [] } = useQuery({
    queryKey: ['fc-project-cos', projectId, currentOrgId],
    queryFn: async () => {
      let q = supabase
        .from('change_orders')
        .select('id, co_number, title, status, gc_budget, tc_submitted_price, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (currentOrgId) q = q.eq('org_id', currentOrgId);
      const { data } = await q;
      return data || [];
    },
    enabled: !!projectId,
  });

  const approvedCOs = changeOrders.filter(co => ['approved', 'completed', 'contracted'].includes(co.status));
  const pendingCOs = changeOrders.filter(co => !['approved', 'completed', 'contracted', 'rejected'].includes(co.status));
  const coTotal = approvedCOs.reduce((s, co) => s + (co.tc_submitted_price || co.gc_budget || 0), 0);
  const completedCOs = changeOrders.filter(co => co.status === 'completed');

  // FC labor hours (for T&M mode)
  const { data: fcLaborData = [] } = useQuery({
    queryKey: ['fc-labor-hours', projectId, currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      const coIds = changeOrders.map(co => co.id);
      if (coIds.length === 0) return [];
      const { data } = await supabase
        .from('co_labor_entries')
        .select('hours, hourly_rate, co_id')
        .eq('org_id', currentOrgId)
        .in('co_id', coIds);
      return data || [];
    },
    enabled: isTM && !!currentOrgId && changeOrders.length > 0,
  });

  const totalHours = fcLaborData.reduce((s, e) => s + (e.hours || 0), 0);
  const avgRate = fcLaborData.length > 0 ? fcLaborData.reduce((s, e) => s + (e.hourly_rate || 0), 0) / fcLaborData.length : 0;

  // Derived
  const revisedTotal = isTM ? coTotal : contractSum + coTotal;
  const netMargin = revisedTotal - laborBudget;
  const marginPct = revisedTotal > 0 ? ((netMargin / revisedTotal) * 100).toFixed(1) : '0';
  const progressPct = isTM
    ? (changeOrders.length > 0 ? Math.round((completedCOs.length / changeOrders.length) * 100) : 0)
    : (revisedTotal > 0 ? Math.round((totalInvoiced / revisedTotal) * 100) : 0);
  const remainingToEarn = revisedTotal - totalInvoiced;

  // Warnings
  const warnings: { color: string; icon: string; title: string; sub: string; value: string; pill: string; pillType: PillType; tab: string }[] = [];
  if (pendingInvoices.length > 0) {
    warnings.push({ color: C.yellow, icon: '💰', title: `Invoice Awaiting ${tcName} Approval`, sub: `${pendingInvoices.length} invoice${pendingInvoices.length > 1 ? 's' : ''} submitted`, value: fmt(totalPending), pill: 'Pending', pillType: 'pw', tab: 'invoices' });
  }
  if (!isTM && remainingToEarn > 0 && progressPct < 100) {
    warnings.push({ color: C.blue, icon: '📅', title: 'Work Remaining', sub: `${100 - progressPct}% of scope not yet invoiced`, value: fmt(remainingToEarn), pill: 'Upcoming', pillType: 'pb', tab: 'invoices' });
  }
  if (isTM && pendingCOs.length > 0) {
    warnings.push({ color: C.yellow, icon: '📝', title: `${pendingCOs.length} Pending WO${pendingCOs.length > 1 ? 's' : ''}`, sub: 'Awaiting approval', value: `${pendingCOs.length} WOs`, pill: 'Review', pillType: 'pw', tab: 'change-orders' });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, ...fontLabel }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.purple, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: C.ink }}>{projectName}</div>
            <div style={{ fontSize: '0.72rem', color: C.muted }}>Your overview · {tcName}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onNavigate('invoices')} style={{ padding: '8px 16px', borderRadius: 8, background: C.amber, color: '#fff', fontWeight: 700, fontSize: '0.76rem', border: 'none', cursor: 'pointer', ...fontLabel }}>Submit Invoice to {tcName}</button>
          <button onClick={() => onNavigate(isTM ? 'change-orders' : 'daily-log')} style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.76rem', border: `1px solid ${C.border}`, cursor: 'pointer', ...fontLabel }}>{isTM ? 'View Work Orders' : 'View My Tasks'}</button>
        </div>
      </div>

      {/* 6 KPI Cards */}
      <KpiGrid>

        {isTM ? (
          <>
            {/* ═══ T&M MODE: WO-driven cards ═══ */}

            {/* Card 1 — My WO Earnings */}
            <KpiCard accent={C.amber} icon="💰" iconBg={C.amberPale} label="MY WO EARNINGS" value={coTotal > 0 ? fmt(coTotal) : '—'} sub={`${approvedCOs.length} approved WOs · sum of your prices`} pills={coTotal > 0 ? [{ type: 'pa', text: `${approvedCOs.length} WOs` }] : [{ type: 'pm', text: 'No WOs' }]} idx={0}>
              <div style={{ padding: 12 }}>
                {approvedCOs.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <THead cols={['WO #', 'Title', 'Your Price', 'Status']} />
                    <tbody>
                      {approvedCOs.slice(0, 8).map(co => (
                        <TRow key={co.id} cells={[
                          <TdN>{co.co_number || '—'}</TdN>,
                          co.title || '—',
                          <TdM>{fmt(co.tc_submitted_price || co.gc_budget || 0)}</TdM>,
                          <Pill type="pg">Approved</Pill>,
                        ]} />
                      ))}
                      <TRow cells={[<TdN>Total</TdN>, '—', <TdM>{fmt(coTotal)}</TdM>, '—']} isTotal />
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No approved work orders yet</div>
                )}
              </div>
            </KpiCard>

            {/* Card 2 — Work Progress (WO completion) */}
            <KpiCard accent={C.navy} icon="⚒" iconBg={C.surface2} label="WORK PROGRESS" value={`${progressPct}%`} sub={`${completedCOs.length} of ${changeOrders.length} WOs completed`} pills={[{ type: progressPct >= 80 ? 'pg' : progressPct >= 40 ? 'pa' : 'pm', text: progressPct >= 100 ? 'Complete' : 'In Progress' }]} idx={1}>
              <div style={{ padding: 12 }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: C.muted, marginBottom: 4, ...fontLabel }}>
                    <span>WO Completion</span>
                    <span style={{ ...fontMono, fontSize: '0.76rem', color: C.ink }}>{progressPct}%</span>
                  </div>
                  <div style={{ width: '100%', height: 10, borderRadius: 6, background: C.border, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(progressPct, 100)}%`, height: '100%', borderRadius: 6, background: progressPct >= 80 ? C.green : C.amber, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
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

            {/* Card 3 — Work Orders list */}
            <KpiCard accent={C.blue} icon="📋" iconBg={C.blueBg} label="WORK ORDERS" value={changeOrders.length > 0 ? `${changeOrders.length} WOs` : '0 WOs'} sub={`${approvedCOs.length} approved · ${pendingCOs.length} pending`} pills={pendingCOs.length > 0 ? [{ type: 'pw', text: `${pendingCOs.length} pending` }] : [{ type: 'pg', text: 'All clear' }]} idx={2}>
              <div style={{ padding: 12 }}>
                {changeOrders.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <THead cols={['WO #', 'Title', 'Value', 'Status']} />
                    <tbody>
                      {changeOrders.slice(0, 8).map(co => (
                        <TRow key={co.id} cells={[
                          <TdN>{co.co_number || '—'}</TdN>,
                          co.title || '—',
                          <TdM>{fmt(co.tc_submitted_price || co.gc_budget || 0)}</TdM>,
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

            {/* Card 4 — Paid by TC (same as fixed-contract) */}
            <KpiCard accent={C.green} icon="✅" iconBg={C.greenBg} label={`PAID BY ${tcName.toUpperCase()}`} value={fmt(totalPaid)} sub={`${paidInvoices.length} invoices paid`} pills={[{ type: 'pg', text: `${paidInvoices.length} paid` }]} idx={3}>
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

            {/* Card 5 — Pending from TC (same) */}
            <KpiCard accent={C.yellow} icon="⏳" iconBg={C.yellowBg} label={`PENDING FROM ${tcName.toUpperCase()}`} value={totalPending > 0 ? fmt(totalPending) : '$0'} sub={pendingInvoices.length > 0 ? `${pendingInvoices.length} invoice${pendingInvoices.length > 1 ? 's' : ''} awaiting approval` : 'No pending invoices'} pills={pendingInvoices.length > 0 ? [{ type: 'pw', text: `${tcName} reviewing` }] : [{ type: 'pg', text: 'All clear' }]} idx={4}>
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
            <KpiCard accent={C.purple} icon="⏱" iconBg={C.purpleBg} label="HOURS LOGGED" value={totalHours > 0 ? `${totalHours.toFixed(1)} hrs` : '0 hrs'} sub={totalHours > 0 ? `${fcLaborData.length} entries · avg ${avgRate > 0 ? fmt(avgRate) : '—'}/hr` : 'No labor hours logged'} pills={totalHours > 0 ? [{ type: 'pa', text: `${fcLaborData.length} entries` }] : [{ type: 'pm', text: 'No hours' }]} idx={5}>
              <div style={{ padding: 12 }}>
                {fcLaborData.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <THead cols={['Metric', 'Value']} />
                    <tbody>
                      <TRow cells={[<TdN>Total Hours</TdN>, <TdM>{totalHours.toFixed(1)}</TdM>]} />
                      <TRow cells={[<TdN>Entries</TdN>, <TdM>{fcLaborData.length}</TdM>]} />
                      <TRow cells={[<TdN>Avg Rate</TdN>, <TdM>{avgRate > 0 ? fmt(avgRate) : '—'}</TdM>]} />
                      <TRow cells={[<TdN>Total Earnings (WOs)</TdN>, <TdM>{fmt(coTotal)}</TdM>]} isTotal />
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
            {/* ═══ FIXED-CONTRACT MODE: Original cards ═══ */}

            {/* Card 1 — My Contract */}
            <KpiCard accent={C.amber} icon="🤝" iconBg={C.amberPale} label="MY CONTRACT" value={contractSum > 0 ? fmt(contractSum) : '—'} sub={`Set by ${tcName} · read-only`} pills={contractSum > 0 ? [{ type: 'pa', text: 'Active' }] : [{ type: 'pm', text: 'Not Set' }]} idx={0}>
              <div style={{ padding: '12px 16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <THead cols={['Item', 'Value', 'Notes']} />
                  <tbody>
                    <TRow cells={[<TdN>Contract Value (set by {tcName})</TdN>, <TdM>{fmt(contractSum)}</TdM>, 'Lump sum']} />
                    <TRow cells={[<TdN>Approved COs</TdN>, <TdM>+{fmt(coTotal)}</TdM>, `${approvedCOs.length} approved`]} />
                    <TRow cells={[<TdN>Revised Total</TdN>, <TdM>{fmt(revisedTotal)}</TdM>, '—']} isTotal />
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
                    {laborBudget > 0 && (
                      <TRow cells={[<TdN>Net Margin</TdN>, <span style={{ ...fontMono, fontSize: '0.78rem', color: C.green }}>{fmt(netMargin)}</span>, <span style={{ color: C.green, fontWeight: 700 }}>{marginPct}%</span>]} isTotal />
                    )}
                  </tbody>
                </table>
                <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: C.blueBg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.72rem', color: C.muted, ...fontLabel }}>
                  <span style={{ fontSize: 14 }}>ℹ️</span>
                  <span>Your contract value was set by <strong style={{ color: C.ink }}>{tcName}</strong>. Contact {tcName} to negotiate changes.</span>
                </div>
              </div>
            </KpiCard>

            {/* Card 2 — Net Margin */}
            <KpiCard accent={C.green} icon="📈" iconBg={C.greenBg} label="NET MARGIN" value={laborBudget > 0 ? fmt(netMargin) : '—'} sub={laborBudget > 0 ? `${marginPct}% · contract + COs minus internal costs` : 'Set internal budget in Card 1 to see margin'} pills={laborBudget > 0 ? [{ type: netMargin >= 0 ? 'pg' : 'pr', text: `${marginPct}%` }] : [{ type: 'pm', text: 'No budget' }]} idx={1}>
              <div style={{ padding: 12 }}>
                {laborBudget <= 0 && (
                  <div style={{ padding: '14px 12px', borderRadius: 8, background: C.amberPale, border: `1px solid ${C.border}`, fontSize: '0.76rem', color: C.muted, marginBottom: 12, ...fontLabel }}>
                    <strong style={{ color: C.ink }}>💡 Tip:</strong> Expand the "My Contract" card and set your Internal Cost Budget to see your net margin here.
                  </div>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <THead cols={['Metric', 'Value']} />
                  <tbody>
                    <TRow cells={[<TdN>Contract Value</TdN>, <TdM>{fmt(contractSum)}</TdM>]} />
                    <TRow cells={[<TdN>Approved COs</TdN>, <TdM>+{fmt(coTotal)}</TdM>]} />
                    <TRow cells={[<TdN>Revised Total</TdN>, <TdM>{fmt(revisedTotal)}</TdM>]} isTotal />
                    <TRow cells={[<TdN>Internal Cost Budget</TdN>, <TdM>{laborBudget > 0 ? fmt(laborBudget) : '—'}</TdM>]} />
                    {laborBudget > 0 && <TRow cells={[<TdN>Net Margin</TdN>, <TdM>{fmt(netMargin)}</TdM>]} isTotal />}
                  </tbody>
                </table>
              </div>
            </KpiCard>

            {/* Card 3 — Change Orders */}
            <KpiCard accent={C.blue} icon="📋" iconBg={C.blueBg} label="CHANGE ORDERS" value={coTotal > 0 ? `+${fmt(coTotal)}` : '0 COs'} sub={`${approvedCOs.length} approved`} pills={approvedCOs.length > 0 ? [{ type: 'pb', text: `${approvedCOs.length} approved` }] : [{ type: 'pm', text: 'None' }]} idx={2}>
              <div style={{ padding: 12 }}>
                {changeOrders.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <THead cols={['CO #', 'Description', 'Value', 'Status']} />
                    <tbody>
                      {changeOrders.slice(0, 8).map(co => (
                        <TRow key={co.id} cells={[
                          <TdN>{co.co_number || '—'}</TdN>,
                          co.title || '—',
                          <TdM>{fmt(co.tc_submitted_price || co.gc_budget || 0)}</TdM>,
                          <Pill type={['approved', 'completed', 'contracted'].includes(co.status) ? 'pg' : co.status === 'rejected' ? 'pr' : 'pw'}>{co.status}</Pill>,
                        ]} />
                      ))}
                      {approvedCOs.length > 0 && (
                        <TRow cells={[<TdN>{approvedCOs.length} COs</TdN>, '—', <TdM>+{fmt(coTotal)}</TdM>, '—']} isTotal />
                      )}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No change orders yet</div>
                )}
                <button onClick={() => onNavigate('change-orders')} style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 10, ...fontLabel }}>+ Submit CO Request to {tcName}</button>
              </div>
            </KpiCard>

            {/* Card 4 — Paid by TC */}
            <KpiCard accent={C.green} icon="✅" iconBg={C.greenBg} label={`PAID BY ${tcName.toUpperCase()}`} value={fmt(totalPaid)} sub={`${revisedTotal > 0 ? Math.round((totalPaid / revisedTotal) * 100) : 0}% of contract collected · ${paidInvoices.length} invoices paid`} pills={[{ type: 'pg', text: `${revisedTotal > 0 ? Math.round((totalPaid / revisedTotal) * 100) : 0}% received` }]} idx={3}>
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
            <KpiCard accent={C.yellow} icon="⏳" iconBg={C.yellowBg} label={`PENDING FROM ${tcName.toUpperCase()}`} value={totalPending > 0 ? fmt(totalPending) : '$0'} sub={pendingInvoices.length > 0 ? `${pendingInvoices.length} invoice${pendingInvoices.length > 1 ? 's' : ''} awaiting ${tcName} approval` : 'No pending invoices'} pills={pendingInvoices.length > 0 ? [{ type: 'pw', text: `${tcName} reviewing` }] : [{ type: 'pg', text: 'All clear' }]} idx={4}>
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
            <KpiCard accent={C.navy} icon="⚒" iconBg={C.surface2} label="WORK PROGRESS" value={`${progressPct}%`} sub={`${fmt(totalInvoiced)} invoiced of ${fmt(revisedTotal)} total scope`} pills={[{ type: progressPct >= 80 ? 'pg' : progressPct >= 40 ? 'pa' : 'pm', text: progressPct >= 100 ? 'Complete' : 'On Track' }]} idx={5}>
              <div style={{ padding: 12 }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: C.muted, marginBottom: 4, ...fontLabel }}>
                    <span>Overall Progress</span>
                    <span style={{ ...fontMono, fontSize: '0.76rem', color: C.ink }}>{progressPct}%</span>
                  </div>
                  <div style={{ width: '100%', height: 10, borderRadius: 6, background: C.border, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(progressPct, 100)}%`, height: '100%', borderRadius: 6, background: progressPct >= 80 ? C.green : C.amber, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <THead cols={['Metric', 'Value']} />
                  <tbody>
                    <TRow cells={[<TdN>Total Scope</TdN>, <TdM>{fmt(revisedTotal)}</TdM>]} />
                    <TRow cells={[<TdN>Invoiced to Date</TdN>, <TdM>{fmt(totalInvoiced)}</TdM>]} />
                    <TRow cells={[<TdN>Paid</TdN>, <TdM>{fmt(totalPaid)}</TdM>]} />
                    <TRow cells={[<TdN>Remaining</TdN>, <TdM>{fmt(remainingToEarn)}</TdM>]} isTotal />
                  </tbody>
                </table>
              </div>
            </KpiCard>
          </>
        )}
      </KpiGrid>

      {/* Earnings Tracker (fixed-contract only) */}
      {!isTM && (
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: '18px 20px', ...fontLabel }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.ink, marginBottom: 16 }}>💰 Earnings Tracker — {projectName}</div>
          <BarRow label="Total Scope" value={fmt(revisedTotal)} pct={100} barColor={C.amber} />
          <BarRow label={`Invoiced (${revisedTotal > 0 ? Math.round((totalInvoiced / revisedTotal) * 100) : 0}%)`} value={fmt(totalInvoiced)} pct={revisedTotal > 0 ? (totalInvoiced / revisedTotal) * 100 : 0} barColor={C.green} />
          <BarRow label={`Received (${revisedTotal > 0 ? Math.round((totalPaid / revisedTotal) * 100) : 0}%)`} value={fmt(totalPaid)} pct={revisedTotal > 0 ? (totalPaid / revisedTotal) * 100 : 0} barColor={C.greenDark} />
          {totalPending > 0 && <BarRow label="Pending" value={fmt(totalPending)} pct={revisedTotal > 0 ? (totalPending / revisedTotal) * 100 : 0} barColor={C.yellow} />}
          <BarRow label={`Remaining to Earn (${revisedTotal > 0 ? Math.round((remainingToEarn / revisedTotal) * 100) : 0}%)`} value={fmt(remainingToEarn)} pct={revisedTotal > 0 ? (remainingToEarn / revisedTotal) * 100 : 0} barColor={C.border} />
        </div>
      )}

      {/* T&M Earnings Summary */}
      {isTM && (
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: '18px 20px', ...fontLabel }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.ink, marginBottom: 16 }}>💰 WO Earnings Summary — {projectName}</div>
          <BarRow label="Total WO Earnings" value={fmt(coTotal)} pct={100} barColor={C.amber} />
          <BarRow label={`Paid (${coTotal > 0 ? Math.round((totalPaid / coTotal) * 100) : 0}%)`} value={fmt(totalPaid)} pct={coTotal > 0 ? (totalPaid / coTotal) * 100 : 0} barColor={C.green} />
          {totalPending > 0 && <BarRow label="Pending" value={fmt(totalPending)} pct={coTotal > 0 ? (totalPending / coTotal) * 100 : 0} barColor={C.yellow} />}
          <BarRow label={`Remaining (${coTotal > 0 ? Math.round(((coTotal - totalPaid - totalPending) / coTotal) * 100) : 0}%)`} value={fmt(coTotal - totalPaid - totalPending)} pct={coTotal > 0 ? ((coTotal - totalPaid - totalPending) / coTotal) * 100 : 0} barColor={C.border} />
        </div>
      )}

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

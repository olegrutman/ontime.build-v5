import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { OrgInviteBanner } from '@/components/dashboard/OrgInviteBanner';
import { PendingInvitesPanel } from '@/components/dashboard/PendingInvitesPanel';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { useSupplierDashboardData } from '@/hooks/useSupplierDashboardData';
import { C, fontVal, fontLabel, fmt, KpiCard, Pill, Bar, THead, TdN, TdM, TRow, ProjectCard, BAR_COLORS, type PillType } from '@/components/shared/KpiCard';
import { KpiGrid } from '@/components/shared/KpiGrid';

/* ─── Types ─── */
interface ProjectWithDetails {
  id: string; name: string; status: string; contractValue: number | null;
  pendingActions: number; build_type: string; project_type: string; updated_at: string;
}
interface AttentionItem { id: string; type: string; title: string; projectName: string; projectId: string; }
interface PendingInvite { id: string; projectId: string; projectName: string; invitedByOrgName: string; role: string; }
interface StatusCounts { setup: number; active: number; on_hold: number; completed: number; archived: number; }

export interface SupplierDashboardViewProps {
  projects: ProjectWithDetails[];
  attentionItems: AttentionItem[];
  pendingInvites: PendingInvite[];
  statusCounts: StatusCounts;
  profile: { first_name?: string | null; phone?: string | null } | null;
  organization: any;
  userSettings: any;
  updateUserSettings: (s: any) => Promise<void>;
  isOrgAdmin: boolean;
  userOrgRolesLength: number;
  orgType: string | null;
  orgId: string | undefined;
  soleMember: boolean;
  onSetSoleMember: () => void;
  onSetPartOfTeam: () => void;
  onRefresh: () => Promise<void>;
  loading: boolean;
}

// Human-readable phase/project_type labels
const PROJECT_TYPE_LABEL: Record<string, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  mixed_use: 'Mixed Use',
  apartments_mf: 'Apartments / Multi-Family',
  single_family: 'Single Family',
  multi_family: 'Multi-Family',
  industrial: 'Industrial',
  retail: 'Retail',
  office: 'Office',
  healthcare: 'Healthcare',
  education: 'Education',
  hospitality: 'Hospitality',
};
const formatPhase = (raw: string | null | undefined): string => {
  if (!raw) return '—';
  if (PROJECT_TYPE_LABEL[raw]) return PROJECT_TYPE_LABEL[raw];
  return raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export function SupplierDashboardView({
  projects, attentionItems, pendingInvites,
  statusCounts, profile, organization, userSettings, updateUserSettings,
  isOrgAdmin, userOrgRolesLength, orgType, orgId, soleMember,
  onSetSoleMember, onSetPartOfTeam, onRefresh,
}: SupplierDashboardViewProps) {
  const navigate = useNavigate();
  const { projectFinancials, upcomingDeliveries, refetch: refetchSupplier } = useSupplierDashboardData();

  const showOnboarding = userSettings && !userSettings.onboarding_dismissed;
  const profileComplete = !!(profile?.first_name && profile?.phone);
  const orgComplete = !!(organization?.address?.street);
  const teamInvited = !isOrgAdmin || (userOrgRolesLength > 1) || soleMember;
  const projectCreated = projects.length > 0;
  const activeProjects = projects.filter(p => !['archived', 'completed'].includes(p.status));

  const handleRefresh = async () => { await Promise.all([onRefresh(), refetchSupplier()]); };

  // Build display rows from supplier-side financials, joining with projects table for type/status
  const dp = useMemo(() => projectFinancials.map(pf => {
    const proj = projects.find(p => p.id === pf.projectId);
    const phaseRaw = pf.projectType || proj?.project_type || null;

    // Project-level risk: ≤0 On Track, 0–5% over Watch, >5% over Over Budget
    const overPct = pf.estimate > 0 ? (pf.overBy / pf.estimate) * 100 : (pf.overBy > 0 ? 100 : 0);
    const projectRisk: 'On Track' | 'Watch' | 'Over Budget' =
      pf.overBy <= 0 ? 'On Track' : overPct <= 5 ? 'Watch' : 'Over Budget';

    // Pack-level risk: any pack overrun escalates risk
    const packRisk: 'On Track' | 'Watch' | 'Over Budget' =
      pf.packsOverCount === 0 ? 'On Track'
        : pf.worstPackPct <= 5 ? 'Watch'
        : 'Over Budget';

    // Combined = worse of the two
    const rank = { 'On Track': 0, 'Watch': 1, 'Over Budget': 2 } as const;
    const risk = rank[packRisk] >= rank[projectRisk] ? packRisk : projectRisk;

    // Display "over" amount: prefer pack overage when project rollup is $0 but packs are over
    const displayOverBy = pf.overBy > 0 ? pf.overBy : pf.packOverBy;

    return {
      projectId: pf.projectId,
      name: pf.projectName,
      status: pf.status || proj?.status || 'active',
      phase: formatPhase(phaseRaw),
      estimate: pf.estimate,
      ordered: pf.ordered,
      billed: pf.billed,
      received: pf.received,
      overBy: pf.overBy,
      packsOverCount: pf.packsOverCount,
      packOverBy: pf.packOverBy,
      packOverDetails: pf.packOverDetails,
      displayOverBy,
      daysSinceLastPayment: pf.daysSinceLastPayment,
      risk,
    };
  }), [projectFinancials, projects]);

  // Forecast table excludes archived/completed projects (consistent with other sections)
  const forecastRows = useMemo(
    () => dp.filter(p => !['archived', 'completed'].includes(p.status)),
    [dp]
  );

  const totalEstimate = dp.reduce((s, p) => s + p.estimate, 0);
  const totalOrdered = dp.reduce((s, p) => s + p.ordered, 0);
  const totalBilled = dp.reduce((s, p) => s + p.billed, 0);
  const totalReceived = dp.reduce((s, p) => s + p.received, 0);
  const totalOver = dp.reduce((s, p) => s + Math.max(p.overBy, p.packOverBy), 0);
  const totalOutstanding = totalBilled - totalReceived;
  const totalNotBilled = Math.max(0, totalOrdered - totalBilled);
  const orderedPct = totalEstimate > 0 ? Math.round((totalOrdered / totalEstimate) * 100) : 0;
  const billedPct = totalOrdered > 0 ? Math.round((totalBilled / totalOrdered) * 100) : 0;
  const receivedPct = totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 0;
  const overCount = dp.filter(p => p.overBy > 0 || p.packsOverCount > 0).length;
  const onTrackCount = dp.filter(p => p.risk === 'On Track' && (p.estimate > 0 || p.ordered > 0 || p.billed > 0)).length;

  // Active = any supplier activity OR not archived/completed
  const projectsWithActivity = dp.filter(p =>
    (p.estimate > 0 || p.ordered > 0 || p.billed > 0) &&
    !['archived', 'completed'].includes(p.status)
  );

  const goToProject = (pid: string) => navigate(`/project/${pid}`);

  return (
    <div className="space-y-4">
        <DashboardHero
          firstName={profile?.first_name || null}
          orgName={organization?.name || null}
          orgTypeLabel={orgType}
          statusCounts={statusCounts}
          attentionCount={attentionItems.length + pendingInvites.length}
        />

        {showOnboarding && (
          <OnboardingChecklist profileComplete={profileComplete} orgComplete={orgComplete} teamInvited={teamInvited} projectCreated={projectCreated}
            orgType={orgType} onDismiss={async () => { await updateUserSettings({ onboarding_dismissed: true }); }}
            onMarkSoleMember={onSetSoleMember} onMarkPartOfTeam={onSetPartOfTeam} />
        )}

        <OrgInviteBanner />
        {pendingInvites.length > 0 && <PendingInvitesPanel invites={pendingInvites} onRefresh={handleRefresh} />}

        {/* ─── 6 KPI Cards: 3-col grid × 2 rows ─── */}
        <KpiGrid>

          {/* Card 1 — Total Estimate Value */}
          <KpiCard accent={C.navy} icon="📐" iconBg={C.surface2} label="TOTAL ESTIMATE VALUE" value={fmt(totalEstimate)} sub={`Across ${dp.filter(p => p.estimate > 0).length} active projects`}
            pills={[{ type: 'pm', text: 'Estimates' }]} idx={0}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'Phase', 'Estimate', 'Notes']} />
              <tbody>
                {dp.map((p, i) => (
                  <TRow key={i} onClick={() => goToProject(p.projectId)} cells={[
                    <TdN>{p.name}</TdN>,
                    <span>{p.phase}</span>,
                    <TdM>{p.estimate > 0 ? fmt(p.estimate) : '—'}</TdM>,
                    <span style={{ fontSize: '0.68rem' }}>{p.estimate === 0 ? 'Not started' : p.risk === 'Over Budget' ? 'Over Budget' : 'Active'}</span>,
                  ]} />
                ))}
                <TRow isTotal cells={['—', '—', <TdM>{fmt(totalEstimate)}</TdM>, '—']} />
              </tbody>
            </table>
          </KpiCard>

          {/* Card 2 — Total Ordered */}
          <KpiCard accent={C.amber} icon="📦" iconBg={C.amberPale} label="TOTAL ORDERED" value={fmt(totalOrdered)} sub={`${orderedPct}% of total estimate value`}
            pills={[{ type: 'pa', text: `${orderedPct}% of est` }]} idx={1}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'Estimate', 'Ordered', 'Δ Variance', 'Usage %']} />
              <tbody>
                {dp.map((p, i) => {
                  const variance = p.ordered - p.estimate;
                  const usage = p.estimate > 0 ? Math.round((p.ordered / p.estimate) * 100) : 0;
                  const vColor = variance > 0 ? C.yellow : C.green;
                  const barCol = variance > 0 ? C.yellow : C.green;
                  return (
                    <TRow key={i} onClick={() => goToProject(p.projectId)} cells={[
                      <TdN>{p.name}</TdN>,
                      <TdM>{p.estimate > 0 ? fmt(p.estimate) : '—'}</TdM>,
                      <TdM>{p.ordered > 0 ? fmt(p.ordered) : '—'}</TdM>,
                      p.estimate > 0 ? <span style={{ color: vColor, fontWeight: 600, fontSize: '0.74rem' }}>{variance >= 0 ? `+${fmt(variance)}` : `-${fmt(Math.abs(variance))}`}</span> : <span>—</span>,
                      p.estimate > 0 ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Bar pct={usage} color={barCol} /><span style={{ fontSize: '0.68rem', fontWeight: 600 }}>{usage}%</span></div> : <span>—</span>,
                    ]} />
                  );
                })}
                <TRow isTotal cells={['—', <TdM>{fmt(totalEstimate)}</TdM>, <TdM>{fmt(totalOrdered)}</TdM>, <span style={{ color: totalOrdered - totalEstimate >= 0 ? C.yellow : C.green, fontWeight: 600 }}>{totalOrdered - totalEstimate >= 0 ? `+${fmt(totalOrdered - totalEstimate)}` : `-${fmt(Math.abs(totalOrdered - totalEstimate))}`}</span>, `${orderedPct}%`]} />
              </tbody>
            </table>
          </KpiCard>

          {/* Card 3 — Extra / Over-Ordered */}
          <KpiCard accent={C.red} icon="⚠️" iconBg={C.redBg} label="EXTRA / OVER-ORDERED" value={totalOver > 0 ? `+${fmt(totalOver)}` : '$0'} sub={overCount > 0 ? `${overCount} project${overCount > 1 ? 's' : ''} over estimate` : 'All projects on track'}
            pills={[
              ...(overCount > 0 ? [{ type: 'pr' as PillType, text: `${overCount} project over` }] : []),
              { type: 'pg' as PillType, text: `${onTrackCount} on track` },
            ]} idx={2}>
            <div style={{ padding: '12px' }}>
              {overCount > 0 ? (
                <>
                  <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.7px', color: C.faint, fontWeight: 600, padding: '4px 0 8px', ...fontLabel }}>Projects With Variance</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <THead cols={['Project', 'Estimated', 'Ordered', 'Over By', 'Risk']} />
                    <tbody>
                      {dp.filter(p => p.overBy > 0 || p.packsOverCount > 0).map((p, i) => {
                        const overAmt = p.overBy > 0 ? p.overBy : p.packOverBy;
                        const tip = p.packOverDetails.length > 0
                          ? p.packOverDetails.slice(0, 4).map(d => `${d.packName} +${Math.round(d.overPct)}%`).join(', ')
                          : '';
                        return (
                          <TRow key={i} onClick={() => goToProject(p.projectId)} cells={[
                            <TdN>{p.name}</TdN>,
                            <TdM>{fmt(p.estimate)}</TdM>,
                            <TdM>{fmt(p.ordered)}</TdM>,
                            <span style={{ color: C.red, fontWeight: 700 }} title={tip}>
                              +{fmt(overAmt)}{p.packsOverCount > 0 ? ` (${p.packsOverCount} pack${p.packsOverCount > 1 ? 's' : ''})` : ''}
                            </span>,
                            <span title={tip}><Pill type="pr">{p.risk}</Pill></span>,
                          ]} />
                        );
                      })}
                    </tbody>
                  </table>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: C.muted, fontSize: '0.78rem' }}>
                  ✅ No projects over budget
                </div>
              )}
            </div>
          </KpiCard>

          {/* Card 4 — Total Billed */}
          <KpiCard accent={C.blue} icon="🧾" iconBg={C.blueBg} label="TOTAL BILLED" value={fmt(totalBilled)} sub={`${billedPct}% of ordered value invoiced`}
            pills={[{ type: 'pb', text: `${billedPct}% billed` }]} idx={3}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'Ordered', 'Billed', '% Billed', 'Outstanding to Bill']} />
              <tbody>
                {dp.map((p, i) => {
                  const pctBilled = p.ordered > 0 ? Math.round((p.billed / p.ordered) * 100) : 0;
                  const outToBill = Math.max(0, p.ordered - p.billed);
                  const barCol = pctBilled >= 100 ? C.green : C.blue;
                  return (
                    <TRow key={i} onClick={() => goToProject(p.projectId)} cells={[
                      <TdN>{p.name}</TdN>,
                      <TdM>{p.ordered > 0 ? fmt(p.ordered) : '—'}</TdM>,
                      <TdM>{p.billed > 0 ? fmt(p.billed) : '—'}</TdM>,
                      p.ordered > 0 ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Bar pct={pctBilled} color={barCol} /><span style={{ fontSize: '0.68rem', fontWeight: 600 }}>{pctBilled}%</span></div> : <span>—</span>,
                      <TdM>{outToBill > 0 ? fmt(outToBill) : '—'}</TdM>,
                    ]} />
                  );
                })}
                <TRow isTotal cells={['—', <TdM>{fmt(totalOrdered)}</TdM>, <TdM>{fmt(totalBilled)}</TdM>, `${billedPct}%`, <TdM>{fmt(totalNotBilled)}</TdM>]} />
              </tbody>
            </table>
          </KpiCard>

          {/* Card 5 — Total Received */}
          <KpiCard accent={C.green} icon="✅" iconBg={C.greenBg} label="TOTAL RECEIVED" value={fmt(totalReceived)} sub={`${receivedPct}% of billed amount collected`}
            pills={[{ type: 'pg', text: `${receivedPct}% received` }]} idx={4}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'Billed', 'Received', '% Collected', 'Outstanding Balance']} />
              <tbody>
                {dp.map((p, i) => {
                  const pctCollected = p.billed > 0 ? Math.round((p.received / p.billed) * 100) : 0;
                  const outBal = Math.max(0, p.billed - p.received);
                  const barCol = pctCollected >= 90 ? C.green : C.amber;
                  return (
                    <TRow key={i} onClick={() => goToProject(p.projectId)} cells={[
                      <TdN>{p.name}</TdN>,
                      <TdM>{p.billed > 0 ? fmt(p.billed) : '—'}</TdM>,
                      <TdM>{p.received > 0 ? fmt(p.received) : '—'}</TdM>,
                      p.billed > 0 ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Bar pct={pctCollected} color={barCol} /><span style={{ fontSize: '0.68rem', fontWeight: 600 }}>{pctCollected}%</span></div> : <span>—</span>,
                      <TdM>{outBal > 0 ? fmt(outBal) : '—'}</TdM>,
                    ]} />
                  );
                })}
                <TRow isTotal cells={['—', <TdM>{fmt(totalBilled)}</TdM>, <TdM>{fmt(totalReceived)}</TdM>, `${receivedPct}%`, <TdM>{fmt(totalOutstanding)}</TdM>]} />
              </tbody>
            </table>
          </KpiCard>

          {/* Card 6 — Outstanding Balance */}
          <KpiCard accent={C.yellow} icon="💵" iconBg={C.yellowBg} label="OUTSTANDING BALANCE" value={fmt(totalOutstanding)} sub={`${fmt(totalNotBilled)} not yet invoiced (future billings)`}
            pills={[{ type: 'pw', text: 'Receivable' }]} idx={5}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'Billed', 'Received', 'Outstanding', 'Days Since Last Pmt']} />
              <tbody>
                {dp.filter(p => p.billed - p.received > 0).map((p, i) => {
                  const outBal = p.billed - p.received;
                  const daysVal = p.daysSinceLastPayment;
                  const daysColor = daysVal === null ? C.muted : daysVal > 30 ? C.red : daysVal > 14 ? C.yellow : C.muted;
                  return (
                    <TRow key={i} onClick={() => goToProject(p.projectId)} cells={[
                      <TdN>{p.name}</TdN>,
                      <TdM>{fmt(p.billed)}</TdM>,
                      <TdM>{fmt(p.received)}</TdM>,
                      <TdM>{fmt(outBal)}</TdM>,
                      <span style={{ color: daysColor, fontWeight: daysVal !== null && daysVal > 14 ? 600 : 400, fontSize: '0.74rem' }}>{daysVal === null ? 'No payments yet' : `${daysVal}d`}</span>,
                    ]} />
                  );
                })}
                <TRow isTotal cells={['—', '—', '—', <TdM>{fmt(totalOutstanding)}</TdM>, '—']} />
              </tbody>
            </table>
          </KpiCard>
        </KpiGrid>

        {/* ─── Scheduled Deliveries ─── */}
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', ...fontLabel }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: C.ink }}>🚚 Scheduled Deliveries</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: C.amber }}>{upcomingDeliveries.length} upcoming</span>
          </div>
          {upcomingDeliveries.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: C.muted }}>No scheduled deliveries</span>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <THead cols={['PO #', 'Project', 'Delivery Date', 'Status', 'Total']} />
                <tbody>
                  {upcomingDeliveries.map((d, i) => (
                    <TRow key={i} onClick={() => goToProject(d.projectId)} cells={[
                      <TdN>{d.poNumber}</TdN>,
                      <span>{d.projectName}</span>,
                      <span style={{ fontSize: '0.74rem' }}>{format(new Date(d.deliveryDate), 'MMM d, yyyy')}</span>,
                      <Pill type="pa">{d.status}</Pill>,
                      <TdM>{d.total !== null ? fmt(d.total) : '—'}</TdM>,
                    ]} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── Project Budget Forecast ─── */}
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', ...fontLabel }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: C.ink }}>⚠️ Project Budget Forecast</span>
          </div>
          {forecastRows.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>
              No active projects with supplier activity yet
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <THead cols={['Project', 'Estimate', 'Total Ordered', 'Extra / Over', 'Billed', 'Received', 'AR Outstanding', 'Risk']} />
                <tbody>
                  {(() => {
                    let fEst = 0, fOrd = 0, fBilled = 0, fRec = 0, fOver = 0, fOut = 0;
                    const rows = forecastRows.map((p, i) => {
                      const bPct = p.ordered > 0 ? Math.round((p.billed / p.ordered) * 100) : 0;
                      const rPct = p.billed > 0 ? Math.round((p.received / p.billed) * 100) : 0;
                      const outBal = Math.max(0, p.billed - p.received);
                      const overAmt = p.overBy > 0 ? p.overBy : p.packOverBy;
                      fEst += p.estimate; fOrd += p.ordered; fBilled += p.billed;
                      fRec += p.received; fOver += overAmt; fOut += outBal;
                      const riskPill: PillType =
                        p.risk === 'Over Budget' ? 'pr' : p.risk === 'Watch' ? 'pa' : 'pg';
                      const tip = p.packOverDetails.length > 0
                        ? `Packs over budget: ${p.packOverDetails.slice(0, 4).map(d => `${d.packName} +${Math.round(d.overPct)}%`).join(', ')}`
                        : '';
                      return (
                        <TRow key={i} onClick={() => goToProject(p.projectId)} cells={[
                          <TdN>{p.name}</TdN>,
                          <TdM>{p.estimate > 0 ? fmt(p.estimate) : '—'}</TdM>,
                          <TdM>{p.ordered > 0 ? fmt(p.ordered) : '—'}</TdM>,
                          overAmt > 0
                            ? <span style={{ color: C.red, fontWeight: 700 }} title={tip}>
                                +{fmt(overAmt)}{p.packsOverCount > 0 ? ` (${p.packsOverCount} pack${p.packsOverCount > 1 ? 's' : ''})` : ''}
                              </span>
                            : <span>—</span>,
                          p.billed > 0 ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Bar pct={bPct} color={C.blue} /><TdM>{fmt(p.billed)}</TdM></div> : <span>—</span>,
                          p.received > 0 ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Bar pct={rPct} color={C.green} /><TdM>{fmt(p.received)}</TdM></div> : <span>—</span>,
                          <TdM>{outBal > 0 ? fmt(outBal) : '—'}</TdM>,
                          <span title={tip}><Pill type={riskPill}>{p.risk}</Pill></span>,
                        ]} />
                      );
                    });
                    rows.push(
                      <TRow key="total" isTotal cells={[
                        '—',
                        <TdM>{fmt(fEst)}</TdM>,
                        <TdM>{fmt(fOrd)}</TdM>,
                        fOver > 0 ? <span style={{ color: C.red, fontWeight: 700 }}>+{fmt(fOver)}</span> : <span>—</span>,
                        <TdM>{fmt(fBilled)}</TdM>,
                        <TdM>{fmt(fRec)}</TdM>,
                        <TdM>{fmt(fOut)}</TdM>,
                        '—',
                      ]} />
                    );
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── Active Projects Grid ─── */}
        <div>
          <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.7px', color: C.faint, fontWeight: 600, marginBottom: 10, ...fontLabel }}>Active Projects</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {projectsWithActivity.map((p, i) => (
              <ProjectCard key={i} name={p.name} status={p.status} budget={p.estimate} costs={p.ordered} onClick={() => goToProject(p.projectId)} />
            ))}
            {projectsWithActivity.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px', color: C.muted, fontSize: '0.78rem' }}>
                No active projects with supplier activity yet
              </div>
            )}
          </div>
        </div>

        <div style={{ height: 24 }} />
    </div>
  );
}

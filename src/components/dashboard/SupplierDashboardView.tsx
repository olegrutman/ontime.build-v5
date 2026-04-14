import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { OrgInviteBanner } from '@/components/dashboard/OrgInviteBanner';
import { PendingInvitesPanel } from '@/components/dashboard/PendingInvitesPanel';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { DashboardSidebar } from '@/components/app-shell/DashboardSidebar';
import type { RecentDoc, ProjectFinancialDetail } from '@/hooks/useDashboardData';
import { C, fontVal, fontMono, fontLabel, fmt, KpiCard, Pill, Bar, THead, TdN, TdM, TRow, WarnItem, ProjectCard, BAR_COLORS, type PillType } from '@/components/shared/KpiCard';
import { KpiGrid } from '@/components/shared/KpiGrid';

/* ─── Types ─── */
interface ProjectWithDetails {
  id: string; name: string; status: string; contractValue: number | null;
  pendingActions: number; build_type: string; project_type: string; updated_at: string;
}

interface FinancialSummary {
  totalContracts: number; totalRevenue: number; totalCosts: number; profitMargin: number;
  totalBilled: number; paidByYou: number; paidToYou: number; outstandingBilling: number; potentialProfit: number;
}

interface AttentionItem { id: string; type: 'invoice' | 'invite' | 'sent_invite'; title: string; projectName: string; projectId: string; }
interface PendingInvite { id: string; projectId: string; projectName: string; invitedByOrgName: string; role: string; }
interface StatusCounts { setup: number; active: number; on_hold: number; completed: number; archived: number; }

export interface SupplierDashboardViewProps {
  projects: ProjectWithDetails[];
  financials: FinancialSummary;
  projectFinancials: ProjectFinancialDetail[];
  billing: { invoicesReceived: number; invoicesSent: number; outstandingToPay: number; outstandingToCollect: number; profit: number; role: string };
  attentionItems: AttentionItem[];
  pendingInvites: PendingInvite[];
  recentDocs: RecentDoc[];
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

export function SupplierDashboardView({
  projects, financials, projectFinancials, billing, attentionItems, pendingInvites, recentDocs,
  statusCounts, profile, organization, userSettings, updateUserSettings,
  isOrgAdmin, userOrgRolesLength, orgType, orgId, soleMember,
  onSetSoleMember, onSetPartOfTeam, onRefresh, loading,
}: SupplierDashboardViewProps) {
  const navigate = useNavigate();
  const showOnboarding = userSettings && !userSettings.onboarding_dismissed;
  const profileComplete = !!(profile?.first_name && profile?.phone);
  const orgComplete = !!(organization?.address?.street);
  const teamInvited = !isOrgAdmin || (userOrgRolesLength > 1) || soleMember;
  const projectCreated = projects.length > 0;
  const activeProjects = projects.filter(p => !['archived', 'completed'].includes(p.status));

  // Use real data only — no demo fallback
  const pf = projectFinancials;

  const dp = pf.map((p) => ({
    projectId: p.projectId,
    name: p.projectName,
    phase: projects.find(pr => pr.id === p.projectId)?.project_type || '',
    estimate: p.revenue,
    ordered: p.costs,
    billed: p.paidToYou + p.pendingToCollect,
    received: p.paidToYou,
    overBy: Math.max(0, p.costs - p.revenue),
    risk: p.costs > p.revenue ? 'Over Budget' as const : 'On Track' as const,
  }));

  const totalEstimate = dp.reduce((s, p) => s + p.estimate, 0);
  const totalOrdered = dp.reduce((s, p) => s + p.ordered, 0);
  const totalBilled = dp.reduce((s, p) => s + p.billed, 0);
  const totalReceived = dp.reduce((s, p) => s + p.received, 0);
  const totalOver = dp.reduce((s, p) => s + p.overBy, 0);
  const totalOutstanding = totalBilled - totalReceived;
  const totalNotBilled = totalOrdered - totalBilled;
  const orderedPct = totalEstimate > 0 ? Math.round((totalOrdered / totalEstimate) * 100) : 0;
  const billedPct = totalOrdered > 0 ? Math.round((totalBilled / totalOrdered) * 100) : 0;
  const receivedPct = totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 0;
  const overCount = dp.filter(p => p.overBy > 0).length;
  const onTrackCount = dp.filter(p => p.overBy === 0 && p.estimate > 0).length;

  const getProjectColor = (idx: number) => BAR_COLORS[idx % BAR_COLORS.length];

  return (
    <div className="flex gap-0">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 space-y-4 px-4 lg:px-5">
        {/* Greeting */}
        <div style={{ ...fontLabel }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.ink, ...fontVal }}>
            {profile?.first_name ? `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${profile.first_name}` : 'Dashboard'}
          </h1>
          <p style={{ fontSize: '0.75rem', color: C.muted }}>
            {activeProjects.length} active project{activeProjects.length !== 1 ? 's' : ''} · {attentionItems.length + pendingInvites.length} item{(attentionItems.length + pendingInvites.length) !== 1 ? 's' : ''} need attention
          </p>
        </div>

        {showOnboarding && (
          <OnboardingChecklist profileComplete={profileComplete} orgComplete={orgComplete} teamInvited={teamInvited} projectCreated={projectCreated}
            orgType={orgType} onDismiss={async () => { await updateUserSettings({ onboarding_dismissed: true }); }}
            onMarkSoleMember={onSetSoleMember} onMarkPartOfTeam={onSetPartOfTeam} />
        )}

        <OrgInviteBanner />
        {pendingInvites.length > 0 && <PendingInvitesPanel invites={pendingInvites} onRefresh={onRefresh} />}

        {/* ─── 6 KPI Cards: 3-col grid × 2 rows ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>

          {/* Card 1 — Total Estimate Value */}
          <KpiCard accent={C.navy} icon="📐" iconBg={C.surface2} label="TOTAL ESTIMATE VALUE" value={fmt(totalEstimate)} sub={`Across ${dp.filter(p => p.estimate > 0).length} active projects`}
            pills={[{ type: 'pm', text: 'Estimates' }]} idx={0}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'Phase', 'Estimate', 'Notes']} />
              <tbody>
                {dp.map((p, i) => (
                  <TRow key={i} onClick={() => navigate(`/project/${p.projectId}`)} cells={[
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
                    <TRow key={i} cells={[
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
              {overCount > 0 && (
                <>
                  <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.7px', color: C.faint, fontWeight: 600, padding: '4px 0 8px', ...fontLabel }}>Projects With Variance</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <THead cols={['Project', 'Estimated', 'Ordered', 'Over By', 'Risk']} />
                    <tbody>
                      {dp.filter(p => p.overBy > 0).map((p, i) => (
                        <TRow key={i} cells={[
                          <TdN>{p.name}</TdN>,
                          <TdM>{fmt(p.estimate)}</TdM>,
                          <TdM>{fmt(p.ordered)}</TdM>,
                          <span style={{ color: C.red, fontWeight: 700 }}>+{fmt(p.overBy)}</span>,
                          <Pill type="pr">{p.risk}</Pill>,
                        ]} />
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              {overCount === 0 && (
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
                    <TRow key={i} cells={[
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
                    <TRow key={i} cells={[
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
                  const daysSince = [8, 3, 12][i % 3]; // placeholder
                  return (
                    <TRow key={i} cells={[
                      <TdN>{p.name}</TdN>,
                      <TdM>{fmt(p.billed)}</TdM>,
                      <TdM>{fmt(p.received)}</TdM>,
                      <TdM>{fmt(outBal)}</TdM>,
                      <span>{daysSince} days</span>,
                    ]} />
                  );
                })}
                <TRow isTotal cells={['—', '—', '—', <TdM>{fmt(totalOutstanding)}</TdM>, '—']} />
              </tbody>
            </table>
          </KpiCard>
        </div>

        {/* ─── Scheduled Deliveries ─── */}
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', ...fontLabel }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: C.ink }}>🚚 Scheduled Deliveries</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: C.amber, cursor: 'pointer' }}>Full Schedule →</span>
          </div>
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: C.muted }}>No scheduled deliveries</span>
          </div>
        </div>

        {/* ─── Project Budget Forecast ─── */}
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', ...fontLabel }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: C.ink }}>⚠️ Project Budget Forecast</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <THead cols={['Project', 'Estimate', 'Total Ordered', 'Extra / Over', 'Billed', 'Received', 'Outstanding', 'Risk']} />
              <tbody>
                {dp.map((p, i) => {
                  const bPct = p.ordered > 0 ? Math.round((p.billed / p.ordered) * 100) : 0;
                  const rPct = p.billed > 0 ? Math.round((p.received / p.billed) * 100) : 0;
                  const outBal = Math.max(0, p.billed - p.received);
                  const riskPill: PillType = p.risk === 'Over Budget' ? 'pr' : 'pg';
                  return (
                    <TRow key={i} onClick={() => navigate(`/project/${p.projectId}`)} cells={[
                      <TdN>{p.name}</TdN>,
                      <TdM>{p.estimate > 0 ? fmt(p.estimate) : '—'}</TdM>,
                      <TdM>{p.ordered > 0 ? fmt(p.ordered) : '—'}</TdM>,
                      p.overBy > 0 ? <span style={{ color: C.red, fontWeight: 700 }}>+{fmt(p.overBy)}</span> : <span>—</span>,
                      p.billed > 0 ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Bar pct={bPct} color={C.blue} /><TdM>{fmt(p.billed)}</TdM></div> : <span>—</span>,
                      p.received > 0 ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Bar pct={rPct} color={C.green} /><TdM>{fmt(p.received)}</TdM></div> : <span>—</span>,
                      <TdM>{outBal > 0 ? fmt(outBal) : '—'}</TdM>,
                      <Pill type={riskPill}>{p.risk}</Pill>,
                    ]} />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Active Projects Grid ─── */}
        <div>
          <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.7px', color: C.faint, fontWeight: 600, marginBottom: 10, ...fontLabel }}>Active Projects</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {dp.filter(p => p.estimate > 0).map((p, i) => {
              const proj = projects.find(pr => pr.id === p.projectId);
              return (
                <ProjectCard key={i} name={p.name} status={proj?.status || 'active'} budget={p.estimate} costs={p.ordered} onClick={() => navigate(`/project/${p.projectId}`)} />
              );
            })}
          </div>
        </div>

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

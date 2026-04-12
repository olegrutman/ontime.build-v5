import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrgInviteBanner } from '@/components/dashboard/OrgInviteBanner';
import { PendingInvitesPanel } from '@/components/dashboard/PendingInvitesPanel';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { DashboardSidebar } from '@/components/app-shell/DashboardSidebar';
import type { RecentDoc, ProjectFinancialDetail } from '@/hooks/useDashboardData';

/* ─── Design tokens ─── */
const C = {
  amber: '#F5A623', amberD: '#C8850A', amberPale: '#FFF7E6',
  navy: '#0D1F3C', navyL: '#162E52',
  bg: '#F0F2F7', surface: '#FFFFFF', surface2: '#F7F9FC',
  border: '#E4E8F0', ink: '#0F1923', ink2: '#253347', muted: '#5A6A7E', faint: '#9AAABB',
  green: '#059669', greenBg: '#ECFDF5',
  red: '#DC2626', redBg: '#FEF2F2',
  blue: '#2563EB', blueBg: '#EFF6FF',
  yellow: '#D97706', yellowBg: '#FFFBEB',
  purple: '#7C3AED', purpleBg: '#F5F3FF',
};

const fontVal = { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 } as const;
const fontMono = { fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 } as const;
const fontLabel = { fontFamily: "'DM Sans', sans-serif" } as const;

/* ─── Helpers ─── */
function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `$${n.toLocaleString()}`;
}

/* ─── Pill ─── */
type PillType = 'pg' | 'pr' | 'pa' | 'pb' | 'pm' | 'pw';
const PILL_S: Record<PillType, { bg: string; color: string; border?: string }> = {
  pg: { bg: C.greenBg, color: C.green },
  pr: { bg: C.redBg, color: C.red },
  pa: { bg: C.amberPale, color: C.amberD },
  pb: { bg: C.blueBg, color: C.blue },
  pm: { bg: C.surface2, color: C.muted, border: `1px solid ${C.border}` },
  pw: { bg: C.yellowBg, color: C.yellow },
};

function Pill({ type, children }: { type: PillType; children: ReactNode }) {
  const s = PILL_S[type];
  return (
    <span style={{ fontSize: '0.59rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: s.bg, color: s.color, border: s.border || 'none', whiteSpace: 'nowrap', ...fontLabel }}>
      {children}
    </span>
  );
}

/* ─── Bar ─── */
function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, background: C.border, borderRadius: 4, width: 80, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 4 }} />
    </div>
  );
}

/* ─── KPI Card ─── */
function KpiCard({ accent, icon, iconBg, label, value, sub, pills, children, idx }: {
  accent: string; icon: ReactNode; iconBg: string; label: string; value: string; sub: string;
  pills: { type: PillType; text: string }[]; children: ReactNode; idx: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen(!open)}
      style={{
        background: C.surface, borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        border: open ? `1.5px solid ${C.amber}` : `1px solid ${C.border}`,
        boxShadow: open ? `0 0 0 3px rgba(245,166,35,.1)` : '0 1px 3px rgba(0,0,0,.04)',
        animationDelay: `${idx * 0.04}s`, ...fontLabel,
      }}
      className="animate-fade-in"
    >
      <div style={{ height: 3, background: accent }} />
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {pills.map((p, i) => <Pill key={i} type={p.type}>{p.text}</Pill>)}
          </div>
        </div>
        <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.7px', color: C.faint, marginBottom: 2, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: '2rem', color: C.ink, lineHeight: 1.1, marginBottom: 2, ...fontVal }}>{value}</div>
        <div style={{ fontSize: '0.67rem', color: C.muted, marginBottom: 10 }}>{sub}</div>
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: C.surface2, fontSize: '0.67rem', color: C.muted, fontWeight: 600, borderTop: `1px solid ${C.border}` }}
        className="hover:bg-[#FFF7E6] transition-colors"
      >
        <span>{open ? 'Collapse' : 'Expand for detail'}</span>
        <ChevronRight size={13} style={{ transition: 'transform 0.3s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }} />
      </div>
      <div onClick={(e) => e.stopPropagation()} style={{ maxHeight: open ? 900 : 0, overflow: open ? 'auto' : 'hidden', transition: 'max-height 0.44s cubic-bezier(.22,1,.36,1), opacity 0.3s', opacity: open ? 1 : 0 }}>
        {children}
      </div>
    </div>
  );
}

/* ─── Table helpers ─── */
function THead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
        {cols.map((c, i) => (
          <th key={i} style={{ fontSize: '0.59rem', textTransform: 'uppercase', letterSpacing: '0.9px', color: C.faint, padding: '8px 12px', fontWeight: 600, textAlign: i === cols.length - 1 ? 'right' : 'left', ...fontLabel }}>{c}</th>
        ))}
      </tr>
    </thead>
  );
}

function TdN({ children }: { children: ReactNode }) { return <span style={{ fontWeight: 700, color: C.ink }}>{children}</span>; }
function TdM({ children }: { children: ReactNode }) { return <span style={{ ...fontMono, fontSize: '0.78rem', color: C.ink2 }}>{children}</span>; }

const cellStyle = { padding: '9px 12px', fontSize: '0.76rem', color: C.muted, borderBottom: `1px solid ${C.border}` };
const cellStyleR = { ...cellStyle, textAlign: 'right' as const };
const totalRowStyle = { background: C.surface2, fontWeight: 700 };

function TRow({ cells, isTotal, onClick }: { cells: ReactNode[]; isTotal?: boolean; onClick?: () => void }) {
  return (
    <tr style={isTotal ? totalRowStyle : { cursor: 'pointer' }} className={isTotal ? '' : 'hover:bg-[rgba(245,166,35,.05)]'} onClick={onClick}>
      {cells.map((c, i) => <td key={i} style={i === cells.length - 1 ? cellStyleR : cellStyle}>{c}</td>)}
    </tr>
  );
}

/* ─── WarnItem ─── */
function WarnItem({ color, icon, title, sub, value, pill, pillType, onClick }: {
  color: string; icon: string; title: string; sub: string; value: string; pill: string; pillType: PillType; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderLeft: `3px solid ${color}`, borderBottom: `1px solid ${C.border}`, cursor: 'pointer', transition: 'all 0.15s', ...fontLabel }} className="hover:translate-x-[2px] hover:bg-[#F7F9FC]">
      <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: C.ink, fontSize: '0.78rem' }}>{title}</div>
        <div style={{ fontSize: '0.64rem', color: C.muted }}>{sub}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ ...fontMono, fontSize: '0.78rem', color: C.ink2, fontWeight: 700 }}>{value}</div>
        <Pill type={pillType}>{pill}</Pill>
      </div>
    </div>
  );
}

/* ─── ProjectCard ─── */
const STATUS_PILL_MAP: Record<string, { type: PillType; label: string }> = {
  active: { type: 'pg', label: 'Active' },
  setup: { type: 'pm', label: 'Setup' },
  draft: { type: 'pm', label: 'Setup' },
  on_hold: { type: 'pw', label: 'On Hold' },
  completed: { type: 'pb', label: 'Completed' },
  archived: { type: 'pm', label: 'Archived' },
};

function ProjectCard({ name, status, budget, costs, onClick }: {
  name: string; status: string; budget: number; costs: number; onClick: () => void;
}) {
  const margin = budget - costs;
  const pill = STATUS_PILL_MAP[status] || { type: 'pm' as PillType, label: status };
  const dotColor = status === 'active' ? C.green : status === 'on_hold' ? C.yellow : status === 'completed' ? C.blue : C.faint;
  return (
    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 16px', cursor: 'pointer', ...fontLabel }} className="hover:border-[#F5A623] hover:shadow-sm transition-all" onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
        <span style={{ fontWeight: 700, color: C.ink, fontSize: '0.82rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      </div>
      <div style={{ marginBottom: 10 }}>
        <Pill type={pill.type}>{pill.label}</Pill>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: 'PO Value', value: fmt(budget) },
          { label: 'Ordered', value: fmt(costs) },
          { label: 'Outstanding', value: fmt(margin), color: margin > 0 ? C.amber : C.green },
        ].map((m, i) => (
          <div key={i} style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.56rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: C.faint, fontWeight: 600 }}>{m.label}</div>
            <div style={{ ...fontMono, fontSize: '0.76rem', fontWeight: 700, color: m.color || C.ink2, marginTop: 1 }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

const BAR_COLORS = [C.amber, C.blue, C.green, C.yellow, C.purple, C.red, C.navy];

/* ─── No demo data — real projects only ─── */


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

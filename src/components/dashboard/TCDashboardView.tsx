import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Handshake, Users, TrendingUp, FileText, CheckCircle, Clock, Package, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrgInviteBanner } from '@/components/dashboard/OrgInviteBanner';
import { PendingInvitesPanel } from '@/components/dashboard/PendingInvitesPanel';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { DashboardSidebar } from '@/components/app-shell/DashboardSidebar';
import type { RecentDoc, ProjectFinancialDetail } from '@/hooks/useDashboardData';

/* ─── Design tokens (identical to GC) ─── */
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
function fmtSigned(n: number): string {
  return n >= 0 ? `+${fmt(n)}` : `-${fmt(Math.abs(n))}`;
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
      <div onClick={(e) => e.stopPropagation()} style={{ maxHeight: open ? 700 : 0, overflow: open ? 'auto' : 'hidden', transition: 'max-height 0.44s cubic-bezier(.22,1,.36,1), opacity 0.3s', opacity: open ? 1 : 0 }}>
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
function ProjectCard({ name, phase, budget, progress, barColor, onClick }: {
  name: string; phase: string; budget: number; progress: number; barColor: string; onClick: () => void;
}) {
  const status: PillType = progress >= 80 ? 'pg' : progress >= 50 ? 'pa' : progress >= 30 ? 'pb' : 'pm';
  const statusText = progress >= 80 ? 'On Track' : progress >= 50 ? 'In Progress' : progress >= 30 ? 'Active' : 'Setup';
  return (
    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 16px', cursor: 'pointer', ...fontLabel }} className="hover:border-[#F5A623] hover:shadow-sm transition-all" onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: barColor }} />
        <span style={{ fontWeight: 700, color: C.ink, fontSize: '0.82rem' }}>{name}</span>
      </div>
      <div style={{ fontSize: '0.64rem', color: C.faint, marginBottom: 8 }}>{phase}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: barColor, borderRadius: 4 }} />
        </div>
        <span style={{ fontSize: '0.67rem', fontWeight: 600, color: C.muted }}>{progress}%</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ ...fontMono, fontSize: '0.82rem', fontWeight: 700, color: C.ink2 }}>{fmt(budget)}</span>
        <Pill type={status}>{statusText}</Pill>
      </div>
    </div>
  );
}

/* ─── (Demo data removed — all cards now use real data from props) ─── */

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

export interface TCDashboardViewProps {
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

export function TCDashboardView({
  projects, financials, projectFinancials, billing, attentionItems, pendingInvites, recentDocs,
  statusCounts, profile, organization, userSettings, updateUserSettings,
  isOrgAdmin, userOrgRolesLength, orgType, orgId, soleMember,
  onSetSoleMember, onSetPartOfTeam, onRefresh, loading,
}: TCDashboardViewProps) {
  const navigate = useNavigate();
  const showOnboarding = userSettings && !userSettings.onboarding_dismissed;
  const profileComplete = !!(profile?.first_name && profile?.phone);
  const orgComplete = !!(organization?.address?.street);
  const teamInvited = !isOrgAdmin || (userOrgRolesLength > 1) || soleMember;
  const projectCreated = projects.length > 0;

  const activeProjects = projects.filter(p => !['archived', 'completed'].includes(p.status));

  // Derive per-project data from projectFinancials
  const pf = projectFinancials.filter(p => p.revenue > 0 || p.costs > 0 || p.paidToYou > 0);

  const gcRevenue = financials.totalRevenue;
  const fcCost = financials.totalCosts;
  const grossMargin = gcRevenue - fcCost;
  const marginPct = gcRevenue > 0 ? ((grossMargin / gcRevenue) * 100).toFixed(1) : '0';

  // Change orders from recentDocs
  const coList = recentDocs.filter(d => d.type === 'change_order');
  const coCount = coList.length;

  // Invoices from recentDocs
  const invoiceDocs = recentDocs.filter(d => d.type === 'invoice');
  const pendingInvoiceDocs = invoiceDocs.filter(d => ['SUBMITTED', 'APPROVED'].includes(d.status));

  // POs from recentDocs
  const poDocs = recentDocs.filter(d => d.type === 'purchase_order');
  const poTotal = poDocs.reduce((s, d) => s + (d.amount || 0), 0);

  const receivedFromGC = financials.paidToYou;
  const pendingFromGC = billing.outstandingToCollect;

  const getProjectColor = (idx: number) => BAR_COLORS[idx % BAR_COLORS.length];

  // Group POs by project
  const posByProject = new Map<string, RecentDoc[]>();
  poDocs.forEach(po => {
    const existing = posByProject.get(po.projectName) || [];
    existing.push(po);
    posByProject.set(po.projectName, existing);
  });

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
          <OnboardingChecklist profileComplete={profileComplete} orgComplete={orgComplete} teamInvited={teamInvited} projectCreated={projectCreated} orgType={orgType}
            onDismiss={async () => updateUserSettings({ onboarding_dismissed: true })} onMarkSoleMember={onSetSoleMember} onMarkPartOfTeam={onSetPartOfTeam} />
        )}

        <OrgInviteBanner />

        {pendingInvites.length > 0 && <PendingInvitesPanel invites={pendingInvites} onRefresh={onRefresh} />}

        {/* KPI Grid — 3 cols for TC */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">

          {/* Card 1: GC Contracts (Revenue) */}
          <KpiCard idx={0} accent={C.amber} icon={<Handshake size={18} color={C.amberD} />} iconBg={C.amberPale}
            label="GC CONTRACTS (REVENUE)" value={gcRevenue > 0 ? fmt(gcRevenue) : '—'}
            sub={`${projects.length} active project${projects.length !== 1 ? 's' : ''} with GC`}
            pills={[{ type: 'pa', text: 'Revenue' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'GC Contract', 'FC Cost', 'Margin', 'Margin %']} />
              <tbody>
                {pf.length > 0 ? pf.map((p, i) => {
                  const m = p.revenue - p.costs;
                  const mPct = p.revenue > 0 ? Math.round((m / p.revenue) * 100) : 0;
                  return (
                    <TRow key={p.projectId} onClick={() => navigate(`/project/${p.projectId}`)} cells={[
                      <TdN>{p.projectName}</TdN>, <TdM>{fmt(p.revenue)}</TdM>,
                      <TdM>{fmt(p.costs)}</TdM>, <TdM>{fmt(m)}</TdM>,
                      <span style={{ fontWeight: 700, color: mPct > 0 ? C.green : C.red }}>{mPct}%</span>,
                    ]} />
                  );
                }) : <TRow cells={[<span style={{ color: C.faint }}>No contracts yet</span>, '', '', '', '']} />}
                {gcRevenue > 0 && <TRow isTotal cells={['', <TdM>{fmt(gcRevenue)}</TdM>, <TdM>{fmt(fcCost)}</TdM>, <TdM>{fmt(grossMargin)}</TdM>, <span style={{ fontWeight: 700 }}>{marginPct}%</span>]} />}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 2: FC / Labor Contracts (Cost) */}
          <KpiCard idx={1} accent={C.navy} icon={<Users size={18} color={C.navy} />} iconBg={C.surface2}
            label="FC / LABOR CONTRACTS (COST)" value={fcCost > 0 ? fmt(fcCost) : '—'}
            sub="Field crew and sub-contractor costs"
            pills={[{ type: 'pm', text: 'Cost' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'FC Contract', 'GC Contract', 'Margin']} />
              <tbody>
                {pf.length > 0 ? pf.map((p, i) => (
                  <TRow key={p.projectId} onClick={() => navigate(`/project/${p.projectId}`)} cells={[
                    <TdN>{p.projectName}</TdN>, <TdM>{fmt(p.costs)}</TdM>,
                    <TdM>{fmt(p.revenue)}</TdM>, <TdM>{fmt(p.revenue - p.costs)}</TdM>,
                  ]} />
                )) : <TRow cells={[<span style={{ color: C.faint }}>No FC contracts yet</span>, '', '', '']} />}
                {fcCost > 0 && <TRow isTotal cells={['', <TdM>{fmt(fcCost)}</TdM>, <TdM>{fmt(gcRevenue)}</TdM>, <TdM>{fmt(grossMargin)}</TdM>]} />}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 3: Gross Margin */}
          <KpiCard idx={2} accent={C.green} icon={<TrendingUp size={18} color={C.green} />} iconBg={C.greenBg}
            label="GROSS MARGIN" value={gcRevenue > 0 ? fmt(grossMargin) : '—'}
            sub={gcRevenue > 0 ? `${marginPct}% margin across all projects` : 'No contract data yet'}
            pills={gcRevenue > 0 ? [{ type: 'pg', text: `↑ ${marginPct}%` }] : [{ type: 'pm', text: 'No data' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'GC Contract', 'FC Contract', 'Gross Margin', 'Margin %']} />
              <tbody>
                {pf.length > 0 ? pf.map((p, i) => {
                  const m = p.revenue - p.costs;
                  const mPct = p.revenue > 0 ? Math.round((m / p.revenue) * 100) : 0;
                  return (
                    <TRow key={p.projectId} cells={[
                      <TdN>{p.projectName}</TdN>, <TdM>{fmt(p.revenue)}</TdM>,
                      <TdM>{fmt(p.costs)}</TdM>, <TdM>{fmt(m)}</TdM>,
                      <span style={{ fontWeight: 700, color: mPct > 0 ? C.green : C.red }}>{mPct}%</span>,
                    ]} />
                  );
                }) : <TRow cells={[<span style={{ color: C.faint }}>No data yet</span>, '', '', '', '']} />}
                {gcRevenue > 0 && <TRow isTotal cells={['', <TdM>{fmt(gcRevenue)}</TdM>, <TdM>{fmt(fcCost)}</TdM>, <TdM>{fmt(grossMargin)}</TdM>, <span style={{ fontWeight: 700 }}>{marginPct}%</span>]} />}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 4: Change Orders */}
          <KpiCard idx={3} accent={C.blue} icon={<FileText size={18} color={C.blue} />} iconBg={C.blueBg}
            label="CHANGE ORDERS" value={coCount > 0 ? `${coCount} COs` : '—'}
            sub={coCount > 0 ? `${coList.filter(c => ['submitted', 'shared'].includes(c.status)).length} pending review` : 'No change orders yet'}
            pills={coCount > 0 ? [{ type: 'pb', text: `${coCount} total` }] : [{ type: 'pm', text: 'None' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['CO', 'Project', 'Status', '']} />
              <tbody>
                {coList.length > 0 ? coList.slice(0, 10).map(co => (
                  <TRow key={co.id} onClick={() => navigate(`/project/${co.projectId}/change-orders`)} cells={[
                    <TdN>{co.title}</TdN>, <>{co.projectName}</>,
                    <Pill type={['submitted', 'shared'].includes(co.status) ? 'pw' : co.status === 'approved' ? 'pg' : co.status === 'contracted' ? 'pg' : 'pm'}>{co.status}</Pill>,
                    <span style={{ color: C.blue, fontSize: '0.7rem', fontWeight: 600 }}>View →</span>,
                  ]} />
                )) : <TRow cells={[<span style={{ color: C.faint }}>No change orders yet</span>, '', '', '']} />}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 5: Received from GC */}
          <KpiCard idx={4} accent={C.green} icon={<CheckCircle size={18} color={C.green} />} iconBg={C.greenBg}
            label="RECEIVED FROM GC" value={receivedFromGC > 0 ? fmt(receivedFromGC) : '—'}
            sub={gcRevenue > 0 ? `${Math.round((receivedFromGC / gcRevenue) * 100)}% of total contracted value` : 'No payments received yet'}
            pills={receivedFromGC > 0 ? [{ type: 'pg', text: `${gcRevenue > 0 ? Math.round((receivedFromGC / gcRevenue) * 100) : 0}% collected` }] : [{ type: 'pm', text: 'No data' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'GC Contract', 'Paid by GC', '% Collected', 'Pending']} />
              <tbody>
                {pf.length > 0 ? pf.map((p, i) => {
                  const pct = p.revenue > 0 ? Math.round((p.paidToYou / p.revenue) * 100) : 0;
                  return (
                    <TRow key={p.projectId} onClick={() => navigate(`/project/${p.projectId}?tab=invoices`)} cells={[
                      <TdN>{p.projectName}</TdN>, <TdM>{fmt(p.revenue)}</TdM>, <TdM>{fmt(p.paidToYou)}</TdM>,
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Bar pct={pct} color={pct >= 80 ? C.green : pct >= 40 ? C.amber : C.red} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: C.muted }}>{pct}%</span>
                      </div>,
                      <TdM>{fmt(p.pendingToCollect)}</TdM>,
                    ]} />
                  );
                }) : <TRow cells={[<span style={{ color: C.faint }}>No data yet</span>, '', '', '', '']} />}
                {receivedFromGC > 0 && <TRow isTotal cells={['', <TdM>{fmt(gcRevenue)}</TdM>, <TdM>{fmt(receivedFromGC)}</TdM>, <span style={{ fontWeight: 700 }}>{gcRevenue > 0 ? Math.round((receivedFromGC / gcRevenue) * 100) : 0}%</span>, <TdM>{fmt(pendingFromGC)}</TdM>]} />}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 6: Pending from GC */}
          <KpiCard idx={5} accent={C.yellow} icon={<Clock size={18} color={C.yellow} />} iconBg={C.yellowBg}
            label="PENDING FROM GC" value={pendingFromGC > 0 ? fmt(pendingFromGC) : '—'}
            sub={pendingInvoiceDocs.length > 0 ? `${pendingInvoiceDocs.length} invoice${pendingInvoiceDocs.length !== 1 ? 's' : ''} awaiting GC approval` : 'No pending invoices'}
            pills={pendingFromGC > 0 ? [{ type: 'pw', text: 'Chasing GC' }] : [{ type: 'pg', text: 'All clear' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Invoice', 'Project', 'Amount', 'Status']} />
              <tbody>
                {pendingInvoiceDocs.length > 0 ? pendingInvoiceDocs.slice(0, 8).map(inv => (
                  <TRow key={inv.id} onClick={() => navigate(`/project/${inv.projectId}?tab=invoices`)} cells={[
                    <TdN>{inv.title}</TdN>, <>{inv.projectName}</>,
                    <TdM>{inv.amount ? fmt(inv.amount) : '—'}</TdM>,
                    <Pill type={inv.status === 'SUBMITTED' ? 'pw' : 'pb'}>{inv.status}</Pill>,
                  ]} />
                )) : <TRow cells={[<span style={{ color: C.faint }}>No pending invoices</span>, '', '', '']} />}
                {pendingFromGC > 0 && <TRow isTotal cells={['', '', <TdM>{fmt(pendingFromGC)}</TdM>, '']} />}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 7: TC Material Budget (POs) */}
          <KpiCard idx={6} accent={C.purple} icon={<Package size={18} color={C.purple} />} iconBg={C.purpleBg}
            label="MATERIALS (TC POs)" value={poTotal > 0 ? fmt(poTotal) : '—'}
            sub={`${poDocs.length} purchase order${poDocs.length !== 1 ? 's' : ''}`}
            pills={poDocs.length > 0 ? [{ type: 'pg', text: `${poDocs.length} POs` }] : [{ type: 'pm', text: 'None' }]}>
            <div>
              {posByProject.size > 0 ? Array.from(posByProject.entries()).map(([project, pos]) => (
                <div key={project}>
                  <div style={{ padding: '10px 12px 4px', fontSize: '0.7rem', fontWeight: 700, color: C.ink, textTransform: 'uppercase', letterSpacing: '0.5px', background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                    📦 {project}
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <THead cols={['PO', 'Amount', 'Status']} />
                    <tbody>
                      {pos.map(po => (
                        <TRow key={po.id} onClick={() => navigate(`/project/${po.projectId}/purchase-orders`)} cells={[
                          <TdN>{po.title}</TdN>,
                          <TdM>{po.amount ? fmt(po.amount) : '—'}</TdM>,
                          <Pill type={po.status === 'DELIVERED' ? 'pg' : po.status === 'CANCELLED' ? 'pr' : 'pb'}>{po.status}</Pill>,
                        ]} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )) : (
                <div style={{ padding: '16px', textAlign: 'center', color: C.faint, fontSize: '0.76rem' }}>No purchase orders yet</div>
              )}
            </div>
          </KpiCard>

          {/* Card 8: Attention Items */}
          <KpiCard idx={7} accent={C.red} icon={<HelpCircle size={18} color={C.red} />} iconBg={C.redBg}
            label="NEEDS ATTENTION" value={`${attentionItems.length} Items`}
            sub={`${attentionItems.filter(a => a.type === 'invoice').length} invoices · ${attentionItems.filter(a => a.type === 'sent_invite').length} invites`}
            pills={attentionItems.length > 0 ? [{ type: 'pr', text: `${attentionItems.length} need response` }] : [{ type: 'pg', text: 'All clear' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Item', 'Project', 'Type', '']} />
              <tbody>
                {attentionItems.length > 0 ? attentionItems.slice(0, 8).map(a => (
                  <TRow key={a.id} onClick={() => navigate(`/project/${a.projectId}`)} cells={[
                    <TdN>{a.title}</TdN>, <>{a.projectName}</>,
                    <Pill type={a.type === 'invoice' ? 'pr' : 'pw'}>{a.type === 'invoice' ? 'Invoice' : 'Invite'}</Pill>,
                    <span style={{ color: C.blue, fontSize: '0.7rem', fontWeight: 600 }}>View →</span>,
                  ]} />
                )) : <TRow cells={[<span style={{ color: C.faint }}>No attention items</span>, '', '', '']} />}
              </tbody>
            </table>
          </KpiCard>
        </div>

        {/* Needs Attention */}
        {attentionItems.length > 0 && (
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.ink, fontSize: '0.9rem', ...fontLabel }}>
              🚨 Action Required
            </div>
            {attentionItems.map(item => (
              <WarnItem key={item.id} color={item.type === 'invoice' ? C.yellow : C.blue}
                icon={item.type === 'invoice' ? '💰' : '📋'} title={item.title} sub={item.projectName}
                value={item.type === 'invoice' ? 'Review' : 'Pending'}
                pill={item.type === 'invoice' ? 'Chasing' : 'Action'} pillType={item.type === 'invoice' ? 'pw' : 'pb'}
                onClick={() => navigate(`/project/${item.projectId}`)} />
            ))}
          </div>
        )}

        {/* My Projects Grid */}
        {activeProjects.length > 0 && (
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontWeight: 700, color: C.ink, fontSize: '0.9rem', ...fontLabel }}>📋 My Projects</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
              {activeProjects.slice(0, 6).map((p, i) => {
                const progress = p.status === 'completed' ? 100 : p.status === 'active' ? 50 : p.status === 'on_hold' ? 30 : 10;
                return (
                  <ProjectCard key={p.id} name={p.name} phase={p.build_type || p.project_type || p.status}
                    budget={p.contractValue || 0} progress={progress} barColor={getProjectColor(i)}
                    onClick={() => navigate(`/project/${p.id}`)} />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

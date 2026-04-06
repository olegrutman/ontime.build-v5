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

/* ─── Demo data for TC-specific cards ─── */
const DEMO_PROJECTS = [
  { name: 'Cherry Hills', phase: 'Framing L2-4', gcContract: 368_000, fcCost: 290_000, margin: 78_000, marginPct: 21, progress: 65, color: C.amber },
  { name: 'Tower 14', phase: 'Structural L6-9', gcContract: 595_000, fcCost: 475_000, margin: 120_000, marginPct: 20, progress: 45, color: C.blue },
  { name: 'Mesa Logistics', phase: 'MEP Rough-in', gcContract: 248_000, fcCost: 195_000, margin: 53_000, marginPct: 21, progress: 90, color: C.green },
];
const DEMO_TOTALS = { gcContract: 1_211_000, fcCost: 960_000, margin: 251_000, marginPct: 20.7 };

const DEMO_COS = [
  { project: 'Cherry Hills', co: 'CO-006', desc: 'Level 2 scope add', billedGC: 2_200, paidFC: 1_600, net: 600 },
  { project: 'Cherry Hills', co: 'CO-007', desc: 'Stairwell mod', billedGC: 1_800, paidFC: 1_200, net: 600 },
  { project: 'Cherry Hills', co: 'CO-008', desc: 'Level 3 scope', billedGC: 6_200, paidFC: 4_800, net: 1_400 },
  { project: 'Tower 14', co: 'CO-T14-01', desc: 'Level 7 scope', billedGC: 4_800, paidFC: 3_600, net: 1_200 },
  { project: 'Tower 14', co: 'CO-T14-02', desc: 'Beam upgrade', billedGC: 3_200, paidFC: 2_400, net: 800 },
  { project: 'Tower 14', co: 'CO-T14-03', desc: 'Core wall add', billedGC: 6_100, paidFC: 4_800, net: 1_300 },
  { project: 'Tower 14', co: 'CO-T14-04', desc: 'Stairshaft mod', billedGC: 2_900, paidFC: 2_200, net: 700, pending: true },
  { project: 'Tower 14', co: 'CO-T14-05', desc: 'Roof struct', billedGC: 5_000, paidFC: 3_800, net: 1_200, pending: true },
  { project: 'Mesa', co: 'CO-MLH-01', desc: 'MEP coord', billedGC: 2_400, paidFC: 1_800, net: 600 },
  { project: 'Mesa', co: 'CO-MLH-02', desc: 'Roof drain', billedGC: 1_800, paidFC: 1_200, net: 600 },
];

const DEMO_RECEIVED = [
  { project: 'Cherry Hills', gcContract: 368_000, paidByGC: 95_000, pct: 26, pendingFromGC: 18_400, barColor: C.green },
  { project: 'Tower 14', gcContract: 595_000, paidByGC: 130_000, pct: 22, pendingFromGC: 42_000, barColor: C.amber },
  { project: 'Mesa Logistics', gcContract: 248_000, paidByGC: 235_000, pct: 95, pendingFromGC: 12_000, barColor: C.green },
];

const DEMO_PENDING_INVOICES = [
  { inv: 'INV-1048', project: 'Cherry Hills', submitted: '4 hr ago', amount: 18_400, overdue: false },
  { inv: 'INV-T14-042', project: 'Tower 14', submitted: '2 days ago', amount: 42_000, overdue: true },
  { inv: 'INV-MLH-019', project: 'Mesa Logistics', submitted: '1 day ago', amount: 12_000, overdue: false },
];

const DEMO_MATERIALS = {
  'Cherry Hills': [
    { pack: 'Framing Lumber', est: 32_000, ordered: 28_500, status: 'On Track' as const },
    { pack: 'Fasteners & Hardware', est: 8_200, ordered: 7_800, status: 'On Track' as const },
    { pack: 'Sheathing (OSB)', est: 14_500, ordered: 14_200, status: 'On Track' as const },
    { pack: 'LVL Beams', est: 12_000, ordered: 10_500, status: 'Pending' as const },
  ],
  'Tower 14': [
    { pack: 'Structural Steel', est: 85_000, ordered: 91_000, status: 'Over' as const },
    { pack: 'Rebar & Mesh', est: 22_000, ordered: 19_500, status: 'On Track' as const },
    { pack: 'Concrete (Pre-mix)', est: 18_000, ordered: 16_200, status: 'On Track' as const },
    { pack: 'Anchor Bolts', est: 4_800, ordered: 4_100, status: 'On Track' as const },
  ],
};

const DEMO_RFIS = {
  'Cherry Hills': [
    { id: 'RFI-042', subject: 'Level 2 header beam spec', age: '3 days', priority: 'high' as const },
    { id: 'RFI-039', subject: 'Stairwell framing layout', age: '5 days', priority: 'normal' as const },
    { id: 'RFI-038', subject: 'Shear wall nailing pattern', age: '6 days', priority: 'normal' as const },
    { id: 'RFI-035', subject: 'Window rough opening sizes', age: '7 days', priority: 'normal' as const },
  ],
  'Tower 14': [
    { id: 'RFI-T14-18', subject: 'Core wall rebar spacing', age: '2 days', priority: 'urgent' as const },
    { id: 'RFI-T14-16', subject: 'Level 8 slab thickness', age: '4 days', priority: 'high' as const },
    { id: 'RFI-T14-15', subject: 'Beam connection detail', age: '8 days', priority: 'high' as const },
  ],
  'Mesa': [
    { id: 'RFI-MLH-07', subject: 'MEP penetration locations', age: '1 day', priority: 'normal' as const },
  ],
};

const DEMO_WARNINGS = [
  { color: C.yellow, icon: '💰', title: 'INV-T14-042 Awaiting GC Approval — Follow Up', sub: 'Tower 14 · 2 days pending', value: '$42,000', pill: 'Chasing', pillType: 'pw' as PillType },
  { color: C.yellow, icon: '💰', title: 'INV-1048 Awaiting GC Approval — 4+ hrs', sub: 'Cherry Hills', value: '$18,400', pill: 'Chasing', pillType: 'pw' as PillType },
  { color: C.red, icon: '📦', title: 'T14 Structural Steel Over Budget — Review FC Allocation', sub: 'Ordered $91K vs $85K est', value: '+$6,000', pill: 'Over Budget', pillType: 'pr' as PillType },
  { color: C.blue, icon: '📋', title: 'CO-T14-04 & CO-T14-05 Pending GC Sign-off', sub: 'Tower 14 · $7,900 combined', value: '$7,900', pill: 'Pending', pillType: 'pb' as PillType },
];

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
  projects, financials, billing, attentionItems, pendingInvites, recentDocs,
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

  // Use real data where available, fallback to demo
  const gcRevenue = financials.totalRevenue > 0 ? financials.totalRevenue : DEMO_TOTALS.gcContract;
  const fcCost = financials.totalCosts > 0 ? financials.totalCosts : DEMO_TOTALS.fcCost;
  const grossMargin = gcRevenue - fcCost;
  const marginPct = gcRevenue > 0 ? ((grossMargin / gcRevenue) * 100).toFixed(1) : '0';

  const coList = recentDocs.filter(d => d.type === 'change_order');
  const coCount = coList.length > 0 ? coList.length : DEMO_COS.length;
  const coNetTotal = DEMO_COS.reduce((s, c) => s + c.net, 0);
  const coBilledTotal = DEMO_COS.reduce((s, c) => s + c.billedGC, 0);
  const coPaidTotal = DEMO_COS.reduce((s, c) => s + c.paidFC, 0);

  const receivedFromGC = financials.paidToYou > 0 ? financials.paidToYou : 460_000;
  const pendingFromGC = billing.outstandingToCollect > 0 ? billing.outstandingToCollect : 72_400;

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
          <OnboardingChecklist profileComplete={profileComplete} orgComplete={orgComplete} teamInvited={teamInvited} projectCreated={projectCreated} orgType={orgType}
            onDismiss={async () => updateUserSettings({ onboarding_dismissed: true })} onMarkSoleMember={onSetSoleMember} onMarkPartOfTeam={onSetPartOfTeam} />
        )}

        <OrgInviteBanner />

        {pendingInvites.length > 0 && <PendingInvitesPanel invites={pendingInvites} onRefresh={onRefresh} />}

        {/* KPI Grid — 3 cols for TC */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">

          {/* Card 1: GC Contracts (Revenue) */}
          <KpiCard idx={0} accent={C.amber} icon={<Handshake size={18} color={C.amberD} />} iconBg={C.amberPale}
            label="GC CONTRACTS (REVENUE)" value={fmt(gcRevenue)}
            sub={`${projects.length > 0 ? projects.length : 3} active projects with GC`}
            pills={[{ type: 'pa', text: 'Revenue' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'Phase', 'GC Contract', 'FC Cost', 'Margin', 'Margin %']} />
              <tbody>
                {DEMO_PROJECTS.map((p, i) => (
                  <TRow key={i} onClick={() => console.log('navigate → TC contracts')} cells={[
                    <TdN>{p.name}</TdN>, <>{p.phase}</>, <TdM>{fmt(p.gcContract)}</TdM>,
                    <TdM>{fmt(p.fcCost)}</TdM>, <TdM>{fmt(p.margin)}</TdM>,
                    <span style={{ fontWeight: 700, color: C.green }}>{p.marginPct}%</span>,
                  ]} />
                ))}
                <TRow isTotal cells={['', '', <TdM>{fmt(DEMO_TOTALS.gcContract)}</TdM>, <TdM>{fmt(DEMO_TOTALS.fcCost)}</TdM>, <TdM>{fmt(DEMO_TOTALS.margin)}</TdM>, <span style={{ fontWeight: 700 }}>{DEMO_TOTALS.marginPct}%</span>]} />
              </tbody>
            </table>
          </KpiCard>

          {/* Card 2: FC / Labor Contracts (Cost) */}
          <KpiCard idx={1} accent={C.navy} icon={<Users size={18} color={C.navy} />} iconBg={C.surface2}
            label="FC / LABOR CONTRACTS (COST)" value={fmt(fcCost)}
            sub="Field crew and sub-contractor costs"
            pills={[{ type: 'pm', text: 'Cost' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'Phase', 'FC Contract', 'GC Contract', 'Margin']} />
              <tbody>
                {DEMO_PROJECTS.map((p, i) => (
                  <TRow key={i} cells={[
                    <TdN>{p.name}</TdN>, <>{p.phase}</>, <TdM>{fmt(p.fcCost)}</TdM>,
                    <TdM>{fmt(p.gcContract)}</TdM>, <TdM>{fmt(p.margin)}</TdM>,
                  ]} />
                ))}
                <TRow isTotal cells={['', '', <TdM>{fmt(DEMO_TOTALS.fcCost)}</TdM>, <TdM>{fmt(DEMO_TOTALS.gcContract)}</TdM>, <TdM>{fmt(DEMO_TOTALS.margin)}</TdM>]} />
              </tbody>
            </table>
          </KpiCard>

          {/* Card 3: Gross Margin */}
          <KpiCard idx={2} accent={C.green} icon={<TrendingUp size={18} color={C.green} />} iconBg={C.greenBg}
            label="GROSS MARGIN" value={fmt(grossMargin)}
            sub={`${marginPct}% margin across all projects`}
            pills={[{ type: 'pg', text: `↑ ${marginPct}%` }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'GC Contract', 'FC Contract', 'Gross Margin', 'Margin %']} />
              <tbody>
                {DEMO_PROJECTS.map((p, i) => (
                  <TRow key={i} cells={[
                    <TdN>{p.name}</TdN>, <TdM>{fmt(p.gcContract)}</TdM>,
                    <TdM>{fmt(p.fcCost)}</TdM>, <TdM>{fmt(p.margin)}</TdM>,
                    <span style={{ fontWeight: 700, color: C.green }}>{p.marginPct}%</span>,
                  ]} />
                ))}
                <TRow isTotal cells={['', <TdM>{fmt(DEMO_TOTALS.gcContract)}</TdM>, <TdM>{fmt(DEMO_TOTALS.fcCost)}</TdM>, <TdM>{fmt(DEMO_TOTALS.margin)}</TdM>, <span style={{ fontWeight: 700 }}>{DEMO_TOTALS.marginPct}%</span>]} />
              </tbody>
            </table>
          </KpiCard>

          {/* Card 4: CO Net Margin */}
          <KpiCard idx={3} accent={C.blue} icon={<FileText size={18} color={C.blue} />} iconBg={C.blueBg}
            label="CO NET MARGIN" value={fmtSigned(coNetTotal)}
            sub={`${coCount} COs · Billed ${fmt(coBilledTotal)} to GC · Paid ${fmt(coPaidTotal)} to FCs`}
            pills={[{ type: 'pb', text: 'CO profit' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'CO #', 'Description', 'Billed to GC', 'Paid to FC', 'TC Net']} />
              <tbody>
                {DEMO_COS.map((co, i) => (
                  <TRow key={i} cells={[
                    <>{co.project}</>, <TdN>{co.co}</TdN>, <>{co.desc}</>,
                    <TdM>{fmtSigned(co.billedGC)}</TdM>, <TdM>{fmt(co.paidFC)}</TdM>,
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                      <TdM>{fmtSigned(co.net)}</TdM>
                      {co.pending && <Pill type="pw">Pending GC</Pill>}
                    </span>,
                  ]} />
                ))}
                <TRow isTotal cells={['', <TdN>10</TdN>, '', <TdM>{fmtSigned(coBilledTotal)}</TdM>, <TdM>{fmt(coPaidTotal)}</TdM>, <TdM>{fmtSigned(coNetTotal)}</TdM>]} />
              </tbody>
            </table>
          </KpiCard>

          {/* Card 5: Received from GC */}
          <KpiCard idx={4} accent={C.green} icon={<CheckCircle size={18} color={C.green} />} iconBg={C.greenBg}
            label="RECEIVED FROM GC" value={fmt(receivedFromGC)}
            sub={`${gcRevenue > 0 ? Math.round((receivedFromGC / gcRevenue) * 100) : 38}% of total contracted value`}
            pills={[{ type: 'pg', text: `${gcRevenue > 0 ? Math.round((receivedFromGC / gcRevenue) * 100) : 38}% collected` }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'GC Contract', 'Paid by GC', '% Collected', 'Pending']} />
              <tbody>
                {DEMO_RECEIVED.map((r, i) => (
                  <TRow key={i} onClick={() => console.log('navigate → TC invoices')} cells={[
                    <TdN>{r.project}</TdN>, <TdM>{fmt(r.gcContract)}</TdM>, <TdM>{fmt(r.paidByGC)}</TdM>,
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Bar pct={r.pct} color={r.barColor} />
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: C.muted }}>{r.pct}%</span>
                    </div>,
                    <TdM>{fmt(r.pendingFromGC)}</TdM>,
                  ]} />
                ))}
                <TRow isTotal cells={['', <TdM>{fmt(DEMO_TOTALS.gcContract)}</TdM>, <TdM>{fmt(460_000)}</TdM>, <span style={{ fontWeight: 700 }}>38%</span>, <TdM>{fmt(72_400)}</TdM>]} />
              </tbody>
            </table>
          </KpiCard>

          {/* Card 6: Pending from GC */}
          <KpiCard idx={5} accent={C.yellow} icon={<Clock size={18} color={C.yellow} />} iconBg={C.yellowBg}
            label="PENDING FROM GC" value={fmt(pendingFromGC)}
            sub="Invoices submitted awaiting GC approval"
            pills={[{ type: 'pw', text: 'Chasing GC' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Invoice', 'Project', 'Submitted', 'Amount', 'Status']} />
              <tbody>
                {DEMO_PENDING_INVOICES.map((inv, i) => (
                  <TRow key={i} cells={[
                    <TdN>{inv.inv}</TdN>, <>{inv.project}</>, <>{inv.submitted}</>,
                    <TdM>{fmt(inv.amount)}</TdM>,
                    <Pill type={inv.overdue ? 'pr' : 'pw'}>{inv.overdue ? 'Overdue — follow up' : 'Pending'}</Pill>,
                  ]} />
                ))}
                <TRow isTotal cells={['', '', '', <TdM>{fmt(72_400)}</TdM>, '']} />
              </tbody>
            </table>
          </KpiCard>

          {/* Card 7: TC Material Budget */}
          <KpiCard idx={6} accent={C.purple} icon={<Package size={18} color={C.purple} />} iconBg={C.purpleBg}
            label="MATERIAL BUDGET (TC POs)" value="$192.3K"
            sub="TC holds POs for Cherry Hills & Tower 14"
            pills={[{ type: 'pr', text: 'T14 steel over $6K' }]}>
            <div>
              {Object.entries(DEMO_MATERIALS).map(([project, packs]) => (
                <div key={project}>
                  <div style={{ padding: '10px 12px 4px', fontSize: '0.7rem', fontWeight: 700, color: C.ink, textTransform: 'uppercase', letterSpacing: '0.5px', background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                    📦 {project}
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <THead cols={['Pack', 'Estimate', 'Ordered', 'Status']} />
                    <tbody>
                      {packs.map((p, i) => (
                        <TRow key={i} cells={[
                          <TdN>{p.pack}</TdN>, <TdM>{fmt(p.est)}</TdM>, <TdM>{fmt(p.ordered)}</TdM>,
                          <Pill type={p.status === 'Over' ? 'pr' : p.status === 'Pending' ? 'pw' : 'pg'}>{p.status === 'Over' ? `+${fmt(p.ordered - p.est)}` : p.status}</Pill>,
                        ]} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </KpiCard>

          {/* Card 8: Open RFIs */}
          <KpiCard idx={7} accent={C.red} icon={<HelpCircle size={18} color={C.red} />} iconBg={C.redBg}
            label="OPEN RFIs (MY PROJECTS)" value="12 Open"
            sub="Cherry Hills, Tower 14, Mesa Logistics"
            pills={[{ type: 'pr', text: '12 need response' }]}>
            <div>
              {Object.entries(DEMO_RFIS).map(([project, rfis]) => {
                const shown = rfis.slice(0, 3);
                const more = rfis.length - shown.length;
                return (
                  <div key={project}>
                    <div style={{ padding: '10px 12px 4px', fontSize: '0.7rem', fontWeight: 700, color: C.ink, textTransform: 'uppercase', letterSpacing: '0.5px', background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                      ❓ {project} — {rfis.length} open
                    </div>
                    {shown.map((rfi, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: `1px solid ${C.border}`, fontSize: '0.76rem' }}>
                        <TdN>{rfi.id}</TdN>
                        <span style={{ flex: 1, color: C.muted }}>{rfi.subject}</span>
                        <span style={{ fontSize: '0.64rem', color: C.faint }}>{rfi.age}</span>
                        <Pill type={rfi.priority === 'urgent' ? 'pr' : rfi.priority === 'high' ? 'pw' : 'pb'}>{rfi.priority}</Pill>
                      </div>
                    ))}
                    {more > 0 && (
                      <div style={{ padding: '6px 12px', fontSize: '0.7rem', color: C.blue, fontWeight: 600, cursor: 'pointer' }}>
                        + {more} more →
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </KpiCard>
        </div>

        {/* Needs Attention */}
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.ink, fontSize: '0.9rem', ...fontLabel }}>
            🚨 Action Required
          </div>
          {/* Real attention items first */}
          {attentionItems.map(item => (
            <WarnItem key={item.id} color={item.type === 'invoice' ? C.yellow : C.blue}
              icon={item.type === 'invoice' ? '💰' : '📋'} title={item.title} sub={item.projectName}
              value={item.type === 'invoice' ? 'Review' : 'Pending'}
              pill={item.type === 'invoice' ? 'Chasing' : 'Action'} pillType={item.type === 'invoice' ? 'pw' : 'pb'}
              onClick={() => navigate(`/project/${item.projectId}`)} />
          ))}
          {/* Demo warnings */}
          {attentionItems.length === 0 && DEMO_WARNINGS.map((w, i) => (
            <WarnItem key={i} color={w.color} icon={w.icon} title={w.title} sub={w.sub} value={w.value} pill={w.pill} pillType={w.pillType} />
          ))}
        </div>

        {/* My Projects Grid */}
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontWeight: 700, color: C.ink, fontSize: '0.9rem', ...fontLabel }}>📋 My Projects</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
            {activeProjects.length > 0 ? activeProjects.slice(0, 6).map((p, i) => {
              const progress = p.status === 'completed' ? 100 : p.status === 'active' ? 50 : p.status === 'on_hold' ? 30 : 10;
              return (
                <ProjectCard key={p.id} name={p.name} phase={p.build_type || p.project_type || p.status}
                  budget={p.contractValue || 0} progress={progress} barColor={getProjectColor(i)}
                  onClick={() => navigate(`/project/${p.id}`)} />
              );
            }) : DEMO_PROJECTS.map((p, i) => (
              <ProjectCard key={i} name={p.name} phase={p.phase} budget={p.gcContract}
                progress={p.progress} barColor={p.color} onClick={() => console.log('navigate →', p.name)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

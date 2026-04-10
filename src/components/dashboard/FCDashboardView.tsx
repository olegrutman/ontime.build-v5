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

function TRow({ cells, isTotal, greenText, onClick }: { cells: ReactNode[]; isTotal?: boolean; greenText?: boolean; onClick?: () => void }) {
  return (
    <tr style={{ ...(isTotal ? totalRowStyle : { cursor: 'pointer' }), ...(greenText ? { color: C.green } : {}) }} className={isTotal ? '' : 'hover:bg-[rgba(245,166,35,.05)]'} onClick={onClick}>
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

export interface FCDashboardViewProps {
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

export function FCDashboardView({
  projects, financials, projectFinancials, billing, attentionItems, pendingInvites, recentDocs,
  statusCounts, profile, organization, userSettings, updateUserSettings,
  isOrgAdmin, userOrgRolesLength, orgType, orgId, soleMember,
  onSetSoleMember, onSetPartOfTeam, onRefresh, loading,
}: FCDashboardViewProps) {
  const navigate = useNavigate();
  const showOnboarding = userSettings && !userSettings.onboarding_dismissed;
  const profileComplete = !!(profile?.first_name && profile?.phone);
  const orgComplete = !!(organization?.address?.street);
  const teamInvited = !isOrgAdmin || (userOrgRolesLength > 1) || soleMember;
  const projectCreated = projects.length > 0;

  // Primary project — FC usually has one
  const primaryProject = projects[0] || null;
  const pf = projectFinancials[0] || null;

  // Financials
  const contractValue = pf ? pf.revenue : financials.totalRevenue;
  const costs = pf ? pf.costs : financials.totalCosts;

  // COs from recentDocs
  const coList = recentDocs.filter(d => d.type === 'change_order');
  const approvedCOs = coList.filter(d => ['approved', 'contracted', 'completed'].includes(d.status));
  const coTotal = approvedCOs.reduce((s, d) => s + (d.amount || 0), 0);

  // Margin
  const totalScope = contractValue + coTotal;
  const netMargin = totalScope - costs;
  const marginPct = totalScope > 0 ? ((netMargin / totalScope) * 100).toFixed(1) : '0';

  // Invoices
  const invoiceDocs = recentDocs.filter(d => d.type === 'invoice');
  const paidInvoices = invoiceDocs.filter(d => d.status === 'PAID');
  const pendingInvoiceDocs = invoiceDocs.filter(d => ['SUBMITTED', 'APPROVED'].includes(d.status));
  const paidTotal = paidInvoices.reduce((s, d) => s + (d.amount || 0), 0);
  const pendingTotal = pendingInvoiceDocs.reduce((s, d) => s + (d.amount || 0), 0);
  const collectedPct = totalScope > 0 ? ((paidTotal / totalScope) * 100).toFixed(0) : '0';

  // Work progress estimate from paid vs total
  const progressPct = totalScope > 0 ? Math.min(Math.round(((paidTotal + pendingTotal) / totalScope) * 100), 100) : 0;

  const greeting = (() => {
    const h = new Date().getHours();
    const name = profile?.first_name;
    const g = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
    return name ? `Good ${g}, ${name}` : 'Dashboard';
  })();

  return (
    <div className="flex gap-0">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 space-y-4 px-4 lg:px-5">
        {/* Greeting */}
        <div style={{ ...fontLabel }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.ink, ...fontVal }}>{greeting}</h1>
          <p style={{ fontSize: '0.78rem', color: C.muted, marginTop: 2 }}>
            {projects.length > 0
              ? `${projects.length} project${projects.length > 1 ? 's' : ''} · ${attentionItems.length + pendingInvites.length} action${(attentionItems.length + pendingInvites.length) !== 1 ? 's' : ''} needed`
              : 'No active projects yet'}
          </p>
        </div>

        {showOnboarding && (
          <OnboardingChecklist
            profileComplete={profileComplete}
            orgComplete={orgComplete}
            teamInvited={teamInvited}
            projectCreated={projectCreated}
            orgType={orgType}
            onDismiss={async () => updateUserSettings({ onboarding_dismissed: true })}
            onMarkSoleMember={onSetSoleMember}
            onMarkPartOfTeam={onSetPartOfTeam}
          />
        )}

        <OrgInviteBanner />

        {pendingInvites.length > 0 && (
          <PendingInvitesPanel invites={pendingInvites} onRefresh={onRefresh} />
        )}

        {/* ═══ 6 KPI Cards — 3-column grid ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }} className="max-[900px]:!grid-cols-2 max-[600px]:!grid-cols-1">

          {/* Card 1 — Contract with TC */}
          <KpiCard
            accent={C.amber} icon="🤝" iconBg={C.amberPale}
            label="CONTRACT WITH TRADE CONTRACTOR"
            value={fmt(contractValue)}
            sub={primaryProject ? `${organization?.name || 'Trade Contractor'} · ${primaryProject.name}` : 'No project'}
            pills={[{ type: 'pa', text: primaryProject?.status === 'active' ? 'Active' : (primaryProject?.status || 'Setup') }]}
            idx={0}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Item', 'Value', 'Notes']} />
              <tbody>
                <TRow cells={[<TdN>Base Contract with Trade Contractor</TdN>, <TdM>{fmt(contractValue)}</TdM>, <span>{organization?.name || '—'}{primaryProject ? ` · ${primaryProject.name}` : ''}</span>]} />
                <TRow cells={[<TdN>Approved CO Additions</TdN>, <TdM>+{fmt(coTotal)}</TdM>, <span>{approvedCOs.length} approved COs</span>]} />
                <TRow cells={[<TdN>Internal Cost Budget</TdN>, <TdM>{fmt(costs)}</TdM>, <span>Labor + materials cost</span>]} />
                <TRow cells={[
                  <TdN>Net Margin</TdN>,
                  <span style={{ ...fontMono, fontSize: '0.78rem', fontWeight: 700, color: C.green }}>{fmt(netMargin)}</span>,
                  <span style={{ color: C.green, fontWeight: 700 }}>{marginPct}% margin</span>,
                ]} isTotal greenText />
              </tbody>
            </table>
          </KpiCard>

          {/* Card 2 — Net Margin */}
          <KpiCard
            accent={C.green} icon="📈" iconBg={C.greenBg}
            label="NET MARGIN"
            value={fmt(netMargin)}
            sub={`${marginPct}% on contract + CO additions`}
            pills={[{ type: 'pg', text: `${marginPct}%` }]}
            idx={1}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Item', 'Value', 'Notes']} />
              <tbody>
                <TRow cells={[<TdN>Base Contract with Trade Contractor</TdN>, <TdM>{fmt(contractValue)}</TdM>, <span>{organization?.name || '—'}</span>]} />
                <TRow cells={[<TdN>Approved CO Additions</TdN>, <TdM>+{fmt(coTotal)}</TdM>, <span>{approvedCOs.length} approved COs</span>]} />
                <TRow cells={[<TdN>Internal Cost Budget</TdN>, <TdM>{fmt(costs)}</TdM>, <span>Labor + materials cost</span>]} />
                <TRow cells={[
                  <TdN>Net Margin</TdN>,
                  <span style={{ ...fontMono, fontSize: '0.78rem', fontWeight: 700, color: C.green }}>{fmt(netMargin)}</span>,
                  <span style={{ color: C.green, fontWeight: 700 }}>{marginPct}% margin</span>,
                ]} isTotal greenText />
              </tbody>
            </table>
          </KpiCard>

          {/* Card 3 — CO Additions */}
          <KpiCard
            accent={C.blue} icon="📋" iconBg={C.blueBg}
            label="CO ADDITIONS"
            value={coTotal > 0 ? `+${fmt(coTotal)}` : '—'}
            sub={`${approvedCOs.length} approved change order${approvedCOs.length !== 1 ? 's' : ''}`}
            pills={[{ type: 'pb', text: `${approvedCOs.length} approved` }]}
            idx={2}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['CO #', 'Description', 'Value', 'Status']} />
              <tbody>
                {approvedCOs.length === 0 && (
                  <TRow cells={[<span style={{ color: C.faint }}>No approved COs yet</span>, '—', '—', '—']} />
                )}
                {approvedCOs.map((co, i) => (
                  <TRow key={co.id} cells={[
                    <TdN>{co.title || `CO-${String(i + 1).padStart(3, '0')}`}</TdN>,
                    <span>{co.title || 'Change order'}</span>,
                    <TdM>+{fmt(co.amount || 0)}</TdM>,
                    <Pill type="pg">Approved</Pill>,
                  ]} onClick={() => navigate(`/change-order/${co.id}`)} />
                ))}
                {approvedCOs.length > 0 && (
                  <TRow cells={['—', <TdN>Total CO value</TdN>, <TdM>+{fmt(coTotal)}</TdM>, '—']} isTotal />
                )}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 4 — Paid by TC */}
          <KpiCard
            accent={C.green} icon="✅" iconBg={C.greenBg}
            label="PAID BY TRADE CONTRACTOR"
            value={paidTotal > 0 ? fmt(paidTotal) : '—'}
            sub={`${collectedPct}% of contract collected`}
            pills={[{ type: 'pg', text: `${collectedPct}% received` }]}
            idx={3}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Invoice', 'Description', 'Amount', 'Status']} />
              <tbody>
                {paidInvoices.length === 0 && pendingInvoiceDocs.length === 0 && (
                  <TRow cells={[<span style={{ color: C.faint }}>No invoices yet</span>, '—', '—', '—']} />
                )}
                {paidInvoices.map(inv => (
                  <TRow key={inv.id} cells={[
                    <TdN>{inv.title}</TdN>,
                    <span>{inv.projectName}</span>,
                    <TdM>{fmt(inv.amount || 0)}</TdM>,
                    <Pill type="pg">Paid</Pill>,
                  ]} onClick={() => navigate(`/project/${inv.projectId}?tab=invoices`)} />
                ))}
                {pendingInvoiceDocs.map(inv => (
                  <TRow key={inv.id} cells={[
                    <TdN>{inv.title}</TdN>,
                    <span>{inv.projectName}</span>,
                    <TdM>{fmt(inv.amount || 0)}</TdM>,
                     <Pill type="pw">Pending Trade Contractor</Pill>,
                  ]} onClick={() => navigate(`/project/${inv.projectId}?tab=invoices`)} />
                ))}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 5 — Pending from TC */}
          <KpiCard
            accent={C.yellow} icon="⏳" iconBg={C.yellowBg}
            label="PENDING FROM TRADE CONTRACTOR"
            value={pendingTotal > 0 ? fmt(pendingTotal) : '—'}
            sub={pendingInvoiceDocs.length > 0 ? `Awaiting Trade Contractor approval · ${pendingInvoiceDocs.length} invoice${pendingInvoiceDocs.length > 1 ? 's' : ''}` : 'Nothing pending'}
            pills={pendingTotal > 0 ? [{ type: 'pw', text: 'Pending Trade Contractor' }] : [{ type: 'pm', text: 'None' }]}
            idx={4}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Invoice', 'Description', 'Amount', 'Status']} />
              <tbody>
                {pendingInvoiceDocs.length === 0 && (
                  <TRow cells={[<span style={{ color: C.faint }}>No pending invoices</span>, '—', '—', '—']} />
                )}
                {pendingInvoiceDocs.map(inv => (
                  <TRow key={inv.id} cells={[
                    <TdN>{inv.title}</TdN>,
                    <span>{inv.projectName}</span>,
                    <TdM>{fmt(inv.amount || 0)}</TdM>,
                    <Pill type="pw">Pending Trade Contractor</Pill>,
                  ]} onClick={() => navigate(`/project/${inv.projectId}?tab=invoices`)} />
                ))}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 6 — Work Progress */}
          <KpiCard
            accent={C.navy} icon="⚒" iconBg={C.surface2}
            label="WORK PROGRESS"
            value={`${progressPct}%`}
            sub={primaryProject ? `${primaryProject.name} · ${fmt(totalScope)} total scope` : 'No project'}
            pills={[{ type: 'pa', text: progressPct >= 80 ? 'Near Complete' : progressPct >= 40 ? 'On Track' : 'In Progress' }]}
            idx={5}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'Contract', 'Collected', 'Progress']} />
              <tbody>
                {projects.length === 0 && (
                  <TRow cells={[<span style={{ color: C.faint }}>No projects yet</span>, '—', '—', '—']} />
                )}
                {projects.map((p, i) => {
                  const ppf = projectFinancials.find(pff => pff.projectId === p.id);
                  const rev = ppf?.revenue || p.contractValue || 0;
                  const paid = ppf?.paidToYou || 0;
                  const prog = rev > 0 ? Math.min(Math.round((paid / rev) * 100), 100) : 0;
                  return (
                    <TRow key={p.id} cells={[
                      <TdN>{p.name}</TdN>,
                      <TdM>{fmt(rev)}</TdM>,
                      <TdM>{fmt(paid)}</TdM>,
                      <Bar pct={prog} color={C.amber} />,
                    ]} onClick={() => navigate(`/project/${p.id}`)} />
                  );
                })}
              </tbody>
            </table>
          </KpiCard>
        </div>

        {/* ═══ Attention Items ═══ */}
        {(attentionItems.length > 0 || pendingInvoiceDocs.length > 0) && (
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', ...fontLabel }} className="animate-fade-in">
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🚨</span>
              <span style={{ fontWeight: 700, color: C.ink, fontSize: '0.88rem' }}>Attention Items</span>
              <span style={{ fontSize: '0.64rem', color: C.faint, marginLeft: 4 }}>
                {attentionItems.length + pendingInvoiceDocs.length} item{(attentionItems.length + pendingInvoiceDocs.length) !== 1 ? 's' : ''}
              </span>
            </div>
            {pendingInvoiceDocs.map(inv => (
              <WarnItem key={inv.id}
                color={C.amber} icon="💰"
                title={`${inv.title} — Awaiting Trade Contractor Approval`}
                sub={`${inv.projectName} · ${organization?.name || 'Trade Contractor'}`}
                value={fmt(inv.amount || 0)} pill="Pending" pillType="pw"
                onClick={() => navigate(`/project/${inv.projectId}?tab=invoices`)}
              />
            ))}
            {attentionItems.map(item => (
              <WarnItem key={item.id}
                color={item.type === 'invoice' ? C.amber : C.blue}
                icon={item.type === 'invoice' ? '💰' : '📋'}
                title={item.title}
                sub={item.projectName}
                value="—" pill={item.type === 'invoice' ? 'Review' : 'Action'} pillType={item.type === 'invoice' ? 'pw' : 'pb'}
                onClick={() => navigate(`/project/${item.projectId}`)}
              />
            ))}
          </div>
        )}

        {/* ═══ My Projects ═══ */}
        {projects.length > 0 && (
          <div style={{ ...fontLabel }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: C.ink }}>📂 My Projects</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: projects.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {projects.map((p, i) => {
                const ppf = projectFinancials.find(pff => pff.projectId === p.id);
                const rev = ppf?.revenue || p.contractValue || 0;
                const paid = ppf?.paidToYou || 0;
                const prog = rev > 0 ? Math.min(Math.round((paid / rev) * 100), 100) : 0;
                return (
                  <ProjectCard
                    key={p.id}
                    name={p.name}
                    phase={p.project_type || p.build_type || '—'}
                    budget={rev}
                    progress={prog}
                    barColor={C.amber}
                    onClick={() => navigate(`/project/${p.id}`)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom spacer */}
        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}

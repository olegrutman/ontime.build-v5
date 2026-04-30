import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, TrendingUp, FileText, Package, HelpCircle, CheckCircle, Clock, Handshake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrgInviteBanner } from '@/components/dashboard/OrgInviteBanner';
import { PendingInvitesPanel } from '@/components/dashboard/PendingInvitesPanel';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import type { RecentDoc, ProjectFinancialDetail } from '@/hooks/useDashboardData';
import { C, fontVal, fontMono, fontLabel, fmt, KpiCard, Pill, Bar, THead, TdN, TdM, TRow, WarnItem, ProjectCard, BAR_COLORS, type PillType } from '@/components/shared/KpiCard';
import { KpiGrid } from '@/components/shared/KpiGrid';
import { MaterialsPulseStrip } from '@/components/dashboard/MaterialsPulseStrip';
import { useMaterialsPulse } from '@/hooks/useMaterialsPulse';

/* ─── Types ─── */
interface ProjectWithDetails {
  id: string;
  name: string;
  status: string;
  contractValue: number | null;
  pendingActions: number;
  build_type: string;
  project_type: string;
  updated_at: string;
}

interface FinancialSummary {
  totalContracts: number;
  totalRevenue: number;
  totalCosts: number;
  profitMargin: number;
  totalBilled: number;
  paidByYou: number;
  paidToYou: number;
  outstandingBilling: number;
  potentialProfit: number;
}

interface AttentionItem {
  id: string;
  type: 'invoice' | 'invite' | 'sent_invite';
  title: string;
  projectName: string;
  projectId: string;
}

interface PendingInvite {
  id: string;
  projectId: string;
  projectName: string;
  invitedByOrgName: string;
  role: string;
}

interface StatusCounts {
  setup: number;
  active: number;
  on_hold: number;
  completed: number;
  archived: number;
}

export interface GCDashboardViewProps {
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

export function GCDashboardView({
  projects, financials, projectFinancials, billing, attentionItems, pendingInvites, recentDocs,
  statusCounts, profile, organization, userSettings, updateUserSettings,
  isOrgAdmin, userOrgRolesLength, orgType, orgId, soleMember,
  onSetSoleMember, onSetPartOfTeam, onRefresh, loading,
}: GCDashboardViewProps) {
  const navigate = useNavigate();
  const showOnboarding = userSettings && !userSettings.onboarding_dismissed;
  const profileComplete = !!(profile?.first_name && profile?.phone);
  const orgComplete = !!(organization?.address?.street);
  const teamInvited = !isOrgAdmin || (userOrgRolesLength > 1) || soleMember;
  const projectCreated = projects.length > 0;

  // Derive per-project data
  const activeProjects = projects.filter(p => !['archived', 'completed'].includes(p.status));

  // Materials Pulse — portfolio-wide rollup
  const { data: materialsPulse, isLoading: pulseLoading } = useMaterialsPulse({
    buyerOrgId: orgId,
    projectIds: activeProjects.map(p => p.id),
  });

  // Change orders from recentDocs
  const coList = recentDocs.filter(d => d.type === 'change_order');
  const coCount = coList.length;
  const pendingCOs = coList.filter(d => ['draft', 'shared', 'submitted'].includes(d.status));

  // Invoices from recentDocs
  const invoiceDocs = recentDocs.filter(d => d.type === 'invoice');
  const pendingInvoiceDocs = invoiceDocs.filter(d => d.status === 'SUBMITTED');

  // POs from recentDocs
  const poDocs = recentDocs.filter(d => d.type === 'purchase_order');
  const poTotal = poDocs.reduce((s, d) => s + (d.amount || 0), 0);

  // Margin
  const margin = financials.totalRevenue - financials.totalCosts;
  const marginPct = financials.totalRevenue > 0 ? Math.round((margin / financials.totalRevenue) * 100) : 0;

  // Project color helper
  const getProjectColor = (idx: number) => BAR_COLORS[idx % BAR_COLORS.length];

  return (
    <div className="flex flex-col gap-4">
        <div className="-order-2 md:contents">
          <DashboardHero
            firstName={profile?.first_name || null}
            orgName={organization?.name || null}
            orgTypeLabel={orgType}
            statusCounts={statusCounts}
            attentionCount={attentionItems.length + pendingInvites.length}
          />
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

        {/* Materials Pulse — at-a-glance portfolio materials health */}
        <MaterialsPulseStrip pulse={materialsPulse} loading={pulseLoading} />

        {/* KPI Grid */}
        <KpiGrid>
          {/* Card 1: Total Owner Budget / Revenue */}
          <KpiCard idx={0} accent={C.amber} icon={<Briefcase size={18} color={C.amberD} />} iconBg={C.amberPale}
            label="TOTAL OWNER BUDGET" value={financials.totalRevenue > 0 ? fmt(financials.totalRevenue) : '—'}
            sub={`${projects.length} project${projects.length !== 1 ? 's' : ''} · full portfolio value`}
            pills={[{ type: 'pa', text: 'Portfolio' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'Status', 'Contract Value', '']} />
              <tbody>
                {projects.slice(0, 10).map((p, i) => (
                  <TRow key={p.id} onClick={() => navigate(`/project/${p.id}`)} cells={[
                    <TdN>{p.name}</TdN>,
                    <Pill type={p.status === 'active' ? 'pg' : p.status === 'setup' ? 'pm' : p.status === 'on_hold' ? 'pw' : 'pb'}>{p.status}</Pill>,
                    <TdM>{p.contractValue ? fmt(p.contractValue) : '—'}</TdM>,
                    <span style={{ color: C.blue, fontSize: '0.7rem', fontWeight: 600 }}>View →</span>,
                  ]} />
                ))}
                {financials.totalRevenue > 0 && <TRow isTotal cells={['', '', <TdM>{fmt(financials.totalRevenue)}</TdM>, '']} />}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 2: GC Profit Margin */}
          <KpiCard idx={1} accent={C.green} icon={<TrendingUp size={18} color={C.green} />} iconBg={C.greenBg}
            label="GENERAL CONTRACTOR PROFIT MARGIN" value={margin !== 0 ? fmt(margin) : '—'}
            sub={marginPct > 0 ? `${marginPct}% overall · Owner budget minus Trade Contractor contracts` : 'Revenue minus costs'}
            pills={marginPct > 0 ? [{ type: 'pg', text: `↑ ${marginPct}%` }] : [{ type: 'pm', text: 'No data' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Metric', 'Value']} />
              <tbody>
                <TRow cells={[<TdN>Owner Budget (Revenue)</TdN>, <TdM>{fmt(financials.totalRevenue)}</TdM>]} />
                <TRow cells={[<TdN>Trade Contractor Contracts (Costs)</TdN>, <TdM>{fmt(financials.totalCosts)}</TdM>]} />
                <TRow cells={[<TdN>Paid by You</TdN>, <TdM>{fmt(financials.paidByYou)}</TdM>]} />
                <TRow cells={[<TdN>Paid to You</TdN>, <TdM>{fmt(financials.paidToYou)}</TdM>]} />
                <TRow isTotal cells={[<TdN>Net Margin</TdN>, <TdM>{fmt(margin)}</TdM>]} />
              </tbody>
            </table>
          </KpiCard>

          {/* Card 3: Change Orders */}
          <KpiCard idx={2} accent={C.blue} icon={<FileText size={18} color={C.blue} />} iconBg={C.blueBg}
            label="CHANGE ORDERS" value={coCount > 0 ? `${coCount} COs` : '—'}
            sub={pendingCOs.length > 0 ? `${pendingCOs.length} pending review` : 'No pending change orders'}
            pills={pendingCOs.length > 0 ? [{ type: 'pb', text: `${pendingCOs.length} Pending` }] : [{ type: 'pm', text: 'None' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['CO', 'Project', 'Status', '']} />
              <tbody>
                {coList.length > 0 ? coList.slice(0, 8).map(co => (
                  <TRow key={co.id} onClick={() => navigate(`/project/${co.projectId}/change-orders`)} cells={[
                    <TdN>{co.title}</TdN>,
                    <>{co.projectName}</>,
                    <Pill type={['draft', 'shared', 'submitted'].includes(co.status) ? 'pw' : co.status === 'approved' ? 'pg' : 'pm'}>{co.status}</Pill>,
                    <span style={{ color: C.blue, fontSize: '0.7rem', fontWeight: 600 }}>View →</span>,
                  ]} />
                )) : (
                  <TRow cells={[<span style={{ color: C.faint }}>No change orders yet</span>, '', '', '']} />
                )}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 4: Materials / PO Spend */}
          <KpiCard idx={3} accent={C.purple} icon={<Package size={18} color={C.purple} />} iconBg={C.purpleBg}
            label="MATERIALS (GENERAL CONTRACTOR POs)" value={poTotal > 0 ? fmt(poTotal) : '—'}
            sub={`${poDocs.length} purchase order${poDocs.length !== 1 ? 's' : ''}`}
            pills={poDocs.length > 0 ? [{ type: 'pg', text: `${poDocs.length} POs` }] : [{ type: 'pm', text: 'None' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['PO', 'Project', 'Amount', 'Status']} />
              <tbody>
                {poDocs.length > 0 ? poDocs.slice(0, 8).map(po => (
                  <TRow key={po.id} onClick={() => navigate(`/project/${po.projectId}/purchase-orders`)} cells={[
                    <TdN>{po.title}</TdN>,
                    <>{po.projectName}</>,
                    <TdM>{po.amount ? fmt(po.amount) : '—'}</TdM>,
                    <Pill type={po.status === 'DELIVERED' ? 'pg' : po.status === 'CANCELLED' ? 'pr' : 'pb'}>{po.status}</Pill>,
                  ]} />
                )) : (
                  <TRow cells={[<span style={{ color: C.faint }}>No purchase orders yet</span>, '', '', '']} />
                )}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 5: Attention Items (replacing RFIs) */}
          <KpiCard idx={4} accent={C.red} icon={<HelpCircle size={18} color={C.red} />} iconBg={C.redBg}
            label="NEEDS ATTENTION" value={`${attentionItems.length} Items`}
            sub={`${attentionItems.filter(a => a.type === 'invoice').length} invoices · ${attentionItems.filter(a => a.type === 'sent_invite').length} invites`}
            pills={attentionItems.length > 0 ? [{ type: 'pr', text: `${attentionItems.length} need response` }] : [{ type: 'pg', text: 'All clear' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Item', 'Project', 'Type', '']} />
              <tbody>
                {attentionItems.length > 0 ? attentionItems.slice(0, 8).map(a => (
                  <TRow key={a.id} onClick={() => navigate(`/project/${a.projectId}`)} cells={[
                    <TdN>{a.title}</TdN>,
                    <>{a.projectName}</>,
                    <Pill type={a.type === 'invoice' ? 'pr' : 'pw'}>{a.type === 'invoice' ? 'Invoice' : 'Invite'}</Pill>,
                    <span style={{ color: C.blue, fontSize: '0.7rem', fontWeight: 600 }}>View →</span>,
                  ]} />
                )) : (
                  <TRow cells={[<span style={{ color: C.faint }}>No attention items</span>, '', '', '']} />
                )}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 6: Paid Invoices */}
          <KpiCard idx={5} accent={C.green} icon={<CheckCircle size={18} color={C.green} />} iconBg={C.greenBg}
            label="TOTAL PAID" value={financials.paidByYou > 0 ? fmt(financials.paidByYou) : '—'}
            sub={financials.totalRevenue > 0 ? `${Math.round((financials.paidByYou / financials.totalRevenue) * 100)}% of portfolio value` : 'No invoices paid yet'}
            pills={financials.paidByYou > 0 ? [{ type: 'pg', text: '↑ On track' }] : [{ type: 'pm', text: 'No data' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Invoice', 'Project', 'Amount', 'Status']} />
              <tbody>
                {invoiceDocs.length > 0 ? invoiceDocs.slice(0, 8).map(inv => (
                  <TRow key={inv.id} onClick={() => navigate(`/project/${inv.projectId}/invoices`)} cells={[
                    <TdN>{inv.title}</TdN>,
                    <>{inv.projectName}</>,
                    <TdM>{inv.amount ? fmt(inv.amount) : '—'}</TdM>,
                    <Pill type={inv.status === 'PAID' ? 'pg' : inv.status === 'SUBMITTED' ? 'pw' : inv.status === 'APPROVED' ? 'pb' : 'pm'}>{inv.status}</Pill>,
                  ]} />
                )) : (
                  <TRow cells={[<span style={{ color: C.faint }}>No invoices yet</span>, '', '', '']} />
                )}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 7: Pending Approval */}
          <KpiCard idx={6} accent={C.red} icon={<Clock size={18} color={C.red} />} iconBg={C.redBg}
            label="PENDING GENERAL CONTRACTOR APPROVAL" value={billing.outstandingToPay > 0 ? fmt(billing.outstandingToPay) : '—'}
            sub={`${billing.invoicesReceived} invoice${billing.invoicesReceived !== 1 ? 's' : ''} awaiting your review`}
            pills={billing.invoicesReceived > 0 ? [{ type: 'pr', text: 'Action needed' }] : [{ type: 'pg', text: 'All clear' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Invoice', 'Project', 'Amount', '']} />
              <tbody>
                {pendingInvoiceDocs.length > 0 ? pendingInvoiceDocs.slice(0, 8).map(inv => (
                  <TRow key={inv.id} onClick={() => navigate(`/project/${inv.projectId}/invoices`)} cells={[
                    <TdN>{inv.title}</TdN>,
                    <>{inv.projectName}</>,
                    <TdM>{inv.amount ? fmt(inv.amount) : '—'}</TdM>,
                    <span style={{ color: C.blue, fontSize: '0.7rem', fontWeight: 600 }}>Approve →</span>,
                  ]} />
                )) : (
                  <TRow cells={[<span style={{ color: C.faint }}>No pending approvals</span>, '', '', '']} />
                )}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 8: TC Contracts */}
          <KpiCard idx={7} accent={C.navy} icon={<Handshake size={18} color={C.navy} />} iconBg={C.surface2}
            label="TRADE CONTRACTOR CONTRACTS COMMITTED" value={financials.totalCosts > 0 ? fmt(financials.totalCosts) : '—'}
            sub={financials.totalRevenue > 0 ? `${Math.round((financials.totalCosts / financials.totalRevenue) * 100)}% of owner budget` : 'No contracts yet'}
            pills={[{ type: 'pm', text: `${projects.length} projects` }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'Contract Value', 'Status']} />
              <tbody>
                {projects.filter(p => p.contractValue && p.contractValue > 0).length > 0 ? 
                  projects.filter(p => p.contractValue && p.contractValue > 0).slice(0, 10).map(p => (
                    <TRow key={p.id} onClick={() => navigate(`/project/${p.id}/contracts`)} cells={[
                      <TdN>{p.name}</TdN>,
                      <TdM>{fmt(p.contractValue!)}</TdM>,
                      <Pill type={p.status === 'active' ? 'pg' : 'pm'}>{p.status}</Pill>,
                    ]} />
                  )) : (
                    <TRow cells={[<span style={{ color: C.faint }}>No Trade Contractor contracts yet</span>, '', '']} />
                  )}
                {financials.totalCosts > 0 && <TRow isTotal cells={['Total', <TdM>{fmt(financials.totalCosts)}</TdM>, '']} />}
              </tbody>
            </table>
          </KpiCard>
        </KpiGrid>

        {/* Portfolio Metrics Table */}
        {projects.length > 0 && (
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.ink, fontSize: '0.9rem', ...fontLabel }}>
              📊 Portfolio Metrics
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <THead cols={['Project', 'Contract Value', 'Status', 'Actions', '']} />
                <tbody>
                  {projects.slice(0, 15).map((p, i) => (
                    <TRow key={p.id} onClick={() => navigate(`/project/${p.id}`)} cells={[
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: getProjectColor(i) }} />
                        <TdN>{p.name}</TdN>
                      </div>,
                      <TdM>{p.contractValue ? fmt(p.contractValue) : '—'}</TdM>,
                      <Pill type={p.status === 'active' ? 'pg' : p.status === 'setup' ? 'pm' : p.status === 'on_hold' ? 'pw' : p.status === 'completed' ? 'pb' : 'pm'}>{p.status}</Pill>,
                      <>{p.pendingActions > 0 ? <Pill type="pr">{p.pendingActions} pending</Pill> : <span style={{ color: C.faint }}>—</span>}</>,
                      <span style={{ color: C.blue, fontSize: '0.7rem', fontWeight: 600 }}>View →</span>,
                    ]} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Needs Attention */}
        {attentionItems.length > 0 && (
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.ink, fontSize: '0.9rem', ...fontLabel }}>
              🚨 Needs Immediate Attention
            </div>
            {attentionItems.map(item => (
              <WarnItem
                key={item.id}
                color={item.type === 'invoice' ? C.red : C.yellow}
                icon={item.type === 'invoice' ? '💰' : '📋'}
                title={item.title}
                sub={item.projectName}
                value={item.type === 'invoice' ? 'Review' : 'Pending'}
                pill={item.type === 'invoice' ? 'Approve' : 'Action'}
                pillType={item.type === 'invoice' ? 'pr' : 'pw'}
                onClick={() => navigate(`/project/${item.projectId}`)}
              />
            ))}
          </div>
        )}

        {/* All Projects Grid */}
        {activeProjects.length > 0 && (
          <div className="-order-1 md:order-last" style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontWeight: 700, color: C.ink, fontSize: '0.9rem', ...fontLabel }}>📋 All Projects</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 p-4">
              {activeProjects.slice(0, 10).map((p, i) => {
                const ppf = projectFinancials.find(pf => pf.projectId === p.id);
                const costs = ppf?.costs || 0;
                return (
                  <ProjectCard
                    key={p.id}
                    name={p.name}
                    status={p.status}
                    budget={p.contractValue || 0}
                    costs={costs}
                    onClick={() => navigate(`/project/${p.id}`)}
                  />
                );
              })}
            </div>
          </div>
        )}
    </div>
  );
}

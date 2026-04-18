import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { OrgInviteBanner } from '@/components/dashboard/OrgInviteBanner';
import { PendingInvitesPanel } from '@/components/dashboard/PendingInvitesPanel';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import type { RecentDoc, ProjectFinancialDetail } from '@/hooks/useDashboardData';
import { C, fontVal, fontMono, fontLabel, fmt, KpiCard, Pill, Bar, THead, TdN, TdM, TRow, WarnItem, ProjectCard, type PillType } from '@/components/shared/KpiCard';
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
    <div className="space-y-4">
        <DashboardHero
          firstName={profile?.first_name || null}
          orgName={organization?.name || null}
          orgTypeLabel={orgType}
          statusCounts={statusCounts}
          attentionCount={attentionItems.length + pendingInvites.length}
        />

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
        <KpiGrid>

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
        </KpiGrid>

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
                const cost = ppf?.costs || 0;
                return (
                  <ProjectCard
                    key={p.id}
                    name={p.name}
                    status={p.status}
                    budget={rev}
                    costs={cost}
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
  );
}

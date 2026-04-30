import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Handshake, Users, TrendingUp, FileText, CheckCircle, Clock, Package, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrgInviteBanner } from '@/components/dashboard/OrgInviteBanner';
import { PendingInvitesPanel } from '@/components/dashboard/PendingInvitesPanel';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import type { RecentDoc, ProjectFinancialDetail } from '@/hooks/useDashboardData';
import { C, fontVal, fontMono, fontLabel, fmt, fmtSigned, KpiCard, Pill, Bar, THead, TdN, TdM, TRow, WarnItem, ProjectCard, BAR_COLORS, type PillType } from '@/components/shared/KpiCard';
import { KpiGrid } from '@/components/shared/KpiGrid';
import { MaterialsPulseStrip } from '@/components/dashboard/MaterialsPulseStrip';
import { useMaterialsPulse } from '@/hooks/useMaterialsPulse';

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

  const activeProjects = projects.filter(p => p.status !== 'archived');

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
          <OnboardingChecklist profileComplete={profileComplete} orgComplete={orgComplete} teamInvited={teamInvited} projectCreated={projectCreated} orgType={orgType}
            onDismiss={async () => updateUserSettings({ onboarding_dismissed: true })} onMarkSoleMember={onSetSoleMember} onMarkPartOfTeam={onSetPartOfTeam} />
        )}

        <OrgInviteBanner />

        {pendingInvites.length > 0 && <PendingInvitesPanel invites={pendingInvites} onRefresh={onRefresh} />}

        {/* KPI Grid — 3 cols for TC */}
        <KpiGrid>

          {/* Card 1: GC Contracts (Revenue) */}
          <KpiCard idx={0} accent={C.amber} icon={<Handshake size={18} color={C.amberD} />} iconBg={C.amberPale}
            label="GENERAL CONTRACTOR CONTRACTS (REVENUE)" value={gcRevenue > 0 ? fmt(gcRevenue) : '—'}
            sub={`${projects.length} active project${projects.length !== 1 ? 's' : ''} with General Contractor`}
            pills={[{ type: 'pa', text: 'Revenue' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'Contract Value']} />
              <tbody>
                {pf.length > 0 ? pf.map((p) => (
                  <TRow key={p.projectId} onClick={() => navigate(`/project/${p.projectId}`)} cells={[
                    <TdN>{p.projectName}</TdN>,
                    <TdM>{fmt(p.revenue)}</TdM>,
                  ]} />
                )) : <TRow cells={[<span style={{ color: C.faint }}>No contracts yet</span>, '']} />}
                {gcRevenue > 0 && <TRow isTotal cells={['', <TdM>{fmt(gcRevenue)}</TdM>]} />}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 2: FC / Labor Contracts (Cost) */}
          <KpiCard idx={1} accent={C.navy} icon={<Users size={18} color={C.navy} />} iconBg={C.surface2}
            label="FIELD CREW / LABOR CONTRACTS (COST)" value={fcCost > 0 ? fmt(fcCost) : '—'}
            sub="Field crew and sub-contractor costs"
            pills={[{ type: 'pm', text: 'Cost' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'Contract Cost']} />
              <tbody>
                {pf.length > 0 ? pf.map((p) => (
                  <TRow key={p.projectId} onClick={() => navigate(`/project/${p.projectId}`)} cells={[
                    <TdN>{p.projectName}</TdN>,
                    <TdM>{fmt(p.costs)}</TdM>,
                  ]} />
                )) : <TRow cells={[<span style={{ color: C.faint }}>No Field Crew contracts yet</span>, '']} />}
                {fcCost > 0 && <TRow isTotal cells={['', <TdM>{fmt(fcCost)}</TdM>]} />}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 3: Gross Margin */}
          <KpiCard idx={2} accent={C.green} icon={<TrendingUp size={18} color={C.green} />} iconBg={C.greenBg}
            label="GROSS MARGIN" value={gcRevenue > 0 ? fmt(grossMargin) : '—'}
            sub={gcRevenue > 0 ? `${marginPct}% margin across all projects` : 'No contract data yet'}
            pills={gcRevenue > 0 ? [{ type: 'pg', text: `↑ ${marginPct}%` }] : [{ type: 'pm', text: 'No data' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'Gross Margin', 'Margin %']} />
              <tbody>
                {pf.length > 0 ? pf.map((p) => {
                  const m = p.revenue - p.costs;
                  const mPct = p.revenue > 0 ? Math.round((m / p.revenue) * 100) : 0;
                  return (
                    <TRow key={p.projectId} cells={[
                      <TdN>{p.projectName}</TdN>,
                      <TdM>{fmt(m)}</TdM>,
                      <span style={{ fontWeight: 700, color: mPct > 0 ? C.green : C.red }}>{mPct}%</span>,
                    ]} />
                  );
                }) : <TRow cells={[<span style={{ color: C.faint }}>No data yet</span>, '', '']} />}
                {gcRevenue > 0 && <TRow isTotal cells={['', <TdM>{fmt(grossMargin)}</TdM>, <span style={{ fontWeight: 700 }}>{marginPct}%</span>]} />}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 4: Change Orders */}
          <KpiCard idx={3} accent={C.blue} icon={<FileText size={18} color={C.blue} />} iconBg={C.blueBg}
            label="CHANGE ORDERS" value={coCount > 0 ? `${coCount} COs` : '—'}
            sub={coCount > 0 ? `${coList.filter(c => ['submitted', 'shared'].includes(c.status)).length} pending review` : 'No change orders yet'}
            pills={coCount > 0 ? [{ type: 'pb', text: `${coCount} total` }] : [{ type: 'pm', text: 'None' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['CO', 'Status', '']} />
              <tbody>
                {coList.length > 0 ? coList.slice(0, 10).map(co => (
                  <TRow key={co.id} onClick={() => navigate(`/project/${co.projectId}/change-orders`)} cells={[
                    <TdN><div>{co.title}</div><div style={{ fontSize:'0.68rem', color:C.muted, marginTop:2 }}>{co.projectName}</div></TdN>,
                    <Pill type={['submitted', 'shared'].includes(co.status) ? 'pw' : co.status === 'approved' ? 'pg' : co.status === 'contracted' ? 'pg' : 'pm'}>{co.status}</Pill>,
                    <span style={{ color: C.blue, fontSize: '0.7rem', fontWeight: 600 }}>View →</span>,
                  ]} />
                )) : <TRow cells={[<span style={{ color: C.faint }}>No change orders yet</span>, '', '']} />}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 5: Received from GC */}
          <KpiCard idx={4} accent={C.green} icon={<CheckCircle size={18} color={C.green} />} iconBg={C.greenBg}
            label="RECEIVED FROM GENERAL CONTRACTOR" value={receivedFromGC > 0 ? fmt(receivedFromGC) : '—'}
            sub={gcRevenue > 0 ? `${Math.round((receivedFromGC / gcRevenue) * 100)}% of total contracted value` : 'No payments received yet'}
            pills={receivedFromGC > 0 ? [{ type: 'pg', text: `${gcRevenue > 0 ? Math.round((receivedFromGC / gcRevenue) * 100) : 0}% collected` }] : [{ type: 'pm', text: 'No data' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Project', 'Paid', '% Collected', 'Pending']} />
              <tbody>
                {pf.length > 0 ? pf.map((p) => {
                  const pct = p.revenue > 0 ? Math.round((p.paidToYou / p.revenue) * 100) : 0;
                  return (
                    <TRow key={p.projectId} onClick={() => navigate(`/project/${p.projectId}?tab=invoices`)} cells={[
                      <TdN>{p.projectName}</TdN>,
                      <TdM>{fmt(p.paidToYou)}</TdM>,
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Bar pct={pct} color={pct >= 80 ? C.green : pct >= 40 ? C.amber : C.red} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: C.muted }}>{pct}%</span>
                      </div>,
                      <TdM>{fmt(p.pendingToCollect)}</TdM>,
                    ]} />
                  );
                }) : <TRow cells={[<span style={{ color: C.faint }}>No data yet</span>, '', '', '']} />}
                {receivedFromGC > 0 && <TRow isTotal cells={['', <TdM>{fmt(receivedFromGC)}</TdM>, <span style={{ fontWeight: 700 }}>{gcRevenue > 0 ? Math.round((receivedFromGC / gcRevenue) * 100) : 0}%</span>, <TdM>{fmt(pendingFromGC)}</TdM>]} />}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 6: Pending from GC */}
          <KpiCard idx={5} accent={C.yellow} icon={<Clock size={18} color={C.yellow} />} iconBg={C.yellowBg}
            label="PENDING FROM GENERAL CONTRACTOR" value={pendingFromGC > 0 ? fmt(pendingFromGC) : '—'}
            sub={pendingInvoiceDocs.length > 0 ? `${pendingInvoiceDocs.length} invoice${pendingInvoiceDocs.length !== 1 ? 's' : ''} awaiting General Contractor approval` : 'No pending invoices'}
            pills={pendingFromGC > 0 ? [{ type: 'pw', text: 'Chasing General Contractor' }] : [{ type: 'pg', text: 'All clear' }]}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Invoice', 'Amount', 'Status']} />
              <tbody>
                {pendingInvoiceDocs.length > 0 ? pendingInvoiceDocs.slice(0, 8).map(inv => (
                  <TRow key={inv.id} onClick={() => navigate(`/project/${inv.projectId}?tab=invoices`)} cells={[
                    <TdN><div>{inv.title}</div><div style={{ fontSize:'0.68rem', color:C.muted, marginTop:2 }}>{inv.projectName}</div></TdN>,
                    <TdM>{inv.amount ? fmt(inv.amount) : '—'}</TdM>,
                    <Pill type={inv.status === 'SUBMITTED' ? 'pw' : 'pb'}>{inv.status}</Pill>,
                  ]} />
                )) : <TRow cells={[<span style={{ color: C.faint }}>No pending invoices</span>, '', '']} />}
                {pendingFromGC > 0 && <TRow isTotal cells={['', <TdM>{fmt(pendingFromGC)}</TdM>, '']} />}
              </tbody>
            </table>
          </KpiCard>

          {/* Card 7: TC Material Budget (POs) */}
          <KpiCard idx={6} accent={C.purple} icon={<Package size={18} color={C.purple} />} iconBg={C.purpleBg}
            label="MATERIALS (TRADE CONTRACTOR POs)" value={poTotal > 0 ? fmt(poTotal) : '—'}
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
              <THead cols={['Item', 'Type', '']} />
              <tbody>
                {attentionItems.length > 0 ? attentionItems.slice(0, 8).map(a => (
                  <TRow key={a.id} onClick={() => navigate(`/project/${a.projectId}`)} cells={[
                    <TdN><div>{a.title}</div><div style={{ fontSize:'0.68rem', color:C.muted, marginTop:2 }}>{a.projectName}</div></TdN>,
                    <Pill type={a.type === 'invoice' ? 'pr' : 'pw'}>{a.type === 'invoice' ? 'Invoice' : 'Invite'}</Pill>,
                    <span style={{ color: C.blue, fontSize: '0.7rem', fontWeight: 600 }}>View →</span>,
                  ]} />
                )) : <TRow cells={[<span style={{ color: C.faint }}>No attention items</span>, '', '']} />}
              </tbody>
            </table>
          </KpiCard>
        </KpiGrid>

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
          <div className="-order-1 md:order-last" style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontWeight: 700, color: C.ink, fontSize: '0.9rem', ...fontLabel }}>📋 My Projects ({activeProjects.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
              {activeProjects.slice(0, 6).map((p, i) => {
                const ppf = projectFinancials.find(pf => pf.projectId === p.id);
                const costs = ppf?.costs || 0;
                return (
                  <ProjectCard key={p.id} name={p.name} status={p.status}
                    budget={p.contractValue || 0} costs={costs}
                    onClick={() => navigate(`/project/${p.id}`)} />
                );
              })}
            </div>
          </div>
        )}
    </div>
  );
}

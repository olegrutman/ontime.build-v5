import { useState, useMemo } from 'react';
import { cn, formatCurrency as fmt } from '@/lib/utils';
import { useCountUp } from '@/hooks/useCountUp';
import { DT } from '@/lib/design-tokens';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';
import { ProjectBudgetRingChart } from './ProjectBudgetRingChart';
import { ProjectActivityFeedSidebar } from './ProjectActivityFeedSidebar';
import { OverviewContractsSection } from './OverviewContractsSection';
import { OverviewTeamCard } from './OverviewTeamCard';
import { OverviewProfitCard } from './OverviewProfitCard';
import { BottomSheet } from '@/components/app-shell/BottomSheet';
import { STATUS_ACCENTS } from '@/lib/design-tokens';
import {
  DollarSign, CreditCard, Clock, TrendingUp,
  FileText, Package, Wrench, HardHat,
} from 'lucide-react';

interface ProjectOverviewV2Props {
  projectId: string;
  projectName: string;
  projectStatus: string;
  projectType: string;
  address?: string | null;
  financials: ProjectFinancials;
  onNavigate: (tab: string) => void;
  onResponsibilityChange?: (value: string | null) => void;
  onTeamChanged?: () => void;
}

/* ─── Pill tabs ─── */
const PILLS = ['budget', 'orders', 'field'] as const;
type Pill = typeof PILLS[number];
const PILL_ICONS: Record<Pill, React.ElementType> = { budget: TrendingUp, orders: Package, field: HardHat };

/* ─── Order filter pills ─── */
const ORDER_FILTERS = ['all', 'INV', 'PO', 'CO'] as const;

/* ─── KPI Tile (uses hook at top level) ─── */
function OverviewKpiTile({ icon: Icon, label, value, accentBg, accentText, barColor, pct, delay }: {
  icon: React.ElementType; label: string; value: number; accentBg: string; accentText: string; barColor: string; pct: string; delay: number;
}) {
  const animatedVal = useCountUp(value, 900, delay);
  return (
    <div
      className="rounded-lg bg-background/60 border border-border/60 px-3 py-2.5 relative overflow-hidden transition-all duration-300 hover:-translate-y-px hover:shadow-md animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${barColor}`} />
      <div className="flex items-center gap-1.5 mb-1">
        <div className={cn('w-5 h-5 rounded flex items-center justify-center', accentBg, accentText)}>
          <Icon className="w-3 h-3" />
        </div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className={cn('ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full', accentBg, accentText)}>{pct}</span>
      </div>
      <p className="font-heading text-[1.5rem] font-black tracking-tight text-foreground leading-none">{fmt(animatedVal)}</p>
    </div>
  );
}

export function ProjectOverviewV2({
  projectId,
  projectName,
  projectStatus,
  projectType,
  address,
  financials,
  onNavigate,
  onResponsibilityChange,
  onTeamChanged,
}: ProjectOverviewV2Props) {
  const [activePill, setActivePill] = useState<Pill>('budget');
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [sheet, setSheet] = useState<{ open: boolean; title: string; amount?: string; meta: { label: string; value: string }[] }>({
    open: false, title: '', meta: [],
  });

  const { viewerRole, isTCMaterialResponsible, isGCMaterialResponsible } = financials;

  // Material visibility: TC only sees materials if they're responsible; GC always sees; FC never sees materials
  const showMaterials = viewerRole === 'General Contractor'
    ? true
    : viewerRole === 'Trade Contractor'
      ? isTCMaterialResponsible
      : false; // FC and Supplier don't see material data

  const contractValue = financials.upstreamContract?.contract_sum ?? 0;
  const paid = financials.totalPaid;
  const pending = financials.billedToDate - paid;
  const remaining = Math.max(0, contractValue - financials.billedToDate);
  const progressPct = contractValue > 0 ? Math.min(100, (financials.billedToDate / contractValue) * 100) : 0;

  /* Budget breakdown rows — material-aware */
  const budgetRows = useMemo(() => {
    const rows = [
      { label: 'Billed to Date', value: financials.billedToDate, color: 'hsl(var(--chart-2))', pct: contractValue > 0 ? (financials.billedToDate / contractValue) * 100 : 0 },
      { label: 'Paid to Date', value: paid, color: 'hsl(var(--chart-1))', pct: contractValue > 0 ? (paid / contractValue) * 100 : 0 },
    ];
    if (showMaterials) {
      rows.push({ label: 'Material Ordered', value: financials.materialOrdered, color: 'hsl(var(--chart-4))', pct: contractValue > 0 ? (financials.materialOrdered / contractValue) * 100 : 0 });
    }
    rows.push({ label: 'Retainage Held', value: financials.retainageAmount, color: 'hsl(var(--chart-3))', pct: contractValue > 0 ? (financials.retainageAmount / contractValue) * 100 : 0 });
    if (financials.actualLaborCost > 0) {
      rows.push({ label: 'Labor Cost', value: financials.actualLaborCost, color: 'hsl(var(--chart-5))', pct: contractValue > 0 ? (financials.actualLaborCost / contractValue) * 100 : 0 });
    }
    return rows;
  }, [financials, contractValue, paid, showMaterials]);

  /* Filtered order items */
  const orderItems = useMemo(() => {
    let items = financials.recentInvoices.map(inv => ({
      id: inv.id,
      type: 'INV' as const,
      label: `Invoice ${inv.invoice_number}`,
      status: inv.status,
      amount: inv.total_amount,
      date: inv.created_at,
    }));
    if (orderFilter !== 'all') items = items.filter(i => i.type === orderFilter);
    return items;
  }, [financials.recentInvoices, orderFilter]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3">
      {/* ─── LEFT COLUMN ─── */}
      <div className="space-y-3">
        {/* Hero Card */}
        <div
          className="rounded-xl border border-border overflow-hidden"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.04) 0%, hsl(var(--card)) 60%)' }}
        >
          <div className="px-5 pt-5 pb-4 space-y-4">
            {/* Top row */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{projectType}</span>
                <h1 className="font-heading text-[28px] font-black leading-tight tracking-tight text-foreground">{projectName}</h1>
                {address && <p className="text-xs text-muted-foreground mt-0.5">{address}</p>}
              </div>
              <span className={cn(
                'text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide',
                projectStatus === 'active' ? 'bg-emerald-100 text-emerald-700' :
                projectStatus === 'setup' || projectStatus === 'draft' ? 'bg-amber-100 text-amber-700' :
                'bg-muted text-muted-foreground'
              )}>
                {projectStatus}
              </span>
            </div>

            {/* KPI Tiles */}
            <div className="grid grid-cols-3 gap-2">
              <OverviewKpiTile icon={DollarSign} label="Contract" value={contractValue} accentBg="bg-blue-50" accentText="text-blue-600" barColor="bg-primary" pct="100%" delay={0} />
              <OverviewKpiTile icon={CreditCard} label="Paid" value={paid} accentBg="bg-emerald-50" accentText="text-emerald-600" barColor="bg-emerald-500" pct={contractValue > 0 ? `${Math.round((paid / contractValue) * 100)}%` : '0%'} delay={40} />
              <OverviewKpiTile icon={Clock} label="Pending" value={Math.max(0, pending)} accentBg="bg-amber-50" accentText="text-amber-600" barColor="bg-amber-500" pct={contractValue > 0 ? `${Math.round((Math.max(0, pending) / contractValue) * 100)}%` : '0%'} delay={80} />
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">Progress</span>
                <span className="text-[10px] font-medium" style={DT.mono}>{progressPct.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contracts Section */}
        <OverviewContractsSection financials={financials} onNavigate={onNavigate} />

        {/* Pill tabs */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 w-fit">
          {PILLS.map(pill => {
            const Icon = PILL_ICONS[pill];
            return (
              <button
                key={pill}
                onClick={() => setActivePill(pill)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors',
                  activePill === pill
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {pill}
              </button>
            );
          })}
        </div>

        {/* ─── Budget Tab ─── */}
        {activePill === 'budget' && (
          <div className="space-y-2">
            {budgetRows.map((row, i) => (
              <button
                key={row.label}
                className="w-full text-left bg-card border border-border rounded-lg px-4 py-3 hover:bg-accent/30 transition-colors animate-fade-in"
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => setSheet({
                  open: true,
                  title: row.label,
                  amount: fmt(row.value),
                  meta: [
                    { label: 'Percent of Contract', value: `${row.pct.toFixed(1)}%` },
                    { label: 'Contract Total', value: fmt(contractValue) },
                  ],
                })}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-foreground font-medium">{row.label}</span>
                  <span className="font-heading text-sm font-black tracking-tight">{fmt(row.value)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(100, row.pct)}%`, backgroundColor: row.color }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ─── Orders Tab ─── */}
        {activePill === 'orders' && (
          <div className="space-y-2">
            {/* Filter pills */}
            <div className="flex gap-1">
              {ORDER_FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setOrderFilter(f)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[10px] font-medium capitalize transition-colors',
                    orderFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>

            {orderItems.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No orders to display</p>
            ) : (
              orderItems.map((item, i) => (
                <button
                  key={item.id}
                  className="w-full text-left bg-card border border-border rounded-lg overflow-hidden hover:bg-accent/30 transition-colors animate-fade-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                  onClick={() => {
                    setSheet({
                      open: true,
                      title: item.label,
                      amount: fmt(item.amount),
                      meta: [
                        { label: 'Status', value: item.status },
                        { label: 'Date', value: new Date(item.date).toLocaleDateString() },
                      ],
                    });
                  }}
                >
                  <div className="flex">
                    <div className="w-[3px] shrink-0" style={{ backgroundColor: STATUS_ACCENTS[item.status as keyof typeof STATUS_ACCENTS] || '#6B7280' }} />
                    <div className="flex items-center justify-between flex-1 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-foreground">{item.label}</span>
                        <span className={cn(
                          'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                          item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                          item.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-700' :
                          item.status === 'PAID' ? 'bg-blue-100 text-blue-700' :
                          item.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                          'bg-muted text-muted-foreground'
                        )}>
                          {item.status}
                        </span>
                      </div>
                      <span className="text-xs font-semibold" style={DT.mono}>{fmt(item.amount)}</span>
                    </div>
                  </div>
                </button>
              ))
            )}

            {/* Quick links — material-aware */}
            <div className="flex gap-2 pt-1">
              <button onClick={() => onNavigate('invoices')} className="text-[10px] text-primary font-medium hover:underline">View All Invoices →</button>
              {showMaterials && (
                <button onClick={() => onNavigate('purchase-orders')} className="text-[10px] text-primary font-medium hover:underline">View All POs →</button>
              )}
            </div>
          </div>
        )}

        {/* ─── Field Tab ─── */}
        {activePill === 'field' && (
          <div className="space-y-2">
            <div className="bg-card border border-border rounded-lg px-4 py-6 text-center">
              <HardHat className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-2">View daily logs and field activity</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => onNavigate('daily-log')}
                  className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                >
                  Daily Logs
                </button>
                <button
                  onClick={() => onNavigate('schedule')}
                  className="text-xs px-3 py-1.5 rounded-md bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
                >
                  Schedule
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── RIGHT COLUMN ─── */}
      <div className="space-y-4">
        {/* Team card */}
        <div className={cn(DT.cardWrapper, DT.cardPadding)}>
          <OverviewTeamCard
            projectId={projectId}
            isTCMaterialResponsible={isTCMaterialResponsible}
            isGCMaterialResponsible={isGCMaterialResponsible}
          />
        </div>

        {/* Donut chart */}
        <div className={cn(DT.cardWrapper, DT.cardPadding)}>
          <p className={cn(DT.sectionHeader, 'mb-3')}>Budget Breakdown</p>
          <ProjectBudgetRingChart paid={paid} pending={Math.max(0, pending)} remaining={remaining} />
        </div>

        {/* Profit Position */}
        <div className={cn(DT.cardWrapper, DT.cardPadding)}>
          <OverviewProfitCard projectId={projectId} financials={financials} />
        </div>

        {/* Activity feed */}
        <div className={cn(DT.cardWrapper, DT.cardPadding)}>
          <ProjectActivityFeedSidebar projectId={projectId} />
        </div>
      </div>

      {/* Bottom Sheet */}
      <BottomSheet
        open={sheet.open}
        onClose={() => setSheet(s => ({ ...s, open: false }))}
        title={sheet.title}
        amount={sheet.amount}
        meta={sheet.meta}
      />
    </div>
  );
}

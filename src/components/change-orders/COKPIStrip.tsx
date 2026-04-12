import type { COFinancials, ChangeOrder } from '@/types/changeOrder';

interface COKPIStripProps {
  co: ChangeOrder;
  isGC: boolean;
  isTC: boolean;
  isFC: boolean;
  financials: COFinancials;
  hasMaterials?: boolean;
  hasEquipment?: boolean;
}

function fmtCurrency(value: number) {
  if (value === 0) return '$0';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface KPITile {
  label: string;
  value: string;
  color: string;
  sub?: string;
  badge?: { text: string; variant: 'healthy' | 'watch' | 'neutral' };
}

const BADGE_CLASSES = {
  healthy: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  watch: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  neutral: 'bg-accent text-muted-foreground',
};

function getTiles(props: COKPIStripProps): KPITile[] {
  const { isGC, isTC, isFC, financials } = props;
  const totalToGC = financials.tcBillableToGC + financials.materialsTotal + financials.equipmentTotal;
  const matEquip = financials.materialsTotal + financials.equipmentTotal;

  if (isGC) {
    return [
      {
        label: 'TC Labor',
        value: fmtCurrency(financials.tcBillableToGC),
        color: 'hsl(var(--primary))',
        badge: financials.tcBillableToGC > 0 ? { text: 'Priced', variant: 'healthy' } : { text: 'Awaiting input', variant: 'watch' },
      },
      {
        label: 'TC Submitted',
        value: fmtCurrency(financials.grandTotal),
        color: '#F5A623',
        badge: financials.grandTotal > 0 ? { text: 'Priced', variant: 'healthy' } : { text: 'Awaiting input', variant: 'watch' },
      },
      {
        label: 'Materials + Equipment',
        value: fmtCurrency(matEquip),
        color: '#059669',
        sub: matEquip > 0 ? '2 categories' : undefined,
      },
      {
        label: 'Total Cost',
        value: fmtCurrency(totalToGC),
        color: '#F5A623',
      },
    ];
  }

  if (isTC) {
    return [
      {
        label: 'FC Cost',
        value: fmtCurrency(financials.fcLaborTotal),
        color: '#F5A623',
        sub: financials.fcTotalHours > 0 ? `${financials.fcTotalHours} hrs logged` : undefined,
        badge: financials.fcLaborTotal > 0 ? { text: 'Priced', variant: 'healthy' } : { text: 'Awaiting input', variant: 'watch' },
      },
      {
        label: 'My Billable',
        value: fmtCurrency(financials.tcBillableToGC),
        color: 'hsl(var(--primary))',
        badge: financials.tcBillableToGC > 0 ? { text: 'Priced', variant: 'healthy' } : { text: 'Awaiting input', variant: 'watch' },
      },
      {
        label: 'Materials + Equipment',
        value: fmtCurrency(matEquip),
        color: '#059669',
      },
      {
        label: 'Total to GC',
        value: fmtCurrency(financials.grandTotal),
        color: '#F5A623',
      },
    ];
  }

  // FC
  const fcMargin = financials.fcLaborTotal - financials.actualCostTotal;
  return [
    {
      label: 'Hours Logged',
      value: financials.fcTotalHours > 0 ? `${financials.fcTotalHours} hrs` : '—',
      color: '#F5A623',
      sub: financials.fcTotalHours > 0 ? `${Math.ceil(financials.fcTotalHours / 8)} days` : undefined,
    },
    {
      label: 'Billed to TC',
      value: fmtCurrency(financials.fcLaborTotal),
      color: 'hsl(var(--primary))',
      badge: financials.fcLaborTotal > 0 ? { text: 'Priced', variant: 'healthy' } : { text: 'Awaiting input', variant: 'watch' },
    },
    {
      label: 'Internal Cost',
      value: financials.actualCostTotal > 0 ? fmtCurrency(financials.actualCostTotal) : '—',
      color: '#DC2626',
    },
    {
      label: 'Margin',
      value: financials.actualCostTotal > 0 ? fmtCurrency(fcMargin) : '—',
      color: fcMargin >= 0 ? '#059669' : '#DC2626',
      badge: financials.actualCostTotal > 0
        ? { text: `${((fcMargin / financials.fcLaborTotal) * 100).toFixed(0)}%`, variant: fcMargin >= 0 ? 'healthy' as const : 'watch' as const }
        : undefined,
    },
  ];
}

export function COKPIStrip(props: COKPIStripProps) {
  const tiles = getTiles(props);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="bg-card rounded-xl px-3.5 py-3 border border-border shadow-sm"
          style={{ borderTopWidth: '3px', borderTopColor: tile.color }}
        >
          <div className="flex items-start justify-between gap-1">
            <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground font-medium leading-tight">
              {tile.label}
            </p>
            {tile.badge && (
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${BADGE_CLASSES[tile.badge.variant]}`}>
                {tile.badge.text}
              </span>
            )}
          </div>
          <p className="font-heading text-foreground leading-none mt-1.5" style={{ fontSize: '1.35rem', fontWeight: 900 }}>
            {tile.value}
          </p>
          {tile.sub && (
            <p className="text-[10px] text-muted-foreground mt-1">{tile.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}

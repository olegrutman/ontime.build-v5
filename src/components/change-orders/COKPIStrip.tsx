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

interface KPITile {
  label: string;
  value: string;
  color: string;
  sub?: string;
  badge?: { text: string; variant: 'healthy' | 'watch' | 'neutral' };
}

function fmtCurrency(value: number) {
  if (value === 0) return '$0';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getStatusBadge(value: number, hasItems: boolean): KPITile['badge'] {
  if (!hasItems) return { text: 'No items', variant: 'neutral' };
  if (value === 0) return { text: 'Awaiting input', variant: 'watch' };
  return { text: 'Priced', variant: 'healthy' };
}

const BADGE_CLASSES = {
  healthy: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  watch: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  neutral: 'bg-accent text-muted-foreground',
};

function getTiles(props: COKPIStripProps): KPITile[] {
  const { isGC, isTC, isFC, financials, hasMaterials = true, hasEquipment = true } = props;
  const totalToApprove = financials.tcBillableToGC + financials.materialsTotal + financials.equipmentTotal;

  if (isGC) {
    const tiles: KPITile[] = [
      {
        label: 'Labor billed',
        value: fmtCurrency(financials.tcBillableToGC),
        color: 'hsl(var(--primary))',
        badge: getStatusBadge(financials.tcBillableToGC, true),
      },
    ];
    if (hasMaterials || financials.materialsTotal > 0) {
      tiles.push({
        label: 'Materials',
        value: fmtCurrency(financials.materialsTotal),
        color: '#10B981',
        badge: getStatusBadge(financials.materialsTotal, hasMaterials),
      });
    }
    if (hasEquipment || financials.equipmentTotal > 0) {
      tiles.push({
        label: 'Equipment',
        value: fmtCurrency(financials.equipmentTotal),
        color: '#8B5CF6',
        badge: getStatusBadge(financials.equipmentTotal, hasEquipment),
      });
    }
    tiles.push({
      label: 'Total to approve',
      value: fmtCurrency(totalToApprove),
      color: '#F5A623',
      sub: `${tiles.length - 1} categories`,
    });
    return tiles;
  }

  if (isTC) {
    return [
      {
        label: 'FC cost',
        value: fmtCurrency(financials.fcLaborTotal),
        color: '#F59E0B',
        sub: financials.fcTotalHours > 0 ? `${financials.fcTotalHours} hrs` : undefined,
        badge: getStatusBadge(financials.fcLaborTotal, true),
      },
      {
        label: 'My billable',
        value: fmtCurrency(financials.tcBillableToGC),
        color: 'hsl(var(--primary))',
        badge: getStatusBadge(financials.tcBillableToGC, true),
      },
      {
        label: 'Mat + Equip',
        value: fmtCurrency(financials.materialsTotal + financials.equipmentTotal),
        color: '#10B981',
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
      label: 'Hours logged',
      value: financials.fcTotalHours > 0 ? `${financials.fcTotalHours} hrs` : '—',
      color: '#F5A623',
      sub: financials.fcTotalHours > 0 ? `${Math.ceil(financials.fcTotalHours / 8)} days` : undefined,
    },
    {
      label: 'Billed to TC',
      value: fmtCurrency(financials.fcLaborTotal),
      color: 'hsl(var(--primary))',
      badge: getStatusBadge(financials.fcLaborTotal, true),
    },
    {
      label: 'Internal cost',
      value: financials.actualCostTotal > 0 ? fmtCurrency(financials.actualCostTotal) : '—',
      color: '#EF4444',
    },
    {
      label: 'Margin',
      value: financials.actualCostTotal > 0 ? fmtCurrency(fcMargin) : '—',
      color: fcMargin >= 0 ? '#10B981' : '#EF4444',
      badge: financials.actualCostTotal > 0
        ? { text: `${((fcMargin / financials.fcLaborTotal) * 100).toFixed(0)}%`, variant: fcMargin >= 0 ? 'healthy' as const : 'watch' as const }
        : undefined,
    },
  ];
}

export function COKPIStrip(props: COKPIStripProps) {
  const tiles = getTiles(props);

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${tiles.length}, 1fr)` }}>
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="bg-card rounded-lg px-3 py-2.5 border border-border"
          style={{ borderTopWidth: '3px', borderTopColor: tile.color }}
        >
          <div className="flex items-start justify-between gap-1">
            <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground font-medium leading-tight">
              {tile.label}
            </p>
            {tile.badge && (
              <span className={`text-[9px] font-semibold px-1.5 py-0 rounded-full whitespace-nowrap ${BADGE_CLASSES[tile.badge.variant]}`}>
                {tile.badge.text}
              </span>
            )}
          </div>
          <p
            className="font-heading text-foreground leading-none mt-1"
            style={{ fontSize: '1.25rem', fontWeight: 900 }}
          >
            {tile.value}
          </p>
          {tile.sub && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{tile.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}

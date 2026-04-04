import { DT } from '@/lib/design-tokens';
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
}

function fmtCurrency(value: number) {
  if (value === 0) return '$0';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getTiles(props: COKPIStripProps): KPITile[] {
  const { isGC, isTC, isFC, financials, hasMaterials = true, hasEquipment = true } = props;
  const totalToApprove = financials.tcBillableToGC + financials.materialsTotal + financials.equipmentTotal;

  if (isGC) {
    const tiles: KPITile[] = [
      { label: 'Labor billed', value: fmtCurrency(financials.tcBillableToGC), color: 'hsl(var(--primary))' },
    ];
    if (hasMaterials || financials.materialsTotal > 0) {
      tiles.push({ label: 'Materials', value: fmtCurrency(financials.materialsTotal), color: '#10B981' });
    }
    if (hasEquipment || financials.equipmentTotal > 0) {
      tiles.push({ label: 'Equipment', value: fmtCurrency(financials.equipmentTotal), color: '#8B5CF6' });
    }
    tiles.push({ label: 'Total to approve', value: fmtCurrency(totalToApprove), color: '#F5A623' });
    return tiles;
  }

  if (isTC) {
    return [
      { label: 'FC cost', value: fmtCurrency(financials.fcLaborTotal), color: '#F59E0B' },
      { label: 'My billable', value: fmtCurrency(financials.tcBillableToGC), color: 'hsl(var(--primary))' },
      { label: 'Mat + Equip', value: fmtCurrency(financials.materialsTotal + financials.equipmentTotal), color: '#10B981' },
      { label: 'Total to GC', value: fmtCurrency(financials.grandTotal), color: '#F5A623' },
    ];
  }

  // FC
  const fcMargin = financials.fcLaborTotal - financials.actualCostTotal;
  return [
    { label: 'Hours logged', value: financials.fcTotalHours > 0 ? `${financials.fcTotalHours} hrs` : '—', color: '#F5A623' },
    { label: 'Billed to TC', value: fmtCurrency(financials.fcLaborTotal), color: 'hsl(var(--primary))' },
    { label: 'Actual cost', value: financials.actualCostTotal > 0 ? fmtCurrency(financials.actualCostTotal) : '—', color: '#EF4444' },
    { label: 'Margin', value: financials.actualCostTotal > 0 ? fmtCurrency(fcMargin) : '—', color: fcMargin >= 0 ? '#10B981' : '#EF4444' },
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
          <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground font-medium leading-tight">
            {tile.label}
          </p>
          <p
            className="text-foreground leading-none mt-1"
            className="font-heading" style={{ fontSize: '1.25rem', fontWeight: 900 }}
          >
            {tile.value}
          </p>
        </div>
      ))}
    </div>
  );
}

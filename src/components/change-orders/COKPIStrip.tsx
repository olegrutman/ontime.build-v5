import { DT } from '@/lib/design-tokens';
import type { COFinancials, ChangeOrder } from '@/types/changeOrder';

interface COKPIStripProps {
  co: ChangeOrder;
  isGC: boolean;
  isTC: boolean;
  isFC: boolean;
  financials: COFinancials;
}

interface KPITile {
  label: string;
  value: string;
  sub?: string;
  color: string;
}

function fmtCurrency(value: number) {
  if (value === 0) return '$0';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getTiles(props: COKPIStripProps): KPITile[] {
  const { isGC, isTC, isFC, financials } = props;
  const totalToApprove = financials.tcBillableToGC + financials.materialsTotal + financials.equipmentTotal;

  if (isGC) {
    return [
      { label: 'Labor billed', value: fmtCurrency(financials.tcBillableToGC), color: '#3B82F6' },
      { label: 'Materials', value: fmtCurrency(financials.materialsTotal), color: '#10B981' },
      { label: 'Equipment', value: fmtCurrency(financials.equipmentTotal), color: '#8B5CF6' },
      { label: 'Total to approve', value: fmtCurrency(totalToApprove), color: '#F5A623' },
    ];
  }

  if (isTC) {
    const tcMat = financials.materialsTotal;
    const tcEq = financials.equipmentTotal;
    return [
      { label: 'FC cost', value: fmtCurrency(financials.fcLaborTotal), color: '#F59E0B' },
      { label: 'My billable', value: fmtCurrency(financials.tcBillableToGC), color: '#3B82F6' },
      { label: 'Mat + Equip', value: fmtCurrency(tcMat + tcEq), color: '#10B981' },
      { label: 'Total to GC', value: fmtCurrency(financials.grandTotal), color: '#F5A623' },
    ];
  }

  // FC
  return [
    { label: 'My hours logged', value: financials.fcTotalHours > 0 ? `${financials.fcTotalHours} hrs` : '—', color: '#F5A623' },
    { label: 'Status', value: props.co.status === 'submitted' ? 'Submitted' : 'Active', color: '#3B82F6' },
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
            style={{ ...DT.heading, fontSize: '1.25rem', fontWeight: 900 }}
          >
            {tile.value}
          </p>
          {tile.sub && (
            <p className="text-[0.55rem] text-muted-foreground mt-0.5">{tile.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}

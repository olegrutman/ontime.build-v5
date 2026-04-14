import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import type { COFinancials, ChangeOrder } from '@/types/changeOrder';

interface COKPIStripProps {
  co: ChangeOrder;
  isGC: boolean;
  isTC: boolean;
  isFC: boolean;
  financials: COFinancials;
  hasMaterials?: boolean;
  hasEquipment?: boolean;
  onRefresh?: () => void;
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
  editable?: boolean;
  editValue?: number | null;
}

const BADGE_CLASSES = {
  healthy: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  watch: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  neutral: 'bg-accent text-muted-foreground',
};

function getTiles(props: COKPIStripProps): KPITile[] {
  const { isGC, isTC, isFC, financials } = props;
  const matEquip = financials.materialsTotal + financials.equipmentTotal;

  if (isGC) {
    const laborCost = financials.tcBillableToGC;
    const materialCost = financials.materialsTotal;
    const equipmentCost = financials.equipmentTotal;
    const totalCost = financials.grandTotal;
    const gcBudget = (props.co as any).gc_budget as number | null;

    return [
      {
        label: 'Labor Cost',
        value: fmtCurrency(laborCost),
        color: 'hsl(var(--primary))',
      },
      {
        label: 'Material Cost',
        value: fmtCurrency(materialCost),
        color: '#059669',
      },
      {
        label: 'Equipment Cost',
        value: fmtCurrency(equipmentCost),
        color: '#F59E0B',
      },
      {
        label: 'Total Cost',
        value: fmtCurrency(totalCost),
        color: '#F5A623',
        badge: totalCost > 0 ? { text: 'Final', variant: 'healthy' } : undefined,
      },
      {
        label: 'GC Budget',
        value: gcBudget ? fmtCurrency(gcBudget) : '—',
        color: '#6366F1',
        editable: true,
        editValue: gcBudget,
        badge: gcBudget && totalCost > 0
          ? { text: `${((totalCost / gcBudget) * 100).toFixed(0)}%`, variant: totalCost <= gcBudget ? 'healthy' as const : 'watch' as const }
          : undefined,
      },
    ];
  }

  if (isTC) {
    const totalToGC = financials.tcBillableToGC + matEquip;
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
  const fcMargin = financials.fcLaborTotal - financials.fcActualCostTotal;
  const fcMarginPct = financials.fcLaborTotal > 0 ? ((fcMargin / financials.fcLaborTotal) * 100).toFixed(0) : '0';
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
      value: financials.fcActualCostTotal > 0 ? fmtCurrency(financials.fcActualCostTotal) : '—',
      color: '#DC2626',
    },
    {
      label: 'Margin',
      value: financials.fcActualCostTotal > 0 ? fmtCurrency(fcMargin) : '—',
      color: fcMargin >= 0 ? '#059669' : '#DC2626',
      badge: financials.fcActualCostTotal > 0
        ? { text: `${fcMarginPct}%`, variant: fcMargin >= 0 ? 'healthy' as const : 'watch' as const }
        : undefined,
    },
  ];
}

function EditableBudgetTile({ tile, coId, onRefresh }: { tile: KPITile; coId: string; onRefresh?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tile.editValue?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    const num = parseFloat(draft.replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num <= 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('change_orders').update({ gc_budget: num }).eq('id', coId);
    setSaving(false);
    if (error) { toast.error('Failed to save budget'); }
    else { toast.success('Budget updated'); onRefresh?.(); }
    setEditing(false);
  }

  return (
    <div
      className="bg-card rounded-xl px-3.5 py-3 border border-border shadow-sm cursor-pointer"
      style={{ borderTopWidth: '3px', borderTopColor: tile.color }}
      onClick={() => { if (!editing) { setDraft(tile.editValue?.toString() ?? ''); setEditing(true); } }}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground font-medium leading-tight">
          {tile.label}
        </p>
        {tile.badge && !editing && (
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${BADGE_CLASSES[tile.badge.variant]}`}>
            {tile.badge.text}
          </span>
        )}
      </div>
      {editing ? (
        <div className="mt-1.5" onClick={e => e.stopPropagation()}>
          <Input
            autoFocus
            type="number"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
            className="h-8 text-sm font-mono"
            disabled={saving}
            placeholder="Enter budget"
          />
        </div>
      ) : (
        <p className="font-heading text-foreground leading-none mt-1.5" style={{ fontSize: '1.35rem', fontWeight: 900 }}>
          {tile.value}
        </p>
      )}
      {!editing && (
        <p className="text-[10px] text-muted-foreground mt-1">Click to edit</p>
      )}
    </div>
  );
}

export function COKPIStrip(props: COKPIStripProps) {
  const tiles = getTiles(props);
  const gridCols = props.isGC ? 'lg:grid-cols-5' : 'lg:grid-cols-4';

  return (
    <div className={`grid grid-cols-2 ${gridCols} gap-2.5`}>
      {tiles.map((tile) =>
        tile.editable ? (
          <EditableBudgetTile key={tile.label} tile={tile} coId={props.co.id} onRefresh={props.onRefresh} />
        ) : (
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
        )
      )}
    </div>
  );
}

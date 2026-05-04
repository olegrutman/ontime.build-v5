import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import type { COFinancials, ChangeOrder } from '@/types/changeOrder';
import type { MarkupVisibility } from '@/hooks/useMarkupVisibility';

interface COKPIStripProps {
  co: ChangeOrder;
  isGC: boolean;
  isTC: boolean;
  isFC: boolean;
  financials: COFinancials;
  hasMaterials?: boolean;
  hasEquipment?: boolean;
  materialResponsible?: 'GC' | 'TC';
  equipmentResponsible?: 'GC' | 'TC';
  onRefresh?: () => void;
  markupVisibility?: MarkupVisibility;
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
  const { isGC, isTC, isFC, financials, markupVisibility = 'hidden' } = props;
  const matResp = props.materialResponsible ?? 'TC';
  const eqResp = props.equipmentResponsible ?? 'TC';

  if (isGC) {
    const laborCost = financials.tcBillableToGC;
    const gcBudget = (props.co as any).gc_budget as number | null;

    // Only count mat/equip in TC cost when TC is the responsible party
    const tcMaterialCost = matResp === 'TC' ? financials.materialsTotal : 0;
    const tcEquipmentCost = eqResp === 'TC' ? financials.equipmentTotal : 0;
    const totalTCCost = laborCost + tcMaterialCost + tcEquipmentCost;

    const tiles: KPITile[] = [
      {
        label: 'TC Labor',
        value: fmtCurrency(laborCost),
        color: 'hsl(var(--primary))',
      },
    ];

    // Only show mat/equip tiles if TC is responsible for them
    if (matResp === 'TC') {
      tiles.push({
        label: 'Material Cost',
        value: fmtCurrency(financials.materialsTotal),
        color: '#059669',
      });
    }
    if (eqResp === 'TC') {
      tiles.push({
        label: 'Equipment Cost',
        value: fmtCurrency(financials.equipmentTotal),
        color: '#F59E0B',
      });
    }

    tiles.push({
      label: 'Total TC Cost',
      value: fmtCurrency(totalTCCost),
      color: '#F5A623',
      badge: totalTCCost > 0 ? { text: 'Final', variant: 'healthy' } : undefined,
    });

    tiles.push({
      label: 'GC Budget',
      value: gcBudget ? fmtCurrency(gcBudget) : '—',
      color: '#6366F1',
      editable: true,
      editValue: gcBudget,
      badge: gcBudget && totalTCCost > 0
        ? { text: `${((totalTCCost / gcBudget) * 100).toFixed(0)}%`, variant: totalTCCost <= gcBudget ? 'healthy' as const : 'watch' as const }
        : undefined,
    });

    // Summary mode: show labor + material totals
    if (markupVisibility === 'summary') {
      tiles.push({
        label: 'Labor',
        value: fmtCurrency(laborCost),
        color: '#7C3AED',
      });
    }

    // Detailed mode: show TC margin
    if (markupVisibility === 'detailed') {
      const tcInternalCost = financials.fcLaborTotal + financials.tcActualCostTotal + financials.materialsCost + financials.equipmentCost;
      const tcMargin = totalTCCost - tcInternalCost;
      const tcMarginPct = totalTCCost > 0 ? (tcMargin / totalTCCost) * 100 : 0;
      tiles.push({
        label: 'TC Margin',
        value: fmtCurrency(tcMargin),
        color: tcMargin >= 0 ? '#059669' : '#DC2626',
        badge: tcInternalCost > 0 ? { text: `${tcMarginPct.toFixed(0)}%`, variant: tcMargin >= 0 ? 'healthy' as const : 'watch' as const } : undefined,
      });
    }

    // Tax tile when there's tax
    if (financials.totalTax > 0) {
      tiles.push({
        label: financials.taxJurisdictionLabel ?? 'Tax',
        value: fmtCurrency(financials.totalTax),
        color: '#8B5CF6',
        sub: `${financials.taxRate}%`,
      });
    }

    return tiles;
  }

  if (isTC) {
    // TC only bills GC for mat/equip when TC is the responsible party
    const tcMatCost = matResp === 'TC' ? financials.materialsTotal : 0;
    const tcEqCost = eqResp === 'TC' ? financials.equipmentTotal : 0;
    const matEquip = tcMatCost + tcEqCost;
    const totalToGC = financials.tcBillableToGC + matEquip;

    const tiles: KPITile[] = [
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
    ];

    if (matEquip > 0) {
      tiles.push({
        label: 'Materials + Equipment',
        value: fmtCurrency(matEquip),
        color: '#059669',
      });
    }

    tiles.push({
      label: 'Total to GC',
      value: fmtCurrency(totalToGC),
      color: '#F5A623',
    });

    return tiles;
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
  const colCount = tiles.length;
  const gridCols = colCount >= 5 ? 'lg:grid-cols-5' : colCount === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3';

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

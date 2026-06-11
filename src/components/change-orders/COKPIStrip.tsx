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
  tcBillableTotal?: number;
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
    // Canonical headline number = what the GC will be billed. Excludes M&E when GC procures them.
    const tcSubmitted = props.tcBillableTotal ?? (financials.tcBillableToGC
      + (matResp === 'TC' ? financials.materialsTotal : 0)
      + (eqResp === 'TC' ? financials.equipmentTotal : 0));

    const gcBudget = (props.co as any).gc_budget as number | null;

    // Only count mat/equip in TC cost when TC is the responsible party
    const tcMaterialCost = matResp === 'TC' ? financials.materialsTotal : 0;
    const tcEquipmentCost = eqResp === 'TC' ? financials.equipmentTotal : 0;

    const headlineLabel = matResp === 'GC' && eqResp === 'GC'
      ? 'TC Labor'
      : matResp === 'GC' ? 'TC Labor + Equipment'
      : eqResp === 'GC' ? 'TC Labor + Materials'
      : 'TC Submitted';
    const headlineSub = (matResp === 'GC' || eqResp === 'GC')
      ? `${matResp === 'GC' && eqResp === 'GC' ? 'Materials & equipment' : matResp === 'GC' ? 'Materials' : 'Equipment'} procured by GC — billed separately`
      : 'What you will be billed';

    const tiles: KPITile[] = [
      {
        label: headlineLabel,
        value: fmtCurrency(tcSubmitted),
        color: 'hsl(var(--primary))',
        sub: headlineSub,
      },
    ];


    // Show mat/equip breakdown tiles only when TC is responsible AND there's a value
    if (matResp === 'TC' && tcMaterialCost > 0) {
      tiles.push({
        label: 'Material Cost',
        value: fmtCurrency(tcMaterialCost),
        color: '#059669',
      });
    }
    if (eqResp === 'TC' && tcEquipmentCost > 0) {
      tiles.push({
        label: 'Equipment Cost',
        value: fmtCurrency(tcEquipmentCost),
        color: '#F59E0B',
      });
    }

    tiles.push({
      label: 'GC Budget',
      value: gcBudget ? fmtCurrency(gcBudget) : '—',
      color: '#6366F1',
      editable: true,
      editValue: gcBudget,
      sub: gcBudget ? undefined : 'Your internal cap (click to set)',
      badge: gcBudget && tcSubmitted > 0
        ? { text: `${((tcSubmitted / gcBudget) * 100).toFixed(0)}% used`, variant: tcSubmitted <= gcBudget ? 'healthy' as const : 'watch' as const }
        : undefined,
    });

    // Detailed mode: show TC margin
    if (markupVisibility === 'detailed') {
      const tcInternalCost = financials.fcLaborTotal + financials.tcActualCostTotal + financials.materialsCost + financials.equipmentCost;
      const tcMargin = tcSubmitted - tcInternalCost;
      const tcMarginPct = tcSubmitted > 0 ? (tcMargin / tcSubmitted) * 100 : 0;
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

    // Retainage tiles
    if (financials.retainagePercent > 0 && financials.retainageAmount > 0) {
      tiles.push({
        label: 'Retainage Held',
        value: fmtCurrency(financials.retainageAmount),
        color: '#DC2626',
        sub: `${financials.retainagePercent}%`,
        badge: financials.retainageReleased ? { text: 'Released', variant: 'healthy' } : { text: 'Held', variant: 'watch' },
      });
      tiles.push({
        label: 'Net Payable',
        value: fmtCurrency(financials.netPayableAmount),
        color: '#059669',
      });
    }

    return tiles;
  }

  if (isTC || isFC) {
    const upstream = isTC ? 'GC' : 'TC';
    // Use viewer-scoped totals so FC collaborators don't pull TC's mats/eq
    const matCost = financials.viewer.ownMaterialsTotal;
    const eqCost = financials.viewer.ownEquipmentTotal;
    const matEquip = matCost + eqCost;
    const ownLaborToUpstream = financials.viewer.ownLaborToUpstream;
    const totalToUpstream = financials.viewer.totalToUpstream;

    const tiles: KPITile[] = [];

    if (isTC) {
      tiles.push({
        label: 'FC Cost',
        value: fmtCurrency(financials.fcLaborTotal),
        color: '#F5A623',
        sub: financials.fcTotalHours > 0 ? `${financials.fcTotalHours} hrs logged` : undefined,
        badge: financials.fcLaborTotal > 0 ? { text: 'Priced', variant: 'healthy' } : { text: 'Awaiting input', variant: 'watch' },
      });
    } else {
      tiles.push({
        label: 'Hours Logged',
        value: financials.fcTotalHours > 0 ? `${financials.fcTotalHours} hrs` : '—',
        color: '#F5A623',
        sub: financials.fcTotalHours > 0 ? `${Math.ceil(financials.fcTotalHours / 8)} days` : undefined,
      });
    }

    tiles.push({
      label: isTC ? 'My Billable' : 'My Labor',
      value: fmtCurrency(ownLaborToUpstream),
      color: 'hsl(var(--primary))',
      badge: ownLaborToUpstream > 0 ? { text: 'Priced', variant: 'healthy' } : { text: 'Awaiting input', variant: 'watch' },
    });

    if (matEquip > 0) {
      tiles.push({
        label: 'Materials + Equipment',
        value: fmtCurrency(matEquip),
        color: '#059669',
      });
    }

    tiles.push({
      label: `Total to ${upstream}`,
      value: fmtCurrency(totalToUpstream),
      color: '#F5A623',
    });

    if (financials.retainagePercent > 0 && financials.retainageAmount > 0) {
      tiles.push({
        label: 'Retainage Held',
        value: fmtCurrency(financials.retainageAmount),
        color: '#DC2626',
        sub: `${financials.retainagePercent}%`,
        badge: financials.retainageReleased ? { text: 'Released', variant: 'healthy' } : { text: 'Held', variant: 'watch' },
      });
      tiles.push({
        label: 'Net Payable',
        value: fmtCurrency(financials.netPayableAmount),
        color: '#059669',
      });
    }

    return tiles;
  }

  return [];
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

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
  /** GC's own cost on this CO — the base a markup % is applied to. */
  gcCost?: number;
  markupPercent?: number | null;
  passedToOwner?: boolean | null;
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

    const gcOwnMatCost = matResp === 'GC' ? financials.materialsCost : 0;
    const gcOwnEqCost = eqResp === 'GC' ? financials.equipmentCost : 0;
    const gcCost = tcSubmitted + gcOwnMatCost + gcOwnEqCost;
    const markupPct = (props.co as any).gc_owner_markup_percent as number | null;
    const passedToOwner = (props.co as any).passed_to_owner as boolean | null;

    const ownerSub = passedToOwner === false
      ? 'Not passed to owner — you absorb this cost'
      : gcBudget
        ? `Cost ${fmtCurrency(gcCost)}${markupPct ? ` + ${markupPct}%` : ''} = ${fmtCurrency(gcBudget)} to owner`
        : 'What you bill the owner (click to set price or markup %)';

    tiles.push({
      label: 'GC to Owner Budget',
      value: passedToOwner === false ? 'Absorbed' : gcBudget ? fmtCurrency(gcBudget) : '—',
      color: '#6366F1',
      editable: true,
      editValue: gcBudget,
      gcCost,
      markupPercent: markupPct,
      passedToOwner,
      sub: ownerSub,
      badge: gcBudget && gcCost > 0 && passedToOwner !== false
        ? {
            text: `${(((gcBudget - gcCost) / gcCost) * 100).toFixed(0)}% markup`,
            variant: gcBudget >= gcCost ? 'healthy' as const : 'watch' as const,
          }
        : undefined,
    });

    // Detailed mode: show TC margin (revenue & cost both restricted to TC-responsible buckets)
    if (markupVisibility === 'detailed') {
      const ownMatCost = financials.materialResponsible === 'TC' ? financials.materialsCost : 0;
      const ownEqCost = financials.equipmentResponsible === 'TC' ? financials.equipmentCost : 0;
      const tcInternalCost = financials.fcLaborTotal + financials.tcActualCostTotal + ownMatCost + ownEqCost;
      const tcMargin = tcSubmitted - tcInternalCost;
      const tcMarginPct = tcSubmitted > 0 ? (tcMargin / tcSubmitted) * 100 : 0;
      tiles.push({
        label: 'TC Margin',
        value: fmtCurrency(tcMargin),
        color: tcMargin >= 0 ? '#059669' : '#DC2626',
        badge: tcInternalCost > 0 ? { text: `${tcMarginPct.toFixed(0)}%`, variant: tcMargin >= 0 ? 'healthy' as const : 'watch' as const } : undefined,
      });
    }

    // Tax tile when there's tax (responsibility-aware — exclude tax on GC-procured M&E)
    if (financials.billableTotalTax > 0) {
      tiles.push({
        label: financials.taxJurisdictionLabel ?? 'Tax',
        value: fmtCurrency(financials.billableTotalTax),
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

    // The Action Rail header already prints the headline "Total to {upstream}".
    // Only repeat it here when it differs from own labor (i.e. mats/eq/tax roll in).
    if (Math.abs(totalToUpstream - ownLaborToUpstream) > 0.005) {
      tiles.push({
        label: `Total to ${upstream}`,
        value: fmtCurrency(totalToUpstream),
        color: '#F5A623',
      });
    }

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
  const [priceDraft, setPriceDraft] = useState(tile.editValue?.toString() ?? '');
  const [markupDraft, setMarkupDraft] = useState(tile.markupPercent?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  const cost = tile.gcCost ?? 0;
  const parsedMarkup = parseFloat(markupDraft.replace(/[^0-9.\-]/g, ''));
  const derivedPrice = !isNaN(parsedMarkup) && cost > 0 ? cost * (1 + parsedMarkup / 100) : null;

  function open() {
    setPriceDraft(tile.editValue?.toString() ?? '');
    setMarkupDraft(tile.markupPercent?.toString() ?? '');
    setEditing(true);
  }

  async function save() {
    const typedPrice = parseFloat(priceDraft.replace(/[^0-9.]/g, ''));
    const price = !isNaN(typedPrice) && typedPrice > 0 ? typedPrice : derivedPrice;
    if (price == null || price <= 0) {
      setEditing(false);
      return;
    }
    const markup = !isNaN(parsedMarkup)
      ? parsedMarkup
      : cost > 0
        ? Number((((price - cost) / cost) * 100).toFixed(2))
        : null;

    setSaving(true);
    const { error } = await supabase
      .from('change_orders')
      .update({
        gc_budget: Number(price.toFixed(2)),
        gc_owner_markup_percent: markup,
        passed_to_owner: true,
        not_passed_reason: null,
      })
      .eq('id', coId);
    setSaving(false);
    if (error) { toast.error('Failed to save owner price'); }
    else { toast.success('Owner price updated'); onRefresh?.(); }
    setEditing(false);
  }

  return (
    <div
      className="bg-card rounded-xl px-3.5 py-3 border border-border shadow-sm cursor-pointer"
      style={{ borderTopWidth: '3px', borderTopColor: tile.color }}
      onClick={() => { if (!editing) open(); }}
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
        <div className="mt-1.5 space-y-1.5" onClick={e => e.stopPropagation()}>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Markup %</p>
              <Input
                autoFocus
                type="number"
                value={markupDraft}
                onChange={e => { setMarkupDraft(e.target.value); setPriceDraft(''); }}
                onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
                className="h-8 text-sm font-mono"
                disabled={saving}
                placeholder="15"
              />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Owner price</p>
              <Input
                type="number"
                value={priceDraft}
                onChange={e => setPriceDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
                className="h-8 text-sm font-mono"
                disabled={saving}
                placeholder={derivedPrice ? derivedPrice.toFixed(0) : 'Amount'}
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">
            Cost {fmtCurrency(cost)}
            {derivedPrice != null && !priceDraft ? ` → ${fmtCurrency(derivedPrice)} to owner` : ''}
          </p>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="h-7 w-full rounded-md bg-primary text-primary-foreground text-[11px] font-semibold uppercase tracking-wider"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      ) : (
        <p className="font-heading text-foreground leading-none mt-1.5" style={{ fontSize: '1.35rem', fontWeight: 900 }}>
          {tile.value}
        </p>
      )}
      {!editing && tile.sub && (
        <p className="text-[10px] text-muted-foreground mt-1">{tile.sub}</p>
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

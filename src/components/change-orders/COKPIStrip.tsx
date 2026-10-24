import { Calculator, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { C, KpiCard } from '@/components/shared/KpiCard';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import type { COFinancials, ChangeOrder } from '@/types/changeOrder';
import type { MarkupVisibility } from '@/hooks/useMarkupVisibility';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';
import type { RoleLabels } from '@/hooks/useRoleLabels';

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

function tilePills(tile: KPITile) {
  return tile.badge ? [{ type: tile.badge.variant === 'healthy' ? 'pg' as const : tile.badge.variant === 'watch' ? 'pa' as const : 'pm' as const, text: tile.badge.text }] : [];
}

function getTiles(props: COKPIStripProps, rl: RoleLabels): KPITile[] {
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
      ? `${rl.TC} labor`
      : matResp === 'GC' ? `${rl.TC} labor + equipment`
      : eqResp === 'GC' ? `${rl.TC} labor + materials`
      : `${rl.TC} submitted`;
    const headlineSub = (matResp === 'GC' || eqResp === 'GC')
      ? `${matResp === 'GC' && eqResp === 'GC' ? 'Materials & equipment' : matResp === 'GC' ? 'Materials' : 'Equipment'} procured by ${rl.GC} — billed separately`
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
        color: C.green,
      });
    }
    if (eqResp === 'TC' && tcEquipmentCost > 0) {
      tiles.push({
        label: 'Equipment Cost',
        value: fmtCurrency(tcEquipmentCost),
        color: C.yellow,
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
      label: 'Your price to owner',
      value: passedToOwner === false ? 'Absorbed' : gcBudget ? fmtCurrency(gcBudget) : '—',
      color: C.blue,
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
      // Crew-time pricing: crew billable rows and the TC internal-cost copy
      // mirror the same work — count once to avoid a fake loss.
      const tcLaborCost = financials.useFcPricingBase
        ? (financials.tcActualCostTotal > 0 ? financials.tcActualCostTotal : financials.fcLaborTotal)
        : financials.fcLaborTotal + financials.tcActualCostTotal;
      const tcInternalCost = tcLaborCost + ownMatCost + ownEqCost;
      const tcMargin = tcSubmitted - tcInternalCost;
      const tcMarginPct = tcSubmitted > 0 ? (tcMargin / tcSubmitted) * 100 : 0;
      tiles.push({
        label: `${rl.TC} margin`,
        value: fmtCurrency(tcMargin),
        color: tcMargin >= 0 ? C.green : C.red,
        badge: tcInternalCost > 0 ? { text: `${tcMarginPct.toFixed(0)}%`, variant: tcMargin >= 0 ? 'healthy' as const : 'watch' as const } : undefined,
      });
    }

    // Tax tile when there's tax (responsibility-aware — exclude tax on GC-procured M&E)
    if (financials.billableTotalTax > 0) {
      tiles.push({
        label: financials.taxJurisdictionLabel ?? 'Tax',
        value: fmtCurrency(financials.billableTotalTax),
        color: C.purple,
        sub: `${financials.taxRate}%`,
      });
    }


    // Retainage tiles
    if (financials.retainagePercent > 0 && financials.retainageAmount > 0) {
      tiles.push({
        label: 'Retainage Held',
        value: fmtCurrency(financials.retainageAmount),
        color: C.red,
        sub: `${financials.retainagePercent}%`,
        badge: financials.retainageReleased ? { text: 'Released', variant: 'healthy' } : { text: 'Held', variant: 'watch' },
      });
      tiles.push({
        label: 'Net Payable',
        value: fmtCurrency(financials.netPayableAmount),
        color: C.green,
      });
    }

    return tiles;
  }

  if (isTC || isFC) {
    const upstream = isTC ? rl.GC : rl.TC;
    // Use viewer-scoped totals so FC collaborators don't pull TC's mats/eq
    const matCost = financials.viewer.ownMaterialsTotal;
    const eqCost = financials.viewer.ownEquipmentTotal;
    const matEquip = matCost + eqCost;
    const ownLaborToUpstream = financials.viewer.ownLaborToUpstream;
    const totalToUpstream = financials.viewer.totalToUpstream;

    const tiles: KPITile[] = [];

    if (isTC) {
      tiles.push({
        label: `${rl.FC} cost`,
        value: fmtCurrency(financials.fcLaborTotal),
        color: C.amber,
        sub: financials.fcTotalHours > 0 ? `${financials.fcTotalHours} hrs logged` : undefined,
        badge: financials.fcLaborTotal > 0 ? { text: 'Priced', variant: 'healthy' } : { text: 'Awaiting input', variant: 'watch' },
      });
    } else {
      tiles.push({
        label: 'Hours Logged',
        value: financials.fcTotalHours > 0 ? `${financials.fcTotalHours} hrs` : '—',
        color: C.amber,
        sub: financials.fcTotalHours > 0 ? `${Math.ceil(financials.fcTotalHours / 8)} days` : undefined,
      });
    }

    // When the TC prices from crew time but no billable rows exist yet (e.g. the
    // crew submitted the WO directly), fall back to the crew-derived total so the
    // card never reads $0 while the pricing panel shows a real number.
    const myBillable = ownLaborToUpstream > 0
      ? ownLaborToUpstream
      : (isTC && props.co.use_fc_pricing_base ? (props.tcBillableTotal ?? 0) : 0);
    tiles.push({
      label: isTC ? 'My Billable' : 'My Labor',
      value: fmtCurrency(myBillable),
      color: 'hsl(var(--primary))',
      badge: myBillable > 0 ? { text: 'Priced', variant: 'healthy' } : { text: 'Awaiting input', variant: 'watch' },
    });

    if (matEquip > 0) {
      tiles.push({
        label: 'Materials + Equipment',
        value: fmtCurrency(matEquip),
        color: C.green,
      });
    }

    // The Action Rail header already prints the headline "Total to {upstream}".
    // Only repeat it here when it differs from own labor (i.e. mats/eq/tax roll in).
    if (Math.abs(totalToUpstream - ownLaborToUpstream) > 0.005) {
      tiles.push({
        label: `Total to ${upstream}`,
        value: fmtCurrency(totalToUpstream),
        color: C.amber,
      });
    }

    if (financials.retainagePercent > 0 && financials.viewer.retainageAmount > 0) {
      tiles.push({
        label: 'Retainage Held',
        value: fmtCurrency(financials.viewer.retainageAmount),
        color: C.red,
        sub: `${financials.retainagePercent}%`,
        badge: financials.retainageReleased ? { text: 'Released', variant: 'healthy' } : { text: 'Held', variant: 'watch' },
      });
      tiles.push({
        label: 'Net Payable',
        value: fmtCurrency(financials.viewer.netPayableAmount),
        color: C.green,
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
    <KpiCard label={tile.label} value={tile.value} sub={tile.sub ?? tile.label} accent={tile.color}
      icon={<Calculator size={18} />} iconBg={C.surface2} pills={tilePills(tile)}
      headerAction={<Button variant="ghost" size="icon" aria-label={`Edit ${tile.label}`} onClick={open}><Pencil size={14} /></Button>}>
      <div className="p-4">
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
          <Button
            type="button"
            onClick={save}
            disabled={saving}
            className="h-7 w-full rounded-md bg-primary text-primary-foreground text-[11px] font-semibold uppercase tracking-wider"
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3"><p className="text-sm text-muted-foreground">{tile.sub}</p><Button variant="outline" onClick={open}><Pencil size={14} />Edit owner price</Button></div>
      )}
      </div>
    </KpiCard>
  );
}

export function COKPIStrip(props: COKPIStripProps) {
  const rl = useRoleLabelsContext();
  const tiles = getTiles(props, rl);
  const colCount = tiles.length;
  const gridCols = colCount >= 5 ? 'lg:grid-cols-5' : colCount === 4 ? 'lg:grid-cols-4' : colCount === 3 ? 'lg:grid-cols-3' : colCount === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-1';

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols} gap-2.5`}>
      {tiles.map((tile, idx) => tile.editable
        ? <EditableBudgetTile key={tile.label} tile={tile} coId={props.co.id} onRefresh={props.onRefresh} />
        : <KpiCard key={tile.label} label={tile.label} value={tile.value} sub={tile.sub ?? tile.label}
            icon={<Calculator size={18} />} accent={tile.color} iconBg={C.surface2} idx={idx} pills={tilePills(tile)} />)}
    </div>
  );
}

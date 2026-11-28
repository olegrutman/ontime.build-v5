import { Calculator, Maximize2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bar, C, KpiCard, Pill } from '@/components/shared/KpiCard';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { COFinancials, ChangeOrder } from '@/types/changeOrder';
import type { MarkupVisibility } from '@/hooks/useMarkupVisibility';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';
import type { RoleLabels } from '@/hooks/useRoleLabels';
import { cn } from '@/lib/utils';
import { unbilledActuals } from '@/lib/coPricingPresentation';

interface COKPIStripProps {
  /** Crew view: price label follows the crew's own agreement, not the upstream approval. */
  crewHandoff?: 'not_sent' | 'sent' | 'accepted';
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
  pricedCount?: number;
  itemCount?: number;
  /** Viewer-scoped per-item amounts so every card can show how its total is made. */
  itemBreakdown?: COKPIItemBreakdown[];
  /** Small tappable chips (phones) instead of full cards. */
  compact?: boolean;
  billedToDate?: number;
  draftBilling?: number;
  billingLoaded?: boolean;
  loggedHours?: number;
  completedItemCount?: number;
  activeItemCount?: number;
}

export interface COKPIItemBreakdown {
  id: string;
  name: string;
  revenue: number;
  cost: number;
  priced: boolean;
  hours: number;
  completed: boolean;
  rejected: boolean;
}

function fmtCurrency(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  kind?: 'revenue' | 'cost' | 'margin' | 'progress' | 'hours' | 'other';
  primary?: boolean;
  meter?: { percent: number; color: string };
}

function tilePills(tile: KPITile) {
  return tile.badge ? [{ type: tile.badge.variant === 'healthy' ? 'pg' as const : tile.badge.variant === 'watch' ? 'pa' as const : 'pm' as const, text: tile.badge.text }] : [];
}

function getTiles(props: COKPIStripProps, rl: RoleLabels): KPITile[] {
  const { co, financials, isGC, isTC, isFC } = props;
  const legacy = getLegacyTiles(props, rl);
  const supplemental = legacy.filter(tile =>
    tile.editable || tile.label === 'Retainage Held' || tile.label === 'Net Payable' ||
    tile.label === (financials.taxJurisdictionLabel ?? 'Tax'));
  const billingLoaded = props.billingLoaded !== false;
  const billed = Math.max(0, props.billedToDate ?? 0);
  const draft = Math.max(0, props.draftBilling ?? 0);
  const hours = Math.max(0, props.loggedHours ?? 0);
  const isApproved = ['approved', 'contracted'].includes(co.status);
  const matResp = props.materialResponsible ?? 'TC';
  const eqResp = props.equipmentResponsible ?? 'TC';
  const gcHeadline = props.tcBillableTotal ?? (financials.tcBillableToGC
    + (matResp === 'TC' ? financials.materialsTotal : 0)
    + (eqResp === 'TC' ? financials.equipmentTotal : 0));
  const ownLabor = financials.viewer.ownLaborToUpstream;
  const ownBillable = ownLabor > 0 ? ownLabor : (isTC && financials.useFcPricingBase ? (props.tcBillableTotal ?? 0) : 0);
  const currentRevenue = financials.viewer.totalToUpstream > 0 ? financials.viewer.totalToUpstream : ownBillable;
  const revenue = isGC
    ? gcHeadline
    : isApproved && isTC && co.approved_amount != null
      ? Number(co.approved_amount)
      : currentRevenue;
  const runningTotal = isGC ? gcHeadline : currentRevenue;
  const billingSub = !billingLoaded ? 'Loading invoice records…' : draft > 0 ? `${fmtCurrency(draft)} on drafts · not billed` : 'Issued invoices only';
  const billedValue = billingLoaded ? fmtCurrency(billed) : '…';

  if (co.pricing_type === 'fixed') {
    const base = legacy.filter(tile => !['Private cost', 'Gross margin', 'Order margin'].includes(tile.label));
    const primaryIndex = base.findIndex(tile => tile.primary);
    const modeTiles: KPITile[] = [
      {
        label: 'Billed to date',
        value: billedValue,
        color: C.blue,
        sub: !billingLoaded ? billingSub : `${revenue > 0 ? `${Math.min(100, (billed / revenue) * 100).toFixed(1)}% of the approved price` : 'No issued invoices'} · ${billingSub}`,
        kind: 'other',
      },
      {
        label: 'Remaining to bill',
        value: billingLoaded ? fmtCurrency(Math.max(0, revenue - billed)) : '…',
        color: C.green,
        sub: billingLoaded ? 'Approved fixed price minus issued invoices' : billingSub,
        kind: 'other',
      },
      {
        label: 'Scope completion',
        value: `${props.completedItemCount ?? 0} of ${props.activeItemCount ?? 0}`,
        color: C.purple,
        sub: 'Completed scope items · progress billing remains separate',
        kind: 'progress',
      },
    ];
    base.splice(primaryIndex >= 0 ? primaryIndex + 1 : 1, 0, ...modeTiles);
    return base;
  }

  if (co.pricing_type === 'tm') {
    return [
      {
        label: isApproved ? 'Running actuals' : 'Current actuals',
        value: fmtCurrency(runningTotal),
        color: C.purple,
        sub: 'Dated labor + materials + equipment · before tax',
        kind: 'revenue',
        primary: true,
        badge: { text: 'Open ended', variant: 'neutral' },
      },
      {
        label: 'Logged hours',
        value: `${hours.toLocaleString('en-US', { maximumFractionDigits: 1 })}h`,
        color: C.blue,
        sub: 'Hourly billing entries visible to your company',
        kind: 'hours',
      },
      {
        label: 'Available to invoice',
        value: billingLoaded ? fmtCurrency(unbilledActuals(runningTotal, billed, draft)) : '…',
        color: C.green,
        sub: !billingLoaded ? billingSub : `Actuals not on issued or draft invoices · ${billingSub}`,
        kind: 'other',
      },
      {
        label: 'Billed to date',
        value: billedValue,
        color: C.blue,
        sub: billingSub,
        kind: 'other',
      },
      ...supplemental,
    ];
  }

  const cap = Math.max(0, Number(co.nte_cap) || 0);
  const hasCap = co.nte_cap != null && Number(co.nte_cap) > 0;
  const used = Math.max(0, financials.nteUsedAmount);
  const percent = cap > 0 ? (used / cap) * 100 : 0;
  const meterColor = percent >= 95 ? C.red : percent >= 80 ? C.amber : C.green;
  return [
    {
      label: 'Actuals / NTE ceiling',
      value: fmtCurrency(used),
      color: meterColor,
      sub: hasCap ? `${percent.toFixed(1)}% of ${fmtCurrency(cap)} authorized ceiling` : 'Ceiling not set',
      kind: 'revenue',
      primary: true,
      meter: { percent, color: meterColor },
      badge: !hasCap
        ? { text: 'Ceiling required', variant: 'watch' }
        : percent >= 100
          ? { text: 'Ceiling reached', variant: 'watch' }
          : percent >= 80
            ? { text: 'Approaching ceiling', variant: 'watch' }
            : { text: 'Within ceiling', variant: 'healthy' },
    },
    {
      label: 'Remaining headroom',
      value: hasCap ? fmtCurrency(Math.max(0, cap - used)) : 'Not set',
      color: meterColor,
      sub: !hasCap ? 'Set a positive ceiling before submission or approval' : percent >= 100 ? 'Request a cap increase before more actuals' : 'Available before the authorized ceiling',
      kind: 'other',
    },
    {
      label: 'Logged hours',
      value: `${hours.toLocaleString('en-US', { maximumFractionDigits: 1 })}h`,
      color: C.blue,
      sub: 'Hourly billing entries visible to your company',
      kind: 'hours',
    },
    {
      label: 'Billed to date',
      value: billedValue,
      color: C.blue,
      sub: `${billingSub}${billingLoaded ? ' · invoices cannot pass the ceiling' : ''}`,
      kind: 'other',
    },
    ...supplemental,
  ];
}

function getLegacyTiles(props: COKPIStripProps, rl: RoleLabels): KPITile[] {
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
        sub: ['approved', 'contracted'].includes(props.co.status)
          ? 'Frozen approval amount · before tax'
          : headlineSub,
        kind: 'revenue',
        primary: true,
      },
    ];


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

    tiles.push({
      label: 'Order margin',
      kind: 'other',
      value: passedToOwner === false ? 'Absorbed' : gcBudget ? fmtCurrency(gcBudget - gcCost) : 'Pending',
      color: gcBudget && gcBudget >= gcCost ? C.green : C.amber,
      sub: gcBudget ? 'Owner price minus order cost' : 'Set your owner price to calculate',
    });
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
    // Use viewer-scoped totals so FC collaborators don't pull TC's mats/eq.
    const ownLaborToUpstream = financials.viewer.ownLaborToUpstream;
    const totalToUpstream = financials.viewer.totalToUpstream;

    const tiles: KPITile[] = [];

    // When the TC prices from crew time but no billable rows exist yet (e.g. the
    // crew submitted the WO directly), fall back to the crew-derived total so the
    // card never reads $0 while the pricing panel shows a real number.
    const myBillable = ownLaborToUpstream > 0
      ? ownLaborToUpstream
      : (isTC && financials.useFcPricingBase ? (props.tcBillableTotal ?? 0) : 0);
    const isApproved = ['approved', 'contracted'].includes(props.co.status);
    const currentRevenue = totalToUpstream > 0 ? totalToUpstream : myBillable;
    const revenue = isApproved && isTC && props.co.approved_amount != null
      ? Number(props.co.approved_amount)
      : currentRevenue;
    tiles.push({
      label: props.crewHandoff ? (props.crewHandoff === 'accepted' ? 'Accepted price' : 'Your price') : isApproved ? 'Approved price' : 'Proposed price',
      value: fmtCurrency(revenue),
      color: 'hsl(var(--primary))',
      kind: 'revenue',
      primary: true,
      sub: isApproved ? 'Frozen approval amount · before tax' : 'Current billable amount · before tax',
      badge: isApproved ? { text: 'Approved', variant: 'healthy' } : myBillable > 0 ? { text: 'Priced', variant: 'healthy' } : { text: 'Awaiting input', variant: 'watch' },
    });

    const privateCost = isTC
      ? financials.tcLaborCostTotal + financials.viewer.ownMaterialsCost + financials.viewer.ownEquipmentCost
      : financials.fcActualCostTotal + financials.viewer.ownMaterialsCost + financials.viewer.ownEquipmentCost;
    const margin = revenue - privateCost;
    tiles.push({
      label: 'Private cost',
      kind: 'cost',
      value: fmtCurrency(privateCost),
      color: C.amber,
      sub: 'Only your company sees this',
    });
    tiles.push({
      label: 'Gross margin',
      kind: 'margin',
      value: privateCost > 0 ? fmtCurrency(margin) : 'Pending',
      color: privateCost > 0 && margin < 0 ? C.red : C.green,
      sub: privateCost > 0 && revenue > 0 ? `${((margin / revenue) * 100).toFixed(1)}% of ${isApproved ? 'approved' : 'proposed'} revenue` : 'Add a private cost to calculate',
      badge: privateCost > 0 ? { text: margin >= 0 ? 'Positive' : 'Over budget', variant: margin >= 0 ? 'healthy' : 'watch' } : undefined,
    });
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

function DesktopTileButton({ tile, onClick }: { tile: KPITile; onClick: () => void }) {
  return (
    <section data-kpi-card={tile.label} className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="h-0.5 shrink-0" style={{ background: tile.color }} />
      <Button
        variant="ghost"
        onClick={onClick}
        aria-label={`View ${tile.label} breakdown`}
        className="h-[78px] w-full min-w-0 flex-col items-start justify-center gap-1 whitespace-normal rounded-none px-3 py-2 text-left hover:bg-accent"
      >
        <span className="flex w-full min-w-0 items-start justify-between gap-1.5">
          <span className="min-w-0 text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground [overflow-wrap:anywhere]">{tile.label}</span>
          <Maximize2 className="mt-0.5 shrink-0 text-muted-foreground" size={11} />
        </span>
        <span className={cn('w-full min-w-0 whitespace-nowrap font-mono font-bold leading-none text-foreground', tile.primary ? 'text-xl' : 'text-lg')}>{tile.value}</span>
        {tile.meter && <span className="w-full"><Bar pct={tile.meter.percent} color={tile.meter.color} /></span>}
      </Button>
    </section>
  );
}

function EditableBudgetTile({ tile, coId, onRefresh, compact = false }: { tile: KPITile; coId: string; onRefresh?: () => void; compact?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
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
    if (compact) setDetailsOpen(true);
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

  const editor = (
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
  );

  if (compact) {
    return (
      <>
        <DesktopTileButton tile={tile} onClick={() => { setEditing(false); setDetailsOpen(true); }} />
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md gap-0 overflow-hidden rounded-2xl p-0">
            <div className="h-1" style={{ background: tile.color }} />
            <DialogHeader className="border-b border-border px-4 py-3 text-left">
              <DialogTitle className="font-heading text-xl">{tile.label}</DialogTitle>
              <DialogDescription>{tile.value}</DialogDescription>
            </DialogHeader>
            {editor}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <KpiCard label={tile.label} value={tile.value} sub={tile.sub ?? tile.label} accent={tile.color}
      icon={<Calculator size={18} />} iconBg={C.surface2} pills={tilePills(tile)}
      headerAction={<Button variant="ghost" size="icon" aria-label={`Edit ${tile.label}`} onClick={open}><Pencil size={14} /></Button>}>
      {editor}
    </KpiCard>
  );
}

function parseMoney(v: string) {
  const n = Number(v.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function Breakdown({ tile, items, financials }: { tile: KPITile; items: COKPIItemBreakdown[]; financials: COFinancials }) {
  const kind = tile.kind ?? 'other';
  if (kind === 'other') return null;
  if (items.length === 0) return <p className="px-4 py-5 text-sm text-muted-foreground">No item-level amounts yet.</p>;
  if (kind === 'progress') {
    return (
      <div className="divide-y divide-border">
        {items.map((it, i) => (
          <div key={it.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <span className="min-w-0 break-words"><span className="mr-2 font-mono text-xs text-muted-foreground">{i + 1}</span>{it.name}</span>
            <span className={it.completed ? 'shrink-0 text-xs font-semibold text-state-approved' : 'shrink-0 text-xs font-semibold text-muted-foreground'}>
              {it.rejected ? 'Rejected · excluded' : it.completed ? 'Completed' : 'Not completed'}
            </span>
          </div>
        ))}
      </div>
    );
  }
  if (kind === 'hours') {
    return (
      <div className="divide-y divide-border">
        {items.map((it, i) => (
          <div key={it.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <span className="min-w-0 break-words"><span className="mr-2 font-mono text-xs text-muted-foreground">{i + 1}</span>{it.name}</span>
            <span className="shrink-0 font-mono font-semibold text-foreground">{it.hours.toLocaleString('en-US', { maximumFractionDigits: 1 })}h</span>
          </div>
        ))}
      </div>
    );
  }
  const amount = (it: COKPIItemBreakdown) => kind === 'revenue' ? it.revenue : kind === 'cost' ? it.cost : it.revenue - it.cost;
  const total = tile.value === 'Pending' ? null : parseMoney(tile.value);
  const itemsSum = items.reduce((s, it) => s + amount(it), 0);
  const materials = kind === 'revenue'
    ? financials.viewer.ownMaterialsTotal
    : kind === 'cost'
      ? financials.viewer.ownMaterialsCost
      : financials.viewer.ownMaterialsTotal - financials.viewer.ownMaterialsCost;
  const equipment = kind === 'revenue'
    ? financials.viewer.ownEquipmentTotal
    : kind === 'cost'
      ? financials.viewer.ownEquipmentCost
      : financials.viewer.ownEquipmentTotal - financials.viewer.ownEquipmentCost;
  const adjustment = total == null ? 0 : total - itemsSum - materials - equipment;
  return (
    <div className="divide-y divide-border">
      {items.map((it, i) => (
        <div key={it.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
          <span className="min-w-0 break-words"><span className="mr-2 font-mono text-xs text-muted-foreground">{i + 1}</span>{it.name}</span>
          <span className="shrink-0 font-mono font-semibold text-foreground">{fmtCurrency(amount(it))}</span>
        </div>
      ))}
      {Math.abs(materials) >= 0.005 && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-muted-foreground">
          <span>Materials</span><span className="shrink-0 font-mono font-semibold">{fmtCurrency(materials)}</span>
        </div>
      )}
      {Math.abs(equipment) >= 0.005 && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-muted-foreground">
          <span>Equipment</span><span className="shrink-0 font-mono font-semibold">{fmtCurrency(equipment)}</span>
        </div>
      )}
      {Math.abs(adjustment) >= 0.005 && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-muted-foreground">
          <span>Approval adjustment</span>
          <span className="shrink-0 font-mono font-semibold">{fmtCurrency(adjustment)}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 bg-muted/40 px-4 py-2.5 text-sm font-bold">
        <span>Total</span>
        <span className="shrink-0 font-mono">{total == null ? 'Pending' : fmtCurrency(total)}</span>
      </div>
    </div>
  );
}

function CompactTile({ tile, items, financials }: { tile: KPITile; items: COKPIItemBreakdown[]; financials: COFinancials }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} aria-label={`View ${tile.label} breakdown`}
        className={cn('h-auto min-w-0 flex-col items-start gap-0.5 whitespace-normal rounded-xl px-3 py-2 text-left', tile.primary && 'col-span-2 py-3')}>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{tile.label}</span>
        <span className={cn('font-mono text-lg font-bold text-foreground', tile.primary && 'text-2xl')}>{tile.value}</span>
        {tile.meter && <span className="mt-1 w-full"><Bar pct={tile.meter.percent} color={tile.meter.color} /></span>}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md gap-0 overflow-hidden rounded-2xl p-0">
          <DialogHeader className="border-b border-border px-4 py-3 pr-12 text-left">
            <DialogTitle className="font-heading text-xl">{tile.label}</DialogTitle>
            {tile.sub && <DialogDescription>{tile.sub}</DialogDescription>}
          </DialogHeader>
          <Breakdown tile={tile} items={items} financials={financials} /> 
          {(tile.kind ?? 'other') === 'other' && <p className="p-4 font-mono text-xl">{tile.value}</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}

function DesktopCompactTile({ tile, items, financials }: { tile: KPITile; items: COKPIItemBreakdown[]; financials: COFinancials }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <DesktopTileButton tile={tile} onClick={() => setOpen(true)} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl p-0">
          <div className="h-1 shrink-0" style={{ background: tile.color }} />
          <DialogHeader className="shrink-0 border-b border-border px-4 pb-3 pt-4 text-left sm:px-6">
            <DialogTitle className="text-[0.7rem] uppercase text-muted-foreground">{tile.label}</DialogTitle>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-3xl font-semibold leading-tight text-foreground">{tile.value}</span>
              {tilePills(tile).map((pill, index) => <Pill key={`${pill.text}-${index}`} type={pill.type}>{pill.text}</Pill>)}
            </div>
            {tile.sub && <DialogDescription className="text-xs text-muted-foreground">{tile.sub}</DialogDescription>}
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto">
            {(tile.kind ?? 'other') !== 'other'
              ? <Breakdown tile={tile} items={items} financials={financials} />
              : <div className="p-4 text-sm text-muted-foreground">{tile.sub}<div className="mt-3 font-mono text-xl text-foreground">{tile.value}</div></div>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function COKPIStrip(props: COKPIStripProps) {
  const rl = useRoleLabelsContext();
  const tiles = getTiles(props, rl);
  const items = props.itemBreakdown ?? [];

  if (props.compact) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {tiles.map(tile => tile.editable
          ? <div key={tile.label} className="col-span-2"><EditableBudgetTile tile={tile} coId={props.co.id} onRefresh={props.onRefresh} /></div>
          : <CompactTile key={tile.label} tile={tile} items={items} financials={props.financials} />)}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-1" aria-label="Order numbers">
      <div className="flex gap-2">
        {tiles.map(tile => (
          <div key={tile.label} className="min-w-[168px] flex-1">
            {tile.editable
              ? <EditableBudgetTile compact tile={tile} coId={props.co.id} onRefresh={props.onRefresh} />
              : <DesktopCompactTile tile={tile} items={items} financials={props.financials} />}
          </div>
        ))}
      </div>
    </div>
  );
}

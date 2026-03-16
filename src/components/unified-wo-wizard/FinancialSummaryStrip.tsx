import { useMemo } from 'react';
import type { UnifiedWizardData } from '@/types/unifiedWizard';

interface FinancialSummaryStripProps {
  data: UnifiedWizardData;
  isTC: boolean;
  isFC: boolean;
}

export function FinancialSummaryStrip({ data, isTC, isFC }: FinancialSummaryStripProps) {
  const totals = useMemo(() => {
    // Labor
    let laborTotal = 0;
    if (data.labor_mode === 'lump_sum') {
      laborTotal = data.lump_sum_amount || 0;
    } else {
      laborTotal = (data.hourly_rate || 0) * (data.hours || 0);
    }

    // Materials
    const matCost = data.materials.reduce((s, m) => s + m.quantity * m.unit_cost, 0);
    const matMarkup = data.materials.reduce((s, m) => s + m.quantity * m.unit_cost * m.markup_percent / 100, 0);
    const matBilled = matCost + matMarkup;

    // Bug #7: Calculate effective average markup from actual rows
    const effectiveMatMarkupPct = matCost > 0 ? (matMarkup / matCost) * 100 : 0;

    // Equipment
    const eqCost = data.equipment.reduce((s, e) => s + e.cost, 0);
    const eqMarkup = data.equipment.reduce((s, e) => s + e.cost * e.markup_percent / 100, 0);
    const eqBilled = eqCost + eqMarkup;
    const effectiveEqMarkupPct = eqCost > 0 ? (eqMarkup / eqCost) * 100 : 0;

    const totalBilled = laborTotal + matBilled + eqBilled;
    const totalCost = laborTotal + matCost + eqCost;
    const margin = totalBilled > 0 ? ((totalBilled - totalCost) / totalBilled) * 100 : 0;

    return { laborTotal, matCost, matMarkup, matBilled, eqCost, eqMarkup, eqBilled, totalBilled, totalCost, margin, effectiveMatMarkupPct, effectiveEqMarkupPct };
  }, [data]);

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const hasAny = totals.totalBilled > 0 || totals.totalCost > 0;
  if (!hasAny) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-sm">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Financial Summary</p>

      {isTC ? (
        <>
          <Row label="Labor" value={fmt(totals.laborTotal)} />
          {totals.matCost > 0 && (
            <>
              <Row label="Materials cost" value={fmt(totals.matCost)} muted />
              <Row label={`Markup (${totals.effectiveMatMarkupPct.toFixed(0)}%)`} value={`+ ${fmt(totals.matMarkup)}`} muted />
              <Row label="Materials billed" value={fmt(totals.matBilled)} />
            </>
          )}
          {totals.eqCost > 0 && (
            <>
              <Row label="Equipment cost" value={fmt(totals.eqCost)} muted />
              <Row label={`Markup (${totals.effectiveEqMarkupPct.toFixed(0)}%)`} value={`+ ${fmt(totals.eqMarkup)}`} muted />
              <Row label="Equipment billed" value={fmt(totals.eqBilled)} />
            </>
          )}
          <div className="border-t border-border my-2" />
          <Row label="Total billed to GC" value={fmt(totals.totalBilled)} bold />
          <Row label="TC total cost" value={fmt(totals.totalCost)} muted />
          <div className="border-t border-border my-1" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Running margin</span>
            <span className={`font-semibold font-barlow-condensed ${
              totals.margin > 0 ? 'text-emerald-600' : totals.margin < 0 ? 'text-destructive' : 'text-primary'
            }`}>
              {totals.margin.toFixed(1)}%
            </span>
          </div>
        </>
      ) : isFC ? (
        <>
          <Row label="Labor" value={fmt(totals.laborTotal)} />
          {totals.matCost > 0 && <Row label="Materials" value={fmt(totals.matCost)} />}
          {totals.eqCost > 0 && <Row label="Equipment" value={fmt(totals.eqCost)} />}
          <div className="border-t border-border my-2" />
          <Row label="Total FC claim" value={fmt(totals.totalCost)} bold />
        </>
      ) : (
        <>
          <Row label="Labor" value={fmt(totals.laborTotal)} />
          {totals.matBilled > 0 && <Row label="Materials" value={fmt(totals.matBilled)} />}
          {totals.eqBilled > 0 && <Row label="Equipment" value={fmt(totals.eqBilled)} />}
          <div className="border-t border-border my-2" />
          <Row label="Total" value={fmt(totals.totalBilled)} bold />
        </>
      )}
    </div>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`${muted ? 'text-xs text-muted-foreground' : 'text-sm text-foreground'}`}>{label}</span>
      <span className={`font-barlow-condensed ${bold ? 'font-bold text-foreground' : muted ? 'text-xs text-muted-foreground' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}

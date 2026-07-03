import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrencyPrecise, formatCurrency } from '@/lib/utils';
import { type SOVLine, type SOVPhase, type BuildingType, SOV_PHASE_LABELS, SOV_PHASE_ORDER, validateSOV } from '@/hooks/useSetupWizardV2';
import { AlertTriangle } from 'lucide-react';

interface Props {
  lines: SOVLine[];
  buildingType?: BuildingType | null;
  /** True for "Other" project types (barn, ADU, TI, etc.) — suppresses
   *  standard-building warnings that don't apply. */
  isNonStandard?: boolean;
}

export function SOVLivePreview({ lines, buildingType, isNonStandard = false }: Props) {
  const { activeLines, ghostLines } = useMemo(() => {
    const active: SOVLine[] = [];
    const ghost: SOVLine[] = [];
    for (const l of lines) (l.byOthers ? ghost : active).push(l);
    return { activeLines: active, ghostLines: ghost };
  }, [lines]);

  const grouped = useMemo(() => {
    const map: Record<SOVPhase, SOVLine[]> = {} as any;
    for (const p of SOV_PHASE_ORDER) map[p] = [];
    for (const l of activeLines) map[l.phase].push(l);
    return map;
  }, [activeLines]);

  const totalLines = activeLines.length;
  const totalValue = useMemo(() => activeLines.reduce((s, l) => s + l.amount, 0), [activeLines]);
  const totalPct = useMemo(() => activeLines.reduce((s, l) => s + l.suggested_pct, 0), [activeLines]);

  const warnings = useMemo(
    () => buildingType ? validateSOV(activeLines, totalValue, buildingType, isNonStandard) : [],
    [activeLines, totalValue, buildingType, isNonStandard],
  );

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border bg-secondary/5">
        <h3 className="font-heading text-sm font-bold text-foreground">
          Schedule of Values Preview
        </h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {totalLines} line item{totalLines !== 1 ? 's' : ''} · {totalValue > 0 ? formatCurrency(totalValue) : 'enter contract value'} · {totalPct.toFixed(1)}%
          {ghostLines.length > 0 && ` · ${ghostLines.length} by others`}
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="px-4 py-2 border-b border-border bg-destructive/5 space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px]">
              <AlertTriangle className={cn('w-3 h-3 shrink-0 mt-0.5', w.severity === 'hard' ? 'text-destructive' : 'text-accent-foreground')} />
              <span className={cn(w.severity === 'hard' ? 'text-destructive' : 'text-accent-foreground')}>
                {w.message}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {SOV_PHASE_ORDER.map((phase) => {
          const phaseLines = grouped[phase];
          const phasePct = phaseLines.reduce((s, l) => s + l.suggested_pct, 0);
          return (
            <div key={phase}>
              <div className="flex items-center gap-2 mb-1.5">
                <h4 className="font-heading text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                  {SOV_PHASE_LABELS[phase]}
                </h4>
                <span className="text-[10px] text-muted-foreground">
                  ({phaseLines.length}) · {phasePct.toFixed(1)}%
                </span>
              </div>

              {phaseLines.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/60 italic pl-2">
                  No items — answer questions to add
                </p>
              ) : (
                <div className="space-y-0.5">
                  {phaseLines.map((line) => (
                    <div
                      key={`${line.phase}-${line.lineNumber}-${line.description}`}
                      className={cn(
                        'flex items-center justify-between px-2.5 py-1.5 rounded text-xs',
                        'animate-in fade-in slide-in-from-left-2 duration-300',
                        'bg-card border border-border/50',
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-muted-foreground font-mono w-5 shrink-0">
                          {line.lineNumber}
                        </span>
                        <span className="truncate text-foreground">{line.description}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-muted-foreground font-mono text-[10px]">
                          {line.suggested_pct.toFixed(1)}%
                        </span>
                        <span className="text-foreground font-mono text-[10px] w-16 text-right">
                          {line.amount > 0 ? formatCurrencyPrecise(line.amount) : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {ghostLines.length > 0 && (
          <details className="pt-2 border-t border-dashed border-border">
            <summary className="cursor-pointer text-[11px] font-heading font-bold text-muted-foreground uppercase tracking-wide hover:text-foreground">
              By others / not in scope ({ghostLines.length})
            </summary>
            <div className="mt-2 space-y-0.5">
              {ghostLines.map((line) => (
                <div
                  key={`ghost-${line.phase}-${line.lineNumber}-${line.description}`}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded text-xs bg-muted/20 border border-dashed border-border/60"
                  title={line.byOthersReason}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-muted-foreground/60 font-mono w-5 shrink-0">—</span>
                    <span className="truncate text-muted-foreground line-through decoration-muted-foreground/40">
                      {line.description}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground/70 shrink-0 ml-2 italic">
                    {line.byOthersReason}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

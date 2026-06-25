import { cn } from '@/lib/utils';
import type { FramingScopeAnswers, MaterialResponsibility } from '@/types/framingScope';
import { DT } from '@/lib/design-tokens';
import { Check, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  answers: FramingScopeAnswers;
  matResp: MaterialResponsibility | null;
  compact?: boolean;
  aiSummary?: string | null;
  onGenerateSummary?: () => void;
  isGenerating?: boolean;
}

function yn(v: string | null | undefined): boolean { return v === 'yes'; }

function SummaryGroup({ label, items }: { label: string; items: { text: string; included: boolean }[] }) {
  const included = items.filter(i => i.included);
  if (included.length === 0) return null;
  return (
    <div className="mb-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.5px] text-muted-foreground mb-1">{label}</p>
      <div className="space-y-0.5">
        {included.map((item, i) => (
          <div key={i} className="flex items-start gap-1.5 text-[11px] text-foreground">
            <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScopeSummaryPanel({ answers, matResp, compact, aiSummary, onGenerateSummary, isGenerating }: Props) {
  const a = answers;

  const methodLabel = a.method.framing_method
    ? a.method.framing_method === 'STICK' ? 'Stick framing' : a.method.framing_method === 'PANELIZED' ? 'Panelized' : 'Hybrid'
    : null;
  const matLabel = matResp === 'LABOR_ONLY' ? 'Labor only' : matResp === 'FURNISH_INSTALL' ? 'Furnish & install' : matResp === 'SPLIT' ? 'Split responsibility' : null;

  return (
    <div className={cn(compact ? '' : 'space-y-1')}>
      {!compact && <h3 className={cn(DT.sectionHeader, 'mb-3')}>Scope Summary</h3>}

      {/* AI Summary Section */}
      {compact && (onGenerateSummary || aiSummary) && (
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.5px] text-primary flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              AI Scope Summary
            </p>
            {onGenerateSummary && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onGenerateSummary}
                disabled={isGenerating}
                className="h-6 px-2 text-[10px] text-primary hover:text-primary"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Generating…
                  </>
                ) : aiSummary ? (
                  <>
                    <Sparkles className="w-3 h-3 mr-1" />
                    Regenerate
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 mr-1" />
                    Generate Summary
                  </>
                )}
              </Button>
            )}
          </div>
          {isGenerating && !aiSummary ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating scope summary…
            </div>
          ) : aiSummary ? (
            <p className="text-sm text-foreground leading-relaxed">{aiSummary}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Click "Generate Summary" to create an AI-powered plain-English description of your framing scope.
            </p>
          )}
        </div>
      )}

      <div className={cn(compact ? 'grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2' : '')}>

      <SummaryGroup label="FRAMING METHOD" items={[
        { text: methodLabel || '—', included: !!methodLabel },
        { text: matLabel || '—', included: !!matLabel },
        ...(yn(a.method.mobilization) ? [{ text: `Mobilization ${a.method.mobilization_percent ?? 5}%`, included: true }] : []),
      ]} />

      <SummaryGroup label="BUILDING FEATURES" items={[
        { text: 'Wood stairs', included: yn(a.structure.wood_stairs) },
        { text: 'Elevator shaft', included: yn(a.structure.elevator_shaft) },
        { text: 'Enclosed corridors', included: yn(a.structure.enclosed_corridors) },
        { text: 'Balconies', included: yn(a.structure.balconies) },
        { text: 'Tuck-under garages', included: yn(a.structure.tuck_under_garages) },
      ]} />

      <SummaryGroup label="STRUCTURAL STEEL" items={[
        { text: 'Steel columns', included: yn(a.steel?.steel_columns) },
        { text: 'Steel beams', included: yn(a.steel?.steel_beams) },
        { text: 'Moment frames', included: yn(a.steel?.moment_frames) },
        { text: 'Steel decking', included: yn(a.steel?.steel_decking) },
        { text: 'Fireproofing', included: yn(a.steel?.fireproofing) },
      ]} />

      <SummaryGroup label="EXTERIOR SKIN" items={[
        { text: a.sheathing.wall_sheathing_type || 'Wall sheathing', included: yn(a.sheathing.wall_sheathing_install) || !!a.sheathing.wall_sheathing_type },
        { text: 'Roof sheathing', included: yn(a.sheathing.roof_sheathing) },
        { text: 'Roof dry-in', included: yn(a.sheathing.roof_underlayment) },
        { text: 'Rough fascia', included: yn(a.exterior.rough_fascia) },
        { text: 'Finished fascia', included: yn(a.exterior.finished_fascia) },
        { text: 'Finished soffit', included: yn(a.exterior.finished_soffit) },
      ]} />

      {yn(a.siding.siding_in_scope) && (
        <SummaryGroup label="SIDING" items={[
          { text: `${a.siding.siding_types.length} type(s) in scope`, included: true },
          { text: 'Window trim', included: yn(a.siding.window_trim) },
          { text: 'Corner treatment', included: yn(a.siding.corner_treatment) },
        ]} />
      )}

      <SummaryGroup label="OPENINGS" items={[
        { text: `Windows: ${a.openings.window_mode?.replace('_', ' ') || '—'}`, included: a.openings.window_mode !== 'NOT_IN_SCOPE' && !!a.openings.window_mode },
        { text: `Ext. doors: ${a.openings.ext_door_mode?.replace('_', ' ') || '—'}`, included: a.openings.ext_door_mode !== 'NOT_IN_SCOPE' && !!a.openings.ext_door_mode },
      ]} />

      <SummaryGroup label="BLOCKING" items={[
        { text: 'Back-out framing', included: yn(a.blocking.backout) },
      ]} />

      <SummaryGroup label="FIRE SEPARATION" items={[
        { text: 'Fire blocking', included: yn(a.fire.fire_blocking) },
        { text: 'Demising walls', included: yn(a.fire.demising_walls) },
      ]} />

      <SummaryGroup label="HARDWARE" items={[
        { text: 'Structural connectors', included: yn(a.hardware.structural_connectors) },
      ]} />

      <SummaryGroup label="SITE" items={[
        { text: 'Daily cleanup', included: yn(a.cleanup.daily_cleanup) },
        { text: a.cleanup.warranty ? `Warranty: ${a.cleanup.warranty}` : 'Warranty', included: !!a.cleanup.warranty },
      ]} />
      </div>
    </div>
  );
}

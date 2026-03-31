import { cn } from '@/lib/utils';
import type { FramingScopeAnswers, MaterialResponsibility } from '@/types/framingScope';
import { DT } from '@/lib/design-tokens';
import { Copy, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  answers: FramingScopeAnswers;
  matResp: MaterialResponsibility | null;
  projectName?: string;
  buildingType?: string;
}

type Badge = 'INCLUDED' | 'EXCLUDED' | 'GFCI' | 'CFCI' | 'LABOR_INSTALL';

function ScopeBadge({ type }: { type: Badge }) {
  const styles: Record<Badge, string> = {
    INCLUDED: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
    EXCLUDED: 'bg-red-500/10 text-red-600 border-red-400/30',
    GFCI: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
    CFCI: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
    LABOR_INSTALL: 'bg-violet-500/10 text-violet-700 border-violet-500/30',
  };
  return (
    <span className={cn('px-1.5 py-0.5 text-[9px] font-bold rounded border', styles[type])}>
      {type.replace('_', ' ')}
    </span>
  );
}

function DocLine({ label, included, badge: badgeType, bold }: { label: string; included: boolean; badge?: Badge; bold?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between py-1 text-sm', !included && 'opacity-60')}>
      <span className={cn(!included && 'line-through italic font-semibold', bold && 'font-semibold')}>{label}</span>
      {badgeType && <ScopeBadge type={badgeType} />}
    </div>
  );
}

function yn(val: string | null | undefined): boolean { return val === 'yes'; }

export function ScopeDocument({ answers, matResp, projectName, buildingType }: Props) {
  const a = answers;

  const generateText = () => {
    // Simplified plain-text for clipboard
    const lines: string[] = [
      'DIVISION 06100 — ROUGH CARPENTRY SCOPE OF WORK',
      `Project: ${projectName || 'Untitled'}`,
      `Building Type: ${buildingType || 'N/A'}`,
      `Material Responsibility: ${matResp || 'N/A'}`,
      '',
    ];
    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateText());
    toast.success('Scope copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="font-heading text-xl font-black tracking-tight" style={DT.heading}>
          Division 06100 — Rough Carpentry Scope of Work
        </h1>
        <div className="flex gap-4 text-xs text-muted-foreground mt-1" style={DT.mono}>
          <span>{projectName}</span>
          <span>{buildingType}</span>
          <span>{matResp?.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy to clipboard
        </Button>
        <Button variant="outline" size="sm" disabled>
          <FileText className="w-3.5 h-3.5 mr-1.5" /> Export PDF
        </Button>
      </div>

      {/* Section 1 */}
      <div>
        <h3 className="font-heading font-bold text-sm mb-2" style={DT.heading}>1. Framing Method & Material Responsibility</h3>
        <DocLine label={`Framing: ${a.method.framing_method || '—'}`} included badge="INCLUDED" />
        <DocLine label={`Materials: ${matResp?.replace('_', ' ') || '—'}`} included badge={matResp === 'LABOR_ONLY' ? 'LABOR_INSTALL' : matResp === 'FURNISH_INSTALL' ? 'CFCI' : 'INCLUDED'} />
        {yn(a.method.mobilization) && <DocLine label={`Mobilization: ${a.method.mobilization_percent ?? 5}%`} included badge="INCLUDED" />}
      </div>

      {/* Section 2 */}
      <div>
        <h3 className="font-heading font-bold text-sm mb-2" style={DT.heading}>2. Building Features</h3>
        <DocLine label="Wood stairs" included={yn(a.structure.wood_stairs)} badge={yn(a.structure.wood_stairs) ? 'INCLUDED' : 'EXCLUDED'} />
        <DocLine label="Elevator shaft" included={yn(a.structure.elevator_shaft)} badge={yn(a.structure.elevator_shaft) ? 'INCLUDED' : 'EXCLUDED'} />
        <DocLine label="Enclosed corridors" included={yn(a.structure.enclosed_corridors)} badge={yn(a.structure.enclosed_corridors) ? 'INCLUDED' : 'EXCLUDED'} />
        <DocLine label="Balconies" included={yn(a.structure.balconies)} badge={yn(a.structure.balconies) ? 'INCLUDED' : 'EXCLUDED'} />
        <DocLine label="Tuck-under garages" included={yn(a.structure.tuck_under_garages)} badge={yn(a.structure.tuck_under_garages) ? 'INCLUDED' : 'EXCLUDED'} />
      </div>

      {/* Section 3 */}
      <div>
        <h3 className="font-heading font-bold text-sm mb-2" style={DT.heading}>3. Sheathing & WRB</h3>
        <DocLine label={`Wall sheathing${a.sheathing.wall_sheathing_type ? ': ' + a.sheathing.wall_sheathing_type : ''}`} included={yn(a.sheathing.wall_sheathing_install) || !!a.sheathing.wall_sheathing_type} badge={yn(a.sheathing.wall_sheathing_install) || a.sheathing.wall_sheathing_type ? (matResp === 'LABOR_ONLY' ? 'GFCI' : 'CFCI') : 'EXCLUDED'} />
        <DocLine label="Roof sheathing" included={yn(a.sheathing.roof_sheathing)} badge={yn(a.sheathing.roof_sheathing) ? 'INCLUDED' : 'EXCLUDED'} />
        <DocLine label="Roof dry-in" included={yn(a.sheathing.roof_underlayment)} badge={yn(a.sheathing.roof_underlayment) ? 'INCLUDED' : 'EXCLUDED'} />
      </div>

      {/* Section 5 */}
      <div>
        <h3 className="font-heading font-bold text-sm mb-2" style={DT.heading}>5. Siding & Cladding</h3>
        {yn(a.siding.siding_in_scope) ? (
          <>
            <DocLine label={`Siding types: ${a.siding.siding_types.join(', ') || '—'}`} included badge="INCLUDED" />
            <DocLine label="Window trim" included={yn(a.siding.window_trim)} badge={yn(a.siding.window_trim) ? 'INCLUDED' : 'EXCLUDED'} />
            <DocLine label="Corner treatment" included={yn(a.siding.corner_treatment)} badge={yn(a.siding.corner_treatment) ? 'INCLUDED' : 'EXCLUDED'} />
          </>
        ) : (
          <DocLine label="Siding — by others" included={false} badge="EXCLUDED" bold />
        )}
      </div>

      {/* Section 6 */}
      <div>
        <h3 className="font-heading font-bold text-sm mb-2" style={DT.heading}>6. Openings</h3>
        <DocLine label={`Windows: ${a.openings.window_mode || '—'}`} included={a.openings.window_mode !== 'NOT_IN_SCOPE'} badge={a.openings.window_mode === 'GFCI' ? 'GFCI' : a.openings.window_mode === 'CFCI' ? 'CFCI' : 'EXCLUDED'} />
        <DocLine label={`Ext. doors: ${a.openings.ext_door_mode || '—'}`} included={a.openings.ext_door_mode !== 'NOT_IN_SCOPE'} badge={a.openings.ext_door_mode === 'GFCI' ? 'GFCI' : 'EXCLUDED'} />
      </div>

      {/* Section 7-8 */}
      <div>
        <h3 className="font-heading font-bold text-sm mb-2" style={DT.heading}>7–8. Blocking & Fire</h3>
        <DocLine label="Back-out framing" included={yn(a.blocking.backout)} badge={yn(a.blocking.backout) ? 'INCLUDED' : 'EXCLUDED'} />
        <DocLine label="Fire blocking" included={yn(a.fire.fire_blocking)} badge={yn(a.fire.fire_blocking) ? 'INCLUDED' : 'EXCLUDED'} />
        <DocLine label="Demising walls" included={yn(a.fire.demising_walls)} badge={yn(a.fire.demising_walls) ? 'INCLUDED' : 'EXCLUDED'} />
      </div>

      {/* Footer */}
      <div className="border-t border-border pt-4 text-xs text-muted-foreground italic" style={DT.mono}>
        All work per contract documents, applicable building codes, manufacturer installation
        requirements, and OSHA safety standards. Scope excludes any item not explicitly listed
        as included herein.
      </div>
    </div>
  );
}

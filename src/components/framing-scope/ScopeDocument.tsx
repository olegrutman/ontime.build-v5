import { cn } from '@/lib/utils';
import type { FramingScopeAnswers, MaterialResponsibility } from '@/types/framingScope';
import { DT } from '@/lib/design-tokens';
import { Copy, FileText, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  answers: FramingScopeAnswers;
  matResp: MaterialResponsibility | null;
  projectName?: string;
  buildingType?: string;
  inc?: number;
  exc?: number;
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
    <span className={cn('px-1.5 py-0.5 text-[9px] font-bold rounded border whitespace-nowrap', styles[type])}>
      {type.replace('_', ' ')}
    </span>
  );
}

function DocLine({ label, detail, included, badge: badgeType }: { label: string; detail?: string; included: boolean; badge?: Badge }) {
  return (
    <div className={cn('flex items-start justify-between py-1.5 text-sm gap-2', !included && 'opacity-50')}>
      <div className="flex items-start gap-2 min-w-0">
        {included ? (
          <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
        ) : (
          <X className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
        )}
        <div className="min-w-0">
          <span className={cn(!included && 'line-through italic font-semibold')}>{label}</span>
          {detail && <p className="text-[11px] text-muted-foreground mt-0.5">{detail}</p>}
        </div>
      </div>
      {badgeType && <ScopeBadge type={badgeType} />}
    </div>
  );
}

function yn(val: string | null | undefined): boolean { return val === 'yes'; }

const BUILDING_LABELS: Record<string, string> = {
  SFR: 'Single Family Residential',
  TOWNHOMES: 'Townhomes',
  MULTI_FAMILY: 'Multifamily',
  HOTEL: 'Hotel / Hospitality',
  COMMERCIAL: 'Commercial / Mixed-Use',
};

export function ScopeDocument({ answers, matResp, projectName, buildingType, inc = 0, exc = 0 }: Props) {
  const a = answers;

  const generateText = () => {
    const lines: string[] = [
      'DIVISION 06100 — ROUGH CARPENTRY SCOPE OF WORK',
      `Project: ${projectName || 'Untitled'}`,
      `Building Type: ${BUILDING_LABELS[buildingType || 'SFR'] || buildingType || 'N/A'}`,
      `Material Responsibility: ${matResp || 'N/A'}`,
      '',
    ];
    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateText());
    toast.success('Scope copied to clipboard');
  };

  const matRespLabel = matResp === 'LABOR_ONLY' ? 'Labor only (GC furnishes all materials)'
    : matResp === 'FURNISH_INSTALL' ? 'Furnish & install (contractor supplies all materials)'
    : matResp === 'SPLIT' ? 'Split responsibility (negotiated per category)'
    : '—';

  const framingLabel = a.method.framing_method === 'STICK' ? 'Stick framing'
    : a.method.framing_method === 'PANELIZED' ? 'Panelized framing'
    : a.method.framing_method === 'HYBRID' ? 'Hybrid framing'
    : '—';

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="rounded-lg overflow-hidden">
        <div className="bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-amber-600/5 border border-amber-500/20 p-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-2" style={DT.mono}>
            SCOPE DOCUMENT
          </p>
          <h1 className="font-heading text-xl font-black tracking-tight text-foreground" style={DT.heading}>
            Division 06100 — Rough Carpentry Scope of Work
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2" style={DT.mono}>
            <span>{projectName || 'Untitled Project'}</span>
            <span>{BUILDING_LABELS[buildingType || 'SFR'] || buildingType}</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            {inc > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
                {inc} included
              </span>
            )}
            {exc > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-500/10 text-red-600 border border-red-400/30">
                {exc} excluded
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">
            This is your official scope of work document. Review carefully before attaching to a contract or proposal.
          </p>
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
      <DocSection title="1. Framing Method & Material Responsibility">
        <DocLine label={framingLabel} detail={matRespLabel} included badge="INCLUDED" />
        {yn(a.method.mobilization) && <DocLine label={`Mobilization: ${a.method.mobilization_percent ?? 5}%`} detail="Billed as separate SOV line item" included badge="INCLUDED" />}
      </DocSection>

      {/* Section 2 */}
      <DocSection title="2. Building Features">
        <DocLine label="Wood stairs" detail={yn(a.structure.wood_stairs) ? 'Stringers, landings, rough structure' : undefined} included={yn(a.structure.wood_stairs)} badge={yn(a.structure.wood_stairs) ? 'INCLUDED' : 'EXCLUDED'} />
        <DocLine label="Elevator shaft" included={yn(a.structure.elevator_shaft)} badge={yn(a.structure.elevator_shaft) ? 'INCLUDED' : 'EXCLUDED'} />
        <DocLine label="Enclosed corridors" included={yn(a.structure.enclosed_corridors)} badge={yn(a.structure.enclosed_corridors) ? 'INCLUDED' : 'EXCLUDED'} />
        <DocLine label="Balconies" detail={yn(a.structure.balconies) && a.structure.balcony_type ? a.structure.balcony_type.replace('_', ' ').toLowerCase() : undefined} included={yn(a.structure.balconies)} badge={yn(a.structure.balconies) ? 'INCLUDED' : 'EXCLUDED'} />
        <DocLine label="Tuck-under garages" included={yn(a.structure.tuck_under_garages)} badge={yn(a.structure.tuck_under_garages) ? 'INCLUDED' : 'EXCLUDED'} />
      </DocSection>

      {/* Section 3 — Structural Steel */}
      <DocSection title="3. Structural Steel">
        <DocLine label="Steel columns" detail={yn(a.steel?.steel_columns) && a.steel?.steel_column_type ? a.steel.steel_column_type.replace(/_/g, ' ') : undefined} included={yn(a.steel?.steel_columns)} badge={yn(a.steel?.steel_columns) ? 'INCLUDED' : 'EXCLUDED'} />
        <DocLine label="Steel beams" detail={yn(a.steel?.steel_beams) && a.steel?.beam_type ? a.steel.beam_type.replace(/_/g, ' ') : undefined} included={yn(a.steel?.steel_beams)} badge={yn(a.steel?.steel_beams) ? 'INCLUDED' : 'EXCLUDED'} />
        <DocLine label="Steel posts" included={yn(a.steel?.steel_posts)} badge={yn(a.steel?.steel_posts) ? 'INCLUDED' : 'EXCLUDED'} />
        <DocLine label="Lintels" detail={yn(a.steel?.lintels) && a.steel?.lintel_type ? a.steel.lintel_type.replace(/_/g, ' ') : undefined} included={yn(a.steel?.lintels)} badge={yn(a.steel?.lintels) ? 'INCLUDED' : 'EXCLUDED'} />
        {yn(a.steel?.moment_frames) && <DocLine label="Moment frames" detail={a.steel?.moment_frame_connections?.replace(/_/g, ' ') || undefined} included badge="INCLUDED" />}
        {yn(a.steel?.steel_decking) && <DocLine label="Steel decking" detail={a.steel?.decking_gauge || undefined} included badge="INCLUDED" />}
        {yn(a.steel?.shear_plates) && <DocLine label="Shear / transfer plates" included badge="INCLUDED" />}
        {yn(a.steel?.embed_plates) && <DocLine label="Embed plates" included badge="INCLUDED" />}
        {yn(a.steel?.steel_stairs) && <DocLine label="Steel stairs" included badge="INCLUDED" />}
        {yn(a.steel?.steel_railings) && <DocLine label="Steel railings" included badge="INCLUDED" />}
        {yn(a.steel?.fireproofing) && <DocLine label="Fireproofing" detail={a.steel?.fireproofing_type?.replace(/_/g, ' ') || undefined} included badge="INCLUDED" />}
        {yn(a.steel?.touch_up_paint) && <DocLine label="Touch-up paint" included badge="INCLUDED" />}
      </DocSection>

      {/* Section 4 */}
      <DocSection title="4. Sheathing & WRB">
        <DocLine
          label={`Wall sheathing${a.sheathing.wall_sheathing_type ? ': ' + a.sheathing.wall_sheathing_type : ''}`}
          detail={matResp === 'LABOR_ONLY' ? 'GC-furnished, contractor-installed' : undefined}
          included={yn(a.sheathing.wall_sheathing_install) || !!a.sheathing.wall_sheathing_type}
          badge={yn(a.sheathing.wall_sheathing_install) || a.sheathing.wall_sheathing_type ? (matResp === 'LABOR_ONLY' ? 'GFCI' : 'CFCI') : 'EXCLUDED'}
        />
        <DocLine label="Roof sheathing" included={yn(a.sheathing.roof_sheathing)} badge={yn(a.sheathing.roof_sheathing) ? 'INCLUDED' : 'EXCLUDED'} />
        <DocLine label="Roof dry-in" detail={a.sheathing.roof_underlayment_type || undefined} included={yn(a.sheathing.roof_underlayment)} badge={yn(a.sheathing.roof_underlayment) ? 'INCLUDED' : 'EXCLUDED'} />
      </DocSection>

      {/* Section 4 */}
      <DocSection title="4. Fascia, Soffit & Exterior Trim">
        <DocLine label="Rough fascia & eave framing" included={yn(a.exterior.rough_fascia)} badge={yn(a.exterior.rough_fascia) ? 'INCLUDED' : 'EXCLUDED'} />
        <DocLine label="Finished fascia" detail={a.exterior.finished_fascia_material || undefined} included={yn(a.exterior.finished_fascia)} badge={yn(a.exterior.finished_fascia) ? (matResp === 'LABOR_ONLY' ? 'GFCI' : 'CFCI') : 'EXCLUDED'} />
        <DocLine label="Finished soffit" detail={a.exterior.finished_soffit_material || undefined} included={yn(a.exterior.finished_soffit)} badge={yn(a.exterior.finished_soffit) ? (matResp === 'LABOR_ONLY' ? 'GFCI' : 'CFCI') : 'EXCLUDED'} />
      </DocSection>

      {/* Section 5 */}
      <DocSection title="5. Siding & Cladding">
        {yn(a.siding.siding_in_scope) ? (
          <>
            <DocLine label={`Siding types: ${a.siding.siding_types.join(', ') || '—'}`} included badge="INCLUDED" />
            <DocLine label="Window trim" included={yn(a.siding.window_trim)} badge={yn(a.siding.window_trim) ? 'INCLUDED' : 'EXCLUDED'} />
            <DocLine label="Corner treatment" included={yn(a.siding.corner_treatment)} badge={yn(a.siding.corner_treatment) ? 'INCLUDED' : 'EXCLUDED'} />
          </>
        ) : (
          <DocLine label="Siding & cladding — by others" included={false} badge="EXCLUDED" />
        )}
      </DocSection>

      {/* Section 6 */}
      <DocSection title="6. Openings">
        <DocLine label={`Windows: ${a.openings.window_mode?.replace(/_/g, ' ') || '—'}`} detail={a.openings.window_mode === 'GFCI' ? 'GC-furnished, contractor-installed' : undefined} included={a.openings.window_mode !== 'NOT_IN_SCOPE' && !!a.openings.window_mode} badge={a.openings.window_mode === 'GFCI' ? 'GFCI' : a.openings.window_mode === 'CFCI' ? 'CFCI' : 'EXCLUDED'} />
        <DocLine label={`Ext. doors: ${a.openings.ext_door_mode?.replace(/_/g, ' ') || '—'}`} included={a.openings.ext_door_mode !== 'NOT_IN_SCOPE' && !!a.openings.ext_door_mode} badge={a.openings.ext_door_mode === 'GFCI' ? 'GFCI' : 'EXCLUDED'} />
      </DocSection>

      {/* Section 7-8 */}
      <DocSection title="7–8. Blocking & Fire Separation">
        <DocLine label="Back-out framing" detail={yn(a.blocking.backout) && a.blocking.backout_pricing ? `Pricing: ${a.blocking.backout_pricing}` : undefined} included={yn(a.blocking.backout)} badge={yn(a.blocking.backout) ? 'INCLUDED' : 'EXCLUDED'} />
        <DocLine label="Fire blocking (IBC 718)" included={yn(a.fire.fire_blocking)} badge={yn(a.fire.fire_blocking) ? 'INCLUDED' : 'EXCLUDED'} />
        <DocLine label="Demising / party walls" detail={a.fire.demising_type?.replace(/_/g, ' ') || undefined} included={yn(a.fire.demising_walls)} badge={yn(a.fire.demising_walls) ? 'INCLUDED' : 'EXCLUDED'} />
      </DocSection>

      {/* Section 9 */}
      <DocSection title="9. Hardware & Connectors">
        <DocLine label="Structural connectors" detail={matResp === 'LABOR_ONLY' ? 'Install GC-supplied' : 'Furnished & installed'} included={yn(a.hardware.structural_connectors)} badge={yn(a.hardware.structural_connectors) ? (matResp === 'LABOR_ONLY' ? 'GFCI' : 'INCLUDED') : 'EXCLUDED'} />
        <DocLine label="Anchor bolts & mudsill" included={yn(a.hardware.anchor_bolts)} badge={yn(a.hardware.anchor_bolts) ? 'INCLUDED' : 'EXCLUDED'} />
      </DocSection>

      {/* Section 10-11 */}
      <DocSection title="10–11. Site, Cleanup & Warranty">
        <DocLine label="Daily cleanup" included={yn(a.cleanup.daily_cleanup)} badge={yn(a.cleanup.daily_cleanup) ? 'INCLUDED' : 'EXCLUDED'} />
        <DocLine label="Frame walk corrections" included={yn(a.cleanup.frame_walk)} badge={yn(a.cleanup.frame_walk) ? 'INCLUDED' : 'EXCLUDED'} />
        <DocLine label={`Warranty: ${a.cleanup.warranty || '—'}`} included={!!a.cleanup.warranty} badge={a.cleanup.warranty ? 'INCLUDED' : 'EXCLUDED'} />
      </DocSection>

      {/* Footer */}
      <div className="border-t border-border pt-4 text-xs text-muted-foreground italic" style={DT.mono}>
        All work per contract documents, applicable building codes, manufacturer installation
        requirements, and OSHA safety standards. Scope excludes any item not explicitly listed
        as included herein.
      </div>
    </div>
  );
}

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-heading font-bold text-sm mb-1 pb-1 border-b border-border" style={DT.heading}>{title}</h3>
      <div className="divide-y divide-border/50">{children}</div>
    </div>
  );
}

import { cn } from '@/lib/utils';
import type { FramingScopeAnswers, MaterialResponsibility } from '@/types/framingScope';
import { SECTIONS } from '@/types/framingScope';
import { DT } from '@/lib/design-tokens';

interface Props {
  answers: FramingScopeAnswers;
  matResp: MaterialResponsibility | null;
}

function badge(val: string | null | undefined, yesLabel = 'IN', noLabel = 'EX') {
  if (val === 'yes') return <span className="text-[10px] font-semibold text-emerald-600">{yesLabel}</span>;
  if (val === 'no') return <span className="text-[10px] font-semibold text-red-500 line-through">{noLabel}</span>;
  return <span className="text-[10px] text-muted-foreground">—</span>;
}

function SummaryRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between text-xs py-0.5">
      <span className={cn(value === 'no' && 'text-muted-foreground line-through')}>{label}</span>
      {badge(value)}
    </div>
  );
}

export function ScopeSummaryPanel({ answers }: Props) {
  const a = answers;

  return (
    <div className="space-y-4">
      <h3 className={cn(DT.sectionHeader, 'mb-2')}>Live Scope Summary</h3>

      {/* Section 1 */}
      <div>
        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">1. Method</p>
        <div className="text-xs text-foreground">
          {a.method.material_responsibility ? a.method.material_responsibility.replace('_', ' ') : '—'}
          {a.method.framing_method && ` · ${a.method.framing_method}`}
        </div>
      </div>

      {/* Section 2 */}
      <div>
        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">2. Structure</p>
        <SummaryRow label="Stairs" value={a.structure.wood_stairs} />
        <SummaryRow label="Elevator" value={a.structure.elevator_shaft} />
        <SummaryRow label="Corridors" value={a.structure.enclosed_corridors} />
        <SummaryRow label="Balconies" value={a.structure.balconies} />
        <SummaryRow label="Garages" value={a.structure.tuck_under_garages} />
      </div>

      {/* Section 3 */}
      <div>
        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">3. Sheathing</p>
        <SummaryRow label="Wall sheathing" value={a.sheathing.wall_sheathing_install || (a.sheathing.wall_sheathing_type ? 'yes' : null)} />
        <SummaryRow label="Roof sheathing" value={a.sheathing.roof_sheathing} />
        <SummaryRow label="Roof dry-in" value={a.sheathing.roof_underlayment} />
      </div>

      {/* Section 4 */}
      <div>
        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">4. Fascia/Soffit</p>
        <SummaryRow label="Rough fascia" value={a.exterior.rough_fascia} />
        <SummaryRow label="Finished fascia" value={a.exterior.finished_fascia} />
        <SummaryRow label="Finished soffit" value={a.exterior.finished_soffit} />
      </div>

      {/* Section 5 */}
      <div>
        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">5. Siding</p>
        <SummaryRow label="Siding" value={a.siding.siding_in_scope} />
        {a.siding.siding_types.length > 0 && (
          <p className="text-[10px] text-muted-foreground">{a.siding.siding_types.length} type(s)</p>
        )}
      </div>

      {/* Section 6 */}
      <div>
        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">6. Openings</p>
        <div className="text-xs">{a.openings.window_mode ?? '—'}</div>
      </div>

      {/* Section 7 */}
      <div>
        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">7. Blocking</p>
        <SummaryRow label="Back-out" value={a.blocking.backout} />
      </div>

      {/* Section 8 */}
      <div>
        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">8. Fire</p>
        <SummaryRow label="Fire blocking" value={a.fire.fire_blocking} />
        <SummaryRow label="Demising walls" value={a.fire.demising_walls} />
      </div>

      {/* Sections 9-11 */}
      <div>
        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">9–11. Hardware / Dry-in / Cleanup</p>
        <SummaryRow label="Connectors" value={a.hardware.structural_connectors} />
        <SummaryRow label="Cleanup" value={a.cleanup.daily_cleanup} />
        <SummaryRow label="Warranty" value={a.cleanup.warranty ? 'yes' : null} />
      </div>
    </div>
  );
}

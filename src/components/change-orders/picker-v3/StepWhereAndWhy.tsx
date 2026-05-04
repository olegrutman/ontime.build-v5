import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PickerState, PickerAction, SystemOption, CauseOption } from './types';
import type { COReasonCode } from '@/types/changeOrder';

interface StepWhereAndWhyProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
  projectId: string;
}

// ── Location data ─────────────────────────────────────────────────
const FALLBACK_LOCATIONS = [
  { id: 'l1', icon: '🏢', label: 'Level 1', sub: 'Ground floor' },
  { id: 'l2', icon: '🏢', label: 'Level 2', sub: 'Second floor' },
  { id: 'l3', icon: '🏗', label: 'Exterior', sub: 'Building exterior' },
  { id: 'l6', icon: '⊞', label: 'Other / Custom', sub: 'Specify location' },
];

const SYSTEMS: SystemOption[] = [
  { id: 'floor', icon: '▭', label: 'Floor System', sub: 'Joists, subfloor, beams' },
  { id: 'wall', icon: '▮', label: 'Wall System', sub: 'Framing, sheathing' },
  { id: 'roof', icon: '◭', label: 'Roof System', sub: 'Rafters, ridge, sheathing' },
  { id: 'ceiling', icon: '▱', label: 'Ceiling System', sub: 'Joists, drops, soffits' },
  { id: 'exterior', icon: '◫', label: 'Exterior Envelope', sub: 'Siding, WRB, flashing' },
  { id: 'openings', icon: '⊟', label: 'Openings', sub: 'Windows, doors, ROs' },
  { id: 'deck', icon: '▥', label: 'Deck / Balcony', sub: 'Joists, decking' },
  { id: 'stair', icon: '⊿', label: 'Stair', sub: 'Stringers, treads' },
  { id: 'other', icon: '⊞', label: 'Other', sub: 'Specify system' },
];

function buildLocations(scope: any): { id: string; icon: string; label: string; sub: string }[] {
  if (!scope) return FALLBACK_LOCATIONS;
  const locs: { id: string; icon: string; label: string; sub: string }[] = [];
  const floors = scope.floors ?? scope.stories ?? 1;
  const numBuildings = scope.num_buildings ?? 1;
  for (let f = 1; f <= Math.min(floors, 8); f++) {
    locs.push({ id: `floor-${f}`, icon: '🏢', label: `Level ${f}`, sub: f === 1 ? 'Ground floor' : `Floor ${f}` });
  }
  if (scope.foundation_type === 'basement' || scope.basement_type) {
    locs.push({ id: 'basement', icon: '⬇', label: 'Basement', sub: scope.basement_type ?? 'Below grade' });
  }
  if (scope.roof_type) {
    locs.push({ id: 'roof', icon: '△', label: 'Roof', sub: scope.roof_type });
  }
  locs.push({ id: 'exterior', icon: '🏗', label: 'Exterior', sub: 'Building exterior' });
  if (numBuildings > 1) {
    for (let b = 2; b <= Math.min(numBuildings, 6); b++) {
      locs.push({ id: `bldg-${b}`, icon: '🏠', label: `Building ${b}`, sub: `Structure ${b}` });
    }
  }
  if (scope.has_balconies) locs.push({ id: 'balcony', icon: '▥', label: 'Balcony', sub: scope.balcony_type ?? 'Exterior platform' });
  if (scope.decking_included) locs.push({ id: 'deck', icon: '▥', label: 'Deck', sub: scope.decking_type ?? 'Exterior deck' });
  locs.push({ id: 'other', icon: '⊞', label: 'Other / Custom', sub: 'Specify location' });
  return locs;
}

// ── Cause data ────────────────────────────────────────────────────
const CAUSES: { group: string; groupColor: string; groupLabel: string; groupMeta: string; items: CauseOption[] }[] = [
  {
    group: 'conflict', groupColor: 'bg-blue-600',
    groupLabel: 'Someone else changed something', groupMeta: '→ usually a Change Order, billable',
    items: [
      { id: 'mech', group: 'conflict', icon: '🔧', label: 'Mechanical Conflict', sub: 'HVAC needs clearance', docType: 'CO', billable: 'yes', suggested: true, reason: 'gc_request' as COReasonCode },
      { id: 'plumb', group: 'conflict', icon: '💧', label: 'Plumbing Conflict', sub: 'Waste / supply routing', docType: 'CO', billable: 'yes', reason: 'gc_request' as COReasonCode },
      { id: 'elec', group: 'conflict', icon: '⚡', label: 'Electrical Conflict', sub: 'Panel, conduit, fixture', docType: 'CO', billable: 'yes', reason: 'gc_request' as COReasonCode },
      { id: 'gc', group: 'conflict', icon: '📋', label: 'GC Request', sub: 'Field directive from GC', docType: 'CO', billable: 'yes', reason: 'gc_request' as COReasonCode },
      { id: 'plan', group: 'conflict', icon: '📐', label: 'Plan Revision', sub: 'Architect / engineer change', docType: 'CO', billable: 'yes', reason: 'design_change' as COReasonCode },
      { id: 'unfor', group: 'conflict', icon: '❓', label: 'Unforeseen Condition', sub: 'Hidden damage, existing', docType: 'CO', billable: 'yes', reason: 'other' as COReasonCode },
    ],
  },
  {
    group: 'site_issue', groupColor: 'bg-yellow-600',
    groupLabel: 'Something on site went wrong', groupMeta: '→ usually a Work Order, sometimes backcharge',
    items: [
      { id: 'dmg', group: 'site_issue', icon: '⚠', label: 'Damaged Work', sub: 'By us, others, weather, theft', docType: 'WO', billable: 'maybe', reason: 'damaged_by_others' as COReasonCode },
      { id: 'frame', group: 'site_issue', icon: '📏', label: 'Framing Correction', sub: 'Out of plumb, wrong member', docType: 'WO', billable: 'no', reason: 'rework' as COReasonCode },
      { id: 'miss', group: 'site_issue', icon: '⊟', label: 'Missed Scope', sub: 'Gap in plans', docType: 'CO', billable: 'yes', reason: 'addition' as COReasonCode },
      { id: 'mat', group: 'site_issue', icon: '📦', label: 'Material Defect', sub: 'Wrong / defective', docType: 'WO', billable: 'maybe', reason: 'other' as COReasonCode },
    ],
  },
  {
    group: 'addon', groupColor: 'bg-green-600',
    groupLabel: 'Add-on / additional scope', groupMeta: '→ Change Order',
    items: [
      { id: 'upg', group: 'addon', icon: '⬆', label: 'Owner Upgrade', sub: 'Spec or finish upgrade', docType: 'CO', billable: 'yes', reason: 'owner_request' as COReasonCode },
      { id: 've', group: 'addon', icon: '⇄', label: 'Value Engineering', sub: 'Swap to reduce / improve', docType: 'CO', billable: 'yes', reason: 'design_change' as COReasonCode },
      { id: 'punch', group: 'addon', icon: '✓', label: 'Punch List Add', sub: 'Beyond original contract', docType: 'WO', billable: 'maybe', reason: 'addition' as COReasonCode },
    ],
  },
];

// ── Shared tile renderer ──────────────────────────────────────────
function Tile({ selected, onClick, icon, label, sub, badge }: {
  selected: boolean; onClick: () => void; icon: string; label: string; sub: string; badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1.5 p-3 rounded-lg border-[1.5px] text-left min-h-[64px] transition-all relative',
        selected
          ? 'bg-amber-50 border-amber-400 shadow-[0_0_0_3px_rgba(245,166,35,0.12)]'
          : 'bg-background border-border hover:border-amber-300 hover:bg-amber-50',
      )}
    >
      {badge && !selected && (
        <span className="absolute top-[7px] right-[7px] text-[0.55rem] font-extrabold px-1.5 py-px rounded-lg bg-amber-100 text-amber-700 uppercase tracking-[0.4px]">
          {badge}
        </span>
      )}
      {selected && (
        <span className="absolute top-2 right-2 w-[18px] h-[18px] rounded-full bg-amber-500 text-white flex items-center justify-center text-[0.7rem] font-extrabold">
          ✓
        </span>
      )}
      <span className="text-lg">{icon}</span>
      <span className="text-[0.78rem] font-bold text-foreground leading-tight">{label}</span>
      <span className="text-[0.62rem] text-muted-foreground">{sub}</span>
    </button>
  );
}

// ── Section divider ───────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-[1.4px] mb-2.5 mt-6 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
      {children}
    </p>
  );
}

export function StepWhereAndWhy({ state, dispatch, projectId }: StepWhereAndWhyProps) {
  const cur = state.items[state.currentItemIndex];

  const { data: scopeDetails } = useQuery({
    queryKey: ['project-scope-details', projectId],
    enabled: !!projectId,
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await supabase
        .from('project_scope_details')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      return data;
    },
  });

  const locations = buildLocations(scopeDetails);

  const handleLocClick = (label: string) => {
    if (cur.multiLocation) {
      const next = cur.locations.includes(label)
        ? cur.locations.filter(l => l !== label)
        : [...cur.locations, label];
      dispatch({ type: 'SET_LOCATION', locations: next });
    } else {
      dispatch({ type: 'SET_LOCATION', locations: [label] });
    }
  };

  return (
    <div>
      <div className="mb-3.5">
        <p className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-[1.5px] mb-1">Step 1 of 4 · Location & Cause</p>
        <h2 className="font-heading text-[1.6rem] font-black text-foreground leading-tight tracking-tight">
          Where is the work, and what caused it?
        </h2>
        <p className="text-[0.78rem] text-muted-foreground mt-1 max-w-xl leading-relaxed">
          Pick the building location, the system affected, and the root cause.
        </p>
      </div>

      {/* ── LOCATION ─────────────────────────────────────────── */}
      <SectionLabel>Building Position</SectionLabel>

      <div className="flex items-center gap-3 p-3 bg-background border rounded-lg mb-3.5">
        <Switch
          checked={cur.multiLocation}
          onCheckedChange={() => dispatch({ type: 'TOGGLE_MULTI_LOCATION' })}
        />
        <div className="flex-1">
          <p className="text-[0.82rem] font-bold text-foreground">Apply to multiple locations</p>
          <p className="text-[0.7rem] text-muted-foreground">Same work, different spots — quantities multiply</p>
        </div>
        {cur.multiLocation && cur.locations.length > 0 && (
          <span className="text-[0.72rem] font-semibold font-mono text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
            {cur.locations.length} selected
          </span>
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2 mb-2">
        {locations.map(loc => (
          <Tile
            key={loc.id}
            selected={cur.locations.includes(loc.label)}
            onClick={() => handleLocClick(loc.label)}
            icon={loc.icon}
            label={loc.label}
            sub={loc.sub}
          />
        ))}
      </div>

      {/* ── SYSTEM ───────────────────────────────────────────── */}
      <SectionLabel>System Affected</SectionLabel>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
        {SYSTEMS.map(sys => (
          <Tile
            key={sys.id}
            selected={cur.system === sys.id}
            onClick={() => dispatch({ type: 'SET_SYSTEM', systemId: sys.id, systemName: sys.label })}
            icon={sys.icon}
            label={sys.label}
            sub={sys.sub}
          />
        ))}
      </div>

      {/* ── CAUSE ────────────────────────────────────────────── */}
      <SectionLabel>What Caused the Change?</SectionLabel>

      {CAUSES.map(group => (
        <div key={group.group} className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn('w-2 h-2 rounded-full shrink-0', group.groupColor)} />
            <span className="text-[0.74rem] font-bold text-foreground/80">{group.groupLabel}</span>
            <span className="text-[0.64rem] text-muted-foreground font-medium">{group.groupMeta}</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
            {group.items.map(cause => (
              <Tile
                key={cause.id}
                selected={cur.causeId === cause.id}
                onClick={() => dispatch({
                  type: 'SET_CAUSE',
                  causeId: cause.id,
                  causeName: cause.label,
                  docType: cause.docType,
                  billable: cause.billable,
                  reason: cause.reason,
                })}
                icon={cause.icon}
                label={cause.label}
                sub={cause.sub}
                badge={cause.suggested ? '★ Common' : undefined}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Inference badges */}
      {cur.causeId && (
        <div className="flex flex-wrap gap-2 p-4 bg-gradient-to-br from-amber-50 to-amber-50/50 border border-amber-200 rounded-xl mt-2 animate-fade-in">
          <p className="w-full text-[0.62rem] font-bold text-amber-800 uppercase tracking-[1px] flex items-center gap-1.5">
            ✦ Based on your pick, we'll set this up as:
          </p>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-amber-200 text-[0.74rem] font-semibold">
            <span className="text-muted-foreground text-[0.68rem]">Document</span>
            <span className="text-foreground">{cur.docType === 'CO' ? 'Change Order (CO)' : 'Work Order (WO)'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-amber-200 text-[0.74rem] font-semibold">
            <span className="text-muted-foreground text-[0.68rem]">Billable</span>
            <span className="text-foreground">{cur.billable === 'yes' ? 'Yes' : cur.billable === 'maybe' ? 'Maybe' : 'No'}</span>
          </span>
        </div>
      )}
    </div>
  );
}

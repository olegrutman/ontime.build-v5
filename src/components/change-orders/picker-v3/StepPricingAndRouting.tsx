import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';
import { useProjectFCOrgs } from '@/hooks/useProjectFCOrgs';
import { RoutingChain } from './RoutingChain';
import type { PickerState, PickerAction } from './types';
import type { COPricingType } from '@/types/changeOrder';

interface StepPricingAndRoutingProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
  projectId: string;
}

const PRICING_OPTIONS: { type: COPricingType; tag: string; name: string; desc: string; isDefault?: boolean }[] = [
  { type: 'fixed', tag: 'Recommended', name: 'Fixed Price', desc: 'One number, signed off upfront.', isDefault: true },
  { type: 'tm', tag: 'Track Actuals', name: 'Time & Materials', desc: 'Bill hourly rates + materials.' },
  { type: 'nte', tag: 'With Ceiling', name: 'Not To Exceed', desc: 'T&M up to a ceiling number.' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-[1.4px] mb-2.5 mt-6 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
      {children}
    </p>
  );
}

export function StepPricingAndRouting({ state, dispatch, projectId }: StepPricingAndRoutingProps) {
  const cur = state.items[state.currentItemIndex];
  const rl = useRoleLabelsContext();
  const { data: fcOrgs = [] } = useProjectFCOrgs(projectId);
  const collab = state.collaboration;

  // TC orgs
  const { data: tcOrgs = [] } = useQuery({
    queryKey: ['project-tc-orgs', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('project_participants')
        .select('organization_id, organization:organizations!project_participants_organization_id_fkey(id, name, type)')
        .eq('project_id', projectId)
        .eq('invite_status', 'ACCEPTED');
      const unique = new Map<string, { id: string; name: string; initials: string }>();
      for (const row of data ?? []) {
        const org = row.organization as { id: string; name: string; type: string } | null;
        if (!org || org.type !== 'TC') continue;
        unique.set(row.organization_id, {
          id: row.organization_id,
          name: org.name,
          initials: org.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        });
      }
      return Array.from(unique.values());
    },
    staleTime: 60_000,
  });

  const selectedTc = tcOrgs.find(o => o.id === collab.assignedTcOrgId);
  const selectedFc = fcOrgs.find(o => o.id === collab.assignedFcOrgId);

  return (
    <div>
      <div className="mb-3.5">
        <p className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-[1.5px] mb-1">Step 3 of 4 · Routing & Responsibilities</p>
        <h2 className="font-heading text-[1.6rem] font-black text-foreground leading-tight tracking-tight">
          Who's involved and what's needed?
        </h2>
        <p className="text-[0.78rem] text-muted-foreground mt-1 max-w-xl leading-relaxed">
          Set the pricing model, assign teams, and flag material/equipment needs.
        </p>
      </div>

      {/* ── PRICING MODEL ──────────────────────────────────────── */}
      <SectionLabel>Pricing Model</SectionLabel>

      <div className="grid grid-cols-3 gap-2.5 max-sm:grid-cols-1">
        {PRICING_OPTIONS.map(opt => {
          const selected = cur.pricingType === opt.type;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => dispatch({ type: 'SET_PRICING', pricingType: opt.type, pricingName: opt.name })}
              className={cn(
                'p-3.5 rounded-xl border-[1.5px] text-left transition-all relative',
                selected
                  ? 'bg-amber-50 border-amber-400 shadow-[0_0_0_3px_rgba(245,166,35,0.18)]'
                  : 'bg-background border-border hover:border-amber-300 hover:bg-amber-50',
              )}
            >
              {selected && (
                <span className="absolute top-2.5 right-2.5 w-[20px] h-[20px] rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[0.75rem]">✓</span>
              )}
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.5px] text-amber-700 mb-0.5">{opt.tag}</p>
              <p className="font-heading text-[1rem] font-extrabold text-foreground tracking-tight mb-0.5">{opt.name}</p>
              <p className="text-[0.68rem] text-muted-foreground leading-snug">{opt.desc}</p>
            </button>
          );
        })}
      </div>

      {/* ── COLLABORATION / ROUTING ────────────────────────────── */}
      <SectionLabel>Collaboration & Routing</SectionLabel>

      {/* GC: assign TC */}
      {state.role === 'GC' && (
        <div className="bg-background border rounded-xl overflow-hidden mb-3 shadow-xs">
          <div className="px-3.5 py-2.5 border-b flex items-center justify-between">
            <p className="text-[0.82rem] font-bold text-foreground/80">⊡ Assign To {rl.TC}</p>
            <span className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Required</span>
          </div>
          <div className="p-3 space-y-1.5">
            {tcOrgs.map(tc => (
              <button
                key={tc.id}
                type="button"
                onClick={() => dispatch({ type: 'SET_ASSIGNED_TC', orgId: tc.id })}
                className={cn(
                  'flex items-center gap-2.5 w-full p-2.5 rounded-lg border-[1.5px] text-left transition-all',
                  collab.assignedTcOrgId === tc.id
                    ? 'bg-amber-50 border-amber-400'
                    : 'bg-background border-border hover:border-amber-300',
                )}
              >
                <span className="w-[30px] h-[30px] rounded-full bg-green-600 text-white flex items-center justify-center text-[0.7rem] font-bold shrink-0">{tc.initials}</span>
                <p className="text-[0.82rem] font-bold text-foreground flex-1">{tc.name}</p>
                <div className={cn('w-4 h-4 rounded-full border-2 shrink-0', collab.assignedTcOrgId === tc.id ? 'border-amber-500 bg-amber-500' : 'border-muted-foreground/40')} />
              </button>
            ))}
            {tcOrgs.length === 0 && <p className="text-[0.78rem] text-muted-foreground text-center py-4">No trade contractors on this project.</p>}
          </div>
        </div>
      )}

      {/* TC/GC: FC input toggle */}
      {(state.role === 'GC' || state.role === 'TC') && (
        <div className="bg-background border rounded-xl overflow-hidden mb-3 shadow-xs">
          <div className="p-3">
            <div className="flex items-center gap-3 p-2.5 bg-muted/50 border rounded-lg">
              <Switch
                checked={collab.requestFcInput}
                onCheckedChange={v => {
                  dispatch({ type: 'SET_REQUEST_FC', value: v });
                  if (v && fcOrgs.length > 0 && !collab.assignedFcOrgId) {
                    dispatch({ type: 'SET_ASSIGNED_FC', orgId: fcOrgs[0].id });
                  }
                }}
              />
              <div>
                <p className="text-[0.82rem] font-bold text-foreground">Request {rl.FC} hours</p>
                <p className="text-[0.68rem] text-muted-foreground">FC will log hours before pricing.</p>
              </div>
            </div>
            {collab.requestFcInput && fcOrgs.length > 0 && (
              <div className="space-y-1.5 mt-2 animate-fade-in">
                {fcOrgs.map(fc => (
                  <button
                    key={fc.id}
                    type="button"
                    onClick={() => dispatch({ type: 'SET_ASSIGNED_FC', orgId: fc.id })}
                    className={cn(
                      'flex items-center gap-2.5 w-full p-2.5 rounded-lg border-[1.5px] text-left transition-all',
                      collab.assignedFcOrgId === fc.id ? 'bg-amber-50 border-amber-400' : 'bg-background border-border hover:border-amber-300',
                    )}
                  >
                    <span className="w-[30px] h-[30px] rounded-full bg-amber-500 text-white flex items-center justify-center text-[0.7rem] font-bold shrink-0">
                      {fc.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                    <p className="text-[0.82rem] font-bold text-foreground flex-1">{fc.name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FC: auto-routing info */}
      {state.role === 'FC' && (
        <div className="bg-background border rounded-xl p-3.5 mb-3 shadow-xs">
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-amber-50 border-amber-400">
            <span className="w-[30px] h-[30px] rounded-full bg-green-600 text-white flex items-center justify-center text-[0.7rem] font-bold">TC</span>
            <div className="flex-1">
              <p className="text-[0.82rem] font-bold text-foreground">{rl.TC}</p>
              <p className="text-[0.62rem] text-muted-foreground">Will price your hours</p>
            </div>
          </div>
        </div>
      )}

      <RoutingChain
        role={state.role}
        tcName={selectedTc?.name}
        tcInitials={selectedTc?.initials}
        fcName={selectedFc?.name}
        fcInitials={selectedFc?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
        requestFc={collab.requestFcInput}
      />

      {/* ── MATERIALS & EQUIPMENT NEEDS ────────────────────────── */}
      <SectionLabel>Materials & Equipment Needs</SectionLabel>

      <div className="bg-background border rounded-xl overflow-hidden shadow-xs mb-4">
        {/* Materials toggle */}
        <div className="flex items-center justify-between px-3.5 py-3 border-b">
          <div className="flex items-center gap-2.5">
            <span className="text-base">📦</span>
            <div>
              <p className="text-[0.82rem] font-bold text-foreground">Materials Needed?</p>
              <p className="text-[0.62rem] text-muted-foreground">Will be itemized after creation</p>
            </div>
          </div>
          <Switch
            checked={cur.materialsNeeded}
            onCheckedChange={v => dispatch({ type: 'SET_MATERIALS_NEEDED', value: v })}
          />
        </div>
        {cur.materialsNeeded && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-amber-50 border-b animate-fade-in">
            <span className="text-[0.68rem] font-bold text-amber-700 uppercase tracking-[0.8px]">Procured by:</span>
            <div className="flex gap-0.5 bg-background border rounded-lg p-0.5 ml-auto">
              {(['TC', 'GC'] as const).map(r => {
                const active = cur.materialResponsible === r;
                return (
                  <button key={r} type="button"
                    onClick={() => dispatch({ type: 'SET_MATERIAL_RESPONSIBLE', value: r })}
                    className={cn('px-3 py-1 rounded-md text-[0.68rem] font-bold transition-all', active && r === 'TC' && 'bg-green-600 text-white', active && r === 'GC' && 'bg-blue-600 text-white', !active && 'text-muted-foreground')}
                  >{r}</button>
                );
              })}
            </div>
          </div>
        )}

        {/* Equipment toggle */}
        <div className="flex items-center justify-between px-3.5 py-3 border-b">
          <div className="flex items-center gap-2.5">
            <span className="text-base">🔧</span>
            <div>
              <p className="text-[0.82rem] font-bold text-foreground">Equipment Needed?</p>
              <p className="text-[0.62rem] text-muted-foreground">Will be itemized after creation</p>
            </div>
          </div>
          <Switch
            checked={cur.equipmentNeeded}
            onCheckedChange={v => dispatch({ type: 'SET_EQUIPMENT_NEEDED', value: v })}
          />
        </div>
        {cur.equipmentNeeded && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-amber-50 animate-fade-in">
            <span className="text-[0.68rem] font-bold text-amber-700 uppercase tracking-[0.8px]">Procured by:</span>
            <div className="flex gap-0.5 bg-background border rounded-lg p-0.5 ml-auto">
              {(['TC', 'GC'] as const).map(r => {
                const active = cur.equipmentResponsible === r;
                return (
                  <button key={r} type="button"
                    onClick={() => dispatch({ type: 'SET_EQUIPMENT_RESPONSIBLE', value: r })}
                    className={cn('px-3 py-1 rounded-md text-[0.68rem] font-bold transition-all', active && r === 'TC' && 'bg-green-600 text-white', active && r === 'GC' && 'bg-blue-600 text-white', !active && 'text-muted-foreground')}
                  >{r}</button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

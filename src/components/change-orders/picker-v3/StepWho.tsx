import { cn } from '@/lib/utils';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';
import { Switch } from '@/components/ui/switch';
import { useProjectFCOrgs } from '@/hooks/useProjectFCOrgs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RoutingChain } from './RoutingChain';
import type { PickerState, PickerAction } from './types';

interface StepWhoProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
  projectId: string;
}

export function StepWho({ state, dispatch, projectId }: StepWhoProps) {
  const rl = useRoleLabelsContext();
  const { data: fcOrgs = [] } = useProjectFCOrgs(projectId);

  // Fetch TC orgs on this project
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

  const collab = state.collaboration;
  const selectedTc = tcOrgs.find(o => o.id === collab.assignedTcOrgId);
  const selectedFc = fcOrgs.find(o => o.id === collab.assignedFcOrgId);

  const rolePip = state.role === 'GC' ? `As ${rl.GC}`
    : state.role === 'TC' ? `As ${rl.TC}`
    : `As ${rl.FC}`;

  const helpText = state.role === 'GC'
    ? 'Assign this CO to the trade contractor doing the work, and decide whether you need field crew input on labor.'
    : state.role === 'TC'
    ? 'This CO routes to the GC for approval. Optionally request hours from your field crew first.'
    : 'You log the labor and any materials you used. Your TC will price it and forward to the GC.';

  return (
    <div>
      <div className="flex items-start justify-between gap-3.5 mb-3.5">
        <div>
          <p className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-[1.5px] mb-1">Step 3 of 9 · Collaboration</p>
          <h2 className="font-heading text-[1.6rem] font-black text-foreground leading-tight tracking-tight">
            Who needs to be involved?
          </h2>
          <p className="text-[0.78rem] text-muted-foreground mt-1 max-w-xl leading-relaxed">{helpText}</p>
        </div>
        <span className="text-[0.65rem] font-bold px-2.5 py-1 rounded-full bg-background border text-muted-foreground whitespace-nowrap shrink-0">
          {rolePip}
        </span>
      </div>

      {/* GC View: Assign TC + optional FC */}
      {state.role === 'GC' && (
        <>
          <div className="bg-background border rounded-xl overflow-hidden mb-3.5 shadow-xs">
            <div className="px-3.5 py-3 border-b flex items-center justify-between">
              <p className="font-heading text-[0.92rem] font-extrabold uppercase tracking-[0.5px] text-foreground/80 flex items-center gap-2">
                ⊡ Assign To {rl.TC}
              </p>
              <span className="text-[0.6rem] font-bold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">Required</span>
            </div>
            <div className="p-3.5 space-y-1.5">
              {tcOrgs.map(tc => (
                <button
                  key={tc.id}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_ASSIGNED_TC', orgId: tc.id })}
                  className={cn(
                    'flex items-center gap-2.5 w-full p-2.5 rounded-lg border-[1.5px] text-left transition-all',
                    collab.assignedTcOrgId === tc.id
                      ? 'bg-amber-50 border-amber-400 shadow-[0_0_0_3px_rgba(245,166,35,0.12)]'
                      : 'bg-background border-border hover:border-amber-300',
                  )}
                >
                  <span className="w-[34px] h-[34px] rounded-full bg-green-600 text-white flex items-center justify-center text-[0.75rem] font-bold shrink-0">
                    {tc.initials}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.85rem] font-bold text-foreground">{tc.name}</p>
                    <p className="text-[0.65rem] text-muted-foreground">{rl.TC}</p>
                  </div>
                  <div className={cn(
                    'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                    collab.assignedTcOrgId === tc.id ? 'border-amber-500 bg-amber-500' : 'border-muted-foreground/40',
                  )}>
                    {collab.assignedTcOrgId === tc.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
              {tcOrgs.length === 0 && (
                <p className="text-[0.78rem] text-muted-foreground text-center py-6">No trade contractors on this project yet.</p>
              )}
            </div>
          </div>

          {/* FC Input */}
          <div className="bg-background border rounded-xl overflow-hidden mb-3.5 shadow-xs">
            <div className="px-3.5 py-3 border-b">
              <p className="font-heading text-[0.92rem] font-extrabold uppercase tracking-[0.5px] text-foreground/80">
                ⚒ {rl.FC} Input <span className="text-[0.6rem] text-muted-foreground font-normal normal-case">Optional</span>
              </p>
            </div>
            <div className="p-3.5">
              <div className="flex items-center gap-3 p-3 bg-muted/50 border rounded-lg mb-2.5">
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
                  <p className="text-[0.82rem] font-bold text-foreground">Request hours from a field crew</p>
                  <p className="text-[0.7rem] text-muted-foreground">FC will log hours, then TC prices and submits to you.</p>
                </div>
              </div>
              {collab.requestFcInput && (
                <div className="space-y-1.5 animate-fade-in">
                  {fcOrgs.map(fc => (
                    <button
                      key={fc.id}
                      type="button"
                      onClick={() => dispatch({ type: 'SET_ASSIGNED_FC', orgId: fc.id })}
                      className={cn(
                        'flex items-center gap-2.5 w-full p-2.5 rounded-lg border-[1.5px] text-left transition-all',
                        collab.assignedFcOrgId === fc.id
                          ? 'bg-amber-50 border-amber-400 shadow-[0_0_0_3px_rgba(245,166,35,0.12)]'
                          : 'bg-background border-border hover:border-amber-300',
                      )}
                    >
                      <span className="w-[34px] h-[34px] rounded-full bg-amber-500 text-white flex items-center justify-center text-[0.75rem] font-bold shrink-0">
                        {fc.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.85rem] font-bold text-foreground">{fc.name}</p>
                        <p className="text-[0.65rem] text-muted-foreground">{rl.FC}</p>
                      </div>
                      <div className={cn(
                        'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0',
                        collab.assignedFcOrgId === fc.id ? 'border-amber-500 bg-amber-500' : 'border-muted-foreground/40',
                      )}>
                        {collab.assignedFcOrgId === fc.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* TC View */}
      {state.role === 'TC' && (
        <>
          <div className="bg-background border rounded-xl overflow-hidden mb-3.5 shadow-xs">
            <div className="px-3.5 py-3 border-b">
              <p className="font-heading text-[0.92rem] font-extrabold uppercase tracking-[0.5px] text-foreground/80">↑ Submitting To</p>
            </div>
            <div className="p-3.5">
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-amber-50 border-amber-400">
                <span className="w-[34px] h-[34px] rounded-full bg-blue-600 text-white flex items-center justify-center text-[0.75rem] font-bold">GC</span>
                <div className="flex-1">
                  <p className="text-[0.85rem] font-bold text-foreground">{rl.GC}</p>
                  <p className="text-[0.65rem] text-muted-foreground">Auto-assigned from project</p>
                </div>
                <span className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">● Active</span>
              </div>
            </div>
          </div>

          <div className="bg-background border rounded-xl overflow-hidden mb-3.5 shadow-xs">
            <div className="px-3.5 py-3 border-b">
              <p className="font-heading text-[0.92rem] font-extrabold uppercase tracking-[0.5px] text-foreground/80">
                ⚒ {rl.FC} Input <span className="text-[0.6rem] text-muted-foreground font-normal normal-case">Optional</span>
              </p>
            </div>
            <div className="p-3.5">
              <div className="flex items-center gap-3 p-3 bg-muted/50 border rounded-lg mb-2.5">
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
                  <p className="text-[0.82rem] font-bold text-foreground">Need FC hours to price this</p>
                  <p className="text-[0.7rem] text-muted-foreground">FC will log hours privately. Their cost becomes your pricing base.</p>
                </div>
              </div>
              {collab.requestFcInput && (
                <div className="space-y-1.5 animate-fade-in">
                  {fcOrgs.map(fc => (
                    <button
                      key={fc.id}
                      type="button"
                      onClick={() => dispatch({ type: 'SET_ASSIGNED_FC', orgId: fc.id })}
                      className={cn(
                        'flex items-center gap-2.5 w-full p-2.5 rounded-lg border-[1.5px] text-left transition-all',
                        collab.assignedFcOrgId === fc.id
                          ? 'bg-amber-50 border-amber-400'
                          : 'bg-background border-border hover:border-amber-300',
                      )}
                    >
                      <span className="w-[34px] h-[34px] rounded-full bg-amber-500 text-white flex items-center justify-center text-[0.75rem] font-bold shrink-0">
                        {fc.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.85rem] font-bold text-foreground">{fc.name}</p>
                        <p className="text-[0.65rem] text-muted-foreground">{rl.FC}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* FC View */}
      {state.role === 'FC' && (
        <div className="bg-background border rounded-xl overflow-hidden mb-3.5 shadow-xs">
          <div className="px-3.5 py-3 border-b">
            <p className="font-heading text-[0.92rem] font-extrabold uppercase tracking-[0.5px] text-foreground/80">↑ Routes To Your {rl.TC}</p>
          </div>
          <div className="p-3.5">
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-amber-50 border-amber-400">
              <span className="w-[34px] h-[34px] rounded-full bg-green-600 text-white flex items-center justify-center text-[0.75rem] font-bold">TC</span>
              <div className="flex-1">
                <p className="text-[0.85rem] font-bold text-foreground">{rl.TC}</p>
                <p className="text-[0.65rem] text-muted-foreground">Will price your hours</p>
              </div>
              <span className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">● Active</span>
            </div>
            <p className="text-[0.74rem] text-muted-foreground mt-2.5 leading-relaxed">
              You'll log your hours and add any materials you need. Your TC will see your hours, mark them up, add their own scope, and submit the final price to the GC.
            </p>
          </div>
        </div>
      )}

      {/* Routing chain preview */}
      <RoutingChain
        role={state.role}
        tcName={selectedTc?.name}
        tcInitials={selectedTc?.initials}
        fcName={selectedFc?.name}
        fcInitials={selectedFc?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
        requestFc={collab.requestFcInput}
      />
    </div>
  );
}

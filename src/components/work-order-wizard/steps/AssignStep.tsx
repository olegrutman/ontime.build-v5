import { useState, useEffect, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import type { WorkOrderWizardData } from '@/types/workOrderWizard';

interface TeamMember {
  id: string;
  org_id: string;
  org_name: string;
  role: string;
  trade: string | null;
}

interface AssignStepProps {
  data: WorkOrderWizardData;
  onChange: (updates: Partial<WorkOrderWizardData>) => void;
  projectId: string;
  isGC: boolean;
  isTC: boolean;
}

export function AssignStep({ data, onChange, projectId, isGC, isTC }: AssignStepProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeam() {
      setLoading(true);
      const { data: rows } = await supabase
        .from('project_team')
        .select('id, org_id, role, trade, organization:organizations!project_team_org_id_fkey(id, name)')
        .eq('project_id', projectId)
        .eq('status', 'Accepted');

      setTeamMembers(
        (rows || [])
          .filter((r: any) => r.org_id && r.organization)
          .map((r: any) => ({
            id: r.id,
            org_id: r.org_id,
            org_name: (r.organization as any)?.name || 'Unknown',
            role: r.role || '',
            trade: r.trade,
          }))
      );
      setLoading(false);
    }
    fetchTeam();
  }, [projectId]);

  // GC assigns to TC; TC assigns to FC
  const assigneeOptions = useMemo(() => {
    if (isGC) return teamMembers.filter(m => m.role === 'Trade Contractor');
    return [];
  }, [teamMembers, isGC]);

  const fcOptions = useMemo(() => {
    if (isTC) return teamMembers.filter(m => m.role === 'Field Crew');
    return [];
  }, [teamMembers, isTC]);

  const participantOptions = useMemo(() => {
    return teamMembers.filter(m =>
      m.org_id !== data.assigned_org_id &&
      m.org_id !== data.selected_fc_org_id
    );
  }, [teamMembers, data.assigned_org_id, data.selected_fc_org_id]);

  if (loading) {
    return <div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* GC: Select TC */}
      {isGC && (
        <div>
          <label className="text-sm font-medium text-foreground">Send to Trade Contractor</label>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">
            Select which Trade Contractor will price and perform this work.
          </p>
          <Select
            value={data.assigned_org_id || ''}
            onValueChange={(v) => onChange({ assigned_org_id: v || null })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select trade contractor…" />
            </SelectTrigger>
            <SelectContent>
              {assigneeOptions.map(m => (
                <SelectItem key={m.org_id} value={m.org_id}>
                  {m.org_name}{m.trade ? ` — ${m.trade}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* TC: Request FC input */}
      {isTC && fcOptions.length > 0 && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Request FC input</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send draft to Field Crew to add their hours, materials, and equipment.
              </p>
            </div>
            <Switch
              checked={data.request_fc_input}
              onCheckedChange={(checked) => onChange({
                request_fc_input: checked,
                selected_fc_org_id: checked ? data.selected_fc_org_id : null,
              })}
            />
          </div>
          {data.request_fc_input && (
            <Select
              value={data.selected_fc_org_id || ''}
              onValueChange={(v) => onChange({ selected_fc_org_id: v || null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field crew…" />
              </SelectTrigger>
              <SelectContent>
                {fcOptions.map(m => (
                  <SelectItem key={m.org_id} value={m.org_id}>
                    {m.org_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Additional participants */}
      {participantOptions.length > 0 && (
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Additional participants</p>
          <div className="space-y-2">
            {participantOptions.map(m => {
              const isOn = data.participant_org_ids.includes(m.org_id);
              return (
                <div key={m.org_id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <div>
                    <p className="text-sm text-foreground">{m.org_name}</p>
                    <p className="text-xs text-muted-foreground">{m.role}{m.trade ? ` — ${m.trade}` : ''}</p>
                  </div>
                  <Switch
                    checked={isOn}
                    onCheckedChange={(checked) => {
                      const updated = checked
                        ? [...data.participant_org_ids, m.org_id]
                        : data.participant_org_ids.filter(id => id !== m.org_id);
                      onChange({ participant_org_ids: updated });
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

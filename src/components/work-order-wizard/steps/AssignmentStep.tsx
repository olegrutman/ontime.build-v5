import { useMemo, useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Users, Building2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { WorkOrderWizardData } from '@/types/workOrderWizard';

interface TeamMemberOption {
  id: string;
  org_id: string;
  org_name: string;
  role: string;
  trade?: string | null;
}

interface AssignmentStepProps {
  data: WorkOrderWizardData;
  onChange: (updates: Partial<WorkOrderWizardData>) => void;
  projectId: string;
  isGC: boolean;
  isTC: boolean;
}

export function AssignmentStep({
  data,
  onChange,
  projectId,
  isGC,
  isTC,
}: AssignmentStepProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [participantToggles, setParticipantToggles] = useState<Record<string, boolean>>({});

  // Fetch team members
  useEffect(() => {
    async function fetchTeamMembers() {
      if (!projectId) return;

      setIsLoading(true);
      try {
        const { data: teamData, error } = await supabase
          .from('project_team')
          .select(`
            id,
            org_id,
            role,
            trade,
            organization:organizations(id, name)
          `)
          .eq('project_id', projectId)
          .eq('status', 'Accepted');

        if (error) {
          console.error('Error fetching team members:', error);
          return;
        }

        const members: TeamMemberOption[] = (teamData || [])
          .filter((row) => row.org_id && row.organization)
          .map((row) => ({
            id: row.id,
            org_id: row.org_id!,
            org_name: (row.organization as { id: string; name: string })?.name || 'Unknown',
            role: row.role || '',
            trade: row.trade,
          }));

        setTeamMembers(members);

        // Initialize participant toggles from data
        const toggles: Record<string, boolean> = {};
        members.forEach((m) => {
          toggles[m.org_id] = data.participant_org_ids?.includes(m.org_id) || false;
        });
        setParticipantToggles(toggles);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTeamMembers();
  }, [projectId]);

  // Filter assignees based on creator role
  const assigneeOptions = useMemo(() => {
    if (isGC) {
      return teamMembers.filter((m) => m.role === 'Trade Contractor');
    } else if (isTC) {
      return teamMembers.filter((m) => m.role === 'Field Crew');
    }
    return [];
  }, [teamMembers, isGC, isTC]);

  // Filter participant toggles based on role restrictions
  const toggleableParticipants = useMemo(() => {
    if (isGC) {
      return teamMembers.filter(
        (m) => m.role === 'Trade Contractor' && m.org_id !== data.assigned_org_id
      );
    } else if (isTC) {
      return teamMembers.filter(
        (m) =>
          (m.role === 'Field Crew' || m.role === 'Supplier') &&
          m.org_id !== data.assigned_org_id
      );
    }
    return [];
  }, [teamMembers, isGC, isTC, data.assigned_org_id]);

  const toggleParticipant = (orgId: string) => {
    const newToggles = { ...participantToggles, [orgId]: !participantToggles[orgId] };
    setParticipantToggles(newToggles);

    // Update parent data
    const enabledParticipants = Object.entries(newToggles)
      .filter(([_, enabled]) => enabled)
      .map(([id]) => id);
    onChange({ participant_org_ids: enabledParticipants });
  };

  const assigneeLabel = isGC ? 'Trade Contractor' : 'Field Crew';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Assignment</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Assign this work order to a {assigneeLabel.toLowerCase()}
        </p>
      </div>

      {/* Primary Assignee */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Assign to {assigneeLabel}
        </Label>
        <Select
          value={data.assigned_org_id || ''}
          onValueChange={(value) => onChange({ assigned_org_id: value || null })}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder={`Select ${assigneeLabel.toLowerCase()}...`} />
          </SelectTrigger>
          <SelectContent>
            {assigneeOptions.length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">
                No {assigneeLabel.toLowerCase()}s available
              </div>
            ) : (
              assigneeOptions.map((member) => (
                <SelectItem key={member.org_id} value={member.org_id}>
                  <div className="flex flex-col">
                    <span>{member.org_name}</span>
                    {member.trade && (
                      <span className="text-xs text-muted-foreground">{member.trade}</span>
                    )}
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Additional Participants */}
      {toggleableParticipants.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <Label className="text-sm text-muted-foreground">Additional Participants</Label>
          <div className="space-y-2">
            {toggleableParticipants.map((member) => (
              <div
                key={member.org_id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{member.org_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.role}
                    {member.trade ? ` • ${member.trade}` : ''}
                  </p>
                </div>
                <Switch
                  checked={participantToggles[member.org_id] || false}
                  onCheckedChange={() => toggleParticipant(member.org_id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

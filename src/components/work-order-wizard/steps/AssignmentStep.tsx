import { useEffect, useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Building2, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    async function fetchTeamMembers() {
      if (!projectId) return;

      setIsLoading(true);
      try {
        const { data: teamData, error } = await supabase
          .from('project_team')
          .select('id, org_id, role, trade')
          .eq('project_id', projectId)
          .eq('status', 'Accepted');

        if (error) {
          console.error('Error fetching team members:', error);
          return;
        }

        const rows = (teamData || []).filter((row) => row.org_id);
        const orgIds = [...new Set(rows.map((r) => r.org_id!))];

        let orgMap: Record<string, string> = {};
        if (orgIds.length > 0) {
          const { data: orgsDirectly } = await supabase
            .from('organizations')
            .select('id, name')
            .in('id', orgIds);

          (orgsDirectly || []).forEach((o) => {
            orgMap[o.id] = o.name;
          });
        }

        setTeamMembers(
          rows.map((row) => ({
            id: row.id,
            org_id: row.org_id!,
            org_name: orgMap[row.org_id!] || 'Unknown',
            role: row.role || '',
            trade: row.trade,
          }))
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchTeamMembers();
  }, [projectId]);

  const assigneeOptions = useMemo(() => {
    if (isGC) return teamMembers.filter((m) => m.role === 'Trade Contractor');
    if (isTC) return teamMembers.filter((m) => m.role === 'Field Crew');
    return [];
  }, [teamMembers, isGC, isTC]);

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
                  {member.org_name}{member.trade ? ` (${member.trade})` : ''}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

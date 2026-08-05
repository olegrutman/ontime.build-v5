import { useState } from 'react';
import { cn } from '@/lib/utils';
import { DT } from '@/lib/design-tokens';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCORoutingTargets } from '@/hooks/useCORoutingTargets';
import type { ChangeOrder, COCollaborator } from '@/types/changeOrder';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';
import type { RoleCode } from '@/hooks/useRoleLabels';

interface COTeamCardProps {
  co: ChangeOrder;
  collaborators: COCollaborator[];
}

interface TeamMember {
  orgId: string;
  orgName: string;
  roleLabel: string;
  roleCode: 'GC' | 'TC' | 'FC' | 'OTHER';
  status: 'Owner' | 'Active' | 'Pending accept' | 'Completed' | 'Notified';
}

const ROLE_COLORS: Record<string, string> = {
  GC: 'bg-blue-500',
  TC: 'bg-emerald-500',
  FC: 'bg-amber-500',
  OTHER: 'bg-muted-foreground',
};

const STATUS_STYLES: Record<string, string> = {
  Owner: 'bg-primary/10 text-primary',
  Active: 'bg-emerald-500/10 text-emerald-600',
  'Pending accept': 'bg-amber-500/10 text-amber-600',
  Completed: 'bg-muted text-muted-foreground',
  Notified: 'bg-blue-500/10 text-blue-600',
};

export function COTeamCard({ co, collaborators }: COTeamCardProps) {
  const rl = useRoleLabelsContext();
  const queryClient = useQueryClient();
  const { userOrgRoles } = useAuth();
  const myOrgId = userOrgRoles?.[0]?.organization_id ?? null;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data: routing } = useCORoutingTargets(co.project_id);

  const canReroute = myOrgId === co.org_id && co.status === 'draft';

  const reroute = async (orgId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('change_orders')
        .update({ assigned_to_org_id: orgId })
        .eq('id', co.id);
      if (error) throw error;
      toast.success('Routing updated');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['change-order', co.id] });
      queryClient.invalidateQueries({ queryKey: ['change-orders', co.project_id] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not update routing');
    } finally {
      setSaving(false);
    }
  };

  // Fetch org names for creator and assigned orgs
  const orgIds = [co.org_id, co.assigned_to_org_id, ...collaborators.map(c => c.organization_id)].filter(Boolean) as string[];
  const uniqueOrgIds = [...new Set(orgIds)];

  const { data: orgs = [] } = useQuery({
    queryKey: ['co-team-orgs', ...uniqueOrgIds],
    enabled: uniqueOrgIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('organizations')
        .select('id, name, type')
        .in('id', uniqueOrgIds);
      return data ?? [];
    },
  });

  const orgMap = new Map(orgs.map(o => [o.id, o]));

  const members: TeamMember[] = [];

  // Creator org = Owner
  const creatorOrg = orgMap.get(co.org_id);
  if (creatorOrg) {
    const roleCode = (creatorOrg.type === 'GC' ? 'GC' : creatorOrg.type === 'TC' ? 'TC' : creatorOrg.type === 'FC' ? 'FC' : 'OTHER') as TeamMember['roleCode'];
    members.push({
      orgId: co.org_id,
      orgName: creatorOrg.name ?? 'Unknown',
      roleLabel: creatorOrg.type ?? 'Owner',
      roleCode,
      status: 'Owner',
    });
  }

  // Assigned org (if different from creator)
  if (co.assigned_to_org_id && co.assigned_to_org_id !== co.org_id) {
    const assignedOrg = orgMap.get(co.assigned_to_org_id);
    if (assignedOrg) {
      const collabRow = collaborators.find(c => c.organization_id === co.assigned_to_org_id);
      const status: TeamMember['status'] = collabRow?.status === 'active' ? 'Active'
        : collabRow?.status === 'invited' ? 'Pending accept'
        : collabRow?.status === 'completed' ? 'Completed'
        : 'Notified';
      const roleCode = (assignedOrg.type === 'GC' ? 'GC' : assignedOrg.type === 'TC' ? 'TC' : assignedOrg.type === 'FC' ? 'FC' : 'OTHER') as TeamMember['roleCode'];
      members.push({
        orgId: co.assigned_to_org_id,
        orgName: assignedOrg.name ?? 'Unknown',
        roleLabel: assignedOrg.type ?? 'Assigned',
        roleCode,
        status,
      });
    }
  }

  // Collaborators (FC orgs not already listed)
  for (const collab of collaborators) {
    if (members.some(m => m.orgId === collab.organization_id)) continue;
    const org = orgMap.get(collab.organization_id) ?? collab.organization;
    const status: TeamMember['status'] = collab.status === 'active' ? 'Active'
      : collab.status === 'invited' ? 'Pending accept'
      : collab.status === 'completed' ? 'Completed'
      : 'Active';
    members.push({
      orgId: collab.organization_id,
      orgName: org?.name ?? 'Unknown',
      roleLabel: collab.collaborator_type ?? 'FC',
      roleCode: 'FC',
      status,
    });
  }

  if (members.length === 0 && !canReroute) return null;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-3.5 py-3 border-b border-border flex items-center justify-between gap-2">
        <h3 className="text-[0.7rem] uppercase tracking-[0.04em] font-semibold text-muted-foreground">
          👥 Team
        </h3>
        {canReroute && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={() => setEditing(v => !v)}
          >
            {editing ? 'Cancel' : co.assigned_to_org_id ? 'Change assignee' : 'Assign'}
          </Button>
        )}
      </div>
      {canReroute && editing && (
        <div className="px-3.5 py-3 border-b border-border space-y-1.5 bg-muted/30">
          <p className="text-[11px] text-muted-foreground">
            Route this draft to a different party.
          </p>
          {(routing?.targets ?? []).length === 0 && (
            <p className="text-[11px] text-muted-foreground">No eligible party on this project yet.</p>
          )}
          {(routing?.targets ?? []).map(t => (
            <button
              key={t.id}
              type="button"
              disabled={saving}
              onClick={() => reroute(t.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors',
                co.assigned_to_org_id === t.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/40',
              )}
            >
              <span className="text-sm font-medium flex-1 truncate">{t.name}</span>
              <span className="text-[10px] font-bold uppercase text-muted-foreground">{t.type}</span>
            </button>
          ))}
        </div>
      )}

      <div className="divide-y divide-border">
        {members.map(member => (
          <div key={member.orgId} className="flex items-center gap-3 px-3.5 py-2.5">
            <span
              className={cn(
                'inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold text-white shrink-0',
                ROLE_COLORS[member.roleCode] ?? ROLE_COLORS.OTHER,
               )}
             >
               {member.roleCode === 'GC' ? 'G' : member.roleCode === 'TC' ? 'T' : member.roleCode === 'FC' ? 'F' : 'O'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{member.orgName}</p>
              <p className="text-[11px] text-muted-foreground">{['GC','TC','FC'].includes(member.roleLabel) ? rl.label(member.roleLabel as RoleCode) : member.roleLabel === 'SUPPLIER' ? 'Supplier' : member.roleLabel}</p>
            </div>
            <span
              className={cn(
                'text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0',
                STATUS_STYLES[member.status] ?? 'bg-muted text-muted-foreground',
              )}
            >
              {member.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

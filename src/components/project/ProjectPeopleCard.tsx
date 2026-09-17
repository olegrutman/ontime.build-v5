import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface PersonRow {
  roleId: string;
  userId: string;
  name: string;
  email: string;
  jobTitle: string | null;
  isAdmin: boolean;
  scope: 'org' | 'assigned';
  assigned: boolean;
}

/**
 * Lets a company admin / team manager pick which of their own people work on this project.
 * Only affects members whose access is set to "Assigned projects only" — admins always see everything.
 */
export function ProjectPeopleCard({ projectId }: { projectId: string }) {
  const { userOrgRoles } = useAuth();
  const orgId = userOrgRoles?.[0]?.organization?.id;
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUser, setSavingUser] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId || !projectId) return;
    setLoading(true);

    const [rolesRes, membersRes] = await Promise.all([
      supabase
        .from('user_org_roles')
        .select('id, user_id, is_admin, project_scope')
        .eq('organization_id', orgId),
      supabase
        .from('project_members')
        .select('user_id, status')
        .eq('project_id', projectId),
    ]);

    const roles = rolesRes.data ?? [];
    const assignedIds = new Set(
      (membersRes.data ?? []).filter((m) => m.status === 'active').map((m) => m.user_id),
    );

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, job_title')
      .in('user_id', roles.map((r) => r.user_id));

    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    setPeople(
      roles.map((r) => {
        const p = profileMap.get(r.user_id);
        return {
          roleId: r.id,
          userId: r.user_id,
          name: p?.full_name || p?.email || 'Team member',
          email: p?.email ?? '',
          jobTitle: p?.job_title ?? null,
          isAdmin: r.is_admin,
          scope: (r.project_scope as 'org' | 'assigned') ?? 'org',
          assigned: assignedIds.has(r.user_id),
        };
      }),
    );
    setLoading(false);
  }, [orgId, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(person: PersonRow, next: boolean) {
    setSavingUser(person.userId);
    const { error } = await supabase.rpc('set_project_member_access', {
      _project_id: projectId,
      _user_id: person.userId,
      _active: next,
    });
    setSavingUser(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPeople((prev) =>
      prev.map((p) => (p.userId === person.userId ? { ...p, assigned: next } : p)),
    );
    toast.success(next ? `${person.name} added to this project` : `${person.name} removed from this project`);
  }

  if (!orgId) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Who works on this project</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        People set to "Assigned projects only" on your team page see this project only when switched on here.
        Admins always see every project.
      </p>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {people.map((person) => (
            <div
              key={person.userId}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{person.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {person.jobTitle || person.email}
                </p>
              </div>
              {person.isAdmin || person.scope === 'org' ? (
                <Badge variant="secondary" className="text-[0.65rem] shrink-0">
                  All projects
                </Badge>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  {savingUser === person.userId && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                  <Switch
                    checked={person.assigned}
                    disabled={savingUser === person.userId}
                    onCheckedChange={(v) => toggle(person, v)}
                  />
                </div>
              )}
            </div>
          ))}
          {people.length === 0 && (
            <p className="text-xs text-muted-foreground">No team members yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

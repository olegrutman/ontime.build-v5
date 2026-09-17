import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AssignableProject {
  id: string;
  name: string;
  status: string;
}

/**
 * Company-level project staffing.
 * Loads the projects this company can see plus every per-user assignment row,
 * so admins can add/remove people from projects without opening each project.
 */
export function useProjectAssignments(orgId?: string) {
  const [projects, setProjects] = useState<AssignableProject[]>([]);
  const [rows, setRows] = useState<{ project_id: string; user_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);

    const { data: projectData } = await supabase
      .from('projects')
      .select('id, name, status')
      .neq('status', 'archived')
      .order('name');

    const list = (projectData ?? []) as AssignableProject[];
    setProjects(list);

    if (list.length > 0) {
      const { data: memberData } = await supabase
        .from('project_members')
        .select('project_id, user_id, status')
        .in('project_id', list.map((p) => p.id));

      setRows(
        (memberData ?? [])
          .filter((m) => m.status === 'active')
          .map((m) => ({ project_id: m.project_id, user_id: m.user_id })),
      );
    } else {
      setRows([]);
    }

    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  /** userId -> set of assigned project ids */
  const assignmentsByUser = useMemo(() => {
    const map = new Map<string, Set<string>>();
    rows.forEach((r) => {
      if (!map.has(r.user_id)) map.set(r.user_id, new Set());
      map.get(r.user_id)!.add(r.project_id);
    });
    return map;
  }, [rows]);

  const setAccess = useCallback(
    async (projectId: string, userId: string, active: boolean) => {
      const key = `${projectId}:${userId}`;
      setSaving(key);
      const { error } = await supabase.rpc('set_project_member_access', {
        _project_id: projectId,
        _user_id: userId,
        _active: active,
      });
      setSaving(null);

      if (error) {
        toast.error(error.message);
        return false;
      }

      setRows((prev) => {
        const without = prev.filter((r) => !(r.project_id === projectId && r.user_id === userId));
        return active ? [...without, { project_id: projectId, user_id: userId }] : without;
      });
      return true;
    },
    [],
  );

  /** Give one person exactly the same projects as another teammate. */
  const copyAssignments = useCallback(
    async (fromUserId: string, toUserId: string) => {
      const source = assignmentsByUser.get(fromUserId) ?? new Set<string>();
      const target = assignmentsByUser.get(toUserId) ?? new Set<string>();

      const toAdd = [...source].filter((id) => !target.has(id));
      const toRemove = [...target].filter((id) => !source.has(id));

      if (toAdd.length === 0 && toRemove.length === 0) {
        toast.info('They already work on the same projects.');
        return true;
      }

      setSaving(`copy:${toUserId}`);
      let failed = 0;
      for (const projectId of toAdd) {
        const { error } = await supabase.rpc('set_project_member_access', {
          _project_id: projectId,
          _user_id: toUserId,
          _active: true,
        });
        if (error) failed += 1;
      }
      for (const projectId of toRemove) {
        const { error } = await supabase.rpc('set_project_member_access', {
          _project_id: projectId,
          _user_id: toUserId,
          _active: false,
        });
        if (error) failed += 1;
      }
      setSaving(null);
      await load();

      if (failed > 0) {
        toast.error(`${failed} project${failed === 1 ? '' : 's'} could not be updated.`);
        return false;
      }
      toast.success('Projects copied across.');
      return true;
    },
    [assignmentsByUser, load],
  );

  /** How many people are still on a project (used to warn before emptying it). */
  const peopleOnProject = useCallback(
    (projectId: string) => rows.filter((r) => r.project_id === projectId).length,
    [rows],
  );

  return {
    projects,
    assignmentsByUser,
    loading,
    saving,
    setAccess,
    copyAssignments,
    peopleOnProject,
    refetch: load,
  };
}

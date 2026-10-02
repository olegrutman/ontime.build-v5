import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Grid3x3 } from 'lucide-react';
import type { AssignableProject } from '@/hooks/useProjectAssignments';

interface MatrixMember {
  userId: string;
  name: string;
  restricted: boolean;
}

interface Props {
  members: MatrixMember[];
  projects: AssignableProject[];
  assignmentsByUser: Map<string, Set<string>>;
  loading: boolean;
  saving: string | null;
  onToggle: (projectId: string, userId: string, active: boolean) => void;
}

/**
 * People down the side, projects across the top — one grid for staffing
 * several people onto several projects at once.
 */
export function ProjectAssignmentMatrix({
  members,
  projects,
  assignmentsByUser,
  loading,
  saving,
  onToggle,
}: Props) {
  return (
    <div className="bg-card border border-border rounded-lg px-3.5 py-3.5">
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <Grid3x3 className="h-4 w-4 text-muted-foreground" />
          <p className="text-[0.7rem] uppercase tracking-[0.4px] text-muted-foreground font-medium">
            Project Assignments
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Tick a box to put someone on a project. People set to "All company projects" already see
          everything.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : projects.length === 0 || members.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {projects.length === 0 ? 'No active projects yet.' : 'No team members yet.'}
        </p>
      ) : (
        <>
        <div className="space-y-2 sm:hidden">
          {members.map((m) => {
            const assigned = assignmentsByUser.get(m.userId) ?? new Set<string>();
            return (
              <div key={m.userId} className="rounded-lg border border-border px-3 py-3">
                <div className="mb-2 flex min-w-0 flex-col items-start gap-1.5 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between">
                  <span className="min-w-0 break-words text-sm font-medium text-foreground">{m.name}</span>
                  {!m.restricted && <Badge variant="secondary" className="text-[0.65rem]">All projects</Badge>}
                </div>
                {m.restricted ? (
                  <div className="space-y-1.5">
                    {projects.map((p) => {
                      const key = `${p.id}:${m.userId}`;
                      return (
                        <label key={p.id} className="flex min-h-11 items-center gap-3 rounded-md bg-muted/30 px-3 py-2">
                          {saving === key ? (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                          ) : (
                            <Checkbox className="!h-5 !w-5 aspect-square self-start" checked={assigned.has(p.id)} onCheckedChange={(v) => onToggle(p.id, m.userId, v === true)} />
                          )}
                           <span className="min-w-0 flex-1 break-words text-sm leading-snug text-foreground">{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">This person can access every company project.</p>
                )}
              </div>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="text-left align-bottom pb-2 pr-3 text-[0.7rem] uppercase tracking-[0.4px] text-muted-foreground font-medium">
                  Person
                </th>
                {projects.map((p) => (
                  <th
                    key={p.id}
                    className="pb-2 px-2 text-[0.7rem] font-medium text-muted-foreground align-bottom"
                  >
                    <span className="block max-w-[7rem] truncate mx-auto" title={p.name}>
                      {p.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const assigned = assignmentsByUser.get(m.userId) ?? new Set<string>();
                return (
                  <tr key={m.userId} className="border-t border-border">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <span className="text-sm text-foreground">{m.name}</span>
                      {!m.restricted && (
                        <Badge variant="secondary" className="ml-2 text-[0.65rem]">
                          All projects
                        </Badge>
                      )}
                    </td>
                    {projects.map((p) => {
                      const key = `${p.id}:${m.userId}`;
                      return (
                        <td key={p.id} className="py-2 px-2 text-center">
                          {m.restricted ? (
                            saving === key ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground mx-auto" />
                            ) : (
                              <Checkbox
                                checked={assigned.has(p.id)}
                                onCheckedChange={(v) => onToggle(p.id, m.userId, v === true)}
                              />
                            )
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { AssignableProject } from '@/hooks/useProjectAssignments';

interface Teammate {
  userId: string;
  name: string;
}

interface Props {
  userId: string;
  projects: AssignableProject[];
  assignedIds: Set<string>;
  loading: boolean;
  saving: string | null;
  onToggle: (projectId: string, active: boolean) => void;
  /** Other teammates whose project list can be copied across */
  teammates: Teammate[];
  onCopyFrom: (fromUserId: string) => void;
}

/**
 * The per-person project list shown inside the member dialog:
 * tick a project to put them on it, untick to take them off.
 */
export function MemberProjectAssignments({
  userId,
  projects,
  assignedIds,
  loading,
  saving,
  onToggle,
  teammates,
  onCopyFrom,
}: Props) {
  const [copyFrom, setCopyFrom] = useState('');

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projects.length === 0) {
    return <p className="text-xs text-muted-foreground">No active projects yet.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {assignedIds.size} of {projects.length} projects
        </p>
        {teammates.length > 0 && (
          <div className="flex w-full flex-col gap-2 sm:grid sm:w-auto sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <Select value={copyFrom} onValueChange={setCopyFrom}>
              <SelectTrigger className="h-10 w-full min-w-0 text-xs sm:h-7 sm:w-[150px]">
                <SelectValue placeholder="Copy from…" />
              </SelectTrigger>
              <SelectContent>
                {teammates.map((t) => (
                  <SelectItem key={t.userId} value={t.userId}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-10 w-full px-4 text-xs sm:h-7 sm:w-auto"
              disabled={!copyFrom || saving === `copy:${userId}`}
              onClick={() => {
                onCopyFrom(copyFrom);
                setCopyFrom('');
              }}
            >
              {saving === `copy:${userId}` ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Copy'}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-1.5 sm:max-h-64 sm:overflow-y-auto sm:pr-1">
        {projects.map((project) => {
          const key = `${project.id}:${userId}`;
          const checked = assignedIds.has(project.id);
          return (
            <label
              key={project.id}
              className="flex min-h-12 min-w-0 items-start gap-2.5 rounded-lg border border-border px-3 py-2.5 cursor-pointer hover:bg-muted/50"
            >
              <Checkbox
                className="mt-0.5 !h-5 !w-5 aspect-square self-start"
                checked={checked}
                disabled={saving === key}
                onCheckedChange={(v) => onToggle(project.id, v === true)}
              />
              <span className="min-w-0 flex-1 break-words text-sm leading-snug text-foreground">{project.name}</span>
              {project.status === 'completed' && (
                <Badge variant="secondary" className="text-[0.65rem]">
                  Completed
                </Badge>
              )}
              {saving === key && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </label>
          );
        })}
      </div>
    </div>
  );
}

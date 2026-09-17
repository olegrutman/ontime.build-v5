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
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {assignedIds.size} of {projects.length} projects
        </p>
        {teammates.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Select value={copyFrom} onValueChange={setCopyFrom}>
              <SelectTrigger className="h-7 w-[150px] text-xs">
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
              className="h-7 text-xs"
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

      <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
        {projects.map((project) => {
          const key = `${project.id}:${userId}`;
          const checked = assignedIds.has(project.id);
          return (
            <label
              key={project.id}
              className="flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-2 cursor-pointer hover:bg-muted/50"
            >
              <Checkbox
                checked={checked}
                disabled={saving === key}
                onCheckedChange={(v) => onToggle(project.id, v === true)}
              />
              <span className="text-sm text-foreground truncate flex-1">{project.name}</span>
              {project.status === 'completed' && (
                <Badge variant="secondary" className="text-[0.65rem] shrink-0">
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

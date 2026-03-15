import { WorkOrderTask, WorkOrderTaskStatus } from '@/types/workOrderTask';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Camera, Package, Truck, Pencil, Trash2, Play, CheckCircle2, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WORK_TYPE_LABELS } from '@/types/changeOrderProject';

const STATUS_CONFIG: Record<WorkOrderTaskStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-muted-foreground' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500' },
  complete: { label: 'Complete', color: 'bg-green-500' },
  skipped: { label: 'Skipped', color: 'bg-muted-foreground/50' },
};

function formatTaskLocation(loc: Record<string, string | undefined>): string | null {
  const parts: string[] = [];
  if (loc.level) parts.push(loc.level);
  if (loc.room_area && loc.room_area !== 'Other') parts.push(loc.room_area);
  else if (loc.custom_room_area) parts.push(loc.custom_room_area);
  if (loc.exterior_feature) {
    const formatted = loc.exterior_feature
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    parts.push(formatted);
  }
  return parts.length > 0 ? parts.join(' / ') : null;
}

interface WorkOrderTaskCardProps {
  task: WorkOrderTask;
  index: number;
  isEditable: boolean;
  onEdit: (task: WorkOrderTask) => void;
  onStatusChange: (taskId: string, status: WorkOrderTaskStatus) => void;
  onDelete: (taskId: string) => void;
}

export function WorkOrderTaskCard({
  task,
  index,
  isEditable,
  onEdit,
  onStatusChange,
  onDelete,
}: WorkOrderTaskCardProps) {
  const status = STATUS_CONFIG[task.status];
  const location = formatTaskLocation(task.location_data || {});

  return (
    <div className={cn(
      'rounded-lg border bg-card p-3 space-y-1.5 transition-colors',
      task.status === 'complete' && 'opacity-70',
      task.status === 'skipped' && 'opacity-50',
    )}>
      {/* Top row: status + location + menu */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('w-2 h-2 rounded-full shrink-0', status.color)} />
          <span className="text-xs font-medium text-muted-foreground">{status.label}</span>
          {location && (
            <Badge variant="outline" className="text-xs truncate max-w-[180px]">
              {location}
            </Badge>
          )}
        </div>

        {isEditable && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              {task.status === 'pending' && (
                <DropdownMenuItem onClick={() => onStatusChange(task.id, 'in_progress')}>
                  <Play className="w-3.5 h-3.5 mr-2" /> Start
                </DropdownMenuItem>
              )}
              {(task.status === 'pending' || task.status === 'in_progress') && (
                <DropdownMenuItem onClick={() => onStatusChange(task.id, 'complete')}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Complete
                </DropdownMenuItem>
              )}
              {task.status !== 'skipped' && task.status !== 'complete' && (
                <DropdownMenuItem onClick={() => onStatusChange(task.id, 'skipped')}>
                  <SkipForward className="w-3.5 h-3.5 mr-2" /> Skip
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(task.id)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Title / description */}
      <p className={cn(
        'text-sm font-medium',
        task.status === 'complete' && 'line-through',
      )}>
        {task.title || task.description || `Task ${index + 1}`}
      </p>
      {task.title && task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
      )}

      {/* Work type + resource badges */}
      <div className="flex flex-wrap gap-1.5">
        {task.work_type && (
          <Badge variant="secondary" className="text-xs">
            {WORK_TYPE_LABELS[task.work_type] || task.work_type}
          </Badge>
        )}
        {task.photo_url && <Camera className="w-3.5 h-3.5 text-muted-foreground" />}
        {task.requires_materials && <Package className="w-3.5 h-3.5 text-muted-foreground" />}
        {task.requires_equipment && <Truck className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>
    </div>
  );
}

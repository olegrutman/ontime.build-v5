import { WorkOrderTask, WorkOrderTaskStatus } from '@/types/workOrderTask';
import { WorkOrderTaskCard } from './WorkOrderTaskCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ListChecks } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WorkOrderTaskListProps {
  tasks: WorkOrderTask[];
  isLoading: boolean;
  isEditable: boolean;
  onAddTask: () => void;
  onEditTask: (task: WorkOrderTask) => void;
  onStatusChange: (taskId: string, status: WorkOrderTaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
}

export function WorkOrderTaskList({
  tasks,
  isLoading,
  isEditable,
  onAddTask,
  onEditTask,
  onStatusChange,
  onDeleteTask,
}: WorkOrderTaskListProps) {
  const completedCount = tasks.filter(t => t.status === 'complete').length;
  const totalCount = tasks.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="w-4 h-4" />
            Tasks
            {totalCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {completedCount}/{totalCount}
              </Badge>
            )}
          </CardTitle>
          {isEditable && (
            <Button size="sm" variant="outline" onClick={onAddTask} className="gap-1">
              <Plus className="w-3.5 h-3.5" />
              Add Task
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">Loading tasks…</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-sm text-muted-foreground">No tasks added yet</p>
            {isEditable && (
              <Button size="sm" onClick={onAddTask} className="gap-1">
                <Plus className="w-3.5 h-3.5" />
                Add First Task
              </Button>
            )}
          </div>
        ) : (
          tasks.map((task, i) => (
            <WorkOrderTaskCard
              key={task.id}
              task={task}
              index={i}
              isEditable={isEditable}
              onEdit={onEditTask}
              onStatusChange={onStatusChange}
              onDelete={onDeleteTask}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

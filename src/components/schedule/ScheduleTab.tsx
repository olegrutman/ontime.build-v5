import { useState } from 'react';
import { Plus, Milestone, Layers, CalendarDays, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectSchedule, ScheduleItem } from '@/hooks/useProjectSchedule';
import { GanttChart } from './GanttChart';
import { ScheduleItemForm } from './ScheduleItemForm';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  phase: { label: 'Phase', className: 'bg-primary/10 text-primary' },
  task: { label: 'Task', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  milestone: { label: 'Milestone', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
};

interface ScheduleTabProps {
  projectId: string;
}

export function ScheduleTab({ projectId }: ScheduleTabProps) {
  const { items, isLoading, addItem, updateItem, deleteItem } = useProjectSchedule(projectId);
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [defaultType, setDefaultType] = useState<'task' | 'phase' | 'milestone'>('task');

  // Fetch work orders for linking
  const { data: workOrders = [] } = useQuery({
    queryKey: ['schedule-work-orders', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('change_order_projects')
        .select('id, title, status')
        .eq('project_id', projectId)
        .in('status', ['approved', 'contracted']);
      return data || [];
    },
    enabled: !!projectId,
  });

  const handleAdd = (type: 'task' | 'phase' | 'milestone') => {
    setDefaultType(type);
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: ScheduleItem) => {
    setEditingItem(item);
    setDefaultType(item.item_type);
    setFormOpen(true);
  };

  const handleSave = async (data: Partial<ScheduleItem>) => {
    try {
      if (data.id) {
        await updateItem.mutateAsync(data as any);
        toast({ title: 'Schedule item updated' });
      } else {
        await addItem.mutateAsync({
          ...data,
          title: data.title!,
          start_date: data.start_date!,
          item_type: data.item_type || defaultType,
        } as any);
        toast({ title: 'Schedule item added' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteItem.mutateAsync(deleteTarget);
      toast({ title: 'Item deleted' });
      if (selectedId === deleteTarget) setSelectedId(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setDeleteTarget(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => handleAdd('task')} className="gap-1.5">
          <Plus className="h-4 w-4" /> Task
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleAdd('phase')} className="gap-1.5">
          <Layers className="h-4 w-4" /> Phase
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleAdd('milestone')} className="gap-1.5">
          <Milestone className="h-4 w-4" /> Milestone
        </Button>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {items.length} item{items.length !== 1 ? 's' : ''}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <CalendarDays className="h-10 w-10 opacity-40" />
          <p className="text-sm">No schedule items yet. Add a task, phase, or milestone to get started.</p>
        </div>
      ) : (
        <>
          {/* Gantt Chart */}
          <GanttChart items={items} selectedId={selectedId} onSelect={setSelectedId} />

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead className="w-28">Start</TableHead>
                  <TableHead className="w-28">End</TableHead>
                  <TableHead className="w-20 text-right">Progress</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => {
                  const badge = TYPE_BADGE[item.item_type] || TYPE_BADGE.task;
                  const wo = workOrders.find(w => w.id === item.work_order_id);
                  return (
                    <TableRow
                      key={item.id}
                      className={selectedId === item.id ? 'bg-accent/40' : 'cursor-pointer'}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{item.title}</span>
                          {wo && (
                            <span className="text-[10px] text-muted-foreground">WO: {wo.title}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={badge.className}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{format(new Date(item.start_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-sm">{item.end_date ? format(new Date(item.end_date), 'MMM d, yyyy') : '—'}</TableCell>
                      <TableCell className="text-right text-sm">{item.progress}%</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); handleEdit(item); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget(item.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Form Dialog */}
      <ScheduleItemForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        item={editingItem}
        workOrders={workOrders}
        existingItems={items}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete schedule item?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

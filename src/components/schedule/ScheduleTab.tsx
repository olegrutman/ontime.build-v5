import { useState, useCallback, useRef } from 'react';
import { Plus, Milestone, Layers, CalendarDays, Trash2, ChevronDown, ChevronRight, Wand2, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useProjectSchedule, ScheduleItem } from '@/hooks/useProjectSchedule';
import { GanttChart } from './GanttChart';
import { GanttToolbar, ZoomLevel } from './GanttToolbar';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { CascadeConfirmDialog } from './CascadeConfirmDialog';
import { CascadeBottomSheet } from './CascadeBottomSheet';
import { MobileScheduleView } from './MobileScheduleView';
import { ScheduleItemForm } from './ScheduleItemForm';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScheduleOwnership } from '@/hooks/useScheduleOwnership';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { estimateDuration, addBusinessDays } from '@/utils/scheduleEstimates';
import { findDownstreamTasks, cascadeFromTask, findCriticalPath, detectConflicts } from '@/utils/cascadeSchedule';
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

interface PendingCascade {
  taskId: string;
  newStart: string;
  newEnd: string;
  downstreamIds: string[];
}

export function ScheduleTab({ projectId }: ScheduleTabProps) {
  const { items, isLoading, addItem, updateItem, deleteItem } = useProjectSchedule(projectId);
  const { canEditSchedule, ownerRole, isLoading: ownershipLoading } = useScheduleOwnership(projectId);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [defaultType, setDefaultType] = useState<'task' | 'phase' | 'milestone'>('task');
  const [ganttOpen, setGanttOpen] = useState(true);
  const [tableOpen, setTableOpen] = useState(true);
  const [estimating, setEstimating] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // New state
  const [zoom, setZoom] = useState<ZoomLevel>('day');
  const [criticalPathEnabled, setCriticalPathEnabled] = useState(false);
  const [drawerItem, setDrawerItem] = useState<ScheduleItem | null>(null);
  const [pendingCascade, setPendingCascade] = useState<PendingCascade | null>(null);
  const [conflictIds, setConflictIds] = useState<Set<string>>(new Set());
  const [undoSnapshot, setUndoSnapshot] = useState<{ items: ScheduleItem[]; updates: { id: string; start_date: string; end_date: string }[] } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>();

  const criticalPathIds = criticalPathEnabled ? findCriticalPath(items) : new Set<string>();

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

  const overallProgress = items.length > 0
    ? Math.round(items.reduce((sum, i) => sum + i.progress, 0) / items.length)
    : 0;

  const handleAdd = (type: 'task' | 'phase' | 'milestone') => {
    setDefaultType(type);
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: ScheduleItem) => {
    if (isMobile) {
      setEditingItem(item);
      setDefaultType(item.item_type);
      setFormOpen(true);
    } else {
      setDrawerItem(item);
    }
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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setDeleteTarget(null);
  };

  const handleDrawerUpdate = async (id: string, updates: Partial<ScheduleItem>) => {
    try {
      await updateItem.mutateAsync({ id, ...updates } as any);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Unified handler for drag end / date change that checks for downstream tasks
  const handleScheduleChange = useCallback((taskId: string, newStart: string, newEnd: string) => {
    const downstream = findDownstreamTasks(itemsRef.current, taskId);
    if (downstream.length > 0) {
      setPendingCascade({ taskId, newStart, newEnd, downstreamIds: downstream });
    } else {
      applyUpdate(taskId, newStart, newEnd);
    }
  }, []);

  const applyUpdate = useCallback(async (taskId: string, newStart: string, newEnd: string) => {
    const currentItems = itemsRef.current;
    // Save undo snapshot
    const prevUpdates = [{ id: taskId, start_date: currentItems.find(i => i.id === taskId)!.start_date, end_date: currentItems.find(i => i.id === taskId)!.end_date || newEnd }];
    setUndoSnapshot({ items: currentItems, updates: prevUpdates });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoSnapshot(null), 5000);

    try {
      await updateItem.mutateAsync({ id: taskId, start_date: newStart, end_date: newEnd } as any);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }, [updateItem, toast]);

  const handleCascade = async () => {
    if (!pendingCascade) return;
    const { taskId, newStart, newEnd } = pendingCascade;
    const result = cascadeFromTask(items, taskId, newStart, newEnd);

    // Save undo
    const allUpdates = [
      { id: taskId, start_date: items.find(i => i.id === taskId)!.start_date, end_date: items.find(i => i.id === taskId)!.end_date || newEnd },
      ...Array.from(result.updates.entries()).map(([id, dates]) => ({
        id,
        start_date: items.find(i => i.id === id)!.start_date,
        end_date: items.find(i => i.id === id)!.end_date || dates.end_date,
      })),
    ];
    setUndoSnapshot({ items, updates: allUpdates });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoSnapshot(null), 5000);

    try {
      await updateItem.mutateAsync({ id: taskId, start_date: newStart, end_date: newEnd } as any);
      for (const [id, dates] of result.updates) {
        await updateItem.mutateAsync({ id, ...dates } as any);
      }
      setConflictIds(new Set());
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setPendingCascade(null);
  };

  const handleKeepOthers = async () => {
    if (!pendingCascade) return;
    const { taskId, newStart, newEnd, downstreamIds } = pendingCascade;
    await applyUpdate(taskId, newStart, newEnd);
    setConflictIds(new Set(downstreamIds));
    setPendingCascade(null);
  };

  const handleCancelCascade = () => {
    setPendingCascade(null);
  };

  const handleUndo = async () => {
    if (!undoSnapshot) return;
    try {
      for (const upd of undoSnapshot.updates) {
        await updateItem.mutateAsync({ id: upd.id, start_date: upd.start_date, end_date: upd.end_date } as any);
      }
      setConflictIds(new Set());
      toast({ title: 'Changes undone' });
    } catch (err: any) {
      toast({ title: 'Undo failed', description: err.message, variant: 'destructive' });
    }
    setUndoSnapshot(null);
  };

  // Mobile handlers
  const handleAdjustDuration = (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const end = item.end_date || item.start_date;
    const newEnd = format(addDays(new Date(end), delta), 'yyyy-MM-dd');
    if (new Date(newEnd) <= new Date(item.start_date)) return;
    handleScheduleChange(id, item.start_date, newEnd);
  };

  const handleMobileStartChange = (id: string, date: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const duration = item.end_date ? differenceInDays(new Date(item.end_date), new Date(item.start_date)) : 0;
    const newEnd = format(addDays(new Date(date), duration), 'yyyy-MM-dd');
    handleScheduleChange(id, date, newEnd);
  };

  const handleAutoEstimate = async () => {
    const unscheduled = items.filter(i => !i.end_date && i.item_type !== 'milestone');
    if (unscheduled.length === 0) {
      toast({ title: 'All items already have end dates' });
      return;
    }
    setEstimating(true);
    try {
      let cursor = new Date(Math.min(...unscheduled.map(i => new Date(i.start_date).getTime())));
      for (const item of unscheduled) {
        const valueAmount = item.sov_item?.value_amount ?? 0;
        const days = estimateDuration(item.title, valueAmount);
        const itemStart = new Date(item.start_date) >= cursor ? new Date(item.start_date) : cursor;
        const endDate = addBusinessDays(itemStart, days);
        await updateItem.mutateAsync({
          id: item.id,
          start_date: format(itemStart, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
        } as any);
        cursor = addBusinessDays(endDate, 0);
      }
      toast({ title: `Estimated dates for ${unscheduled.length} items` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setEstimating(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const hasUnscheduled = items.some(i => !i.end_date && i.item_type !== 'milestone');

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
        {hasUnscheduled && (
          <Button size="sm" variant="secondary" onClick={handleAutoEstimate} disabled={estimating} className="gap-1.5">
            <Wand2 className="h-4 w-4" />
            {estimating ? 'Estimating…' : 'Auto-Estimate'}
          </Button>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {items.length} item{items.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Overall Progress */}
      {items.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Overall: {overallProgress}%</span>
          <Progress value={overallProgress} className="h-2 flex-1" />
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <CalendarDays className="h-10 w-10 opacity-40" />
          <p className="text-sm">No schedule items yet. Add a task, phase, or milestone to get started.</p>
        </div>
      ) : isMobile ? (
        /* Mobile Card View */
        <MobileScheduleView
          items={items}
          conflicts={conflictIds}
          onAdjustDuration={handleAdjustDuration}
          onChangeStartDate={handleMobileStartChange}
        />
      ) : (
        <>
          {/* Desktop Gantt */}
          <Collapsible open={ganttOpen} onOpenChange={setGanttOpen}>
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1">
                  {ganttOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Gantt Chart
                </button>
              </CollapsibleTrigger>
              {ganttOpen && (
                <GanttToolbar
                  zoom={zoom}
                  onZoomChange={setZoom}
                  criticalPath={criticalPathEnabled}
                  onCriticalPathToggle={() => setCriticalPathEnabled(p => !p)}
                  undoAvailable={!!undoSnapshot}
                  onUndo={handleUndo}
                />
              )}
            </div>
            <CollapsibleContent>
              <GanttChart
                items={items}
                selectedId={drawerItem?.id ?? null}
                onSelect={(id) => {
                  const found = items.find(i => i.id === id);
                  if (found) handleEdit(found);
                }}
                onDragEnd={(id, updates) => handleScheduleChange(id, updates.start_date, updates.end_date)}
                zoom={zoom}
                criticalPathIds={criticalPathIds}
                conflictIds={conflictIds}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Table */}
          <Collapsible open={tableOpen} onOpenChange={setTableOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-1">
                {tableOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Schedule Items
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-24">Type</TableHead>
                      <TableHead className="w-28">Start</TableHead>
                      <TableHead className="w-28">End</TableHead>
                      <TableHead className="w-20 text-right">Progress</TableHead>
                      <TableHead className="w-20 text-right">Billed</TableHead>
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
                          className={`cursor-pointer hover:bg-accent/40 ${conflictIds.has(item.id) ? 'bg-destructive/5' : ''}`}
                          onClick={() => handleEdit(item)}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{item.title}</span>
                              {wo && <span className="text-[10px] text-muted-foreground">WO: {wo.title}</span>}
                              {item.sov_item && <span className="text-[10px] text-muted-foreground">SOV: {item.sov_item.item_name}</span>}
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="secondary" className={badge.className}>{badge.label}</Badge></TableCell>
                          <TableCell className="text-sm">{format(new Date(item.start_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="text-sm">{item.end_date ? format(new Date(item.end_date), 'MMM d, yyyy') : '—'}</TableCell>
                          <TableCell className="text-right text-sm">{item.progress}%</TableCell>
                          <TableCell className="text-right text-sm">
                            {item.sov_item ? (
                              <span className={`${item.sov_item.billing_progress > item.progress ? 'text-amber-600' :
                                item.progress > item.sov_item.billing_progress ? 'text-green-600' : ''}`}>
                                {item.sov_item.billing_progress}%
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget(item.id); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {/* Detail Drawer (desktop) */}
      <TaskDetailDrawer
        open={!!drawerItem}
        onOpenChange={open => { if (!open) setDrawerItem(null); }}
        item={drawerItem}
        items={items}
        onUpdate={handleDrawerUpdate}
        onDateChange={handleScheduleChange}
      />

      {/* Schedule Item Form (mobile / add new) */}
      <ScheduleItemForm
        key={editingItem?.id ?? 'new'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        item={editingItem}
        workOrders={workOrders}
        existingItems={items}
        projectId={projectId}
      />

      {/* Cascade Confirmation */}
      {!isMobile ? (
        <CascadeConfirmDialog
          open={!!pendingCascade}
          onOpenChange={open => { if (!open) handleCancelCascade(); }}
          downstreamCount={pendingCascade?.downstreamIds.length ?? 0}
          onCascade={handleCascade}
          onKeepOthers={handleKeepOthers}
          onCancel={handleCancelCascade}
        />
      ) : (
        <CascadeBottomSheet
          open={!!pendingCascade}
          onOpenChange={open => { if (!open) handleCancelCascade(); }}
          downstreamCount={pendingCascade?.downstreamIds.length ?? 0}
          onCascade={handleCascade}
          onKeepOthers={handleKeepOthers}
          onCancel={handleCancelCascade}
        />
      )}

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

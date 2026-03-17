import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useFieldCapturesByWorkOrder } from '@/hooks/useFieldCapturesByWorkOrder';
import { useWorkOrderTasks } from '@/hooks/useWorkOrderTasks';
import { FieldCaptureSheet } from '@/components/field-capture';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Plus, Send, Camera, Mic, StickyNote, Trash2, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export function FieldCaptureDraftPage() {
  const { id: workOrderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userOrgRoles } = useAuth();
  const userOrgId = userOrgRoles.length > 0 ? userOrgRoles[0].organization_id : undefined;

  const [showCapture, setShowCapture] = useState(false);

  // Fetch the WO header
  const { data: workOrder, isLoading: woLoading } = useQuery({
    queryKey: ['wo-header', workOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_order_projects')
        .select('id, title, status, project_id, created_at')
        .eq('id', workOrderId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!workOrderId,
  });

  // Fetch project name
  const { data: project } = useQuery({
    queryKey: ['project-name', workOrder?.project_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('name')
        .eq('id', workOrder!.project_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!workOrder?.project_id,
  });

  const { captures, isLoading: capturesLoading } = useFieldCapturesByWorkOrder(workOrderId);
  const { tasks, isLoading: tasksLoading, addTask, deleteTask } = useWorkOrderTasks(workOrderId);

  const handleCaptureComplete = useCallback(async (captureId: string, captureData: { description?: string; photo_url?: string | null; voice_note_url?: string | null; reason_category?: string | null }) => {
    if (!workOrderId) return;
    try {
      // Link capture to this WO
      await supabase.from('field_captures')
        .update({ converted_work_order_id: workOrderId, status: 'converted' } as never)
        .eq('id', captureId);

      // Auto-create a task from the capture
      await addTask.mutateAsync({
        title: captureData.description || 'Field Capture',
        description: captureData.description || undefined,
        photo_url: captureData.photo_url || undefined,
        voice_note_url: captureData.voice_note_url || undefined,
        reason: captureData.reason_category || undefined,
        field_capture_id: captureId,
      });

      setShowCapture(false);
      toast({ title: 'Capture added to draft' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to add capture', description: err.message });
    }
  }, [workOrderId, addTask, toast]);

  const handleSubmit = async () => {
    if (tasks.length === 0) {
      toast({ variant: 'destructive', title: 'Add at least one capture before submitting' });
      return;
    }
    try {
      const { error } = await supabase
        .from('change_order_projects')
        .update({ status: 'ready_for_approval', converted_at: new Date().toISOString() } as never)
        .eq('id', workOrderId!);
      if (error) throw error;
      toast({ title: 'Work order submitted for approval' });
      navigate(`/change-order/${workOrderId}`);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to submit', description: err.message });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask.mutateAsync(taskId);
      toast({ title: 'Task removed' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to remove task', description: err.message });
    }
  };

  if (woLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
        <p className="text-muted-foreground">Work order not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate font-display">{workOrder.title}</h1>
            <p className="text-xs text-muted-foreground truncate">{project?.name || 'Loading…'}</p>
          </div>
          <Badge variant="secondary" className="shrink-0">Draft</Badge>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Summary strip */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Camera className="h-4 w-4" /> {captures.length} capture{captures.length !== 1 ? 's' : ''}</span>
          <span className="flex items-center gap-1"><StickyNote className="h-4 w-4" /> {tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Tasks / Captures list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Tasks</h2>
          {tasksLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : tasks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Camera className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No tasks yet. Add a capture to get started.</p>
              </CardContent>
            </Card>
          ) : (
            tasks.map((task) => (
              <Card key={task.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    {task.photo_url && (
                      <img
                        src={task.photo_url}
                        alt=""
                        className="h-16 w-16 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{task.title || 'Untitled'}</p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {task.reason && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{task.reason}</Badge>
                        )}
                        {task.voice_note_url && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Mic className="h-3 w-3" /> Voice</span>
                        )}
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0 self-start"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Add Capture button */}
        <Button
          variant="outline"
          className="w-full min-h-[48px] rounded-xl border-dashed"
          onClick={() => setShowCapture(true)}
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Capture
        </Button>
      </div>

      {/* Bottom sticky submit */}
      <div className="sticky bottom-0 bg-background border-t border-border px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleSubmit}
            className="w-full min-h-[56px] rounded-xl text-base font-bold"
            size="lg"
            disabled={tasks.length === 0}
          >
            <Send className="h-5 w-5 mr-2" />
            Submit for Approval ({tasks.length})
          </Button>
        </div>
      </div>

      {/* Field Capture Sheet */}
      {userOrgId && workOrder.project_id && (
        <FieldCaptureSheet
          open={showCapture}
          onOpenChange={setShowCapture}
          projectId={workOrder.project_id}
          organizationId={userOrgId}
          onCaptureComplete={handleCaptureComplete}
        />
      )}
    </div>
  );
}

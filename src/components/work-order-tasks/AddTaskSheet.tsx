import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { WorkOrderTask } from '@/types/workOrderTask';
import { ROOM_AREA_OPTIONS } from '@/types/workOrderWizard';
import { WORK_TYPE_OPTIONS, WORK_TYPE_LABELS } from '@/types/changeOrderProject';

interface AddTaskSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (task: {
    title?: string;
    description?: string;
    location_data?: Record<string, string | undefined>;
    work_type?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  editTask?: WorkOrderTask | null;
}

export function AddTaskSheet({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  editTask,
}: AddTaskSheetProps) {
  const [title, setTitle] = useState(editTask?.title || '');
  const [description, setDescription] = useState(editTask?.description || '');
  const [level, setLevel] = useState((editTask?.location_data as any)?.level || '');
  const [roomArea, setRoomArea] = useState((editTask?.location_data as any)?.room_area || '');
  const [workType, setWorkType] = useState(editTask?.work_type || '');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLevel('');
    setRoomArea('');
    setWorkType('');
  };

  const handleSubmit = async () => {
    await onSubmit({
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      location_data: {
        ...(level ? { level, inside_outside: 'inside' } : {}),
        ...(roomArea ? { room_area: roomArea } : {}),
      },
      work_type: workType || undefined,
    });
    resetForm();
    onOpenChange(false);
  };

  const isValid = title.trim() || description.trim();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{editTask ? 'Edit Task' : 'Add Task'}</SheetTitle>
          <SheetDescription>
            {editTask ? 'Update this task item' : 'Add a task to this work order'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              placeholder="e.g. Re-frame header above doorway"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-desc">Description (optional)</Label>
            <Textarea
              id="task-desc"
              placeholder="Additional details…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {['Floor 1', 'Floor 2', 'Floor 3', 'Basement', 'Attic'].map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Room / Area</Label>
              <Select value={roomArea} onValueChange={setRoomArea}>
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_AREA_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Work Type</Label>
            <Select value={workType} onValueChange={setWorkType}>
              <SelectTrigger>
                <SelectValue placeholder="Select work type" />
              </SelectTrigger>
              <SelectContent>
                {WORK_TYPE_OPTIONS.map((wt) => (
                  <SelectItem key={wt} value={wt}>
                    {WORK_TYPE_LABELS[wt] || wt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="w-full gap-1"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {editTask ? 'Update Task' : 'Add Task'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

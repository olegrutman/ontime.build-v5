import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ScheduleItem } from '@/hooks/useProjectSchedule';
import { useProjectSOVItems } from '@/hooks/useProjectSOVItems';

interface ScheduleItemFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (item: Partial<ScheduleItem>) => void;
  item?: ScheduleItem | null;
  workOrders?: { id: string; title: string; status: string }[];
  existingItems?: ScheduleItem[];
  projectId: string;
}

export function ScheduleItemForm({ open, onClose, onSave, item, workOrders = [], existingItems = [], projectId }: ScheduleItemFormProps) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [itemType, setItemType] = useState<string>(item?.item_type ?? 'task');
  const [startDate, setStartDate] = useState(item?.start_date ?? new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(item?.end_date ?? '');
  const [progress, setProgress] = useState(item?.progress ?? 0);
  const [workOrderId, setWorkOrderId] = useState(item?.work_order_id ?? '');
  const [sovItemId, setSovItemId] = useState(item?.sov_item_id ?? '');
  const [depIds, setDepIds] = useState<string[]>(item?.dependency_ids ?? []);
  
  const { data: sovItems = [] } = useProjectSOVItems(projectId);

  const isSovLinked = !!item?.sov_item_id;

  const handleWOChange = (woId: string) => {
    setWorkOrderId(woId === 'none' ? '' : woId);
    if (woId !== 'none') {
      const wo = workOrders.find(w => w.id === woId);
      if (wo && !title) setTitle(wo.title);
    }
  };

  const handleSave = () => {
    if (!title.trim() || !startDate) return;
    onSave({
      ...(item?.id ? { id: item.id } : {}),
      title: title.trim(),
      item_type: itemType as ScheduleItem['item_type'],
      start_date: startDate,
      end_date: itemType === 'milestone' ? null : (endDate || null),
      progress,
      work_order_id: workOrderId || null,
      sov_item_id: sovItemId || item?.sov_item_id || null,
      dependency_ids: depIds,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isSovLinked ? 'Edit SOV Schedule Item' : (item ? 'Edit Schedule Item' : 'New Schedule Item')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {item ? 'Edit schedule item details' : 'Create a new schedule item'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Title - read-only for SOV-linked items */}
          <div className="space-y-1.5">
            <Label>Title</Label>
            {isSovLinked ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium py-2 px-3 bg-muted rounded-md w-full">{title}</span>
              </div>
            ) : (
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task name" />
            )}
          </div>

          {/* Type - hidden for SOV-linked */}
          {!isSovLinked && (
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={itemType} onValueChange={setItemType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="phase">Phase</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dates - always shown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            {(isSovLinked || itemType !== 'milestone') && (
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            )}
          </div>

          {/* Progress - always shown for SOV-linked, or when not milestone */}
          {(isSovLinked || itemType !== 'milestone') && (
            <div className="space-y-1.5">
              <Label>Progress: {progress}%</Label>
              <Slider value={[progress]} onValueChange={v => setProgress(v[0])} max={100} step={5} />
            </div>
          )}

          {/* SOV badge for linked items */}
          {isSovLinked && item?.sov_item && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
              Linked to SOV: <span className="font-medium">{item.sov_item.item_name}</span>
              {' • $'}{item.sov_item.value_amount.toLocaleString()}
            </div>
          )}

          {/* Work Order - hidden for SOV-linked */}
          {!isSovLinked && workOrders.length > 0 && (
            <div className="space-y-1.5">
              <Label>Link to Work Order</Label>
              <Select value={workOrderId || 'none'} onValueChange={handleWOChange}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {workOrders.map(wo => (
                    <SelectItem key={wo.id} value={wo.id}>{wo.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* SOV selector - hidden for SOV-linked */}
          {!isSovLinked && sovItems.length > 0 && (
            <div className="space-y-1.5">
              <Label>Link to SOV Item (Optional)</Label>
              <Select value={sovItemId || 'none'} onValueChange={v => setSovItemId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {sovItems.map(sov => (
                    <SelectItem key={sov.id} value={sov.id}>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{sov.item_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {sov.contract_name} • ${sov.value_amount.toLocaleString()}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dependencies - hidden for SOV-linked */}
          {!isSovLinked && existingItems.length > 0 && (
            <div className="space-y-1.5">
              <Label>Dependencies</Label>
              <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                {existingItems.filter(i => i.id !== item?.id).map(i => (
                  <label key={i.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={depIds.includes(i.id)}
                      onChange={e => {
                        setDepIds(prev => e.target.checked ? [...prev, i.id] : prev.filter(d => d !== i.id));
                      }}
                      className="rounded"
                    />
                    {i.title}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim() || !startDate}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

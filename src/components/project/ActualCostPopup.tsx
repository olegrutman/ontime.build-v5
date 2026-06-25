import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { useActualCosts, type NewActualCostEntry } from '@/hooks/useActualCosts';
import { formatCurrency as fmt } from '@/lib/utils';
import { format } from 'date-fns';

interface ActualCostPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  changeOrderId?: string;
  earningsOrRevenue?: number;
  label?: string;
}

export function ActualCostPopup({
  open,
  onOpenChange,
  projectId,
  changeOrderId,
  earningsOrRevenue = 0,
  label = 'Revenue',
}: ActualCostPopupProps) {
  const { entries, totalActualCost, addEntry, deleteEntry } = useActualCosts({
    changeOrderId,
    projectId: changeOrderId ? undefined : projectId,
  });

  const [showForm, setShowForm] = useState(false);
  const [costType, setCostType] = useState<'hours' | 'lump_sum'>('hours');
  const [description, setDescription] = useState('');
  const [menCount, setMenCount] = useState('');
  const [hoursPerMan, setHoursPerMan] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [lumpAmount, setLumpAmount] = useState('');

  const computedTotal = costType === 'hours'
    ? (parseFloat(menCount) || 0) * (parseFloat(hoursPerMan) || 0) * (parseFloat(hourlyRate) || 0)
    : parseFloat(lumpAmount) || 0;

  const handleAdd = () => {
    const entry: NewActualCostEntry = {
      project_id: projectId,
      change_order_id: changeOrderId || null,
      entry_date: new Date().toISOString().slice(0, 10),
      cost_type: costType,
      description: description || 'Cost entry',
      men_count: costType === 'hours' ? parseFloat(menCount) || null : null,
      hours_per_man: costType === 'hours' ? parseFloat(hoursPerMan) || null : null,
      hourly_rate: costType === 'hours' ? parseFloat(hourlyRate) || null : null,
      lump_amount: costType === 'lump_sum' ? parseFloat(lumpAmount) || null : null,
      total_amount: computedTotal,
    };
    addEntry.mutate(entry);
    setShowForm(false);
    setDescription('');
    setMenCount('');
    setHoursPerMan('');
    setHourlyRate('');
    setLumpAmount('');
  };

  const margin = earningsOrRevenue - totalActualCost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Actual Costs</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{fmt(earningsOrRevenue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Costs</span>
            <span className="font-medium">{fmt(totalActualCost)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-medium">Margin</span>
            <span className={margin >= 0 ? 'text-green-600 font-semibold' : 'text-destructive font-semibold'}>
              {fmt(margin)}
            </span>
          </div>
        </div>

        {entries.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase">Entries</h4>
            {entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm bg-muted/50 rounded p-2">
                <div>
                  <p className="font-medium">{e.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(e.entry_date), 'MMM d, yyyy')} · {e.cost_type === 'hours' ? 'Hours' : 'Lump sum'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{fmt(e.total_amount)}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteEntry.mutate(e.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm ? (
          <div className="mt-4 space-y-3 border-t pt-3">
            <div>
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this cost for?" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={costType} onValueChange={(v) => setCostType(v as 'hours' | 'lump_sum')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">Hourly</SelectItem>
                  <SelectItem value="lump_sum">Lump Sum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {costType === 'hours' ? (
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Men</Label><Input type="number" value={menCount} onChange={(e) => setMenCount(e.target.value)} /></div>
                <div><Label>Hrs/Man</Label><Input type="number" value={hoursPerMan} onChange={(e) => setHoursPerMan(e.target.value)} /></div>
                <div><Label>Rate</Label><Input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} /></div>
              </div>
            ) : (
              <div><Label>Amount</Label><Input type="number" value={lumpAmount} onChange={(e) => setLumpAmount(e.target.value)} /></div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total: {fmt(computedTotal)}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button size="sm" onClick={handleAdd} disabled={computedTotal === 0}>Add</Button>
              </div>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full mt-3" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Cost Entry
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

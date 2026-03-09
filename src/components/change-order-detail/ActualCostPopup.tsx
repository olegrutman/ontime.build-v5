
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { useActualCosts, type NewActualCostEntry } from '@/hooks/useActualCosts';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

interface ActualCostPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changeOrderId?: string;
  projectId?: string;
  earningsOrRevenue: number;
  label: string;
}

export function ActualCostPopup({
  open,
  onOpenChange,
  changeOrderId,
  projectId,
  earningsOrRevenue,
  label,
}: ActualCostPopupProps) {
  const { entries, totalActualCost, addEntry, deleteEntry } = useActualCosts({
    changeOrderId,
    projectId,
  });
  const profit = earningsOrRevenue - totalActualCost;

  const [costType, setCostType] = useState<'hours' | 'lump_sum'>('hours');
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [menCount, setMenCount] = useState('');
  const [hoursPerMan, setHoursPerMan] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [lumpAmount, setLumpAmount] = useState('');

  const computedTotal =
    costType === 'hours'
      ? (parseFloat(menCount) || 0) * (parseFloat(hoursPerMan) || 0) * (parseFloat(hourlyRate) || 0)
      : parseFloat(lumpAmount) || 0;

  const resetForm = () => {
    setDescription('');
    setMenCount('');
    setHoursPerMan('');
    setHourlyRate('');
    setLumpAmount('');
  };

  const handleAdd = () => {
    if (computedTotal <= 0) return;
    const entry: NewActualCostEntry = {
      change_order_id: changeOrderId || null,
      project_id: projectId || null,
      entry_date: entryDate,
      cost_type: costType,
      description: description || (costType === 'hours' ? 'Labor' : 'Expense'),
      men_count: costType === 'hours' ? parseInt(menCount) || null : null,
      hours_per_man: costType === 'hours' ? parseFloat(hoursPerMan) || null : null,
      hourly_rate: costType === 'hours' ? parseFloat(hourlyRate) || null : null,
      lump_amount: costType === 'lump_sum' ? parseFloat(lumpAmount) || null : null,
      total_amount: computedTotal,
    };
    addEntry.mutate(entry);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Actual Cost Tracker</DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
            <p className="text-sm font-semibold">{formatCurrency(earningsOrRevenue)}</p>
          </div>
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-[10px] text-muted-foreground uppercase">Actual Cost</p>
            <p className="text-sm font-semibold">{formatCurrency(totalActualCost)}</p>
          </div>
          <div className={`rounded-md p-2 ${profit >= 0 ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
            <p className="text-[10px] text-muted-foreground uppercase">Profit</p>
            <p className={`text-sm font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(profit)}
            </p>
          </div>
        </div>

        <Separator />

        {/* Entry Form */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="flex-1">
              <Label className="text-xs">Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What for?" className="h-8 text-sm" />
            </div>
          </div>

          <Tabs value={costType} onValueChange={v => setCostType(v as 'hours' | 'lump_sum')}>
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="hours" className="text-xs gap-1"><Clock className="h-3 w-3" />Hours</TabsTrigger>
              <TabsTrigger value="lump_sum" className="text-xs gap-1"><DollarSign className="h-3 w-3" />Lump Sum</TabsTrigger>
            </TabsList>
            <TabsContent value="hours" className="mt-2">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Men</Label>
                  <Input type="number" min="1" value={menCount} onChange={e => setMenCount(e.target.value)} placeholder="1" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Hrs each</Label>
                  <Input type="number" min="0" step="0.5" value={hoursPerMan} onChange={e => setHoursPerMan(e.target.value)} placeholder="8" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">$/hr</Label>
                  <Input type="number" min="0" step="0.01" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="45" className="h-8 text-sm" />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="lump_sum" className="mt-2">
              <div>
                <Label className="text-xs">Amount</Label>
                <Input type="number" min="0" step="0.01" value={lumpAmount} onChange={e => setLumpAmount(e.target.value)} placeholder="0.00" className="h-8 text-sm" />
              </div>
            </TabsContent>
          </Tabs>

          {computedTotal > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Entry total:</span>
              <span className="font-medium">{formatCurrency(computedTotal)}</span>
            </div>
          )}

          <Button size="sm" className="w-full" onClick={handleAdd} disabled={computedTotal <= 0 || addEntry.isPending}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Entry
          </Button>
        </div>

        <Separator />

        {/* Entry List */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No cost entries yet</p>
          ) : (
            entries.map(entry => (
              <div key={entry.id} className="flex items-center justify-between text-sm border rounded-md px-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {entry.cost_type === 'hours' ? (
                      <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                    ) : (
                      <DollarSign className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate">{entry.description || 'Entry'}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground ml-4.5">
                    {format(new Date(entry.entry_date), 'MMM d')}
                    {entry.cost_type === 'hours' && entry.men_count && entry.hours_per_man
                      ? ` · ${entry.men_count}×${entry.hours_per_man}h`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-medium">{formatCurrency(entry.total_amount)}</span>
                  <button
                    onClick={() => deleteEntry.mutate(entry.id)}
                    className="text-muted-foreground hover:text-destructive p-0.5"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

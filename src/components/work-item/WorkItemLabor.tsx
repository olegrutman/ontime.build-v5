import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { AppRole } from '@/types/organization';

interface LaborEntry {
  id: string;
  entry_date: string;
  hours: number;
  description: string | null;
  entered_by: string;
  hourly_rate: number | null;
}

interface WorkItemLaborProps {
  workItemId: string;
  isEditable: boolean;
  canViewRates: boolean;
  currentRole: AppRole | null;
}

export function WorkItemLabor({ workItemId, isEditable, canViewRates, currentRole }: WorkItemLaborProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LaborEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const isFS = currentRole === 'FS';
  const isTC = currentRole === 'TC_PM';

  useEffect(() => {
    fetchLabor();
  }, [workItemId]);

  const fetchLabor = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('labor_entries')
      .select('*')
      .eq('work_item_id', workItemId)
      .order('entry_date', { ascending: false });

    if (error) {
      console.error('Error fetching labor:', error);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  const addEntry = async () => {
    if (!user) return;

    const newEntry = {
      work_item_id: workItemId,
      entry_date: new Date().toISOString().split('T')[0],
      hours: 0,
      description: '',
      entered_by: user.id,
    };

    const { data, error } = await supabase
      .from('labor_entries')
      .insert(newEntry)
      .select()
      .single();

    if (error) {
      toast.error('Failed to add entry');
    } else if (data) {
      setEntries([data, ...entries]);
    }
  };

  const updateEntry = async (id: string, field: keyof LaborEntry, value: string | number) => {
    const { error } = await supabase
      .from('labor_entries')
      .update({ [field]: value })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update');
    } else {
      setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
    }
  };

  const deleteEntry = async (id: string) => {
    const { error } = await supabase
      .from('labor_entries')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete');
    } else {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  // FS can only edit own entries, TC can edit all
  const canEditEntry = (entry: LaborEntry) => {
    if (!isEditable) return false;
    if (isTC) return true;
    if (isFS && entry.entered_by === user?.id) return true;
    return false;
  };

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const totalCost = canViewRates
    ? entries.reduce((sum, e) => sum + (e.hours * (e.hourly_rate || 0)), 0)
    : null;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Labor Entries
        </h3>
        {isEditable && (
          <Button size="sm" variant="outline" onClick={addEntry}>
            <Plus className="w-4 h-4 mr-1" />
            Add Hours
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No labor entries yet
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const editable = canEditEntry(entry);
            return (
              <div key={entry.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/30 rounded-lg">
                <div className="col-span-3">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={entry.entry_date}
                    onChange={(e) => updateEntry(entry.id, 'entry_date', e.target.value)}
                    disabled={!editable}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Hours</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={entry.hours}
                    onChange={(e) => updateEntry(entry.id, 'hours', parseFloat(e.target.value) || 0)}
                    disabled={!editable}
                  />
                </div>
                <div className={canViewRates ? "col-span-4" : "col-span-6"}>
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={entry.description || ''}
                    onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
                    disabled={!editable}
                    placeholder="Work performed"
                  />
                </div>
                {canViewRates && (
                  <div className="col-span-2">
                    <Label className="text-xs">Rate</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={entry.hourly_rate || ''}
                      onChange={(e) => updateEntry(entry.id, 'hourly_rate', parseFloat(e.target.value) || 0)}
                      disabled={!isTC || !isEditable}
                      placeholder="$/hr"
                    />
                  </div>
                )}
                {editable && (
                  <div className="col-span-1 flex justify-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteEntry(entry.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Totals */}
      <div className="flex items-center justify-between pt-4 border-t">
        <span className="font-medium">Total Hours</span>
        <span className="text-xl font-bold">{totalHours.toFixed(1)} hrs</span>
      </div>
      {canViewRates && totalCost !== null && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Labor Cost</span>
          <span className="font-medium">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalCost)}
          </span>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { TMLaborEntry, TMPeriod } from './types';
import { AppRole } from '@/types/organization';

interface TMLaborEntriesProps {
  period: TMPeriod;
  currentRole: AppRole | null;
  canViewRates: boolean;
  canSubmitTime: boolean;
}

export function TMLaborEntries({ period, currentRole, canViewRates, canSubmitTime }: TMLaborEntriesProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TMLaborEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const isEditable = period.status === 'OPEN';
  const isTC = currentRole === 'TC_PM';
  const isFS = currentRole === 'FS';
  const canAddEntries = canSubmitTime && isEditable && (isTC || isFS);

  useEffect(() => {
    fetchEntries();
  }, [period.id]);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tm_labor_entries')
      .select('*')
      .eq('period_id', period.id)
      .order('entry_date', { ascending: false });

    if (error) {
      console.error('Error fetching labor entries:', error);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  const addEntry = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('tm_labor_entries')
      .insert({
        period_id: period.id,
        entry_date: format(new Date(), 'yyyy-MM-dd'),
        hours: 0,
        description: '',
        entered_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add entry');
    } else if (data) {
      setEntries([data, ...entries]);
    }
  };

  const updateEntry = async (id: string, field: keyof TMLaborEntry, value: string | number) => {
    const { error } = await supabase
      .from('tm_labor_entries')
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
      .from('tm_labor_entries')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete');
    } else {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  const canEditEntry = (entry: TMLaborEntry) => {
    if (!isEditable || !canSubmitTime) return false;
    if (isTC) return true;
    if (isFS && entry.entered_by === user?.id) return true;
    return false;
  };

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const totalCost = canViewRates
    ? entries.reduce((sum, e) => sum + (e.hours * (e.hourly_rate || 0)), 0)
    : null;

  if (loading) {
    return <Skeleton className="h-24 w-full" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Labor ({totalHours.toFixed(1)} hrs)
          {canViewRates && totalCost !== null && (
            <span className="text-muted-foreground">
              • {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalCost)}
            </span>
          )}
        </h4>
        {canAddEntries && (
          <Button size="sm" variant="ghost" onClick={addEntry}>
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">No labor entries</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const editable = canEditEntry(entry);
            return (
              <div key={entry.id} className="grid grid-cols-12 gap-2 items-end text-sm">
                <div className="col-span-3">
                  <Input
                    type="date"
                    value={entry.entry_date}
                    onChange={(e) => updateEntry(entry.id, 'entry_date', e.target.value)}
                    disabled={!editable}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={entry.hours}
                    onChange={(e) => updateEntry(entry.id, 'hours', parseFloat(e.target.value) || 0)}
                    disabled={!editable}
                    className="h-8 text-xs"
                    placeholder="Hrs"
                  />
                </div>
                <div className={canViewRates ? "col-span-4" : "col-span-6"}>
                  <Input
                    value={entry.description || ''}
                    onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
                    disabled={!editable}
                    className="h-8 text-xs"
                    placeholder="Description"
                  />
                </div>
                {canViewRates && (
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={entry.hourly_rate || ''}
                      onChange={(e) => updateEntry(entry.id, 'hourly_rate', parseFloat(e.target.value) || 0)}
                      disabled={!isTC || !isEditable}
                      className="h-8 text-xs"
                      placeholder="$/hr"
                    />
                  </div>
                )}
                {editable && (
                  <div className="col-span-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteEntry(entry.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

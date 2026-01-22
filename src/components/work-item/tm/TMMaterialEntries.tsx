import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { TMMaterialEntry, TMPeriod } from './types';
import { AppRole } from '@/types/organization';

interface TMMaterialEntriesProps {
  period: TMPeriod;
  currentRole: AppRole | null;
  canViewCosts: boolean;
}

export function TMMaterialEntries({ period, currentRole, canViewCosts }: TMMaterialEntriesProps) {
  const [entries, setEntries] = useState<TMMaterialEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const isEditable = period.status === 'OPEN';
  const isTC = currentRole === 'TC_PM';
  const isFS = currentRole === 'FS';

  useEffect(() => {
    fetchEntries();
  }, [period.id]);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tm_material_entries')
      .select('*')
      .eq('period_id', period.id)
      .order('entry_date', { ascending: false });

    if (error) {
      console.error('Error fetching material entries:', error);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  const addEntry = async () => {
    const { data, error } = await supabase
      .from('tm_material_entries')
      .insert({
        period_id: period.id,
        entry_date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        quantity: 1,
        uom: 'EA',
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add entry');
    } else if (data) {
      setEntries([data, ...entries]);
    }
  };

  const updateEntry = async (id: string, field: keyof TMMaterialEntry, value: string | number) => {
    const { error } = await supabase
      .from('tm_material_entries')
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
      .from('tm_material_entries')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete');
    } else {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  const totalCost = canViewCosts
    ? entries.reduce((sum, e) => sum + (e.quantity * (e.unit_cost || 0)), 0)
    : null;

  if (loading) {
    return <Skeleton className="h-24 w-full" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Package className="w-4 h-4" />
          Materials ({entries.length})
          {canViewCosts && totalCost !== null && (
            <span className="text-muted-foreground">
              • {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalCost)}
            </span>
          )}
        </h4>
        {isEditable && (isTC || isFS) && (
          <Button size="sm" variant="ghost" onClick={addEntry}>
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">No materials logged</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="grid grid-cols-12 gap-2 items-end text-sm">
              <div className="col-span-2">
                <Input
                  type="date"
                  value={entry.entry_date}
                  onChange={(e) => updateEntry(entry.id, 'entry_date', e.target.value)}
                  disabled={!isEditable}
                  className="h-8 text-xs"
                />
              </div>
              <div className={canViewCosts ? "col-span-4" : "col-span-5"}>
                <Input
                  value={entry.description}
                  onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
                  disabled={!isEditable}
                  className="h-8 text-xs"
                  placeholder="Description"
                />
              </div>
              <div className="col-span-1">
                <Input
                  type="number"
                  min="0"
                  value={entry.quantity}
                  onChange={(e) => updateEntry(entry.id, 'quantity', parseFloat(e.target.value) || 0)}
                  disabled={!isEditable}
                  className="h-8 text-xs"
                  placeholder="Qty"
                />
              </div>
              <div className="col-span-2">
                <Input
                  value={entry.uom}
                  onChange={(e) => updateEntry(entry.id, 'uom', e.target.value)}
                  disabled={!isEditable}
                  className="h-8 text-xs"
                  placeholder="UOM"
                />
              </div>
              {canViewCosts && (
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={entry.unit_cost || ''}
                    onChange={(e) => updateEntry(entry.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                    disabled={!isTC || !isEditable}
                    className="h-8 text-xs"
                    placeholder="$/unit"
                  />
                </div>
              )}
              {isEditable && (
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
          ))}
        </div>
      )}
    </div>
  );
}

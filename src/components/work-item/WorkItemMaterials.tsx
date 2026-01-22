import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';

interface MaterialEntry {
  id: string;
  description: string;
  quantity: number;
  uom: string;
  unit_cost: number;
  notes: string | null;
}

interface WorkItemMaterialsProps {
  workItemId: string;
  isEditable: boolean;
  canViewCosts: boolean;
}

export function WorkItemMaterials({ workItemId, isEditable, canViewCosts }: WorkItemMaterialsProps) {
  const [entries, setEntries] = useState<MaterialEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaterials();
  }, [workItemId]);

  const fetchMaterials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('supplier_quotes')
      .select('id, description, quantity, uom, unit_cost, notes')
      .eq('work_item_id', workItemId);

    if (error) {
      console.error('Error fetching materials:', error);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  const totalCost = canViewCosts
    ? entries.reduce((sum, e) => sum + (e.quantity * e.unit_cost), 0)
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
          <Package className="w-4 h-4" />
          Materials
        </h3>
        {isEditable && (
          <Button size="sm" variant="outline" disabled>
            <Plus className="w-4 h-4 mr-1" />
            Add Material
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No materials logged
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-sm">{entry.description}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.quantity} {entry.uom}
                </p>
              </div>
              {canViewCosts && (
                <div className="text-right">
                  <p className="font-medium">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(entry.quantity * entry.unit_cost)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @ {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(entry.unit_cost)}/{entry.uom}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      {canViewCosts && totalCost !== null && (
        <div className="flex items-center justify-between pt-4 border-t">
          <span className="font-medium">Material Cost</span>
          <span className="text-xl font-bold">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalCost)}
          </span>
        </div>
      )}
    </div>
  );
}

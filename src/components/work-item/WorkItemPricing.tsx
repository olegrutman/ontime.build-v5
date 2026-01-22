import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface PricingLine {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  uom: string;
  notes: string | null;
  sort_order: number;
}

interface WorkItemPricingProps {
  workItemId: string;
  isEditable: boolean;
  canViewRates: boolean;
}

export function WorkItemPricing({ workItemId, isEditable, canViewRates }: WorkItemPricingProps) {
  const [lines, setLines] = useState<PricingLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPricing();
  }, [workItemId]);

  const fetchPricing = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('change_work_pricing')
      .select('*')
      .eq('work_item_id', workItemId)
      .order('sort_order');

    if (error) {
      console.error('Error fetching pricing:', error);
    } else {
      setLines(data || []);
    }
    setLoading(false);
  };

  const addLine = async () => {
    const newLine = {
      work_item_id: workItemId,
      description: '',
      quantity: 1,
      unit_price: 0,
      uom: 'EA',
      sort_order: lines.length,
    };

    const { data, error } = await supabase
      .from('change_work_pricing')
      .insert(newLine)
      .select()
      .single();

    if (error) {
      toast.error('Failed to add line');
    } else if (data) {
      setLines([...lines, data]);
    }
  };

  const updateLine = async (id: string, field: keyof PricingLine, value: string | number) => {
    const { error } = await supabase
      .from('change_work_pricing')
      .update({ [field]: value })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update');
    } else {
      setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
    }
  };

  const deleteLine = async (id: string) => {
    const { error } = await supabase
      .from('change_work_pricing')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete');
    } else {
      setLines(lines.filter(l => l.id !== id));
    }
  };

  const total = lines.reduce((sum, l) => sum + (l.quantity * l.unit_price), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Pricing Breakdown
        </h3>
        {isEditable && (
          <Button size="sm" variant="outline" onClick={addLine}>
            <Plus className="w-4 h-4 mr-1" />
            Add Line
          </Button>
        )}
      </div>

      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No pricing lines yet
        </p>
      ) : (
        <div className="space-y-3">
          {lines.map((line) => (
            <div key={line.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/30 rounded-lg">
              <div className="col-span-5">
                <Label className="text-xs">Description</Label>
                <Input
                  value={line.description}
                  onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                  disabled={!isEditable}
                  placeholder="Line item description"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  value={line.quantity}
                  onChange={(e) => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                  disabled={!isEditable}
                />
              </div>
              {canViewRates && (
                <div className="col-span-2">
                  <Label className="text-xs">Unit Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={line.unit_price}
                    onChange={(e) => updateLine(line.id, 'unit_price', parseFloat(e.target.value) || 0)}
                    disabled={!isEditable}
                  />
                </div>
              )}
              <div className="col-span-2">
                <Label className="text-xs">Total</Label>
                <div className="h-9 flex items-center font-medium">
                  {formatCurrency(line.quantity * line.unit_price)}
                </div>
              </div>
              {isEditable && (
                <div className="col-span-1 flex justify-end">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteLine(line.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between pt-4 border-t">
        <span className="font-medium">Total</span>
        <span className="text-xl font-bold">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

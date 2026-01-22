import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, FileText, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { TMBillableSlice } from './types';

interface TMBillableSlicesProps {
  workItemId: string;
  canViewFinancials: boolean;
}

export function TMBillableSlices({ workItemId, canViewFinancials }: TMBillableSlicesProps) {
  const [slices, setSlices] = useState<TMBillableSlice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSlices();
  }, [workItemId]);

  const fetchSlices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tm_billable_slices')
      .select('*')
      .eq('work_item_id', workItemId)
      .order('slice_number', { ascending: true });

    if (error) {
      console.error('Error fetching billable slices:', error);
    } else {
      setSlices(data || []);
    }
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalBilled = slices.reduce((sum, s) => sum + s.total_amount, 0);
  const invoicedCount = slices.filter(s => s.invoiced_at).length;

  if (loading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (slices.length === 0) {
    return null; // Don't show if no slices
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Receipt className="w-4 h-4" />
          Billable Slices ({slices.length})
        </h4>
        {canViewFinancials && (
          <span className="text-sm font-medium">
            Total: {formatCurrency(totalBilled)}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {slices.map((slice) => (
          <div
            key={slice.id}
            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm">
                #{slice.slice_number}
              </div>
              <div>
                <p className="text-sm font-medium">
                  Period Slice #{slice.slice_number}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(slice.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {canViewFinancials && (
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(slice.total_amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    L: {formatCurrency(slice.labor_amount)} + M: {formatCurrency(slice.material_amount)}
                  </p>
                </div>
              )}
              
              {slice.invoiced_at ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Invoiced
                </Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between pt-2 border-t text-sm">
        <span className="text-muted-foreground">
          {invoicedCount} of {slices.length} invoiced
        </span>
        {canViewFinancials && (
          <span className="font-medium">
            {formatCurrency(totalBilled)} total billed
          </span>
        )}
      </div>
    </div>
  );
}

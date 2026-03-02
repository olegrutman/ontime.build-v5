import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ReturnItem, ReturnableFlag, RestockingType } from '@/types/return';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ReturnSupplierReviewProps {
  returnId: string;
  items: ReturnItem[];
  projectId: string;
}

interface ItemDecision {
  flag: ReturnableFlag;
  reason: string;
  accepted_qty: number;
  unit_credit: number;
}

export function ReturnSupplierReview({ returnId, items, projectId }: ReturnSupplierReviewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [decisions, setDecisions] = useState<Record<string, ItemDecision>>(() => {
    const m: Record<string, ItemDecision> = {};
    items.forEach(i => {
      m[i.id] = {
        flag: i.returnable_flag as ReturnableFlag,
        reason: i.nonreturnable_reason || '',
        accepted_qty: i.accepted_qty ?? i.qty_requested,
        unit_credit: i.credit_unit_price || i.original_unit_price || 0,
      };
    });
    return m;
  });

  const [restockingType, setRestockingType] = useState<RestockingType>('None');
  const [restockingValue, setRestockingValue] = useState(0);

  const allDecided = items.every(i => {
    const d = decisions[i.id];
    return d && d.flag !== 'Pending' && (d.flag !== 'No' || d.reason.trim());
  });

  // Compute totals
  const creditSubtotal = items.reduce((sum, item) => {
    const d = decisions[item.id];
    if (!d || d.flag === 'No') return sum;
    return sum + d.accepted_qty * d.unit_credit;
  }, 0);

  const restockingTotal = restockingType === 'Percent'
    ? creditSubtotal * (restockingValue / 100)
    : restockingType === 'Flat'
    ? restockingValue
    : 0;

  const netCredit = creditSubtotal - restockingTotal;

  const updateDecision = (itemId: string, field: keyof ItemDecision, value: any) => {
    setDecisions(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const approveMutation = useMutation({
    mutationFn: async () => {
      for (const item of items) {
        const d = decisions[item.id];
        const isReturnable = d.flag === 'Yes';
        const { error } = await supabase
          .from('return_items')
          .update({
            returnable_flag: d.flag,
            nonreturnable_reason: d.flag === 'No' ? d.reason : null,
            accepted_qty: isReturnable ? d.accepted_qty : 0,
            credit_unit_price: isReturnable ? d.unit_credit : 0,
            credit_line_total: isReturnable ? d.accepted_qty * d.unit_credit : 0,
          })
          .eq('id', item.id);
        if (error) throw error;
      }

      const { error } = await supabase
        .from('returns')
        .update({
          status: 'APPROVED',
          credit_subtotal: creditSubtotal,
          restocking_type: restockingType,
          restocking_value: restockingValue,
          restocking_total: restockingTotal,
          net_credit_total: netCredit,
        })
        .eq('id', returnId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return-detail', returnId] });
      queryClient.invalidateQueries({ queryKey: ['returns', projectId] });
      toast({ title: 'Review complete — return approved' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('returns')
        .update({ status: 'REJECTED' })
        .eq('id', returnId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return-detail', returnId] });
      queryClient.invalidateQueries({ queryKey: ['returns', projectId] });
      toast({ title: 'Return rejected' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Supplier Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map(item => {
          const d = decisions[item.id] || { flag: 'Pending', reason: '', accepted_qty: item.qty_requested, unit_credit: 0 };
          const lineCredit = d.flag === 'Yes' ? d.accepted_qty * d.unit_credit : 0;
          return (
            <div key={item.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.description_snapshot}</span>
                <span className="text-xs text-muted-foreground">Requested: {item.qty_requested} {item.uom}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Condition: {item.condition}{item.condition_notes ? ` – ${item.condition_notes}` : ''}
                {item.reason ? ` • Reason: ${item.reason}` : ''}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Returnable?</Label>
                  <Select
                    value={d.flag}
                    onValueChange={v => updateDecision(item.id, 'flag', v)}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Yes">Yes – Returnable</SelectItem>
                      <SelectItem value="No">No – Not Returnable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {d.flag === 'Yes' && (
                  <div>
                    <Label className="text-xs">Accepted Qty (max {item.qty_requested})</Label>
                    <Input
                      type="number"
                      min={0}
                      max={item.qty_requested}
                      value={d.accepted_qty}
                      onChange={e => updateDecision(item.id, 'accepted_qty', Math.min(Number(e.target.value), item.qty_requested))}
                      className="h-9"
                    />
                  </div>
                )}
              </div>

              {d.flag === 'Yes' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Unit Credit ($)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={d.unit_credit}
                      onChange={e => updateDecision(item.id, 'unit_credit', Number(e.target.value))}
                      className="h-9"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <span className="text-xs text-muted-foreground">Line Credit: <span className="font-medium text-foreground">${lineCredit.toFixed(2)}</span></span>
                  </div>
                </div>
              )}

              {d.flag === 'No' && (
                <Textarea
                  placeholder="Reason item is not returnable..."
                  value={d.reason}
                  onChange={e => updateDecision(item.id, 'reason', e.target.value)}
                  className="text-sm"
                />
              )}
            </div>
          );
        })}

        {/* Restocking Fee */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <Label className="text-xs">Restocking Fee Type</Label>
            <Select value={restockingType} onValueChange={v => setRestockingType(v as RestockingType)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="Percent">Percent</SelectItem>
                <SelectItem value="Flat">Flat Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {restockingType !== 'None' && (
            <div>
              <Label className="text-xs">{restockingType === 'Percent' ? 'Percentage' : 'Amount'}</Label>
              <Input
                type="number"
                min={0}
                step={restockingType === 'Percent' ? 1 : 0.01}
                value={restockingValue || ''}
                onChange={e => setRestockingValue(Number(e.target.value))}
                className="h-9"
              />
            </div>
          )}
        </div>

        {/* Running Totals */}
        <div className="space-y-1 text-sm border-t pt-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Credit Subtotal</span>
            <span>${creditSubtotal.toFixed(2)}</span>
          </div>
          {restockingTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Restocking Fee</span>
              <span className="text-destructive">-${restockingTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold">
            <span>Net Credit</span>
            <span className="text-emerald-700 dark:text-emerald-400">${netCredit.toFixed(2)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => rejectMutation.mutate()}
            disabled={rejectMutation.isPending}
          >
            {rejectMutation.isPending ? 'Rejecting...' : 'Reject Return'}
          </Button>
          <Button
            className="flex-1"
            onClick={() => approveMutation.mutate()}
            disabled={!allDecided || approveMutation.isPending}
          >
            {approveMutation.isPending ? 'Saving...' : 'Approve Return'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

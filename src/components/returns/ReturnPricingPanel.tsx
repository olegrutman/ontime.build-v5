import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ReturnItem } from '@/types/return';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ReturnPricingPanelProps {
  returnId: string;
  items: ReturnItem[];
  projectId: string;
}

export function ReturnPricingPanel({ returnId, items, projectId }: ReturnPricingPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const returnableItems = items.filter(i => i.returnable_flag === 'Yes');

  const [prices, setPrices] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    returnableItems.forEach(i => { m[i.id] = i.credit_unit_price || 0; });
    return m;
  });

  const [restockingType, setRestockingType] = useState<'Percent' | 'Flat' | 'None'>('None');
  const [restockingValue, setRestockingValue] = useState(0);

  const creditSubtotal = returnableItems.reduce((sum, item) => {
    const qty = item.accepted_qty ?? item.qty_requested;
    return sum + (prices[item.id] || 0) * qty;
  }, 0);

  const restockingTotal = restockingType === 'Percent'
    ? creditSubtotal * (restockingValue / 100)
    : restockingType === 'Flat'
    ? restockingValue
    : 0;

  const netCredit = creditSubtotal - restockingTotal;

  const canSubmit = returnableItems.every(i => prices[i.id] > 0);

  const priceMutation = useMutation({
    mutationFn: async () => {
      // Update each line item price
      for (const item of returnableItems) {
        const unitPrice = prices[item.id] || 0;
        const qty = item.accepted_qty ?? item.qty_requested;
        const { error } = await supabase
          .from('return_items')
          .update({
            credit_unit_price: unitPrice,
            credit_line_total: unitPrice * qty,
          })
          .eq('id', item.id);
        if (error) throw error;
      }

      // Update return totals and status
      const { error } = await supabase
        .from('returns')
        .update({
          credit_subtotal: creditSubtotal,
          restocking_type: restockingType,
          restocking_value: restockingValue,
          restocking_total: restockingTotal,
          net_credit_total: netCredit,
          status: 'PRICED',
        })
        .eq('id', returnId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return-detail', returnId] });
      queryClient.invalidateQueries({ queryKey: ['returns', projectId] });
      toast({ title: 'Return priced successfully' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  if (returnableItems.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          No returnable items to price.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Price Return</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="w-16">Qty</TableHead>
              <TableHead className="w-28">Unit Price</TableHead>
              <TableHead className="w-24 text-right">Line Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returnableItems.map(item => (
              <TableRow key={item.id}>
                <TableCell className="text-sm">{item.description_snapshot}</TableCell>
                <TableCell>{item.accepted_qty ?? item.qty_requested}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={prices[item.id] || ''}
                    onChange={e => setPrices(p => ({ ...p, [item.id]: Number(e.target.value) }))}
                    className="w-24 h-8"
                  />
                </TableCell>
                <TableCell className="text-right text-sm">
                  ${((prices[item.id] || 0) * (item.accepted_qty ?? item.qty_requested)).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Restocking Fee Type</Label>
            <Select value={restockingType} onValueChange={v => setRestockingType(v as any)}>
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

        <Button
          className="w-full"
          onClick={() => priceMutation.mutate()}
          disabled={!canSubmit || priceMutation.isPending}
        >
          {priceMutation.isPending ? 'Saving...' : 'Price Return'}
        </Button>
      </CardContent>
    </Card>
  );
}

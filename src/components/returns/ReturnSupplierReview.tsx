import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ReturnItem, ReturnableFlag } from '@/types/return';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ReturnSupplierReviewProps {
  returnId: string;
  items: ReturnItem[];
  projectId: string;
}

export function ReturnSupplierReview({ returnId, items, projectId }: ReturnSupplierReviewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [decisions, setDecisions] = useState<Record<string, { flag: ReturnableFlag; reason: string }>>(() => {
    const m: Record<string, { flag: ReturnableFlag; reason: string }> = {};
    items.forEach(i => {
      m[i.id] = { flag: i.returnable_flag as ReturnableFlag, reason: i.nonreturnable_reason || '' };
    });
    return m;
  });

  const allDecided = items.every(i => {
    const d = decisions[i.id];
    return d && d.flag !== 'Pending' && (d.flag !== 'No' || d.reason.trim());
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      // Update each item's returnable_flag
      for (const item of items) {
        const d = decisions[item.id];
        const { error } = await supabase
          .from('return_items')
          .update({
            returnable_flag: d.flag,
            nonreturnable_reason: d.flag === 'No' ? d.reason : null,
            // Non-returnable items get zero credit
            credit_unit_price: d.flag === 'No' ? 0 : item.credit_unit_price,
            credit_line_total: d.flag === 'No' ? 0 : item.credit_line_total,
          })
          .eq('id', item.id);
        if (error) throw error;
      }

      // Advance status to APPROVED
      const { error } = await supabase
        .from('returns')
        .update({ status: 'APPROVED' })
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Supplier Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map(item => {
          const d = decisions[item.id] || { flag: 'Pending', reason: '' };
          return (
            <div key={item.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.description_snapshot}</span>
                <span className="text-xs text-muted-foreground">Qty: {item.qty_requested}</span>
              </div>
              <p className="text-xs text-muted-foreground">Condition: {item.condition}{item.condition_notes ? ` – ${item.condition_notes}` : ''}</p>
              <div>
                <Label className="text-xs">Returnable?</Label>
                <Select
                  value={d.flag}
                  onValueChange={v => setDecisions(prev => ({
                    ...prev,
                    [item.id]: { ...prev[item.id], flag: v as ReturnableFlag },
                  }))}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Yes">Yes – Returnable</SelectItem>
                    <SelectItem value="No">No – Not Returnable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {d.flag === 'No' && (
                <Textarea
                  placeholder="Reason item is not returnable..."
                  value={d.reason}
                  onChange={e => setDecisions(prev => ({
                    ...prev,
                    [item.id]: { ...prev[item.id], reason: e.target.value },
                  }))}
                  className="text-sm"
                />
              )}
            </div>
          );
        })}

        <Button
          className="w-full"
          onClick={() => completeMutation.mutate()}
          disabled={!allDecided || completeMutation.isPending}
        >
          {completeMutation.isPending ? 'Saving...' : 'Complete Review'}
        </Button>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface WorkItem {
  id: string;
  title: string;
  code: string | null;
  amount: number | null;
}

interface LineItemDraft {
  id: string;
  work_item_id: string | null;
  description: string;
  scheduled_value: number;
  previous_billed: number;
  current_billed: number;
}

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  retainagePercent: number;
  onSuccess: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  projectId,
  retainagePercent,
  onSuccess,
}: CreateInvoiceDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [periodStart, setPeriodStart] = useState<Date>(startOfMonth(subMonths(new Date(), 1)));
  const [periodEnd, setPeriodEnd] = useState<Date>(endOfMonth(subMonths(new Date(), 1)));
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);

  useEffect(() => {
    if (open) {
      fetchWorkItemsWithPreviousBilling();
      generateInvoiceNumber();
    }
  }, [open, projectId]);

  const fetchWorkItemsWithPreviousBilling = async () => {
    // Work items table has been removed — use SOV items instead
    // For now, start with empty line items (user adds manually or uses SOV-based flow)
    setWorkItems([]);
    setLineItems([]);
  };

  const generateInvoiceNumber = async () => {
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    const nextNumber = (count || 0) + 1;
    setInvoiceNumber(`INV-${nextNumber.toString().padStart(4, '0')}`);
  };

  const handleLineItemChange = (id: string, field: keyof LineItemDraft, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        work_item_id: null,
        description: '',
        scheduled_value: 0,
        previous_billed: 0,
        current_billed: 0,
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.current_billed, 0);
    const retainageAmount = subtotal * (retainagePercent / 100);
    const totalAmount = subtotal - retainageAmount;
    return { subtotal, retainageAmount, totalAmount };
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!invoiceNumber.trim()) {
      toast.error('Please enter an invoice number');
      return;
    }

    if (lineItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    setLoading(true);
    const { subtotal, retainageAmount, totalAmount } = calculateTotals();

    try {
      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          project_id: projectId,
          invoice_number: invoiceNumber,
          billing_period_start: format(periodStart, 'yyyy-MM-dd'),
          billing_period_end: format(periodEnd, 'yyyy-MM-dd'),
          subtotal,
          retainage_amount: retainageAmount,
          total_amount: totalAmount,
          notes: notes || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create line items
      const lineItemsToInsert = lineItems.map((item, index) => ({
        invoice_id: invoice.id,
        work_item_id: item.work_item_id,
        description: item.description,
        scheduled_value: item.scheduled_value,
        previous_billed: item.previous_billed,
        current_billed: item.current_billed,
        total_billed: item.previous_billed + item.current_billed,
        retainage_percent: retainagePercent,
        retainage_amount: item.current_billed * (retainagePercent / 100),
        sort_order: index,
      }));

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsToInsert);

      if (lineItemsError) throw lineItemsError;

      // Log activity
      await supabase.from('project_activity').insert({
        project_id: projectId,
        activity_type: 'INVOICE_CREATED',
        description: `Invoice ${invoiceNumber} created`,
        actor_user_id: user.id,
      });

      toast.success('Invoice created successfully');
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast.error(error.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setInvoiceNumber('');
    setPeriodStart(startOfMonth(subMonths(new Date(), 1)));
    setPeriodEnd(endOfMonth(subMonths(new Date(), 1)));
    setNotes('');
    setLineItems([]);
  };

  const { subtotal, retainageAmount, totalAmount } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Create a billing invoice for work completed during the billing period.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-6 py-4">
          {/* Invoice Details */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-0001"
              />
            </div>

            <div className="space-y-2">
              <Label>Billing Period Start</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !periodStart && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodStart ? format(periodStart, 'MMM d, yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={periodStart}
                    onSelect={(date) => date && setPeriodStart(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Billing Period End</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !periodEnd && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodEnd ? format(periodEnd, 'MMM d, yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={periodEnd}
                    onSelect={(date) => date && setPeriodEnd(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Line
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Description</TableHead>
                    <TableHead className="text-right">Scheduled Value</TableHead>
                    <TableHead className="text-right">Previously Billed</TableHead>
                    <TableHead className="text-right">This Period</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item) => {
                    const totalBilled = item.previous_billed + item.current_billed;
                    const remaining = item.scheduled_value - totalBilled;
                    const isOverbilled = remaining < 0;

                    return (
                      <TableRow key={item.id} className={isOverbilled ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                            placeholder="Line item description"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={item.scheduled_value}
                            onChange={(e) =>
                              handleLineItemChange(item.id, 'scheduled_value', parseFloat(e.target.value) || 0)
                            }
                            className="h-8 w-28 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={item.previous_billed}
                            onChange={(e) =>
                              handleLineItemChange(item.id, 'previous_billed', parseFloat(e.target.value) || 0)
                            }
                            className="h-8 w-28 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={item.current_billed}
                            onChange={(e) =>
                              handleLineItemChange(item.id, 'current_billed', parseFloat(e.target.value) || 0)
                            }
                            className="h-8 w-28 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            'font-medium',
                            isOverbilled ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                          )}>
                            {formatCurrency(remaining)}
                            {isOverbilled && ' ⚠'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLineItem(item.id)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {lineItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No line items. Click "Add Line" to add billing items.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes or comments..."
              rows={3}
            />
          </div>
        </div>

        <div className="shrink-0 border-t bg-background pt-4 space-y-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Retainage ({retainagePercent}%):</span>
                <span className="font-medium text-amber-600">-{formatCurrency(retainageAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Total Due:</span>
                <span className="font-bold text-lg">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create Invoice'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

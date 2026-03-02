import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarIcon, DollarSign, FileText, Loader2, Receipt } from 'lucide-react';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { PurchaseOrder, POLineItem } from '@/types/purchaseOrder';

interface CreateSupplierInvoiceFromPOProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  po: PurchaseOrder;
  lineItems: POLineItem[];
  projectId: string;
  onSuccess: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function CreateSupplierInvoiceFromPO({
  open,
  onOpenChange,
  po,
  lineItems,
  projectId,
  onSuccess,
}: CreateSupplierInvoiceFromPOProps) {
  const { user, userOrgRoles } = useAuth();
  const [saving, setSaving] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [periodStart, setPeriodStart] = useState<Date>(startOfMonth(new Date()));
  const [periodEnd, setPeriodEnd] = useState<Date>(endOfMonth(new Date()));

  const supplierOrgName = userOrgRoles[0]?.organization?.name;

  const subtotal = po.po_subtotal_total ?? lineItems.reduce((sum, item) => sum + (item.line_total || 0), 0);
  const taxTotal = po.po_tax_total ?? 0;
  const total = po.po_total ?? subtotal + taxTotal;

  // Generate invoice number on open
  useEffect(() => {
    if (!open) return;

    const generate = async () => {
      const initials = getOrgInitials(supplierOrgName);
      const prefix = `INV-${initials}`;

      const { data } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('project_id', projectId);

      let maxNumber = 0;
      if (data) {
        const prefixPattern = new RegExp(`^${prefix}-(\\d+)$`);
        data.forEach((inv) => {
          const match = inv.invoice_number.match(prefixPattern);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) maxNumber = num;
          }
        });
      }
      setInvoiceNumber(`${prefix}-${(maxNumber + 1).toString().padStart(4, '0')}`);
    };

    generate();
  }, [open, projectId, supplierOrgName]);

  const getOrgInitials = (name: string | undefined): string => {
    if (!name) return 'XX';
    return name.replace(/^(the\s+)/i, '').trim().substring(0, 2).toUpperCase();
  };

  const handleSubmit = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          project_id: projectId,
          contract_id: null,
          po_id: po.id,
          sov_id: null,
          invoice_number: invoiceNumber,
          billing_period_start: format(periodStart, 'yyyy-MM-dd'),
          billing_period_end: format(periodEnd, 'yyyy-MM-dd'),
          subtotal: total,
          retainage_amount: 0,
          total_amount: total,
          created_by: user.id,
          status: 'DRAFT',
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create line items from PO items
      const invoiceLineItems = lineItems.map((item, index) => ({
        invoice_id: invoice.id,
        description: item.description,
        scheduled_value: item.line_total || 0,
        previous_billed: 0,
        current_billed: item.line_total || 0,
        total_billed: item.line_total || 0,
        retainage_percent: 0,
        retainage_amount: 0,
        sort_order: index,
      }));

      // Add tax line item if applicable
      if (taxTotal > 0) {
        invoiceLineItems.push({
          invoice_id: invoice.id,
          description: `Sales Tax (${po.tax_percent_applied ?? 0}%)`,
          scheduled_value: taxTotal,
          previous_billed: 0,
          current_billed: taxTotal,
          total_billed: taxTotal,
          retainage_percent: 0,
          retainage_amount: 0,
          sort_order: lineItems.length,
        });
      }

      const { error: lineError } = await supabase
        .from('invoice_line_items')
        .insert(invoiceLineItems);

      if (lineError) throw lineError;

      // Log activity
      await supabase.from('project_activity').insert({
        project_id: projectId,
        activity_type: 'INVOICE_CREATED',
        description: `Supplier invoice ${invoiceNumber} created from PO ${po.po_number} for ${formatCurrency(total)}`,
        actor_user_id: user.id,
      });

      toast.success('Invoice created successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast.error(error.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Create Invoice — {po.po_number}
          </DialogTitle>
          <DialogDescription>
            Create a draft invoice for this delivered Purchase Order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Invoice Total Preview */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PO Line Items Summary */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">PO Line Items</Label>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right w-20">Qty</TableHead>
                    <TableHead className="text-right w-28">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">{item.description}</TableCell>
                      <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatCurrency(item.line_total || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="text-right font-medium">
                      Subtotal
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(subtotal)}
                    </TableCell>
                  </TableRow>
                  {taxTotal > 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-right font-medium">
                        Tax ({po.tax_percent_applied ?? 0}%)
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(taxTotal)}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell colSpan={2} className="text-right font-medium">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrency(total)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>

          <Separator />

          {/* Invoice Number */}
          <div className="space-y-2">
            <Label>Invoice Number</Label>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          {/* Billing Period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Period Start</Label>
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
                    {periodStart ? format(periodStart, 'MMM d, yyyy') : 'Select'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={periodStart}
                    onSelect={(d) => d && setPeriodStart(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Period End</Label>
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
                    {periodEnd ? format(periodEnd, 'MMM d, yyyy') : 'Select'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={periodEnd}
                    onSelect={(d) => d && setPeriodEnd(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !invoiceNumber}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Receipt className="h-4 w-4 mr-2" />}
            Create Draft Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarIcon, DollarSign, FileText, Loader2, AlertCircle, Receipt } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { PurchaseOrder, POLineItem } from '@/types/purchaseOrder';

interface Contract {
  id: string;
  from_role: string;
  to_role: string;
  contract_sum: number;
  retainage_percent: number;
  from_org_id: string | null;
  to_org_id: string | null;
  from_org_name?: string;
  to_org_name?: string;
}

interface CreateInvoiceFromPOProps {
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
    maximumFractionDigits: 2,
  }).format(amount);
}

export function CreateInvoiceFromPO({
  open,
  onOpenChange,
  po,
  lineItems,
  projectId,
  onSuccess,
}: CreateInvoiceFromPOProps) {
  const { user, userOrgRoles } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>('');

  // Markup
  const [markupType, setMarkupType] = useState<'percent' | 'flat'>('percent');
  const [markupPercent, setMarkupPercent] = useState<number>(0);
  const [markupAmount, setMarkupAmount] = useState<number>(0);

  // Invoice details
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [periodStart, setPeriodStart] = useState<Date>(startOfMonth(new Date()));
  const [periodEnd, setPeriodEnd] = useState<Date>(endOfMonth(new Date()));

  const currentOrgId = userOrgRoles[0]?.organization?.id;

  // Calculate supplier subtotal from PO line items
  const supplierSubtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + (item.line_total || 0), 0),
    [lineItems]
  );

  // Calculate markup value
  const calculatedMarkup = useMemo(() => {
    if (markupType === 'percent') {
      return supplierSubtotal * (markupPercent / 100);
    }
    return markupAmount;
  }, [markupType, markupPercent, markupAmount, supplierSubtotal]);

  const invoiceTotal = supplierSubtotal + calculatedMarkup;

  // Retainage from selected contract
  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === selectedContractId),
    [contracts, selectedContractId]
  );
  const retainagePercent = selectedContract?.retainage_percent || 0;
  const retainageAmount = invoiceTotal * (retainagePercent / 100);
  const netAmount = invoiceTotal - retainageAmount;

  // Fetch TC-to-GC contracts and CO markup
  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch TC-to-GC contracts
      const { data: contractsData } = await supabase
        .from('project_contracts')
        .select(`
          id, from_role, to_role, contract_sum, retainage_percent, from_org_id, to_org_id,
          from_org:organizations!project_contracts_from_org_id_fkey(name),
          to_org:organizations!project_contracts_to_org_id_fkey(name)
        `)
        .eq('project_id', projectId)
        .eq('from_org_id', currentOrgId)
        .eq('to_role', 'General Contractor');

      const mapped: Contract[] = (contractsData || []).map((c: any) => ({
        id: c.id,
        from_role: c.from_role,
        to_role: c.to_role,
        contract_sum: c.contract_sum,
        retainage_percent: c.retainage_percent,
        from_org_id: c.from_org_id,
        to_org_id: c.to_org_id,
        from_org_name: c.from_org?.name || undefined,
        to_org_name: c.to_org?.name || undefined,
      }));

      setContracts(mapped);

      // Auto-select if only one contract
      if (mapped.length === 1) {
        setSelectedContractId(mapped[0].id);
      }

      // Markup defaults to 0 (no CO pre-fill)
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load contract data');
    } finally {
      setLoading(false);
    }
  };

  // Helper to get initials from org name
  const getOrgInitials = (name: string | undefined): string => {
    if (!name) return 'XX';
    return name.replace(/^(the\s+)/i, '').trim().substring(0, 2).toUpperCase();
  };

  // Generate invoice number when contract is selected
  useEffect(() => {
    if (!selectedContract) {
      setInvoiceNumber('');
      return;
    }

    const generate = async () => {
      const fromInitials = getOrgInitials(selectedContract.from_org_name);
      const toInitials = getOrgInitials(selectedContract.to_org_name);
      const prefix = `INV-${fromInitials}-${toInitials}`;

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
  }, [selectedContract, projectId]);

  const handleSubmit = async () => {
    if (!user || !selectedContract) return;

    setSaving(true);
    try {
      // Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          project_id: projectId,
          contract_id: selectedContract.id,
          po_id: po.id,
          sov_id: null,
          invoice_number: invoiceNumber,
          billing_period_start: format(periodStart, 'yyyy-MM-dd'),
          billing_period_end: format(periodEnd, 'yyyy-MM-dd'),
          subtotal: invoiceTotal,
          retainage_amount: retainageAmount,
          total_amount: netAmount,
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
        retainage_percent: retainagePercent,
        retainage_amount: (item.line_total || 0) * (retainagePercent / 100),
        sort_order: index,
      }));

      // Add markup line item if applicable
      if (calculatedMarkup > 0) {
        invoiceLineItems.push({
          invoice_id: invoice.id,
          description: markupType === 'percent'
            ? `Material Markup (${markupPercent}%)`
            : 'Material Markup',
          scheduled_value: calculatedMarkup,
          previous_billed: 0,
          current_billed: calculatedMarkup,
          total_billed: calculatedMarkup,
          retainage_percent: retainagePercent,
          retainage_amount: calculatedMarkup * (retainagePercent / 100),
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
        description: `Invoice ${invoiceNumber} created from PO ${po.po_number} for ${formatCurrency(invoiceTotal)}`,
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
            Bill to GC — {po.po_number}
          </DialogTitle>
          <DialogDescription>
            Create a draft invoice from this priced Purchase Order to bill the General Contractor.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : contracts.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No TC-to-GC contract found for this project. A contract must exist before you can bill the GC.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6 py-2">
            {/* Invoice Total Preview */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Invoice Total</p>
                      <p className="text-2xl font-bold">{formatCurrency(invoiceTotal)}</p>
                    </div>
                  </div>
                  {retainagePercent > 0 && (
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">Less {retainagePercent}% retainage</p>
                      <p className="font-medium">Net: {formatCurrency(netAmount)}</p>
                    </div>
                  )}
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
                        Supplier Subtotal
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(supplierSubtotal)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>

            <Separator />

            {/* Markup Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Material Markup</Label>
              <div className="flex items-center gap-3">
                <Select
                  value={markupType}
                  onValueChange={(v) => setMarkupType(v as 'percent' | 'flat')}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="flat">Flat Amount</SelectItem>
                  </SelectContent>
                </Select>

                {markupType === 'percent' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-24"
                      value={markupPercent || ''}
                      onChange={(e) => setMarkupPercent(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                    {calculatedMarkup > 0 && (
                      <span className="text-sm text-muted-foreground ml-2">
                        = {formatCurrency(calculatedMarkup)}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-32"
                      value={markupAmount || ''}
                      onChange={(e) => setMarkupAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Supplier Cost ({formatCurrency(supplierSubtotal)}) + Markup ({formatCurrency(calculatedMarkup)}) = {formatCurrency(invoiceTotal)}
              </p>
            </div>

            <Separator />

            {/* Contract Selection */}
            {contracts.length > 1 && (
              <div className="space-y-2">
                <Label>Contract</Label>
                <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select TC-to-GC contract" />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.from_org_name} → {c.to_org_name} — {formatCurrency(c.contract_sum)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(periodStart, 'MMM d, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={periodStart} onSelect={(d) => d && setPeriodStart(d)} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(periodEnd, 'MMM d, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={periodEnd} onSelect={(d) => d && setPeriodEnd(d)} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !selectedContractId || !invoiceNumber || contracts.length === 0}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Receipt className="h-4 w-4 mr-2" />}
            Create Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

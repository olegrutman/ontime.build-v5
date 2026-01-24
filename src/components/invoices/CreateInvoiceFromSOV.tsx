import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { CalendarIcon, AlertCircle, FileText, DollarSign } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getContractDisplayName } from '@/hooks/useContractSOV';

interface Contract {
  id: string;
  from_role: string;
  to_role: string;
  contract_sum: number;
  retainage_percent: number;
}

interface SOV {
  id: string;
  contract_id: string;
  sov_name: string;
}

interface SOVItem {
  id: string;
  sov_id: string;
  item_name: string;
  percent_of_contract: number;
  value_amount: number;
  total_completion_percent: number;
  total_billed_amount: number;
  sort_order: number;
}

interface BillingItem extends SOVItem {
  enabled: boolean;
  thisBillPercent: number;
  thisBillAmount: number;
  maxAllowedPercent: number;
}

interface CreateInvoiceFromSOVProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CreateInvoiceFromSOV({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: CreateInvoiceFromSOVProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [sovs, setSovs] = useState<SOV[]>([]);
  const [sovItems, setSovItems] = useState<SOVItem[]>([]);
  
  // Selection
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [billingItems, setBillingItems] = useState<BillingItem[]>([]);
  
  // Invoice details
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [periodStart, setPeriodStart] = useState<Date>(startOfMonth(subMonths(new Date(), 1)));
  const [periodEnd, setPeriodEnd] = useState<Date>(endOfMonth(subMonths(new Date(), 1)));
  const [notes, setNotes] = useState('');

  // Fetch contracts and SOVs
  useEffect(() => {
    if (open) {
      fetchData();
      generateInvoiceNumber();
    }
  }, [open, projectId]);

  const fetchData = async () => {
    setLoading(true);
    
    try {
      // Fetch contracts
      const { data: contractsData } = await supabase
        .from('project_contracts')
        .select('id, from_role, to_role, contract_sum, retainage_percent')
        .eq('project_id', projectId);
      
      setContracts((contractsData || []) as Contract[]);
      
      // Fetch SOVs
      const { data: sovsData } = await supabase
        .from('project_sov')
        .select('id, contract_id, sov_name')
        .eq('project_id', projectId);
      
      setSovs((sovsData || []) as SOV[]);
      
      // Fetch all SOV items
      if (sovsData && sovsData.length > 0) {
        const { data: itemsData } = await supabase
          .from('project_sov_items')
          .select('*')
          .in('sov_id', sovsData.map(s => s.id))
          .order('sort_order');
        
        setSovItems((itemsData || []) as SOVItem[]);
      }
      
      // Auto-select first contract if only one
      if (contractsData && contractsData.length === 1) {
        setSelectedContractId(contractsData[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load SOV data');
    } finally {
      setLoading(false);
    }
  };

  const generateInvoiceNumber = async () => {
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);
    
    const nextNumber = (count || 0) + 1;
    setInvoiceNumber(`INV-${nextNumber.toString().padStart(4, '0')}`);
  };

  // Get the selected contract and its SOV
  const selectedContract = useMemo(() => 
    contracts.find(c => c.id === selectedContractId),
    [contracts, selectedContractId]
  );
  
  const selectedSOV = useMemo(() => 
    sovs.find(s => s.contract_id === selectedContractId),
    [sovs, selectedContractId]
  );

  // Update billing items when contract changes
  useEffect(() => {
    if (selectedSOV) {
      const items = sovItems
        .filter(item => item.sov_id === selectedSOV.id)
        .map(item => ({
          ...item,
          enabled: false,
          thisBillPercent: 0,
          thisBillAmount: 0,
          maxAllowedPercent: Math.max(0, 100 - (item.total_completion_percent || 0)),
        }));
      setBillingItems(items);
    } else {
      setBillingItems([]);
    }
  }, [selectedSOV, sovItems]);

  // Calculate gross amount
  const grossAmount = useMemo(() => 
    billingItems
      .filter(item => item.enabled)
      .reduce((sum, item) => sum + item.thisBillAmount, 0),
    [billingItems]
  );

  const retainagePercent = selectedContract?.retainage_percent || 0;
  const retainageAmount = grossAmount * (retainagePercent / 100);
  const netAmount = grossAmount - retainageAmount;

  // Check if any items have errors
  const hasErrors = billingItems.some(item => 
    item.enabled && item.thisBillPercent > item.maxAllowedPercent
  );
  
  const hasSelectedItems = billingItems.some(item => item.enabled && item.thisBillPercent > 0);

  const handleToggleItem = (itemId: string, enabled: boolean) => {
    setBillingItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            enabled, 
            thisBillPercent: enabled ? item.thisBillPercent : 0,
            thisBillAmount: enabled ? item.thisBillAmount : 0,
          } 
        : item
    ));
  };

  const handlePercentChange = (itemId: string, percent: number) => {
    setBillingItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      
      const clampedPercent = Math.min(Math.max(0, percent), 100);
      const billAmount = Math.round((item.value_amount * clampedPercent / 100) * 100) / 100;
      
      return {
        ...item,
        thisBillPercent: clampedPercent,
        thisBillAmount: billAmount,
      };
    }));
  };

  const handleSubmit = async () => {
    if (!user || !selectedContract || !selectedSOV) return;

    if (!hasSelectedItems) {
      toast.error('Please select at least one SOV item to bill');
      return;
    }

    if (hasErrors) {
      toast.error('Please fix overbilling errors before creating invoice');
      return;
    }

    setSaving(true);

    try {
      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          project_id: projectId,
          contract_id: selectedContract.id,
          sov_id: selectedSOV.id,
          invoice_number: invoiceNumber,
          billing_period_start: format(periodStart, 'yyyy-MM-dd'),
          billing_period_end: format(periodEnd, 'yyyy-MM-dd'),
          subtotal: grossAmount,
          retainage_amount: retainageAmount,
          total_amount: netAmount,
          notes: notes || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create line items for enabled items only
      const enabledItems = billingItems.filter(item => item.enabled && item.thisBillPercent > 0);
      
      const lineItemsToInsert = enabledItems.map((item, index) => ({
        invoice_id: invoice.id,
        sov_item_id: item.id,
        description: item.item_name,
        scheduled_value: item.value_amount,
        previous_billed: item.total_billed_amount || 0,
        current_billed: item.thisBillAmount,
        total_billed: (item.total_billed_amount || 0) + item.thisBillAmount,
        billed_percent: item.thisBillPercent,
        retainage_percent: retainagePercent,
        retainage_amount: item.thisBillAmount * (retainagePercent / 100),
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
        description: `Invoice ${invoiceNumber} created for ${formatCurrency(grossAmount)}`,
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
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedContractId('');
    setBillingItems([]);
    setInvoiceNumber('');
    setNotes('');
    setPeriodStart(startOfMonth(subMonths(new Date(), 1)));
    setPeriodEnd(endOfMonth(subMonths(new Date(), 1)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice from SOV</DialogTitle>
          <DialogDescription>
            Select SOV items and set completion percentage to generate an invoice.
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
              No contracts found. Please add contracts in Project Setup first.
            </AlertDescription>
          </Alert>
        ) : sovs.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No SOV found. Please create a Schedule of Values first.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6 py-4">
            {/* Gross Amount Summary */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gross Amount</p>
                      <p className="text-2xl font-bold">{formatCurrency(grossAmount)}</p>
                    </div>
                  </div>
                  {retainagePercent > 0 && grossAmount > 0 && (
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">Less {retainagePercent}% retainage</p>
                      <p className="font-medium">Net: {formatCurrency(netAmount)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contract Selection */}
            {contracts.length > 1 && (
              <div className="space-y-2">
                <Label>Select Contract</Label>
                <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a contract to bill" />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.map(contract => (
                      <SelectItem key={contract.id} value={contract.id}>
                        {getContractDisplayName(contract.from_role, contract.to_role)} — {formatCurrency(contract.contract_sum)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Invoice Details */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="INV-0001"
                />
              </div>
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(periodStart, 'MMM d, yyyy')}
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
                <Label>Period End</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(periodEnd, 'MMM d, yyyy')}
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

            {/* SOV Items */}
            {selectedContractId && billingItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Select SOV Items to Bill</Label>
                    <p className="text-sm text-muted-foreground">
                      Toggle items and set completion percentage for this billing period
                    </p>
                  </div>
                  <Badge variant="secondary">{billingItems.length} items</Badge>
                </div>

                <div className="space-y-2">
                  {billingItems.map((item) => {
                    const isOverBilling = item.thisBillPercent > item.maxAllowedPercent;
                    const previousPercent = item.total_completion_percent || 0;
                    
                    return (
                      <Card 
                        key={item.id} 
                        className={cn(
                          "transition-colors",
                          item.enabled ? "border-primary/50" : "opacity-60",
                          isOverBilling && "border-destructive bg-destructive/5"
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Toggle */}
                            <Switch
                              checked={item.enabled}
                              onCheckedChange={(checked) => handleToggleItem(item.id, checked)}
                              className="mt-1"
                            />

                            {/* Item details */}
                            <div className="flex-1 min-w-0 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="font-medium truncate">{item.item_name}</span>
                                <span className="text-sm text-muted-foreground flex-shrink-0 ml-2">
                                  {formatCurrency(item.value_amount)}
                                </span>
                              </div>

                              {item.enabled && (
                                <>
                                  {/* Previous billing info */}
                                  {previousPercent > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      Previously billed: {previousPercent.toFixed(1)}% ({formatCurrency(item.total_billed_amount || 0)})
                                    </div>
                                  )}

                                  {/* Slider and input */}
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                      <Slider
                                        value={[item.thisBillPercent]}
                                        onValueChange={([value]) => handlePercentChange(item.id, value)}
                                        max={100}
                                        step={1}
                                        disabled={!item.enabled}
                                        className={cn(isOverBilling && "[&_[role=slider]]:bg-destructive")}
                                      />
                                    </div>
                                    <div className="flex items-center gap-1 w-24">
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        value={item.thisBillPercent}
                                        onChange={(e) => handlePercentChange(item.id, parseFloat(e.target.value) || 0)}
                                        disabled={!item.enabled}
                                        className={cn(
                                          "h-8 w-16 text-right",
                                          isOverBilling && "border-destructive"
                                        )}
                                      />
                                      <span className="text-sm">%</span>
                                    </div>
                                  </div>

                                  {/* This bill amount and error */}
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-primary">
                                      This bill: {formatCurrency(item.thisBillAmount)}
                                    </span>
                                    {isOverBilling && (
                                      <span className="text-xs text-destructive flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Max allowed: {item.maxAllowedPercent.toFixed(1)}%
                                      </span>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedContractId && billingItems.length === 0 && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  No SOV items found for this contract. Create an SOV first.
                </AlertDescription>
              </Alert>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={saving || !hasSelectedItems || hasErrors || !selectedContractId}
          >
            {saving ? 'Creating...' : 'Create Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

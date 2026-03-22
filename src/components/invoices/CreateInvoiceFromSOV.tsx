import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { CalendarIcon, AlertCircle, FileText, DollarSign, CheckCircle } from 'lucide-react';
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
  from_org_id: string | null;
  to_org_id: string | null;
  from_org_name?: string;
  to_org_name?: string;
  trade?: string | null;
}

interface SOV {
  id: string;
  contract_id: string | null;
  sov_name: string | null;
  version: number;
  is_locked: boolean;
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

export interface RevisionData {
  contractId: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  notes: string | null;
  revisionCount: number;
  lineItems: Array<{
    sov_item_id: string;
    billed_percent: number;
    current_billed: number;
  }>;
}

interface CreateInvoiceFromSOVProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
  // Revision mode
  revisionInvoiceId?: string;
  revisionData?: RevisionData;
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
  revisionInvoiceId,
  revisionData,
}: CreateInvoiceFromSOVProps) {
  const { user, userOrgRoles } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const isRevisionMode = !!revisionInvoiceId && !!revisionData;
  
  // Data
  const [allContracts, setAllContracts] = useState<Contract[]>([]);
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

  // Get current user's organization info
  const currentOrgId = userOrgRoles[0]?.organization?.id;
  const currentOrgType = userOrgRoles[0]?.organization?.type;

  // Filter contracts to only UPSTREAM contracts where user can invoice
  const contracts = useMemo(() => {
    if (!currentOrgId) return [];
    const userContracts = allContracts.filter(c => c.from_org_id === currentOrgId);
    return userContracts.filter(c => {
      if (!c.contract_sum || c.contract_sum <= 0) return false;
      if (currentOrgType === 'TC') {
        return c.to_role === 'General Contractor';
      }
      if (currentOrgType === 'FC') {
        return c.to_role === 'Trade Contractor';
      }
      return false;
    });
  }, [allContracts, currentOrgId, currentOrgType]);

  // Fetch contracts and SOVs
  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, projectId]);

  const fetchData = async () => {
    setLoading(true);
    
    try {
      const { data: contractsData } = await supabase
        .from('project_contracts')
        .select(`
          id, from_role, to_role, contract_sum, retainage_percent, from_org_id, to_org_id, trade,
          from_org:organizations!project_contracts_from_org_id_fkey(name),
          to_org:organizations!project_contracts_to_org_id_fkey(name)
        `)
        .eq('project_id', projectId);
      
      const mappedContracts: Contract[] = (contractsData || []).map((c: any) => ({
        id: c.id,
        from_role: c.from_role,
        to_role: c.to_role,
        contract_sum: c.contract_sum,
        retainage_percent: c.retainage_percent,
        from_org_id: c.from_org_id,
        to_org_id: c.to_org_id,
        from_org_name: c.from_org?.name || undefined,
        to_org_name: c.to_org?.name || undefined,
        trade: c.trade || null,
      }));
      
      setAllContracts(mappedContracts);
      
      const { data: sovsData } = await supabase
        .from('project_sov')
        .select('id, contract_id, sov_name, version, is_locked')
        .eq('project_id', projectId)
        .order('version', { ascending: false });
      
      setSovs((sovsData || []) as SOV[]);
      
      if (sovsData && sovsData.length > 0) {
        const { data: itemsData } = await supabase
          .from('project_sov_items')
          .select('*')
          .in('sov_id', sovsData.map(s => s.id))
          .order('sort_order');
        
        setSovItems((itemsData || []) as SOVItem[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load SOV data');
    } finally {
      setLoading(false);
    }
  };

  // Reset/pre-populate when dialog opens
  useEffect(() => {
    if (open) {
      if (isRevisionMode) {
        setSelectedContractId(revisionData.contractId);
        setInvoiceNumber(revisionData.invoiceNumber);
        setPeriodStart(new Date(revisionData.periodStart));
        setPeriodEnd(new Date(revisionData.periodEnd));
        setNotes(revisionData.notes || '');
      } else {
        setSelectedContractId('');
        setInvoiceNumber('');
        setNotes('');
        setPeriodStart(startOfMonth(subMonths(new Date(), 1)));
        setPeriodEnd(endOfMonth(subMonths(new Date(), 1)));
      }
    }
  }, [open, isRevisionMode]);

  // Helper to get initials from company name
  const getOrgInitials = (name: string | undefined): string => {
    if (!name) return 'XX';
    const cleaned = name.replace(/^(the\s+)/i, '').trim();
    return cleaned.substring(0, 2).toUpperCase();
  };

  const generateInvoiceNumber = async (contract: Contract) => {
    const fromInitials = getOrgInitials(contract.from_org_name);
    const toInitials = getOrgInitials(contract.to_org_name);
    const prefix = `INV-${fromInitials}-${toInitials}`;
    
    const { data } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('project_id', projectId);
    
    let maxNumber = 0;
    if (data && data.length > 0) {
      const prefixPattern = new RegExp(`^${prefix}-(\\d+)$`);
      data.forEach(inv => {
        const match = inv.invoice_number.match(prefixPattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) maxNumber = num;
        }
      });
    }
    setInvoiceNumber(`${prefix}-${(maxNumber + 1).toString().padStart(4, '0')}`);
  };

  // Get the selected contract and its SOV
  const selectedContract = useMemo(() => 
    contracts.find(c => c.id === selectedContractId),
    [contracts, selectedContractId]
  );
  
  const selectedSOV = useMemo(() => {
    const contractSovs = sovs.filter(s => s.contract_id === selectedContractId);
    // Prefer latest locked version; fall back to latest version (already sorted DESC)
    return contractSovs.find(s => s.is_locked) || contractSovs[0] || null;
  }, [sovs, selectedContractId]);

  const sovNotLocked = selectedSOV && !selectedSOV.is_locked;

  // Generate invoice number when contract is selected (only in create mode)
  useEffect(() => {
    if (isRevisionMode) return; // Don't regenerate in revision mode
    if (selectedContract) {
      generateInvoiceNumber(selectedContract);
    } else {
      setInvoiceNumber('');
    }
  }, [selectedContract, isRevisionMode]);

  // Update billing items when contract changes
  useEffect(() => {
    if (selectedSOV) {
      const items = sovItems
        .filter(item => item.sov_id === selectedSOV.id)
        .map(item => {
          // In revision mode, check if this SOV item was in the original invoice
          const revisionLine = isRevisionMode
            ? revisionData.lineItems.find(li => li.sov_item_id === item.id)
            : null;

          // Max percent is simply what's remaining — the rejection trigger already
          // subtracted the old billing from total_completion_percent
          const adjustedMaxPercent = Math.max(0, 100 - (item.total_completion_percent || 0));

          return {
            ...item,
            enabled: revisionLine ? true : false,
            thisBillPercent: revisionLine ? revisionLine.billed_percent : 0,
            thisBillAmount: revisionLine
              ? Math.round((item.value_amount * revisionLine.billed_percent / 100) * 100) / 100
              : 0,
            maxAllowedPercent: adjustedMaxPercent,
          };
        });
      setBillingItems(items);
    } else {
      setBillingItems([]);
    }
  }, [selectedSOV, sovItems, isRevisionMode]);

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
      const clampedPercent = Math.min(Math.max(0, percent), item.maxAllowedPercent);
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
      toast.error('Please fix overbilling errors before submitting');
      return;
    }

    setSaving(true);

    try {
      const enabledItems = billingItems.filter(item => item.enabled && item.thisBillPercent > 0);

      if (isRevisionMode) {
        // --- REVISION MODE: Update existing invoice ---
        // IMPORTANT: Order matters! The status-change trigger reads line items,
        // so we must delete old → insert new → then update status.

        // 1. Set status to DRAFT so RLS allows line item operations
        const { error: draftError } = await supabase
          .from('invoices')
          .update({ status: 'DRAFT' })
          .eq('id', revisionInvoiceId);

        if (draftError) throw draftError;

        // 2. Delete old line items
        const { error: deleteError } = await supabase
          .from('invoice_line_items')
          .delete()
          .eq('invoice_id', revisionInvoiceId);

        if (deleteError) throw deleteError;

        // 3. Insert new line items (RLS passes because status is now DRAFT)
        const lineItemsToInsert = enabledItems.map((item, index) => {
          // The rejection trigger already removed the old billing from total_billed_amount,
          // so use it directly — no subtraction needed.
          const previousBilled = item.total_billed_amount || 0;

          return {
            invoice_id: revisionInvoiceId,
            sov_item_id: item.id,
            description: item.item_name,
            scheduled_value: item.value_amount,
            previous_billed: previousBilled,
            current_billed: item.thisBillAmount,
            total_billed: previousBilled + item.thisBillAmount,
            billed_percent: item.thisBillPercent,
            retainage_percent: retainagePercent,
            retainage_amount: item.thisBillAmount * (retainagePercent / 100),
            sort_order: index,
          };
        });

        const { error: lineItemsError } = await supabase
          .from('invoice_line_items')
          .insert(lineItemsToInsert);

        if (lineItemsError) throw lineItemsError;

        // 4. Update invoice to SUBMITTED — trigger fires here and reads NEW line items
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            status: 'SUBMITTED',
            billing_period_start: format(periodStart, 'yyyy-MM-dd'),
            billing_period_end: format(periodEnd, 'yyyy-MM-dd'),
            notes: notes || null,
            subtotal: grossAmount,
            retainage_amount: retainageAmount,
            total_amount: netAmount,
            submitted_at: new Date().toISOString(),
            submitted_by: user.id,
            revision_count: revisionData.revisionCount + 1,
            rejected_at: null,
            rejected_by: null,
            rejection_reason: null,
          })
          .eq('id', revisionInvoiceId);

        if (updateError) throw updateError;

        // 5. Update SOV billing totals
        await supabase.rpc('update_sov_billing_totals', { p_project_id: projectId });

        // Log activity
        await supabase.from('project_activity').insert({
          project_id: projectId,
          activity_type: 'INVOICE_SUBMITTED',
          description: `Invoice ${revisionData.invoiceNumber} revised and resubmitted (Rev ${revisionData.revisionCount + 1})`,
          actor_user_id: user.id,
        });

        toast.success('Invoice revised and resubmitted');
      } else {
        // --- CREATE MODE: Insert new invoice ---
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

        await supabase.from('project_activity').insert({
          project_id: projectId,
          activity_type: 'INVOICE_CREATED',
          description: `Invoice ${invoiceNumber} created for ${formatCurrency(grossAmount)}`,
          actor_user_id: user.id,
        });

        toast.success('Invoice created successfully');
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      toast.error(error.message || 'Failed to save invoice');
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
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{isRevisionMode ? 'Revise & Resubmit Invoice' : 'Create Invoice from SOV'}</DialogTitle>
          <DialogDescription>
            {isRevisionMode
              ? `Adjust SOV item percentages for ${revisionData?.invoiceNumber} and resubmit.`
              : 'Select SOV items and set completion percentage to generate an invoice.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
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
              No contracts available for invoicing. You can only create invoices for contracts where your organization is the contractor (Trade Contractor or Field Crew). Please accept a contract first.
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
            {/* Contract Selection - hidden/locked in revision mode */}
            {isRevisionMode ? (
              <div className="space-y-2">
                <Label>Contract</Label>
                <Input
                  value={
                    selectedContract
                      ? `${getContractDisplayName(selectedContract.from_role, selectedContract.to_role, selectedContract.from_org_name, selectedContract.to_org_name)} — ${formatCurrency(selectedContract.contract_sum || 0)}`
                      : 'Loading...'
                  }
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Contract is locked for revision.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Select Contract to Invoice</Label>
                <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a contract to bill" />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.map(contract => {
                      const isWorkOrder = contract.trade === 'Work Order' || contract.trade === 'Work Order Labor';
                      const typeLabel = isWorkOrder ? '[Work Order]' : '[Contract]';
                      return (
                        <SelectItem key={contract.id} value={contract.id}>
                          {typeLabel} {getContractDisplayName(contract.from_role, contract.to_role, contract.from_org_name, contract.to_org_name)} — {formatCurrency(contract.contract_sum || 0)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select the contract with your upstream party to create an invoice.
                </p>
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
                  disabled={isRevisionMode}
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
                    // In revision mode, show adjusted previous percent (excluding original billing)
                    const revisionLine = isRevisionMode
                      ? revisionData.lineItems.find(li => li.sov_item_id === item.id)
                      : null;
                    const adjustedPreviousPercent = revisionLine
                      ? (item.total_completion_percent || 0) - revisionLine.billed_percent
                      : (item.total_completion_percent || 0);
                    const previousPercent = adjustedPreviousPercent;
                    const newTotalPercent = previousPercent + item.thisBillPercent;
                    const adjustedPreviousBilled = revisionLine
                      ? (item.total_billed_amount || 0) - revisionLine.current_billed
                      : (item.total_billed_amount || 0);
                    const previousBilledAmount = adjustedPreviousBilled;
                    
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
                            <Switch
                              checked={item.enabled}
                              onCheckedChange={(checked) => handleToggleItem(item.id, checked)}
                              className="mt-1"
                            />

                            <div className="flex-1 min-w-0 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="font-medium truncate">{item.item_name}</span>
                                <span className="text-sm text-muted-foreground flex-shrink-0 ml-2">
                                  {formatCurrency(item.value_amount)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                  {previousBilledAmount > 0 
                                    ? `Previously billed: ${formatCurrency(previousBilledAmount)} (${previousPercent.toFixed(1)}%)`
                                    : 'Not yet billed'
                                  }
                                </span>
                                <span className={cn(
                                  "font-medium",
                                  item.maxAllowedPercent === 0 
                                    ? "text-green-600 dark:text-green-400" 
                                    : "text-muted-foreground"
                                )}>
                                  {item.maxAllowedPercent === 0 
                                    ? "Fully billed" 
                                    : `${formatCurrency(item.value_amount - previousBilledAmount)} remaining`
                                  }
                                </span>
                              </div>

                              {item.enabled && (
                                <>
                                  {item.maxAllowedPercent === 0 ? (
                                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                                      <CheckCircle className="h-4 w-4" />
                                      <span>Fully billed (100%)</span>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                          <div className="flex items-center gap-3">
                                            {previousPercent > 0 && (
                                              <span className="flex items-center gap-1.5">
                                                <span className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/40" />
                                                <span className="text-muted-foreground">
                                                  Previous: {previousPercent.toFixed(1)}% ({formatCurrency(previousBilledAmount)})
                                                </span>
                                              </span>
                                            )}
                                            {item.thisBillPercent > 0 && (
                                              <span className="flex items-center gap-1.5">
                                                <span className="w-2.5 h-2.5 rounded-sm bg-primary" />
                                                <span className="font-medium text-primary">
                                                  This bill: {item.thisBillPercent.toFixed(1)}% ({formatCurrency(item.thisBillAmount)})
                                                </span>
                                              </span>
                                            )}
                                          </div>
                                          <span className={cn(
                                            "font-medium",
                                            newTotalPercent === 100 ? "text-green-600 dark:text-green-400" : 
                                            "text-muted-foreground"
                                          )}>
                                            {newTotalPercent.toFixed(1)}% total
                                          </span>
                                        </div>
                                        
                                        <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
                                          <div 
                                            className="absolute inset-y-0 left-0 bg-muted-foreground/40 transition-all duration-300"
                                            style={{ width: `${Math.min(previousPercent, 100)}%` }}
                                          />
                                          <div 
                                            className="absolute inset-y-0 bg-primary transition-all duration-300"
                                            style={{ 
                                              left: `${Math.min(previousPercent, 100)}%`,
                                              width: `${Math.min(item.thisBillPercent, 100 - previousPercent)}%`
                                            }}
                                          />
                                          {newTotalPercent > 0 && newTotalPercent < 100 && (
                                            <div className="absolute right-0 top-0 bottom-0 w-px bg-border" />
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                          <Slider
                                            value={[item.thisBillPercent]}
                                            onValueChange={([value]) => handlePercentChange(item.id, value)}
                                            max={item.maxAllowedPercent}
                                            step={1}
                                            disabled={!item.enabled}
                                          />
                                        </div>
                                        <div className="flex items-center gap-1 w-24">
                                          <Input
                                            type="number"
                                            min="0"
                                            max={item.maxAllowedPercent}
                                            step="0.5"
                                            value={item.thisBillPercent}
                                            onChange={(e) => handlePercentChange(item.id, parseFloat(e.target.value) || 0)}
                                            disabled={!item.enabled}
                                            className="h-8 w-16 text-right"
                                          />
                                          <span className="text-sm">%</span>
                                        </div>
                                      </div>

                                      <div className="text-xs text-muted-foreground">
                                        Max available: {item.maxAllowedPercent.toFixed(1)}%
                                      </div>
                                    </>
                                  )}
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
        </div>

        <div className="shrink-0 border-t bg-background pt-4 space-y-4">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={saving || !hasSelectedItems || hasErrors || !selectedContractId}
            >
              {saving
                ? (isRevisionMode ? 'Resubmitting...' : 'Creating...')
                : (isRevisionMode ? 'Resubmit Invoice' : 'Create Invoice')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

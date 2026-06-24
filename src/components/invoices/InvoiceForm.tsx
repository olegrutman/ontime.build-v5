import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Receipt,
  Save,
  Send,
  Plus,
  Trash2,
  FileText,
  Loader2,
  CheckCircle
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

type UnitType = 'HR' | 'EA' | 'LF' | 'SF' | 'SY' | 'DAY' | 'LS';
type AppRole = 'FIELD_CREW' | 'GC' | 'TRADE_CONTRACTOR';

interface LineItem {
  id?: string;
  description: string;
  qty: number;
  unit: UnitType;
  unit_cost: number;
  amount: number;
  source_sov_item_id?: string;
}

interface SovLineItem {
  id: string;
  name: string;
  percent: number;
  amount: number | null;
  sort_order: number;
}

interface SovData {
  id: string;
  status: string;
  contract_value?: number;
}

interface PreviouslyBilledItem {
  sov_item_id: string;
  billed_percent: number;
}


interface InvoiceFormProps {
  projectId: string;
  contractContextId: string;
  existingInvoiceId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function InvoiceForm({
  projectId,
  contractContextId,
  existingInvoiceId,
  onClose,
  onSaved
}: InvoiceFormProps) {
  const { user } = useAuth();
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', qty: 1, unit: 'LS' as UnitType, unit_cost: 0, amount: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState(1);
  const [invoiceId, setInvoiceId] = useState<string | null>(existingInvoiceId || null);
  
  // SOV-related state
  const [activeSov, setActiveSov] = useState<SovData | null>(null);
  const [sovLineItems, setSovLineItems] = useState<SovLineItem[]>([]);
  const [selectedSovItems, setSelectedSovItems] = useState<Map<string, number>>(new Map());
  const [previouslyBilled, setPreviouslyBilled] = useState<Map<string, number>>(new Map());
  const [contractValue, setContractValue] = useState(0);
  const [invoiceMode, setInvoiceMode] = useState<'sov' | 'manual'>('sov');
  const [retainagePercent, setRetainagePercent] = useState(0);

  useEffect(() => {
    initializeInvoice();
  }, []);

  const initializeInvoice = async () => {
    setLoading(true);
    try {
      // Fetch project retainage percentage
      const { data: contextData } = await supabase
        .from('contract_contexts')
        .select('project_id')
        .eq('id', contractContextId)
        .single();
      
      if (contextData?.project_id) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('retainage_percent')
          .eq('id', contextData.project_id)
          .single();
        
        if (projectData?.retainage_percent) {
          setRetainagePercent(Number(projectData.retainage_percent));
        }
      }

      // First, check for active SOV
      const { data: sovData, error: sovError } = await supabase
        .from('sovs')
        .select('id, status, contract_value')
        .eq('contract_context_id', contractContextId)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (sovData && !sovError) {
        setActiveSov(sovData);
        
        // Use contract value from SOV
        if (sovData.contract_value) {
          setContractValue(Number(sovData.contract_value));
        }
        
        // Fetch SOV line items
        const { data: sovItems } = await supabase
          .from('sov_line_items')
          .select('id, name, percent, amount, sort_order')
          .eq('sov_id', sovData.id)
          .order('sort_order', { ascending: true });

        if (sovItems) {
          setSovLineItems(sovItems);
        }

        // Fetch previously billed percentages from past invoices
        const { data: previousInvoices } = await supabase
          .from('invoices')
          .select('id')
          .eq('contract_context_id', contractContextId)
          .in('status', ['SUBMITTED', 'PAID']);

        if (previousInvoices && previousInvoices.length > 0) {
          const invoiceIds = previousInvoices.map(inv => inv.id);
          const { data: previousItems } = await supabase
            .from('invoice_line_items')
            .select('description, amount')
            .in('invoice_id', invoiceIds);

          // Match previous items to SOV items by description and calculate billed %
          if (previousItems && sovItems) {
            const billedMap = new Map<string, number>();
            
            sovItems.forEach(sovItem => {
              const matchingItems = previousItems.filter(
                pi => pi.description === sovItem.name || pi.description.includes(sovItem.name)
              );
              const totalBilledAmount = matchingItems.reduce((sum, item) => sum + (item.amount || 0), 0);
              const sovItemAmount = sovItem.amount || (contractValue * (sovItem.percent || 0) / 100);
              
              if (sovItemAmount > 0) {
                const billedPercent = (totalBilledAmount / sovItemAmount) * 100;
                billedMap.set(sovItem.id, Math.min(billedPercent, 100));
              }
            });
            
            setPreviouslyBilled(billedMap);
          }
        }
      } else {
        // No active SOV, use manual mode
        setInvoiceMode('manual');
      }

      if (existingInvoiceId) {
        // Load existing invoice
        const [invoiceResult, itemsResult] = await Promise.all([
          supabase.from('invoices').select('invoice_number').eq('id', existingInvoiceId).single(),
          supabase.from('invoice_line_items').select('*').eq('invoice_id', existingInvoiceId)
        ]);

        if (invoiceResult.data) {
          setInvoiceNumber(invoiceResult.data.invoice_number);
        }

        if (itemsResult.data && itemsResult.data.length > 0) {
          setLineItems(itemsResult.data.map(item => ({
            id: item.id,
            description: item.description,
            qty: item.qty || 1,
            unit: item.unit || 'LS',
            unit_cost: item.unit_cost || 0,
            amount: item.amount
          })));
        }
      } else {
        // Get next invoice number
        const { data: latestInvoice } = await supabase
          .from('invoices')
          .select('invoice_number')
          .eq('contract_context_id', contractContextId)
          .order('invoice_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        setInvoiceNumber(latestInvoice ? latestInvoice.invoice_number + 1 : 1);
      }
    } catch (error) {
      console.error('Error initializing invoice:', error);
      toast.error('Failed to initialize invoice');
    } finally {
      setLoading(false);
    }
  };

  const updateLineItem = (index: number, updates: Partial<LineItem>) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, ...updates };
      updated.amount = updated.qty * updated.unit_cost;
      return updated;
    }));
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, { description: '', qty: 1, unit: 'LS' as UnitType, unit_cost: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const toggleSovItem = (itemId: string, checked: boolean) => {
    setSelectedSovItems(prev => {
      const newMap = new Map(prev);
      if (checked) {
        const alreadyBilled = previouslyBilled.get(itemId) || 0;
        newMap.set(itemId, Math.min(100 - alreadyBilled, 100));
      } else {
        newMap.delete(itemId);
      }
      return newMap;
    });
  };

  const updateSovItemPercent = (itemId: string, percent: number) => {
    const alreadyBilled = previouslyBilled.get(itemId) || 0;
    const maxPercent = 100 - alreadyBilled;
    setSelectedSovItems(prev => {
      const newMap = new Map(prev);
      newMap.set(itemId, Math.min(Math.max(0, percent), maxPercent));
      return newMap;
    });
  };

  const calculateSovTotal = () => {
    let total = 0;
    selectedSovItems.forEach((percent, itemId) => {
      const sovItem = sovLineItems.find(s => s.id === itemId);
      if (sovItem) {
        const itemValue = sovItem.amount || (contractValue * (sovItem.percent || 0) / 100);
        total += (itemValue * percent) / 100;
      }
    });
    return total;
  };

  const calculateManualTotal = () => {
    return lineItems.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTotal = () => {
    return invoiceMode === 'sov' ? calculateSovTotal() : calculateManualTotal();
  };

  const calculateRetainage = () => {
    return calculateTotal() * (retainagePercent / 100);
  };

  const calculateNetPayable = () => {
    return calculateTotal() - calculateRetainage();
  };

  const saveInvoice = async (submit = false) => {
    if (!user?.id) {
      toast.error('You must be logged in');
      return;
    }

    const total = calculateTotal();
    if (total <= 0) {
      toast.error('Invoice total must be greater than zero');
      return;
    }

    setSaving(true);
    try {
      let currentInvoiceId = invoiceId;

      if (!currentInvoiceId) {
        // Create new invoice as DRAFT first (line items can only be added to DRAFT invoices)
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            contract_context_id: contractContextId,
            invoice_number: invoiceNumber,
            created_by_user_id: user.id,
            status: 'DRAFT',
            submitted_at: null,
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;
        currentInvoiceId = newInvoice.id;
        setInvoiceId(currentInvoiceId);
      } else {
        // Ensure invoice is DRAFT while we rewrite line items
        const { error: updateToDraftError } = await supabase
          .from('invoices')
          .update({ status: 'DRAFT', submitted_at: null })
          .eq('id', currentInvoiceId);

        if (updateToDraftError) throw updateToDraftError;

        // Delete existing line items
        await supabase.from('invoice_line_items').delete().eq('invoice_id', currentInvoiceId);
      }

      // Prepare line items based on mode
      let itemsToInsert: any[] = [];

      if (invoiceMode === 'sov') {
        // Create line items from selected SOV items
        selectedSovItems.forEach((percent, itemId) => {
          const sovItem = sovLineItems.find(s => s.id === itemId);
          if (sovItem && percent > 0) {
            const itemValue = sovItem.amount || (contractValue * (sovItem.percent || 0) / 100);
            const amount = (itemValue * percent) / 100;
            
            itemsToInsert.push({
              invoice_id: currentInvoiceId,
              description: sovItem.name,
              qty: 1,
              unit: 'LS',
              unit_cost: amount,
              amount: amount,
            });
          }
        });
      } else {
        // Manual line items
        const validItems = lineItems.filter(item => item.description.trim() && item.amount > 0);
        itemsToInsert = validItems.map(item => ({
          invoice_id: currentInvoiceId,
          description: item.description.trim(),
          qty: item.qty,
          unit: item.unit,
          unit_cost: item.unit_cost,
          amount: item.amount
        }));
      }

      if (itemsToInsert.length === 0) {
        toast.error('Please add at least one line item');
        setSaving(false);
        return;
      }

      const { error: itemsError } = await supabase
        .from('invoice_line_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      if (submit) {
        // Use the submit_invoice RPC for proper routing and notifications
        const { error: submitError } = await supabase.rpc('submit_invoice', {
          _invoice_id: currentInvoiceId
        });

        if (submitError) throw submitError;
      }

      toast.success(submit ? 'Invoice submitted!' : 'Invoice saved as draft');
      onSaved();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex items-center gap-2">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
          <span className="text-xl font-semibold">Loading invoice...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="container flex items-center h-14 px-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
            className="text-primary-foreground hover:bg-primary-foreground/10 mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold">Invoice #{invoiceNumber}</h1>
            <p className="text-xs text-primary-foreground/70">Pay Application</p>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Summary Card */}
        <Card className="border-0 shadow-md bg-accent/5">
          <CardContent className="p-4">
            <div className="text-center mb-3">
              <p className="text-3xl font-bold font-mono">{formatCurrency(calculateTotal())}</p>
              <p className="text-sm text-muted-foreground">Gross Amount</p>
            </div>
            
            {retainagePercent > 0 && (
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Retainage ({retainagePercent}%)</span>
                  <span className="font-mono text-destructive">-{formatCurrency(calculateRetainage())}</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>Net Payable</span>
                  <span className="font-mono text-success">{formatCurrency(calculateNetPayable())}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mode Selection (only show if SOV is active) */}
        {activeSov && (
          <Tabs value={invoiceMode} onValueChange={(v) => setInvoiceMode(v as 'sov' | 'manual')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sov" className="gap-2">
                <FileText className="h-4 w-4" />
                From SOV
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <Receipt className="h-4 w-4" />
                Manual
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sov" className="mt-4">
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Select SOV Items to Bill</CardTitle>
                  <CardDescription>
                    Choose items and set completion percentage for this billing period
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sovLineItems.map(item => {
                    const isSelected = selectedSovItems.has(item.id);
                    const billedPercent = selectedSovItems.get(item.id) || 0;
                    const previouslyBilledPercent = previouslyBilled.get(item.id) || 0;
                    const remainingPercent = 100 - previouslyBilledPercent;
                    const itemValue = item.amount || (contractValue * (item.percent || 0) / 100);
                    const thisBillAmount = (itemValue * billedPercent) / 100;

                    return (
                      <div 
                        key={item.id} 
                        className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                          isSelected ? 'border-accent bg-accent/5' : 'border-border bg-muted/30 hover:border-accent/50'
                        } ${remainingPercent <= 0 ? 'cursor-not-allowed opacity-60' : ''}`}
                        onClick={() => {
                          if (remainingPercent > 0) {
                            toggleSovItem(item.id, !isSelected);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => toggleSovItem(item.id, !!checked)}
                            disabled={remainingPercent <= 0}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="font-medium text-sm truncate">{item.name}</span>
                              <span className="text-sm text-muted-foreground whitespace-nowrap">
                                {formatCurrency(itemValue)}
                              </span>
                            </div>
                            
                            {previouslyBilledPercent > 0 && (
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  {previouslyBilledPercent.toFixed(0)}% previously billed
                                </Badge>
                              </div>
                            )}

                            {isSelected && remainingPercent > 0 && (
                              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-3">
                                  <Slider
                                    value={[billedPercent]}
                                    onValueChange={([val]) => updateSovItemPercent(item.id, val)}
                                    max={remainingPercent}
                                    step={1}
                                    className="flex-1"
                                  />
                                  <div className="flex items-center gap-1 w-24">
                                    <Input
                                      type="number"
                                      value={billedPercent === 0 ? '' : billedPercent}
                                      onChange={(e) => updateSovItemPercent(item.id, parseFloat(e.target.value) || 0)}
                                      className="h-8 w-16 text-center text-sm"
                                      min={0}
                                      max={remainingPercent}
                                    />
                                    <span className="text-sm text-muted-foreground">%</span>
                                  </div>
                                </div>
                                <div className="text-right text-sm">
                                  <span className="text-muted-foreground">This bill: </span>
                                  <span className="font-semibold">{formatCurrency(thisBillAmount)}</span>
                                </div>
                              </div>
                            )}

                            {remainingPercent <= 0 && (
                              <Badge variant="outline" className="text-xs text-success">
                                Fully Billed
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {sovLineItems.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      No SOV line items found
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manual" className="mt-4">
              <ManualLineItems
                lineItems={lineItems}
                updateLineItem={updateLineItem}
                addLineItem={addLineItem}
                removeLineItem={removeLineItem}
                formatCurrency={formatCurrency}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* Manual mode only if no SOV */}
        {!activeSov && (
          <ManualLineItems
            lineItems={lineItems}
            updateLineItem={updateLineItem}
            addLineItem={addLineItem}
            removeLineItem={removeLineItem}
            formatCurrency={formatCurrency}
          />
        )}


        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4">
          <Button onClick={() => saveInvoice(true)} disabled={saving || calculateTotal() <= 0}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Submit Invoice
          </Button>
          <Button variant="outline" onClick={() => saveInvoice(false)} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save as Draft
          </Button>
        </div>
      </main>
    </div>
  );
}

// Extracted manual line items component
function ManualLineItems({
  lineItems,
  updateLineItem,
  addLineItem,
  removeLineItem,
  formatCurrency
}: {
  lineItems: LineItem[];
  updateLineItem: (index: number, updates: Partial<LineItem>) => void;
  addLineItem: () => void;
  removeLineItem: (index: number) => void;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Line Items</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lineItems.map((item, index) => (
          <div key={index} className="p-4 bg-muted/30 rounded-lg space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-xs text-muted-foreground">Item {index + 1}</span>
              {lineItems.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeLineItem(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
            
            <div>
              <Label className="text-xs">Description</Label>
              <Input
                placeholder="Work description"
                value={item.description}
                onChange={(e) => updateLineItem(index, { description: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  min={0}
                  value={item.qty === 0 ? '' : item.qty}
                  onChange={(e) => updateLineItem(index, { qty: Number(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Unit</Label>
                <Select
                  value={item.unit}
                  onValueChange={(value) => updateLineItem(index, { unit: value as UnitType })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LS">LS</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="EA">EA</SelectItem>
                    <SelectItem value="LF">LF</SelectItem>
                    <SelectItem value="SF">SF</SelectItem>
                    <SelectItem value="SY">SY</SelectItem>
                    <SelectItem value="DAY">DAY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Unit Cost</Label>
                <Input
                  type="number"
                  min={0}
                  value={item.unit_cost === 0 ? '' : item.unit_cost}
                  onChange={(e) => updateLineItem(index, { unit_cost: Number(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="text-right">
              <span className="text-sm text-muted-foreground">Amount: </span>
              <span className="font-mono font-semibold">{formatCurrency(item.amount)}</span>
            </div>
          </div>
        ))}

        <Button variant="outline" className="w-full" onClick={addLineItem}>
          <Plus className="h-4 w-4 mr-2" />
          Add Line Item
        </Button>
      </CardContent>
    </Card>
  );
}

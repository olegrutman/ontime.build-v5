import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatPhone } from '@/lib/formatPhone';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, ArrowLeft, AlertTriangle } from 'lucide-react';
import { WizardProgress } from '@/components/ui/wizard-progress';
import { VIRTUAL_CATEGORIES, CategoryCount } from '@/types/poWizardV2';
import {
  ReturnReason,
  ReturnCondition,
  RETURN_REASONS,
  RETURN_REASON_DETAILS,
  RETURN_CONDITIONS,
  CONDITIONS_REQUIRING_NOTES,
  PickupType,
  UrgencyType,
  URGENCY_OPTIONS,
} from '@/types/return';

interface CreateReturnWizardProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DeliveredLineItem {
  id: string;
  po_id: string;
  po_number: string;
  description: string;
  quantity: number;
  uom: string;
  already_returned: number;
  available: number;
  supplier_sku: string | null;
  category: string;
  unit_price: number;
}

interface SelectedItem extends DeliveredLineItem {
  qty_requested: number;
  condition: ReturnCondition;
  condition_notes: string;
  reason: ReturnReason | '';
  reason_notes: string;
}

const DB_CATEGORY_MAP: Record<string, { displayName: string; icon: string }> = {};
Object.values(VIRTUAL_CATEGORIES).forEach(vc => {
  DB_CATEGORY_MAP[vc.dbCategory] = { displayName: vc.displayName, icon: vc.icon };
});

export function CreateReturnWizard({ projectId, open, onOpenChange }: CreateReturnWizardProps) {
  const { user, userOrgRoles } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const userOrgId = userOrgRoles[0]?.organization?.id || null;

  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) {
      setStep(0);
      setSupplierOrgId(null);
      setSelectedItems([]);
      setItemSearch('');
      setPickupType('');
      setUrgency('Standard');
      setPickupDate('');
      setContactName('');
      setContactPhone('');
      setInstructions('');
      setActiveCategory(null);
    }
  }, [open]);

  const [supplierOrgId, setSupplierOrgId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Logistics
  const [pickupType, setPickupType] = useState<PickupType | ''>('');
  const [urgency, setUrgency] = useState<UrgencyType>('Standard');
  const [pickupDate, setPickupDate] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [instructions, setInstructions] = useState('');

  // Fetch suppliers from project team
  const { data: suppliers = [] } = useQuery({
    queryKey: ['return-team-suppliers', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_team')
        .select('org_id, organizations!inner(id, name)')
        .eq('project_id', projectId)
        .eq('role', 'Supplier')
        .eq('status', 'Accepted');
      if (error) throw error;
      const map = new Map<string, string>();
      (data || []).forEach((row: any) => {
        if (row.organizations?.id) {
          map.set(row.organizations.id, row.organizations.name);
        }
      });
      const result = Array.from(map.entries()).map(([orgId, name]) => ({ orgId, supplierName: name }));
      if (result.length === 1 && !supplierOrgId) {
        setSupplierOrgId(result[0].orgId);
      }
      return result;
    },
  });

  // Fetch delivered line items with unit_price
  const { data: deliveredItems = [] } = useQuery({
    queryKey: ['delivered-items', projectId, supplierOrgId],
    enabled: !!supplierOrgId,
    queryFn: async () => {
      const { data: pos, error: poErr } = await supabase
        .from('purchase_orders')
        .select('id, po_number, supplier_id, suppliers!inner(organization_id)')
        .eq('project_id', projectId)
        .eq('status', 'DELIVERED');
      if (poErr) throw poErr;

      const supplierPOs = (pos || []).filter(
        (po: any) => po.suppliers?.organization_id === supplierOrgId
      );
      if (supplierPOs.length === 0) return [];

      const poIds = supplierPOs.map((po: any) => po.id);

      const { data: lineItems, error: liErr } = await supabase
        .from('po_line_items')
        .select('*')
        .in('po_id', poIds);
      if (liErr) throw liErr;

      // Lookup categories
      const skus = [...new Set((lineItems || []).map((li: any) => li.supplier_sku).filter(Boolean))];
      const skuCategoryMap = new Map<string, string>();
      if (skus.length > 0) {
        for (let i = 0; i < skus.length; i += 100) {
          const chunk = skus.slice(i, i + 100);
          const { data: catalogRows } = await supabase
            .from('catalog_items')
            .select('supplier_sku, category')
            .in('supplier_sku', chunk);
          (catalogRows || []).forEach((row: any) => {
            if (row.category) skuCategoryMap.set(row.supplier_sku, row.category);
          });
        }
      }

      const { data: existingReturns } = await supabase
        .from('return_items')
        .select('po_line_item_id, qty_requested, return_id, returns!inner(status)')
        .in('po_line_item_id', (lineItems || []).map((li: any) => li.id));

      const returnedMap = new Map<string, number>();
      if (existingReturns) {
        existingReturns.forEach((ri: any) => {
          if (ri.returns?.status && ri.returns.status !== 'DRAFT') {
            const current = returnedMap.get(ri.po_line_item_id) || 0;
            returnedMap.set(ri.po_line_item_id, current + Number(ri.qty_requested));
          }
        });
      }

      const poMap = new Map(supplierPOs.map((po: any) => [po.id, po.po_number]));

      return (lineItems || []).map((li: any) => {
        const alreadyReturned = returnedMap.get(li.id) || 0;
        const category = (li.supplier_sku && skuCategoryMap.get(li.supplier_sku)) || 'Uncategorized';
        return {
          id: li.id,
          po_id: li.po_id,
          po_number: poMap.get(li.po_id) || '',
          description: li.description,
          quantity: li.quantity,
          uom: li.uom,
          already_returned: alreadyReturned,
          available: li.quantity - alreadyReturned,
          supplier_sku: li.supplier_sku,
          category,
          unit_price: Number(li.unit_price) || 0,
        } as DeliveredLineItem;
      }).filter((item: DeliveredLineItem) => item.available > 0);
    },
  });

  // Category grid
  const categoryGrid = useMemo<CategoryCount[]>(() => {
    const countMap = new Map<string, number>();
    deliveredItems.forEach(item => {
      countMap.set(item.category, (countMap.get(item.category) || 0) + 1);
    });
    const result: CategoryCount[] = [];
    countMap.forEach((count, dbCat) => {
      const display = DB_CATEGORY_MAP[dbCat];
      result.push({
        category: dbCat,
        count,
        displayName: display?.displayName || dbCat.toUpperCase(),
        icon: display?.icon || '📋',
      });
    });
    return result.sort((a, b) => {
      if (a.category === 'Uncategorized') return 1;
      if (b.category === 'Uncategorized') return -1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [deliveredItems]);

  const categoryItems = useMemo(() => {
    if (!activeCategory) return [];
    let items = deliveredItems.filter(item => item.category === activeCategory);
    if (itemSearch.trim()) {
      const q = itemSearch.toLowerCase();
      items = items.filter(item =>
        item.description.toLowerCase().includes(q) || item.po_number.toLowerCase().includes(q)
      );
    }
    return items;
  }, [deliveredItems, activeCategory, itemSearch]);

  const allCategorySelected = categoryItems.length > 0 && categoryItems.every(item =>
    selectedItems.some(si => si.id === item.id)
  );

  const toggleSelectAllCategory = (checked: boolean) => {
    if (checked) {
      const newItems = categoryItems.filter(item => !selectedItems.some(si => si.id === item.id));
      setSelectedItems(prev => [
        ...prev,
        ...newItems.map(item => ({
          ...item,
          qty_requested: 1,
          condition: 'Unknown' as ReturnCondition,
          condition_notes: '',
          reason: '' as ReturnReason | '',
          reason_notes: '',
        })),
      ]);
    } else {
      const catIds = new Set(categoryItems.map(i => i.id));
      setSelectedItems(prev => prev.filter(si => !catIds.has(si.id)));
    }
  };

  const toggleItem = (item: DeliveredLineItem, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, {
        ...item,
        qty_requested: 1,
        condition: 'Unknown' as ReturnCondition,
        condition_notes: '',
        reason: '' as ReturnReason | '',
        reason_notes: '',
      }]);
    } else {
      setSelectedItems(prev => prev.filter(si => si.id !== item.id));
    }
  };

  const updateItemQty = (itemId: string, qty: number) => {
    setSelectedItems(prev => prev.map(si =>
      si.id === itemId ? { ...si, qty_requested: Math.max(1, Math.min(qty, si.available)) } : si
    ));
  };

  const updateItemField = (itemId: string, field: string, value: any) => {
    setSelectedItems(prev => prev.map(si =>
      si.id === itemId ? { ...si, [field]: value } : si
    ));
  };

  // Totals
  const creditSubtotal = selectedItems.reduce((sum, item) => sum + item.qty_requested * item.unit_price, 0);

  // Validation
  const canProceedStep0 = supplierOrgId && selectedItems.length > 0 && selectedItems.every(i => i.qty_requested > 0);
  const canProceedStep1 = selectedItems.every(i =>
    i.reason &&
    i.condition &&
    (!CONDITIONS_REQUIRING_NOTES.includes(i.condition) || i.condition_notes.trim()) &&
    (i.reason !== 'Other' || i.reason_notes.trim())
  );
  const canProceedStep2 = pickupType && contactName.trim() && contactPhone.trim();

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: returnRecord, error: retErr } = await supabase
        .from('returns')
        .insert({
          project_id: projectId,
          supplier_org_id: supplierOrgId!,
          created_by_org_id: userOrgId!,
          created_by_user_id: user!.id,
          reason: selectedItems[0]?.reason || 'Other',
          pickup_type: pickupType as string,
          pickup_date: pickupDate || null,
          contact_name: contactName,
          contact_phone: contactPhone,
          instructions: instructions || null,
          urgency: urgency,
          status: 'SUBMITTED',
          pricing_owner_org_id: userOrgId,
          credit_subtotal: creditSubtotal,
          net_credit_total: creditSubtotal,
        })
        .select()
        .single();
      if (retErr) throw retErr;

      const items = selectedItems.map(si => ({
        return_id: returnRecord.id,
        po_line_item_id: si.id,
        po_id: si.po_id,
        description_snapshot: si.description,
        uom: si.uom,
        qty_requested: si.qty_requested,
        condition: si.condition,
        condition_notes: CONDITIONS_REQUIRING_NOTES.includes(si.condition) ? si.condition_notes : null,
        reason: si.reason || null,
        reason_notes: si.reason === 'Other' ? si.reason_notes : null,
        original_unit_price: si.unit_price,
        credit_unit_price: si.unit_price,
        credit_line_total: si.qty_requested * si.unit_price,
      }));

      const { error: itemsErr } = await supabase.from('return_items').insert(items);
      if (itemsErr) throw itemsErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns', projectId] });
      toast({ title: 'Return submitted successfully' });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const wizardSteps = [
    { title: 'Select Items', description: 'Choose items to return' },
    { title: 'Return Details', description: 'Reason, condition & credit' },
    { title: 'Logistics', description: 'Pickup & contact info' },
    { title: 'Review', description: 'Confirm & submit' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
        <WizardProgress currentStep={step + 1} totalSteps={4} steps={wizardSteps} />

        <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Step 0: Select Items with Category Browser */}
        {step === 0 && (
          <div className="space-y-4">
            {suppliers.length > 1 && (
              <div>
                <Label>Supplier</Label>
                <Select value={supplierOrgId || ''} onValueChange={v => { setSupplierOrgId(v); setSelectedItems([]); setActiveCategory(null); }}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.orgId} value={s.orgId}>{s.supplierName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {suppliers.length === 1 && (
              <p className="text-sm text-muted-foreground">Supplier: <span className="font-medium text-foreground">{suppliers[0].supplierName}</span></p>
            )}

            {selectedItems.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                </Badge>
              </div>
            )}

            {supplierOrgId && deliveredItems.length === 0 && (
              <p className="text-sm text-muted-foreground">No delivered items available for return.</p>
            )}

            {/* Category Grid View */}
            {deliveredItems.length > 0 && !activeCategory && (
              <div className="grid grid-cols-2 gap-3">
                {categoryGrid.map(cat => {
                  const selectedInCat = selectedItems.filter(si => si.category === cat.category).length;
                  return (
                    <button
                      key={cat.category}
                      onClick={() => { setActiveCategory(cat.category); setItemSearch(''); }}
                      className="relative flex flex-col items-center justify-center p-4 h-24 rounded-2xl bg-card shadow-sm hover:shadow-md transition-shadow text-center active:scale-[0.98]"
                    >
                      <span className="text-2xl mb-1">{cat.icon}</span>
                      <span className="font-medium text-sm leading-tight">{cat.displayName}</span>
                      <span className="text-xs text-muted-foreground">{cat.count} items</span>
                      {selectedInCat > 0 && (
                        <Badge className="absolute top-2 right-2 h-5 min-w-5 flex items-center justify-center text-[10px] px-1.5">
                          {selectedInCat}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Category Detail View */}
            {deliveredItems.length > 0 && activeCategory && (
              <>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setActiveCategory(null); setItemSearch(''); }}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <span className="font-medium text-sm">
                    {DB_CATEGORY_MAP[activeCategory]?.icon || '📋'}{' '}
                    {DB_CATEGORY_MAP[activeCategory]?.displayName || activeCategory.toUpperCase()}
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items or PO number..."
                    value={itemSearch}
                    onChange={e => setItemSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allCategorySelected}
                            onCheckedChange={checked => toggleSelectAllCategory(!!checked)}
                          />
                        </TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-16">PO</TableHead>
                        <TableHead className="w-16">Avail.</TableHead>
                        <TableHead className="w-20 text-right">Unit Price</TableHead>
                        <TableHead className="w-24 text-right">Line Total</TableHead>
                        <TableHead className="w-20">Return Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryItems.map(item => {
                        const selected = selectedItems.find(si => si.id === item.id);
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Checkbox
                                checked={!!selected}
                                onCheckedChange={checked => toggleItem(item, !!checked)}
                              />
                            </TableCell>
                            <TableCell className="text-sm">{item.description}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{item.po_number}</TableCell>
                            <TableCell>{item.available}</TableCell>
                            <TableCell className="text-right text-sm">${item.unit_price.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-sm">${(item.available * item.unit_price).toFixed(2)}</TableCell>
                            <TableCell>
                              {selected && (
                                <Input
                                  type="number"
                                  min={1}
                                  max={item.available}
                                  value={selected.qty_requested}
                                  onChange={e => updateItemQty(item.id, Number(e.target.value))}
                                  className="w-16 h-8"
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {categoryItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                            No items match your search.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 1: Return Details (per-item reason + condition + credit preview) */}
        {step === 1 && (
          <div className="space-y-3">
            {selectedItems.map(item => (
              <div key={item.id} className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{item.description}</p>
                  <span className="text-xs text-muted-foreground">×{item.qty_requested} {item.uom}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Reason</Label>
                    <Select
                      value={item.reason}
                      onValueChange={v => updateItemField(item.id, 'reason', v)}
                    >
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select reason" /></SelectTrigger>
                      <SelectContent>
                        {RETURN_REASONS.map(r => (
                          <SelectItem key={r} value={r}>{RETURN_REASON_DETAILS[r].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Condition</Label>
                    <Select
                      value={item.condition}
                      onValueChange={v => updateItemField(item.id, 'condition', v)}
                    >
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RETURN_CONDITIONS.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {item.reason === 'Other' && (
                  <Textarea
                    placeholder="Explain the reason..."
                    value={item.reason_notes}
                    onChange={e => updateItemField(item.id, 'reason_notes', e.target.value)}
                    className="text-sm"
                  />
                )}

                {CONDITIONS_REQUIRING_NOTES.includes(item.condition) && (
                  <Textarea
                    placeholder="Describe the condition..."
                    value={item.condition_notes}
                    onChange={e => updateItemField(item.id, 'condition_notes', e.target.value)}
                    className="text-sm"
                  />
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                  <span>Unit Price: ${item.unit_price.toFixed(2)}</span>
                  <span className="font-medium text-foreground">Line Credit: ${(item.qty_requested * item.unit_price).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 2: Logistics */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Pickup Type</Label>
              <Select value={pickupType} onValueChange={v => setPickupType(v as PickupType)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Supplier Pickup">Supplier Pickup</SelectItem>
                  <SelectItem value="Contractor Drop-off">Contractor Drop-off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Urgency</Label>
              <Select value={urgency} onValueChange={v => setUrgency(v as UrgencyType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {URGENCY_OPTIONS.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pickup Date <span className="text-muted-foreground text-xs">(Optional)</span></Label>
              <Input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} />
            </div>
            <div>
              <Label>Contact Name</Label>
              <Input value={contactName} onChange={e => setContactName(e.target.value)} />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input
                type="tel"
                value={contactPhone}
                onChange={e => setContactPhone(formatPhone(e.target.value))}
                placeholder="(555)555-5555"
              />
            </div>
            <div>
              <Label>Site Instructions <span className="text-muted-foreground text-xs">(Optional)</span></Label>
              <Textarea value={instructions} onChange={e => setInstructions(e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-muted-foreground">Pickup:</span> {pickupType}{pickupDate ? ` on ${pickupDate}` : ' — date TBD'}
            </div>
            <div>
              <span className="text-muted-foreground">Urgency:</span> {urgency}
            </div>
            <div>
              <span className="text-muted-foreground">Contact:</span> {contactName} • {contactPhone}
            </div>
            {instructions && <div><span className="text-muted-foreground">Instructions:</span> {instructions}</div>}

            {/* Items table with pricing */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-12">Qty</TableHead>
                  <TableHead className="w-24">Reason</TableHead>
                  <TableHead className="w-24">Condition</TableHead>
                  <TableHead className="w-20 text-right">Unit Price</TableHead>
                  <TableHead className="w-24 text-right">Line Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.qty_requested}</TableCell>
                    <TableCell className="text-xs">{item.reason ? RETURN_REASON_DETAILS[item.reason as ReturnReason]?.label : '—'}</TableCell>
                    <TableCell className="text-xs">{item.condition}</TableCell>
                    <TableCell className="text-right">${item.unit_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">${(item.qty_requested * item.unit_price).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Totals Panel */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credit Subtotal</span>
                  <span className="font-medium">${creditSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Restocking Fee</span>
                  <span className="text-xs italic text-muted-foreground">Pending supplier review</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax Adjustment</span>
                  <span className="text-xs italic text-muted-foreground">Pending</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Estimated Credit Total</span>
                  <span>${creditSubtotal.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground text-right">(pending supplier approval)</p>
              </CardContent>
            </Card>

            {/* Warning banner */}
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Final credit amount will be confirmed by supplier after review.
              </p>
            </div>
          </div>
        )}

        </div>

        {/* Sticky Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <Button variant="ghost" onClick={() => step === 0 ? onOpenChange(false) : setStep(s => s - 1)}>
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={
                (step === 0 && !canProceedStep0) ||
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2)
              }
            >
              Next
            </Button>
          ) : (
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Submitting...' : 'Submit Return'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

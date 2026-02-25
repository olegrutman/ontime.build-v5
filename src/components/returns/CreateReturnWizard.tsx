import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ReturnReason,
  ReturnCondition,
  RETURN_REASONS,
  RETURN_CONDITIONS,
  CONDITIONS_REQUIRING_NOTES,
  WrongType,
  PickupType,
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
}

interface SelectedItem extends DeliveredLineItem {
  qty_requested: number;
  condition: ReturnCondition;
  condition_notes: string;
}

export function CreateReturnWizard({ projectId, open, onOpenChange }: CreateReturnWizardProps) {
  const { user, userOrgRoles } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const userOrgId = userOrgRoles[0]?.organization?.id || null;

  const [step, setStep] = useState(0); // 0=Select Items, 1=Reason, 2=Condition, 3=Logistics, 4=Review
  const [supplierOrgId, setSupplierOrgId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // Reason
  const [reason, setReason] = useState<ReturnReason | ''>('');
  const [wrongType, setWrongType] = useState<WrongType | ''>('');
  const [reasonNotes, setReasonNotes] = useState('');

  // Logistics
  const [pickupType, setPickupType] = useState<PickupType | ''>('');
  const [pickupDate, setPickupDate] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [instructions, setInstructions] = useState('');

  // Fetch suppliers with delivered POs on this project
  const { data: suppliers = [] } = useQuery({
    queryKey: ['return-suppliers', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('supplier_id, suppliers!inner(id, name, organization_id)')
        .eq('project_id', projectId)
        .eq('status', 'DELIVERED');
      if (error) throw error;
      // Deduplicate
      const map = new Map<string, { id: string; name: string; organization_id: string }>();
      (data || []).forEach((row: any) => {
        if (row.suppliers?.organization_id) {
          map.set(row.suppliers.organization_id, row.suppliers);
        }
      });
      return Array.from(map.entries()).map(([orgId, s]) => ({ orgId, supplierName: s.name, supplierId: s.id }));
    },
  });

  // Fetch delivered line items for the selected supplier
  const { data: deliveredItems = [] } = useQuery({
    queryKey: ['delivered-items', projectId, supplierOrgId],
    enabled: !!supplierOrgId,
    queryFn: async () => {
      // Get delivered POs for this supplier org on this project
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

      // Get line items
      const { data: lineItems, error: liErr } = await supabase
        .from('po_line_items')
        .select('*')
        .in('po_id', poIds);
      if (liErr) throw liErr;

      // Get already-returned quantities (non-DRAFT returns)
      const { data: existingReturns, error: retErr } = await supabase
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
        return {
          id: li.id,
          po_id: li.po_id,
          po_number: poMap.get(li.po_id) || '',
          description: li.description,
          quantity: li.quantity,
          uom: li.uom,
          already_returned: alreadyReturned,
          available: li.quantity - alreadyReturned,
        } as DeliveredLineItem;
      }).filter((item: DeliveredLineItem) => item.available > 0);
    },
  });

  const toggleItem = (item: DeliveredLineItem, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, {
        ...item,
        qty_requested: 1,
        condition: 'Unknown' as ReturnCondition,
        condition_notes: '',
      }]);
    } else {
      setSelectedItems(prev => prev.filter(si => si.id !== item.id));
    }
  };

  const updateItemQty = (itemId: string, qty: number) => {
    setSelectedItems(prev => prev.map(si =>
      si.id === itemId ? { ...si, qty_requested: Math.min(qty, si.available) } : si
    ));
  };

  const updateItemCondition = (itemId: string, condition: ReturnCondition) => {
    setSelectedItems(prev => prev.map(si =>
      si.id === itemId ? { ...si, condition, condition_notes: '' } : si
    ));
  };

  const updateItemConditionNotes = (itemId: string, notes: string) => {
    setSelectedItems(prev => prev.map(si =>
      si.id === itemId ? { ...si, condition_notes: notes } : si
    ));
  };

  // Validation
  const canProceedStep0 = supplierOrgId && selectedItems.length > 0 && selectedItems.every(i => i.qty_requested > 0);
  const canProceedStep1 = reason && (reason !== 'Wrong' || wrongType) && (reason !== 'Other' || reasonNotes.trim());
  const canProceedStep2 = selectedItems.every(i =>
    i.condition && (!CONDITIONS_REQUIRING_NOTES.includes(i.condition) || i.condition_notes.trim())
  );
  const canProceedStep3 = pickupType && pickupDate && contactName.trim() && contactPhone.trim();

  const createMutation = useMutation({
    mutationFn: async () => {
      // Create return record
      const { data: returnRecord, error: retErr } = await supabase
        .from('returns')
        .insert({
          project_id: projectId,
          supplier_org_id: supplierOrgId!,
          created_by_org_id: userOrgId!,
          created_by_user_id: user!.id,
          reason: reason as string,
          wrong_type: reason === 'Wrong' ? wrongType as string : null,
          reason_notes: reason === 'Other' ? reasonNotes : null,
          pickup_type: pickupType as string,
          pickup_date: pickupDate,
          contact_name: contactName,
          contact_phone: contactPhone,
          instructions: instructions || null,
          status: 'SUBMITTED',
          pricing_owner_org_id: userOrgId,
        })
        .select()
        .single();
      if (retErr) throw retErr;

      // Create return items
      const items = selectedItems.map(si => ({
        return_id: returnRecord.id,
        po_line_item_id: si.id,
        po_id: si.po_id,
        description_snapshot: si.description,
        uom: si.uom,
        qty_requested: si.qty_requested,
        condition: si.condition,
        condition_notes: CONDITIONS_REQUIRING_NOTES.includes(si.condition) ? si.condition_notes : null,
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

  const stepTitles = ['Select Items', 'Reason', 'Condition', 'Logistics', 'Review'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Return — {stepTitles[step]}</DialogTitle>
        </DialogHeader>

        {/* Step 0: Select Items */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label>Supplier</Label>
              <Select value={supplierOrgId || ''} onValueChange={v => { setSupplierOrgId(v); setSelectedItems([]); }}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.orgId} value={s.orgId}>{s.supplierName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {supplierOrgId && deliveredItems.length === 0 && (
              <p className="text-sm text-muted-foreground">No delivered items available for return.</p>
            )}

            {deliveredItems.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-16">PO</TableHead>
                      <TableHead className="w-16">Delivered</TableHead>
                      <TableHead className="w-16">Available</TableHead>
                      <TableHead className="w-20">Return Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveredItems.map(item => {
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
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.available}</TableCell>
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
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Reason */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Reason for Return</Label>
              <Select value={reason} onValueChange={v => setReason(v as ReturnReason)}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {reason === 'Wrong' && (
              <div>
                <Label>Wrong Type</Label>
                <Select value={wrongType} onValueChange={v => setWrongType(v as WrongType)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Supplier Error">Supplier Error</SelectItem>
                    <SelectItem value="Contractor Error">Contractor Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {reason === 'Other' && (
              <div>
                <Label>Explanation</Label>
                <Textarea value={reasonNotes} onChange={e => setReasonNotes(e.target.value)} placeholder="Explain the reason..." />
              </div>
            )}
          </div>
        )}

        {/* Step 2: Condition per line */}
        {step === 2 && (
          <div className="space-y-3">
            {selectedItems.map(item => (
              <div key={item.id} className="border rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium">{item.description} <span className="text-muted-foreground">×{item.qty_requested}</span></p>
                <Select
                  value={item.condition}
                  onValueChange={v => updateItemCondition(item.id, v as ReturnCondition)}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RETURN_CONDITIONS.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {CONDITIONS_REQUIRING_NOTES.includes(item.condition) && (
                  <Textarea
                    value={item.condition_notes}
                    onChange={e => updateItemConditionNotes(item.id, e.target.value)}
                    placeholder="Describe the condition..."
                    className="text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Logistics */}
        {step === 3 && (
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
              <Label>Pickup Date</Label>
              <Input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} />
            </div>
            <div>
              <Label>Contact Name</Label>
              <Input value={contactName} onChange={e => setContactName(e.target.value)} />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
            </div>
            <div>
              <Label>Site Instructions (Optional)</Label>
              <Textarea value={instructions} onChange={e => setInstructions(e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Reason:</span> {reason}{wrongType ? ` – ${wrongType}` : ''}{reasonNotes ? ` (${reasonNotes})` : ''}
            </div>
            <div>
              <span className="text-muted-foreground">Pickup:</span> {pickupType} on {pickupDate}
            </div>
            <div>
              <span className="text-muted-foreground">Contact:</span> {contactName} • {contactPhone}
            </div>
            {instructions && <div><span className="text-muted-foreground">Instructions:</span> {instructions}</div>}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Condition</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.qty_requested}</TableCell>
                    <TableCell>{item.condition}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="ghost" onClick={() => step === 0 ? onOpenChange(false) : setStep(s => s - 1)}>
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < 4 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={
                (step === 0 && !canProceedStep0) ||
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2) ||
                (step === 3 && !canProceedStep3)
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

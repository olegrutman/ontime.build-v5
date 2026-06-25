import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Package, ShoppingCart, Plus, Trash2, Lock, Unlock, Send, ArrowRight, ArrowLeft } from 'lucide-react';
import { WorkItem, MaterialOrder, OrderItem, OrderingMode, WORK_ITEM_TYPE_LABELS } from '@/types/materialOrder';
import { EstimatePack, PackItem, PACK_TYPE_LABELS } from '@/types/estimate';
import { ItemPicker } from './ItemPicker';

interface MaterialOrderWizardProps {
  workItem: WorkItem;
  onComplete: () => void;
  onCancel: () => void;
}

type WizardStep = 'mode' | 'pack-select' | 'items' | 'review';

export function MaterialOrderWizard({ workItem, onComplete, onCancel }: MaterialOrderWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<WizardStep>('mode');
  const [orderingMode, setOrderingMode] = useState<OrderingMode | null>(null);
  const [selectedPack, setSelectedPack] = useState<EstimatePack | null>(null);
  const [availablePacks, setAvailablePacks] = useState<EstimatePack[]>([]);
  const [orderItems, setOrderItems] = useState<Omit<OrderItem, 'id' | 'order_id' | 'created_at' | 'updated_at'>[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);

  // Determine if packs mode is available (only for PROJECT type)
  const packsAvailable = workItem.item_type === 'PROJECT';
  const itemsOnly = workItem.item_type === 'CHANGE_WORK' || workItem.item_type === 'TM_WORK';

  useEffect(() => {
    if (itemsOnly) {
      setOrderingMode('ITEMS');
    }
  }, [itemsOnly]);

  useEffect(() => {
    if (orderingMode === 'PACKS' && workItem.project_id) {
      fetchPacks();
    }
  }, [orderingMode, workItem.project_id]);

  const fetchPacks = async () => {
    if (!workItem.project_id) return;

    // Get approved estimates for this project
    const { data: estimates, error: estError } = await supabase
      .from('project_estimates')
      .select('id')
      .eq('project_id', workItem.project_id)
      .eq('status', 'APPROVED');

    if (estError || !estimates?.length) {
      toast.error('No approved estimates found for this project');
      return;
    }

    const estimateIds = estimates.map(e => e.id);

    // Get packs from approved estimates
    const { data: packs, error: packsError } = await supabase
      .from('estimate_packs')
      .select('*')
      .in('estimate_id', estimateIds)
      .order('sort_order');

    if (packsError) {
      console.error('Error fetching packs:', packsError);
      return;
    }

    setAvailablePacks(packs || []);
  };

  const handlePackSelect = async (packId: string) => {
    const pack = availablePacks.find(p => p.id === packId);
    if (!pack) return;

    // Fetch pack items
    const { data: items, error } = await supabase
      .from('pack_items')
      .select('*')
      .eq('pack_id', packId)
      .order('created_at');

    if (error) {
      toast.error('Failed to load pack items');
      return;
    }

    setSelectedPack({ ...pack, items: items || [] });
    
    // Convert pack items to order items
    const orderItemsFromPack = (items || []).map(item => ({
      pack_id: packId,
      catalog_item_id: item.catalog_item_id,
      supplier_sku: item.supplier_sku,
      description: item.description,
      category: undefined,
      quantity: Number(item.quantity),
      uom: item.uom,
      from_pack: true,
    }));
    
    setOrderItems(orderItemsFromPack);
    setStep('items');
  };

  const handleAddItem = (item: Omit<OrderItem, 'id' | 'order_id' | 'created_at' | 'updated_at'>) => {
    setOrderItems(prev => [...prev, item]);
    setShowItemPicker(false);
  };

  const handleRemoveItem = (index: number) => {
    const item = orderItems[index];
    
    // Check if removing from locked pack
    if (item.from_pack && selectedPack?.pack_type === 'ENGINEERED_LOCKED') {
      toast.error('Cannot remove items from locked packs');
      return;
    }
    
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const canModifyPack = !selectedPack || selectedPack.pack_type === 'LOOSE_MODIFIABLE';

  const handleSubmitOrder = async () => {
    if (!user || orderItems.length === 0) return;

    setLoading(true);

    // Create the material order
    const { data: order, error: orderError } = await supabase
      .from('material_orders')
      .insert({
        work_item_id: workItem.id,
        ordering_mode: orderingMode,
        status: 'SUBMITTED',
        notes,
        submitted_at: new Date().toISOString(),
        submitted_by: user.id,
      })
      .select()
      .single();

    if (orderError) {
      toast.error('Failed to create order: ' + orderError.message);
      setLoading(false);
      return;
    }

    // Insert order items
    const itemsToInsert = orderItems.map(item => ({
      order_id: order.id,
      pack_id: item.pack_id,
      catalog_item_id: item.catalog_item_id,
      supplier_sku: item.supplier_sku,
      description: item.description,
      category: item.category,
      quantity: item.quantity,
      uom: item.uom,
      pieces: item.pieces,
      length_ft: item.length_ft,
      width_in: item.width_in,
      thickness_in: item.thickness_in,
      computed_bf: item.computed_bf,
      computed_lf: item.computed_lf,
      notes: item.notes,
      from_pack: item.from_pack,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsToInsert);

    if (itemsError) {
      toast.error('Failed to add order items: ' + itemsError.message);
      setLoading(false);
      return;
    }

    toast.success('Material order submitted');
    setLoading(false);
    onComplete();
  };

  const goToNextStep = () => {
    if (step === 'mode') {
      if (orderingMode === 'PACKS') {
        setStep('pack-select');
      } else {
        setStep('items');
      }
    } else if (step === 'pack-select') {
      setStep('items');
    } else if (step === 'items') {
      setStep('review');
    }
  };

  const goToPrevStep = () => {
    if (step === 'review') {
      setStep('items');
    } else if (step === 'items') {
      if (orderingMode === 'PACKS') {
        setStep('pack-select');
      } else {
        setStep('mode');
      }
    } else if (step === 'pack-select') {
      setStep('mode');
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between text-sm">
        <div className={`flex items-center gap-2 ${step === 'mode' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 'mode' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1</div>
          Mode
        </div>
        <div className="flex-1 h-px bg-border mx-2" />
        {orderingMode === 'PACKS' && (
          <>
            <div className={`flex items-center gap-2 ${step === 'pack-select' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 'pack-select' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</div>
              Pack
            </div>
            <div className="flex-1 h-px bg-border mx-2" />
          </>
        )}
        <div className={`flex items-center gap-2 ${step === 'items' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 'items' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{orderingMode === 'PACKS' ? 3 : 2}</div>
          Items
        </div>
        <div className="flex-1 h-px bg-border mx-2" />
        <div className={`flex items-center gap-2 ${step === 'review' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 'review' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{orderingMode === 'PACKS' ? 4 : 3}</div>
          Review
        </div>
      </div>

      {/* Work Item Context */}
      <Card className="bg-muted/30">
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline">{WORK_ITEM_TYPE_LABELS[workItem.item_type]}</Badge>
            <span className="font-medium">{workItem.title}</span>
            {workItem.location_ref && (
              <span className="text-sm text-muted-foreground">@ {workItem.location_ref}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Mode Selection */}
      {step === 'mode' && (
        <Card>
          <CardHeader>
            <CardTitle>Select Ordering Mode</CardTitle>
            <CardDescription>
              {itemsOnly 
                ? 'Change work and T&M items require individual item selection'
                : 'Choose how you want to order materials'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={orderingMode || ''}
              onValueChange={(v) => setOrderingMode(v as OrderingMode)}
              className="space-y-4"
            >
              <div className={`flex items-start space-x-4 p-4 border rounded-lg ${!packsAvailable ? 'opacity-50' : 'hover:border-primary cursor-pointer'}`}>
                <RadioGroupItem value="PACKS" id="packs" disabled={!packsAvailable} />
                <div className="flex-1">
                  <Label htmlFor="packs" className="flex items-center gap-2 cursor-pointer">
                    <Package className="h-5 w-5" />
                    <span className="font-medium">Order from Packs</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select a pack from an approved estimate. Review and modify items if allowed.
                  </p>
                  {!packsAvailable && (
                    <p className="text-sm text-destructive mt-1">
                      Only available for PROJECT work items
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 border rounded-lg hover:border-primary cursor-pointer">
                <RadioGroupItem value="ITEMS" id="items" />
                <div className="flex-1">
                  <Label htmlFor="items" className="flex items-center gap-2 cursor-pointer">
                    <ShoppingCart className="h-5 w-5" />
                    <span className="font-medium">Order Individual Items</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add items directly from the catalog using the guided picker.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={goToNextStep} disabled={!orderingMode}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Pack Selection (only if PACKS mode) */}
      {step === 'pack-select' && orderingMode === 'PACKS' && (
        <Card>
          <CardHeader>
            <CardTitle>Select Pack</CardTitle>
            <CardDescription>Choose a pack from an approved estimate</CardDescription>
          </CardHeader>
          <CardContent>
            {availablePacks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No approved estimate packs found for this project</p>
                <Button variant="outline" className="mt-4" onClick={() => setOrderingMode('ITEMS')}>
                  Switch to Items Mode
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {availablePacks.map(pack => (
                  <Card 
                    key={pack.id}
                    className={`cursor-pointer transition-colors hover:border-primary ${selectedPack?.id === pack.id ? 'border-primary bg-primary/5' : ''}`}
                    onClick={() => handlePackSelect(pack.id)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{pack.pack_name}</span>
                        </div>
                        <Badge variant={pack.pack_type === 'ENGINEERED_LOCKED' ? 'secondary' : 'outline'}>
                          {pack.pack_type === 'ENGINEERED_LOCKED' ? (
                            <><Lock className="h-3 w-3 mr-1" /> Locked</>
                          ) : (
                            <><Unlock className="h-3 w-3 mr-1" /> Modifiable</>
                          )}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={goToPrevStep}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={goToNextStep} disabled={!selectedPack}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Items */}
      {step === 'items' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Order Items</CardTitle>
                <CardDescription>
                  {selectedPack 
                    ? `Items from pack: ${selectedPack.pack_name}` 
                    : 'Add items to your order'}
                </CardDescription>
              </div>
              {canModifyPack && (
                <Button onClick={() => setShowItemPicker(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
              )}
            </div>
            {selectedPack && !canModifyPack && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded mt-2">
                <Lock className="h-4 w-4" />
                This is a locked pack. Items cannot be modified.
              </div>
            )}
          </CardHeader>
          <CardContent>
            {orderItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No items added yet</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowItemPicker(true)}>
                  Add First Item
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>UOM</TableHead>
                    <TableHead>BF/LF</TableHead>
                    {canModifyPack && <TableHead></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{item.supplier_sku || '-'}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.uom}</TableCell>
                      <TableCell>
                        {item.computed_bf && <span className="text-sm">{item.computed_bf} BF</span>}
                        {item.computed_lf && <span className="text-sm">{item.computed_lf} LF</span>}
                        {!item.computed_bf && !item.computed_lf && '-'}
                      </TableCell>
                      {canModifyPack && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={item.from_pack && selectedPack?.pack_type === 'ENGINEERED_LOCKED'}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={goToPrevStep}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={goToNextStep} disabled={orderItems.length === 0}>
              Review Order <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Submit</CardTitle>
            <CardDescription>Confirm your material order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Work Item:</span>
                <p className="font-medium">{workItem.title}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Mode:</span>
                <p className="font-medium">{orderingMode === 'PACKS' ? 'From Pack' : 'Individual Items'}</p>
              </div>
              {selectedPack && (
                <div>
                  <span className="text-muted-foreground">Pack:</span>
                  <p className="font-medium">{selectedPack.pack_name}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Total Items:</span>
                <p className="font-medium">{orderItems.length}</p>
              </div>
            </div>

            <div className="border rounded-lg max-h-48 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>UOM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.uom}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions or notes..."
                rows={3}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={goToPrevStep}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={handleSubmitOrder} disabled={loading}>
              <Send className="mr-2 h-4 w-4" />
              {loading ? 'Submitting...' : 'Submit Order'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Item Picker Dialog */}
      <Dialog open={showItemPicker} onOpenChange={setShowItemPicker}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Add Item to Order</DialogTitle>
          </DialogHeader>
          <ItemPicker 
            onAddItem={handleAddItem} 
            onClose={() => setShowItemPicker(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

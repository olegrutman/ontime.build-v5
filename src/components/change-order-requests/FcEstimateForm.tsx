import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import MaterialsPicker, { 
  MaterialLine, 
  getMaterialDisplayString,
  calculateMaterialsCost
} from '@/components/change-orders/MaterialsPicker';
import EquipmentPicker, { 
  EquipmentLine, 
  getEquipmentDisplayString,
  calculateEquipmentCost
} from '@/components/change-orders/EquipmentPicker';
import { 
  ArrowLeft, 
  MapPin, 
  Save,
  Send,
  Wrench,
  Users,
  Package,
  Truck,
  DollarSign,
  Clock,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ChangeOrderRequest,
  StructuredLocation,
  CorScopeType,
  AppRole,
  STATUS_CONFIG,
  SCOPE_TYPE_OPTIONS,
  REASON_OPTIONS,
  getLocationDisplayString,
  formatCorRef,
  formatCoRef,
} from './types';

interface FcEstimateFormProps {
  cor: ChangeOrderRequest;
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}

type LineItemType = 'LABOR' | 'MATERIAL' | 'EQUIPMENT';
type UnitType = 'HR' | 'EA' | 'LF' | 'SF' | 'SY' | 'DAY' | 'LS';

export default function FcEstimateForm({ 
  cor, 
  projectId, 
  onClose, 
  onSaved 
}: FcEstimateFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  
  // Estimate type toggle
  type EstimateType = 'HOURS' | 'LUMP_SUM';
  const [estimateType, setEstimateType] = useState<EstimateType>('HOURS');
  
  // Labor fields
  const [laborHours, setLaborHours] = useState<number>(0);
  const [laborRate, setLaborRate] = useState<number>(0);
  const [lumpSumLabor, setLumpSumLabor] = useState<number>(0);
  
  // Materials and equipment
  const [materials, setMaterials] = useState<MaterialLine[]>([]);
  const [equipmentItems, setEquipmentItems] = useState<EquipmentLine[]>([]);
  
  // Notes
  const [notes, setNotes] = useState('');
  
  // Draft CO tracking
  const [draftCoId, setDraftCoId] = useState<string | null>(cor.draft_co_id);

  // Contract context for FC
  const [contractContextId, setContractContextId] = useState<string | null>(null);

  useEffect(() => {
    initializeForm();
  }, [cor.id]);

  const initializeForm = async () => {
    if (!user?.id || !projectId) return;

    try {
      // Get the downstream contract context
      const { data: contexts } = await supabase
        .from('contract_contexts')
        .select('id')
        .eq('project_id', projectId)
        .eq('type', 'DOWNSTREAM')
        .single();

      if (contexts) {
        setContractContextId(contexts.id);
      }

      // Get user's hourly rate from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('hourly_rate')
        .eq('id', user.id)
        .single();

      if (profile?.hourly_rate) {
        setLaborRate(Number(profile.hourly_rate));
      }

      // Check if there's an existing draft CO for this COR
      if (cor.draft_co_id) {
        await loadExistingDraft(cor.draft_co_id);
      }
    } catch (error) {
      console.error('Error initializing form:', error);
    } finally {
      setInitializing(false);
    }
  };

  const loadExistingDraft = async (coId: string) => {
    try {
      // Load the draft CO and its line items
      const { data: existingCo, error: coError } = await supabase
        .from('change_orders')
        .select('*')
        .eq('id', coId)
        .single();

      if (coError || !existingCo) return;

      // Load line items
      const { data: lineItems } = await supabase
        .from('co_line_items')
        .select('*')
        .eq('co_id', coId);

      if (lineItems) {
        // Parse labor
        const laborItem = lineItems.find(li => li.type === 'LABOR');
        if (laborItem) {
          if (laborItem.unit === 'LS') {
            setEstimateType('LUMP_SUM');
            setLumpSumLabor(laborItem.amount);
          } else {
            setEstimateType('HOURS');
            setLaborHours(laborItem.qty || 0);
            setLaborRate(laborItem.unit_cost || 0);
          }
        }

        // Parse notes from CO description that aren't the original COR description
        if (existingCo.description !== cor.description) {
          setNotes(existingCo.description.replace(cor.description, '').trim());
        }
      }

      setDraftCoId(coId);
      toast.info('Resuming your draft estimate');
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const laborCost = estimateType === 'HOURS' 
    ? laborHours * laborRate 
    : lumpSumLabor;
  
  const materialsCost = calculateMaterialsCost(materials);
  const equipmentCost = calculateEquipmentCost(equipmentItems);
  const totalAmount = laborCost + materialsCost + equipmentCost;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSave = async (submit: boolean = false) => {
    if (!user?.id || !contractContextId) {
      toast.error('Missing required data');
      return;
    }

    if (laborCost <= 0) {
      toast.error('Please enter labor hours or lump sum amount');
      return;
    }

    setLoading(true);
    try {
      const corRef = formatCorRef(cor.reference_number);
      const locationStr = getLocationDisplayString(cor.location);
      
      // Map COR scope_type to CO scope_type
      const scopeTypeMap: Record<string, 'RE_FRAME' | 'ADDITION' | 'FIXING' | 'RE_INSTALL' | 'ADJUST'> = {
        'RE-FRAME': 'RE_FRAME',
        'ADDITION': 'ADDITION',
        'FIXING': 'FIXING',
        'RE-INSTALL': 'RE_INSTALL',
        'ADJUST': 'ADJUST',
      };
      const coScopeType = scopeTypeMap[cor.scope_type] || 'FIXING';

      // Build description with notes
      const fullDescription = notes 
        ? `${cor.description}\n\nFC Notes: ${notes}`
        : cor.description;

      let coId = draftCoId;

      if (!coId) {
        // Create new draft CO
        const { data: newCO, error: coError } = await supabase
          .from('change_orders')
          .insert({
            contract_context_id: contractContextId,
            title: locationStr,
            description: fullDescription,
            location: locationStr,
            scope_type: coScopeType,
            created_by_user_id: user.id,
            approval_status: 'DRAFT',
            work_status: 'STARTED',
            // COR source tracking
            source_cor_id: cor.id,
            source_cor_ref: corRef,
            requested_by_user_id: cor.created_by_user_id,
            requested_by_role: cor.originated_by_role || 'TC',
            requested_at: cor.created_at,
            opened_at: cor.opened_at || new Date().toISOString(),
          })
          .select()
          .single();

        if (coError) {
          // Check for unique constraint (duplicate)
          if (coError.code === '23505') {
            toast.error('An estimate already exists for this COR');
            return;
          }
          throw coError;
        }

        coId = newCO.id;

        // Link draft CO to COR
        await supabase
          .from('change_order_requests')
          .update({ draft_co_id: coId })
          .eq('id', cor.id);

        setDraftCoId(coId);
      } else {
        // Update existing draft
        await supabase
          .from('change_orders')
          .update({
            description: fullDescription,
          })
          .eq('id', coId);

        // Delete existing line items to replace
        await supabase
          .from('co_line_items')
          .delete()
          .eq('co_id', coId);
      }

      // Create line items
      const lineItems: {
        co_id: string;
        type: LineItemType;
        description: string;
        qty: number;
        unit: UnitType;
        unit_cost: number;
        amount: number;
        created_by_user_id: string;
      }[] = [];

      // Labor
      if (estimateType === 'HOURS' && laborHours > 0) {
        lineItems.push({
          co_id: coId,
          type: 'LABOR',
          description: 'Labor',
          qty: laborHours,
          unit: 'HR',
          unit_cost: laborRate,
          amount: laborCost,
          created_by_user_id: user.id,
        });
      } else if (estimateType === 'LUMP_SUM' && lumpSumLabor > 0) {
        lineItems.push({
          co_id: coId,
          type: 'LABOR',
          description: 'Labor (Lump Sum)',
          qty: 1,
          unit: 'LS',
          unit_cost: lumpSumLabor,
          amount: lumpSumLabor,
          created_by_user_id: user.id,
        });
      }

      // Materials
      materials.forEach((material) => {
        if (material.quantity > 0 && material.category) {
          const materialDesc = getMaterialDisplayString(material);
          const unitMap: Record<string, UnitType> = {
            'EA': 'EA',
            'LF': 'LF',
            'SF': 'SF',
            'BOX': 'EA',
            'BUCKET': 'EA',
            'COIL': 'EA',
            'SHEET': 'EA',
          };
          lineItems.push({
            co_id: coId,
            type: 'MATERIAL',
            description: materialDesc,
            qty: material.quantity,
            unit: unitMap[material.unit] || 'EA',
            unit_cost: material.unit_cost || 0,
            amount: material.quantity * (material.unit_cost || 0),
            created_by_user_id: user.id,
          });
        }
      });

      // Equipment
      equipmentItems.forEach((equip) => {
        if (equip.category && (equip.quantity > 0 || equip.duration > 0)) {
          const equipDesc = getEquipmentDisplayString(equip);
          const isQuantityBased = ['SAFETY_EQUIPMENT', 'HAND_TOOLS', 'POWER_TOOLS'].includes(equip.category);
          const unitMap: Record<string, UnitType> = {
            'HR': 'HR',
            'DAY': 'DAY',
            'WEEK': 'DAY',
            'EA': 'EA',
          };
          const qty = isQuantityBased ? equip.quantity : (equip.unit === 'WEEK' ? equip.duration * 7 : equip.duration);
          lineItems.push({
            co_id: coId,
            type: 'EQUIPMENT',
            description: equipDesc,
            qty,
            unit: unitMap[equip.unit] || 'EA',
            unit_cost: equip.unit_cost || 0,
            amount: qty * (equip.unit_cost || 0),
            created_by_user_id: user.id,
          });
        }
      });

      if (lineItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('co_line_items')
          .insert(lineItems);

        if (itemsError) throw itemsError;
      }

      // Save cost layer for FC
      await supabase
        .from('change_order_cost_layers')
        .upsert({
          change_order_id: coId,
          layer_role: 'FIELD_CREW',
          labor_hours: estimateType === 'HOURS' ? laborHours : 0,
          labor_rate: estimateType === 'HOURS' ? laborRate : 0,
          labor_cost: laborCost,
          materials_cost: materialsCost,
          equipment_cost: equipmentCost,
          total_cost: totalAmount
        }, {
          onConflict: 'change_order_id,layer_role'
        });

      if (submit) {
        // Submit the CO using RPC
        const { error: submitError } = await supabase
          .rpc('submit_change_order', { _co_id: coId });

        if (submitError) throw submitError;

        // Update COR to CONVERTED status
        await supabase
          .from('change_order_requests')
          .update({
            status: 'CONVERTED',
            converted_to_co_id: coId,
            converted_at: new Date().toISOString(),
            converted_by_user_id: user.id,
          })
          .eq('id', cor.id);

        toast.success('Estimate submitted to Trade Contractor!');
        onSaved();
      } else {
        toast.success('Draft saved');
      }
    } catch (error) {
      console.error('Error saving estimate:', error);
      toast.error('Failed to save estimate');
    } finally {
      setLoading(false);
    }
  };

  const locationStr = getLocationDisplayString(cor.location);
  const scopeLabel = SCOPE_TYPE_OPTIONS.find(o => o.value === cor.scope_type)?.label || cor.scope_type;
  const reasonLabel = REASON_OPTIONS.find(o => o.value === cor.reason)?.label || cor.reason;

  if (initializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
          <div className="flex-1 flex items-center gap-2">
            <Badge variant="outline" className="bg-warning/20 text-warning border-warning/40 font-mono">
              {formatCorRef(cor.reference_number)}
            </Badge>
            <span className="font-semibold">Create Estimate</span>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* COR Info Banner */}
        <Card className="border-0 shadow-md bg-accent/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" />
              <span className="font-medium">{locationStr}</span>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">{scopeLabel}</Badge>
              <Badge variant="outline">{reasonLabel}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{cor.description}</p>
            {cor.parent_cor_ref && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3" />
                <span>Originally from {cor.parent_cor_ref}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estimate Type Toggle */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              Labor Estimate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`px-3 py-2.5 text-sm rounded-lg border transition-all text-center font-medium ${
                  estimateType === 'HOURS'
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'bg-background border-border hover:border-accent/50'
                }`}
                onClick={() => setEstimateType('HOURS')}
              >
                <Clock className="h-4 w-4 mx-auto mb-1" />
                By Hours
              </button>
              <button
                type="button"
                className={`px-3 py-2.5 text-sm rounded-lg border transition-all text-center font-medium ${
                  estimateType === 'LUMP_SUM'
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'bg-background border-border hover:border-accent/50'
                }`}
                onClick={() => setEstimateType('LUMP_SUM')}
              >
                <DollarSign className="h-4 w-4 mx-auto mb-1" />
                Lump Sum
              </button>
            </div>

            {estimateType === 'HOURS' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="laborHours">Hours</Label>
                  <Input
                    id="laborHours"
                    type="number"
                    min={0}
                    step="0.5"
                    value={laborHours === 0 ? '' : laborHours}
                    onChange={(e) => setLaborHours(Number(e.target.value) || 0)}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="laborRate">Rate ($/hr)</Label>
                  <Input
                    id="laborRate"
                    type="number"
                    min={0}
                    value={laborRate === 0 ? '' : laborRate}
                    onChange={(e) => setLaborRate(Number(e.target.value) || 0)}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="lumpSum">Lump Sum Amount</Label>
                <Input
                  id="lumpSum"
                  type="number"
                  min={0}
                  value={lumpSumLabor === 0 ? '' : lumpSumLabor}
                  onChange={(e) => setLumpSumLabor(Number(e.target.value) || 0)}
                  className="mt-1"
                  placeholder="$0"
                />
              </div>
            )}

            <div className="text-right text-sm">
              Labor Total: <span className="font-mono font-semibold">{formatCurrency(laborCost)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Materials */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5 text-accent" />
              Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MaterialsPicker
              materials={materials}
              onChange={setMaterials}
              showCosts={true}
            />
          </CardContent>
        </Card>

        {/* Equipment */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-5 w-5 text-accent" />
              Equipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EquipmentPicker
              equipment={equipmentItems}
              onChange={setEquipmentItems}
              showCosts={true}
            />
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any notes about the estimate..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </CardContent>
        </Card>

        {/* Total */}
        <Card className="border-0 shadow-md bg-accent/5">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Labor</span>
                <span>{formatCurrency(laborCost)}</span>
              </div>
              {materialsCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Materials</span>
                  <span>{formatCurrency(materialsCost)}</span>
                </div>
              )}
              {equipmentCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Equipment</span>
                  <span>{formatCurrency(equipmentCost)}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold font-mono">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4">
          <Button 
            onClick={() => handleSave(true)} 
            disabled={loading || laborCost <= 0}
          >
            <Send className="h-4 w-4 mr-2" />
            Submit Estimate
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleSave(false)} 
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            Save as Draft
          </Button>
        </div>
      </main>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import StructuredLocationPicker, { 
  StructuredLocation, 
  createEmptyLocation, 
  getLocationDisplayString 
} from './StructuredLocationPicker';
import MaterialsPicker, { 
  MaterialLine, 
  getMaterialDisplayString,
  calculateMaterialsCost
} from './MaterialsPicker';
import EquipmentPicker, { 
  EquipmentLine, 
  getEquipmentDisplayString,
  calculateEquipmentCost
} from './EquipmentPicker';
import { 
  ArrowLeft, 
  MapPin, 
  Save,
  Send,
  Wrench,
  Users,
  Sparkles,
  Loader2,
  Package,
  Truck
} from 'lucide-react';
import { toast } from 'sonner';

interface ChangeOrderFormProps {
  projectId: string;
  contractContextId: string;
  onClose: () => void;
  onSaved: () => void;
}

type ScopeType = 'RE-FRAME' | 'ADDITION' | 'FIXING' | 'RE-INSTALL' | 'ADJUST';
type LineItemType = 'LABOR' | 'MATERIAL' | 'EQUIPMENT';
type UnitType = 'HR' | 'EA' | 'LF' | 'SF' | 'SY' | 'DAY' | 'LS';
type AppRole = 'FIELD_CREW' | 'GC' | 'TRADE_CONTRACTOR';

const SCOPE_TYPES: { value: ScopeType; label: string }[] = [
  { value: 'RE-FRAME', label: 'Re-Frame' },
  { value: 'ADDITION', label: 'Addition' },
  { value: 'FIXING', label: 'Fixing' },
  { value: 'RE-INSTALL', label: 'Re-Install' },
  { value: 'ADJUST', label: 'Adjust' },
];

interface LineItemInput {
  type: LineItemType;
  description: string;
  qty: number;
  unit: UnitType;
  unit_cost: number;
}

// Role hierarchy: FC submits to TC, TC submits to GC
const getSubmitToRole = (creatorRole: AppRole): AppRole | null => {
  switch (creatorRole) {
    case 'FIELD_CREW':
      return 'TRADE_CONTRACTOR';
    case 'TRADE_CONTRACTOR':
      return 'GC';
    default:
      return null; // GC doesn't submit to anyone
  }
};

export default function ChangeOrderForm({ 
  projectId, 
  contractContextId,
  onClose, 
  onSaved 
}: ChangeOrderFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [structuredLocation, setStructuredLocation] = useState<StructuredLocation>(createEmptyLocation());
  const [description, setDescription] = useState('');
  const [scopeType, setScopeType] = useState<ScopeType>('FIXING');
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [submitToRole, setSubmitToRole] = useState<AppRole | null>(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  
  // Line items
  const [laborHours, setLaborHours] = useState<number>(0);
  const [laborRate, setLaborRate] = useState<number>(0);
  const [materials, setMaterials] = useState<MaterialLine[]>([]);
  const [equipmentItems, setEquipmentItems] = useState<EquipmentLine[]>([]);
  
  // Cost responsibility (TC = Trade Contractor pays, GC = General Contractor pays)
  type CostResponsibility = 'TC' | 'GC';
  const [materialsCostResponsibility, setMaterialsCostResponsibility] = useState<CostResponsibility>('GC');
  const [equipmentCostResponsibility, setEquipmentCostResponsibility] = useState<CostResponsibility>('GC');

  // Derived location string for database storage
  const locationString = getLocationDisplayString(structuredLocation);

  // Check if location is complete
  const isLocationComplete = (): boolean => {
    if (!structuredLocation.location_primary) return false;
    
    if (structuredLocation.location_primary === 'OUTSIDE') {
      if (!structuredLocation.room_or_area) return false;
      if (structuredLocation.room_or_area === 'Other' && !structuredLocation.custom_text) return false;
      return true;
    }
    
    // Inside
    if (!structuredLocation.level) return false;
    if (structuredLocation.level === 'Other' && !structuredLocation.custom_text) return false;
    if (structuredLocation.level !== 'Other' && !structuredLocation.room_or_area) return false;
    if (structuredLocation.room_or_area === 'Other' && !structuredLocation.custom_text) return false;
    
    return true;
  };

  // Fetch user's hourly rate and role on mount
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id || !projectId) return;
      
      // Get user's hourly rate from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('hourly_rate')
        .eq('id', user.id)
        .single();
      
      if (profile?.hourly_rate) {
        setLaborRate(Number(profile.hourly_rate));
      }

      // Get user's role on this project using RPC (handles both members and creator)
      const { data: role } = await supabase
        .rpc('get_user_project_role', { _project_id: projectId, _user_id: user.id });
      
      if (role) {
        setUserRole(role as AppRole);
        setSubmitToRole(getSubmitToRole(role as AppRole));
      }
    };
    
    fetchUserData();
  }, [user?.id, projectId]);

  const laborCost = laborHours * laborRate;
  // Calculate material/equipment costs only when TC is responsible
  const materialsCost = materialsCostResponsibility === 'TC' ? calculateMaterialsCost(materials) : 0;
  const equipmentCost = equipmentCostResponsibility === 'TC' ? calculateEquipmentCost(equipmentItems) : 0;
  const totalAmount = laborCost + materialsCost + equipmentCost;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleGenerateDescription = async () => {
    if (!isLocationComplete()) {
      toast.error('Please complete the location first');
      return;
    }

    setGeneratingDescription(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-co-description`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            scopeType,
            location: locationString,
            materials: materials.filter(m => m.quantity > 0 && m.category),
            equipment: equipmentItems.filter(e => e.category),
            laborHours,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate description');
      }

      const data = await response.json();
      if (data.description) {
        setDescription(data.description);
        toast.success('Description generated!');
      }
    } catch (error) {
      console.error('Error generating description:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate description');
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleSave = async (submit: boolean = false) => {
    if (!isLocationComplete()) {
      toast.error('Please complete the location selection');
      return;
    }

    if (!user?.id) {
      toast.error('You must be logged in');
      return;
    }

    // GC can approve directly (no need for submitToRole), but FC and TC need a target
    if (submit && !submitToRole && userRole !== 'GC') {
      toast.error('Your role cannot submit change orders');
      return;
    }

    setLoading(true);
    try {
      // Map scope type to database enum value
      const dbScopeType = scopeType.replace('-', '_') as 'RE_FRAME' | 'ADDITION' | 'FIXING' | 'RE_INSTALL' | 'ADJUST';
      
      // Create change order as DRAFT first (line items can only be added to DRAFT change orders)
      const { data: newCO, error: coError } = await supabase
        .from('change_orders')
        .insert([{
          contract_context_id: contractContextId,
          title: title.trim() || locationString,
          description: description.trim(),
          location: locationString,
          scope_type: dbScopeType,
          created_by_user_id: user.id,
          approval_status: 'DRAFT',
          work_status: 'STARTED',
          submitted_at: null,
          submitted_to_role: null,
        }])
        .select()
        .single();

      if (coError) throw coError;

      // Create line items
      const lineItems: LineItemInput[] = [];
      
      if (laborCost > 0) {
        lineItems.push({
          type: 'LABOR' as LineItemType,
          description: 'Labor',
          qty: laborHours,
          unit: 'HR' as UnitType,
          unit_cost: laborRate
        });
      }
      
      // Add structured materials as individual line items
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
            type: 'MATERIAL' as LineItemType,
            description: materialDesc,
            qty: material.quantity,
            unit: unitMap[material.unit] || 'EA',
            unit_cost: 0 // Pricing to be added later
          });
        }
      });
      
      // Add structured equipment as individual line items
      equipmentItems.forEach((equip) => {
        if (equip.category && (equip.quantity > 0 || equip.duration > 0)) {
          const equipDesc = getEquipmentDisplayString(equip);
          const isQuantityBased = ['SAFETY_EQUIPMENT', 'HAND_TOOLS', 'POWER_TOOLS'].includes(equip.category);
          const unitMap: Record<string, UnitType> = {
            'HR': 'HR',
            'DAY': 'DAY',
            'WEEK': 'DAY', // Convert weeks to days for storage
            'EA': 'EA',
          };
          lineItems.push({
            type: 'EQUIPMENT' as LineItemType,
            description: equipDesc,
            qty: isQuantityBased ? equip.quantity : (equip.unit === 'WEEK' ? equip.duration * 7 : equip.duration),
            unit: unitMap[equip.unit] || 'EA',
            unit_cost: 0 // Pricing to be added later
          });
        }
      });

      if (lineItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('co_line_items')
          .insert(
            lineItems.map(item => ({
              co_id: newCO.id,
              type: item.type,
              description: item.description,
              qty: item.qty,
              unit: item.unit,
              unit_cost: item.unit_cost,
              amount: item.qty * item.unit_cost,
              created_by_user_id: user.id
            }))
          );

        if (itemsError) throw itemsError;
      }

      // Save cost layer for role-based visibility
      if (userRole) {
        const { error: layerError } = await supabase
          .from('change_order_cost_layers')
          .insert({
            change_order_id: newCO.id,
            layer_role: userRole,
            labor_hours: laborHours,
            labor_rate: laborRate,
            labor_cost: laborCost,
            materials_cost: materialsCost,
            equipment_cost: equipmentCost,
            total_cost: totalAmount
          });

        if (layerError) {
          console.error('Error saving cost layer:', layerError);
          // Non-fatal - continue with submission
        }
      }

      if (submit) {
        // Use RPC to handle role-based submission routing (bypasses RLS)
        const { error: submitError } = await supabase
          .rpc('submit_change_order', { _co_id: newCO.id });

        if (submitError) throw submitError;
      }

      toast.success(submit ? 'Change order submitted!' : 'Change order saved as draft');
      onSaved();
    } catch (error) {
      console.error('Error saving change order:', error);
      toast.error('Failed to save change order');
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="font-semibold">New Change Order</h1>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Location - First and Most Important */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StructuredLocationPicker
              projectId={projectId}
              value={structuredLocation}
              onChange={setStructuredLocation}
            />
          </CardContent>
        </Card>

        {/* Title - Only show after location is selected */}
        {isLocationComplete() && (
          <Card className="border-0 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
            <CardContent className="pt-6">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                placeholder="Brief title for this change order"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank to use the location as the title
              </p>
            </CardContent>
          </Card>
        )}

        {/* Scope Type - Show after location */}
        {isLocationComplete() && (
          <Card className="border-0 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-5 w-5 text-accent" />
                Type of Work
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {SCOPE_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    className={`px-3 py-2.5 text-sm rounded-lg border transition-all text-center font-medium ${
                      scopeType === type.value
                        ? 'bg-accent text-accent-foreground border-accent'
                        : 'bg-background border-border hover:border-accent/50'
                    }`}
                    onClick={() => setScopeType(type.value)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description - Show after location */}
        {isLocationComplete() && (
          <Card className="border-0 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="description">Description</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={generatingDescription}
                  className="h-7 text-xs gap-1.5"
                >
                  {generatingDescription ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      AI Generate
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                id="description"
                placeholder="Describe the work to be done..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </CardContent>
          </Card>
        )}

        {/* Labor - Show after location */}
        {isLocationComplete() && (
          <Card className="border-0 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                Labor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={userRole === 'TRADE_CONTRACTOR' ? 'grid grid-cols-2 gap-4' : ''}>
                <div>
                  <Label htmlFor="laborHours">Hours</Label>
                  <Input
                    id="laborHours"
                    type="number"
                    min={0}
                    value={laborHours === 0 ? '' : laborHours}
                    onChange={(e) => setLaborHours(Number(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                {userRole === 'TRADE_CONTRACTOR' && (
                  <div>
                    <Label htmlFor="laborRate">Rate ($/hr)</Label>
                    <Input
                      id="laborRate"
                      type="number"
                      min={0}
                      value={laborRate === 0 ? '' : laborRate}
                      onChange={(e) => setLaborRate(Number(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
              {userRole === 'TRADE_CONTRACTOR' && (
                <div className="text-right text-sm">
                  Labor Total: <span className="font-mono-construction font-semibold">{formatCurrency(laborCost)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Materials - Show after location */}
        {isLocationComplete() && (
          <Card className="border-0 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5 text-accent" />
                Extra Materials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cost Responsibility Picker */}
              <div>
                <Label className="text-sm font-medium">Who is responsible for material costs?</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    className={`px-3 py-2.5 text-sm rounded-lg border transition-all text-center font-medium ${
                      materialsCostResponsibility === 'TC'
                        ? 'bg-accent text-accent-foreground border-accent'
                        : 'bg-background border-border hover:border-accent/50'
                    }`}
                    onClick={() => setMaterialsCostResponsibility('TC')}
                  >
                    Trade Contractor
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-2.5 text-sm rounded-lg border transition-all text-center font-medium ${
                      materialsCostResponsibility === 'GC'
                        ? 'bg-accent text-accent-foreground border-accent'
                        : 'bg-background border-border hover:border-accent/50'
                    }`}
                    onClick={() => setMaterialsCostResponsibility('GC')}
                  >
                    General Contractor
                  </button>
                </div>
                {materialsCostResponsibility === 'GC' && (
                  <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                    GC will be notified they are responsible for material costs when this change order is submitted.
                  </p>
                )}
              </div>
              
              <MaterialsPicker
                materials={materials}
                onChange={setMaterials}
                showCosts={materialsCostResponsibility === 'TC'}
              />
            </CardContent>
          </Card>
        )}

        {/* Equipment - Show after location */}
        {isLocationComplete() && (
          <Card className="border-0 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-5 w-5 text-accent" />
                Equipment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cost Responsibility Picker */}
              <div>
                <Label className="text-sm font-medium">Who is responsible for equipment costs?</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    className={`px-3 py-2.5 text-sm rounded-lg border transition-all text-center font-medium ${
                      equipmentCostResponsibility === 'TC'
                        ? 'bg-accent text-accent-foreground border-accent'
                        : 'bg-background border-border hover:border-accent/50'
                    }`}
                    onClick={() => setEquipmentCostResponsibility('TC')}
                  >
                    Trade Contractor
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-2.5 text-sm rounded-lg border transition-all text-center font-medium ${
                      equipmentCostResponsibility === 'GC'
                        ? 'bg-accent text-accent-foreground border-accent'
                        : 'bg-background border-border hover:border-accent/50'
                    }`}
                    onClick={() => setEquipmentCostResponsibility('GC')}
                  >
                    General Contractor
                  </button>
                </div>
                {equipmentCostResponsibility === 'GC' && (
                  <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                    GC will be notified they are responsible for equipment costs when this change order is submitted.
                  </p>
                )}
              </div>
              
              <EquipmentPicker
                equipment={equipmentItems}
                onChange={setEquipmentItems}
                showCosts={equipmentCostResponsibility === 'TC'}
              />
            </CardContent>
          </Card>
        )}

        {/* Total - Show after location, only for TC */}
        {isLocationComplete() && userRole === 'TRADE_CONTRACTOR' && (
          <Card className="border-0 shadow-md bg-accent/5 animate-in fade-in slide-in-from-top-2 duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold font-mono-construction">{formatCurrency(totalAmount)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions - Show after location */}
        {isLocationComplete() && (
          <div className="flex flex-col gap-3 pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <Button onClick={() => handleSave(true)} disabled={loading || (userRole === 'TRADE_CONTRACTOR' ? totalAmount <= 0 : laborHours <= 0)}>
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
            <Button variant="outline" onClick={() => handleSave(false)} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

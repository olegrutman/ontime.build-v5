import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Wrench,
  User,
  Calendar,
  Clock,
  DollarSign,
  Send,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  AlertTriangle,
  Users,
  Package,
  Truck,
  Loader2,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ChangeOrderRequest,
  StructuredLocation,
  CorStatus,
  AppRole,
  STATUS_CONFIG,
  SCOPE_TYPE_OPTIONS,
  REASON_OPTIONS,
  ROLE_LABELS,
  getLocationDisplayString,
  formatCorRef,
  formatCoRef,
} from './types';
import FcEstimateForm from './FcEstimateForm';

interface CorDetailProps {
  corId: string;
  projectId: string;
  onClose: () => void;
  onUpdated: () => void;
}

interface ProfileInfo {
  email: string;
  company_name: string;
}

interface FieldCrewMember {
  user_id: string;
  email: string;
  company_name: string;
}

export default function CorDetail({ corId, projectId, onClose, onUpdated }: CorDetailProps) {
  const { user } = useAuth();
  const [cor, setCor] = useState<ChangeOrderRequest | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<ProfileInfo | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // View state for FC
  const [showFcEstimateForm, setShowFcEstimateForm] = useState(false);

  // TC action dialogs
  const [showSendDownstreamDialog, setShowSendDownstreamDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showTcEstimateForm, setShowTcEstimateForm] = useState(false);

  // Send downstream fields
  const [fieldCrewMembers, setFieldCrewMembers] = useState<FieldCrewMember[]>([]);
  const [selectedFieldCrew, setSelectedFieldCrew] = useState<string>('');

  // TC estimate fields
  type EstimateType = 'HOURS' | 'LUMP_SUM';
  const [estimateType, setEstimateType] = useState<EstimateType>('HOURS');
  const [laborHours, setLaborHours] = useState<number>(0);
  const [laborRate, setLaborRate] = useState<number>(0);
  const [lumpSumLabor, setLumpSumLabor] = useState<number>(0);
  const [materials, setMaterials] = useState<MaterialLine[]>([]);
  const [equipmentItems, setEquipmentItems] = useState<EquipmentLine[]>([]);
  const [markupPercent, setMarkupPercent] = useState<number>(0);

  useEffect(() => {
    fetchCor();
    fetchUserRole();
  }, [corId]);

  const fetchUserRole = async () => {
    if (!user?.id || !projectId) return;
    
    const { data } = await supabase.rpc('get_user_project_role', {
      _project_id: projectId,
      _user_id: user.id,
    });
    
    if (data) {
      setUserRole(data as AppRole);
      
      // Load FC members if TC
      if (data === 'TRADE_CONTRACTOR') {
        fetchFieldCrewMembers();
      }
    }
  };

  const fetchFieldCrewMembers = async () => {
    const { data } = await supabase.rpc('get_project_members_with_profiles', {
      _project_id: projectId,
    });
    
    if (data) {
      const fcMembers = data
        .filter((m: { project_role: string }) => m.project_role === 'FIELD_CREW')
        .map((m: { user_id: string; email: string; company_name: string }) => ({
          user_id: m.user_id,
          email: m.email,
          company_name: m.company_name,
        }));
      setFieldCrewMembers(fcMembers);
    }
  };

  const fetchCor = async () => {
    try {
      const { data, error } = await supabase
        .from('change_order_requests')
        .select('*')
        .eq('id', corId)
        .single();

      if (error) throw error;

      const parsedCor = {
        ...data,
        location: typeof data.location === 'string' 
          ? JSON.parse(data.location) 
          : data.location as StructuredLocation,
      } as ChangeOrderRequest;

      setCor(parsedCor);

      // Fetch creator profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email, company_id, role')
        .eq('id', parsedCor.created_by_user_id)
        .single();

      if (profileData) {
        let companyName = profileData.email.split('@')[0];
        if (profileData.company_id) {
          const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', profileData.company_id)
            .single();
          if (company) companyName = company.name;
        }
        setCreatorProfile({ email: profileData.email, company_name: companyName });
      }

      // FC auto-opens COR: set opened_at if not already opened
      if (user?.id && parsedCor.status === 'SENT_TO_FIELD_CREW' && !parsedCor.opened_at) {
        const currentRole = await supabase.rpc('get_user_project_role', {
          _project_id: projectId,
          _user_id: user.id,
        });
        
        if (currentRole.data === 'FIELD_CREW') {
          await supabase
            .from('change_order_requests')
            .update({ opened_at: new Date().toISOString() })
            .eq('id', corId);
          
          // Show estimate form immediately for FC
          setShowFcEstimateForm(true);
        }
      }
    } catch (error) {
      console.error('Error fetching COR:', error);
      toast.error('Failed to load Change Order Request');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // TC: Send downstream to FC
  const handleSendDownstream = async () => {
    if (!cor || !user?.id || !selectedFieldCrew) {
      toast.error('Please select a Field Crew member');
      return;
    }

    // Idempotency: check if already sent downstream
    if (cor.status === 'SENT_TO_FIELD_CREW') {
      toast.info('This COR has already been sent downstream');
      return;
    }

    setActionLoading(true);
    try {
      const corRef = formatCorRef(cor.reference_number);
      
      // Create a new downstream COR
      const { error: insertError } = await supabase
        .from('change_order_requests')
        .insert({
          project_id: projectId,
          location: cor.location,
          scope_type: cor.scope_type,
          description: cor.description,
          reason: cor.reason,
          status: 'SENT_TO_FIELD_CREW',
          created_by_user_id: user.id,
          recipient_user_id: selectedFieldCrew,
          parent_cor_id: cor.id,
          parent_cor_ref: corRef,
          originated_by_role: cor.originated_by_role || 'GC',
          sent_at: new Date().toISOString(),
        } as any);

      if (insertError) throw insertError;

      // Update original COR status
      await supabase
        .from('change_order_requests')
        .update({ 
          status: 'SENT_TO_FIELD_CREW',
          sent_at: new Date().toISOString()
        })
        .eq('id', corId);

      toast.success('COR sent to Field Crew');
      setShowSendDownstreamDialog(false);
      onUpdated();
      onClose();
    } catch (error) {
      console.error('Error sending downstream:', error);
      toast.error('Failed to send downstream');
    } finally {
      setActionLoading(false);
    }
  };

  // TC: Convert to CO (with estimate)
  const handleConvertToCo = async (submit: boolean = false) => {
    if (!cor || !user?.id) return;

    // Idempotency
    if (cor.converted_to_co_id) {
      toast.info('This COR has already been converted');
      onClose();
      return;
    }

    const laborCost = estimateType === 'HOURS' 
      ? laborHours * laborRate 
      : lumpSumLabor;
    const materialsCost = calculateMaterialsCost(materials);
    const equipmentCost = calculateEquipmentCost(equipmentItems);
    const subtotal = laborCost + materialsCost + equipmentCost;
    const markup = subtotal * (markupPercent / 100);
    const totalAmount = subtotal + markup;

    if (totalAmount <= 0) {
      toast.error('Please enter pricing details');
      return;
    }

    setActionLoading(true);
    try {
      // Get the upstream contract context
      const { data: contexts } = await supabase
        .from('contract_contexts')
        .select('id')
        .eq('project_id', projectId)
        .eq('type', 'UPSTREAM')
        .single();

      if (!contexts) {
        toast.error('No contract context found');
        return;
      }

      const corRef = formatCorRef(cor.reference_number);
      const locationStr = getLocationDisplayString(cor.location);
      const nowIso = new Date().toISOString();

      // Map scope type
      const scopeTypeMap: Record<string, 'RE_FRAME' | 'ADDITION' | 'FIXING' | 'RE_INSTALL' | 'ADJUST'> = {
        'RE-FRAME': 'RE_FRAME',
        'ADDITION': 'ADDITION',
        'FIXING': 'FIXING',
        'RE-INSTALL': 'RE_INSTALL',
        'ADJUST': 'ADJUST',
      };
      const coScopeType = scopeTypeMap[cor.scope_type] || 'FIXING';

      // Create the Change Order
      const { data: newCO, error: coError } = await supabase
        .from('change_orders')
        .insert({
          contract_context_id: contexts.id,
          title: locationStr,
          description: cor.description,
          location: locationStr,
          scope_type: coScopeType,
          created_by_user_id: user.id,
          approval_status: 'DRAFT',
          work_status: 'STARTED',
          source_cor_id: cor.id,
          source_cor_ref: corRef,
          requested_by_user_id: cor.created_by_user_id,
          requested_by_role: cor.originated_by_role || 'GC',
          requested_at: cor.created_at,
          opened_at: cor.opened_at || nowIso,
          converted_at: nowIso,
        })
        .select()
        .single();

      if (coError) {
        if (coError.code === '23505') {
          toast.info('This COR has already been converted');
          onClose();
          return;
        }
        throw coError;
      }

      // Create line items
      const lineItems = [];
      
      if (laborCost > 0) {
        lineItems.push({
          co_id: newCO.id,
          type: 'LABOR',
          description: estimateType === 'HOURS' ? 'Labor' : 'Labor (Lump Sum)',
          qty: estimateType === 'HOURS' ? laborHours : 1,
          unit: estimateType === 'HOURS' ? 'HR' : 'LS',
          unit_cost: estimateType === 'HOURS' ? laborRate : lumpSumLabor,
          amount: laborCost,
          created_by_user_id: user.id,
        });
      }

      materials.forEach((material) => {
        if (material.quantity > 0 && material.category) {
          lineItems.push({
            co_id: newCO.id,
            type: 'MATERIAL',
            description: getMaterialDisplayString(material),
            qty: material.quantity,
            unit: 'EA',
            unit_cost: material.unit_cost || 0,
            amount: material.quantity * (material.unit_cost || 0),
            created_by_user_id: user.id,
          });
        }
      });

      equipmentItems.forEach((equip) => {
        if (equip.category && (equip.quantity > 0 || equip.duration > 0)) {
          const isQuantityBased = ['SAFETY_EQUIPMENT', 'HAND_TOOLS', 'POWER_TOOLS'].includes(equip.category);
          const qty = isQuantityBased ? equip.quantity : equip.duration;
          lineItems.push({
            co_id: newCO.id,
            type: 'EQUIPMENT',
            description: getEquipmentDisplayString(equip),
            qty,
            unit: 'EA',
            unit_cost: equip.unit_cost || 0,
            amount: qty * (equip.unit_cost || 0),
            created_by_user_id: user.id,
          });
        }
      });

      if (lineItems.length > 0) {
        await supabase.from('co_line_items').insert(lineItems);
      }

      // Save cost layer
      await supabase
        .from('change_order_cost_layers')
        .insert({
          change_order_id: newCO.id,
          layer_role: 'TRADE_CONTRACTOR',
          labor_hours: estimateType === 'HOURS' ? laborHours : 0,
          labor_rate: estimateType === 'HOURS' ? laborRate : 0,
          labor_cost: laborCost,
          materials_cost: materialsCost,
          equipment_cost: equipmentCost,
          total_cost: totalAmount
        });

      // Update COR as converted
      await supabase
        .from('change_order_requests')
        .update({
          status: 'CONVERTED',
          converted_to_co_id: newCO.id,
          converted_at: nowIso,
          converted_by_user_id: user.id,
        })
        .eq('id', corId);

      if (submit) {
        await supabase.rpc('submit_change_order', { _co_id: newCO.id });
        toast.success(`Submitted ${formatCoRef(newCO.reference_number)} for approval`);
      } else {
        toast.success(`Created ${formatCoRef(newCO.reference_number)} as draft`);
      }

      setShowConvertDialog(false);
      setShowTcEstimateForm(false);
      onUpdated();
      onClose();
    } catch (error) {
      console.error('Error converting to CO:', error);
      toast.error('Failed to convert to Change Order');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Show FC estimate form
  if (showFcEstimateForm && cor && userRole === 'FIELD_CREW') {
    return (
      <FcEstimateForm
        cor={cor}
        projectId={projectId}
        onClose={() => {
          setShowFcEstimateForm(false);
          onClose();
        }}
        onSaved={() => {
          setShowFcEstimateForm(false);
          onUpdated();
          onClose();
        }}
      />
    );
  }

  // Show TC estimate form
  if (showTcEstimateForm && cor && userRole === 'TRADE_CONTRACTOR') {
    const laborCost = estimateType === 'HOURS' ? laborHours * laborRate : lumpSumLabor;
    const materialsCost = calculateMaterialsCost(materials);
    const equipmentCost = calculateEquipmentCost(equipmentItems);
    const subtotal = laborCost + materialsCost + equipmentCost;
    const markup = subtotal * (markupPercent / 100);
    const total = subtotal + markup;

    return (
      <div className="min-h-screen bg-background pb-safe-bottom">
        <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
          <div className="container flex items-center h-14 px-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowTcEstimateForm(false)}
              className="text-primary-foreground hover:bg-primary-foreground/10 mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 flex items-center gap-2">
              <Badge variant="outline" className="bg-warning/20 text-warning border-warning/40 font-mono">
                {formatCorRef(cor.reference_number)}
              </Badge>
              <span className="font-semibold">Convert to CO</span>
            </div>
          </div>
        </header>

        <main className="container px-4 py-6 space-y-6">
          {/* COR Info */}
          <Card className="border-0 shadow-md bg-accent/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" />
                <span className="font-medium">{getLocationDisplayString(cor.location)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{cor.description}</p>
            </CardContent>
          </Card>

          {/* Estimate Type */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                Labor
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
                      value={laborHours === 0 ? '' : laborHours}
                      onChange={(e) => setLaborHours(Number(e.target.value) || 0)}
                      className="mt-1"
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

          {/* Markup */}
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <Label htmlFor="markup">Markup %</Label>
              <Input
                id="markup"
                type="number"
                min={0}
                max={100}
                value={markupPercent === 0 ? '' : markupPercent}
                onChange={(e) => setMarkupPercent(Number(e.target.value) || 0)}
                className="mt-1"
              />
            </CardContent>
          </Card>

          {/* Total */}
          <Card className="border-0 shadow-md bg-accent/5">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {markupPercent > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Markup ({markupPercent}%)</span>
                  <span>{formatCurrency(markup)}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold font-mono">{formatCurrency(total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4">
            <Button 
              onClick={() => handleConvertToCo(true)} 
              disabled={actionLoading || total <= 0}
            >
              <Send className="h-4 w-4 mr-2" />
              Create & Submit to GC
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleConvertToCo(false)} 
              disabled={actionLoading || total <= 0}
            >
              <Save className="h-4 w-4 mr-2" />
              Create as Draft
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (loading || !cor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[cor.status as CorStatus];
  const locationStr = getLocationDisplayString(cor.location);
  const scopeLabel = SCOPE_TYPE_OPTIONS.find(o => o.value === cor.scope_type)?.label || cor.scope_type;
  const reasonLabel = REASON_OPTIONS.find(o => o.value === cor.reason)?.label || cor.reason;

  // Determine what actions the user can take
  const isFC = userRole === 'FIELD_CREW';
  const isTC = userRole === 'TRADE_CONTRACTOR';
  const isGC = userRole === 'GC';

  // FC can open estimate form if COR is sent to them
  const canFcEstimate = isFC && cor.status === 'SENT_TO_FIELD_CREW';
  
  // TC can take action on GC CORs (REQUESTED status)
  const canTcAct = isTC && (cor.status === 'REQUESTED' || cor.status === 'SENT_TO_TC');
  const canTcConvert = isTC && cor.status !== 'CONVERTED' && !canTcAct;
  const alreadyConverted = cor.status === 'CONVERTED';

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
            <span className="font-semibold">Change Order Request</span>
          </div>
          <Badge className={statusConfig.className}>
            {statusConfig.label}
          </Badge>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Converted notice */}
        {alreadyConverted && cor.converted_to_co_id && (
          <Card className="border-0 shadow-md bg-success/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm font-medium text-success">Converted to Change Order</p>
                  <p className="text-xs text-muted-foreground">
                    This COR has been converted and is now following the standard CO workflow.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lineage notice */}
        {cor.parent_cor_ref && (
          <Card className="border-0 shadow-md bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Originally from</span>
                <Badge variant="outline" className="font-mono">{cor.parent_cor_ref}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Location */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{locationStr}</p>
          </CardContent>
        </Card>

        {/* Scope & Reason */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-5 w-5 text-accent" />
              Scope & Reason
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Badge variant="secondary">{scopeLabel}</Badge>
              <Badge variant="outline">{reasonLabel}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{cor.description}</p>
          </CardContent>
        </Card>

        {/* Created By */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created by</span>
              <span className="font-medium">{creatorProfile?.company_name}</span>
              <span className="text-muted-foreground">•</span>
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(cor.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        {/* FC Action: Open Estimate Form */}
        {canFcEstimate && (
          <Button
            variant="accent"
            size="lg"
            className="w-full"
            onClick={() => setShowFcEstimateForm(true)}
          >
            <ArrowUpRight className="h-5 w-5 mr-2" />
            Create Estimate
          </Button>
        )}

        {/* TC Actions: Two choices for GC CORs */}
        {canTcAct && (
          <Card className="border-0 shadow-md border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Choose an Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You can either get an estimate from Field Crew, or create the CO yourself.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => setShowSendDownstreamDialog(true)}
                  disabled={fieldCrewMembers.length === 0}
                >
                  <ArrowDownRight className="h-6 w-6" />
                  <span className="text-sm font-medium">Send to FC</span>
                  <span className="text-xs text-muted-foreground">Get FC estimate</span>
                </Button>
                <Button
                  variant="default"
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => setShowTcEstimateForm(true)}
                >
                  <ArrowUpRight className="h-6 w-6" />
                  <span className="text-sm font-medium">Convert to CO</span>
                  <span className="text-xs text-muted-foreground">Create estimate now</span>
                </Button>
              </div>
              {fieldCrewMembers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  No Field Crew on project. Add from Team tab to enable downstream sending.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* GC notice */}
        {isGC && (
          <Card className="border-0 shadow-md bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  This COR is with the Trade Contractor. You'll receive a Change Order once they've completed pricing.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Send Downstream Dialog */}
      <Dialog open={showSendDownstreamDialog} onOpenChange={setShowSendDownstreamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send to Field Crew</DialogTitle>
            <DialogDescription>
              Create a downstream COR for Field Crew to estimate. They will provide hours and/or materials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Field Crew</Label>
              <Select value={selectedFieldCrew} onValueChange={setSelectedFieldCrew}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Field Crew" />
                </SelectTrigger>
                <SelectContent>
                  {fieldCrewMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.company_name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDownstreamDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="accent" 
              onClick={handleSendDownstream} 
              disabled={actionLoading || !selectedFieldCrew}
            >
              <ArrowDownRight className="h-4 w-4 mr-2" />
              Send to FC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

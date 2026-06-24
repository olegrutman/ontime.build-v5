import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { sendNotificationEmail } from '@/hooks/useNotificationEmail';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  MapPin, 
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Download,
  Wrench,
  User,
  Calendar,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';

type WorkStatus = 'STARTED' | 'IN_PROGRESS' | 'COMPLETED';
type ApprovalStatus = 'DRAFT' | 'NEEDS_APPROVAL' | 'APPROVED' | 'REJECTED';
type AppRole = 'FIELD_CREW' | 'TRADE_CONTRACTOR' | 'GC';

const WORK_STATUS_CONFIG: Record<WorkStatus, { label: string; className: string }> = {
  STARTED: { label: 'Started', className: 'bg-muted text-muted-foreground' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-warning/10 text-warning' },
  COMPLETED: { label: 'Completed', className: 'bg-success/10 text-success' },
};

const APPROVAL_STATUS_CONFIG: Record<ApprovalStatus, { label: string; icon: typeof Clock; className: string }> = {
  DRAFT: { label: 'Draft', icon: FileText, className: 'bg-muted text-muted-foreground' },
  NEEDS_APPROVAL: { label: 'Pending', icon: Clock, className: 'bg-warning/10 text-warning' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, className: 'bg-success/10 text-success' },
  REJECTED: { label: 'Rejected', icon: XCircle, className: 'bg-destructive/10 text-destructive' },
};

const ROLE_LABELS: Record<string, string> = {
  'FIELD_CREW': 'Field Crew',
  'TRADE_CONTRACTOR': 'Trade Contractor',
  'GC': 'General Contractor',
  'OWNER': 'Owner'
};

const ROLE_HIERARCHY: AppRole[] = ['FIELD_CREW', 'TRADE_CONTRACTOR', 'GC'];

interface ChangeOrder {
  id: string;
  reference_number: number;
  contract_context_id: string;
  title: string;
  description: string;
  location: string;
  scope_type: string;
  work_status: WorkStatus;
  approval_status: ApprovalStatus;
  created_by_user_id: string;
  submitted_to_role: string | null;
  approved_by_user_id: string | null;
  rejected_by_user_id: string | null;
  rejection_comments: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  source_fc_change_order_id: string | null;
  // COR source tracking
  source_cor_id: string | null;
  source_cor_ref: string | null;
  requested_by_user_id: string | null;
  requested_by_role: string | null;
  requested_at: string | null;
  opened_at: string | null;
  converted_at: string | null;
}

// Helper to format CO reference
function formatCoRef(referenceNumber: number): string {
  return `CO-${referenceNumber}`;
}

interface LineItem {
  id: string;
  co_id: string;
  type: string;
  description: string;
  qty: number | null;
  unit: string | null;
  unit_cost: number | null;
  amount: number;
  created_by_user_id: string;
}

interface CostLayer {
  layer_role: AppRole;
  labor_hours: number;
  labor_rate: number;
  labor_cost: number;
  materials_cost: number;
  equipment_cost: number;
  total_cost: number;
}

interface CreatorProfile {
  email: string;
  role: string;
  company_name: string;
}

interface ChangeOrderDetailProps {
  changeOrderId: string;
  projectId: string;
  onClose: () => void;
  onUpdated: () => void;
}

const SCOPE_LABELS: Record<string, string> = {
  'RE_FRAME': 'Re-Frame',
  'RE-FRAME': 'Re-Frame',
  'ADDITION': 'Addition',
  'FIXING': 'Fixing',
  'RE_INSTALL': 'Re-Install',
  'RE-INSTALL': 'Re-Install',
  'ADJUST': 'Adjust'
};

export default function ChangeOrderDetail({ 
  changeOrderId, 
  projectId,
  onClose, 
  onUpdated 
}: ChangeOrderDetailProps) {
  const { user } = useAuth();
  const [changeOrder, setChangeOrder] = useState<ChangeOrder | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [costLayers, setCostLayers] = useState<CostLayer[]>([]);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [creatorProjectRole, setCreatorProjectRole] = useState<AppRole | null>(null);
  const [approverProfile, setApproverProfile] = useState<CreatorProfile | null>(null);
  const [myProjectRole, setMyProjectRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionComments, setRejectionComments] = useState('');
  const [copyingToGC, setCopyingToGC] = useState(false);
  const [workStatusLoading, setWorkStatusLoading] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [fcHoursFromCO, setFcHoursFromCO] = useState<number>(0);
  const [tcExtraHours, setTcExtraHours] = useState<number>(0);
  const [copyRate, setCopyRate] = useState<number>(0);
  const [copyLineItems, setCopyLineItems] = useState<Array<{
    id: string;
    type: string;
    description: string;
    qty: number;
    unit: string | null;
    unitCost: number;
  }>>([]);

  useEffect(() => {
    fetchChangeOrder();
  }, [changeOrderId]);

  useEffect(() => {
    if (user?.id && projectId) {
      fetchMyProjectRole();
    }
  }, [user?.id, projectId]);

  const fetchMyProjectRole = async () => {
    if (!user?.id || !projectId) return;

    try {
      const { data, error } = await supabase.rpc('get_user_project_role', {
        _project_id: projectId,
        _user_id: user.id,
      });

      if (error) throw error;
      setMyProjectRole((data as AppRole) ?? null);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setMyProjectRole(null);
    }
  };

  const fetchChangeOrder = async () => {
    try {
      const [coResult, lineItemsResult] = await Promise.all([
        supabase.from('change_orders').select('*').eq('id', changeOrderId).single(),
        supabase.from('co_line_items').select('*').eq('co_id', changeOrderId)
      ]);

      if (coResult.error) throw coResult.error;
      
      const co = coResult.data as ChangeOrder;
      setChangeOrder(co);
      setLineItems((lineItemsResult.data || []) as LineItem[]);

      // Fetch cost layers using RPC for role-based visibility
      if (user?.id) {
        const { data: layers } = await supabase.rpc('get_visible_cost_layers', {
          _change_order_id: changeOrderId,
          _viewer_user_id: user.id
        });
        if (layers) {
          setCostLayers(layers as CostLayer[]);
        }
      }

      // Fetch creator profile with company name
      const { data: creatorData } = await supabase
        .from('profiles')
        .select('email, role, company_id')
        .eq('id', co.created_by_user_id)
        .single();
      
      let creatorCompanyName = creatorData?.email?.split('@')[0] || 'Unknown';
      if (creatorData?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('name')
          .eq('id', creatorData.company_id)
          .single();
        if (company) creatorCompanyName = company.name;
      }
      
      if (creatorData) {
        setCreatorProfile({
          email: creatorData.email,
          role: creatorData.role,
          company_name: creatorCompanyName
        });
      }

      // Fetch creator's project role (not their profile role)
      const { data: creatorRoleData } = await supabase.rpc('get_user_project_role', {
        _project_id: projectId,
        _user_id: co.created_by_user_id,
      });
      if (creatorRoleData) {
        setCreatorProjectRole(creatorRoleData as AppRole);
      }

      // Fetch approver profile if approved
      if (co.approved_by_user_id) {
        const { data: approverData } = await supabase
          .from('profiles')
          .select('email, role, company_id')
          .eq('id', co.approved_by_user_id)
          .single();
        
        let approverCompanyName = approverData?.email?.split('@')[0] || 'Unknown';
        if (approverData?.company_id) {
          const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', approverData.company_id)
            .single();
          if (company) approverCompanyName = company.name;
        }
        
        if (approverData) {
          setApproverProfile({
            email: approverData.email,
            role: approverData.role,
            company_name: approverCompanyName
          });
        }
      }
    } catch (error) {
      console.error('Error fetching change order:', error);
      toast.error('Failed to load change order');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWorkStatus = async (newStatus: WorkStatus) => {
    if (!changeOrder || !user) return;
    
    setWorkStatusLoading(true);
    try {
      const { error } = await supabase
        .from('change_orders')
        .update({ work_status: newStatus })
        .eq('id', changeOrder.id);

      if (error) throw error;

      setChangeOrder({ ...changeOrder, work_status: newStatus });
      toast.success(`Work status updated to ${WORK_STATUS_CONFIG[newStatus].label}`);
    } catch (error) {
      console.error('Error updating work status:', error);
      toast.error('Failed to update work status');
    } finally {
      setWorkStatusLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!changeOrder) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-change-order-pdf', {
        body: { changeOrderId: changeOrder.id }
      });

      if (error) throw error;

      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleSubmit = async () => {
    if (!changeOrder || !user) return;

    setActionLoading(true);
    try {
      // Use RPC to handle role-based submission routing (bypasses RLS)
      const { error } = await supabase
        .rpc('submit_change_order', { _co_id: changeOrderId });

      if (error) throw error;

      // Send email notification to approver (fetch approver info)
      try {
        const { data: approverEmail } = await supabase
          .rpc('get_change_order_approver', { 
            _project_id: projectId, 
            _submitter_id: user.id 
          });
        
        if (approverEmail) {
          // Get project name
          const { data: projectData } = await supabase
            .from('projects')
            .select('name')
            .eq('id', projectId)
            .single();

          await sendNotificationEmail({
            type: 'change_order_submitted',
            recipientEmail: approverEmail,
            projectName: projectData?.name || 'Unknown Project',
            projectId,
            changeOrderLocation: changeOrder.location,
            amount: lineItems.reduce((sum, item) => sum + item.amount, 0),
            senderName: creatorProfile?.company_name || 'Team Member'
          });
        }
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
        // Don't fail the submission if email fails
      }

      toast.success('Change order submitted for approval');
      onUpdated();
      onClose();
    } catch (error) {
      console.error('Error submitting change order:', error);
      toast.error('Failed to submit change order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!changeOrder || !user) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('approve_change_order', {
        _co_id: changeOrderId,
      });

      if (error) throw error;

      // Send approval email to CO creator
      try {
        if (creatorProfile?.email) {
          const { data: projectData } = await supabase
            .from('projects')
            .select('name')
            .eq('id', projectId)
            .single();

          await sendNotificationEmail({
            type: 'change_order_approved',
            recipientEmail: creatorProfile.email,
            projectName: projectData?.name || 'Unknown Project',
            projectId,
            changeOrderLocation: changeOrder.location,
            amount: lineItems.reduce((sum, item) => sum + item.amount, 0)
          });
        }
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
      }

      toast.success('Change order approved');
      onUpdated();
      onClose();
    } catch (error) {
      console.error('Error approving change order:', error);
      toast.error('Failed to approve change order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!changeOrder || !user || !rejectionComments.trim()) {
      toast.error('Please provide rejection comments');
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('reject_change_order', {
        _co_id: changeOrderId,
        _rejection_comments: rejectionComments.trim(),
      });

      if (error) throw error;

      // Send rejection email to CO creator
      try {
        if (creatorProfile?.email) {
          const { data: projectData } = await supabase
            .from('projects')
            .select('name')
            .eq('id', projectId)
            .single();

          await sendNotificationEmail({
            type: 'change_order_rejected',
            recipientEmail: creatorProfile.email,
            projectName: projectData?.name || 'Unknown Project',
            projectId,
            changeOrderLocation: changeOrder.location,
            amount: lineItems.reduce((sum, item) => sum + item.amount, 0),
            rejectionReason: rejectionComments.trim()
          });
        }
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
      }

      toast.success('Change order rejected');
      onUpdated();
      onClose();
    } catch (error) {
      console.error('Error rejecting change order:', error);
      toast.error('Failed to reject change order');
    } finally {
      setActionLoading(false);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  // Get FC and TC cost layers for margin calculation (TC only)
  const fcLayer = costLayers.find(l => l.layer_role === 'FIELD_CREW');
  const tcLayer = costLayers.find(l => l.layer_role === 'TRADE_CONTRACTOR');
  
  // Calculate margin for TC viewing FC COs
  const calculateMargin = () => {
    if (!fcLayer || !tcLayer) return null;
    const fcLaborCost = fcLayer.labor_cost || 0;
    const tcLaborCost = tcLayer.labor_cost || 0;
    const margin = tcLaborCost - fcLaborCost;
    const marginPercent = tcLaborCost > 0 ? (margin / tcLaborCost) * 100 : 0;
    return { margin, marginPercent };
  };

  // Open the copy dialog with default values
  const openCopyDialog = async () => {
    if (!user?.id) return;
    
    // Get TC's hourly rate
    const { data: profile } = await supabase
      .from('profiles')
      .select('hourly_rate')
      .eq('id', user.id)
      .single();
    
    const tcRate = profile?.hourly_rate || 0;
    
    // Get FC hours from cost layer, or fallback to summing LABOR line items
    let fcHours = fcLayer?.labor_hours || 0;
    if (fcHours === 0) {
      // Fallback: sum hours from LABOR line items
      fcHours = lineItems
        .filter(item => item.type === 'LABOR' && item.unit === 'HR')
        .reduce((sum, item) => sum + (item.qty || 0), 0);
    }
    
    setFcHoursFromCO(fcHours);
    setTcExtraHours(0);
    setCopyRate(tcRate);
    
    // Initialize materials and equipment for editing
    const matEquipItems = lineItems
      .filter(item => item.type === 'MATERIAL' || item.type === 'EQUIPMENT')
      .map(item => ({
        id: item.id,
        type: item.type,
        description: item.description,
        qty: item.qty || 0,
        unit: item.unit,
        unitCost: 0, // TC sets their own pricing
      }));
    setCopyLineItems(matEquipItems);
    
    setShowCopyDialog(true);
  };
  
  // Update a copy line item
  const updateCopyLineItem = (id: string, field: 'qty' | 'unitCost', value: number) => {
    setCopyLineItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };
  
  // Calculate totals for copy dialog
  const copyMaterialsTotal = copyLineItems
    .filter(i => i.type === 'MATERIAL')
    .reduce((sum, i) => sum + (i.qty * i.unitCost), 0);
  const copyEquipmentTotal = copyLineItems
    .filter(i => i.type === 'EQUIPMENT')
    .reduce((sum, i) => sum + (i.qty * i.unitCost), 0);
  const copyTotalHours = fcHoursFromCO + tcExtraHours;
  const copyLaborTotal = copyTotalHours * copyRate;
  const copyGrandTotal = copyLaborTotal + copyMaterialsTotal + copyEquipmentTotal;

  // Copy FC CO to create new TC CO for GC
  const handleCopyToGC = async () => {
    if (!changeOrder || !user?.id) return;
    
    setCopyingToGC(true);
    try {
      // Get the upstream context for TC -> GC
      const { data: contexts } = await supabase
        .from('contract_contexts')
        .select('id, type')
        .eq('project_id', projectId);
      
      const upstreamContext = contexts?.find(c => c.type === 'UPSTREAM');
      if (!upstreamContext) {
        toast.error('No upstream contract context found');
        return;
      }

      // Use the edited values from the dialog
      const tcRate = copyRate;
      const tcHours = copyTotalHours;
      const tcLaborCost = tcHours * tcRate;

      // Create new CO in upstream context linked to this FC CO
      const { data: newCO, error: coError } = await supabase
        .from('change_orders')
        .insert([{
          contract_context_id: upstreamContext.id,
          title: changeOrder.title,
          description: changeOrder.description,
          location: changeOrder.location,
          scope_type: changeOrder.scope_type as 'RE_FRAME' | 'ADDITION' | 'FIXING' | 'RE_INSTALL' | 'ADJUST',
          created_by_user_id: user.id,
          approval_status: 'DRAFT' as const,
          work_status: 'STARTED' as const,
          source_fc_change_order_id: changeOrder.id
        }])
        .select()
        .single();

      if (coError) throw coError;

      // Insert materials and equipment with TC pricing
      if (copyLineItems.length > 0) {
        await supabase.from('co_line_items').insert(
          copyLineItems.map(item => ({
            co_id: newCO.id,
            type: item.type as 'MATERIAL' | 'EQUIPMENT' | 'LABOR',
            description: item.description,
            qty: item.qty,
            unit: item.unit as 'HR' | 'EA' | 'LF' | 'SF' | 'SY' | 'DAY' | 'LS' | null,
            unit_cost: item.unitCost,
            amount: item.qty * item.unitCost,
            created_by_user_id: user.id
          }))
        );
      }

      // Add TC labor line item with TC rate and TC-edited hours
      if (tcHours > 0) {
        await supabase.from('co_line_items').insert([{
          co_id: newCO.id,
          type: 'LABOR' as const,
          description: 'Labor',
          qty: tcHours,
          unit: 'HR' as const,
          unit_cost: tcRate,
          amount: tcLaborCost,
          created_by_user_id: user.id
        }]);
      }

      // Create TC cost layer with all costs
      await supabase.from('change_order_cost_layers').insert({
        change_order_id: newCO.id,
        layer_role: 'TRADE_CONTRACTOR',
        labor_hours: tcHours,
        labor_rate: tcRate,
        labor_cost: tcLaborCost,
        materials_cost: copyMaterialsTotal,
        equipment_cost: copyEquipmentTotal,
        total_cost: copyGrandTotal
      });

      // Submit the new CO to GC for approval
      await supabase.rpc('submit_change_order', { _co_id: newCO.id });

      setShowCopyDialog(false);
      toast.success(`CO-${newCO.reference_number} submitted to GC for approval`);
      onUpdated();
    } catch (error) {
      console.error('Error copying CO to GC:', error);
      toast.error('Failed to copy change order');
    } finally {
      setCopyingToGC(false);
    }
  };

  // Determine if TC can copy this FC CO to GC
  // Allow when FC submitted to TC (NEEDS_APPROVAL) or already approved
  const canCopyToGC = 
    myProjectRole === 'TRADE_CONTRACTOR' && 
    creatorProjectRole === 'FIELD_CREW' &&
    (changeOrder?.approval_status === 'APPROVED' || 
     (changeOrder?.approval_status === 'NEEDS_APPROVAL' && changeOrder?.submitted_to_role === 'TRADE_CONTRACTOR')) &&
    !changeOrder?.source_fc_change_order_id; // Don't copy already-copied COs

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex items-center gap-2">
          <FileText className="h-8 w-8 text-accent" />
          <span className="text-xl font-semibold">Loading...</span>
        </div>
      </div>
    );
  }

  if (!changeOrder) return null;

  const statusConfig = APPROVAL_STATUS_CONFIG[changeOrder.approval_status];
  const StatusIcon = statusConfig.icon;
  const isCreator = user?.id === changeOrder.created_by_user_id;
  const canSubmit = changeOrder.approval_status === 'DRAFT' && isCreator;

  // Only show Approve/Reject if this CO is actually routed to the current user's role.
  // Otherwise RLS will (correctly) block the update.
  const canApprove =
    changeOrder.approval_status === 'NEEDS_APPROVAL' &&
    !isCreator &&
    !!myProjectRole &&
    changeOrder.submitted_to_role === myProjectRole;

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
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/40 font-mono text-xs">
                {formatCoRef(changeOrder.reference_number)}
              </Badge>
              <span className="font-semibold truncate">{changeOrder.title || changeOrder.location}</span>
            </div>
            <p className="text-xs text-primary-foreground/70">
              {formatDate(changeOrder.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {changeOrder.submitted_to_role && changeOrder.approval_status === 'NEEDS_APPROVAL' && (
              <Badge variant="outline" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/30 text-xs">
                <Send className="h-3 w-3 mr-1" />
                To: {ROLE_LABELS[changeOrder.submitted_to_role] || changeOrder.submitted_to_role}
              </Badge>
            )}
            <div className={`px-3 py-1 rounded-full ${statusConfig.className} flex items-center gap-1`}>
              <StatusIcon className={`h-4 w-4`} />
              <span className="text-xs font-medium">{statusConfig.label}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* COR Source Info */}
        {changeOrder.source_cor_ref && (
          <Card className="border-0 shadow-md bg-warning/5 border-l-4 border-l-warning">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-warning">From {changeOrder.source_cor_ref}</p>
                  {changeOrder.requested_by_role && (
                    <p className="text-sm text-muted-foreground">
                      Requested by {ROLE_LABELS[changeOrder.requested_by_role] || changeOrder.requested_by_role}
                      {changeOrder.requested_at && (
                        <span> on {formatDate(changeOrder.requested_at)}</span>
                      )}
                    </p>
                  )}
                  {changeOrder.converted_at && (
                    <p className="text-xs text-muted-foreground">
                      Converted {formatDate(changeOrder.converted_at)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Rejection Notice */}
        {changeOrder.approval_status === 'REJECTED' && changeOrder.rejection_comments && (
          <Card className="border-0 shadow-md bg-destructive/5 border-l-4 border-l-destructive">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Rejected</p>
                  <p className="text-sm text-muted-foreground mt-1">{changeOrder.rejection_comments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approval Chain Indicator */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Approval Chain</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {ROLE_HIERARCHY.map((role, index) => {
                const isCreatorRole = creatorProfile?.role === role;
                const isSubmittedToRole = changeOrder.submitted_to_role === role;
                const isApproved = changeOrder.approval_status === 'APPROVED';
                const isRejected = changeOrder.approval_status === 'REJECTED';
                const isPending = changeOrder.approval_status === 'NEEDS_APPROVAL';
                const isDraft = changeOrder.approval_status === 'DRAFT';
                
                // Determine status for this role in the chain
                let StatusIconComponent = Clock;
                let statusColor = 'text-muted-foreground';
                let bgColor = 'bg-muted';
                
                if (isCreatorRole) {
                  if (isDraft) {
                    StatusIconComponent = FileText;
                    statusColor = 'text-muted-foreground';
                    bgColor = 'bg-muted';
                  } else {
                    StatusIconComponent = Send;
                    statusColor = 'text-primary';
                    bgColor = 'bg-primary/10';
                  }
                } else if (isSubmittedToRole && isPending) {
                  StatusIconComponent = Clock;
                  statusColor = 'text-warning';
                  bgColor = 'bg-warning/10';
                } else if (isApproved && (isSubmittedToRole || (approverProfile?.role === role))) {
                  StatusIconComponent = CheckCircle2;
                  statusColor = 'text-success';
                  bgColor = 'bg-success/10';
                } else if (isRejected && isSubmittedToRole) {
                  StatusIconComponent = XCircle;
                  statusColor = 'text-destructive';
                  bgColor = 'bg-destructive/10';
                }
                
                return (
                  <div key={role} className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center mb-2`}>
                      <StatusIconComponent className={`h-5 w-5 ${statusColor}`} />
                    </div>
                    <span className="text-xs font-medium text-center">{ROLE_LABELS[role]}</span>
                    {index < ROLE_HIERARCHY.length - 1 && (
                      <div className="absolute h-0.5 bg-border w-1/3 top-5" style={{ left: `${(index + 0.5) * 33}%` }} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Cost Layers - Role-based visibility */}
        {costLayers.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {costLayers.map((layer) => (
                <div key={layer.layer_role} className="p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {ROLE_LABELS[layer.layer_role]} Cost
                    </span>
                    <span className="font-mono-construction font-semibold">
                      {formatCurrency(layer.total_cost)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span>Hours: </span>
                      <span className="font-medium text-foreground">{layer.labor_hours}</span>
                    </div>
                    <div>
                      <span>Rate: </span>
                      <span className="font-medium text-foreground">{formatCurrency(layer.labor_rate)}/hr</span>
                    </div>
                    <div>
                      <span>Labor: </span>
                      <span className="font-medium text-foreground">{formatCurrency(layer.labor_cost)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* TC Margin Summary - Private view for TC only */}
        {myProjectRole === 'TRADE_CONTRACTOR' && fcLayer && tcLayer && (
          <Card className="border-0 shadow-md border-l-4 border-l-success">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-success" />
                Margin Summary (Private)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">FC Labor Cost (internal)</span>
                  <span className="font-mono-construction">{formatCurrency(fcLayer.labor_cost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">TC Labor Sell (to GC)</span>
                  <span className="font-mono-construction">{formatCurrency(tcLayer.labor_cost)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border">
                  <span className="text-success">Gross Labor Margin</span>
                  <span className="font-mono-construction text-success">
                    {formatCurrency(calculateMargin()?.margin || 0)} 
                    <span className="text-xs ml-1">
                      ({calculateMargin()?.marginPercent.toFixed(1)}%)
                    </span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Total Amount */}
        <Card className="border-0 shadow-md bg-accent/5">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold font-mono-construction">{formatCurrency(calculateTotal())}</p>
            <p className="text-sm text-muted-foreground">Total Amount</p>
          </CardContent>
        </Card>

        {/* Created By & Timestamps */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-5 w-5 text-accent" />
              Created By
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {creatorProfile && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{creatorProfile.company_name}</p>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[creatorProfile.role] || creatorProfile.role}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">{formatDate(changeOrder.created_at)}</p>
                </div>
              </div>
              {changeOrder.submitted_at && (
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="text-sm font-medium">{formatDate(changeOrder.submitted_at)}</p>
                  </div>
                </div>
              )}
              {changeOrder.approved_at && approverProfile && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <div>
                    <p className="text-xs text-muted-foreground">Approved by {approverProfile.company_name}</p>
                    <p className="text-sm font-medium">{formatDate(changeOrder.approved_at)}</p>
                  </div>
                </div>
              )}
              {changeOrder.rejected_at && (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <div>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                    <p className="text-sm font-medium">{formatDate(changeOrder.rejected_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Work Status (for approved COs) */}
        {changeOrder.approval_status === 'APPROVED' && isCreator && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-5 w-5 text-accent" />
                Work Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {(Object.keys(WORK_STATUS_CONFIG) as WorkStatus[]).map((status) => (
                  <Button
                    key={status}
                    variant={changeOrder.work_status === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleUpdateWorkStatus(status)}
                    disabled={workStatusLoading}
                  >
                    {WORK_STATUS_CONFIG[status].label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Details */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" />
              Location & Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">{changeOrder.location}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Scope Type</p>
              <Badge variant="secondary">{SCOPE_LABELS[changeOrder.scope_type] || changeOrder.scope_type}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Work Status</p>
              <Badge className={WORK_STATUS_CONFIG[changeOrder.work_status].className}>
                {WORK_STATUS_CONFIG[changeOrder.work_status].label}
              </Badge>
            </div>
            {changeOrder.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm">{changeOrder.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Items - Hide labor costs from GC viewing FC COs */}
        {lineItems.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lineItems.map((item) => {
                  // GC should not see FC labor costs
                  const hideCost = 
                    myProjectRole === 'GC' && 
                    creatorProfile?.role === 'FIELD_CREW' && 
                    item.type === 'LABOR';
                  
                  return (
                    <div key={item.id} className="flex justify-between items-start py-2 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium text-sm">{item.description}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {item.type.toLowerCase()}
                          {!hideCost && item.qty && item.unit && ` • ${item.qty} ${item.unit}`}
                        </p>
                      </div>
                      {hideCost ? (
                        <span className="text-xs text-muted-foreground italic">Hidden</span>
                      ) : (
                        <p className="font-mono-construction font-semibold">{formatCurrency(item.amount)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reject Form */}
        {showRejectForm && (
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-2">Rejection Reason</p>
              <Textarea
                value={rejectionComments}
                onChange={(e) => setRejectionComments(e.target.value)}
                placeholder="Explain why this change order is being rejected..."
                className="mb-3"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={actionLoading || !rejectionComments.trim()}
                >
                  Confirm Rejection
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRejectForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>

          {/* Copy to GC - TC viewing FC COs (pending or approved) */}
          {canCopyToGC && (
            <Button 
              variant="accent" 
              onClick={openCopyDialog}
            >
              <Send className="h-4 w-4 mr-2" />
              Copy to GC
            </Button>
          )}

          {canSubmit && (
            <Button onClick={handleSubmit} disabled={actionLoading}>
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          )}

          {canApprove && !showRejectForm && (
            <>
              <Button onClick={handleApprove} disabled={actionLoading}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button variant="destructive" onClick={() => setShowRejectForm(true)} disabled={actionLoading}>
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
        </div>
      </main>

      {/* Copy to GC Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Copy Change Order to GC</DialogTitle>
            <DialogDescription>
              Set your pricing for labor, materials, and equipment before copying to GC.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Labor Section */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Labor</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">FC Hours</Label>
                  <div className="h-10 flex items-center px-3 rounded-md border border-input bg-muted/50 text-sm font-medium">
                    {fcHoursFromCO}
                  </div>
                  <p className="text-xs text-muted-foreground">From Field Crew</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tc-extra-hours" className="text-xs">TC Extra Hours</Label>
                  <Input
                    id="tc-extra-hours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={tcExtraHours || ''}
                    onChange={(e) => setTcExtraHours(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">Add supervision, etc.</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Total Hours</Label>
                  <div className="h-10 flex items-center px-3 rounded-md border border-accent/30 bg-accent/5 text-sm font-semibold">
                    {copyTotalHours}
                  </div>
                  <p className="text-xs text-muted-foreground">FC + TC Extra</p>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="copy-rate" className="text-xs">Rate ($/hr)</Label>
                <Input
                  id="copy-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={copyRate || ''}
                  onChange={(e) => setCopyRate(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="flex justify-between text-sm p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">Labor Total ({copyTotalHours} hrs × ${copyRate}/hr)</span>
                <span className="font-mono-construction font-semibold">
                  {formatCurrency(copyLaborTotal)}
                </span>
              </div>
            </div>

            {/* Materials Section */}
            {copyLineItems.filter(i => i.type === 'MATERIAL').length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Materials</h4>
                <div className="space-y-2">
                  {copyLineItems
                    .filter(i => i.type === 'MATERIAL')
                    .map(item => (
                      <div key={item.id} className="p-3 rounded-lg border border-border space-y-2">
                        <p className="text-sm font-medium truncate">{item.description}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Qty</Label>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={item.qty}
                              onChange={(e) => updateCopyLineItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Unit Cost ($)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitCost}
                              onChange={(e) => updateCopyLineItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Total</Label>
                            <div className="h-8 flex items-center text-sm font-mono-construction">
                              {formatCurrency(item.qty * item.unitCost)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="flex justify-between text-sm p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">Materials Total</span>
                  <span className="font-mono-construction font-semibold">
                    {formatCurrency(copyMaterialsTotal)}
                  </span>
                </div>
              </div>
            )}

            {/* Equipment Section */}
            {copyLineItems.filter(i => i.type === 'EQUIPMENT').length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Equipment</h4>
                <div className="space-y-2">
                  {copyLineItems
                    .filter(i => i.type === 'EQUIPMENT')
                    .map(item => (
                      <div key={item.id} className="p-3 rounded-lg border border-border space-y-2">
                        <p className="text-sm font-medium truncate">{item.description}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Qty/Duration</Label>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={item.qty}
                              onChange={(e) => updateCopyLineItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Unit Cost ($)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitCost}
                              onChange={(e) => updateCopyLineItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Total</Label>
                            <div className="h-8 flex items-center text-sm font-mono-construction">
                              {formatCurrency(item.qty * item.unitCost)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="flex justify-between text-sm p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">Equipment Total</span>
                  <span className="font-mono-construction font-semibold">
                    {formatCurrency(copyEquipmentTotal)}
                  </span>
                </div>
              </div>
            )}

            {/* Grand Total */}
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
              <div className="flex justify-between text-base font-semibold">
                <span>Grand Total</span>
                <span className="font-mono-construction">
                  {formatCurrency(copyGrandTotal)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCopyToGC} disabled={copyingToGC || copyTotalHours <= 0}>
              {copyingToGC ? 'Copying...' : 'Create CO for GC'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useChangeOrderProject } from '@/hooks/useChangeOrderProject';
import { useSOVReadiness } from '@/hooks/useSOVReadiness';
import { useWorkOrderDraft } from '@/hooks/useWorkOrderDraft';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkOrderWizard } from '@/components/work-order-wizard';
import { Plus, FileEdit, Eye, Edit, AlertTriangle, ArrowRight, User, Filter, Clock, CheckCircle2, Wallet, DollarSign, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChangeOrderStatus, CHANGE_ORDER_STATUS_LABELS } from '@/types/changeOrderProject';
import { StatusColumn, CHANGE_ORDER_STATUS_OPTIONS } from '@/components/ui/status-column';
import { HoverActions, HoverAction } from '@/components/ui/hover-actions';
import { enrichWorkOrderTotals } from '@/lib/computeWorkOrderTotal';
import { FieldCaptureList } from '@/components/field-capture';
import type { FieldCapture } from '@/hooks/useFieldCaptures';
import { QuickLogView } from '@/components/quick-log';
import type { WorkOrderWizardData } from '@/types/workOrderWizard';

const STATUS_PRIORITY: Record<ChangeOrderStatus, number> = {
  rejected: 0,
  fc_input: 1,
  tc_pricing: 2,
  ready_for_approval: 3,
  draft: 4,
  approved: 5,
  contracted: 6,
};

interface WorkOrdersTabProps {
  projectId: string;
  projectName: string;
  projectStatus?: string;
}

export function WorkOrdersTab({ projectId, projectName, projectStatus }: WorkOrdersTabProps) {
  const navigate = useNavigate();
  const { currentRole, user, permissions, userOrgRoles } = useAuth();
  const { toast } = useToast();
  const [showUnifiedWizard, setShowUnifiedWizard] = useState(false);
  const [activeTab, setActiveTab] = useState<ChangeOrderStatus | 'ALL'>('ALL');
  const [captureToConvert, setCaptureToConvert] = useState<FieldCapture | null>(null);
  const [mode, setMode] = useState<'orders' | 'quicklog'>('orders');
  const [wizardSubmitting, setWizardSubmitting] = useState(false);

  const {
    changeOrders,
    isLoading,
    createChangeOrder,
    createFCWorkOrder,
    isCreating,
    isCreatingFC,
  } = useChangeOrderProject(projectId);

  const { saveDraft, addLineItem, addMaterial, addEquipment, convertToWorkOrder } = useWorkOrderDraft(projectId);

  const userOrgId = userOrgRoles.length > 0 ? userOrgRoles[0].organization_id : undefined;
  const currentOrgType = userOrgRoles[0]?.organization?.type;
  const isFC = currentOrgType === 'FC';

  // Check if current user is the project creator
  const [isProjectCreator, setIsProjectCreator] = useState(false);
  useEffect(() => {
    if (!projectId || !user) return;
    supabase.from('projects').select('created_by').eq('id', projectId).single().then(({ data }) => {
      setIsProjectCreator(data?.created_by === user.id);
    });
  }, [projectId, user]);

  const sovReadiness = useSOVReadiness(projectId, userOrgId, isProjectCreator);
  const [enrichedTotals, setEnrichedTotals] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    sovReadiness.refetch();
  }, [projectId]);

  // Compute true totals including linked PO materials
  useEffect(() => {
    if (changeOrders.length === 0) return;
    const ordersWithPO = changeOrders.filter((co: any) => co.linked_po_id);
    if (ordersWithPO.length === 0) return;
    
    enrichWorkOrderTotals(
      changeOrders.map((co: any) => ({
        id: co.id,
        labor_total: co.labor_total || 0,
        material_total: co.material_total || 0,
        equipment_total: co.equipment_total || 0,
        final_price: co.final_price || 0,
        linked_po_id: co.linked_po_id || null,
        material_markup_type: co.material_markup_type || null,
        material_markup_percent: co.material_markup_percent || null,
        material_markup_amount: co.material_markup_amount || null,
      }))
    ).then(setEnrichedTotals);
  }, [changeOrders]);

  const canCreate = permissions?.canCreateWorkOrders ?? false;
  const isBlocked = !isFC && !sovReadiness.isReady && !sovReadiness.loading;

  // Bug #4: All entry points route through unified wizard
  const handleConvertCapture = (capture: FieldCapture) => {
    setCaptureToConvert(capture);
    setShowUnifiedWizard(true);
  };

  // Bug #3: Wire onComplete to actually save data
  const handleWizardComplete = async (data: UnifiedWizardData & { project_id: string }) => {
    setWizardSubmitting(true);
    try {
      // 1. Create the draft header
      const draftId = await saveDraft({
        title: data.title || data.selectedCatalogItems.map(i => i.item_name).join(', ') || 'Work Order',
        description: data.description || undefined,
        wo_mode: data.wo_mode!,
        wo_request_type: data.wo_request_type || undefined,
        location_tag: data.location_tags.join(', ') || undefined,
        tc_labor_rate: data.labor_mode === 'hourly' ? data.hourly_rate : null,
        use_fc_hours_at_tc_rate: data.use_fc_hours_at_tc_rate,
        materials_markup_pct: data.materials_markup_pct,
        equipment_markup_pct: data.equipment_markup_pct,
        pricing_mode: 'fixed',
      });

      // We need to create a new hook instance with the draftId to add items
      // Instead, directly insert line items, materials, equipment via supabase
      const orgId = userOrgRoles[0]?.organization?.id;
      if (!orgId || !user) throw new Error('Missing org or user');

      // 2. Add line items from selected catalog items
      const lineItemIds: string[] = [];
      for (const item of data.selectedCatalogItems) {
        const unitRate = data.labor_mode === 'hourly' ? (data.hourly_rate || 0) : 0;
        const { data: inserted, error } = await supabase
          .from('work_order_line_items')
          .insert({
            project_id: projectId,
            change_order_id: draftId,
            org_id: orgId,
            created_by_user_id: user.id,
            catalog_item_id: item.id,
            item_name: item.item_name,
            division: item.division || null,
            category_name: item.category_name || null,
            group_label: item.group_label || null,
            unit: item.unit,
            qty: null,
            hours: data.labor_mode === 'hourly' ? data.hours : null,
            unit_rate: unitRate,
            location_tag: data.location_tags.join(', ') || null,
          } as never)
          .select('id')
          .single();
        if (error) throw error;
        if (inserted) lineItemIds.push((inserted as any).id);
      }

      // 3. Add materials
      for (const mat of data.materials) {
        if (!mat.description) continue;
        const { error } = await supabase
          .from('work_order_materials')
          .insert({
            project_id: projectId,
            change_order_id: draftId,
            org_id: orgId,
            created_by_user_id: user.id,
            description: mat.description,
            supplier: mat.supplier || null,
            quantity: mat.quantity,
            unit: mat.unit,
            unit_cost: mat.unit_cost,
            markup_percent: mat.markup_percent,
            added_by_role: currentOrgType === 'FC' ? 'fc' : 'tc',
          } as never);
        if (error) throw error;
      }

      // 4. Add equipment
      for (const eq of data.equipment) {
        if (!eq.description) continue;
        const { error } = await supabase
          .from('work_order_equipment')
          .insert({
            project_id: projectId,
            change_order_id: draftId,
            org_id: orgId,
            created_by_user_id: user.id,
            description: eq.description,
            duration_note: eq.duration_note || null,
            cost: eq.cost,
            markup_percent: eq.markup_percent,
            added_by_role: currentOrgType === 'FC' ? 'fc' : 'tc',
          } as never);
        if (error) throw error;
      }

      // 5. Convert capture if applicable
      if (captureToConvert) {
        await supabase
          .from('field_captures')
          .update({ status: 'converted', converted_work_order_id: draftId })
          .eq('id', captureToConvert.id);
        setCaptureToConvert(null);
      }

      toast({ title: 'Work order created successfully' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to create work order', description: err.message });
      throw err;
    } finally {
      setWizardSubmitting(false);
    }
  };

  const statusCounts = useMemo(() => ({
    ALL: changeOrders.length,
    draft: changeOrders.filter((co) => co.status === 'draft').length,
    fc_input: changeOrders.filter((co) => co.status === 'fc_input').length,
    tc_pricing: changeOrders.filter((co) => co.status === 'tc_pricing').length,
    ready_for_approval: changeOrders.filter((co) => co.status === 'ready_for_approval').length,
    approved: changeOrders.filter((co) => co.status === 'approved').length,
    rejected: changeOrders.filter((co) => co.status === 'rejected').length,
    contracted: changeOrders.filter((co) => co.status === 'contracted').length,
  }), [changeOrders]);

  const sortedOrders = useMemo(() => {
    const filtered = activeTab === 'ALL'
      ? changeOrders
      : changeOrders.filter((co) => co.status === activeTab);
    return [...filtered].sort((a, b) => {
      const pa = STATUS_PRIORITY[a.status as ChangeOrderStatus] ?? 99;
      const pb = STATUS_PRIORITY[b.status as ChangeOrderStatus] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [changeOrders, activeTab]);

  const fixedOrders = useMemo(() => sortedOrders.filter(co => (co as any).pricing_mode !== 'tm'), [sortedOrders]);
  const tmOrders = useMemo(() => sortedOrders.filter(co => (co as any).pricing_mode === 'tm'), [sortedOrders]);

  const getStatusTabLabel = (status: ChangeOrderStatus | 'ALL') => {
    if (status === 'ALL') return 'All';
    return CHANGE_ORDER_STATUS_LABELS[status];
  };

  const CREATOR_ROLE_LABELS: Record<string, string> = {
    GC_PM: 'General Contractor',
    TC_PM: 'Trade Contractor',
    FC_PM: 'Field Crew',
    FS: 'Field Crew',
  };

  const getCreatorLabel = (co: any) => {
    if (co.created_by === user?.id) return 'You';
    const profile = co.creator_profile;
    if (profile?.first_name || profile?.last_name) {
      return [profile.first_name, profile.last_name].filter(Boolean).join(' ');
    }
    if (co.created_by_role && CREATOR_ROLE_LABELS[co.created_by_role]) {
      return CREATOR_ROLE_LABELS[co.created_by_role];
    }
    return 'Unknown';
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

  const renderWorkOrderCard = (changeOrder: any) => {
    const hoverActions: HoverAction[] = [
      {
        icon: <Eye className="h-4 w-4" />,
        label: 'View',
        onClick: () => navigate(`/change-order/${changeOrder.id}`),
      },
      {
        icon: <Edit className="h-4 w-4" />,
        label: 'Edit',
        onClick: () => navigate(`/change-order/${changeOrder.id}`),
      },
    ];

    const isContracted = changeOrder.status === 'contracted';
    const creatorLabel = getCreatorLabel(changeOrder);
    const isYou = changeOrder.created_by === user?.id;

    return (
      <Card
        key={changeOrder.id}
        className="group cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigate(`/change-order/${changeOrder.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2 gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h3 className="font-semibold line-clamp-1">{changeOrder.title}</h3>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <HoverActions actions={hoverActions} />
              <StatusColumn
                value={changeOrder.status}
                options={CHANGE_ORDER_STATUS_OPTIONS}
                size="sm"
                disabled
              />
            </div>
          </div>

          {/* Progress stage label */}
          <p className="text-xs text-muted-foreground mb-2">
            {CHANGE_ORDER_STATUS_LABELS[changeOrder.status as ChangeOrderStatus]}
          </p>

          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            {changeOrder.work_type && (
              <span className="capitalize">{changeOrder.work_type.replace('_', ' ')}</span>
            )}
            {changeOrder.requires_materials && (
              <span className="bg-muted px-2 py-0.5 rounded text-xs">Materials</span>
            )}
            {changeOrder.requires_equipment && (
              <span className="bg-muted px-2 py-0.5 rounded text-xs">Equipment</span>
            )}
          </div>

          {/* Contract price when contracted */}
          {isContracted && !isFC && (() => {
            const displayTotal = enrichedTotals.get(changeOrder.id) || changeOrder.final_price;
            return displayTotal != null ? (
              <p className="text-sm font-medium mt-2 text-foreground">
                Contract: {formatCurrency(displayTotal)}
              </p>
            ) : null;
          })()}

          {/* Creator */}
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>
              Created by{' '}
              <span className={isYou ? 'font-medium text-foreground' : ''}>{creatorLabel}</span>
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderOrderSection = (title: string, orders: any[]) => {
    if (orders.length === 0) return null;
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders.map(renderWorkOrderCard)}
        </div>
      </div>
    );
  };

  const isProjectNotActive = projectStatus && projectStatus !== 'active';

  return (
    <div className="space-y-4">
      {/* Project not active blocking banner */}
      {isProjectNotActive && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">Project Setup Incomplete</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Project setup incomplete. Waiting for required parties.
          </AlertDescription>
        </Alert>
      )}

      {/* SOV Readiness Alert Banner */}
      {!isProjectNotActive && isBlocked && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">SOV Setup Required</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300 flex items-center justify-between">
            <span>{sovReadiness.message}</span>
            <Button
              variant="outline"
              size="sm"
              className="ml-4 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/50"
              onClick={() => {
                const sovTabButton = document.querySelector('[data-value="sov"]') as HTMLButtonElement;
                if (sovTabButton) sovTabButton.click();
              }}
            >
              Go to SOV Tab
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'In Progress', count: statusCounts.draft, icon: FileEdit, color: 'text-blue-600 bg-blue-100' },
          { label: 'FC Input', count: statusCounts.fc_input, icon: Clock, color: 'text-amber-600 bg-amber-100' },
          { label: 'TC Pricing', count: statusCounts.tc_pricing, icon: DollarSign, color: 'text-purple-600 bg-purple-100' },
          { label: 'Approval', count: statusCounts.ready_for_approval, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-100' },
          { label: 'Contracted', count: statusCounts.contracted, icon: Wallet, color: 'text-green-600 bg-green-100' },
        ].map((item) => (
          <Card key={item.label} className="p-4 relative overflow-hidden">
            <p className="text-2xl font-bold">{item.count}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{item.label}</p>
            <div className={`absolute top-2 right-2 p-1.5 rounded-full ${item.color}`}>
              <item.icon className="h-3.5 w-3.5" />
            </div>
          </Card>
        ))}
      </div>

      {/* Field Captures */}
      {userOrgId && (
        <FieldCaptureList
          projectId={projectId}
          organizationId={userOrgId}
          onConvert={handleConvertCapture}
        />
      )}

      {/* Mode Toggle + Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/50">
            <button
              onClick={() => setMode('orders')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'orders' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Work Orders
            </button>
            <button
              onClick={() => setMode('quicklog')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                mode === 'quicklog' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              Quick Log
            </button>
          </div>
          {mode === 'orders' && (
            <p className="text-sm text-muted-foreground">
              {statusCounts.ALL} work order{statusCounts.ALL !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {mode === 'orders' && (
          <div className="flex items-center gap-3">
            <Select value={activeTab} onValueChange={(v) => setActiveTab(v as ChangeOrderStatus | 'ALL')}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses ({statusCounts.ALL})</SelectItem>
                {(['draft', 'fc_input', 'tc_pricing', 'ready_for_approval', 'approved', 'rejected', 'contracted'] as ChangeOrderStatus[]).map(
                  (status) => (
                    <SelectItem key={status} value={status}>
                      {CHANGE_ORDER_STATUS_LABELS[status]} ({statusCounts[status]})
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            {canCreate && !isProjectNotActive && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        onClick={() => setShowUnifiedWizard(true)}
                        disabled={isBlocked}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Work Order
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {isBlocked && (
                    <TooltipContent>
                      <p>Create SOVs for all contracts first</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </div>

      {/* Quick Log Mode */}
      {mode === 'quicklog' && userOrgId && (
        <QuickLogView projectId={projectId} orgId={userOrgId} />
      )}

      {/* Work Orders Content */}
      {mode === 'orders' && (
        isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : sortedOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileEdit className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {activeTab === 'ALL'
                  ? 'No work orders yet for this project'
                  : `No ${getStatusTabLabel(activeTab).toLowerCase()} work orders`}
              </p>
              {canCreate && activeTab === 'ALL' && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowUnifiedWizard(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create your first work order
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {renderOrderSection('Fixed Price', fixedOrders)}
            {renderOrderSection('Time & Material', tmOrders)}
          </div>
        )
      )}

      {/* Unified WO Wizard — single entry point for all roles */}
      <UnifiedWOWizard
        open={showUnifiedWizard}
        onOpenChange={(open) => {
          setShowUnifiedWizard(open);
          if (!open) setCaptureToConvert(null);
        }}
        projectId={projectId}
        projectName={projectName}
        onComplete={handleWizardComplete}
        isSubmitting={wizardSubmitting}
      />
    </div>
  );
}

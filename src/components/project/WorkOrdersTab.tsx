import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useChangeOrderProject } from '@/hooks/useChangeOrderProject';
import { useSOVReadiness } from '@/hooks/useSOVReadiness';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkOrderWizard } from '@/components/work-order-wizard';
import { FCWorkOrderDialog, FCWorkOrderData } from '@/components/fc-work-order';
import { Plus, FileEdit, Eye, Edit, AlertTriangle, ArrowRight } from 'lucide-react';
import { ChangeOrderStatus } from '@/types/changeOrderProject';
import { ViewSwitcher, ViewMode } from '@/components/ui/view-switcher';
import { StatusColumn, CHANGE_ORDER_STATUS_OPTIONS } from '@/components/ui/status-column';
import { HoverActions, HoverAction } from '@/components/ui/hover-actions';
import { WorkOrdersBoard } from './WorkOrdersBoard';
interface WorkOrdersTabProps {
  projectId: string;
  projectName: string;
}

export function WorkOrdersTab({ projectId, projectName }: WorkOrdersTabProps) {
  const navigate = useNavigate();
  const { currentRole } = useAuth();
  const [showWizard, setShowWizard] = useState(false);
  const [showFCDialog, setShowFCDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<ChangeOrderStatus | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const {
    changeOrders,
    isLoading,
    createChangeOrder,
    createFCWorkOrder,
    isCreating,
    isCreatingFC,
  } = useChangeOrderProject(projectId);

  // Get user's organization ID from auth context
  const { userOrgRoles } = useAuth();
  const userOrgId = userOrgRoles.length > 0 ? userOrgRoles[0].organization_id : undefined;

  // Check SOV readiness - gates work order creation (only checks contracts where user's org is payer)
  const sovReadiness = useSOVReadiness(projectId, userOrgId);

  // Refetch SOV status when tab becomes visible or projectId changes
  useEffect(() => {
    sovReadiness.refetch();
  }, [projectId]); // Refetch when projectId changes or component mounts

  // GC and TC can create work orders with full wizard; FC uses simplified dialog
  const isFC = currentRole === 'FC_PM';
  const canCreate = currentRole === 'GC_PM' || currentRole === 'TC_PM' || isFC;
  
  // Block creation if SOVs aren't ready (except for FC who submit directly)
  const isBlocked = !isFC && !sovReadiness.isReady && !sovReadiness.loading;

  const filteredChangeOrders =
    activeTab === 'ALL'
      ? changeOrders
      : changeOrders.filter((co) => co.status === activeTab);

  const statusCounts = {
    ALL: changeOrders.length,
    draft: changeOrders.filter((co) => co.status === 'draft').length,
    fc_input: changeOrders.filter((co) => co.status === 'fc_input').length,
    tc_pricing: changeOrders.filter((co) => co.status === 'tc_pricing').length,
    ready_for_approval: changeOrders.filter((co) => co.status === 'ready_for_approval').length,
    approved: changeOrders.filter((co) => co.status === 'approved').length,
    rejected: changeOrders.filter((co) => co.status === 'rejected').length,
    contracted: changeOrders.filter((co) => co.status === 'contracted').length,
  };

  const getStatusLabel = (status: ChangeOrderStatus | 'ALL') => {
    const labels: Record<ChangeOrderStatus | 'ALL', string> = {
      ALL: 'All',
      draft: 'Draft',
      fc_input: 'Field Crew Input',
      tc_pricing: 'TC Pricing',
      ready_for_approval: 'Ready for Approval',
      approved: 'Approved',
      rejected: 'Rejected',
      contracted: 'Contracted',
    };
    return labels[status];
  };

  const getStatusColor = (status: ChangeOrderStatus) => {
    const colors: Record<ChangeOrderStatus, string> = {
      draft: 'bg-muted text-muted-foreground',
      fc_input: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      tc_pricing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      ready_for_approval: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      contracted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    };
    return colors[status];
  };

  return (
    <div className="space-y-4">
      {/* SOV Readiness Alert Banner */}
      {isBlocked && (
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
                // Navigate to SOV tab - assuming parent handles tab switching
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

      {/* Header with View Switcher and New Work Order button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Work Orders</h2>
            <ViewSwitcher
              value={viewMode}
              onChange={setViewMode}
              availableModes={['list', 'board']}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {statusCounts.ALL} work order{statusCounts.ALL !== 1 ? 's' : ''} • {statusCounts.draft} draft • {statusCounts.approved} approved • {statusCounts.contracted} contracted
          </p>
        </div>
        {canCreate && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button 
                    onClick={() => isFC ? setShowFCDialog(true) : setShowWizard(true)}
                    disabled={isBlocked}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isFC ? 'Submit Work Order' : 'New Work Order'}
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

      {/* Status Tabs - only show in list view */}
      {viewMode === 'list' && (
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'draft', 'fc_input', 'tc_pricing', 'ready_for_approval', 'approved', 'rejected'] as const).map(
            (status) => (
              <Button
                key={status}
                variant={activeTab === status ? 'default' : 'outline'}
                onClick={() => setActiveTab(status)}
                className="text-sm"
              >
                {getStatusLabel(status)} ({statusCounts[status]})
              </Button>
            )
          )}
        </div>
      )}

      {/* Work Orders Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : viewMode === 'board' ? (
        <WorkOrdersBoard changeOrders={changeOrders} />
      ) : filteredChangeOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileEdit className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {activeTab === 'ALL'
                ? 'No work orders yet for this project'
                : `No ${getStatusLabel(activeTab).toLowerCase()} work orders`}
            </p>
            {canCreate && activeTab === 'ALL' && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowWizard(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create your first work order
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredChangeOrders.map((changeOrder) => {
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

            return (
              <Card
                key={changeOrder.id}
                className="group cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/change-order/${changeOrder.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <h3 className="font-semibold line-clamp-1 flex-1">{changeOrder.title}</h3>
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
                  {changeOrder.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {changeOrder.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {changeOrder.work_type && (
                      <span className="capitalize">{changeOrder.work_type.replace('_', ' ')}</span>
                    )}
                    {changeOrder.requires_materials && (
                      <span className="bg-muted px-2 py-1 rounded text-sm">Materials</span>
                    )}
                    {changeOrder.requires_equipment && (
                      <span className="bg-muted px-2 py-1 rounded text-sm">Equipment</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Work Order Wizard (GC/TC) */}
      {!isFC && (
        <WorkOrderWizard
          open={showWizard}
          onOpenChange={setShowWizard}
          projectId={projectId}
          projectName={projectName}
          onComplete={async (data) => {
            await createChangeOrder(data);
          }}
          isSubmitting={isCreating}
        />
      )}

      {/* FC Work Order Dialog (simplified) */}
      {isFC && (
        <FCWorkOrderDialog
          open={showFCDialog}
          onOpenChange={setShowFCDialog}
          projectId={projectId}
          projectName={projectName}
          onSubmit={async (data: FCWorkOrderData) => {
            await createFCWorkOrder({
              project_id: projectId,
              ...data,
            });
          }}
          isSubmitting={isCreatingFC}
        />
      )}
    </div>
  );
}

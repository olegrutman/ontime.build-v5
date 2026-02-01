import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useChangeOrderProject } from '@/hooks/useChangeOrderProject';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChangeOrderWizardDialog } from '@/components/change-order-wizard';
import { Plus, FileEdit, Eye, Edit } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<ChangeOrderStatus | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const {
    changeOrders,
    isLoading,
    createChangeOrder,
    isCreating,
  } = useChangeOrderProject(projectId);

  // GC and TC can create work orders; FC can also submit work orders for TC approval
  const canCreate = currentRole === 'GC_PM' || currentRole === 'TC_PM' || currentRole === 'FC_PM';

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
      {/* Header with View Switcher and New Work Order button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Work Orders</h2>
          <ViewSwitcher
            value={viewMode}
            onChange={setViewMode}
            availableModes={['list', 'board']}
          />
        </div>
        {canCreate && (
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Work Order
          </Button>
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
                size="sm"
                onClick={() => setActiveTab(status)}
                className="text-xs"
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
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {changeOrder.work_type && (
                      <span className="capitalize">{changeOrder.work_type.replace('_', ' ')}</span>
                    )}
                    {changeOrder.requires_materials && (
                      <span className="bg-muted px-2 py-0.5 rounded">Materials</span>
                    )}
                    {changeOrder.requires_equipment && (
                      <span className="bg-muted px-2 py-0.5 rounded">Equipment</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Change Order Wizard */}
      <ChangeOrderWizardDialog
        open={showWizard}
        onOpenChange={setShowWizard}
        projectId={projectId}
        projectName={projectName}
        onComplete={async (data) => {
          await createChangeOrder(data);
        }}
        isSubmitting={isCreating}
      />
    </div>
  );
}

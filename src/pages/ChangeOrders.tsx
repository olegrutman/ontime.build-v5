import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useChangeOrderProject } from '@/hooks/useChangeOrderProject';
import { useWorkOrderDraft } from '@/hooks/useWorkOrderDraft';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkOrderWizard } from '@/components/work-order-wizard';
import { Plus, FileEdit, Building2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { ChangeOrderStatus } from '@/types/changeOrderProject';
import type { UnifiedWizardData } from '@/types/unifiedWizard';

interface Project {
  id: string;
  name: string;
}

const ChangeOrders = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, userOrgRoles, permissions } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardSubmitting, setWizardSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<ChangeOrderStatus | 'ALL'>('ALL');

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const {
    changeOrders,
    isLoading,
  } = useChangeOrderProject(selectedProjectId || undefined);

  const { saveDraft } = useWorkOrderDraft(selectedProjectId || '');

  const currentOrgType = userOrgRoles[0]?.organization?.type;
  const canCreate = permissions?.canCreateWorkOrders ?? false;
  const validStatuses: ChangeOrderStatus[] = [
    'draft', 'fc_input', 'tc_pricing', 'ready_for_approval', 'approved', 'rejected', 'contracted'
  ];

  // Handle URL params for project selection, status filter, and auto-open wizard
  useEffect(() => {
    const projectParam = searchParams.get('project');
    const statusParam = searchParams.get('status');
    const newParam = searchParams.get('new');
    
    if (statusParam && validStatuses.includes(statusParam as ChangeOrderStatus)) {
      setActiveTab(statusParam as ChangeOrderStatus);
    }
    
    if (projectParam && projects.length > 0) {
      const matchingProject = projects.find(p => p.id === projectParam);
      if (matchingProject) {
        setSelectedProjectId(projectParam);
        if (newParam === 'true') {
          setShowWizard(true);
          searchParams.delete('new');
          setSearchParams(searchParams, { replace: true });
        }
      }
    }
  }, [searchParams, projects, setSearchParams]);

  // Fetch projects user has access to
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;
      const currentOrg = userOrgRoles[0]?.organization;
      if (!currentOrg?.id) return;

      const { data: ownedProjects } = await supabase
        .from('projects')
        .select('id, name')
        .eq('organization_id', currentOrg.id);

      const { data: teamMemberships } = await supabase
        .from('project_team')
        .select('project_id')
        .eq('org_id', currentOrg.id!);

      const teamProjectIds = (teamMemberships || [])
        .map((t) => t.project_id)
        .filter((id): id is string => id !== null);

      let assignedProjects: Project[] = [];
      if (teamProjectIds.length > 0) {
        const { data } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', teamProjectIds);
        assignedProjects = (data || []) as Project[];
      }

      const allProjectsMap = new Map<string, Project>();
      (ownedProjects || []).forEach((p) => allProjectsMap.set(p.id, p as Project));
      assignedProjects.forEach((p) => allProjectsMap.set(p.id, p));
      
      const allProjects = Array.from(allProjectsMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      
      setProjects(allProjects);
      if (allProjects.length === 1) {
        setSelectedProjectId(allProjects[0].id);
      }
    };

    fetchProjects();
  }, [user, userOrgRoles]);

  // Unified wizard onComplete handler (matches WorkOrdersTab pattern)
  const handleWizardComplete = async (data: UnifiedWizardData & { project_id: string }) => {
    setWizardSubmitting(true);
    try {
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

      const orgId = userOrgRoles[0]?.organization?.id;
      if (!orgId || !user) throw new Error('Missing org or user');

      for (const item of data.selectedCatalogItems) {
        const unitRate = data.labor_mode === 'hourly' ? (data.hourly_rate || 0) : 0;
        const { error } = await supabase
          .from('work_order_line_items')
          .insert({
            project_id: data.project_id,
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
          } as never);
        if (error) throw error;
      }

      for (const mat of data.materials) {
        if (!mat.description) continue;
        const { error } = await supabase
          .from('work_order_materials')
          .insert({
            project_id: data.project_id,
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

      for (const eq of data.equipment) {
        if (!eq.description) continue;
        const { error } = await supabase
          .from('work_order_equipment')
          .insert({
            project_id: data.project_id,
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

      toast({ title: 'Work order created successfully' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to create work order', description: err.message });
      throw err;
    } finally {
      setWizardSubmitting(false);
    }
  };

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
      tc_pricing: 'Trade Contractor Pricing',
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
      fc_input: 'bg-blue-100 text-blue-800',
      tc_pricing: 'bg-yellow-100 text-yellow-800',
      ready_for_approval: 'bg-purple-100 text-purple-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      contracted: 'bg-emerald-100 text-emerald-800',
    };
    return colors[status];
  };

  if (!user) {
    return (
      <AppLayout title="Work Orders">
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Please sign in to view work orders.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (userOrgRoles.length === 0) {
    return (
      <AppLayout title="Work Orders">
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Please join an organization first.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Work Orders"
      subtitle="Manage change work orders"
      showNewButton={canCreate && !!selectedProjectId}
      onNewClick={() => setShowWizard(true)}
      newButtonLabel="New Work Order"
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Project Selector */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Project:</span>
              </div>
              <Select
                value={selectedProjectId || ''}
                onValueChange={(value) => setSelectedProjectId(value)}
              >
                <SelectTrigger className="w-full sm:w-[300px]">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedProjectId && projects.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Select a project to view and create work orders
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedProjectId && (
          <>
            {/* Status Tabs */}
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex gap-2 pb-1">
                {(['ALL', 'draft', 'fc_input', 'tc_pricing', 'ready_for_approval', 'approved', 'rejected'] as const).map(
                  (status) => (
                    <Button
                      key={status}
                      variant={activeTab === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveTab(status)}
                      className="text-xs whitespace-nowrap shrink-0"
                    >
                      {getStatusLabel(status)} ({statusCounts[status]})
                    </Button>
                  )
                )}
              </div>
            </div>

            {/* Change Orders List */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
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
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredChangeOrders.map((changeOrder) => (
                  <Card
                    key={changeOrder.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/change-order/${changeOrder.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold line-clamp-1">{changeOrder.title}</h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                            changeOrder.status
                          )}`}
                        >
                          {getStatusLabel(changeOrder.status)}
                        </span>
                      </div>
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
                ))}
              </div>
            )}
          </>
        )}

        {!selectedProjectId && projects.length === 0 && !isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                No projects found. Create a project first to add work orders.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/create-project')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Unified Work Order Wizard */}
        {selectedProject && (
          <UnifiedWOWizard
            open={showWizard}
            onOpenChange={setShowWizard}
            projectId={selectedProject.id}
            projectName={selectedProject.name}
            onComplete={handleWizardComplete}
            isSubmitting={wizardSubmitting}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default ChangeOrders;

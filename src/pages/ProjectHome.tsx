import { useEffect, useState } from 'react';
import { useProjectRealtime } from '@/hooks/useProjectRealtime';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import { supabase } from '@/integrations/supabase/client';
import { useDemo } from '@/contexts/DemoContext';
import { getDemoProjectById } from '@/data/demoData';
import { DemoProjectOverview, DemoWorkOrdersTab, DemoPurchaseOrdersTab, DemoInvoicesTab, DemoSOVTab, DemoRFIsTab } from '@/components/demo';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { useDefaultSidebarOpen } from '@/hooks/use-sidebar-default';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { 
  ProjectTopBar,
  MobileProjectHeader,
  WorkOrdersTab,
  PurchaseOrdersTab,
  AttentionBanner,
  SupplierEstimatesSection,
  SupplierFinancialsSummaryCard,
  SupplierPOSummaryCard,
  FinancialSignalBar,
  FinancialHealthCharts,
  OperationalSummary,
  SupplierEstimateVsOrdersCard,
  SupplierOperationalSummary,
} from '@/components/project';
import { ProjectEstimatesReview } from '@/components/project/ProjectEstimatesReview';
import { ProjectReadinessCard } from '@/components/project/ProjectReadinessCard';
import { MaterialResponsibilityCard } from '@/components/project/MaterialResponsibilityCard';
import { InvoicesTab } from '@/components/invoices';
import { ContractSOVEditor } from '@/components/sov';
import { RFIsTab } from '@/components/rfi';
import { useToast } from '@/hooks/use-toast';
import { useProjectFinancials } from '@/hooks/useProjectFinancials';
import { useProjectReadiness } from '@/hooks/useProjectReadiness';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  project_type: string;
  build_type: string;
  address: { street?: string; city?: string; state?: string; zip?: string } | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  structures: any[];
  parties: any[];
  mobilization_enabled: boolean;
  retainage_percent: number;
  created_at: string;
  organization_id: string;
}


export default function ProjectHome() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, userOrgRoles } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabResetKey, setTabResetKey] = useState(0);

  const { isDemoMode, demoRole } = useDemo();
  const isInDemoMode = isDemoMode && id?.startsWith('demo-');

  // Detect if current org is a supplier
  const currentOrg = userOrgRoles[0]?.organization;
  const isSupplier = isInDemoMode ? demoRole === 'SUPPLIER' : currentOrg?.type === 'SUPPLIER';
  const isFC = isInDemoMode ? demoRole === 'FC' : currentOrg?.type === 'FC';
  const supplierOrgId = isSupplier ? (isInDemoMode ? 'demo-org-supplier' : currentOrg?.id) : null;

  // Realtime subscriptions – refreshKey bumps when any project entity changes
  const realtimeKey = useProjectRealtime(id);
  const financials = useProjectFinancials(id || '', isSupplier, supplierOrgId);
  const readiness = useProjectReadiness(id);

  // Get active tab from URL or default to 'overview'
  const activeTab = searchParams.get('tab') || 'overview';

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
    setTabResetKey(prev => prev + 1);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!project) return;
    // Prevent manual activation — project activates automatically via readiness engine
    if (newStatus === 'active') {
      toast({ title: 'Projects activate automatically when setup is complete', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', project.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update project status', variant: 'destructive' });
      return;
    }

    setProject({ ...project, status: newStatus });
    toast({ title: 'Project status updated' });
  };

  useEffect(() => {
    if (isInDemoMode && id) {
      const demoProject = getDemoProjectById(id);
      if (demoProject) {
        setProject(demoProject as unknown as Project);
        setLoading(false);
      } else {
        navigate('/demo');
      }
      return;
    }

    const fetchProject = async () => {
      if (!id) return;

      const { data: proj, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching project:', error);
        navigate('/dashboard');
        return;
      }

      setProject(proj as Project);
      setLoading(false);
    };

    fetchProject();
  }, [id, navigate, isInDemoMode]);

  const defaultOpen = useDefaultSidebarOpen();

  if (loading) {
    return (
      <SidebarProvider defaultOpen={defaultOpen}>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1">
            <div className="sticky top-0 z-40 border-b bg-card backdrop-blur px-4 py-3">
              <Skeleton className="h-8 w-64" />
            </div>
            <main className="flex-1 overflow-auto container mx-auto px-4 py-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
              <Skeleton className="h-96 w-full" />
            </main>
        </SidebarInset>
        <BottomNav />
      </div>
    </SidebarProvider>
    );
  }

  if (!project) {
    return (
      <SidebarProvider defaultOpen={defaultOpen}>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1">
            <div className="flex items-center justify-center min-h-[50vh]">
              <p className="text-muted-foreground">Project not found</p>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  const projectStatus = project.status || 'draft';

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
         <SidebarInset className="flex flex-col flex-1 bg-background">
          {/* Compact mobile project header */}
          <MobileProjectHeader
            projectName={project.name}
            projectId={id!}
            projectStatus={projectStatus}
            onStatusChange={handleStatusChange}
          />

          {/* Sticky Project Top Bar - desktop only */}
          <div className="hidden lg:block">
          <ProjectTopBar
            projectName={project.name}
            projectId={id!}
            projectStatus={projectStatus}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onStatusChange={handleStatusChange}
            isSupplier={isSupplier}
          />
          </div>

          {/* Scrollable content */}
          <main className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 pb-20 space-y-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {isInDemoMode ? (
                    <DemoProjectOverview onNavigate={handleTabChange} />
                  ) : isSupplier && supplierOrgId ? (
                    <>
                      <AttentionBanner
                        projectId={id!}
                        onNavigate={handleTabChange}
                        isSupplier={isSupplier}
                        supplierOrgId={supplierOrgId}
                      />
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <SupplierEstimateVsOrdersCard projectId={id!} supplierOrgId={supplierOrgId} />
                        <SupplierFinancialsSummaryCard projectId={id!} supplierOrgId={supplierOrgId} />
                        <SupplierPOSummaryCard projectId={id!} supplierOrgId={supplierOrgId} />
                      </div>
                      <SupplierOperationalSummary
                        projectId={id!}
                        supplierOrgId={supplierOrgId}
                        onNavigate={handleTabChange}
                      />
                    </>
                  ) : (
                    <>
                      {(project.status === 'setup' || project.status === 'draft') && !isFC && (
                        <ProjectReadinessCard readiness={readiness} />
                      )}
                      <AttentionBanner
                        projectId={id!}
                        onNavigate={handleTabChange}
                        isSupplier={isSupplier}
                        supplierOrgId={supplierOrgId}
                      />
                      <MaterialResponsibilityCard projectId={id!} />
                      <FinancialSignalBar financials={financials} projectId={id!} />
                      <FinancialHealthCharts financials={financials} />
                      <OperationalSummary
                        projectId={id!}
                        projectType={project.project_type}
                        financials={financials}
                        onNavigate={handleTabChange}
                      />
                    </>
                  )}
                </div>
              )}

              {/* SOV Tab - hide for suppliers */}
              {activeTab === 'sov' && !isSupplier && (
                isInDemoMode ? <DemoSOVTab /> : <ContractSOVEditor projectId={id!} />
              )}

              {/* Work Orders Tab - hide for suppliers */}
              {activeTab === 'work-orders' && !isSupplier && (
                isInDemoMode
                  ? <DemoWorkOrdersTab projectId={id!} projectName={project.name} />
                  : <WorkOrdersTab projectId={id!} projectName={project.name} projectStatus={projectStatus} />
              )}

              {/* RFIs Tab */}
              {activeTab === 'rfis' && (
                isInDemoMode ? <DemoRFIsTab /> : <RFIsTab projectId={id!} />
              )}

              {/* Estimates Tab */}
              {activeTab === 'estimates' && isSupplier && supplierOrgId && (
                <SupplierEstimatesSection projectId={id!} projectName={project?.name} supplierOrgId={supplierOrgId} />
              )}
              {activeTab === 'estimates' && !isSupplier && (
                <ProjectEstimatesReview projectId={id!} />
              )}

              {/* Invoices Tab */}
              {activeTab === 'invoices' && (
                isInDemoMode
                  ? <DemoInvoicesTab projectId={id!} />
                  : <InvoicesTab 
                      key={`invoices-${tabResetKey}-${realtimeKey}`}
                      projectId={id!} 
                      retainagePercent={project.retainage_percent || 0}
                      projectStatus={projectStatus}
                    />
              )}

              {/* Purchase Orders Tab */}
              {activeTab === 'purchase-orders' && (
                isInDemoMode
                  ? <DemoPurchaseOrdersTab projectId={id!} />
                  : <PurchaseOrdersTab 
                      key={`po-${tabResetKey}-${realtimeKey}`}
                      projectId={id!} 
                      projectName={project?.name}
                      projectStatus={projectStatus}
                      projectAddress={
                        project?.address 
                          ? `${project.address.street || ''}, ${project.address.city || ''}, ${project.address.state || ''} ${project.address.zip || ''}`.replace(/^,\s*|,\s*$/g, '').trim()
                          : ''
                      }
                    />
              )}

            </div>
          </main>
        </SidebarInset>
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}

import { useEffect, useState } from 'react';
import { ChevronDown, ClipboardList } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
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
  SupplierPOSummaryCard,
  OperationalSummary,
  SupplierOperationalSummary,
  SupplierMaterialsControlCard,
  SupplierMaterialsChart,
  BudgetTracking,
} from '@/components/project';
import { ContractHeroCard } from '@/components/project/ContractHeroCard';
import { BillingCashCard } from '@/components/project/BillingCashCard';
import { UrgentTasksCard } from '@/components/project/UrgentTasksCard';
import { TeamMembersCard } from '@/components/project/TeamMembersCard';
import { ProjectEstimatesReview } from '@/components/project/ProjectEstimatesReview';
import { ProjectReadinessCard } from '@/components/project/ProjectReadinessCard';

import { InvoicesTab } from '@/components/invoices';
import { ReturnsTab } from '@/components/returns';
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

function CollapsibleOperations({ projectId, projectType, financials, onNavigate }: {
  projectId: string;
  projectType: string;
  financials: import('@/hooks/useProjectFinancials').ProjectFinancials;
  onNavigate: (tab: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const woCount = financials.recentWorkOrders.length;
  const invCount = financials.recentInvoices.length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="bg-white dark:bg-card rounded-2xl shadow-sm overflow-hidden">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-accent/30 transition-colors">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              Activity & Operations
            </span>
            <span className="text-[10px] text-muted-foreground">
              {woCount} WOs · {invCount} Invoices
            </span>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4">
            <OperationalSummary
              projectId={projectId}
              projectType={projectType}
              financials={financials}
              onNavigate={onNavigate}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
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
  const [materialResponsibility, setMaterialResponsibility] = useState<string | null>(null);

  const { isDemoMode, demoRole } = useDemo();
  const isInDemoMode = isDemoMode && id?.startsWith('demo-');

  const currentOrg = userOrgRoles[0]?.organization;
  const isRealSupplier = isInDemoMode ? demoRole === 'SUPPLIER' : currentOrg?.type === 'SUPPLIER';
  const isFC = isInDemoMode ? demoRole === 'FC' : currentOrg?.type === 'FC';
  const [isDesignatedSupplier, setIsDesignatedSupplier] = useState(false);
  const isSupplier = isRealSupplier || isDesignatedSupplier;
  const supplierOrgId = isRealSupplier ? (isInDemoMode ? 'demo-org-supplier' : currentOrg?.id) : null;

  const realtimeKey = useProjectRealtime(id);
  const financials = useProjectFinancials(id || '', isSupplier, supplierOrgId);
  const readiness = useProjectReadiness(id);

  const activeTab = searchParams.get('tab') || 'overview';

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
    setTabResetKey(prev => prev + 1);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!project) return;
    if (newStatus === 'active') {
      toast({ title: 'Projects activate automatically when setup is complete', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('projects').update({ status: newStatus }).eq('id', project.id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to update project status', variant: 'destructive' });
      return;
    }
    setProject({ ...project, status: newStatus });
    toast({ title: 'Project status updated' });
  };

  useEffect(() => {
    if (!id || !user || isRealSupplier || isInDemoMode) return;
    const checkDesignated = async () => {
      const { data } = await supabase.from('project_designated_suppliers').select('id').eq('project_id', id).eq('user_id', user.id).eq('status', 'active').maybeSingle();
      setIsDesignatedSupplier(!!data);
    };
    checkDesignated();
  }, [id, user, isRealSupplier, isInDemoMode]);

  useEffect(() => {
    if (isInDemoMode && id) {
      const demoProject = getDemoProjectById(id);
      if (demoProject) { setProject(demoProject as unknown as Project); setLoading(false); }
      else navigate('/demo');
      return;
    }
    const fetchProject = async () => {
      if (!id) return;
      const { data: proj, error } = await supabase.from('projects').select('*').eq('id', id).single();
      if (error) { console.error('Error fetching project:', error); navigate('/dashboard'); return; }
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
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
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
          <MobileProjectHeader
            projectName={project.name}
            projectId={id!}
            projectStatus={projectStatus}
            onStatusChange={handleStatusChange}
          />
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

          <main className="flex-1 overflow-auto">
            <div className={cn(
              "max-w-7xl mx-auto w-full pb-20",
              activeTab === 'overview' ? 'p-4 sm:p-6' : 'p-4 sm:p-6 space-y-6'
            )}>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <>
                  {isInDemoMode ? (
                    <DemoProjectOverview onNavigate={handleTabChange} />
                  ) : isSupplier && supplierOrgId ? (
                    <div className="space-y-4">
                      <AttentionBanner projectId={id!} onNavigate={handleTabChange} isSupplier={isSupplier} supplierOrgId={supplierOrgId} />
                      <SupplierMaterialsControlCard projectId={id!} supplierOrgId={supplierOrgId} />
                      <SupplierMaterialsChart projectId={id!} supplierOrgId={supplierOrgId} />
                      <SupplierPOSummaryCard projectId={id!} supplierOrgId={supplierOrgId} />
                      <SupplierOperationalSummary projectId={id!} supplierOrgId={supplierOrgId} onNavigate={handleTabChange} />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Setup cards */}
                      {(project.status === 'setup' || project.status === 'draft') && !isFC && (
                        <ProjectReadinessCard readiness={readiness} />
                      )}
                      

                      {/* Mobile attention banner */}
                      <div className="lg:hidden">
                        <AttentionBanner projectId={id!} onNavigate={handleTabChange} isSupplier={isSupplier} supplierOrgId={supplierOrgId} />
                      </div>

                      {/* Main grid: left content + right sidebar */}
                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
                        {/* LEFT COLUMN */}
                        <div className="space-y-4">
                          <ContractHeroCard financials={financials} projectId={id!} />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <BillingCashCard financials={financials} />
                            <BudgetTracking financials={financials} projectId={id!} onNavigate={handleTabChange} />
                          </div>
                          <CollapsibleOperations
                            projectId={id!}
                            projectType={project.project_type}
                            financials={financials}
                            onNavigate={handleTabChange}
                          />
                        </div>

                        {/* RIGHT SIDEBAR — desktop only */}
                        <div className="hidden lg:flex flex-col gap-4">
                          <UrgentTasksCard projectId={id!} onNavigate={handleTabChange} isSupplier={isSupplier} supplierOrgId={supplierOrgId} />
                          <TeamMembersCard projectId={id!} onResponsibilityChange={setMaterialResponsibility} />
                        </div>
                      </div>

                      {/* Mobile: team + urgent below */}
                      <div className="lg:hidden space-y-4">
                        <TeamMembersCard projectId={id!} onResponsibilityChange={setMaterialResponsibility} />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Other tabs — unchanged */}
              {activeTab === 'sov' && !isSupplier && (
                isInDemoMode ? <DemoSOVTab /> : <ContractSOVEditor projectId={id!} />
              )}
              {activeTab === 'work-orders' && !isSupplier && (
                isInDemoMode
                  ? <DemoWorkOrdersTab projectId={id!} projectName={project.name} />
                  : <WorkOrdersTab projectId={id!} projectName={project.name} projectStatus={projectStatus} />
              )}
              {activeTab === 'rfis' && (
                isInDemoMode ? <DemoRFIsTab /> : <RFIsTab projectId={id!} />
              )}
              {activeTab === 'estimates' && isSupplier && supplierOrgId && (
                <SupplierEstimatesSection projectId={id!} projectName={project?.name} supplierOrgId={supplierOrgId} />
              )}
              {activeTab === 'estimates' && !isSupplier && (
                materialResponsibility && (
                  (currentOrg?.type === 'GC' && materialResponsibility === 'TC') ||
                  (currentOrg?.type !== 'GC' && materialResponsibility === 'GC')
                ) ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                    Materials are managed by the {materialResponsibility === 'GC' ? 'General Contractor' : 'Trade Contractor'} on this project.
                  </div>
                ) : (
                  <ProjectEstimatesReview projectId={id!} />
                )
              )}
              {activeTab === 'invoices' && (
                isInDemoMode
                  ? <DemoInvoicesTab projectId={id!} />
                  : <InvoicesTab key={`invoices-${tabResetKey}-${realtimeKey}`} projectId={id!} retainagePercent={project.retainage_percent || 0} projectStatus={projectStatus} />
              )}
              {activeTab === 'purchase-orders' && (
                isInDemoMode
                  ? <DemoPurchaseOrdersTab projectId={id!} />
                  : <PurchaseOrdersTab key={`po-${tabResetKey}-${realtimeKey}`} projectId={id!} projectName={project?.name} projectStatus={projectStatus}
                      projectAddress={project?.address ? `${project.address.street || ''}, ${project.address.city || ''}, ${project.address.state || ''} ${project.address.zip || ''}`.replace(/^,\s*|,\s*$/g, '').trim() : ''} />
              )}
              {activeTab === 'returns' && <ReturnsTab projectId={id!} />}
            </div>
          </main>
        </SidebarInset>
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}

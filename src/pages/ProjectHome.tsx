import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { 
  ProjectTeamSection, 
  ProjectScopeSection, 
  ProjectContractsSection, 
  ProjectFinancialsSectionNew,
  ProjectTopBar,
  WorkOrdersTab,
  PurchaseOrdersTab,
  MetricStrip,
  AttentionBanner,
  SupplierContractsSection,
  SupplierFinancialsSummaryCard,
  SupplierEstimatesSection
} from '@/components/project';
import { InvoicesTab } from '@/components/invoices';
import { ContractSOVEditor } from '@/components/sov';
import { useToast } from '@/hooks/use-toast';

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

  // Detect if current org is a supplier
  const currentOrg = userOrgRoles[0]?.organization;
  const isSupplier = currentOrg?.type === 'SUPPLIER';
  const supplierOrgId = isSupplier ? currentOrg?.id : null;

  // Get active tab from URL or default to 'overview'
  const activeTab = searchParams.get('tab') || 'overview';

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
    setTabResetKey(prev => prev + 1);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!project) return;

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
  }, [id, navigate]);

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1">
            <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur px-4 py-3">
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
        </div>
      </SidebarProvider>
    );
  }

  if (!project) {
    return (
      <SidebarProvider>
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          {/* Sticky Project Top Bar */}
          <ProjectTopBar
            projectName={project.name}
            projectStatus={projectStatus}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onStatusChange={handleStatusChange}
            isSupplier={isSupplier}
          />

          {/* Scrollable content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 py-6 space-y-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
                  {/* Zone A: Action & Summary */}
                  <div className="space-y-6">
                    <AttentionBanner
                      projectId={id!}
                      onNavigate={handleTabChange}
                      isSupplier={isSupplier}
                      supplierOrgId={supplierOrgId}
                    />

                    <MetricStrip
                      projectId={id!}
                      onNavigate={handleTabChange}
                      isSupplier={isSupplier}
                      supplierOrgId={supplierOrgId}
                    />

                    {/* Financial Summary */}
                    {isSupplier && supplierOrgId ? (
                      <SupplierFinancialsSummaryCard projectId={id!} supplierOrgId={supplierOrgId} />
                    ) : (
                      <ProjectFinancialsSectionNew projectId={id!} />
                    )}
                  </div>

                  {/* Zone B: Context */}
                  <div className="space-y-4">
                    <ProjectTeamSection projectId={id!} />
                    {isSupplier && supplierOrgId ? (
                      <SupplierContractsSection projectId={id!} supplierOrgId={supplierOrgId} />
                    ) : (
                      <ProjectContractsSection projectId={id!} />
                    )}
                    <ProjectScopeSection projectId={id!} projectType={project.project_type} />
                  </div>
                </div>
              )}

              {/* SOV Tab - hide for suppliers */}
              {activeTab === 'sov' && !isSupplier && (
                <ContractSOVEditor projectId={id!} />
              )}

              {/* Work Orders Tab - hide for suppliers */}
              {activeTab === 'work-orders' && !isSupplier && (
                <WorkOrdersTab projectId={id!} projectName={project.name} />
              )}

              {/* Estimates Tab - suppliers only */}
              {activeTab === 'estimates' && isSupplier && supplierOrgId && (
                <SupplierEstimatesSection projectId={id!} supplierOrgId={supplierOrgId} />
              )}

              {/* Invoices Tab */}
              {activeTab === 'invoices' && (
                <InvoicesTab 
                  key={tabResetKey}
                  projectId={id!} 
                  retainagePercent={project.retainage_percent || 0} 
                />
              )}

              {/* Purchase Orders Tab */}
              {activeTab === 'purchase-orders' && (
                <PurchaseOrdersTab 
                  key={tabResetKey}
                  projectId={id!} 
                  projectName={project?.name}
                  projectAddress={
                    project?.address 
                      ? `${project.address.street || ''}, ${project.address.city || ''}, ${project.address.state || ''} ${project.address.zip || ''}`.replace(/^,\s*|,\s*$/g, '').trim()
                      : ''
                  }
                />
              )}

              {/* Documents Tab (placeholder) - hide for suppliers */}
              {activeTab === 'documents' && !isSupplier && (
                <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/20">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Documents</h3>
                  <p className="text-sm text-muted-foreground">
                    Document management coming soon.
                  </p>
                </div>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

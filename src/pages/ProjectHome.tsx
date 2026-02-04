import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  AlertTriangle,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { 
  ProjectTeamSection, 
  ProjectScopeSection, 
  ProjectContractsSection, 
  ProjectActivitySection,
  ProjectFinancialsSectionNew,
  ProjectTopBar,
  WorkOrderSummaryCard,
  WorkOrdersTab,
  InvoiceSummaryCard,
  PurchaseOrdersTab
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

interface WorkItemSummary {
  sov_count: number;
  change_count: number;
  tm_count: number;
  total_amount: number;
  pending_change_orders: number;
}

export default function ProjectHome() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<WorkItemSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Get active tab from URL or default to 'overview'
  const activeTab = searchParams.get('tab') || 'overview';

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
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

      // Fetch work item summary
      const { data: workItems } = await supabase
        .from('work_items')
        .select('item_type, amount, state')
        .eq('project_id', id);

      if (workItems) {
        const sovItems = workItems.filter((w) => w.item_type === 'SOV_ITEM');
        const changeItems = workItems.filter((w) => w.item_type === 'CHANGE_WORK');
        const tmItems = workItems.filter((w) => w.item_type === 'TM_WORK');
        const pendingCOs = changeItems.filter((w) => w.state === 'PRICED').length;
        const total = workItems.reduce((sum, w) => sum + (w.amount || 0), 0);

        setSummary({
          sov_count: sovItems.length,
          change_count: changeItems.length,
          tm_count: tmItems.length,
          total_amount: total,
          pending_change_orders: pendingCOs,
        });
      }

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
          />

          {/* Scrollable content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 py-6 space-y-6">
              {/* Alert Banner */}
              {summary && summary.pending_change_orders > 0 && activeTab === 'overview' && (
                <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    {summary.pending_change_orders} Work Order{summary.pending_change_orders > 1 ? 's' : ''} Need{summary.pending_change_orders === 1 ? 's' : ''} Approval
                  </AlertDescription>
                </Alert>
              )}

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  {/* Section 1: Needs Attention - 3 columns on desktop */}
                  <section>
                    <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
                      Needs Attention
                    </h2>
                    <div className="grid gap-4 lg:grid-cols-3">
                      <WorkOrderSummaryCard projectId={id!} />
                      <InvoiceSummaryCard projectId={id!} />
                      <ProjectActivitySection projectId={id!} />
                    </div>
                  </section>

                  {/* Section 2: Financial Snapshot */}
                  <section>
                    <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
                      Financial Snapshot
                    </h2>
                    <ProjectFinancialsSectionNew projectId={id!} />
                  </section>

                  {/* Section 3: Project Details - 2 columns */}
                  <section>
                    <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
                      Project Details
                    </h2>
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="space-y-6">
                        <ProjectTeamSection projectId={id!} />
                        <ProjectContractsSection projectId={id!} />
                      </div>
                      <ProjectScopeSection projectId={id!} projectType={project.project_type} />
                    </div>
                  </section>
                </div>
              )}

              {/* SOV Tab */}
              {activeTab === 'sov' && (
                <ContractSOVEditor projectId={id!} />
              )}

              {/* Work Orders Tab */}
              {activeTab === 'work-orders' && (
                <WorkOrdersTab projectId={id!} projectName={project.name} />
              )}

              {/* Invoices Tab */}
              {activeTab === 'invoices' && (
                <InvoicesTab 
                  projectId={id!} 
                  retainagePercent={project.retainage_percent || 0} 
                />
              )}

              {/* Purchase Orders Tab */}
              {activeTab === 'purchase-orders' && (
                <PurchaseOrdersTab 
                  projectId={id!} 
                  projectName={project?.name}
                  projectAddress={
                    project?.address 
                      ? `${project.address.street || ''}, ${project.address.city || ''}, ${project.address.state || ''} ${project.address.zip || ''}`.replace(/^,\s*|,\s*$/g, '').trim()
                      : ''
                  }
                />
              )}

              {/* Documents Tab (placeholder) */}
              {activeTab === 'documents' && (
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

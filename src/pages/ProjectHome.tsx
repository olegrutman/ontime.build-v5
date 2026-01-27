import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { InvoicesTab } from '@/components/invoices';
import { useProjectRole } from '@/hooks/useProjectRole';
import {
  ProjectOverviewToolbar,
  ContractTiles,
  WorkOrderSummary,
  InvoiceProgress,
  NeedsAttentionList,
} from '@/components/project-overview';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  project_type: string;
  build_type: string;
  retainage_percent: number;
}

export default function ProjectHome() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  const roleData = useProjectRole(id || '');

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;

      const { data: proj, error } = await supabase
        .from('projects')
        .select('id, name, description, status, project_type, build_type, retainage_percent')
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
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-col min-h-screen">
            <div className="sticky top-0 z-40 border-b bg-background p-4">
              <Skeleton className="h-8 w-64" />
            </div>
            <div className="container mx-auto px-4 py-6 space-y-6">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!project) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center min-h-[50vh]">
            <p className="text-muted-foreground">Project not found</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          {/* Sticky Toolbar */}
          <ProjectOverviewToolbar
            projectName={project.name}
            status={project.status || 'draft'}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Main Content */}
          <main className="flex-1 container mx-auto px-4 py-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Section 1: Contract Tiles */}
                <section>
                  <h2 className="text-sm font-medium text-muted-foreground mb-3">Contracts</h2>
                  <ContractTiles roleData={roleData} />
                </section>

                {/* Section 2: Work Orders */}
                <section>
                  <WorkOrderSummary roleData={roleData} />
                </section>

                {/* Section 3: Invoice Progress */}
                <section>
                  <InvoiceProgress roleData={roleData} />
                </section>

                {/* Section 4: Needs Attention */}
                <section>
                  <NeedsAttentionList projectId={id!} roleData={roleData} />
                </section>
              </div>
            )}

            {activeTab === 'work-orders' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Work Orders</h2>
                  <Button asChild>
                    <Link to={`/change-orders?project=${id}&new=true`}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Work Order
                    </Link>
                  </Button>
                </div>
                
                {/* Redirect to work orders page for full functionality */}
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    View and manage all work orders for this project.
                  </p>
                  <Button asChild variant="outline">
                    <Link to={`/change-orders?project=${id}`}>
                      View All Work Orders
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'invoices' && (
              <InvoicesTab 
                projectId={id!} 
                retainagePercent={project.retainage_percent || 0} 
              />
            )}

            {activeTab === 'schedule' && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-muted-foreground">
                  Schedule management coming soon.
                </p>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-muted-foreground">
                  Document management coming soon.
                </p>
              </div>
            )}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

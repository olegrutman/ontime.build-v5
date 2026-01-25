import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FileText, 
  ClipboardList, 
  Package, 
  Users, 
  MapPin,
  AlertTriangle,
  LayoutDashboard,
  Receipt
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ProjectTeamSection, 
  ProjectScopeSection, 
  ProjectContractsSection, 
  ProjectActivitySection,
  ProjectFinancialsSectionNew 
} from '@/components/project';
import { AppLayout } from '@/components/layout';
import { InvoicesTab } from '@/components/invoices';
import { ContractSOVEditor } from '@/components/sov';

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

const STATUS_COLORS: Record<string, string> = {
  'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  'active': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'on_hold': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'completed': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

const STATUS_LABELS: Record<string, string> = {
  'draft': 'Draft',
  'active': 'Active',
  'on_hold': 'On Hold',
  'completed': 'Completed',
};

export default function ProjectHome() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<WorkItemSummary | null>(null);
  const [loading, setLoading] = useState(true);

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

  const formatAddress = () => {
    if (!project) return '';
    const addr = project.address;
    if (addr?.street) {
      return `${addr.street}, ${addr.city || project.city}, ${addr.state || project.state} ${addr.zip || project.zip}`;
    }
    if (project.city) {
      return `${project.city}, ${project.state} ${project.zip}`;
    }
    return '';
  };

  if (loading) {
    return (
      <AppLayout title="Loading...">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-12 w-full" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout title="Project Not Found">
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </AppLayout>
    );
  }

  const projectStatus = project.status || 'draft';

  return (
    <AppLayout title={project.name}>
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Project Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge className={STATUS_COLORS[projectStatus]}>
                {STATUS_LABELS[projectStatus] || projectStatus}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {formatAddress() && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {formatAddress()}
                </span>
              )}
              <Badge variant="outline">{project.project_type}</Badge>
              <Badge variant="outline">{project.build_type}</Badge>
            </div>
          </div>
        </div>

        {/* Alert Banner */}
        {summary && summary.pending_change_orders > 0 && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              {summary.pending_change_orders} Change Order{summary.pending_change_orders > 1 ? 's' : ''} Need{summary.pending_change_orders === 1 ? 's' : ''} Approval
            </AlertDescription>
          </Alert>
        )}

        {/* Navigation Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="sov" className="gap-2">
              <FileText className="h-4 w-4" />
              SOV
            </TabsTrigger>
            <TabsTrigger value="cors" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              CORs
            </TabsTrigger>
            <TabsTrigger value="cos" className="gap-2">
              <Package className="h-4 w-4" />
              COs
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2">
              <Receipt className="h-4 w-4" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Command Center */}
          <TabsContent value="overview" className="space-y-6">
            {/* Financial Summary Cards - Using real contract data */}
            <ProjectFinancialsSectionNew projectId={id!} />

            {/* Two Column Layout */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column */}
              <div className="space-y-6">
                <ProjectTeamSection projectId={id!} />
                <ProjectContractsSection projectId={id!} />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <ProjectScopeSection projectId={id!} projectType={project.project_type} />
                <ProjectActivitySection projectId={id!} />
              </div>
            </div>
          </TabsContent>

          {/* SOV Tab - Contract-based SOV Editor */}
          <TabsContent value="sov">
            <ContractSOVEditor projectId={id!} />
          </TabsContent>

          {/* CORs Tab - Change Order Requests (new mini-project system) */}
          <TabsContent value="cors">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Change Order Requests</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create and manage change orders as mini-projects with full workflow.
              </p>
              <div className="flex gap-3">
                <Button asChild variant="outline">
                  <Link to={`/change-orders?project=${id}`}>View All</Link>
                </Button>
                <Button asChild>
                  <Link to={`/change-orders?project=${id}&new=true`}>
                    New Change Order
                  </Link>
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* COs Tab */}
          <TabsContent value="cos">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Change Orders</h3>
              <p className="text-sm text-muted-foreground mb-4">
                View approved change orders for this project.
              </p>
              <Button asChild>
                <Link to={`/change-orders?project=${id}&status=approved`}>View Change Orders</Link>
              </Button>
            </div>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <InvoicesTab 
              projectId={id!} 
              retainagePercent={project.retainage_percent || 0} 
            />
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team">
            <ProjectTeamSection projectId={id!} />
          </TabsContent>
        </Tabs>
      </main>
    </AppLayout>
  );
}

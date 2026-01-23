import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  ClipboardList, 
  Package, 
  Users, 
  Building2,
  MapPin,
  Calendar,
  Plus,
  GitBranch
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChangeWork } from '@/hooks/useChangeWork';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateChangeWorkDialog } from '@/components/change-work/CreateChangeWorkDialog';
import { ProjectRelationships } from '@/components/project/ProjectRelationships';
import { format } from 'date-fns';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  project_type: string;
  build_type: string;
  address: { street?: string; city?: string; state?: string; zip?: string } | null;
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
}

export default function ProjectHome() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, currentRole } = useAuth();
  const { createChangeWork, isCreating } = useChangeWork();
  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<WorkItemSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateCODialog, setShowCreateCODialog] = useState(false);

  const canCreateCO = currentRole === 'GC_PM' || currentRole === 'TC_PM';

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
        .select('item_type, amount')
        .eq('project_id', id);

      if (workItems) {
        const sovItems = workItems.filter((w) => w.item_type === 'SOV_ITEM');
        const changeItems = workItems.filter((w) => w.item_type === 'CHANGE_WORK');
        const tmItems = workItems.filter((w) => w.item_type === 'TM_WORK');
        const total = workItems.reduce((sum, w) => sum + (w.amount || 0), 0);

        setSummary({
          sov_count: sovItems.length,
          change_count: changeItems.length,
          tm_count: tmItems.length,
          total_amount: total,
        });
      }

      setLoading(false);
    };

    fetchProject();
  }, [id, navigate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 h-14 flex items-center">
            <Skeleton className="h-8 w-32" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold">{project.name}</h1>
            <p className="text-xs text-muted-foreground">
              {project.project_type} • {project.build_type}
            </p>
          </div>
          <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="ml-auto">
            {project.status}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Project Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary?.sov_count || 0}</p>
                  <p className="text-sm text-muted-foreground">SOV Items</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/20">
                  <ClipboardList className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary?.change_count || 0}</p>
                  <p className="text-sm text-muted-foreground">Change Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20">
                  <Package className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary?.tm_count || 0}</p>
                  <p className="text-sm text-muted-foreground">T&M Work</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-muted-foreground">Contract Value</p>
                <p className="text-2xl font-bold">{formatCurrency(summary?.total_amount || 0)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sov" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sov" className="gap-2">
              <FileText className="h-4 w-4" />
              SOV
            </TabsTrigger>
            <TabsTrigger value="change" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Change Work
            </TabsTrigger>
            <TabsTrigger value="materials" className="gap-2">
              <Package className="h-4 w-4" />
              Materials
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="relationships" className="gap-2">
              <GitBranch className="h-4 w-4" />
              Relationships
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sov">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Schedule of Values</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  View and manage SOV line items for this project.
                </p>
                <Button asChild>
                  <Link to={`/sov?project=${id}`}>View SOV Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="change">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Change Work</CardTitle>
                {canCreateCO && (
                  <Button size="sm" onClick={() => setShowCreateCODialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Change Order
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Create and manage change orders and T&M work for this project.
                </p>
                <Button asChild>
                  <Link to={`/change-orders?project=${id}`}>View Change Orders</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="materials">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage material orders and purchase orders for this project.
                </p>
                <div className="flex gap-2">
                  <Button asChild variant="outline">
                    <Link to={`/orders?project=${id}`}>Material Orders</Link>
                  </Button>
                  <Button asChild>
                    <Link to={`/purchase-orders?project=${id}`}>Purchase Orders</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project Team</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Structures */}
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Structures
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(project.structures || []).map((s: any) => (
                        <Badge key={s.id} variant="secondary">
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Address */}
                  {project.address && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Address
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {project.address.street}<br />
                        {project.address.city}, {project.address.state} {project.address.zip}
                      </p>
                    </div>
                  )}

                  {/* Parties */}
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Invited Parties
                    </p>
                    {(project.parties || []).length > 0 ? (
                      <div className="space-y-2">
                        {project.parties.map((p: any) => (
                          <div key={p.org_id} className="flex items-center gap-2">
                            <Badge variant="outline">{p.org_code}</Badge>
                            <span className="text-sm">{p.org_name}</span>
                            <Badge variant="secondary">{p.role}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No parties invited</p>
                    )}
                  </div>

                  {/* Created */}
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Created
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(project.created_at), 'PPP')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="relationships">
            <ProjectRelationships projectId={id!} />
          </TabsContent>
        </Tabs>

        <CreateChangeWorkDialog
          open={showCreateCODialog}
          onOpenChange={setShowCreateCODialog}
          onCreate={createChangeWork}
          isCreating={isCreating}
          projectId={id}
          projectName={project.name}
        />
      </main>
    </div>
  );
}

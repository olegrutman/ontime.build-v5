import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useChangeOrderProject } from '@/hooks/useChangeOrderProject';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, FileEdit, Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { ChangeOrderStatus } from '@/types/changeOrderProject';

interface Project { id: string; name: string; }

const ChangeOrders = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userOrgRoles } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ChangeOrderStatus | 'ALL'>('ALL');

  const { changeOrders, isLoading } = useChangeOrderProject(selectedProjectId || undefined);
  const validStatuses: ChangeOrderStatus[] = ['draft', 'fc_input', 'tc_pricing', 'ready_for_approval', 'approved', 'rejected', 'contracted'];

  useEffect(() => {
    const projectParam = searchParams.get('project');
    const statusParam = searchParams.get('status');
    if (statusParam && validStatuses.includes(statusParam as ChangeOrderStatus)) setActiveTab(statusParam as ChangeOrderStatus);
    if (projectParam && projects.length > 0) {
      const matchingProject = projects.find(p => p.id === projectParam);
      if (matchingProject) setSelectedProjectId(projectParam);
    }
  }, [searchParams, projects]);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;
      const currentOrg = userOrgRoles[0]?.organization;
      if (!currentOrg?.id) return;
      const { data: ownedProjects } = await supabase.from('projects').select('id, name').eq('organization_id', currentOrg.id);
      const { data: teamMemberships } = await supabase.from('project_team').select('project_id').eq('org_id', currentOrg.id!);
      const teamProjectIds = (teamMemberships || []).map((t) => t.project_id).filter((id): id is string => id !== null);
      let assignedProjects: Project[] = [];
      if (teamProjectIds.length > 0) {
        const { data } = await supabase.from('projects').select('id, name').in('id', teamProjectIds);
        assignedProjects = (data || []) as Project[];
      }
      const allProjectsMap = new Map<string, Project>();
      (ownedProjects || []).forEach((p) => allProjectsMap.set(p.id, p as Project));
      assignedProjects.forEach((p) => allProjectsMap.set(p.id, p));
      const allProjects = Array.from(allProjectsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      setProjects(allProjects);
      if (allProjects.length === 1) setSelectedProjectId(allProjects[0].id);
    };
    fetchProjects();
  }, [user, userOrgRoles]);

  const filteredChangeOrders = activeTab === 'ALL' ? changeOrders : changeOrders.filter((co) => co.status === activeTab);

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
      ALL: 'All', draft: 'Draft', fc_input: 'Field Crew Input', tc_pricing: 'Trade Contractor Pricing',
      ready_for_approval: 'Ready for Approval', approved: 'Approved', rejected: 'Rejected', contracted: 'Contracted',
    };
    return labels[status];
  };

  const getStatusColor = (status: ChangeOrderStatus) => {
    const colors: Record<ChangeOrderStatus, string> = {
      draft: 'bg-muted text-muted-foreground', fc_input: 'bg-blue-100 text-blue-800',
      tc_pricing: 'bg-yellow-100 text-yellow-800', ready_for_approval: 'bg-purple-100 text-purple-800',
      approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', contracted: 'bg-emerald-100 text-emerald-800',
    };
    return colors[status];
  };

  if (!user) {
    return <AppLayout title="Work Orders"><div className="p-6"><Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Please sign in to view work orders.</p></CardContent></Card></div></AppLayout>;
  }

  if (userOrgRoles.length === 0) {
    return <AppLayout title="Work Orders"><div className="p-6"><Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Please join an organization first.</p></CardContent></Card></div></AppLayout>;
  }

  return (
    <AppLayout title="Work Orders" subtitle="Manage change work orders">
      <div className="space-y-4 sm:space-y-6">
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-muted-foreground" /><span className="font-medium">Project:</span></div>
              <Select value={selectedProjectId || ''} onValueChange={(value) => setSelectedProjectId(value)}>
                <SelectTrigger className="w-full sm:w-[300px]"><SelectValue placeholder="Select a project" /></SelectTrigger>
                <SelectContent>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {selectedProjectId && (
          <>
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex gap-2 pb-1">
                {(['ALL', 'draft', 'fc_input', 'tc_pricing', 'ready_for_approval', 'approved', 'rejected'] as const).map((status) => (
                  <Button key={status} variant={activeTab === status ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab(status)} className="text-xs whitespace-nowrap shrink-0">
                    {getStatusLabel(status)} ({statusCounts[status]})
                  </Button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
            ) : filteredChangeOrders.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <FileEdit className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{activeTab === 'ALL' ? 'No work orders yet for this project' : `No ${getStatusLabel(activeTab).toLowerCase()} work orders`}</p>
              </CardContent></Card>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredChangeOrders.map((changeOrder) => (
                  <Card key={changeOrder.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/change-order/${changeOrder.id}`)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold line-clamp-1">{changeOrder.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(changeOrder.status)}`}>{getStatusLabel(changeOrder.status)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {!selectedProjectId && projects.length === 0 && !isLoading && (
          <Card><CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No projects found. Create a project first to add work orders.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/create-project')}><Plus className="w-4 h-4 mr-2" />Create Project</Button>
          </CardContent></Card>
        )}
      </div>
    </AppLayout>
  );
};

export default ChangeOrders;

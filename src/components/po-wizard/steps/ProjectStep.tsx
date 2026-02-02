import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Check, Building, FileText, SkipForward } from 'lucide-react';
import { POWizardData } from '@/types/poWizard';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  status: string;
}

interface WorkItem {
  id: string;
  title: string;
  item_type: string;
}

interface ProjectStepProps {
  data: POWizardData;
  onChange: (updates: Partial<POWizardData>) => void;
  initialProjectId?: string | null;
  initialProjectName?: string | null;
}

export function ProjectStep({ data, onChange, initialProjectId, initialProjectName }: ProjectStepProps) {
  const { userOrgRoles } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showWorkItems, setShowWorkItems] = useState(!!data.project_id || !!initialProjectId);

  const currentOrgId = userOrgRoles[0]?.organization_id;

  useEffect(() => {
    fetchProjects();
  }, [currentOrgId]);

  useEffect(() => {
    if (data.project_id) {
      fetchWorkItems(data.project_id);
      setShowWorkItems(true);
    }
  }, [data.project_id]);

  // Set initial project if provided
  useEffect(() => {
    if (initialProjectId && !data.project_id) {
      onChange({
        project_id: initialProjectId,
        project_name: initialProjectName || undefined,
      });
    }
  }, [initialProjectId]);

  const fetchProjects = async () => {
    setLoading(true);
    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, name, status')
      .in('status', ['ACTIVE', 'IN_PROGRESS'])
      .order('updated_at', { ascending: false });
    setProjects(projectsData || []);
    setLoading(false);
  };

  const fetchWorkItems = async (projectId: string) => {
    const { data: workItemsData } = await supabase
      .from('work_items')
      .select('id, title, item_type')
      .eq('project_id', projectId)
      .in('item_type', ['WORK_ORDER', 'CHANGE_WORK'])
      .order('created_at', { ascending: false });
    setWorkItems(workItemsData || []);
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectProject = (project: Project) => {
    onChange({
      project_id: project.id,
      project_name: project.name,
      work_item_id: null,
      work_item_title: undefined,
    });
  };

  const handleSelectWorkItem = (workItem: WorkItem | null) => {
    onChange({
      work_item_id: workItem?.id || null,
      work_item_title: workItem?.title,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">What's this for?</h2>
        <p className="text-muted-foreground text-sm">
          Link to a project and optionally a work order
        </p>
      </div>

      {/* Project Selection */}
      {!showWorkItems ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Select Project
          </p>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active projects</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredProjects.map((project) => (
                <Card
                  key={project.id}
                  className={cn(
                    'p-4 cursor-pointer transition-all touch-manipulation',
                    'hover:border-primary/50 active:scale-[0.99]',
                    data.project_id === project.id && 'border-primary bg-primary/5'
                  )}
                  onClick={() => handleSelectProject(project)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                    {data.project_id === project.id && (
                      <Check className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Selected Project Display */}
          <Card className="p-4 border-primary bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Project</p>
                  <p className="font-medium">{data.project_name}</p>
                </div>
              </div>
              <button
                className="text-xs text-primary underline"
                onClick={() => {
                  setShowWorkItems(false);
                  onChange({ project_id: null, project_name: undefined, work_item_id: null, work_item_title: undefined });
                }}
              >
                Change
              </button>
            </div>
          </Card>

          {/* Work Item Selection */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Link to Work Order (Optional)
            </p>

            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {/* Skip Option */}
              <Card
                className={cn(
                  'p-4 cursor-pointer transition-all touch-manipulation',
                  'hover:border-primary/50 active:scale-[0.99]',
                  !data.work_item_id && 'border-primary bg-primary/5'
                )}
                onClick={() => handleSelectWorkItem(null)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SkipForward className="h-5 w-5 text-muted-foreground" />
                    <p className="font-medium">General Project Order</p>
                  </div>
                  {!data.work_item_id && (
                    <Check className="h-5 w-5 text-primary shrink-0" />
                  )}
                </div>
              </Card>

              {workItems.map((item) => (
                <Card
                  key={item.id}
                  className={cn(
                    'p-4 cursor-pointer transition-all touch-manipulation',
                    'hover:border-primary/50 active:scale-[0.99]',
                    data.work_item_id === item.id && 'border-primary bg-primary/5'
                  )}
                  onClick={() => handleSelectWorkItem(item)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {item.item_type === 'WORK_ORDER' ? 'Work Order' : 'Change Work'}
                        </Badge>
                      </div>
                    </div>
                    {data.work_item_id === item.id && (
                      <Check className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

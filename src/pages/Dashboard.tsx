import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AppHeader from '@/components/AppHeader';
import PendingApprovals from '@/components/dashboard/PendingApprovals';
import { 
  Building2,
  Plus, 
  FolderOpen, 
  DollarSign,
  Building,
  MapPin,
  FileText,
  ClipboardList,
  Archive,
  ArchiveRestore,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

interface ProjectWithBadges {
  id: string;
  name: string;
  address: string;
  created_at: string;
  pendingCOCount: number;
  pendingInvoiceCount: number;
  last_activity_at: string;
  is_archived: boolean;
  activityScore: number;
  creator_user_id: string;
  hasPendingActivity: boolean;
}

interface DashboardStats {
  totalProjects: number;
  pendingInvoices: number;
}

type AppRole = 'FIELD_CREW' | 'TRADE_CONTRACTOR' | 'GC';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();
  const [projects, setProjects] = useState<ProjectWithBadges[]>([]);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<AppRole | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    pendingInvoices: 0,
  });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    // Fetch profile with company info
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, companies(name)')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      setCurrentUserRole(profile.role as AppRole);
      const company = profile.companies as { name: string } | null;
      if (company?.name) {
        setCompanyName(company.name);
      }
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('last_activity_at', { ascending: false });

      if (error) throw error;

      // Fetch pending counts for each project and calculate activity score
      const projectsWithBadges: ProjectWithBadges[] = await Promise.all(
        (data || []).map(async (project) => {
          let pendingInvoiceCount = 0;
          let pendingCOCount = 0;

          if (user) {
            const { data: counts, error: countsError } = await supabase.rpc(
              'get_project_pending_counts',
              {
                _project_id: project.id,
              }
            );

            if (!countsError && counts && counts.length > 0) {
              pendingCOCount = Number(counts[0].pending_cos) || 0;
              pendingInvoiceCount = Number(counts[0].pending_invoices) || 0;
            }
          }

          // Calculate activity score for sorting
          let activityScore = 0;
          if (pendingInvoiceCount > 0) activityScore += 500 + pendingInvoiceCount;
          if (pendingCOCount > 0) activityScore += 400 + pendingCOCount;

          // Add recency bonus (last 7 days gets points)
          const lastActivity = new Date(project.last_activity_at || project.created_at);
          const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceActivity < 7) activityScore += Math.floor((7 - daysSinceActivity) * 10);

          // Track if project has pending activity (blocks archiving)
          const hasPendingActivity = pendingInvoiceCount > 0 || pendingCOCount > 0;

          return {
            id: project.id,
            name: project.name,
            address: project.address,
            created_at: project.created_at,
            pendingCOCount,
            pendingInvoiceCount,
            last_activity_at: project.last_activity_at || project.created_at,
            is_archived: project.is_archived || false,
            activityScore,
            creator_user_id: project.creator_user_id,
            hasPendingActivity,
          };
        })
      );

      // Sort by activity score (descending), then by last_activity_at
      projectsWithBadges.sort((a, b) => {
        if (b.activityScore !== a.activityScore) {
          return b.activityScore - a.activityScore;
        }
        return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
      });

      setProjects(projectsWithBadges);
      
      // Only count non-archived projects for stats
      const activeProjects = projectsWithBadges.filter(p => !p.is_archived);
      
      setStats({
        totalProjects: activeProjects.length,
        pendingInvoices: activeProjects.reduce((sum, p) => sum + p.pendingInvoiceCount, 0),
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleArchiveProject = async (e: React.MouseEvent, project: ProjectWithBadges) => {
    e.stopPropagation();
    
    if (!user) return;
    
    if (project.creator_user_id !== user.id) {
      toast.error('Only the project creator can archive/unarchive');
      return;
    }

    if (!project.is_archived) {
      if (project.hasPendingActivity) {
        let reason = 'Cannot archive: Project has ';
        const reasons: string[] = [];
        if (project.pendingCOCount > 0) reasons.push('pending change orders');
        if (project.pendingInvoiceCount > 0) reasons.push('pending invoices');
        reason += reasons.join(', ');
        toast.error(reason);
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_archived: !project.is_archived })
        .eq('id', project.id);
      
      if (error) throw error;
      
      setProjects(prev => prev.map(p => 
        p.id === project.id ? { ...p, is_archived: !p.is_archived } : p
      ));
      
      toast.success(project.is_archived ? 'Project restored' : 'Project archived');
    } catch (error) {
      console.error('Error toggling archive:', error);
      toast.error('Failed to update project');
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex items-center gap-2">
          <Building2 className="h-8 w-8 text-accent" />
          <span className="text-xl font-semibold">Loading...</span>
        </div>
      </div>
    );
  }

  const displayedProjects = showArchived 
    ? projects.filter(p => p.is_archived) 
    : projects.filter(p => !p.is_archived);

  const archivedCount = projects.filter(p => p.is_archived).length;

  return (
    <div className="min-h-screen bg-background pb-safe-bottom">
      <AppHeader title="Ontime.build" />

      <main className="container px-4 py-6">
        <div className="mb-6 animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground mb-1">Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Building className="h-4 w-4" />
            {companyName || user?.email}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-md animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <FolderOpen className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground font-mono-construction">
                    {stats.totalProjects}
                  </p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md animate-slide-up" style={{ animationDelay: '0.12s' }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Archive className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground font-mono-construction">
                    {archivedCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Archived</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground font-mono-construction">
                    {stats.pendingInvoices}
                  </p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals Section */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <PendingApprovals />
        </div>

        <div className="flex gap-3 mb-6 animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <Button 
            variant="accent" 
            size="lg" 
            className="flex-1 shadow-lg"
            onClick={() => navigate('/projects/new')}
          >
            <Plus className="h-5 w-5" />
            Create New Project
          </Button>
          <Button 
            variant={showArchived ? "default" : "outline"}
            size="lg" 
            className="shrink-0"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? (
              <>
                <Eye className="h-5 w-5" />
                <span className="hidden sm:inline">Show Active</span>
                <span className="sm:hidden">Active</span>
              </>
            ) : (
              <>
                <Archive className="h-5 w-5" />
                <span className="hidden sm:inline">Show Archived</span>
                <span className="sm:hidden">
                  {archivedCount > 0 ? `(${archivedCount})` : 'Archived'}
                </span>
              </>
            )}
          </Button>
        </div>

        <div className="animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {showArchived ? 'Archived Projects' : 'Your Projects'}
          </h2>
          
          {displayedProjects.length === 0 ? (
            <Card className="border-dashed border-2 bg-transparent">
              <CardContent className="py-12 text-center">
                {showArchived ? (
                  <>
                    <Archive className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">No archived projects</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Projects with no activity can be archived
                    </p>
                  </>
                ) : (
                  <>
                    <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">No projects yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first project to get started
                    </p>
                    <Button variant="accent" onClick={() => navigate('/projects/new')}>
                      <Plus className="h-4 w-4" />
                      Create Project
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {displayedProjects.map((project) => (
                <Card 
                  key={project.id}
                  className={`border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer active:scale-[0.99] ${
                    project.is_archived ? 'bg-muted/50' : ''
                  }`}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-semibold truncate ${project.is_archived ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {project.name}
                          </h3>
                          {project.is_archived && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              <Archive className="h-3 w-3 mr-1" />
                              Archived
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 truncate mb-2">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {project.address}
                        </p>
                        {!project.is_archived && (
                          <div className="flex flex-wrap gap-1">
                            {project.pendingCOCount > 0 && (
                              <Badge variant="destructive" className="text-xs flex items-center gap-1">
                                <ClipboardList className="h-3 w-3" />
                                CO Approval {project.pendingCOCount > 1 ? `(${project.pendingCOCount})` : ''}
                              </Badge>
                            )}
                            {project.pendingInvoiceCount > 0 && (
                              <Badge variant="warning" className="text-xs flex items-center gap-1 bg-warning/10 text-warning border-warning/20">
                                <FileText className="h-3 w-3" />
                                Invoice Approval {project.pendingInvoiceCount > 1 ? `(${project.pendingInvoiceCount})` : ''}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        {project.creator_user_id === user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => handleArchiveProject(e, project)}
                            disabled={project.hasPendingActivity && !project.is_archived}
                          >
                            {project.is_archived ? (
                              <ArchiveRestore className="h-4 w-4" />
                            ) : (
                              <Archive className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
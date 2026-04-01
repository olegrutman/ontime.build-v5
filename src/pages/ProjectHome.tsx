import { useEffect, useState, useMemo } from 'react';
import { useProjectProfile } from '@/hooks/useProjectProfile';
import { useScopeSelections } from '@/hooks/useScopeWizard';
import { ChevronDown, ClipboardList } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useProjectRealtime } from '@/hooks/useProjectRealtime';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useDemo } from '@/contexts/DemoContext';
import { getDemoProjectById } from '@/data/demoData';
import { DemoProjectOverview, DemoPurchaseOrdersTab, DemoInvoicesTab, DemoSOVTab, DemoRFIsTab } from '@/components/demo';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

import { ProjectShell } from '@/components/app-shell/ProjectShell';
import { 
  PurchaseOrdersTab,
  AttentionBanner,
  SupplierEstimatesSection,
  OperationalSummary,
  SupplierMaterialsOverview,
  BudgetTracking,
  MaterialsBudgetStatusCard,
  
  MaterialMarkupEditor,
  CriticalScheduleCard,
} from '@/components/project';

import { ProjectSetupFlow } from '@/components/project-setup/ProjectSetupFlow';
import { ProjectIconRail } from '@/components/project/ProjectIconRail';
import { ProjectBottomNav } from '@/components/project/ProjectBottomNav';

import { BillingCashCard } from '@/components/project/BillingCashCard';
import { UrgentTasksCard } from '@/components/project/UrgentTasksCard';

import { ProjectEstimatesReview } from '@/components/project/ProjectEstimatesReview';
import { ProjectReadinessCard } from '@/components/project/ProjectReadinessCard';
import { PendingInviteCard } from '@/components/project/PendingInviteCard';
import { ProjectOverviewV2 } from '@/components/project/ProjectOverviewV2';

import { InvoicesTab } from '@/components/invoices';
import { ReturnsTab } from '@/components/returns';
import { ContractSOVEditor } from '@/components/sov';
import { RFIsTab } from '@/components/rfi';
import { ScheduleTab } from '@/components/schedule/ScheduleTab';
import { DailyLogPanel } from '@/components/daily-log/DailyLogPanel';
import { useToast } from '@/hooks/use-toast';
import { FeatureGate, useFeatureEnabled } from '@/components/auth/FeatureGate';
import { useProjectFinancials } from '@/hooks/useProjectFinancials';
import { COListPage } from '@/components/change-orders';
import { useProjectReadiness } from '@/hooks/useProjectReadiness';
import { useProjectEstimateRows } from '@/hooks/useProjectEstimateRows';
import { SupplierEstimateCatalog } from '@/components/dashboard/supplier/SupplierEstimateCatalog';

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
  const invCount = financials.recentInvoices.length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-accent/30 transition-colors">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              Activity & Operations
            </span>
            <span className="text-[10px] text-muted-foreground">
              {invCount} Invoices
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
  const { id, section } = useParams<{ id: string; section?: string }>();
  const location = useLocation();
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
  const { data: projectProfile } = useProjectProfile(id);
  const { data: scopeSelections } = useScopeSelections(id);
  const showSetupBanner = (project?.status === 'setup' || project?.status === 'draft') && (!projectProfile || !scopeSelections || scopeSelections.length === 0);

  const changeOrdersEnabled = useFeatureEnabled('change_orders');

  const activeTab = section || 'overview';

  useEffect(() => {
    if (id && !section) {
      navigate(`/project/${id}/overview`, { replace: true });
    }
  }, [id, section, navigate]);

  const handleTabChange = (tab: string) => {
    // Support query params like "invoices?highlight=abc" or "purchase-orders?po=abc"
    const [tabName, query] = tab.split('?');
    const finalTab = tabName === 'sov' ? 'sov' : tabName;
    const queryString = query ? `?${query}` : '';
    navigate(`/project/${id}/${finalTab}${queryString}`);
    setTabResetKey(prev => prev + 1);
  };

  useEffect(() => {
    if (readiness.isActive && project && project.status !== 'active') {
      setProject({ ...project, status: 'active' });
    }
  }, [readiness.isActive, project]);

  const { data: projectSupplierOrgId } = useQuery({
    queryKey: ['project-supplier-participant', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_participants')
        .select('organization_id')
        .eq('project_id', id!)
        .eq('role', 'SUPPLIER')
        .eq('invite_status', 'ACCEPTED')
        .limit(1)
        .maybeSingle();
      return data?.organization_id || null;
    },
    enabled: !!id && !isSupplier,
  });
  const { data: estimateRows } = useProjectEstimateRows(id || '', projectSupplierOrgId ?? null);

  useEffect(() => {
    if (activeTab !== 'work-orders') return;
    navigate(`/project/${id}/${changeOrdersEnabled ? 'change-orders' : 'overview'}`, { replace: true });
  }, [activeTab, changeOrdersEnabled, id, navigate]);

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

  const [pendingInvite, setPendingInvite] = useState(false);

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
      if (error) {
        console.error('Error fetching project:', error);
        if (user) {
          const { data: invite } = await supabase
            .from('project_participants')
            .select('id, organization_id')
            .eq('project_id', id)
            .eq('invite_status', 'INVITED')
            .limit(1)
            .maybeSingle();
          if (invite) {
            const userOrgIds = userOrgRoles.map(r => r.organization?.id).filter(Boolean);
            if (userOrgIds.includes(invite.organization_id)) {
              setPendingInvite(true);
              setLoading(false);
              return;
            }
          }
        }
        navigate('/dashboard');
        return;
      }
      setProject(proj as Project);
      setLoading(false);
    };
    fetchProject();
  }, [id, navigate, isInDemoMode, user, userOrgRoles]);

  // Loading state
  if (loading) {
    return (
      <ProjectShell projectName="Loading…" projectId={id || ''} projectStatus="draft">
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
              <Skeleton className="h-96 w-full" />
            </div>
          </main>
        </div>
      </ProjectShell>
    );
  }

  if (pendingInvite) {
    return (
      <ProjectShell projectName="Pending Invite" projectId={id || ''} projectStatus="draft">
        <div className="flex items-center justify-center flex-1 min-h-[50vh]">
          <PendingInviteCard projectId={id!} />
        </div>
      </ProjectShell>
    );
  }

  if (!project) {
    return (
      <ProjectShell projectName="Not Found" projectId={id || ''} projectStatus="draft">
        <div className="flex items-center justify-center flex-1 min-h-[50vh]">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </ProjectShell>
    );
  }

  const projectStatus = project.status || 'draft';

  return (
    <ProjectShell
      projectName={project.name}
      projectId={id!}
      projectStatus={projectStatus}
      onStatusChange={handleStatusChange}
    >
      {/* Icon rail + content layout */}
      <div className="flex flex-1 overflow-hidden">
        <ProjectIconRail isSupplier={isSupplier} />
        <main className="flex-1 overflow-auto">
          <div className={cn(
            "max-w-7xl mx-auto w-full pb-24 lg:pb-6",
            activeTab === 'overview' ? 'px-3 sm:px-6 py-4 sm:py-6' : 'px-3 sm:px-6 py-4 sm:py-6 space-y-6'
          )}>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                {isInDemoMode ? (
                  <DemoProjectOverview onNavigate={handleTabChange} />
                ) : isSupplier && supplierOrgId ? (
                  <SupplierMaterialsOverview projectId={id!} supplierOrgId={supplierOrgId} onNavigate={handleTabChange} />
                ) : (
                  <div className="space-y-2.5">
                    {showSetupBanner && (
                      <div
                        className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-700 p-5 cursor-pointer hover:border-amber-400 transition-colors"
                        onClick={() => navigate(`/project/${id}/setup`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <ClipboardList className="h-5 w-5 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">Define Scope & Details</p>
                            <p className="text-xs text-muted-foreground">Set up project type, structure, and scope of work</p>
                          </div>
                          <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90" />
                        </div>
                      </div>
                    )}

                    {(project.status === 'setup' || project.status === 'draft') && !isFC && (
                      <ProjectReadinessCard readiness={readiness} />
                    )}

                    <AttentionBanner projectId={id!} onNavigate={handleTabChange} isSupplier={isSupplier} supplierOrgId={supplierOrgId} />

                    <ProjectOverviewV2
                      projectId={id!}
                      projectName={project.name}
                      projectStatus={projectStatus}
                      projectType={project.project_type}
                      address={project.address ? `${project.address.street || ''}, ${project.address.city || ''}, ${project.address.state || ''} ${project.address.zip || ''}`.replace(/^,\s*|,\s*$/g, '').trim() : null}
                      financials={financials}
                      onNavigate={handleTabChange}
                      onResponsibilityChange={setMaterialResponsibility}
                      onTeamChanged={readiness.recalculate}
                    />

                  </div>
                )}
              </>
            )}

            {activeTab === 'setup' && (
              <ProjectSetupFlow
                projectId={id!}
                projectName={project?.name}
                projectType={project?.project_type}
              />
            )}



            {activeTab === 'rfis' && (
              isInDemoMode ? <DemoRFIsTab /> : <RFIsTab projectId={id!} />
            )}
            {activeTab === 'estimates' && isSupplier && supplierOrgId && (
              <FeatureGate feature="supplier_estimates">
                <SupplierEstimatesSection projectId={id!} projectName={project?.name} supplierOrgId={supplierOrgId} />
              </FeatureGate>
            )}
            {activeTab === 'estimates' && !isSupplier && (
              <FeatureGate feature="supplier_estimates">
                {materialResponsibility && (
                  (currentOrg?.type === 'GC' && materialResponsibility === 'TC') ||
                  (currentOrg?.type !== 'GC' && materialResponsibility === 'GC')
                ) ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                    Materials are managed by the {materialResponsibility === 'GC' ? 'General Contractor' : 'Trade Contractor'} on this project.
                  </div>
                ) : (
                  <ProjectEstimatesReview projectId={id!} />
                )}
              </FeatureGate>
            )}
            {activeTab === 'invoices' && (
              <FeatureGate feature="invoicing">
                {isInDemoMode
                  ? <DemoInvoicesTab projectId={id!} />
                  : <InvoicesTab key={`invoices-${tabResetKey}-${realtimeKey}`} projectId={id!} retainagePercent={project.retainage_percent || 0} projectStatus={projectStatus} />
                }
              </FeatureGate>
            )}
            {activeTab === 'purchase-orders' && (
              <FeatureGate feature="purchase_orders">
                {isInDemoMode
                  ? <DemoPurchaseOrdersTab projectId={id!} />
                  : <PurchaseOrdersTab key={`po-${tabResetKey}-${realtimeKey}`} projectId={id!} projectName={project?.name} projectStatus={projectStatus}
                      projectAddress={project?.address ? `${project.address.street || ''}, ${project.address.city || ''}, ${project.address.state || ''} ${project.address.zip || ''}`.replace(/^,\s*|,\s*$/g, '').trim() : ''} />
                }
              </FeatureGate>
            )}
            {activeTab === 'schedule' && (
              <FeatureGate feature="schedule_gantt">
                <ScheduleTab projectId={id!} />
              </FeatureGate>
            )}
            {activeTab === 'daily-log' && (
              <FeatureGate feature="daily_logs">
                <DailyLogPanel projectId={id!} />
              </FeatureGate>
            )}
            {activeTab === 'returns' && (
              <FeatureGate feature="returns_tracking">
                <ReturnsTab projectId={id!} />
              </FeatureGate>
            )}
            {activeTab === 'sov' && (
              <FeatureGate feature="sov_contracts">
                <ContractSOVEditor projectId={id!} />
              </FeatureGate>
            )}
            {activeTab === 'change-orders' && (
              <FeatureGate feature="change_orders">
                <COListPage projectId={id!} />
              </FeatureGate>
            )}
          </div>
        </main>
      </div>
      {/* Mobile: project-specific bottom nav */}
      <div className="md:hidden">
        <ProjectBottomNav isSupplier={isSupplier} />
      </div>
    </ProjectShell>
  );
}

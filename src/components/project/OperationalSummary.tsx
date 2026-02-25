import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardList, Receipt, Users, Edit, FileText, Plus, Sparkles, Loader2, RefreshCw, MessageSquareMore, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { AddTeamMemberDialog } from '@/components/project/AddTeamMemberDialog';
import { DesignateSupplierDialog } from '@/components/project/DesignateSupplierDialog';
import { toast } from '@/hooks/use-toast';

interface OperationalSummaryProps {
  projectId: string;
  projectType: string;
  financials: ProjectFinancials;
  onNavigate: (tab: string) => void;
}

interface TeamMember {
  id: string;
  role: string;
  invited_org_name: string | null;
  status: string;
}

interface ScopeInfo {
  home_type: string | null;
  floors: number | null;
  num_buildings: number | null;
  stories: number | null;
  num_units: number | null;
  scope_description: string | null;
}

const roleDotColors: Record<string, string> = {
  'General Contractor': 'bg-blue-500',
  'Trade Contractor': 'bg-emerald-500',
  'Field Crew': 'bg-purple-500',
  'Supplier': 'bg-amber-500',
};

const roleAbbrev: Record<string, string> = {
  'General Contractor': 'GC',
  'Trade Contractor': 'TC',
  'Field Crew': 'FC',
  'Supplier': 'SUP',
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  contracted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  DRAFT: 'bg-muted text-muted-foreground',
  SUBMITTED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  PAID: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium uppercase rounded", statusColors[status] || 'bg-muted text-muted-foreground')}>
      {status}
    </span>
  );
}

function fmtCurrency(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v);
}

export function OperationalSummary({ projectId, projectType, financials, onNavigate }: OperationalSummaryProps) {
  const navigate = useNavigate();
  const { userOrgRoles } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [scope, setScope] = useState<ScopeInfo | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [loadingScope, setLoadingScope] = useState(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isDesignateOpen, setIsDesignateOpen] = useState(false);
  const [designatedSupplier, setDesignatedSupplier] = useState<{ invited_name: string | null; invited_email: string | null; status: string } | null>(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [openRfiCount, setOpenRfiCount] = useState(0);
  const [loadingRfis, setLoadingRfis] = useState(true);

  const creatorOrgType = userOrgRoles[0]?.organization?.type ?? null;
  const isGcOrTc = creatorOrgType === 'GC' || creatorOrgType === 'TC';

  const fetchDesignatedSupplier = useCallback(async () => {
    const { data } = await supabase
      .from('project_designated_suppliers')
      .select('invited_name, invited_email, status')
      .eq('project_id', projectId)
      .neq('status', 'removed')
      .maybeSingle();
    setDesignatedSupplier(data);
  }, [projectId]);

  const fetchTeam = useCallback(async () => {
    const { data } = await supabase
      .from('project_team')
      .select('id, role, invited_org_name, status')
      .eq('project_id', projectId);
    setTeam(data || []);
    setLoadingTeam(false);
  }, [projectId]);

  useEffect(() => {
    const fetchScope = async () => {
      const { data } = await supabase
        .from('project_scope_details')
        .select('home_type, floors, num_buildings, stories, num_units, scope_description')
        .eq('project_id', projectId)
        .maybeSingle();
      setScope(data);
      setLoadingScope(false);
    };
    fetchTeam();
    fetchScope();
    fetchDesignatedSupplier();

    const fetchRfiCount = async () => {
      const { count, error } = await supabase
        .from('project_rfis')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('status', 'OPEN');
      if (!error) setOpenRfiCount(count ?? 0);
      setLoadingRfis(false);
    };
    fetchRfiCount();
  }, [projectId, fetchTeam]);

  const { recentWorkOrders, recentInvoices } = financials;

  const isSingleFamily = ['Single Family Home', 'Townhomes', 'Duplex', 'residential'].includes(projectType);
  const isMultiFamily = ['Apartments/Condos', 'Hotels', 'commercial', 'mixed_use'].includes(projectType);

  const scopeSummary: string[] = [];
  if (scope) {
    if (isSingleFamily) {
      if (scope.home_type) scopeSummary.push(scope.home_type);
      if (scope.floors) scopeSummary.push(`${scope.floors} floor${scope.floors > 1 ? 's' : ''}`);
    } else if (isMultiFamily) {
      if (scope.num_buildings) scopeSummary.push(`${scope.num_buildings} bldg${scope.num_buildings > 1 ? 's' : ''}`);
      if (scope.stories) scopeSummary.push(`${scope.stories} stories`);
      if (scope.num_units) scopeSummary.push(`${scope.num_units} units`);
    }
  }

  const handleGenerateDescription = async () => {
    setGeneratingDescription(true);
    try {
      const response = await supabase.functions.invoke('generate-scope-description', {
        body: { project_id: projectId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { description, error } = response.data;
      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }

      setScope(prev => prev ? { ...prev, scope_description: description } : prev);
      toast({ title: 'Description generated', description: 'Scope description has been saved.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to generate description', variant: 'destructive' });
    } finally {
      setGeneratingDescription(false);
    }
  };

  // Group team by role
  const teamByRole = team.reduce<Record<string, TeamMember[]>>((acc, m) => {
    if (!acc[m.role]) acc[m.role] = [];
    acc[m.role].push(m);
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Recent Work Orders */}
      <div className="border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => onNavigate('work-orders')} className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Recent Work Orders</span>
          </button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => onNavigate('work-orders')}>View All</Button>
        </div>
        {recentWorkOrders.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No work orders yet</p>
        ) : (
          <div className="space-y-1">
            {recentWorkOrders.map(wo => (
              <button
                key={wo.id}
                onClick={() => navigate(`/work-orders/${wo.id}`)}
                className="w-full flex items-center justify-between py-1.5 px-1 hover:bg-accent/50 rounded text-left transition-colors"
              >
                <span className="text-sm truncate flex-1 mr-2">{wo.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={wo.status} />
                  <span className="text-[10px] text-muted-foreground">{format(new Date(wo.created_at), 'MMM d')}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recent Invoices */}
      <div className="border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => onNavigate('invoices')} className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Recent Invoices</span>
          </button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => onNavigate('invoices')}>View All</Button>
        </div>
        {recentInvoices.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No invoices yet</p>
        ) : (
          <div className="space-y-1">
            {recentInvoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-1.5 px-1">
                <span className="text-sm truncate flex-1 mr-2">{inv.invoice_number}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={inv.status} />
                  <span className="text-xs font-medium tabular-nums">{fmtCurrency(inv.total_amount)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open RFIs */}
      <div className="border bg-card p-3 sm:col-span-2">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => onNavigate('rfis')} className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <MessageSquareMore className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Open RFIs</span>
          </button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => onNavigate('rfis')}>View All</Button>
        </div>
        {loadingRfis ? (
          <Skeleton className="h-8" />
        ) : openRfiCount > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tabular-nums">{openRfiCount}</span>
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-0 text-[10px]">
              {openRfiCount} Open
            </Badge>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2">No open RFIs</p>
        )}
      </div>

      <div className="border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Team</span>
            <span className="text-[10px] text-muted-foreground ml-1">({team.filter(m => m.status === 'Accepted').length} active)</span>
          </div>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setIsAddMemberOpen(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
        {loadingTeam ? (
          <Skeleton className="h-12" />
        ) : team.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No team members</p>
        ) : (
          <div className="space-y-1">
            {Object.entries(teamByRole).map(([role, members]) => (
              <div key={role} className="flex items-center gap-1.5 py-0.5">
                <span className={cn("h-2 w-2 rounded-full shrink-0", roleDotColors[role])} />
                <span className="text-[10px] font-medium text-muted-foreground uppercase w-7">{roleAbbrev[role]}</span>
                <span className="text-sm truncate">{members.map(m => m.invited_org_name || 'Unknown').join(', ')}</span>
              </div>
            ))}
            {/* Designated supplier section */}
            {designatedSupplier ? (
              <div className="flex items-center justify-between pt-1 border-t mt-1">
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full shrink-0 bg-amber-500")} />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase w-7">SUP</span>
                  <span className="text-sm truncate">{designatedSupplier.invited_name || designatedSupplier.invited_email || 'Designated'}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0">{designatedSupplier.status}</Badge>
                </div>
                {isGcOrTc && (
                  <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={() => setIsDesignateOpen(true)}>Change</Button>
                )}
              </div>
            ) : isGcOrTc && !team.some(m => m.role === 'Supplier') ? (
              <Button variant="ghost" size="sm" className="h-6 w-full mt-1 text-[11px] text-muted-foreground" onClick={() => setIsDesignateOpen(true)}>
                <UserPlus className="h-3 w-3 mr-1" />
                Designate Supplier Contact
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {/* Scope Summary */}
      <div className="border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Scope</span>
          </div>
          <div className="flex items-center gap-1">
            {scope && scopeSummary.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={handleGenerateDescription}
                disabled={generatingDescription}
              >
                {generatingDescription ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : scope.scope_description ? (
                  <RefreshCw className="h-3 w-3 mr-1" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-1" />
                )}
                {scope.scope_description ? 'Regenerate' : 'Generate'}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => navigate(`/projects/${projectId}/scope`)}>
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        </div>
        {loadingScope ? (
          <Skeleton className="h-8" />
        ) : scope && scopeSummary.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-sm text-foreground">{scopeSummary.join(' • ')}</p>
            {scope.scope_description && (
              <p className="text-xs text-muted-foreground leading-relaxed">{scope.scope_description}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-1">No scope configured</p>
        )}
      </div>

      <AddTeamMemberDialog
        open={isAddMemberOpen}
        onOpenChange={setIsAddMemberOpen}
        projectId={projectId}
        creatorOrgType={creatorOrgType}
        onMemberAdded={fetchTeam}
      />
      <DesignateSupplierDialog
        open={isDesignateOpen}
        onOpenChange={setIsDesignateOpen}
        projectId={projectId}
        onDesignated={fetchDesignatedSupplier}
      />
    </div>
  );
}

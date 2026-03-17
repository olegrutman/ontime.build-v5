import { useEffect, useState, useCallback } from 'react';
import { Receipt, Users, FileText, MessageSquareMore, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { AddTeamMemberDialog } from '@/components/project/AddTeamMemberDialog';
import { useNavigate } from 'react-router-dom';

interface SupplierOperationalSummaryProps {
  projectId: string;
  supplierOrgId: string;
  onNavigate: (tab: string) => void;
}

interface TeamMember {
  id: string;
  role: string;
  invited_org_name: string | null;
  status: string;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
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
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

export function SupplierOperationalSummary({ projectId, supplierOrgId, onNavigate }: SupplierOperationalSummaryProps) {
  const navigate = useNavigate();
  const { userOrgRoles } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);
  const [openRfiCount, setOpenRfiCount] = useState(0);
  const [scope, setScope] = useState<{ scope_description: string | null } | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingWOs, setLoadingWOs] = useState(true);
  const [loadingRfis, setLoadingRfis] = useState(true);
  const [loadingScope, setLoadingScope] = useState(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  const creatorOrgType = userOrgRoles[0]?.organization?.type ?? null;

  const fetchTeam = useCallback(async () => {
    const { data } = await supabase
      .from('project_team')
      .select('id, role, invited_org_name, status')
      .eq('project_id', projectId);
    setTeam(data || []);
    setLoadingTeam(false);
  }, [projectId]);

  useEffect(() => {
    fetchTeam();

    // Fetch invoices linked to supplier's POs
    const fetchInvoices = async () => {
      // Get supplier IDs for this org
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id')
        .eq('organization_id', supplierOrgId);

      if (suppliers && suppliers.length > 0) {
        const supplierIds = suppliers.map(s => s.id);
        // Get POs for these suppliers on this project
        const { data: pos } = await supabase
          .from('purchase_orders')
          .select('id')
          .eq('project_id', projectId)
          .in('supplier_id', supplierIds);

        if (pos && pos.length > 0) {
          const poIds = pos.map(p => p.id);
          const { data: invData } = await supabase
            .from('invoices')
            .select('id, invoice_number, status, total_amount')
            .eq('project_id', projectId)
            .in('po_id', poIds)
            .order('created_at', { ascending: false })
            .limit(5);
          setInvoices(invData || []);
        }
      }
      setLoadingInvoices(false);
    };
    fetchInvoices();

    // Fetch work orders where supplier is a participant
    const fetchWorkOrders = async () => {
      const { data: participantRows } = await supabase
        .from('change_order_participants')
        .select('change_order_id')
        .eq('organization_id', supplierOrgId)
        .eq('is_active', true);

      if (participantRows && participantRows.length > 0) {
        const coIds = participantRows.map(r => r.change_order_id);
        const { data: woData } = await supabase
          .from('change_order_projects')
          .select('id, title, status, created_at')
          .eq('project_id', projectId)
          .in('id', coIds)
          .order('created_at', { ascending: false })
          .limit(5);
        setWorkOrders(woData || []);
      }
      setLoadingWOs(false);
    };
    fetchWorkOrders();

    // Fetch open RFIs assigned to this supplier
    const fetchRfiCount = async () => {
      const { count, error } = await supabase
        .from('project_rfis')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('assigned_to_org_id', supplierOrgId)
        .eq('status', 'OPEN');
      if (!error) setOpenRfiCount(count ?? 0);
      setLoadingRfis(false);
    };
    fetchRfiCount();

    // Fetch scope
    const fetchScope = async () => {
      const { data } = await supabase
        .from('project_scope_details')
        .select('scope_description')
        .eq('project_id', projectId)
        .maybeSingle();
      setScope(data);
      setLoadingScope(false);
    };
    fetchScope();
  }, [projectId, supplierOrgId, fetchTeam]);

  const teamByRole = team.reduce<Record<string, TeamMember[]>>((acc, m) => {
    if (!acc[m.role]) acc[m.role] = [];
    acc[m.role].push(m);
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Work Orders (supplier is involved in) */}
      <div className="border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => onNavigate('work-orders')} className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Work Orders</span>
          </button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => onNavigate('work-orders')}>View All</Button>
        </div>
        {loadingWOs ? (
          <Skeleton className="h-12" />
        ) : workOrders.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No work orders</p>
        ) : (
          <div className="space-y-1">
            {workOrders.map(wo => (
              <button
                key={wo.id}
                onClick={() => navigate(`/work-orders/${wo.id}`)}
                className="w-full flex items-center justify-between py-1.5 px-1 hover:bg-accent/50 rounded text-left transition-colors"
              >
                <span className="text-sm truncate flex-1 mr-2">{wo.title}</span>
                <StatusBadge status={wo.status} />
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
        {loadingInvoices ? (
          <Skeleton className="h-12" />
        ) : invoices.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No invoices yet</p>
        ) : (
          <div className="space-y-1">
            {invoices.map(inv => (
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

      {/* Team */}
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
          </div>
        )}
      </div>

      {/* Scope */}
      <div className="border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Project Scope</span>
          </div>
        </div>
        {loadingScope ? (
          <Skeleton className="h-8" />
        ) : scope?.scope_description ? (
          <p className="text-xs text-muted-foreground leading-relaxed">{scope.scope_description}</p>
        ) : (
          <p className="text-xs text-muted-foreground py-1">No scope description available</p>
        )}
      </div>

      <AddTeamMemberDialog
        open={isAddMemberOpen}
        onOpenChange={setIsAddMemberOpen}
        projectId={projectId}
        creatorOrgType={creatorOrgType}
        onMemberAdded={fetchTeam}
      />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SupportActionDialog } from '@/components/platform/SupportActionDialog';
import { supabase } from '@/integrations/supabase/client';
import { useSupportAction } from '@/hooks/useSupportAction';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { CheckCircle, DollarSign, FileText, ClipboardList, ShoppingCart, Package, Trash2 } from 'lucide-react';

interface ProjectData {
  id: string;
  name: string;
  status: string;
  address: any;
  city: string | null;
  state: string | null;
  zip: string | null;
  created_at: string;
  created_by: string | null;
}

interface CreatorProfile {
  first_name: string | null;
  last_name: string | null;
  email: string;
  user_id: string;
}

interface TeamMember {
  id: string;
  role: string;
  status: string;
  accepted_at: string | null;
  organization: { id: string; name: string; type: string } | null;
}

interface SupplierEstimateRow {
  id: string;
  name: string;
  status: string;
  total_amount: number;
  created_at: string;
  supplier_org: { name: string } | null;
}

interface ContractRow {
  id: string;
  from_org_id: string | null;
  to_org_id: string | null;
  from_role: string;
  to_role: string;
  contract_sum: number | null;
  labor_budget: number | null;
  status: string | null;
  trade: string | null;
  from_org?: { id: string; name: string } | null;
  to_org?: { id: string; name: string } | null;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  retainage_amount: number;
  billing_period_start: string;
  billing_period_end: string;
  created_at: string;
  paid_at: string | null;
}

interface PORow {
  id: string;
  po_number: string;
  po_name: string;
  status: string;
  po_total: number | null;
  created_at: string;
  supplier_org?: { name: string } | null;
}

interface StatusCounts {
  [key: string]: number;
}

function formatCurrency(val: number | null | undefined) {
  if (val == null) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
}

function StatusBreakdown({ counts, label }: { counts: StatusCounts; label: string }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, c]) => s + c, 0);
  if (total === 0) return <p className="text-sm text-muted-foreground">No {label.toLowerCase()}</p>;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label} ({total})</p>
      <div className="flex flex-wrap gap-1.5">
        {entries.map(([status, count]) => (
          <Badge key={status} variant="outline" className="text-xs capitalize">
            {status.toLowerCase().replace('_', ' ')} · {count}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default function PlatformProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Financial data
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [pos, setPos] = useState<PORow[]>([]);
  const [woCounts, setWoCounts] = useState<StatusCounts>({});
  const [poCounts, setPoCounts] = useState<StatusCounts>({});
  const [invCounts, setInvCounts] = useState<StatusCounts>({});
  const [financials, setFinancials] = useState({ invoiced: 0, paid: 0, retainage: 0, poTotal: 0 });
  const [estimates, setEstimates] = useState<SupplierEstimateRow[]>([]);

  const { execute, loading: actionLoading } = useSupportAction();
  const { platformRole } = useAuth();
  const [forceAcceptOpen, setForceAcceptOpen] = useState(false);
  const [forceAcceptTeamId, setForceAcceptTeamId] = useState<string | null>(null);
  const [forceAcceptOrgName, setForceAcceptOrgName] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchData = async () => {
    if (!projectId) return;
    const [projRes, teamRes, contractsRes, invoicesRes, posRes, woStatusRes, poStatusRes, invAllRes, poAllRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase
        .from('project_team')
        .select('id, role, status, accepted_at, organization:organizations!project_team_org_id_fkey(id, name, type)')
        .eq('project_id', projectId),
      supabase
        .from('project_contracts')
        .select('id, from_org_id, to_org_id, from_role, to_role, contract_sum, labor_budget, status, trade, from_org:organizations!project_contracts_from_org_id_fkey(id, name), to_org:organizations!project_contracts_to_org_id_fkey(id, name)')
        .eq('project_id', projectId),
      supabase
        .from('invoices')
        .select('id, invoice_number, status, total_amount, retainage_amount, billing_period_start, billing_period_end, created_at, paid_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('purchase_orders')
        .select('id, po_number, po_name, status, po_total, created_at, supplier_org:organizations!purchase_orders_organization_id_fkey(name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('work_items').select('state').eq('project_id', projectId),
      supabase.from('purchase_orders').select('status').eq('project_id', projectId),
      supabase.from('invoices').select('status, total_amount, retainage_amount, paid_at').eq('project_id', projectId),
      supabase.from('purchase_orders').select('po_total').eq('project_id', projectId),
    ]);

    const proj = projRes.data as unknown as ProjectData;
    setProject(proj);
    setTeam((teamRes.data || []) as unknown as TeamMember[]);
    setContracts((contractsRes.data || []) as unknown as ContractRow[]);
    setInvoices((invoicesRes.data || []) as unknown as InvoiceRow[]);

    // Resolve creator profile
    if (proj?.created_by) {
      const { data: creatorData } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, user_id')
        .eq('user_id', proj.created_by)
        .single();
      setCreator(creatorData as unknown as CreatorProfile | null);
    } else {
      setCreator(null);
    }
    setPos((posRes.data || []) as unknown as PORow[]);

    // Build status count maps
    const buildCounts = (data: any[], key = 'status') => {
      const map: StatusCounts = {};
      data.forEach((r) => { const v = r[key]; if (v) map[v] = (map[v] || 0) + 1; });
      return map;
    };
    setWoCounts(buildCounts(woStatusRes.data || [], 'state'));
    setPoCounts(buildCounts(poStatusRes.data || []));
    setInvCounts(buildCounts(invAllRes.data || []));

    // Financial aggregations from full datasets
    const invRows = invAllRes.data || [];
    const poRows = poAllRes.data || [];
    setFinancials({
      invoiced: invRows.reduce((s: number, r: any) => s + (r.total_amount || 0), 0),
      paid: invRows.filter((r: any) => r.paid_at).reduce((s: number, r: any) => s + (r.total_amount || 0), 0),
      retainage: invRows.reduce((s: number, r: any) => s + (r.retainage_amount || 0), 0),
      poTotal: poRows.reduce((s: number, r: any) => s + (r.po_total || 0), 0),
    });

    // Fetch supplier estimates
    const { data: estData } = await supabase
      .from('supplier_estimates')
      .select('id, name, status, total_amount, created_at, supplier_org:organizations!supplier_estimates_supplier_org_id_fkey(name)')
      .eq('project_id', projectId);
    setEstimates((estData || []) as unknown as SupplierEstimateRow[]);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleForceAccept = async (reason: string) => {
    if (!forceAcceptTeamId) return;
    const ok = await execute({
      action_type: 'FORCE_ACCEPT_PROJECT',
      reason,
      team_id: forceAcceptTeamId,
    });
    if (ok) {
      setForceAcceptOpen(false);
      setForceAcceptTeamId(null);
      fetchData();
    }
  };

  if (loading) {
    return (
      <PlatformLayout title="Project">
        <Skeleton className="h-40 w-full" />
      </PlatformLayout>
    );
  }

  if (!project) {
    return (
      <PlatformLayout title="Not Found">
        <p className="text-muted-foreground">Project not found.</p>
      </PlatformLayout>
    );
  }

  const fullAddress = [
    project.address?.street,
    [project.city, project.state].filter(Boolean).join(', '),
    project.zip,
  ].filter(Boolean);

  const totalContractValue = contracts.reduce((s, c) => s + (c.contract_sum || 0), 0);
  const ownerOrg = team.find((t) => t.role === 'GC');
  const creatorName = creator ? [creator.first_name, creator.last_name].filter(Boolean).join(' ') || creator.email : null;

  return (
    <PlatformLayout
      title={project.name}
      breadcrumbs={[
        { label: 'Platform', href: '/platform' },
        { label: 'Projects', href: '/platform/projects' },
        { label: project.name },
      ]}
    >
      {/* Summary */}
      <Card className="mb-6">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Project Summary</CardTitle>
          {platformRole === 'PLATFORM_OWNER' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete Project
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
            <Badge variant="outline" className="capitalize mt-1">{project.status}</Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Owner Org</p>
            {ownerOrg?.organization ? (
              <button
                className="font-medium text-sm text-primary hover:underline"
                onClick={() => navigate(`/platform/orgs/${ownerOrg.organization!.id}`)}
              >
                {ownerOrg.organization.name}
              </button>
            ) : (
              <p className="font-medium text-sm">—</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Created By</p>
            {creatorName && creator ? (
              <div>
                <button
                  className="font-medium text-sm text-primary hover:underline"
                  onClick={() => navigate(`/platform/users/${creator.user_id}`)}
                >
                  {creatorName}
                </button>
                {creator.email && creatorName !== creator.email && (
                  <p className="text-xs text-muted-foreground truncate">{creator.email}</p>
                )}
              </div>
            ) : (
              <p className="font-medium text-sm">—</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Location</p>
            {fullAddress.length > 0 ? (
              <div className="text-sm font-medium">
                {fullAddress.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            ) : (
              <p className="font-medium text-sm">—</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Created</p>
            <p className="font-medium text-sm">{format(new Date(project.created_at), 'MMM d, yyyy')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Contracts</p>
            <p className="font-medium text-sm">{contracts.length}</p>
          </div>
        </CardContent>
      </Card>

      {/* Financial Overview */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Contract Value</p>
            <p className="text-lg font-bold">{formatCurrency(totalContractValue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Invoiced</p>
            <p className="text-lg font-bold">{formatCurrency(financials.invoiced)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Paid</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(financials.paid)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Outstanding</p>
            <p className="text-lg font-bold text-amber-600">{formatCurrency(financials.invoiced - financials.paid)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Retainage Held</p>
            <p className="text-lg font-bold">{formatCurrency(financials.retainage)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">PO Value</p>
            <p className="text-lg font-bold">{formatCurrency(financials.poTotal)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Activity Breakdown */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> Activity Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <StatusBreakdown counts={woCounts} label="Work Orders" />
          <StatusBreakdown counts={poCounts} label="Purchase Orders" />
          <StatusBreakdown counts={invCounts} label="Invoices" />
        </CardContent>
      </Card>

      {/* Contracts Table */}
      {contracts.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contracts ({contracts.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From Org</TableHead>
                  <TableHead>To Org</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead className="text-right">Contract Sum</TableHead>
                  <TableHead className="text-right">Labor Budget</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.from_org ? (
                        <button
                          className="text-sm font-medium text-primary hover:underline"
                          onClick={() => navigate(`/platform/orgs/${c.from_org!.id}`)}
                        >
                          {c.from_org.name}
                        </button>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {c.to_org ? (
                        <button
                          className="text-sm font-medium text-primary hover:underline"
                          onClick={() => navigate(`/platform/orgs/${c.to_org!.id}`)}
                        >
                          {c.to_org.name}
                        </button>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.from_role} → {c.to_role}</TableCell>
                    <TableCell className="text-sm">{c.trade || '—'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(c.contract_sum)}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(c.labor_budget)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{c.status || 'active'}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Invoices */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Recent Invoices
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Billing Period</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No invoices</TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{inv.status.toLowerCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(inv.total_amount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(inv.billing_period_start), 'MMM d')} – {format(new Date(inv.billing_period_end), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(inv.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Purchase Orders */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Recent Purchase Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No purchase orders</TableCell>
                </TableRow>
              ) : (
                pos.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.po_number}</TableCell>
                    <TableCell className="text-sm">{po.po_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{po.status.toLowerCase().replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(po.po_total)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(po.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Team */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Team / Participants</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Accepted</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No team members</TableCell>
                </TableRow>
              ) : (
                team.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => t.organization && navigate(`/platform/orgs/${t.organization.id}`)}
                  >
                    <TableCell>
                      <span className="font-medium">{t.organization?.name || '—'}</span>
                      {t.organization?.type && (
                        <Badge variant="secondary" className="text-[10px] ml-1.5 capitalize">{t.organization.type}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{t.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={t.status === 'Accepted' ? 'text-xs border-green-500/30 text-green-600' : 'text-xs border-yellow-500/30 text-yellow-600'}
                      >
                        {t.status || 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {t.status !== 'Accepted' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setForceAcceptTeamId(t.id);
                            setForceAcceptOrgName(t.organization?.name || 'Unknown');
                            setForceAcceptOpen(true);
                          }}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Force Accept
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Supplier Estimates */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" /> Supplier Estimates
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estimate</TableHead>
                <TableHead>Supplier Org</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No supplier estimates</TableCell>
                </TableRow>
              ) : (
                estimates.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell className="text-sm">{e.supplier_org?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{e.status.toLowerCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(e.total_amount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(e.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Force Accept Dialog */}
      <SupportActionDialog
        open={forceAcceptOpen}
        onOpenChange={setForceAcceptOpen}
        title="Force Accept Team Member"
        description={`Force-accept ${forceAcceptOrgName}'s participation in ${project.name}. This bypasses the normal invitation acceptance flow.`}
        onConfirm={handleForceAccept}
        loading={actionLoading}
      />

      {/* Delete Project Dialog */}
      <SupportActionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Permanently Delete Project"
        description={`This will permanently delete "${project.name}" and ALL associated data including contracts, invoices, purchase orders, work orders, estimates, and team memberships. This action cannot be undone.`}
        onConfirm={async (reason) => {
          const ok = await execute({
            action_type: 'DELETE_PROJECT',
            reason,
            project_id: project.id,
          });
          if (ok) {
            setDeleteOpen(false);
            navigate('/platform/projects');
          }
        }}
        loading={actionLoading}
      />
    </PlatformLayout>
  );
}

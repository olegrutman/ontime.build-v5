import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  DollarSign, 
  Receipt, 
  ClipboardList, 
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import ApprovalBanners from './ApprovalBanners';

interface ScopeFlags {
  roof?: boolean;
  decks?: boolean;
  garage?: boolean;
  porches?: boolean;
  basement?: boolean;
  hardware_installation?: boolean;
}

interface TeamMember {
  user_id: string;
  company_name: string;
  role: string;
}

interface ProjectOverviewProps {
  projectId: string;
  contractContextId?: string;
  scopeFlags?: ScopeFlags;
  contractMode?: 'TWO_PARTY' | 'THREE_PARTY';
  onNavigateToCOs?: () => void;
  onNavigateToInvoices?: () => void;
}

interface ContextMetrics {
  invoiceCount: number;
  paidInvoiceCount: number;
  invoiceTotal: number;
  billedToDate: number;
  retainageHeld: number;
  changeOrderCount: number;
  approvedCOCount: number;
  submittedCOCount: number;
  changeOrderTotal: number;
  approvedCOTotal: number;
}

type UserProjectRole = 'FIELD_CREW' | 'TRADE_CONTRACTOR' | 'GC' | null;

const emptyMetrics: ContextMetrics = {
  invoiceCount: 0,
  paidInvoiceCount: 0,
  invoiceTotal: 0,
  billedToDate: 0,
  retainageHeld: 0,
  changeOrderCount: 0,
  approvedCOCount: 0,
  submittedCOCount: 0,
  changeOrderTotal: 0,
  approvedCOTotal: 0,
};

const ROLE_LABELS: Record<string, string> = {
  'FIELD_CREW': 'Field Crew',
  'TRADE_CONTRACTOR': 'Trade Contractor',
  'GC': 'General Contractor',
  'OWNER': 'Owner'
};

export default function ProjectOverview({ 
  projectId, 
  contractContextId,
  scopeFlags,
  contractMode = 'THREE_PARTY',
  onNavigateToCOs,
  onNavigateToInvoices
}: ProjectOverviewProps) {
  const { user } = useAuth();
  const [retainagePercent, setRetainagePercent] = useState(0);
  const [upstreamContractValue, setUpstreamContractValue] = useState(0);
  const [downstreamContractValue, setDownstreamContractValue] = useState(0);
  const [upstreamMetrics, setUpstreamMetrics] = useState<ContextMetrics>(emptyMetrics);
  const [downstreamMetrics, setDownstreamMetrics] = useState<ContextMetrics>(emptyMetrics);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [userRole, setUserRole] = useState<UserProjectRole>(null);
  const [loading, setLoading] = useState(true);

  // Role-based visibility flags
  const isTC = userRole === 'TRADE_CONTRACTOR';
  const isGC = userRole === 'GC';
  const isFC = userRole === 'FIELD_CREW';

  // Use the appropriate context values based on role
  const displayContractValue = isFC ? downstreamContractValue : upstreamContractValue;
  const displayMetrics = isFC ? downstreamMetrics : upstreamMetrics;
  
  const profit = upstreamContractValue - downstreamContractValue;
  const profitPercent = upstreamContractValue > 0 ? (profit / upstreamContractValue) * 100 : 0;
  const totalBilled = displayMetrics.billedToDate;
  const retainageHeld = displayMetrics.retainageHeld;
  const outstandingAmount = displayContractValue - totalBilled;

  useEffect(() => {
    if (projectId && user) {
      fetchUserRole();
      fetchOverviewData();
    }
  }, [contractContextId, projectId, user?.id]);

  const fetchUserRole = async () => {
    if (!projectId || !user) return;
    
    try {
      const { data, error } = await supabase
        .rpc('get_user_project_role', { 
          _project_id: projectId, 
          _user_id: user.id 
        });
      
      if (!error && data) {
        setUserRole(data as UserProjectRole);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchContextMetrics = async (contextId: string, projectRetainagePercent: number): Promise<ContextMetrics> => {
    const metrics = { ...emptyMetrics };

    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, status')
      .eq('contract_context_id', contextId);

    if (invoices) {
      metrics.invoiceCount = invoices.length;
      metrics.paidInvoiceCount = invoices.filter(inv => inv.status === 'PAID').length;

      const allInvoiceIds = invoices.map(inv => inv.id);
      if (allInvoiceIds.length > 0) {
        const { data: allLineItems } = await supabase
          .from('invoice_line_items')
          .select('amount, invoice_id')
          .in('invoice_id', allInvoiceIds);

        if (allLineItems) {
          metrics.invoiceTotal = allLineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
          // Calculate billed to date from SUBMITTED and PAID invoices
          const billedInvoiceIds = invoices
            .filter(inv => inv.status === 'SUBMITTED' || inv.status === 'PAID')
            .map(inv => inv.id);
          const billedItems = allLineItems.filter(item => billedInvoiceIds.includes(item.invoice_id));
          metrics.billedToDate = billedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
          
          // Calculate cumulative retainage held (from non-PAID invoices that are billed)
          const heldInvoiceIds = invoices
            .filter(inv => inv.status === 'SUBMITTED')
            .map(inv => inv.id);
          const heldItems = allLineItems.filter(item => heldInvoiceIds.includes(item.invoice_id));
          const heldBilledAmount = heldItems.reduce((sum, item) => sum + (item.amount || 0), 0);
          metrics.retainageHeld = heldBilledAmount * (projectRetainagePercent / 100);
        }
      }
    }

    const { data: changeOrders } = await supabase
      .from('change_orders')
      .select('id, approval_status')
      .eq('contract_context_id', contextId);

    if (changeOrders) {
      metrics.changeOrderCount = changeOrders.length;
      const approved = changeOrders.filter(co => co.approval_status === 'APPROVED');
      const submitted = changeOrders.filter(co => co.approval_status === 'NEEDS_APPROVAL');
      metrics.approvedCOCount = approved.length;
      metrics.submittedCOCount = submitted.length;

      const allCoIds = changeOrders.map(co => co.id);
      if (allCoIds.length > 0) {
        const { data: coLineItems } = await supabase
          .from('co_line_items')
          .select('amount, co_id')
          .in('co_id', allCoIds);

        if (coLineItems) {
          metrics.changeOrderTotal = coLineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
          const approvedIds = approved.map(co => co.id);
          const approvedItems = coLineItems.filter(item => approvedIds.includes(item.co_id));
          metrics.approvedCOTotal = approvedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
        }
      }
    }

    return metrics;
  };

  const fetchOverviewData = async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      // Fetch project retainage percent first
      const { data: projectData } = await supabase
        .from('projects')
        .select('retainage_percent')
        .eq('id', projectId)
        .maybeSingle();
      
      const projectRetainagePercent = projectData?.retainage_percent ?? 0;
      setRetainagePercent(projectRetainagePercent);

      const { data: contexts } = await supabase
        .from('contract_contexts')
        .select('id, type')
        .eq('project_id', projectId);

      if (contexts) {
        const upstreamContext = contexts.find(c => c.type === 'UPSTREAM');
        const downstreamContext = contexts.find(c => c.type === 'DOWNSTREAM');

        const promises: Promise<void>[] = [];

        if (upstreamContext) {
          promises.push(
            (async () => {
              const { data: upstreamSov } = await supabase
                .from('sovs')
                .select('id')
                .eq('contract_context_id', upstreamContext.id)
                .eq('status', 'ACTIVE')
                .maybeSingle();

              if (upstreamSov) {
                const { data: upstreamItems } = await supabase
                  .from('sov_line_items')
                  .select('amount')
                  .eq('sov_id', upstreamSov.id);

                if (upstreamItems) {
                  const total = upstreamItems.reduce((sum, item) => sum + (item.amount || 0), 0);
                  setUpstreamContractValue(total);
                }
              }

              const metrics = await fetchContextMetrics(upstreamContext.id, projectRetainagePercent);
              setUpstreamMetrics(metrics);
            })()
          );
        }

        if (downstreamContext) {
          promises.push(
            (async () => {
              const { data: downstreamSov } = await supabase
                .from('sovs')
                .select('id')
                .eq('contract_context_id', downstreamContext.id)
                .eq('status', 'ACTIVE')
                .maybeSingle();

              if (downstreamSov) {
                const { data: downstreamItems } = await supabase
                  .from('sov_line_items')
                  .select('amount')
                  .eq('sov_id', downstreamSov.id);

                if (downstreamItems) {
                  const total = downstreamItems.reduce((sum, item) => sum + (item.amount || 0), 0);
                  setDownstreamContractValue(total);
                }
              }

              const metrics = await fetchContextMetrics(downstreamContext.id, projectRetainagePercent);
              setDownstreamMetrics(metrics);
            })()
          );
        }

        await Promise.all(promises);
      }

      // Fetch team members with company names
      const { data: members } = await supabase
        .from('project_members')
        .select('user_id, role_on_project')
        .eq('project_id', projectId);

      if (members && members.length > 0) {
        const userIds = members.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, role, company_id')
          .in('id', userIds);

        if (profiles) {
          const companyIds = profiles.map(p => p.company_id).filter(Boolean) as string[];
          let companyMap: Record<string, string> = {};
          
          if (companyIds.length > 0) {
            const { data: companies } = await supabase
              .from('companies')
              .select('id, name')
              .in('id', companyIds);
            
            if (companies) {
              companies.forEach(c => {
                companyMap[c.id] = c.name;
              });
            }
          }

          const teamData: TeamMember[] = members.map(m => {
            const profile = profiles.find(p => p.id === m.user_id);
            const companyName = profile?.company_id ? companyMap[profile.company_id] : null;
            return {
              user_id: m.user_id,
              company_name: companyName || profile?.email?.split('@')[0] || 'Unknown',
              role: m.role_on_project || profile?.role || 'Unknown'
            };
          });
          setTeamMembers(teamData);
        }
      }
    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-32 bg-muted rounded-lg" />
        <div className="animate-pulse h-48 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Approval Banners */}
      <ApprovalBanners 
        projectId={projectId}
        onNavigateToCOs={onNavigateToCOs}
        onNavigateToInvoices={onNavigateToInvoices}
      />

      {/* Contract Summary */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-accent" />
            Contract Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* TC sees both contracts with profit in THREE_PARTY mode */}
          {contractMode === 'THREE_PARTY' && isTC ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-accent/10 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold font-mono text-accent">{formatCurrency(upstreamContractValue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">TC → GC</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold font-mono">{formatCurrency(downstreamContractValue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">TC → FC</p>
                </div>
              </div>

              <div className={`rounded-lg p-4 text-center ${profit >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className={`h-5 w-5 ${profit >= 0 ? 'text-success' : 'text-destructive'}`} />
                  <p className={`text-2xl font-bold font-mono ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(profit)}
                  </p>
                  {upstreamContractValue > 0 && (
                    <span className={`text-sm ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      ({profitPercent.toFixed(1)}%)
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Estimated Profit</p>
              </div>
            </>
          ) : (
            /* GC/FC/TWO_PARTY mode sees only their relevant contract */
            <div className="bg-accent/10 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold font-mono text-accent">{formatCurrency(displayContractValue)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isFC ? 'Your Contract (TC → FC)' : isGC ? 'Your Contract (TC → GC)' : 'Contract Value'}
              </p>
            </div>
          )}
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-success/10 rounded-lg p-3 text-center">
              <p className="text-lg font-bold font-mono text-success">{formatCurrency(totalBilled)}</p>
              <p className="text-xs text-muted-foreground mt-1">Billed to Date</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold font-mono">{formatCurrency(outstandingAmount)}</p>
              <p className="text-xs text-muted-foreground mt-1">Outstanding</p>
            </div>
          </div>

          <div className="flex items-center justify-between bg-warning/10 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              <span className="text-sm">Retainage Held ({retainagePercent}%)</span>
            </div>
            <span className="font-mono font-semibold text-warning">{formatCurrency(retainageHeld)}</span>
          </div>

          {displayContractValue > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Billing Progress</span>
                <span>{Math.round((totalBilled / displayContractValue) * 100)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all duration-500"
                  style={{ width: `${Math.min((totalBilled / displayContractValue) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Metrics - show role-appropriate context */}
      {/* GC sees upstream (TC → GC), FC sees downstream (TC → FC), TC sees both */}
      
      {/* Upstream Metrics - visible to TC and GC only */}
      {(isTC || isGC) && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {isTC && contractMode === 'THREE_PARTY' ? 'TC → GC' : 'Activity'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Receipt className="h-4 w-4" />
                  Invoices
                </div>
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold font-mono">{formatCurrency(upstreamMetrics.invoiceTotal)}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Count</span>
                  <Badge variant="secondary" className="text-xs">{upstreamMetrics.invoiceCount}</Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Paid</span>
                  <Badge variant="outline" className="text-xs text-success border-success/30">{upstreamMetrics.paidInvoiceCount}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ClipboardList className="h-4 w-4" />
                  Change Orders
                </div>
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold font-mono">{formatCurrency(upstreamMetrics.changeOrderTotal)}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    Approved
                  </span>
                  <Badge variant="outline" className="text-xs text-success border-success/30">{upstreamMetrics.approvedCOCount}</Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-warning" />
                    Pending
                  </span>
                  <Badge variant="outline" className="text-xs text-warning border-warning/30">{upstreamMetrics.submittedCOCount}</Badge>
                </div>
              </div>
            </div>
            {upstreamMetrics.approvedCOTotal > 0 && (
              <div className="mt-3 bg-success/10 rounded-lg p-2 flex justify-between items-center">
                <span className="text-xs flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-success" />
                  Approved CO Total
                </span>
                <span className="font-mono font-semibold text-success">{formatCurrency(upstreamMetrics.approvedCOTotal)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Downstream Metrics - visible to TC and FC only (in THREE_PARTY mode) */}
      {contractMode === 'THREE_PARTY' && (isTC || isFC) && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {isTC ? 'TC → FC' : 'Activity'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Receipt className="h-4 w-4" />
                  Invoices
                </div>
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold font-mono">{formatCurrency(downstreamMetrics.invoiceTotal)}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Count</span>
                  <Badge variant="secondary" className="text-xs">{downstreamMetrics.invoiceCount}</Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Paid</span>
                  <Badge variant="outline" className="text-xs text-success border-success/30">{downstreamMetrics.paidInvoiceCount}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ClipboardList className="h-4 w-4" />
                  Change Orders
                </div>
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold font-mono">{formatCurrency(downstreamMetrics.changeOrderTotal)}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    Approved
                  </span>
                  <Badge variant="outline" className="text-xs text-success border-success/30">{downstreamMetrics.approvedCOCount}</Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-warning" />
                    Pending
                  </span>
                  <Badge variant="outline" className="text-xs text-warning border-warning/30">{downstreamMetrics.submittedCOCount}</Badge>
                </div>
              </div>
            </div>
            {downstreamMetrics.approvedCOTotal > 0 && (
              <div className="mt-3 bg-success/10 rounded-lg p-2 flex justify-between items-center">
                <span className="text-xs flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-success" />
                  Approved CO Total
                </span>
                <span className="font-mono font-semibold text-success">{formatCurrency(downstreamMetrics.approvedCOTotal)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CO Net Profit - only for TC in THREE_PARTY mode */}
      {contractMode === 'THREE_PARTY' && isTC && (upstreamMetrics.approvedCOTotal > 0 || downstreamMetrics.approvedCOTotal > 0) && (() => {
        const coNetProfit = upstreamMetrics.approvedCOTotal - downstreamMetrics.approvedCOTotal;
        const coMarginPercent = upstreamMetrics.approvedCOTotal > 0 
          ? (coNetProfit / upstreamMetrics.approvedCOTotal) * 100 
          : 0;
        return (
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  <span className="font-medium">Change Order Profit</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-accent/10 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold font-mono text-accent">{formatCurrency(upstreamMetrics.approvedCOTotal)}</p>
                  <p className="text-xs text-muted-foreground">Upstream COs</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold font-mono">{formatCurrency(downstreamMetrics.approvedCOTotal)}</p>
                  <p className="text-xs text-muted-foreground">Downstream COs</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${coNetProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                  <div className="flex items-center justify-center gap-1">
                    <p className={`text-lg font-bold font-mono ${coNetProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(coNetProfit)}
                    </p>
                    {upstreamMetrics.approvedCOTotal > 0 && (
                      <span className={`text-xs ${coNetProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        ({coMarginPercent.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Net Profit</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Total Project Profit - only for TC in THREE_PARTY mode */}
      {contractMode === 'THREE_PARTY' && isTC && (upstreamContractValue > 0 || downstreamContractValue > 0) && (() => {
        const baseProfit = upstreamContractValue - downstreamContractValue;
        const coProfit = upstreamMetrics.approvedCOTotal - downstreamMetrics.approvedCOTotal;
        const totalProfit = baseProfit + coProfit;
        const totalUpstream = upstreamContractValue + upstreamMetrics.approvedCOTotal;
        const totalMarginPercent = totalUpstream > 0 ? (totalProfit / totalUpstream) * 100 : 0;
        
        return (
          <Card className="border-0 shadow-md bg-accent/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-accent" />
                  <span className="font-medium">Total Project Profit</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-background rounded-lg p-3 text-center">
                  <p className="text-lg font-bold font-mono">{formatCurrency(baseProfit)}</p>
                  <p className="text-xs text-muted-foreground">Base Contract</p>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <p className="text-lg font-bold font-mono">{formatCurrency(coProfit)}</p>
                  <p className="text-xs text-muted-foreground">Change Orders</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${totalProfit >= 0 ? 'bg-success/20' : 'bg-destructive/20'}`}>
                  <div className="flex items-center justify-center gap-1">
                    <p className={`text-lg font-bold font-mono ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(totalProfit)}
                    </p>
                    {totalUpstream > 0 && (
                      <span className={`text-xs ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        ({totalMarginPercent.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Combined</p>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Upstream Value</span>
                  <span className="font-mono font-semibold">{formatCurrency(totalUpstream)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Downstream Cost</span>
                  <span className="font-mono font-semibold">{formatCurrency(downstreamContractValue + downstreamMetrics.approvedCOTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Team */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            Team ({teamMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members yet</p>
          ) : (
            <div className="space-y-2">
              {teamMembers.map(member => (
                <div 
                  key={member.user_id}
                  className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2"
                >
                  <span className="text-sm truncate max-w-[60%]" title={member.company_name}>
                    {member.company_name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {ROLE_LABELS[member.role] || member.role}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Scope */}
      {scopeFlags && Object.values(scopeFlags).some(Boolean) && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Project Scope</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {scopeFlags.basement && <Badge>Basement</Badge>}
              {scopeFlags.roof && <Badge>Roof</Badge>}
              {scopeFlags.decks && <Badge>Decks</Badge>}
              {scopeFlags.porches && <Badge>Porches</Badge>}
              {scopeFlags.garage && <Badge>Garage</Badge>}
              {scopeFlags.hardware_installation && <Badge>Hardware</Badge>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
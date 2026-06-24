import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Receipt,
  Clock,
  CheckCircle2,
  FileText,
  Send,
  DollarSign,
  User,
  ArrowRight,
  Percent
} from 'lucide-react';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  invoice_number: number;
  status: string;
  approval_status: string;
  submitted_at: string | null;
  paid_at: string | null;
  created_at: string;
  created_by_user_id: string;
  contract_context_id: string;
}

interface InvoiceWithTotals extends Invoice {
  grossAmount: number;
  retainageAmount: number;
  netPayable: number;
}

interface ProfileInfo {
  id: string;
  email: string;
  role: string;
  company_name: string;
}

interface InvoiceListProps {
  contractContextId?: string;
  projectId?: string;
  onSelectInvoice: (invoiceId: string) => void;
  onCreateNew: () => void;
  refreshTrigger?: number;
}

const ROLE_LABELS: Record<string, string> = {
  'FIELD_CREW': 'Field Crew',
  'TRADE_CONTRACTOR': 'Trade Contractor',
  'GC': 'General Contractor',
  'OWNER': 'Owner'
};

const INVOICE_SELECT = 'id, invoice_number, status, approval_status, submitted_at, paid_at, created_at, created_by_user_id, contract_context_id';

export default function InvoiceList({ 
  contractContextId,
  projectId,
  onSelectInvoice, 
  onCreateNew,
  refreshTrigger 
}: InvoiceListProps) {
  const [invoices, setInvoices] = useState<InvoiceWithTotals[]>([]);
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, ProfileInfo>>({});
  const [loading, setLoading] = useState(true);
  const [retainagePercent, setRetainagePercent] = useState(0);

  useEffect(() => {
    fetchInvoices();
  }, [contractContextId, projectId, refreshTrigger]);

  const fetchInvoices = async () => {
    try {
      let allInvoices: Invoice[] = [];
      const { data: user } = await supabase.auth.getUser();

      // Fetch project retainage percent
      if (projectId) {
        const { data: project } = await supabase
          .from('projects')
          .select('retainage_percent')
          .eq('id', projectId)
          .single();
        
        if (project) {
          setRetainagePercent(project.retainage_percent || 0);
        }
      }

      // If projectId is provided, fetch invoices from ALL contexts the user has access to
      if (projectId && user.user) {
        const { data: contexts, error: contextsError } = await supabase
          .from('contract_contexts')
          .select('id')
          .eq('project_id', projectId);

        // Prefer project-wide fetch, but fall back to the provided context if contexts can't be read
        const contextIds = contexts?.map((c) => c.id) ?? [];

        if (contextsError || contextIds.length === 0) {
          if (contractContextId) {
            const { data, error } = await supabase
              .from('invoices')
              .select(INVOICE_SELECT)
              .eq('contract_context_id', contractContextId)
              .order('invoice_number', { ascending: false });

            // Don't hard-fail here; GC may not have access to the default context but still needs to see pending approvals
            if (!error) allInvoices = data || [];
          }
        } else {
          const { data, error } = await supabase
            .from('invoices')
            .select(INVOICE_SELECT)
            .in('contract_context_id', contextIds)
            .order('invoice_number', { ascending: false });

          // Same: don't hard-fail before pending approvals merge
          if (!error) allInvoices = data || [];
        }

        // Also fetch invoices pending approval for the user's role (cross-context visibility)
        // Don't filter by context - RLS allows viewing pending invoices where approver_role matches
        const { data: roleData } = await supabase.rpc('get_user_project_role', {
          _project_id: projectId,
          _user_id: user.user.id,
        });

        if (roleData) {
          const { data: pendingInvoices, error: pendingError } = await supabase
            .from('invoices')
            .select(INVOICE_SELECT)
            .eq('approver_role', roleData)
            .eq('approval_status', 'NEEDS_APPROVAL')
            .order('created_at', { ascending: false });

          if (pendingError) throw pendingError;

          if (pendingInvoices) {
            const existingIds = new Set(allInvoices.map((inv) => inv.id));
            const newInvoices = pendingInvoices.filter((inv) => !existingIds.has(inv.id));
            allInvoices = [...allInvoices, ...newInvoices];
          }
        }

        // After approving/rejecting, invoices may no longer be NEEDS_APPROVAL and may also be in a different
        // contract context the approver can't normally list via contract_contexts. RLS allows "acted on" visibility,
        // so explicitly fetch them and merge into the list.
        const { data: actedOnInvoices, error: actedOnError } = await supabase
          .from('invoices')
          .select(INVOICE_SELECT)
          .or(`approved_by_user_id.eq.${user.user.id},rejected_by_user_id.eq.${user.user.id}`)
          .order('created_at', { ascending: false });

        // Don't hard-fail list rendering if this query is blocked; it will just omit acted-on items.
        if (!actedOnError && actedOnInvoices) {
          const existingIds = new Set(allInvoices.map((inv) => inv.id));
          const newInvoices = actedOnInvoices.filter((inv) => !existingIds.has(inv.id));
          allInvoices = [...allInvoices, ...newInvoices];
        }
      } else if (contractContextId) {
        // Fallback to single context fetch
        const { data, error } = await supabase
          .from('invoices')
          .select(INVOICE_SELECT)
          .eq('contract_context_id', contractContextId)
          .order('invoice_number', { ascending: false });

        if (error) throw error;
        allInvoices = data || [];
      }

      // Sort all invoices by invoice_number descending
      allInvoices.sort((a, b) => b.invoice_number - a.invoice_number);

      // Fetch line items for all invoices to calculate totals
      let invoicesWithTotals: InvoiceWithTotals[] = [];
      
      if (allInvoices.length > 0) {
        const invoiceIds = allInvoices.map(inv => inv.id);
        const { data: lineItems } = await supabase
          .from('invoice_line_items')
          .select('invoice_id, amount')
          .in('invoice_id', invoiceIds);

        // Get project retainage percent
        let projectRetainage = retainagePercent;
        if (!projectRetainage && projectId) {
          const { data: project } = await supabase
            .from('projects')
            .select('retainage_percent')
            .eq('id', projectId)
            .single();
          projectRetainage = project?.retainage_percent || 0;
        }

        // Group line items by invoice and calculate totals
        const lineItemsByInvoice: Record<string, number> = {};
        lineItems?.forEach(item => {
          lineItemsByInvoice[item.invoice_id] = (lineItemsByInvoice[item.invoice_id] || 0) + (item.amount || 0);
        });

        invoicesWithTotals = allInvoices.map(inv => {
          const grossAmount = lineItemsByInvoice[inv.id] || 0;
          const retainageAmount = grossAmount * (projectRetainage / 100);
          const netPayable = grossAmount - retainageAmount;
          return {
            ...inv,
            grossAmount,
            retainageAmount,
            netPayable
          };
        });
      }

      setInvoices(invoicesWithTotals);

      // Fetch creator profiles with company names
      if (allInvoices.length > 0) {
        const creatorIds = [...new Set(allInvoices.map(inv => inv.created_by_user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, role, company_id')
          .in('id', creatorIds);

        if (profiles) {
          // Fetch company names
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

          const profileMap: Record<string, ProfileInfo> = {};
          profiles.forEach(p => {
            profileMap[p.id] = {
              id: p.id,
              email: p.email,
              role: p.role,
              company_name: p.company_id ? companyMap[p.company_id] || p.email.split('@')[0] : p.email.split('@')[0]
            };
          });
          setCreatorProfiles(profileMap);
        }
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
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
    }).format(amount || 0);
  };

  const getStatusConfig = (approvalStatus: string, invoiceStatus: string) => {
    // Check if paid first
    if (invoiceStatus === 'PAID') {
      return { 
        icon: CheckCircle2, 
        color: 'text-success', 
        bg: 'bg-success/10',
        label: 'Paid'
      };
    }
    
    // Then check approval status
    switch (approvalStatus) {
      case 'APPROVED':
        return { 
          icon: CheckCircle2, 
          color: 'text-success', 
          bg: 'bg-success/10',
          label: 'Approved'
        };
      case 'NEEDS_APPROVAL':
        return { 
          icon: Send, 
          color: 'text-warning', 
          bg: 'bg-warning/10',
          label: 'Pending Approval'
        };
      case 'REJECTED':
        return { 
          icon: FileText, 
          color: 'text-destructive', 
          bg: 'bg-destructive/10',
          label: 'Rejected'
        };
      default:
        return { 
          icon: FileText, 
          color: 'text-muted-foreground', 
          bg: 'bg-muted',
          label: 'Draft'
        };
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-24 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button 
        variant="accent" 
        size="lg" 
        className="w-full flex items-center gap-2"
        onClick={onCreateNew}
      >
        <Receipt className="h-5 w-5" />
        Create New Invoice
      </Button>


      {invoices.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No invoices yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first invoice to start billing
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map(invoice => {
            const status = getStatusConfig(invoice.approval_status || 'DRAFT', invoice.status || 'DRAFT');
            const StatusIcon = status.icon;
            const isPaid = invoice.status === 'PAID' || invoice.paid_at !== null;
            const creatorProfile = creatorProfiles[invoice.created_by_user_id];
            const creatorName = creatorProfile?.company_name || 'Unknown';
            const creatorRole = creatorProfile?.role ? ROLE_LABELS[creatorProfile.role] || creatorProfile.role : '';

            return (
              <Card 
                key={invoice.id} 
                className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => onSelectInvoice(invoice.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${status.bg} flex items-center justify-center`}>
                        <StatusIcon className={`h-5 w-5 ${status.color}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          Invoice #{invoice.invoice_number}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                        {isPaid && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Paid
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Financial Summary */}
                  <div className="grid grid-cols-3 gap-2 mt-3 bg-muted/30 rounded-md p-2">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Gross</p>
                      <p className="text-sm font-medium text-foreground">{formatCurrency(invoice.grossAmount)}</p>
                    </div>
                    <div className="text-center border-x border-border/50">
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5">
                        <Percent className="h-3 w-3" />
                        Retainage
                      </p>
                      <p className="text-sm font-medium text-warning">{formatCurrency(invoice.retainageAmount)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Net Payable</p>
                      <p className="text-sm font-semibold text-success">{formatCurrency(invoice.netPayable)}</p>
                    </div>
                  </div>
                  
                  {/* Sender Info */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3 bg-muted/30 rounded-md px-2 py-1.5">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="font-medium truncate" title={creatorProfile?.company_name}>
                      {creatorName}
                    </span>
                    {creatorRole && (
                      <span className="text-muted-foreground/70">({creatorRole})</span>
                    )}
                    {invoice.approval_status === 'NEEDS_APPROVAL' && (
                      <>
                        <ArrowRight className="h-3 w-3 shrink-0 text-accent" />
                        <span className="font-medium">Pending Approval</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
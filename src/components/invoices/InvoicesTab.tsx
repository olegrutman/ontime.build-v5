import { useState, useEffect, useMemo } from 'react';
import { Plus, Receipt, Filter, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateInvoiceFromSOV } from './CreateInvoiceFromSOV';
import { InvoiceCard } from './InvoiceCard';
import { InvoiceDetail } from './InvoiceDetail';
import { Invoice, InvoiceStatus, INVOICE_STATUS_LABELS } from '@/types/invoice';
import { useAuth } from '@/hooks/useAuth';

interface InvoicesTabProps {
  projectId: string;
  retainagePercent: number;
}

interface Contract {
  id: string;
  from_org_id: string | null;
  to_org_id: string | null;
  from_role: string;
  to_role: string;
}

export function InvoicesTab({ projectId, retainagePercent }: InvoicesTabProps) {
  const { userOrgRoles, currentRole } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Get current user's organization ID
  const currentOrgId = userOrgRoles[0]?.organization?.id;
  const currentOrgType = userOrgRoles[0]?.organization?.type;

  // Contracts where user's org is the "from" party (can create/send invoices)
  // Invoice direction: from_org_id is the Contractor (sender), to_org_id is Client (receiver)
  const contractsWhereUserCanInvoice = useMemo(() => {
    if (!currentOrgId) return [];
    return contracts.filter(c => c.from_org_id === currentOrgId);
  }, [contracts, currentOrgId]);

  // Contracts where user is a party (can view invoices)
  const contractsWhereUserIsParty = useMemo(() => {
    if (!currentOrgId) return [];
    return contracts.filter(c => c.from_org_id === currentOrgId || c.to_org_id === currentOrgId);
  }, [contracts, currentOrgId]);

  // Can user create invoices? Only if they have contracts where they are to_org
  // General Contractors should NOT be able to create invoices (they only receive them)
  const canCreateInvoice = useMemo(() => {
    // GC should never create invoices - they only receive them
    if (currentOrgType === 'GC') return false;
    // TC can invoice GC, FC can invoice TC
    return contractsWhereUserCanInvoice.length > 0;
  }, [currentOrgType, contractsWhereUserCanInvoice]);

  useEffect(() => {
    // Fetch contracts first to know which ones belong to user
    const fetchContracts = async () => {
      const { data } = await supabase
        .from('project_contracts')
        .select('id, from_org_id, to_org_id, from_role, to_role')
        .eq('project_id', projectId);
      setContracts((data || []) as Contract[]);
    };
    fetchContracts();
  }, [projectId]);

  useEffect(() => {
    fetchInvoices();
  }, [projectId, statusFilter, contractsWhereUserIsParty]);

  const fetchInvoices = async () => {
    setLoading(true);
    let query = supabase
      .from('invoices')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      setInvoices([]);
    } else {
      // RLS already filters by contract party, but we also apply UI filter for safety
      const allInvoices = (data || []) as Invoice[];
      const contractIds = contractsWhereUserIsParty.map(c => c.id);
      const visibleInvoices = currentOrgId && contractIds.length > 0
        ? allInvoices.filter(inv => 
            !inv.contract_id || contractIds.includes(inv.contract_id)
          )
        : allInvoices;
      setInvoices(visibleInvoices);
    }
    setLoading(false);
  };

  const handleCreateSuccess = () => {
    fetchInvoices();
  };

  // Show invoice detail view
  if (selectedInvoiceId) {
    return (
      <InvoiceDetail
        invoiceId={selectedInvoiceId}
        projectId={projectId}
        onBack={() => setSelectedInvoiceId(null)}
        onUpdate={fetchInvoices}
      />
    );
  }

  // Summary stats
  const stats = {
    total: invoices.length,
    draft: invoices.filter((i) => i.status === 'DRAFT').length,
    submitted: invoices.filter((i) => i.status === 'SUBMITTED').length,
    approved: invoices.filter((i) => i.status === 'APPROVED').length,
    paid: invoices.filter((i) => i.status === 'PAID').length,
    totalBilled: invoices
      .filter((i) => i.status === 'APPROVED' || i.status === 'PAID')
      .reduce((sum, i) => sum + i.total_amount, 0),
  };

  // Determine the user's role context for messaging
  const getRoleContext = () => {
    if (currentOrgType === 'GC') {
      return { 
        canCreate: false, 
        message: 'Invoices sent to you by Trade Contractors will appear here.',
        emptyMessage: 'No invoices received yet. Trade Contractors will submit invoices for their completed work.'
      };
    }
    if (currentOrgType === 'TC') {
      return { 
        canCreate: contractsWhereUserCanInvoice.length > 0, 
        message: 'Create invoices to bill the General Contractor for completed work.',
        emptyMessage: contractsWhereUserCanInvoice.length > 0 
          ? 'Create your first invoice to start billing for completed work.'
          : 'No contract found to invoice. Accept a contract with a General Contractor first.'
      };
    }
    if (currentOrgType === 'FC') {
      return { 
        canCreate: contractsWhereUserCanInvoice.length > 0, 
        message: 'Create invoices to bill the Trade Contractor for your labor.',
        emptyMessage: contractsWhereUserCanInvoice.length > 0 
          ? 'Create your first invoice to start billing for completed work.'
          : 'No contract found to invoice. Accept a contract with a Trade Contractor first.'
      };
    }
    return { canCreate: false, message: '', emptyMessage: 'No invoices available.' };
  };

  const roleContext = getRoleContext();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Invoices</h3>
          <p className="text-sm text-muted-foreground">
            {stats.total} invoice{stats.total !== 1 ? 's' : ''} •{' '}
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(
              stats.totalBilled
            )}{' '}
            billed
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvoiceStatus | 'ALL')}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {(Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {INVOICE_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canCreateInvoice && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Role-specific info banner */}
      {roleContext.message && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{roleContext.message}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">{stats.draft}</p>
          <p className="text-xs text-muted-foreground">Draft</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.submitted}</p>
          <p className="text-xs text-muted-foreground">Pending Approval</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          <p className="text-xs text-muted-foreground">Approved</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{stats.paid}</p>
          <p className="text-xs text-muted-foreground">Paid</p>
        </div>
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/20">
          <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h4 className="text-lg font-medium mb-2">No Invoices Yet</h4>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            {roleContext.emptyMessage}
          </p>
          {canCreateInvoice && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {invoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              onClick={() => setSelectedInvoiceId(invoice.id)}
            />
          ))}
        </div>
      )}

      {/* Create Invoice Dialog */}
      <CreateInvoiceFromSOV
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { Plus, Receipt, Filter, AlertCircle, Send, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { toast } from 'sonner';
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
  from_org_name?: string | null;
  to_org_name?: string | null;
}

export function InvoicesTab({ projectId, retainagePercent }: InvoicesTabProps) {
  const { userOrgRoles } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [invoiceDirection, setInvoiceDirection] = useState<'sent' | 'received'>('sent');

  // Get current user's organization ID and type
  const currentOrgId = userOrgRoles[0]?.organization?.id;
  const currentOrgType = userOrgRoles[0]?.organization?.type;

  // TC has both sent and received invoices
  const isTCWithDualView = currentOrgType === 'TC';

  // Contracts where user's org is the "from" party (can create/send invoices)
  const contractsWhereUserCanInvoice = useMemo(() => {
    if (!currentOrgId) return [];
    return contracts.filter(c => c.from_org_id === currentOrgId);
  }, [contracts, currentOrgId]);

  // Contracts where user's org is the "to" party (receives invoices)
  const contractsWhereUserReceivesInvoices = useMemo(() => {
    if (!currentOrgId) return [];
    return contracts.filter(c => c.to_org_id === currentOrgId);
  }, [contracts, currentOrgId]);

  // Contracts where user is a party (can view invoices)
  const contractsWhereUserIsParty = useMemo(() => {
    if (!currentOrgId) return [];
    return contracts.filter(c => c.from_org_id === currentOrgId || c.to_org_id === currentOrgId);
  }, [contracts, currentOrgId]);

  // Can user create invoices? Only if they have contracts where they are from_org
  const canCreateInvoice = useMemo(() => {
    if (currentOrgType === 'GC') return false;
    return contractsWhereUserCanInvoice.length > 0;
  }, [currentOrgType, contractsWhereUserCanInvoice]);

  // Separate invoices into sent and received
  const { sentInvoices, receivedInvoices } = useMemo(() => {
    if (!currentOrgId) return { sentInvoices: [], receivedInvoices: [] };
    
    const sentContractIds = contractsWhereUserCanInvoice.map(c => c.id);
    const receivedContractIds = contractsWhereUserReceivesInvoices.map(c => c.id);
    
    const sent = invoices.filter(inv => inv.contract_id && sentContractIds.includes(inv.contract_id));
    const received = invoices.filter(inv => inv.contract_id && receivedContractIds.includes(inv.contract_id));
    
    return { sentInvoices: sent, receivedInvoices: received };
  }, [invoices, currentOrgId, contractsWhereUserCanInvoice, contractsWhereUserReceivesInvoices]);

  // Get GC org name from contracts for tab label
  const gcOrgName = useMemo(() => {
    const gcContract = contracts.find(c => c.to_role === 'General Contractor');
    return gcContract?.to_org_name || 'GC';
  }, [contracts]);

  // Current view invoices based on direction
  const currentInvoices = useMemo(() => {
    if (!isTCWithDualView) {
      // GC only receives, FC only sends
      return currentOrgType === 'GC' ? receivedInvoices : sentInvoices;
    }
    return invoiceDirection === 'sent' ? sentInvoices : receivedInvoices;
  }, [isTCWithDualView, currentOrgType, invoiceDirection, sentInvoices, receivedInvoices]);

  useEffect(() => {
    const fetchContracts = async () => {
      const { data } = await supabase
        .from('project_contracts')
        .select(`
          id, from_org_id, to_org_id, from_role, to_role,
          from_org:organizations!project_contracts_from_org_id_fkey(name),
          to_org:organizations!project_contracts_to_org_id_fkey(name)
        `)
        .eq('project_id', projectId);
      
      // Map to Contract interface with org names
      const mappedContracts: Contract[] = (data || []).map((c: any) => ({
        id: c.id,
        from_org_id: c.from_org_id,
        to_org_id: c.to_org_id,
        from_role: c.from_role,
        to_role: c.to_role,
        from_org_name: c.from_org?.name || null,
        to_org_name: c.to_org?.name || null,
      }));
      
      setContracts(mappedContracts);
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

  // Quick submit invoice from card
  const handleQuickSubmit = async (invoice: Invoice) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'SUBMITTED',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);

      if (error) throw error;
      toast.success('Invoice submitted successfully');
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit invoice');
    }
  };

  // Quick approve invoice from card
  const handleQuickApprove = async (invoice: Invoice) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'APPROVED',
          approved_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);

      if (error) throw error;
      toast.success('Invoice approved successfully');
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve invoice');
    }
  };

  // Edit invoice - opens detail view for editing
  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoiceId(invoice.id);
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

  // Calculate stats for current view
  const stats = {
    total: currentInvoices.length,
    draft: currentInvoices.filter((i) => i.status === 'DRAFT').length,
    submitted: currentInvoices.filter((i) => i.status === 'SUBMITTED').length,
    approved: currentInvoices.filter((i) => i.status === 'APPROVED').length,
    paid: currentInvoices.filter((i) => i.status === 'PAID').length,
    totalBilled: currentInvoices
      .filter((i) => i.status === 'APPROVED' || i.status === 'PAID')
      .reduce((sum, i) => sum + i.total_amount, 0),
  };

  // Role context messaging
  const getRoleContext = () => {
    if (currentOrgType === 'GC') {
      return { 
        message: 'Invoices sent to you by Trade Contractors will appear here.',
        emptyMessage: 'No invoices received yet. Trade Contractors will submit invoices for their completed work.'
      };
    }
    if (currentOrgType === 'TC') {
      if (invoiceDirection === 'sent') {
        return { 
          message: 'Invoices you send to the General Contractor for completed work.',
          emptyMessage: contractsWhereUserCanInvoice.length > 0 
            ? 'Create your first invoice to start billing the GC.'
            : 'No contract with a General Contractor found.'
        };
      } else {
        return { 
          message: 'Invoices received from Field Crews for their labor.',
          emptyMessage: 'No invoices received from Field Crews yet.'
        };
      }
    }
    if (currentOrgType === 'FC') {
      return { 
        message: 'Invoices you send to the Trade Contractor for your labor.',
        emptyMessage: contractsWhereUserCanInvoice.length > 0 
          ? 'Create your first invoice to start billing for completed work.'
          : 'No contract with a Trade Contractor found.'
      };
    }
    return { message: '', emptyMessage: 'No invoices available.' };
  };

  const roleContext = getRoleContext();

  const renderInvoiceList = () => {
    if (loading) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      );
    }

    if (currentInvoices.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/20">
          <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h4 className="text-lg font-medium mb-2">No Invoices Yet</h4>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            {roleContext.emptyMessage}
          </p>
          {canCreateInvoice && invoiceDirection === 'sent' && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          )}
        </div>
      );
    }

    // Determine if user can submit (from_org) or approve (to_org)
    const getInvoicePermissions = (invoice: Invoice) => {
      const contract = contracts.find(c => c.id === invoice.contract_id);
      const canSubmit = contract?.from_org_id === currentOrgId;
      const canApprove = contract?.to_org_id === currentOrgId;
      return { canSubmit, canApprove };
    };

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {currentInvoices.map((invoice) => {
          const { canSubmit, canApprove } = getInvoicePermissions(invoice);
          return (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              onClick={() => setSelectedInvoiceId(invoice.id)}
              onEdit={canSubmit ? handleEditInvoice : undefined}
              onSubmit={canSubmit ? handleQuickSubmit : undefined}
              onApprove={canApprove ? handleQuickApprove : undefined}
              canSubmit={canSubmit}
              canApprove={canApprove}
            />
          );
        })}
      </div>
    );
  };

  const renderSummaryCards = () => (
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
  );

  const renderHeader = (showCreateButton: boolean) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-semibold">
          {isTCWithDualView 
            ? (invoiceDirection === 'sent' ? `Sent to ${gcOrgName}` : 'Received from Field Crews')
            : 'Invoices'
          }
        </h3>
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

        {showCreateButton && canCreateInvoice && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        )}
      </div>
    </div>
  );

  // For TC: Show tabbed interface
  if (isTCWithDualView) {
    return (
      <div className="space-y-6">
        <Tabs value={invoiceDirection} onValueChange={(v) => setInvoiceDirection(v as 'sent' | 'received')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="sent" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Sent to {gcOrgName}
              {sentInvoices.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
                  {sentInvoices.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="received" className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              From Field Crews
              {receivedInvoices.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
                  {receivedInvoices.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sent" className="space-y-6 mt-6">
            {renderHeader(true)}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{roleContext.message}</AlertDescription>
            </Alert>
            {renderSummaryCards()}
            {renderInvoiceList()}
          </TabsContent>

          <TabsContent value="received" className="space-y-6 mt-6">
            {renderHeader(false)}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{roleContext.message}</AlertDescription>
            </Alert>
            {renderSummaryCards()}
            {renderInvoiceList()}
          </TabsContent>
        </Tabs>

        <CreateInvoiceFromSOV
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          projectId={projectId}
          onSuccess={handleCreateSuccess}
        />
      </div>
    );
  }

  // For GC and FC: Single view
  return (
    <div className="space-y-6">
      {renderHeader(currentOrgType !== 'GC')}

      {roleContext.message && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{roleContext.message}</AlertDescription>
        </Alert>
      )}

      {renderSummaryCards()}
      {renderInvoiceList()}

      <CreateInvoiceFromSOV
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { Plus, Receipt, Filter, AlertCircle, Send, Inbox, AlertTriangle, ArrowRight, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ViewSwitcher, ViewMode } from '@/components/ui/view-switcher';
import { CreateInvoiceFromSOV } from './CreateInvoiceFromSOV';
import { CreateInvoiceFromCOs } from './CreateInvoiceFromCOs';
import { InvoiceCard } from './InvoiceCard';
import { InvoiceTableView } from './InvoiceTableView';
import { InvoiceActionBar } from './InvoiceActionBar';
import { InvoiceDetail } from './InvoiceDetail';
import { Invoice, InvoiceStatus, INVOICE_STATUS_LABELS } from '@/types/invoice';
import { useAuth } from '@/hooks/useAuth';
import { useSOVReadiness } from '@/hooks/useSOVReadiness';
import { toast } from 'sonner';

interface InvoicesTabProps {
  projectId: string;
  retainagePercent: number;
  projectStatus?: string;
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

export function InvoicesTab({ projectId, retainagePercent, projectStatus }: InvoicesTabProps) {
  const { userOrgRoles, permissions } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [poOwnerMap, setPoOwnerMap] = useState<Record<string, { pricingOwnerOrgId: string | null; supplierOrgId: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL' | 'NEEDS_ACTION'>('ALL');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [invoiceDirection, setInvoiceDirection] = useState<'sent' | 'received'>('sent');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  // GC sub-tab: 'from_tc' or 'from_supplier'
  const [gcSubTab, setGcSubTab] = useState<'from_tc' | 'from_supplier'>('from_tc');

  const currentOrgId = userOrgRoles[0]?.organization?.id;
  const currentOrgType = userOrgRoles[0]?.organization?.type;

  const sovReadiness = useSOVReadiness(projectId, currentOrgId);

  const hasDualView = currentOrgType === 'TC' || currentOrgType === 'GC';

  const contractsWhereUserCanInvoice = useMemo(() => {
    if (!currentOrgId) return [];
    return contracts.filter(c => c.from_org_id === currentOrgId);
  }, [contracts, currentOrgId]);

  const contractsWhereUserReceivesInvoices = useMemo(() => {
    if (!currentOrgId) return [];
    return contracts.filter(c => c.to_org_id === currentOrgId);
  }, [contracts, currentOrgId]);

  const contractsWhereUserIsParty = useMemo(() => {
    if (!currentOrgId) return [];
    return contracts.filter(c => c.from_org_id === currentOrgId || c.to_org_id === currentOrgId);
  }, [contracts, currentOrgId]);

  const canCreateInvoice = useMemo(() => {
    if (currentOrgType === 'GC') return false;
    return contractsWhereUserCanInvoice.length > 0;
  }, [currentOrgType, contractsWhereUserCanInvoice]);

  const isSupplierOrg = currentOrgType === 'SUPPLIER';
  const isProjectNotActive = projectStatus && projectStatus !== 'active' && !isSupplierOrg;
  const isBlocked = isProjectNotActive || (!sovReadiness.isReady && !sovReadiness.loading);

  // Separate invoices into sent, receivedFromContracts, receivedFromSuppliers
  const { sentInvoices, receivedFromContracts, receivedFromSuppliers } = useMemo(() => {
    if (!currentOrgId) return { sentInvoices: [], receivedFromContracts: [], receivedFromSuppliers: [] };
    
    const sentContractIds = contractsWhereUserCanInvoice.map(c => c.id);
    const receivedContractIds = contractsWhereUserReceivesInvoices.map(c => c.id);
    
    const sent: Invoice[] = [];
    const recContracts: Invoice[] = [];
    const recSuppliers: Invoice[] = [];

    for (const inv of invoices) {
      if (inv.contract_id) {
        if (sentContractIds.includes(inv.contract_id)) sent.push(inv);
        else if (receivedContractIds.includes(inv.contract_id)) recContracts.push(inv);
      } else if (inv.po_id) {
        const poInfo = poOwnerMap[inv.po_id];
        if (currentOrgType === 'SUPPLIER') {
          sent.push(inv); // Supplier sees their own PO invoices as "sent"
        } else if (poInfo && poInfo.pricingOwnerOrgId === currentOrgId) {
          recSuppliers.push(inv); // Only the pricing owner sees them as "received from suppliers"
        }
        // If current org is NOT the pricing owner and NOT the supplier, invoice is excluded
      }
    }
    
    return { sentInvoices: sent, receivedFromContracts: recContracts, receivedFromSuppliers: recSuppliers };
  }, [invoices, currentOrgId, currentOrgType, contractsWhereUserCanInvoice, contractsWhereUserReceivesInvoices, poOwnerMap]);

  // Combined received for TC view
  const allReceivedInvoices = useMemo(() => 
    [...receivedFromContracts, ...receivedFromSuppliers],
    [receivedFromContracts, receivedFromSuppliers]
  );

  const gcOrgName = useMemo(() => {
    const gcContract = contracts.find(c => c.to_role === 'General Contractor');
    return gcContract?.to_org_name || 'GC';
  }, [contracts]);

  // Determine if current view is "approver" side
  const isApproverView = useMemo(() => {
    if (currentOrgType === 'GC') return true;
    if (currentOrgType === 'TC' && invoiceDirection === 'received') return true;
    return false;
  }, [currentOrgType, invoiceDirection]);

  // Current view invoices based on direction and role, with NEEDS_ACTION filter
  const currentInvoices = useMemo(() => {
    let base: Invoice[];
    if (currentOrgType === 'SUPPLIER') base = sentInvoices;
    else if (currentOrgType === 'GC') base = gcSubTab === 'from_tc' ? receivedFromContracts : receivedFromSuppliers;
    else if (currentOrgType === 'TC') base = invoiceDirection === 'sent' ? sentInvoices : allReceivedInvoices;
    else base = sentInvoices;

    if (statusFilter === 'NEEDS_ACTION') {
      const actionStatuses = isApproverView ? ['SUBMITTED'] : ['DRAFT'];
      return base.filter(i => actionStatuses.includes(i.status));
    }
    return base;
  }, [currentOrgType, gcSubTab, invoiceDirection, sentInvoices, receivedFromContracts, receivedFromSuppliers, allReceivedInvoices, statusFilter, isApproverView]);

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

    if (statusFilter !== 'ALL' && statusFilter !== 'NEEDS_ACTION') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      setInvoices([]);
    } else {
      const allInvoices = (data || []) as Invoice[];
      
      // Fetch PO ownership info for PO-linked invoices
      const poIds = [...new Set(allInvoices.filter(i => i.po_id).map(i => i.po_id!))];
      if (poIds.length > 0) {
        const { data: poData } = await supabase
          .from('purchase_orders')
          .select('id, pricing_owner_org_id, supplier:suppliers!purchase_orders_supplier_id_fkey(organization_id)')
          .in('id', poIds);
        
        const map: Record<string, { pricingOwnerOrgId: string | null; supplierOrgId: string | null }> = {};
        (poData || []).forEach((po: any) => {
          map[po.id] = {
            pricingOwnerOrgId: po.pricing_owner_org_id,
            supplierOrgId: po.supplier?.organization_id || null,
          };
        });
        setPoOwnerMap(map);
      }

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

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoiceId(invoice.id);
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    try {
      // Delete line items first, then the invoice
      const { error: lineError } = await supabase
        .from('invoice_line_items')
        .delete()
        .eq('invoice_id', invoice.id);
      if (lineError) throw lineError;

      const { error: invError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id);
      if (invError) throw invError;

      toast.success(`Invoice ${invoice.invoice_number} deleted`);
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete invoice');
    }
  };

  // Unfiltered invoices for action bar (always shows full picture)
  const unfilteredInvoices = useMemo(() => {
    if (currentOrgType === 'SUPPLIER') return sentInvoices;
    if (currentOrgType === 'GC') return gcSubTab === 'from_tc' ? receivedFromContracts : receivedFromSuppliers;
    if (currentOrgType === 'TC') return invoiceDirection === 'sent' ? sentInvoices : allReceivedInvoices;
    return sentInvoices;
  }, [currentOrgType, gcSubTab, invoiceDirection, sentInvoices, receivedFromContracts, receivedFromSuppliers, allReceivedInvoices]);

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

  const getRoleContext = () => {
    if (currentOrgType === 'GC') {
      if (gcSubTab === 'from_tc') {
        return { 
          message: 'Invoices sent to you by Trade Contractors for completed work.',
          emptyMessage: 'No invoices received from Trade Contractors yet.'
        };
      } else {
        return { 
          message: 'Invoices sent to you by Suppliers for materials and deliveries.',
          emptyMessage: 'No invoices received from Suppliers yet.'
        };
      }
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
          message: 'Invoices received from Field Crews and Suppliers.',
          emptyMessage: 'No invoices received from Field Crews or Suppliers yet.'
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
    if (currentOrgType === 'SUPPLIER') {
      return { 
        message: 'Invoices you have sent for materials and deliveries.',
        emptyMessage: 'No invoices created yet. Create an invoice from a Purchase Order.'
      };
    }
    return { message: '', emptyMessage: 'No invoices available.' };
  };

  const roleContext = getRoleContext();

  const getInvoicePermissions = (invoice: Invoice) => {
    if (invoice.contract_id) {
      const contract = contracts.find(c => c.id === invoice.contract_id);
      const canSubmit = contract?.from_org_id === currentOrgId;
      const canApprove = contract?.to_org_id === currentOrgId && (permissions?.canApprove ?? false);
      return { canSubmit, canApprove };
    }
    // PO-based supplier invoice
    if (currentOrgType === 'SUPPLIER') {
      return { canSubmit: true, canApprove: false };
    }
    // GC/TC can approve PO-based invoices
    return { canSubmit: false, canApprove: permissions?.canApprove ?? false };
  };

  const renderInvoiceList = () => {
    if (loading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          {canCreateInvoice && (currentOrgType !== 'TC' || invoiceDirection === 'sent') && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          )}
        </div>
      );
    }

    if (viewMode === 'table') {
      return (
        <InvoiceTableView
          invoices={currentInvoices}
          onView={(inv) => setSelectedInvoiceId(inv.id)}
          onEdit={handleEditInvoice}
          onSubmit={handleQuickSubmit}
          onApprove={handleQuickApprove}
          onDelete={handleDeleteInvoice}
          getPermissions={getInvoicePermissions}
        />
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              onDelete={canSubmit ? handleDeleteInvoice : undefined}
              canSubmit={canSubmit}
              canApprove={canApprove}
            />
          );
        })}
      </div>
    );
  };

  const renderSOVAlert = () => {
    if (!isBlocked) return null;
    return (
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">SOV Setup Required</AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300 flex items-center justify-between">
          <span>{sovReadiness.message}</span>
          <Button
            variant="outline"
            size="sm"
            className="ml-4 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/50"
            onClick={() => {
              const sovTabButton = document.querySelector('[data-value="sov"]') as HTMLButtonElement;
              if (sovTabButton) sovTabButton.click();
            }}
          >
            Go to SOV Tab
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  };

  const renderHeader = (showCreateButton: boolean, title?: string) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h3 className="text-xl font-semibold">{title || 'Invoices'}</h3>
        <p className="text-sm text-muted-foreground">
          {currentInvoices.length} invoice{currentInvoices.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <ViewSwitcher
          value={viewMode}
          onChange={setViewMode}
          availableModes={['table', 'list']}
        />

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvoiceStatus | 'ALL' | 'NEEDS_ACTION')}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="NEEDS_ACTION">⚡ Needs My Action</SelectItem>
            {(Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {INVOICE_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showCreateButton && canCreateInvoice && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button onClick={() => setCreateDialogOpen(true)} disabled={isBlocked}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Invoice
                  </Button>
                </span>
              </TooltipTrigger>
              {isBlocked && (
                <TooltipContent>
                  <p>Create SOVs for all contracts first</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );

  const renderTabContent = (showCreate: boolean, title?: string) => (
    <div className="space-y-6">
      {renderSOVAlert()}
      {renderHeader(showCreate, title)}
      <InvoiceActionBar invoices={unfilteredInvoices} isApprover={isApproverView} />
      {renderInvoiceList()}
    </div>
  );

  // GC: tabbed view separating TC invoices from Supplier invoices
  if (currentOrgType === 'GC') {
    return (
      <div className="space-y-6">
        {isProjectNotActive && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">Project Setup Incomplete</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Project setup incomplete. Waiting for required parties.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={gcSubTab} onValueChange={(v) => setGcSubTab(v as 'from_tc' | 'from_supplier')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="from_tc" className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              From Trade Contractors
              {receivedFromContracts.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
                  {receivedFromContracts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="from_supplier" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              From Suppliers
              {receivedFromSuppliers.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
                  {receivedFromSuppliers.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="from_tc" className="mt-6">
            {renderTabContent(false, 'From Trade Contractors')}
          </TabsContent>

          <TabsContent value="from_supplier" className="mt-6">
            {renderTabContent(false, 'From Suppliers')}
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

  // TC: tabbed view — Sent to GC / Received from FC & Suppliers
  if (currentOrgType === 'TC') {
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
              From Field Crews & Suppliers
              {allReceivedInvoices.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
                  {allReceivedInvoices.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sent" className="mt-6">
            {renderTabContent(true, `Sent to ${gcOrgName}`)}
          </TabsContent>

          <TabsContent value="received" className="mt-6">
            {renderTabContent(false, 'From Field Crews & Suppliers')}
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

  // FC and SUPPLIER: Single view (sent invoices)
  return (
    <div className="space-y-6">
      {isProjectNotActive && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">Project Setup Incomplete</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Project setup incomplete. Waiting for required parties.
          </AlertDescription>
        </Alert>
      )}

      {renderSOVAlert()}
      {renderHeader(true)}

      <InvoiceActionBar invoices={unfilteredInvoices} isApprover={isApproverView} />
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

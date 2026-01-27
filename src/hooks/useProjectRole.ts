import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ProjectRole = 'General Contractor' | 'Trade Contractor' | 'Field Crew' | null;

interface Contract {
  id: string;
  from_role: string;
  to_role: string;
  from_org_id: string | null;
  to_org_id: string | null;
  contract_sum: number | null;
  retainage_percent: number | null;
  trade: string | null;
}

interface WorkOrderSummary {
  total: number;
  approved: number;
  pending: number;
  approvedAmount: number;
  pendingAmount: number;
  totalAmount: number;
}

interface InvoiceSummary {
  invoicedAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  retainageHeld: number;
  receivedAmount: number;
  invoicesReceived: number;
  invoicesSent: number;
}

export interface ProjectRoleData {
  role: ProjectRole;
  orgId: string | null;
  contracts: {
    upstream: Contract | null;  // Contract where user receives work (to_org)
    downstream: Contract | null; // Contract where user gives work (from_org)
  };
  workOrders: WorkOrderSummary;
  invoices: InvoiceSummary;
  estimatedProfit: number;
  workOrderProfit: number;
  loading: boolean;
}

export function useProjectRole(projectId: string): ProjectRoleData {
  const { userOrgRoles } = useAuth();
  const currentOrgId = userOrgRoles[0]?.organization?.id || null;
  const currentOrgType = userOrgRoles[0]?.organization?.type || null;

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderSummary>({
    total: 0,
    approved: 0,
    pending: 0,
    approvedAmount: 0,
    pendingAmount: 0,
    totalAmount: 0,
  });
  const [invoices, setInvoices] = useState<InvoiceSummary>({
    invoicedAmount: 0,
    paidAmount: 0,
    outstandingAmount: 0,
    retainageHeld: 0,
    receivedAmount: 0,
    invoicesReceived: 0,
    invoicesSent: 0,
  });
  const [loading, setLoading] = useState(true);

  // Map org type to project role
  const role: ProjectRole = useMemo(() => {
    if (!currentOrgType) return null;
    switch (currentOrgType) {
      case 'GC': return 'General Contractor';
      case 'TC': return 'Trade Contractor';
      case 'FC': return 'Field Crew';
      default: return null;
    }
  }, [currentOrgType]);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId || !currentOrgId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // Fetch contracts
        const { data: contractData } = await supabase
          .from('project_contracts')
          .select('id, from_role, to_role, from_org_id, to_org_id, contract_sum, retainage_percent, trade')
          .eq('project_id', projectId);

        setContracts((contractData || []) as Contract[]);

        // Fetch work orders
        const { data: workOrderData } = await supabase
          .from('change_order_projects')
          .select('id, status, final_price')
          .eq('project_id', projectId);

        const orders = workOrderData || [];
        const approved = orders.filter(o => o.status === 'APPROVED');
        const pending = orders.filter(o => ['DRAFT', 'PENDING', 'PRICED'].includes(o.status));
        
        setWorkOrders({
          total: orders.length,
          approved: approved.length,
          pending: pending.length,
          approvedAmount: approved.reduce((sum, o) => sum + (o.final_price || 0), 0),
          pendingAmount: pending.reduce((sum, o) => sum + (o.final_price || 0), 0),
          totalAmount: orders.reduce((sum, o) => sum + (o.final_price || 0), 0),
        });

        // Fetch invoices with contract info
        const { data: invoiceData } = await supabase
          .from('invoices')
          .select(`
            id, 
            status, 
            total_amount, 
            retainage_amount,
            contract_id,
            project_contracts!invoices_contract_id_fkey (
              from_org_id,
              to_org_id
            )
          `)
          .eq('project_id', projectId);

        const allInvoices = invoiceData || [];
        
        // Invoices sent by this org (from_org = currentOrgId)
        const sentInvoices = allInvoices.filter((inv: any) => 
          inv.project_contracts?.from_org_id === currentOrgId
        );
        
        // Invoices received by this org (to_org = currentOrgId)
        const receivedInvoices = allInvoices.filter((inv: any) => 
          inv.project_contracts?.to_org_id === currentOrgId
        );

        const invoiced = sentInvoices
          .filter((inv: any) => ['SUBMITTED', 'APPROVED', 'PAID'].includes(inv.status))
          .reduce((sum, inv: any) => sum + (inv.total_amount || 0), 0);
        
        const paid = sentInvoices
          .filter((inv: any) => inv.status === 'PAID')
          .reduce((sum, inv: any) => sum + (inv.total_amount || 0), 0);
        
        const retainage = sentInvoices
          .filter((inv: any) => ['APPROVED', 'PAID'].includes(inv.status))
          .reduce((sum, inv: any) => sum + (inv.retainage_amount || 0), 0);

        const received = receivedInvoices
          .filter((inv: any) => ['SUBMITTED', 'APPROVED', 'PAID'].includes(inv.status))
          .reduce((sum, inv: any) => sum + (inv.total_amount || 0), 0);

        setInvoices({
          invoicedAmount: invoiced,
          paidAmount: paid,
          outstandingAmount: invoiced - paid,
          retainageHeld: retainage,
          receivedAmount: received,
          invoicesReceived: receivedInvoices.length,
          invoicesSent: sentInvoices.length,
        });

      } catch (error) {
        console.error('Error fetching project role data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, currentOrgId]);

  // Determine upstream/downstream contracts relative to user's org
  const contractInfo = useMemo(() => {
    if (!currentOrgId) return { upstream: null, downstream: null };

    // Upstream: where we are to_org (receiving work/billing upstream)
    const upstream = contracts.find(c => c.to_org_id === currentOrgId) || null;
    
    // Downstream: where we are from_org (giving work/receiving invoices)
    const downstream = contracts.find(c => c.from_org_id === currentOrgId) || null;

    return { upstream, downstream };
  }, [contracts, currentOrgId]);

  // Calculate estimated profit (TC only: upstream contract - downstream contract)
  const estimatedProfit = useMemo(() => {
    if (role !== 'Trade Contractor') return 0;
    const upstreamValue = contractInfo.upstream?.contract_sum || 0;
    const downstreamValue = contractInfo.downstream?.contract_sum || 0;
    return upstreamValue - downstreamValue;
  }, [role, contractInfo]);

  // Calculate work order profit (TC only: GC approved WOs - FC approved WOs)
  // For now, just use approved amounts as we don't have per-contract WO tracking
  const workOrderProfit = useMemo(() => {
    if (role !== 'Trade Contractor') return 0;
    // TODO: Implement proper per-contract work order tracking
    return 0;
  }, [role]);

  return {
    role,
    orgId: currentOrgId,
    contracts: contractInfo,
    workOrders,
    invoices,
    estimatedProfit,
    workOrderProfit,
    loading,
  };
}

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';


export type ViewerRole = 'Trade Contractor' | 'General Contractor' | 'Field Crew' | 'Supplier';

interface Contract {
  id: string;
  from_role: string;
  to_role: string;
  contract_sum: number;
  retainage_percent: number;
  trade: string | null;
  from_org_id: string | null;
  to_org_id: string | null;
  from_org_name?: string | null;
  to_org_name?: string | null;
}

export interface ProjectFinancials {
  loading: boolean;
  viewerRole: ViewerRole;
  contracts: Contract[];
  upstreamContract: Contract | undefined;
  downstreamContract: Contract | undefined;
  userOrgIds: string[];

  // Aggregated metrics
  billedToDate: number;
  workOrderTotal: number;
  approvedWOCount: number;
  workOrderFCCost: number;
  tcInternalCostTotal: number;
  fcWorkOrderEarnings: number;
  retainageAmount: number;
  outstanding: number;
  materialEstimate: number;
  materialOrdered: number;
  totalPaidToFC: number;
  materialEstimateTotal: number | null;
  approvedEstimateSum: number;

  // NEW: Financial command center fields
  totalPaid: number;
  materialDelivered: number;
  materialOrderedPending: number;
  actualLaborCost: number;
  laborBudget: number | null;

  // Role-based financial overview fields
  ownerContractValue: number | null;
  materialMarkupType: string | null;
  materialMarkupValue: number | null;
  woLaborTotal: number;
  woMaterialTotal: number;
  woEquipmentTotal: number;

  // Supplier-specific
  supplierOrderValue: number;
  supplierInvoiced: number;
  supplierPaid: number;

  // TC split billing
  receivablesInvoiced: number;
  receivablesCollected: number;
  receivablesRetainage: number;
  payablesInvoiced: number;
  payablesPaid: number;
  payablesRetainage: number;

  // Invoices for charts/lists
  recentInvoices: { id: string; invoice_number: string; status: string; total_amount: number; created_at: string }[];

  // FC participants (for contract creation)
  fcParticipants: { org_id: string; org_name: string }[];

  // Material responsibility
  isTCMaterialResponsible: boolean;
  isGCMaterialResponsible: boolean;

  // Designated supplier
  isDesignatedSupplier: boolean;

  // TC self-performing flag
  isTCSelfPerforming: boolean;

  // Actions
  refetch: () => void;
  updateContract: (id: string, sum: number, retainage: number) => Promise<boolean>;
  createFcContract: (fcOrgId: string, sum: number, retainage: number) => Promise<boolean>;
  updateMaterialEstimate: (contractId: string, amount: number) => Promise<boolean>;
  updateLaborBudget: (contractId: string, amount: number) => Promise<boolean>;
  updateOwnerContract: (contractId: string, value: number) => Promise<boolean>;
  updateMaterialMarkup: (contractId: string, type: string, value: number) => Promise<boolean>;
}

export function useProjectFinancials(projectId: string, isSupplier?: boolean, supplierOrgId?: string | null): ProjectFinancials {
  const { user, userOrgRoles } = useAuth();
  const [loading, setLoading] = useState(true);
  const [viewerRole, setViewerRole] = useState<ViewerRole>('Trade Contractor');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [userOrgIds, setUserOrgIds] = useState<string[]>([]);
  const [billedToDate, setBilledToDate] = useState(0);
  const [workOrderTotal, setWorkOrderTotal] = useState(0);
  const [workOrderFCCost, setWorkOrderFCCost] = useState(0);
  const [tcInternalCostTotal, setTcInternalCostTotal] = useState(0);
  const [fcWorkOrderEarnings, setFcWorkOrderEarnings] = useState(0);
  const [materialEstimate, setMaterialEstimate] = useState(0);
  const [materialOrdered, setMaterialOrdered] = useState(0);
  const [totalPaidToFC, setTotalPaidToFC] = useState(0);
  const [supplierOrderValue, setSupplierOrderValue] = useState(0);
  const [supplierInvoiced, setSupplierInvoiced] = useState(0);
  const [supplierPaid, setSupplierPaid] = useState(0);
  const [recentInvoices, setRecentInvoices] = useState<ProjectFinancials['recentInvoices']>([]);
  const [fcParticipants, setFcParticipants] = useState<{ org_id: string; org_name: string }[]>([]);
  const [materialEstimateTotal, setMaterialEstimateTotal] = useState<number | null>(null);
  const [isTCMaterialResponsible, setIsTCMaterialResponsible] = useState(false);
  const [isGCMaterialResponsible, setIsGCMaterialResponsible] = useState(false);
  const [approvedEstimateSum, setApprovedEstimateSum] = useState(0);
  const [isDesignatedSupplier, setIsDesignatedSupplier] = useState(false);
  const [isTCSelfPerforming, setIsTCSelfPerforming] = useState(false);
  const [totalPaid, setTotalPaid] = useState(0);
  const [materialDelivered, setMaterialDelivered] = useState(0);
  const [materialOrderedPending, setMaterialOrderedPending] = useState(0);
  const [actualLaborCost, setActualLaborCost] = useState(0);
  const [laborBudget, setLaborBudget] = useState<number | null>(null);
  const [approvedWOCount, setApprovedWOCount] = useState(0);
  const [ownerContractValue, setOwnerContractValue] = useState<number | null>(null);
  const [materialMarkupType, setMaterialMarkupType] = useState<string | null>(null);
  const [materialMarkupValue, setMaterialMarkupValue] = useState<number | null>(null);
  const [woLaborTotal, setWoLaborTotal] = useState(0);
  const [woMaterialTotal, setWoMaterialTotal] = useState(0);
  const [woEquipmentTotal, setWoEquipmentTotal] = useState(0);
  const [receivablesInvoiced, setReceivablesInvoiced] = useState(0);
  const [receivablesCollected, setReceivablesCollected] = useState(0);
  const [receivablesRetainage, setReceivablesRetainage] = useState(0);
  const [payablesInvoiced, setPayablesInvoiced] = useState(0);
  const [payablesPaid, setPayablesPaid] = useState(0);
  const [payablesRetainage, setPayablesRetainage] = useState(0);

  const fetchData = async () => {
    if (!user || !projectId) { setLoading(false); return; }
    setLoading(true);

    try {
      // 1. Determine viewer role
      const { data: memberships } = await supabase
        .from('user_org_roles')
        .select('organization_id')
        .eq('user_id', user.id);
      const orgIds = (memberships || []).map(m => m.organization_id);
      setUserOrgIds(orgIds);

      let detectedRole: ViewerRole = 'Trade Contractor';
      if (isSupplier) {
        detectedRole = 'Supplier';
      } else if (orgIds.length > 0) {
        const { data: teamMembers } = await supabase
          .from('project_team')
          .select('role, org_id, is_self_performing')
          .eq('project_id', projectId)
          .in('org_id', orgIds);
        if (teamMembers && teamMembers.length > 0) {
          detectedRole = teamMembers[0].role as ViewerRole;
          // Check if TC is self-performing
          const tcRow = teamMembers.find((m: any) => m.role === 'Trade Contractor');
          if (tcRow && (tcRow as any).is_self_performing) {
            setIsTCSelfPerforming(true);
          } else {
            setIsTCSelfPerforming(false);
          }
        }
      }
      setViewerRole(detectedRole);

      // 2. Supplier path
      if (detectedRole === 'Supplier' && supplierOrgId) {
        const { data: supplierData } = await supabase
          .from('suppliers')
          .select('id')
          .eq('organization_id', supplierOrgId)
          .maybeSingle();
        const supplierId = supplierData?.id;
        if (supplierId) {
          const [posRes, invRes] = await Promise.all([
            supabase.from('purchase_orders').select('id, po_line_items(line_total)').eq('project_id', projectId).eq('supplier_id', supplierId).in('status', ['ORDERED', 'DELIVERED']),
            supabase.from('invoices').select('id, invoice_number, status, total_amount, created_at, po_id').eq('project_id', projectId),
          ]);
          const pos = posRes.data || [];
          const orderVal = pos.reduce((sum, po: any) => sum + ((po.po_line_items || []).reduce((s: number, li: any) => s + (li.line_total || 0), 0)), 0);
          setSupplierOrderValue(orderVal);

          const poIds = pos.map(p => p.id);
          const relevantInvoices = (invRes.data || []).filter((inv: any) => inv.po_id && poIds.includes(inv.po_id));
          setSupplierInvoiced(relevantInvoices.reduce((s, inv: any) => s + (inv.total_amount || 0), 0));
          setSupplierPaid(relevantInvoices.filter((i: any) => i.status === 'PAID').reduce((s, inv: any) => s + (inv.total_amount || 0), 0));
          setRecentInvoices((invRes.data || []).slice(0, 5).map((inv: any) => ({
            id: inv.id, invoice_number: inv.invoice_number, status: inv.status, total_amount: inv.total_amount, created_at: inv.created_at,
          })));
        }
        setLoading(false);
        return;
      }

      // 3. Non-supplier: fetch all in parallel
      const [contractsRes, invoicesRes, workOrdersRes, fcParticipantsRes] = await Promise.all([
        supabase.from('project_contracts').select(`
          id, from_role, to_role, contract_sum, retainage_percent, trade, from_org_id, to_org_id,
          material_responsibility, material_estimate_total, labor_budget,
          owner_contract_value, material_markup_type, material_markup_value,
          from_org:organizations!project_contracts_from_org_id_fkey(name),
          to_org:organizations!project_contracts_to_org_id_fkey(name)
        `).eq('project_id', projectId),
        supabase.from('invoices').select('id, invoice_number, status, subtotal, total_amount, created_at, paid_at, contract_id, po_id, retainage_amount').eq('project_id', projectId),
        supabase.from('change_order_projects').select('id, title, status, created_at, final_price, material_total, labor_total, equipment_total, linked_po_id, tc_internal_cost').eq('project_id', projectId),
        supabase.from('project_participants').select('organization_id, organizations:organization_id(name)').eq('project_id', projectId).eq('role', 'FC').eq('invite_status', 'ACCEPTED'),
      ]);

      // Contracts
      const contractsWithNames = (contractsRes.data || []).map((c: any) => ({
        ...c, from_org_name: c.from_org?.name || null, to_org_name: c.to_org?.name || null,
      })) as Contract[];
      setContracts(contractsWithNames);

      // Detect material responsibility
      if (detectedRole === 'Trade Contractor' && orgIds.length > 0) {
        const tcContract = contractsWithNames.find((c: any) =>
          c.material_responsibility === 'TC' &&
          (orgIds.includes(c.from_org_id || '') || orgIds.includes(c.to_org_id || ''))
        );
        if (tcContract) {
          setIsTCMaterialResponsible(true);
          setMaterialEstimateTotal((tcContract as any).material_estimate_total ?? null);
        }
      }
      if (detectedRole === 'General Contractor' && orgIds.length > 0) {
        const gcContract = contractsWithNames.find((c: any) =>
          c.material_responsibility === 'GC' &&
          (orgIds.includes(c.from_org_id || '') || orgIds.includes(c.to_org_id || ''))
        );
        if (gcContract) {
          setIsGCMaterialResponsible(true);
          setMaterialEstimateTotal((gcContract as any).material_estimate_total ?? null);
        }
      }

      // Fetch approved estimate sum as fallback for material budget
      const { data: approvedEsts } = await supabase
        .from('supplier_estimates')
        .select('total_amount')
        .eq('project_id', projectId)
        .eq('status', 'APPROVED');
      const estSum = (approvedEsts || []).reduce((s: number, e: any) => s + (e.total_amount || 0), 0);
      setApprovedEstimateSum(estSum);

      // If material_estimate_total is null but we have approved estimates, use that as materialEstimate
      const materialEstTotalFromContract = contractsWithNames.find((c: any) =>
        c.material_responsibility != null &&
        (detectedRole === 'Trade Contractor'
          ? (orgIds.includes(c.from_org_id || '') || orgIds.includes(c.to_org_id || ''))
          : true)
      );
      const matEstTotalValue = (materialEstTotalFromContract as any)?.material_estimate_total ?? null;
      if (matEstTotalValue == null && estSum > 0) {
        // No manual override set, use estimate sum
        setMaterialEstimate(estSum);
      }

      // Detect designated supplier
      if (user) {
        const { data: designatedRows } = await supabase
          .from('project_designated_suppliers')
          .select('id')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
        setIsDesignatedSupplier(!!designatedRows);
      }


      const allInvoices = invoicesRes.data || [];
      const submitted = allInvoices.filter(i => ['SUBMITTED', 'APPROVED', 'PAID'].includes(i.status));
      setBilledToDate(submitted.reduce((sum, inv) => sum + (inv.total_amount || 0), 0));
      // Total paid invoices
      const paidInvoices = allInvoices.filter(i => i.status === 'PAID');
      setTotalPaid(paidInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0));
      setRecentInvoices(allInvoices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5).map(inv => ({
        id: inv.id, invoice_number: inv.invoice_number, status: inv.status, total_amount: inv.total_amount, created_at: inv.created_at,
      })));

      // TC split: classify invoices as receivables vs payables
      if (detectedRole === 'Trade Contractor' && orgIds.length > 0) {
        // Receivables = invoices on contracts where TC is from_org (TC billed GC)
        // Payables = invoices on contracts where TC is to_org (FC billed TC) OR po_id set (supplier)
        const upstreamContractIds = new Set(
          contractsWithNames
            .filter(c => c.from_org_id && orgIds.includes(c.from_org_id))
            .map(c => c.id)
        );
        const downstreamContractIds = new Set(
          contractsWithNames
            .filter(c => c.to_org_id && orgIds.includes(c.to_org_id) && c.from_role === 'Field Crew')
            .map(c => c.id)
        );

        const receivableInvs = submitted.filter((inv: any) => inv.contract_id && upstreamContractIds.has(inv.contract_id));

        // Fetch PO ownership to filter supplier invoices by pricing_owner_org_id
        const poLinkedInvs = submitted.filter((inv: any) => inv.po_id);
        const poIds = [...new Set(poLinkedInvs.map((inv: any) => inv.po_id as string))];
        let poOwnerMap = new Map<string, string>();
        if (poIds.length > 0) {
          const { data: poOwners } = await supabase
            .from('purchase_orders')
            .select('id, pricing_owner_org_id')
            .in('id', poIds);
          poOwnerMap = new Map((poOwners || []).map(po => [po.id, po.pricing_owner_org_id || '']));
        }

        const payableInvs = submitted.filter((inv: any) =>
          (inv.contract_id && downstreamContractIds.has(inv.contract_id)) ||
          (inv.po_id && poOwnerMap.has(inv.po_id) && orgIds.includes(poOwnerMap.get(inv.po_id)!))
        );

        setReceivablesInvoiced(receivableInvs.reduce((s, i: any) => s + (i.subtotal || 0), 0));
        setReceivablesCollected(receivableInvs.filter(i => i.status === 'PAID').reduce((s, i) => s + (i.total_amount || 0), 0));
        setReceivablesRetainage(receivableInvs.reduce((s, i: any) => s + (i.retainage_amount || 0), 0));
        setPayablesInvoiced(payableInvs.reduce((s, i: any) => s + (i.subtotal || 0), 0));
        setPayablesPaid(payableInvs.filter(i => i.status === 'PAID').reduce((s, i) => s + (i.total_amount || 0), 0));
        setPayablesRetainage(payableInvs.reduce((s, i: any) => s + (i.retainage_amount || 0), 0));
      }

      // Work orders — only sum approved/contracted for contract total
      const wos = workOrdersRes.data || [];
      const approvedWOs = wos.filter(wo => ['approved', 'contracted'].includes(wo.status));
      const woTotal = approvedWOs.reduce((sum: number, wo: any) => sum + (wo.final_price || 0), 0);
      setWorkOrderTotal(woTotal);
      setApprovedWOCount(approvedWOs.length);
      setRecentWorkOrders(wos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5).map(wo => ({
        id: wo.id, title: wo.title, status: wo.status, created_at: wo.created_at, final_price: wo.final_price,
      })));

      // Material estimates vs ordered
      const matEstimate = wos.reduce((sum, wo) => sum + (wo.material_total || 0), 0);
      // Use material_estimate_total from the material-responsible contract (GC or TC) if set
      const materialContract = (contractsRes.data || []).find((c: any) =>
        c.material_responsibility != null && c.material_estimate_total != null &&
        (detectedRole === 'Trade Contractor'
          ? (orgIds.includes(c.from_org_id || '') || orgIds.includes(c.to_org_id || ''))
          : true)
      );
      const contractMatEst = materialContract ? (materialContract as any).material_estimate_total : null;
      setMaterialEstimate(contractMatEst != null ? contractMatEst : (estSum > 0 ? estSum : matEstimate));

      const { data: orderedPOs } = await supabase
        .from('purchase_orders')
        .select('id, status, sales_tax_percent, po_line_items(line_total)')
        .eq('project_id', projectId)
        .in('status', ['ORDERED', 'DELIVERED']);

      const calcPOTotal = (pos: any[]) => pos.reduce((sum, po: any) => {
        const subtotal = (po.po_line_items || []).reduce((s: number, li: any) => s + (li.line_total || 0), 0);
        const taxRate = (po.sales_tax_percent || 0) / 100;
        return sum + subtotal * (1 + taxRate);
      }, 0);

      const allPOs = orderedPOs || [];
      const matOrdered = calcPOTotal(allPOs);
      setMaterialOrdered(matOrdered);

      // Split by delivery status
      const deliveredPOs = allPOs.filter((po: any) => po.status === 'DELIVERED');
      const pendingPOs = allPOs.filter((po: any) => po.status === 'ORDERED');
      setMaterialDelivered(calcPOTotal(deliveredPOs));
      setMaterialOrderedPending(calcPOTotal(pendingPOs));

      // Actual labor cost from approved/contracted work orders (reuse already-filtered list)
      const laborCost = approvedWOs.reduce((sum, wo: any) => sum + (wo.labor_total || 0), 0);
      setActualLaborCost(laborCost);

      // Labor budget from primary contract
      const primaryC = contractsWithNames.find(c =>
        ((c.from_role === 'General Contractor' && c.to_role === 'Trade Contractor') ||
         (c.to_role === 'General Contractor' && c.from_role === 'Trade Contractor')) &&
        c.trade !== 'Work Order' && c.trade !== 'Work Order Labor'
      );
      // FC reads labor budget from TC↔FC contract; others from GC↔TC
      if (detectedRole === 'Field Crew') {
        const fcContract = contractsWithNames.find(c =>
          ((c.from_role === 'Trade Contractor' && c.to_role === 'Field Crew') ||
           (c.to_role === 'Trade Contractor' && c.from_role === 'Field Crew')) &&
          c.trade !== 'Work Order' && c.trade !== 'Work Order Labor'
        );
        setLaborBudget((fcContract as any)?.labor_budget ?? null);
      } else {
        setLaborBudget((primaryC as any)?.labor_budget ?? null);
      }

      // Extract owner_contract_value and material markup from primary contract
      setOwnerContractValue((primaryC as any)?.owner_contract_value ?? null);
      setMaterialMarkupType((primaryC as any)?.material_markup_type ?? null);
      setMaterialMarkupValue((primaryC as any)?.material_markup_value ?? null);

      // WO breakdowns (labor, material, equipment) from approved WOs
      const woLabor = approvedWOs.reduce((sum, wo: any) => sum + (wo.labor_total || 0), 0);
      const woMaterial = approvedWOs.reduce((sum, wo: any) => sum + (wo.material_total || 0), 0);
      const woEquipment = approvedWOs.reduce((sum, wo: any) => sum + (wo.equipment_total || 0), 0);
      setWoLaborTotal(woLabor);
      setWoMaterialTotal(woMaterial);
      setWoEquipmentTotal(woEquipment);

      // FC-specific WO earnings (Bug 1/7: FC needs their own hours, not full WO price)
      if (detectedRole === 'Field Crew') {
        const approvedWOIds = approvedWOs.map(wo => wo.id);
        if (approvedWOIds.length > 0) {
          const { data: fcHoursData } = await supabase
            .from('change_order_fc_hours')
            .select('labor_total')
            .in('change_order_id', approvedWOIds);
          const fcEarnings = (fcHoursData || []).reduce((sum, fc) => sum + (fc.labor_total || 0), 0);
          setFcWorkOrderEarnings(fcEarnings);
        }
      }

      // FC costs (TC view)
      if (detectedRole === 'Trade Contractor') {
        const woIds = wos.map(wo => wo.id);
        if (woIds.length > 0) {
          const { data: fcHours } = await supabase.from('change_order_fc_hours').select('labor_total').in('change_order_id', woIds);
          setWorkOrderFCCost((fcHours || []).reduce((sum, fc) => sum + (fc.labor_total || 0), 0));
        }

        // Sum tc_internal_cost for self-performing WOs
        const tcIntCost = approvedWOs.reduce((sum, wo: any) => sum + (wo.tc_internal_cost || 0), 0);
        setTcInternalCostTotal(tcIntCost);

        // Total paid to FC from invoices
        const paidInvoices = allInvoices.filter(i => i.status === 'PAID');
        setTotalPaidToFC(paidInvoices.reduce((s, i) => s + (i.total_amount || 0), 0));

        // Monthly margin trend (approved WOs by month)
        const approvedWOsForTrend = wos.filter(wo => ['approved', 'contracted'].includes(wo.status));
        const byMonth = new Map<string, { revenue: number; cost: number }>();
        for (const wo of approvedWOsForTrend) {
          const month = wo.created_at.slice(0, 7); // YYYY-MM
          const prev = byMonth.get(month) || { revenue: 0, cost: 0 };
          prev.revenue += wo.final_price || 0;
          byMonth.set(month, prev);
        }
        // Add FC costs per month if available
        if (approvedWOsForTrend.length > 0) {
          const approvedIds = approvedWOsForTrend.map(w => w.id);
          const { data: fcEntries } = await supabase.from('change_order_fc_hours').select('change_order_id, labor_total').in('change_order_id', approvedIds);
          const woCostMap = new Map<string, number>();
          for (const fc of fcEntries || []) {
            woCostMap.set(fc.change_order_id, (woCostMap.get(fc.change_order_id) || 0) + (fc.labor_total || 0));
          }
          for (const wo of approvedWOsForTrend) {
            const month = wo.created_at.slice(0, 7);
            const prev = byMonth.get(month)!;
            prev.cost += woCostMap.get(wo.id) || 0;
          }
        }
        const sorted = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
        let cumMargin = 0;
        setMonthlyWOData(sorted.map(([month, d]) => {
          cumMargin += d.revenue - d.cost;
          return { month, revenue: d.revenue, cost: d.cost, margin: cumMargin };
        }));
      }

      // FC participants
      setFcParticipants((fcParticipantsRes.data || []).map((p: any) => ({
        org_id: p.organization_id, org_name: p.organizations?.name || 'Unknown',
      })));

    } catch (error) {
      console.error('Error fetching project financials:', error);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [projectId, user, isSupplier, supplierOrgId]);

  // Derived
  const upstreamContract = contracts.find(c =>
    ((c.from_role === 'General Contractor' && c.to_role === 'Trade Contractor') ||
     (c.to_role === 'General Contractor' && c.from_role === 'Trade Contractor')) &&
    c.trade !== 'Work Order' && c.trade !== 'Work Order Labor'
  );
  const downstreamContract = contracts.find(c =>
    ((c.from_role === 'Trade Contractor' && c.to_role === 'Field Crew') ||
     (c.to_role === 'Trade Contractor' && c.from_role === 'Field Crew')) &&
    c.trade !== 'Work Order' && c.trade !== 'Work Order Labor'
  );

  const primaryContract = viewerRole === 'Field Crew' ? downstreamContract : upstreamContract;
  const contractValue = primaryContract?.contract_sum || 0;
  const retainagePercent = primaryContract?.retainage_percent || 0;
  const retainageAmount = billedToDate * (retainagePercent / 100);
  const outstanding = contractValue - billedToDate;

  const updateContract = async (id: string, sum: number, retainage: number): Promise<boolean> => {
    if (viewerRole === 'Field Crew') return false;
    const { error } = await supabase.from('project_contracts').update({ contract_sum: sum, retainage_percent: retainage }).eq('id', id);
    if (error) return false;
    setContracts(prev => prev.map(c => c.id === id ? { ...c, contract_sum: sum, retainage_percent: retainage } : c));
    return true;
  };

  const createFcContract = async (fcOrgId: string, sum: number, retainage: number): Promise<boolean> => {
    const currentOrgId = userOrgRoles[0]?.organization?.id;
    if (!currentOrgId || !user) return false;
    const { data, error } = await supabase.from('project_contracts').insert({
      project_id: projectId, from_org_id: currentOrgId, to_org_id: fcOrgId,
      from_role: 'Trade Contractor', to_role: 'Field Crew',
      contract_sum: sum, retainage_percent: retainage, created_by_user_id: user.id,
    }).select().single();
    if (error || !data) return false;
    const fcOrg = fcParticipants.find(p => p.org_id === fcOrgId);
    setContracts(prev => [...prev, { ...data, from_org_name: userOrgRoles[0]?.organization?.name || null, to_org_name: fcOrg?.org_name || null }]);
    return true;
  };

  const updateMaterialEstimate = async (contractId: string, amount: number): Promise<boolean> => {
    const { error } = await supabase.from('project_contracts').update({ material_estimate_total: amount } as any).eq('id', contractId).select('id').maybeSingle();
    if (error) {
      console.error('Failed to update material estimate:', error);
      return false;
    }
    setMaterialEstimateTotal(amount);
    setMaterialEstimate(amount);
    return true;
  };

  const updateLaborBudget = async (contractId: string, amount: number): Promise<boolean> => {
    const { error, count } = await supabase.from('project_contracts').update({ labor_budget: amount } as any).eq('id', contractId).select('id').maybeSingle();
    if (error) {
      console.error('Failed to update labor budget:', error);
      return false;
    }
    setLaborBudget(amount);
    return true;
  };

  const updateOwnerContract = async (contractId: string, value: number): Promise<boolean> => {
    const { error } = await supabase.from('project_contracts').update({ owner_contract_value: value } as any).eq('id', contractId).select('id').maybeSingle();
    if (error) { console.error('Failed to update owner contract:', error); return false; }
    setOwnerContractValue(value);
    return true;
  };

  const updateMaterialMarkup = async (contractId: string, type: string, value: number): Promise<boolean> => {
    const { error } = await supabase.from('project_contracts').update({ material_markup_type: type, material_markup_value: value } as any).eq('id', contractId).select('id').maybeSingle();
    if (error) { console.error('Failed to update material markup:', error); return false; }
    setMaterialMarkupType(type);
    setMaterialMarkupValue(value);
    return true;
  };

  return {
    loading, viewerRole, contracts, upstreamContract, downstreamContract, userOrgIds,
    billedToDate, workOrderTotal, approvedWOCount, workOrderFCCost, tcInternalCostTotal, fcWorkOrderEarnings, retainageAmount, outstanding,
    materialEstimate, materialOrdered, totalPaidToFC,
    materialEstimateTotal, approvedEstimateSum, isTCMaterialResponsible, isGCMaterialResponsible,
    isDesignatedSupplier, isTCSelfPerforming,
    totalPaid, materialDelivered, materialOrderedPending, actualLaborCost, laborBudget,
    ownerContractValue, materialMarkupType, materialMarkupValue,
    woLaborTotal, woMaterialTotal, woEquipmentTotal,
    supplierOrderValue, supplierInvoiced, supplierPaid,
    receivablesInvoiced, receivablesCollected, receivablesRetainage, payablesInvoiced, payablesPaid, payablesRetainage,
    recentWorkOrders, recentInvoices, monthlyWOData, fcParticipants,
    refetch: fetchData, updateContract, createFcContract, updateMaterialEstimate, updateLaborBudget,
    updateOwnerContract, updateMaterialMarkup,
  };
}

// Helper to get counterparty name from a contract relative to user's orgs
export function getContractCounterpartyName(contract: Contract | undefined, userOrgIds: string[]): string {
  if (!contract) return 'Unknown';
  const isFromOrg = contract.from_org_id && userOrgIds.includes(contract.from_org_id);
  const isToOrg = contract.to_org_id && userOrgIds.includes(contract.to_org_id);
  if (isFromOrg) return contract.to_org_name || contract.to_role;
  if (isToOrg) return contract.from_org_name || contract.from_role;
  return contract.to_org_name || contract.from_org_name || contract.to_role;
}

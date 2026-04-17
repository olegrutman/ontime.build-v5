import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfMonth, endOfMonth, subMonths, differenceInDays, addDays, startOfWeek } from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────────

export interface SupplierKPIs {
  totalReceivable: number;
  overdueCount: number;
  paidThisMonth: number;
  paidLastMonth: number;
  openOrdersCount: number;
  needsConfirmationCount: number;
  creditExposure: number;
}

export interface ActionItem {
  id: string;
  urgency: 'red' | 'amber' | 'blue';
  icon: string;
  title: string;
  subtitle: string;
  amount: number | null;
  actionLabel: string;
  actionUrl: string;
}

export interface DeliveryDay {
  date: Date;
  hasDeliveries: boolean;
  count: number;
}

export interface DeliveryRow {
  id: string;
  poNumber: string;
  projectName: string;
  itemCount: number;
  deliveryDate: string;
  confirmed: boolean;
  poTotal: number | null;
}

export interface AgingBucket {
  label: string;
  range: string;
  amount: number;
  count: number;
  percent: number;
}

export interface VelocityPoint {
  month: string;
  avgDays: number;
}

export interface EstimateRow {
  id: string;
  name: string;
  projectName: string;
  projectId: string;
  totalAmount: number;
  lineItemCount: number;
  packNames: string[];
  orderedPackNames: string[];
  orderedAmount: number;
  orderedPercent: number;
  status: string;
}

export interface ProjectHealthRow {
  projectId: string;
  projectName: string;
  gcName: string;
  deliveredTotal: number;
  approvedTotal: number;
  exposure: number;
  invoiceCount: number;
  avgApprovalDays: number | null;
}

export interface AcceptedProject {
  projectId: string;
  projectName: string;
  gcName: string;
  role: string;
}

export interface OpenPO {
  id: string;
  poNumber: string;
  poName: string;
  projectName: string;
  projectId: string;
  status: string;
  total: number | null;
  createdAt: string;
}

export interface ReturnRow {
  id: string;
  returnNumber: string;
  projectName: string;
  projectId: string;
  status: string;
  creditSubtotal: number | null;
  reason: string;
  urgency: string | null;
}

export interface SupplierDashboardData {
  kpis: SupplierKPIs;
  actionItems: ActionItem[];
  deliveryDays: DeliveryDay[];
  deliveryRows: DeliveryRow[];
  agingBuckets: AgingBucket[];
  velocityTrend: VelocityPoint[];
  oldestInvoiceDays: number | null;
  estimates: EstimateRow[];
  projectHealth: ProjectHealthRow[];
  acceptedProjects: AcceptedProject[];
  openPOs: OpenPO[];
  returns: ReturnRow[];
  loading: boolean;
  refetch: () => Promise<void>;
}

// ── Hook ───────────────────────────────────────────────────────────────

export function useSupplierDashboardData(): SupplierDashboardData {
  const { user, userOrgRoles } = useAuth();
  const orgId = userOrgRoles[0]?.organization?.id;

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<SupplierKPIs>({ totalReceivable: 0, overdueCount: 0, paidThisMonth: 0, paidLastMonth: 0, openOrdersCount: 0, needsConfirmationCount: 0, creditExposure: 0 });
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [deliveryDays, setDeliveryDays] = useState<DeliveryDay[]>([]);
  const [deliveryRows, setDeliveryRows] = useState<DeliveryRow[]>([]);
  const [agingBuckets, setAgingBuckets] = useState<AgingBucket[]>([]);
  const [velocityTrend, setVelocityTrend] = useState<VelocityPoint[]>([]);
  const [oldestInvoiceDays, setOldestInvoiceDays] = useState<number | null>(null);
  const [estimates, setEstimates] = useState<EstimateRow[]>([]);
  const [projectHealth, setProjectHealth] = useState<ProjectHealthRow[]>([]);
  const [openPOs, setOpenPOs] = useState<OpenPO[]>([]);
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [acceptedProjects, setAcceptedProjects] = useState<AcceptedProject[]>([]);

  const fetchData = useCallback(async () => {
    if (!orgId || !user) { setLoading(false); return; }
    setLoading(true);

    try {
      // Step 1: Find supplier records for this org
      const { data: supplierRecords } = await supabase
        .from('suppliers')
        .select('id')
        .eq('organization_id', orgId);

      const supplierIds = (supplierRecords || []).map(s => s.id);

      // Step 2: Parallel fetches
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();
      const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
      const lastMonthEnd = endOfMonth(subMonths(now, 1)).toISOString();

      // 5-day delivery window (Mon-Fri of current week)
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekDays: Date[] = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

      const [
        posResult,
        estimatesResult,
        returnsResult,
        invoicesResult,
        acceptedProjectsResult,
      ] = await Promise.all([
        // All POs where supplier_id is one of our supplier records
        supplierIds.length > 0
          ? supabase
              .from('purchase_orders')
              .select('id, po_number, po_name, status, po_total, project_id, created_at, delivered_at, ordered_at, ready_for_delivery_at, source_estimate_id, source_pack_name, projects:project_id(name, organization_id, organizations:organization_id(name))')
              .in('supplier_id', supplierIds)
          : Promise.resolve({ data: [] }),
        // Supplier estimates
        supabase
          .from('supplier_estimates')
          .select('id, name, project_id, total_amount, status, projects:project_id(name)')
          .eq('supplier_org_id', orgId),
        // Returns targeting this supplier
        supabase
          .from('returns')
          .select('id, return_number, project_id, status, credit_subtotal, reason, urgency, projects:project_id(name)')
          .eq('supplier_org_id', orgId)
          .neq('status', 'CLOSED'),
        // Invoices linked to our POs (supplier invoices) — server-side scoped via po_id IN (...)
        // We do this via a sub-fetch of PO ids to keep the query bounded
        supplierIds.length > 0
          ? supabase
              .from('purchase_orders')
              .select('id')
              .in('supplier_id', supplierIds)
              .then(async (poRes) => {
                const poIds = (poRes.data || []).map((r: any) => r.id);
                if (poIds.length === 0) return { data: [] };
                return supabase
                  .from('invoices')
                  .select('id, invoice_number, status, total_amount, submitted_at, approved_at, paid_at, created_at, project_id, po_id')
                  .in('po_id', poIds);
              })
          : Promise.resolve({ data: [] }),
        // Accepted projects for this org
        supabase
          .from('project_participants')
          .select('project_id, role, projects:project_id(name, organization_id, organizations:organization_id(name))')
          .eq('organization_id', orgId)
          .eq('invite_status', 'ACCEPTED'),
      ]);

      const allPOs = (posResult.data || []) as any[];
      const allEstimates = (estimatesResult.data || []) as any[];
      const allReturns = (returnsResult.data || []) as any[];
      const allInvoicesRaw = (invoicesResult.data || []) as any[];
      const allAcceptedProjects = (acceptedProjectsResult.data || []) as any[];

      // Build accepted projects list
      setAcceptedProjects(allAcceptedProjects.map((p: any) => ({
        projectId: p.project_id,
        projectName: p.projects?.name || 'Unknown',
        gcName: p.projects?.organizations?.name || 'Unknown',
        role: p.role || '',
      })));

      // Filter invoices to only those linked to our POs
      const poIdSet = new Set(allPOs.map((po: any) => po.id));
      const allInvoices = allInvoicesRaw.filter((inv: any) => poIdSet.has(inv.po_id));

      // ── KPIs ──
      const outstandingInvoices = allInvoices.filter((inv: any) => ['SUBMITTED', 'APPROVED'].includes(inv.status));
      const totalReceivable = outstandingInvoices.reduce((s: number, inv: any) => s + (inv.total_amount || 0), 0);
      const overdueInvoices = outstandingInvoices.filter((inv: any) => {
        if (!inv.submitted_at) return false;
        return differenceInDays(now, new Date(inv.submitted_at)) > 30;
      });

      const paidThisMonth = allInvoices
        .filter((inv: any) => inv.status === 'PAID' && inv.paid_at && inv.paid_at >= monthStart && inv.paid_at <= monthEnd)
        .reduce((s: number, inv: any) => s + (inv.total_amount || 0), 0);
      const paidLastMonth = allInvoices
        .filter((inv: any) => inv.status === 'PAID' && inv.paid_at && inv.paid_at >= lastMonthStart && inv.paid_at <= lastMonthEnd)
        .reduce((s: number, inv: any) => s + (inv.total_amount || 0), 0);

      const openStatuses = ['SUBMITTED', 'PRICED', 'ORDERED'];
      const openPOsList = allPOs.filter((po: any) => openStatuses.includes(po.status));
      const needsConfirmation = allPOs.filter((po: any) => po.status === 'SUBMITTED');

      // Credit exposure: DELIVERED POs total minus APPROVED/PAID invoices total
      const deliveredPOsTotal = allPOs
        .filter((po: any) => po.status === 'DELIVERED')
        .reduce((s: number, po: any) => s + (po.po_total || 0), 0);
      const approvedPaidTotal = allInvoices
        .filter((inv: any) => ['APPROVED', 'PAID'].includes(inv.status))
        .reduce((s: number, inv: any) => s + (inv.total_amount || 0), 0);
      const creditExposure = Math.max(0, deliveredPOsTotal - approvedPaidTotal);

      setKpis({
        totalReceivable,
        overdueCount: overdueInvoices.length,
        paidThisMonth,
        paidLastMonth,
        openOrdersCount: openPOsList.length,
        needsConfirmationCount: needsConfirmation.length,
        creditExposure,
      });

      // ── Action Queue ──
      const actions: ActionItem[] = [];

      // POs needing pricing
      needsConfirmation.forEach((po: any) => {
        actions.push({
          id: `po-confirm-${po.id}`,
          urgency: 'red',
          icon: '📋',
          title: `Confirm PO ${po.po_number}`,
          subtitle: po.projects?.name || 'Unknown Project',
          amount: po.po_total,
          actionLabel: 'Confirm',
          actionUrl: `/project/${po.project_id}/purchase-orders`,
        });
      });

      // Overdue invoices
      overdueInvoices.forEach((inv: any) => {
        actions.push({
          id: `inv-overdue-${inv.id}`,
          urgency: 'red',
          icon: '💰',
          title: `Overdue: ${inv.invoice_number}`,
          subtitle: `${differenceInDays(now, new Date(inv.submitted_at))} days since submitted`,
          amount: inv.total_amount,
          actionLabel: 'Follow Up',
          actionUrl: `/project/${inv.project_id}/invoices`,
        });
      });

      // Returns needing response
      const pendingReturns = allReturns.filter((r: any) => ['SUBMITTED', 'SUPPLIER_REVIEW'].includes(r.status));
      pendingReturns.forEach((r: any) => {
        actions.push({
          id: `return-${r.id}`,
          urgency: 'amber',
          icon: '📦',
          title: `Return: ${r.return_number || 'Pending'}`,
          subtitle: r.projects?.name || 'Unknown Project',
          amount: r.credit_subtotal,
          actionLabel: 'Respond',
          actionUrl: `/project/${r.project_id}/returns`,
        });
      });

      // POs ordered but no delivery date
      const unscheduledDeliveries = allPOs.filter((po: any) => po.status === 'ORDERED' && !po.ready_for_delivery_at);
      unscheduledDeliveries.slice(0, 3).forEach((po: any) => {
        actions.push({
          id: `delivery-${po.id}`,
          urgency: 'amber',
          icon: '🚚',
          title: `Schedule delivery: ${po.po_number}`,
          subtitle: po.projects?.name || 'Unknown Project',
          amount: po.po_total,
          actionLabel: 'Schedule',
          actionUrl: `/project/${po.project_id}/purchase-orders`,
        });
      });

      setActionItems(actions);

      // ── Delivery Schedule ──
      const orderedPOs = allPOs.filter((po: any) => po.status === 'ORDERED');
      const deliveryDaysList: DeliveryDay[] = weekDays.map(day => {
        const dayStr = day.toISOString().split('T')[0];
        const dayPOs = orderedPOs.filter((po: any) => {
          const delivDate = po.ready_for_delivery_at?.split('T')[0];
          return delivDate === dayStr;
        });
        return { date: day, hasDeliveries: dayPOs.length > 0, count: dayPOs.length };
      });
      setDeliveryDays(deliveryDaysList);

      const weekEndStr = addDays(weekStart, 5).toISOString();
      const weekDeliveries = orderedPOs.filter((po: any) => {
        if (!po.ready_for_delivery_at) return false;
        return po.ready_for_delivery_at >= weekStart.toISOString() && po.ready_for_delivery_at < weekEndStr;
      });
      setDeliveryRows(weekDeliveries.map((po: any) => ({
        id: po.id,
        poNumber: po.po_number,
        projectName: po.projects?.name || 'Unknown',
        itemCount: 0, // Would need line items count
        deliveryDate: po.ready_for_delivery_at,
        confirmed: !!po.ready_for_delivery_at,
        poTotal: po.po_total,
      })));

      // ── Receivables Aging ──
      const totalOutstanding = totalReceivable;
      const current = outstandingInvoices.filter((inv: any) => {
        const days = differenceInDays(now, new Date(inv.submitted_at || inv.created_at));
        return days <= 30;
      });
      const dueSoon = outstandingInvoices.filter((inv: any) => {
        const days = differenceInDays(now, new Date(inv.submitted_at || inv.created_at));
        return days > 30 && days <= 60;
      });
      const overdue = outstandingInvoices.filter((inv: any) => {
        const days = differenceInDays(now, new Date(inv.submitted_at || inv.created_at));
        return days > 60;
      });

      const currentAmt = current.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
      const dueSoonAmt = dueSoon.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
      const overdueAmt = overdue.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);

      setAgingBuckets([
        { label: 'Current', range: '0–30 days', amount: currentAmt, count: current.length, percent: totalOutstanding > 0 ? (currentAmt / totalOutstanding) * 100 : 0 },
        { label: 'Due Soon', range: '31–60 days', amount: dueSoonAmt, count: dueSoon.length, percent: totalOutstanding > 0 ? (dueSoonAmt / totalOutstanding) * 100 : 0 },
        { label: 'Overdue', range: '60+ days', amount: overdueAmt, count: overdue.length, percent: totalOutstanding > 0 ? (overdueAmt / totalOutstanding) * 100 : 0 },
      ]);

      // Oldest invoice
      const sortedByAge = outstandingInvoices
        .filter((inv: any) => inv.submitted_at)
        .sort((a: any, b: any) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
      setOldestInvoiceDays(sortedByAge.length > 0 ? differenceInDays(now, new Date(sortedByAge[0].submitted_at)) : null);

      // ── Approval Velocity ──
      const approvedInvoices = allInvoices.filter((inv: any) => inv.submitted_at && inv.approved_at);
      const velocityByMonth: Record<string, number[]> = {};
      for (let i = 4; i >= 0; i--) {
        const m = subMonths(now, i);
        const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
        velocityByMonth[key] = [];
      }
      approvedInvoices.forEach((inv: any) => {
        const approvedDate = new Date(inv.approved_at);
        const key = `${approvedDate.getFullYear()}-${String(approvedDate.getMonth() + 1).padStart(2, '0')}`;
        if (key in velocityByMonth) {
          velocityByMonth[key].push(differenceInDays(approvedDate, new Date(inv.submitted_at)));
        }
      });
      setVelocityTrend(Object.entries(velocityByMonth).map(([month, days]) => ({
        month,
        avgDays: days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0,
      })));

      // ── Estimates ──
      // Fetch estimate item counts + pack names
      const estimateIds = allEstimates.map((e: any) => e.id);
      let estimateItemsData: any[] = [];
      if (estimateIds.length > 0) {
        const { data } = await supabase
          .from('supplier_estimate_items')
          .select('estimate_id, pack_name')
          .in('estimate_id', estimateIds);
        estimateItemsData = data || [];
      }

      // Calculate ordered amounts and ordered pack names from POs linked to estimates
      const orderedByEstimate: Record<string, number> = {};
      const orderedPacksByEstimate: Record<string, Set<string>> = {};
      allPOs.forEach((po: any) => {
        if (po.source_estimate_id && po.status !== 'ACTIVE') {
          orderedByEstimate[po.source_estimate_id] = (orderedByEstimate[po.source_estimate_id] || 0) + (po.po_total || 0);
          if (po.source_pack_name) {
            if (!orderedPacksByEstimate[po.source_estimate_id]) {
              orderedPacksByEstimate[po.source_estimate_id] = new Set();
            }
            orderedPacksByEstimate[po.source_estimate_id].add(po.source_pack_name);
          }
        }
      });

      setEstimates(allEstimates.map((est: any) => {
        const items = estimateItemsData.filter((i: any) => i.estimate_id === est.id);
        const packs = [...new Set(items.map((i: any) => i.pack_name).filter(Boolean))];
        const orderedAmt = orderedByEstimate[est.id] || 0;
        const total = est.total_amount || 0;
        return {
          id: est.id,
          name: est.name,
          projectName: est.projects?.name || 'Unknown',
          projectId: est.project_id,
          totalAmount: total,
          lineItemCount: items.length,
          packNames: packs,
          orderedPackNames: [...(orderedPacksByEstimate[est.id] || [])],
          orderedAmount: orderedAmt,
          orderedPercent: total > 0 ? Math.min(Math.round((orderedAmt / total) * 100), 100) : 0,
          status: est.status,
        };
      }));

      // ── Project Health ──
      const projectMap: Record<string, { name: string; gcName: string; delivered: number; exposure: number }> = {};
      allPOs.forEach((po: any) => {
        if (!po.project_id) return;
        if (!projectMap[po.project_id]) {
          projectMap[po.project_id] = {
            name: po.projects?.name || 'Unknown',
            gcName: po.projects?.organizations?.name || 'Unknown',
            delivered: 0,
            exposure: 0,
          };
        }
        if (po.status === 'DELIVERED') {
          projectMap[po.project_id].delivered += po.po_total || 0;
        }
      });

      // Per-project approved invoices
      const approvedByProject: Record<string, { total: number; count: number; totalDays: number }> = {};
      allInvoices.filter((inv: any) => ['APPROVED', 'PAID'].includes(inv.status)).forEach((inv: any) => {
        if (!inv.project_id) return;
        if (!approvedByProject[inv.project_id]) approvedByProject[inv.project_id] = { total: 0, count: 0, totalDays: 0 };
        approvedByProject[inv.project_id].total += inv.total_amount || 0;
        approvedByProject[inv.project_id].count++;
        if (inv.submitted_at && inv.approved_at) {
          approvedByProject[inv.project_id].totalDays += differenceInDays(new Date(inv.approved_at), new Date(inv.submitted_at));
        }
      });

      setProjectHealth(Object.entries(projectMap).map(([pid, p]) => {
        const approved = approvedByProject[pid] || { total: 0, count: 0, totalDays: 0 };
        return {
          projectId: pid,
          projectName: p.name,
          gcName: p.gcName,
          deliveredTotal: p.delivered,
          approvedTotal: approved.total,
          exposure: Math.max(0, p.delivered - approved.total),
          invoiceCount: approved.count,
          avgApprovalDays: approved.count > 0 ? Math.round(approved.totalDays / approved.count) : null,
        };
      }).filter(p => p.deliveredTotal > 0 || p.exposure > 0));

      // ── Open POs ──
      setOpenPOs(openPOsList.slice(0, 10).map((po: any) => ({
        id: po.id,
        poNumber: po.po_number,
        poName: po.po_name,
        projectName: po.projects?.name || 'Unknown',
        projectId: po.project_id || '',
        status: po.status,
        total: po.po_total,
        createdAt: po.created_at,
      })));

      // ── Returns ──
      setReturns(allReturns.map((r: any) => ({
        id: r.id,
        returnNumber: r.return_number || '—',
        projectName: r.projects?.name || 'Unknown',
        projectId: r.project_id,
        status: r.status,
        creditSubtotal: r.credit_subtotal,
        reason: r.reason,
        urgency: r.urgency,
      })));

    } catch (err) {
      console.error('Supplier dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [orgId, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return {
    kpis, actionItems, deliveryDays, deliveryRows, agingBuckets,
    velocityTrend, oldestInvoiceDays, estimates, projectHealth,
    acceptedProjects, openPOs, returns, loading, refetch: fetchData,
  };
}

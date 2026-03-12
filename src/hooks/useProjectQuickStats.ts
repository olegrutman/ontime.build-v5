import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { OrgType } from '@/types/organization';

export interface ActionItem {
  key: string;
  label: string;
  count: number;
  amount?: number;
  severity: 'red' | 'amber' | 'blue';
  tab?: string; // project tab to navigate to
}

export interface CriticalScheduleItem {
  id: string;
  title: string;
  progress: number;
  endDate: string;
  isOverdue: boolean;
  daysUntil: number;
}

export interface ProjectQuickStats {
  actionItems: ActionItem[];
  criticalScheduleItems: CriticalScheduleItem[];
  totalCriticalCount: number;
  budgetPercent: number;
  budgetUsed: number;
  budgetTotal: number;
  schedulePercent: number;
  scheduleDelta: number;
  hasSchedule: boolean;
  totalBilled: number;
  outstandingBilling: number;
  loading: boolean;
}

interface UseProjectQuickStatsOptions {
  orgType?: OrgType | string | null;
  orgId?: string | null;
}

const EMPTY: ProjectQuickStats = {
  actionItems: [],
  criticalScheduleItems: [],
  totalCriticalCount: 0,
  budgetPercent: 0,
  budgetUsed: 0,
  budgetTotal: 0,
  schedulePercent: 0,
  scheduleDelta: 0,
  hasSchedule: false,
  totalBilled: 0,
  outstandingBilling: 0,
  loading: true,
};

export function useProjectQuickStats(
  projectId: string | null,
  options: UseProjectQuickStatsOptions = {}
): ProjectQuickStats {
  const { orgType, orgId } = options;
  const [stats, setStats] = useState<ProjectQuickStats>(EMPTY);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    async function fetchStats() {
      setStats((s) => ({ ...s, loading: true }));

      const today = new Date().toISOString().split('T')[0];

      // Parallel queries
      const [contractRes, invoiceRes, scheduleRes, rfiRes, woRes, poRes] = await Promise.all([
        // Bug 3 fix: Fetch contracts with org IDs so we can filter by user's org
        supabase
          .from('project_contracts')
          .select('id, contract_sum, from_org_id, to_org_id')
          .eq('project_id', projectId),
        // Bug 8 fix: Fetch contract_id so we can filter invoices by relevant contracts
        supabase
          .from('invoices')
          .select('id, status, total_amount, po_id, contract_id')
          .eq('project_id', projectId)
          .neq('status', 'DRAFT'),
        // Bug 1 fix: Filter schedule by item_type = 'task' only
        supabase
          .from('project_schedule_items')
          .select('id, title, progress, start_date, end_date, item_type')
          .eq('project_id', projectId)
          .eq('item_type', 'task'),
        // Open RFIs
        supabase
          .from('project_rfis')
          .select('id, status, due_date')
          .eq('project_id', projectId)
          .eq('status', 'OPEN'),
        // Work orders
        supabase
          .from('work_items')
          .select('id, state, organization_id')
          .eq('project_id', projectId),
        // Purchase orders
        supabase
          .from('purchase_orders')
          .select('id, status, organization_id, supplier_id, po_total, created_by_org_id')
          .eq('project_id', projectId),
      ]);

      if (cancelled) return;

      const allInvoices = invoiceRes.data ?? [];
      const scheduleItems = scheduleRes.data ?? [];
      const rfis = rfiRes.data ?? [];
      const allWorkOrders = woRes.data ?? [];
      const allPos = poRes.data ?? [];
      const allContracts = contractRes.data ?? [];

      // Directional contract/invoice filtering by orgId
      let contracts = allContracts;
      let invoices = allInvoices;
      let receivedInvoices: typeof allInvoices = [];
      let workOrders = allWorkOrders;
      let pos = allPos;

      if (orgId) {
        // Receivable contracts: where this org is the contractor (from_org_id)
        const sentContracts = allContracts.filter((c) => c.from_org_id === orgId);
        // Payable contracts: where this org is the client (to_org_id)
        const receivedContracts = allContracts.filter((c) => c.to_org_id === orgId);

        // Budget = only sent contracts (what the org is contracted for)
        contracts = sentContracts;

        const sentContractIds = new Set(sentContracts.map((c) => c.id));
        const receivedContractIds = new Set(receivedContracts.map((c) => c.id));

        // Invoices for budget/billing = only on sent contracts
        invoices = allInvoices.filter(
          (i) => i.contract_id && sentContractIds.has(i.contract_id)
        );

        // Invoices received (from subs) for action items
        receivedInvoices = allInvoices.filter(
          (i) => i.contract_id && receivedContractIds.has(i.contract_id)
        );

        // Filter work orders by org
        workOrders = allWorkOrders.filter((w) => w.organization_id === orgId);

        // Filter POs by org (created by or supplier matches)
        pos = allPos.filter(
          (p) => p.created_by_org_id === orgId || p.organization_id === orgId
        );
      }

      // ── Budget metrics (receivables only) ──
      const budgetTotal = contracts.reduce((s, c) => s + (c.contract_sum ?? 0), 0);
      const approvedPaid = invoices.filter((i) => i.status === 'APPROVED' || i.status === 'PAID');
      const budgetUsed = approvedPaid.reduce((s, i) => s + (i.total_amount ?? 0), 0);
      const budgetPercent = budgetTotal > 0 ? Math.round((budgetUsed / budgetTotal) * 100) : 0;

      // Exclude REJECTED invoices from totalBilled
      const totalBilled = invoices
        .filter((i) => i.status !== 'REJECTED')
        .reduce((s, i) => s + (i.total_amount ?? 0), 0);
      const paidAmount = invoices
        .filter((i) => i.status === 'PAID')
        .reduce((s, i) => s + (i.total_amount ?? 0), 0);
      const outstandingBilling = totalBilled - paidAmount;

      // ── Schedule metrics (Bug 2 fix: only tasks with end_date) ──
      let schedulePercent = 0;
      let scheduleDelta = 0;
      const activeSchedule = scheduleItems.filter((s) => s.end_date);
      const hasSchedule = activeSchedule.length > 0;
      if (hasSchedule) {
        schedulePercent = Math.round(
          activeSchedule.reduce((sum, p) => sum + (p.progress ?? 0), 0) / activeSchedule.length
        );
        const starts = activeSchedule.map((i) => new Date(i.start_date).getTime());
        const ends = activeSchedule.map((i) => new Date(i.end_date!).getTime());
        const projectStart = Math.min(...starts);
        const projectEnd = Math.max(...ends);
        const totalDuration = projectEnd - projectStart;
        if (totalDuration > 0) {
          const elapsed = Date.now() - projectStart;
          const expectedPercent = Math.min(100, Math.round((elapsed / totalDuration) * 100));
          scheduleDelta = schedulePercent - expectedPercent;
        }
      }

      // ── Build action items based on org type ──
      const actionItems: ActionItem[] = [];

      // ── Build critical schedule items ──
      const MAX_CRITICAL = 3;
      const allCritical = scheduleItems
        .filter((s) => s.end_date && (s.progress ?? 0) < 100)
        .map((s) => {
          const endMs = new Date(s.end_date!).getTime();
          const todayMs = new Date(today).getTime();
          const daysUntil = Math.round((endMs - todayMs) / 86400000);
          return {
            id: s.id,
            title: s.title,
            progress: s.progress ?? 0,
            endDate: s.end_date!,
            isOverdue: daysUntil < 0,
            daysUntil,
          };
        })
        .filter((s) => s.daysUntil < 7) // overdue or due within 7 days
        .sort((a, b) => a.daysUntil - b.daysUntil);

      const criticalScheduleItems = allCritical.slice(0, MAX_CRITICAL);
      const totalCriticalCount = allCritical.length;

      // Urgent RFIs (universal)
      const urgentRFIs = rfis.filter((r) => r.due_date && r.due_date <= today);
      if (urgentRFIs.length > 0) {
        actionItems.push({
          key: 'urgent-rfis',
          label: `${urgentRFIs.length} RFI${urgentRFIs.length > 1 ? 's' : ''} need response`,
          count: urgentRFIs.length,
          severity: 'red',
          tab: 'rfis',
        });
      } else if (rfis.length > 0) {
        actionItems.push({
          key: 'open-rfis',
          label: `${rfis.length} open RFI${rfis.length > 1 ? 's' : ''}`,
          count: rfis.length,
          severity: 'blue',
          tab: 'rfis',
        });
      }

      if (orgType === 'GC') {
        // Invoices awaiting GC approval
        const submittedInvoices = invoices.filter((i) => i.status === 'SUBMITTED');
        const submittedTotal = submittedInvoices.reduce((s, i) => s + (i.total_amount ?? 0), 0);
        if (submittedInvoices.length > 0) {
          actionItems.push({
            key: 'invoices-to-review',
            label: `${submittedInvoices.length} invoice${submittedInvoices.length > 1 ? 's' : ''} to review`,
            count: submittedInvoices.length,
            amount: submittedTotal,
            severity: 'amber',
            tab: 'invoices',
          });
        }

        // WOs pending approval
        const pendingWOs = workOrders.filter((w) =>
          ['submitted', 'priced', 'pending'].includes(w.state?.toLowerCase() ?? '')
        );
        if (pendingWOs.length > 0) {
          actionItems.push({
            key: 'pending-wos',
            label: `${pendingWOs.length} work order${pendingWOs.length > 1 ? 's' : ''} pending approval`,
            count: pendingWOs.length,
            severity: 'amber',
            tab: 'work-orders',
          });
        }

        // POs sent but not yet priced
        const awaitingPricing = pos.filter((p) => p.status === 'SUBMITTED' || p.status === 'SENT');
        if (awaitingPricing.length > 0) {
          actionItems.push({
            key: 'pos-awaiting-pricing',
            label: `${awaitingPricing.length} PO${awaitingPricing.length > 1 ? 's' : ''} awaiting pricing`,
            count: awaitingPricing.length,
            severity: 'blue',
            tab: 'purchase-orders',
          });
        }
      } else if (orgType === 'TC' || orgType === 'FC') {
        // Invoices I SENT that are unpaid (receivables)
        const myUnpaidInvoices = invoices.filter(
          (i) => i.status === 'SUBMITTED' || i.status === 'APPROVED'
        );
        const myUnpaidTotal = myUnpaidInvoices.reduce((s, i) => s + (i.total_amount ?? 0), 0);
        if (myUnpaidInvoices.length > 0) {
          actionItems.push({
            key: 'unpaid-invoices',
            label: `${myUnpaidInvoices.length} invoice${myUnpaidInvoices.length > 1 ? 's' : ''} awaiting payment`,
            count: myUnpaidInvoices.length,
            amount: myUnpaidTotal,
            severity: myUnpaidTotal > 10000 ? 'red' : 'amber',
            tab: 'invoices',
          });
        }

        // Invoices I RECEIVED that need my review (payables)
        const invoicesToReview = receivedInvoices.filter((i) => i.status === 'SUBMITTED');
        const reviewTotal = invoicesToReview.reduce((s, i) => s + (i.total_amount ?? 0), 0);
        if (invoicesToReview.length > 0) {
          actionItems.push({
            key: 'invoices-to-review',
            label: `${invoicesToReview.length} invoice${invoicesToReview.length > 1 ? 's' : ''} to review`,
            count: invoicesToReview.length,
            amount: reviewTotal,
            severity: 'amber',
            tab: 'invoices',
          });
        }

        // WOs in progress
        const activeWOs = workOrders.filter((w) =>
          ['in_progress', 'active', 'submitted'].includes(w.state?.toLowerCase() ?? '')
        );
        if (activeWOs.length > 0) {
          actionItems.push({
            key: 'active-wos',
            label: `${activeWOs.length} work order${activeWOs.length > 1 ? 's' : ''} in progress`,
            count: activeWOs.length,
            severity: 'blue',
            tab: 'work-orders',
          });
        }

        // POs needing pricing
        const posNeedPricing = pos.filter((p) => p.status === 'SUBMITTED');
        if (posNeedPricing.length > 0) {
          actionItems.push({
            key: 'pos-need-pricing',
            label: `${posNeedPricing.length} PO${posNeedPricing.length > 1 ? 's' : ''} need pricing`,
            count: posNeedPricing.length,
            severity: 'amber',
            tab: 'purchase-orders',
          });
        }
      } else if (orgType === 'SUPPLIER') {
        // POs needing pricing
        const posNeedPricing = pos.filter((p) => p.status === 'SUBMITTED');
        if (posNeedPricing.length > 0) {
          actionItems.push({
            key: 'pos-need-pricing',
            label: `${posNeedPricing.length} PO${posNeedPricing.length > 1 ? 's' : ''} need pricing`,
            count: posNeedPricing.length,
            severity: 'amber',
            tab: 'purchase-orders',
          });
        }

        // Recently ordered POs
        const orderedPOs = pos.filter((p) => p.status === 'ORDERED');
        if (orderedPOs.length > 0) {
          actionItems.push({
            key: 'ordered-pos',
            label: `${orderedPOs.length} PO${orderedPOs.length > 1 ? 's' : ''} ordered`,
            count: orderedPOs.length,
            severity: 'blue',
            tab: 'purchase-orders',
          });
        }
      } else {
        // Fallback
        const unpaidInvoices = invoices.filter(
          (i) => i.status === 'SUBMITTED' || i.status === 'APPROVED'
        );
        if (unpaidInvoices.length > 0) {
          const unpaidTotal = unpaidInvoices.reduce((s, i) => s + (i.total_amount ?? 0), 0);
          actionItems.push({
            key: 'unpaid-invoices',
            label: `${unpaidInvoices.length} invoice${unpaidInvoices.length > 1 ? 's' : ''} unpaid`,
            count: unpaidInvoices.length,
            amount: unpaidTotal,
            severity: 'amber',
            tab: 'invoices',
          });
        }
      }

      setStats({
        actionItems,
        criticalScheduleItems,
        totalCriticalCount,
        budgetPercent,
        budgetUsed,
        budgetTotal,
        schedulePercent,
        scheduleDelta,
        hasSchedule,
        totalBilled,
        outstandingBilling,
        loading: false,
      });
    }

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [projectId, orgType, orgId]);

  return stats;
}

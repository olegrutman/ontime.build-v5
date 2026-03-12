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
      const sevenDaysOut = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      // Parallel queries
      const [contractRes, invoiceRes, scheduleRes, rfiRes, woRes, poRes] = await Promise.all([
        // Contracts (budget)
        supabase
          .from('project_contracts')
          .select('contract_sum')
          .eq('project_id', projectId),
        // All non-draft invoices
        supabase
          .from('invoices')
          .select('id, status, total_amount, po_id')
          .eq('project_id', projectId)
          .neq('status', 'DRAFT'),
        // Schedule items
        supabase
          .from('project_schedule_items')
          .select('id, title, progress, start_date, end_date')
          .eq('project_id', projectId),
        // Open RFIs
        supabase
          .from('project_rfis')
          .select('id, status, due_date')
          .eq('project_id', projectId)
          .eq('status', 'OPEN'),
        // Work orders (work_items with item_type = 'change_order' or similar)
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

      const invoices = invoiceRes.data ?? [];
      const scheduleItems = scheduleRes.data ?? [];
      const rfis = rfiRes.data ?? [];
      const workOrders = woRes.data ?? [];
      const pos = poRes.data ?? [];
      const contracts = contractRes.data ?? [];

      // ── Budget metrics ──
      const budgetTotal = contracts.reduce((s, c) => s + (c.contract_sum ?? 0), 0);
      const approvedPaid = invoices.filter((i) => i.status === 'APPROVED' || i.status === 'PAID');
      const budgetUsed = approvedPaid.reduce((s, i) => s + (i.total_amount ?? 0), 0);
      const budgetPercent = budgetTotal > 0 ? Math.round((budgetUsed / budgetTotal) * 100) : 0;

      const totalBilled = invoices.reduce((s, i) => s + (i.total_amount ?? 0), 0);
      const paidAmount = invoices
        .filter((i) => i.status === 'PAID')
        .reduce((s, i) => s + (i.total_amount ?? 0), 0);
      const outstandingBilling = totalBilled - paidAmount;

      // ── Schedule metrics ──
      let schedulePercent = 0;
      let scheduleDelta = 0;
      const activeSchedule = scheduleItems.filter((s) => s.end_date);
      if (activeSchedule.length > 0) {
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

      // Schedule: overdue tasks (universal)
      const overdueTasks = scheduleItems.filter(
        (s) => s.end_date && s.end_date < today && (s.progress ?? 0) < 100
      );
      if (overdueTasks.length > 0) {
        actionItems.push({
          key: 'overdue-tasks',
          label: `${overdueTasks.length} task${overdueTasks.length > 1 ? 's' : ''} overdue`,
          count: overdueTasks.length,
          severity: 'red',
          tab: 'schedule',
        });
      }

      // Schedule: due soon tasks (universal)
      const dueSoonTasks = scheduleItems.filter(
        (s) =>
          s.end_date &&
          s.end_date >= today &&
          s.end_date <= sevenDaysOut &&
          (s.progress ?? 0) < 100
      );
      if (dueSoonTasks.length > 0) {
        actionItems.push({
          key: 'due-soon-tasks',
          label: `${dueSoonTasks.length} task${dueSoonTasks.length > 1 ? 's' : ''} due this week`,
          count: dueSoonTasks.length,
          severity: 'amber',
          tab: 'schedule',
        });
      }

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

        // WOs pending approval (state not in final states)
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
        // Unpaid invoices (submitted/approved but not paid)
        const unpaidInvoices = invoices.filter(
          (i) => i.status === 'SUBMITTED' || i.status === 'APPROVED'
        );
        const unpaidTotal = unpaidInvoices.reduce((s, i) => s + (i.total_amount ?? 0), 0);
        if (unpaidInvoices.length > 0) {
          actionItems.push({
            key: 'unpaid-invoices',
            label: `${unpaidInvoices.length} invoice${unpaidInvoices.length > 1 ? 's' : ''} unpaid`,
            count: unpaidInvoices.length,
            amount: unpaidTotal,
            severity: unpaidTotal > 10000 ? 'red' : 'amber',
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

        // POs needing pricing (where supplier is this org)
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
        // Fallback: show generic stats for unknown org types
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
        budgetPercent,
        budgetUsed,
        budgetTotal,
        schedulePercent,
        scheduleDelta,
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

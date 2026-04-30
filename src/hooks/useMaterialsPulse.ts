import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HotProject {
  projectId: string;
  name: string;
  reason: string;       // short label, e.g. "Late 2 · Re-priced +$900"
  severity: 'red' | 'amber';
}

export interface MaterialsPulse {
  // Late deliveries (POs ordered, past quoted lead time, not delivered)
  lateCount: number;
  lateValue: number;

  // Supplier re-priced lines vs original quote
  repricedDelta: number;       // signed $; >0 = costs went up
  repricedLineCount: number;
  repricedTotalLines: number;

  // Cash exposure due in next 14 days (unpaid invoices submitted/approved in last 30d)
  dueNext14Days: number;
  agingD31_60: number;
  agingD60Plus: number;

  // In-transit / arriving
  inTransitCount: number;      // ORDERED + READY_FOR_DELIVERY
  inTransitValue: number;
  etaToday: number;            // POs whose expected delivery is today (or already passed but not delivered → late, excluded here)

  hotProjects: HotProject[];
}

interface Args {
  buyerOrgId: string | undefined;
  projectIds: string[];
  enabled?: boolean;
}

const EMPTY: MaterialsPulse = {
  lateCount: 0, lateValue: 0,
  repricedDelta: 0, repricedLineCount: 0, repricedTotalLines: 0,
  dueNext14Days: 0, agingD31_60: 0, agingD60Plus: 0,
  inTransitCount: 0, inTransitValue: 0, etaToday: 0,
  hotProjects: [],
};

export function useMaterialsPulse({ buyerOrgId, projectIds, enabled = true }: Args) {
  return useQuery<MaterialsPulse>({
    queryKey: ['materials-pulse', buyerOrgId, [...projectIds].sort().join(',')],
    enabled: enabled && !!buyerOrgId && projectIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const now = new Date();
      const todayKey = now.toISOString().slice(0, 10);

      // 1) Pull POs across all projects in one query
      const posRes = await supabase
        .from('purchase_orders')
        .select('id, project_id, po_number, po_name, status, po_total, ordered_at')
        .eq('created_by_org_id', buyerOrgId!)
        .in('project_id', projectIds);

      const pos = (posRes.data || []) as any[];
      if (pos.length === 0) return EMPTY;

      const poIds = pos.map(p => p.id);

      // 2) Lines + invoices + project names in parallel
      const [linesRes, invRes, projRes] = await Promise.all([
        supabase
          .from('po_line_items')
          .select('po_id, quantity, unit_price, original_unit_price, lead_time_days, price_adjusted_by_supplier')
          .in('po_id', poIds),
        supabase
          .from('invoices')
          .select('id, po_id, total_amount, status, submitted_at, approved_at, paid_at, created_at')
          .in('po_id', poIds),
        supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds),
      ]);

      const lines = (linesRes.data || []) as any[];
      const invoices = (invRes.data || []) as any[];
      const projects = (projRes.data || []) as any[];
      const projectName = new Map<string, string>(projects.map(p => [p.id, p.name]));

      // Group lines by PO for delivery-risk calc
      const linesByPo = new Map<string, any[]>();
      lines.forEach(l => {
        const arr = linesByPo.get(l.po_id) || [];
        arr.push(l);
        linesByPo.set(l.po_id, arr);
      });

      // Per-project accumulators for hot list
      const perProject = new Map<string, { late: number; lateValue: number; repriced: number; dueSoon: number }>();
      const bump = (pid: string, k: 'late' | 'lateValue' | 'repriced' | 'dueSoon', v: number) => {
        const e = perProject.get(pid) || { late: 0, lateValue: 0, repriced: 0, dueSoon: 0 };
        e[k] += v;
        perProject.set(pid, e);
      };

      // 3) Late + In-transit + ETA today
      let lateCount = 0, lateValue = 0;
      let inTransitCount = 0, inTransitValue = 0;
      let etaToday = 0;

      pos.forEach(po => {
        const inFlight = po.status === 'ORDERED' || po.status === 'READY_FOR_DELIVERY';
        if (inFlight) {
          inTransitCount++;
          inTransitValue += Number(po.po_total || 0);
        }

        if (!po.ordered_at || po.status === 'DELIVERED' || po.status === 'FINALIZED') return;

        const poLines = linesByPo.get(po.id) || [];
        const quotedLeads = poLines.map(l => l.lead_time_days).filter((d: any) => d != null);
        if (!quotedLeads.length) return;
        const maxQuoted = Math.max(...quotedLeads);
        const ordered = new Date(po.ordered_at);
        const expectedBy = new Date(ordered.getTime() + maxQuoted * 86400000);

        if (now > expectedBy && inFlight) {
          lateCount++;
          lateValue += Number(po.po_total || 0);
          bump(po.project_id, 'late', 1);
          bump(po.project_id, 'lateValue', Number(po.po_total || 0));
        } else if (inFlight && expectedBy.toISOString().slice(0, 10) === todayKey) {
          etaToday++;
        }
      });

      // 4) Re-priced lines
      let repricedDelta = 0;
      let repricedLineCount = 0;
      const poProjectMap = new Map<string, string>(pos.map(p => [p.id, p.project_id]));

      lines.forEach(li => {
        if (li.price_adjusted_by_supplier && li.original_unit_price && li.unit_price) {
          repricedLineCount++;
          const delta = (Number(li.unit_price) - Number(li.original_unit_price)) * Number(li.quantity || 0);
          repricedDelta += delta;
          const pid = poProjectMap.get(li.po_id);
          if (pid) bump(pid, 'repriced', delta);
        }
      });

      // 5) Cash due ≤14 days + aging buckets (unpaid SUBMITTED/APPROVED invoices)
      let dueNext14Days = 0;
      let agingD31_60 = 0;
      let agingD60Plus = 0;
      const in14Days = new Date(now.getTime() + 14 * 86400000);

      invoices.forEach(inv => {
        const unpaid = (inv.status === 'SUBMITTED' || inv.status === 'APPROVED') && !inv.paid_at;
        if (!unpaid) return;
        const refTs = inv.submitted_at || inv.created_at;
        if (!refTs) return;
        const refDate = new Date(refTs);
        const ageDays = Math.floor((now.getTime() - refDate.getTime()) / 86400000);
        const amount = Number(inv.total_amount || 0);

        // Approximate "due date" = submitted + ~30d net terms
        const approxDue = new Date(refDate.getTime() + 30 * 86400000);
        if (approxDue <= in14Days) {
          dueNext14Days += amount;
          const pid = poProjectMap.get(inv.po_id);
          if (pid) bump(pid, 'dueSoon', amount);
        }

        if (ageDays > 60) agingD60Plus += amount;
        else if (ageDays > 30) agingD31_60 += amount;
      });

      // 6) Hot projects (top 3 by combined risk)
      const fmtUsd = (n: number) =>
        n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n)}`;

      const hotProjects: HotProject[] = Array.from(perProject.entries())
        .map(([pid, v]) => {
          const reasons: string[] = [];
          if (v.late > 0) reasons.push(`Late ${v.late}`);
          if (Math.abs(v.repriced) >= 1) reasons.push(`Re-priced ${v.repriced >= 0 ? '+' : '-'}${fmtUsd(Math.abs(v.repriced))}`);
          if (v.dueSoon > 0) reasons.push(`Due ${fmtUsd(v.dueSoon)} ≤14d`);
          const severity: 'red' | 'amber' = v.late > 0 ? 'red' : 'amber';
          const score = v.late * 1000 + Math.abs(v.repriced) + v.dueSoon * 0.1;
          return {
            projectId: pid,
            name: projectName.get(pid) || 'Project',
            reason: reasons.join(' · '),
            severity,
            _score: score,
          };
        })
        .filter(h => h.reason.length > 0)
        .sort((a: any, b: any) => b._score - a._score)
        .slice(0, 3)
        .map(({ _score, ...rest }: any) => rest);

      return {
        lateCount, lateValue,
        repricedDelta, repricedLineCount, repricedTotalLines: lines.length,
        dueNext14Days, agingD31_60, agingD60Plus,
        inTransitCount, inTransitValue, etaToday,
        hotProjects,
      };
    },
  });
}

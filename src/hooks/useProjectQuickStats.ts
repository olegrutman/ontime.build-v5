import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PhaseItem {
  id: string;
  title: string;
  progress: number;
  color: string;
}

export interface ProjectQuickStats {
  budgetPercent: number;
  budgetUsed: number;
  budgetTotal: number;
  schedulePercent: number;
  scheduleDelta: number; // positive = ahead, negative = behind
  openRFIs: number;
  urgentRFIs: number;
  phases: PhaseItem[];
  loading: boolean;
}

export function useProjectQuickStats(projectId: string | null): ProjectQuickStats {
  const [stats, setStats] = useState<ProjectQuickStats>({
    budgetPercent: 0,
    budgetUsed: 0,
    budgetTotal: 0,
    schedulePercent: 0,
    scheduleDelta: 0,
    openRFIs: 0,
    urgentRFIs: 0,
    phases: [],
    loading: true,
  });

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    async function fetch() {
      setStats((s) => ({ ...s, loading: true }));

      const today = new Date().toISOString().split('T')[0];

      const [contractRes, invoiceRes, scheduleRes, rfiRes] = await Promise.all([
        supabase
          .from('project_contracts')
          .select('contract_sum')
          .eq('project_id', projectId),
        supabase
          .from('invoices')
          .select('total_amount, status')
          .eq('project_id', projectId)
          .in('status', ['approved', 'paid']),
        supabase
          .from('project_schedule_items')
          .select('id, title, progress, color, start_date, end_date')
          .eq('project_id', projectId)
          .order('sort_order', { ascending: true }),
        supabase
          .from('project_rfis')
          .select('id, status, due_date')
          .eq('project_id', projectId)
          .eq('status', 'OPEN'),
      ]);

      if (cancelled) return;

      // Budget
      const budgetTotal = (contractRes.data ?? []).reduce(
        (sum, c) => sum + (c.contract_sum ?? 0),
        0
      );
      const budgetUsed = (invoiceRes.data ?? []).reduce(
        (sum, i) => sum + (i.total_amount ?? 0),
        0
      );
      const budgetPercent = budgetTotal > 0 ? Math.round((budgetUsed / budgetTotal) * 100) : 0;

      // Schedule
      const phases: PhaseItem[] = (scheduleRes.data ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        progress: s.progress ?? 0,
        color: s.color ?? '#6366f1',
      }));

      let schedulePercent = 0;
      let scheduleDelta = 0;
      if (phases.length > 0) {
        schedulePercent = Math.round(
          phases.reduce((sum, p) => sum + p.progress, 0) / phases.length
        );

        // Compute expected progress based on elapsed time
        const items = scheduleRes.data ?? [];
        const starts = items.map((i) => new Date(i.start_date).getTime());
        const ends = items
          .filter((i) => i.end_date)
          .map((i) => new Date(i.end_date!).getTime());

        if (starts.length > 0 && ends.length > 0) {
          const projectStart = Math.min(...starts);
          const projectEnd = Math.max(...ends);
          const totalDuration = projectEnd - projectStart;
          if (totalDuration > 0) {
            const elapsed = Date.now() - projectStart;
            const expectedPercent = Math.min(100, Math.round((elapsed / totalDuration) * 100));
            scheduleDelta = schedulePercent - expectedPercent;
          }
        }
      }

      // RFIs
      const openRFIs = rfiRes.data?.length ?? 0;
      const urgentRFIs = (rfiRes.data ?? []).filter(
        (r) => r.due_date && r.due_date <= today
      ).length;

      setStats({
        budgetPercent,
        budgetUsed,
        budgetTotal,
        schedulePercent,
        scheduleDelta,
        openRFIs,
        urgentRFIs,
        phases: phases.slice(0, 6), // show max 6 phases
        loading: false,
      });
    }

    fetch();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return stats;
}

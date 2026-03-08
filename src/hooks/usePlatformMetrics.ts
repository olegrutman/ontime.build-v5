import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, format } from 'date-fns';

export interface MonthlyData {
  month: string; // "Jan", "Feb", etc.
  users: number;
  organizations: number;
  projects: number;
}

export interface PeriodComparison {
  label: string;
  current: number;
  previous: number;
  isCurrency?: boolean;
}

export interface BreakdownItem {
  label: string;
  count: number;
}

export interface RecentLog {
  id: string;
  created_at: string;
  action_type: string;
  created_by_name: string | null;
  created_by_email: string | null;
  action_summary: string | null;
  target_org_name: string | null;
}

export interface PlatformMetrics {
  monthlyTrends: MonthlyData[];
  periodComparisons: PeriodComparison[];
  orgsByType: BreakdownItem[];
  projectsByStatus: BreakdownItem[];
  invoicesByStatus: BreakdownItem[];
  recentLogs: RecentLog[];
  loading: boolean;
}

function groupByMonth(rows: { created_at: string }[], months: Date[]): number[] {
  const counts = months.map(() => 0);
  rows.forEach((r) => {
    const d = new Date(r.created_at);
    for (let i = 0; i < months.length; i++) {
      const start = months[i];
      const end = i < months.length - 1 ? months[i + 1] : new Date();
      if (d >= start && d < end) {
        counts[i]++;
        break;
      }
    }
  });
  return counts;
}

function countByField(rows: any[], field: string): BreakdownItem[] {
  const map: Record<string, number> = {};
  rows.forEach((r) => {
    const val = (r[field] || 'unknown') as string;
    map[val] = (map[val] || 0) + 1;
  });
  return Object.entries(map)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function usePlatformMetrics(): PlatformMetrics {
  const [data, setData] = useState<PlatformMetrics>({
    monthlyTrends: [],
    periodComparisons: [],
    orgsByType: [],
    projectsByStatus: [],
    invoicesByStatus: [],
    recentLogs: [],
    loading: true,
  });

  useEffect(() => {
    async function fetch() {
      const now = new Date();
      const sixMonthsAgo = startOfMonth(subMonths(now, 5));
      const thisMonthStart = startOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const cutoff = sixMonthsAgo.toISOString();

      // Build month boundaries
      const months: Date[] = [];
      for (let i = 5; i >= 0; i--) {
        months.push(startOfMonth(subMonths(now, i)));
      }

      const [profilesRes, orgsRes, projectsRes, invoicesRes, logsRes] = await Promise.all([
        supabase.from('profiles').select('created_at').gte('created_at', cutoff),
        supabase.from('organizations').select('created_at, type'),
        supabase.from('projects').select('created_at, status'),
        supabase.from('invoices').select('created_at, status, total_amount, paid_at'),
        supabase.from('support_actions_log').select('id, created_at, action_type, created_by_name, created_by_email, action_summary, target_org_name').order('created_at', { ascending: false }).limit(10),
      ]);

      const profiles = profilesRes.data || [];
      const orgs = orgsRes.data || [];
      const projects = projectsRes.data || [];
      const invoices = invoicesRes.data || [];
      const logs = (logsRes.data || []) as RecentLog[];

      // Filter to 6-month window for trends
      const recentOrgs = orgs.filter((o) => new Date(o.created_at) >= sixMonthsAgo);
      const recentProjects = projects.filter((p) => new Date(p.created_at) >= sixMonthsAgo);

      const usersByMonth = groupByMonth(profiles, months);
      const orgsByMonth = groupByMonth(recentOrgs, months);
      const projectsByMonth = groupByMonth(recentProjects, months);

      const monthlyTrends: MonthlyData[] = months.map((m, i) => ({
        month: format(m, 'MMM'),
        users: usersByMonth[i],
        organizations: orgsByMonth[i],
        projects: projectsByMonth[i],
      }));

      // Period comparisons
      const thisMonth = thisMonthStart.toISOString();
      const lastMonth = lastMonthStart.toISOString();

      const usersThis = profiles.filter((p) => p.created_at >= thisMonth).length;
      const usersLast = profiles.filter((p) => p.created_at >= lastMonth && p.created_at < thisMonth).length;
      const orgsThis = recentOrgs.filter((o) => o.created_at >= thisMonth).length;
      const orgsLast = recentOrgs.filter((o) => o.created_at >= lastMonth && o.created_at < thisMonth).length;
      const projThis = recentProjects.filter((p) => p.created_at >= thisMonth).length;
      const projLast = recentProjects.filter((p) => p.created_at >= lastMonth && p.created_at < thisMonth).length;

      const invThis = invoices.filter((i) => i.created_at >= thisMonth);
      const invLast = invoices.filter((i) => i.created_at >= lastMonth && i.created_at < thisMonth);
      const invValueThis = invThis.reduce((s, i) => s + (i.total_amount || 0), 0);
      const invValueLast = invLast.reduce((s, i) => s + (i.total_amount || 0), 0);

      const periodComparisons: PeriodComparison[] = [
        { label: 'New Users', current: usersThis, previous: usersLast },
        { label: 'New Orgs', current: orgsThis, previous: orgsLast },
        { label: 'New Projects', current: projThis, previous: projLast },
        { label: 'Invoices Created', current: invThis.length, previous: invLast.length },
        { label: 'Invoice Value', current: invValueThis, previous: invValueLast, isCurrency: true },
      ];

      setData({
        monthlyTrends,
        periodComparisons,
        orgsByType: countByField(orgs, 'type'),
        projectsByStatus: countByField(projects, 'status'),
        invoicesByStatus: countByField(invoices, 'status'),
        recentLogs: logs,
        loading: false,
      });
    }
    fetch();
  }, []);

  return data;
}

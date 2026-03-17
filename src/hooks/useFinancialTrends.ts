import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subMonths, startOfMonth } from 'date-fns';

export interface MonthlySpend {
  month: string;
  billed: number;
  paid: number;
}

export interface MonthlyWorkOrders {
  month: string;
  created: number;
  approved: number;
}

export function useFinancialTrends() {
  const { user, userOrgRoles } = useAuth();
  const [spendTrend, setSpendTrend] = useState<MonthlySpend[]>([]);
  const [woTrend, setWoTrend] = useState<MonthlyWorkOrders[]>([]);
  const [loading, setLoading] = useState(true);

  const currentOrg = userOrgRoles[0]?.organization;

  useEffect(() => {
    if (!currentOrg?.id || !user) return;

    const fetchTrends = async () => {
      setLoading(true);
      const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5)).toISOString();

      // Get projects for this org
      const { data: ownedProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', currentOrg.id);

      const { data: participantProjects } = await supabase
        .from('project_participants')
        .select('project_id')
        .eq('organization_id', currentOrg.id)
        .eq('invite_status', 'ACCEPTED');

      const projectIds = [
        ...new Set([
          ...(ownedProjects || []).map(p => p.id),
          ...(participantProjects || []).map(p => p.project_id).filter(Boolean) as string[],
        ]),
      ];

      if (projectIds.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch invoices for spend trend
      const { data: invoices } = await supabase
        .from('invoices')
        .select('status, total_amount, created_at, paid_at')
        .in('project_id', projectIds)
        .gte('created_at', sixMonthsAgo);

      // Work orders removed

      // Build 6-month buckets
      const months: string[] = [];
      for (let i = 5; i >= 0; i--) {
        months.push(format(startOfMonth(subMonths(new Date(), i)), 'yyyy-MM'));
      }

      const spendByMonth: MonthlySpend[] = months.map(m => {
        const monthInvoices = (invoices || []).filter(
          inv => format(new Date(inv.created_at), 'yyyy-MM') === m
        );
        return {
          month: format(new Date(m + '-01'), 'MMM'),
          billed: monthInvoices
            .filter(i => i.status !== 'DRAFT')
            .reduce((s, i) => s + (i.total_amount || 0), 0),
          paid: monthInvoices
            .filter(i => i.status === 'PAID')
            .reduce((s, i) => s + (i.total_amount || 0), 0),
        };
      });

      const woByMonth: MonthlyWorkOrders[] = months.map(m => ({
        month: format(new Date(m + '-01'), 'MMM'),
        created: 0,
        approved: 0,
      }));

      setSpendTrend(spendByMonth);
      setWoTrend(woByMonth);
      setLoading(false);
    };

    fetchTrends();
  }, [user?.id, currentOrg?.id]);

  return { spendTrend, woTrend, loading };
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth } from 'date-fns';

export interface MonthlyPoint {
  month: string;
  billed: number;
  paid: number;
}

/**
 * Per-project 6-month monthly rollup of invoice activity.
 * Used to render sparklines inside project overview KPI cards.
 */
export function useProjectMonthlyBilling(projectId: string | undefined) {
  return useQuery<MonthlyPoint[]>({
    queryKey: ['project-monthly-billing', projectId],
    enabled: !!projectId,
    staleTime: 60_000,
    queryFn: async () => {
      const since = startOfMonth(subMonths(new Date(), 5)).toISOString();
      const { data: invoices } = await supabase
        .from('invoices')
        .select('status, total_amount, created_at, paid_at')
        .eq('project_id', projectId!)
        .gte('created_at', since);

      const months: string[] = [];
      for (let i = 5; i >= 0; i--) {
        months.push(format(startOfMonth(subMonths(new Date(), i)), 'yyyy-MM'));
      }

      return months.map((m) => {
        const monthInvoices = (invoices ?? []).filter(
          (inv) => format(new Date(inv.created_at), 'yyyy-MM') === m,
        );
        return {
          month: format(new Date(m + '-01'), 'MMM'),
          billed: monthInvoices
            .filter((i) => (i.status ?? '').toUpperCase() !== 'DRAFT')
            .reduce((s, i) => s + (Number(i.total_amount) || 0), 0),
          paid: monthInvoices
            .filter((i) => (i.status ?? '').toUpperCase() === 'PAID')
            .reduce((s, i) => s + (Number(i.total_amount) || 0), 0),
        };
      });
    },
  });
}

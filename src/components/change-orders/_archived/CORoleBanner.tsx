import { cn } from '@/lib/utils';
import type { COFinancials } from '@/types/changeOrder';

interface CORoleBannerProps {
  role: 'GC' | 'TC' | 'FC';
  financials?: COFinancials;
}

const CONFIG = {
  GC: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    text: (f?: COFinancials) =>
      'You are viewing as GC. TC and FC pricing is hidden from your view. You see only the TC\'s final price.',
  },
  TC: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: (f?: COFinancials) =>
      `You are viewing as TC. FC submitted ${f?.fcTotalHours ?? 0} hours. Toggle below to use as your base. GC sees only your final price.`,
  },
  FC: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    text: () =>
      'You are viewing as FC. Enter hours and describe materials. Pricing is not visible to you.',
  },
};

export function CORoleBanner({ role, financials }: CORoleBannerProps) {
  const c = CONFIG[role];
  return (
    <div className={cn('rounded-lg border px-3 py-2.5 text-xs leading-relaxed', c.bg, c.border)}>
      {c.text(financials)}
    </div>
  );
}

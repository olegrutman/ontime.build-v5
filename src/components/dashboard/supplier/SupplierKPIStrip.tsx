import { useEffect, useState, useRef } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { SupplierKPIs } from '@/hooks/useSupplierDashboardData';

function useCountUp(target: number, duration = 900, delay = 0) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>();
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCurrent(Math.round(target * eased));
        if (progress < 1) rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);
    return () => { clearTimeout(timeout); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, delay]);
  return current;
}

interface KPICardProps {
  label: string;
  value: number;
  tag: string;
  tagColor: 'green' | 'red' | 'amber' | 'neutral';
  subText: string;
  delay: number;
}

const tagStyles: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  neutral: 'bg-accent text-muted-foreground',
};

function KPICard({ label, value, tag, tagColor, subText, delay }: KPICardProps) {
  const animatedValue = useCountUp(value, 900, delay);
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);

  return (
    <div
      className={`bg-card border border-border rounded-lg px-3.5 md:px-4 py-3.5 md:py-[18px] transition-all duration-300 hover:-translate-y-px hover:shadow-md ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2.5'
      }`}
    >
      <div className="text-[0.7rem] md:text-[0.72rem] uppercase tracking-[0.5px] text-muted-foreground mb-2">
        {label}
      </div>
      <div className="flex items-center justify-between mb-1">
        <span className="font-heading text-[2rem] font-black tracking-tight text-foreground leading-none">
          {formatCurrency(animatedValue)}
        </span>
        {tag && (
          <span className={`text-[0.68rem] font-semibold px-2 py-0.5 rounded-full ${tagStyles[tagColor]}`}>
            {tag}
          </span>
        )}
      </div>
      <div className="text-[0.72rem] text-muted-foreground">{subText}</div>
    </div>
  );
}

interface Props { kpis: SupplierKPIs; }

export function SupplierKPIStrip({ kpis }: Props) {
  // MoM% trend — only meaningful when previous month has data
  const hasPriorData = kpis.paidLastMonth > 0;
  const momTrend = hasPriorData
    ? Math.round(((kpis.paidThisMonth - kpis.paidLastMonth) / kpis.paidLastMonth) * 100)
    : 0;
  const momTag = !hasPriorData
    ? (kpis.paidThisMonth > 0 ? 'New' : '—')
    : momTrend > 0 ? `↑ ${momTrend}%` : momTrend < 0 ? `↓ ${Math.abs(momTrend)}%` : 'Flat';
  const momColor = !hasPriorData
    ? (kpis.paidThisMonth > 0 ? 'green' : 'neutral')
    : momTrend > 0 ? 'green' : momTrend < 0 ? 'red' : 'neutral';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      <KPICard
        label="Total Receivable"
        value={kpis.totalReceivable}
        tag={kpis.overdueCount > 0 ? `${kpis.overdueCount} overdue` : 'Current'}
        tagColor={kpis.overdueCount > 0 ? 'red' : 'green'}
        subText="Outstanding invoices"
        delay={0}
      />
      <KPICard
        label="Paid This Month"
        value={kpis.paidThisMonth}
        tag={momTag}
        tagColor={momColor as any}
        subText="vs last month"
        delay={40}
      />
      <KPICard
        label="Open Orders"
        value={kpis.openOrdersCount}
        tag={kpis.needsConfirmationCount > 0 ? `${kpis.needsConfirmationCount} to confirm` : 'All confirmed'}
        tagColor={kpis.needsConfirmationCount > 0 ? 'amber' : 'green'}
        subText="Active purchase orders"
        delay={80}
      />
      <KPICard
        label="Credit Exposure"
        value={kpis.creditExposure}
        tag={kpis.creditExposure > 0 ? 'At risk' : 'Clear'}
        tagColor={kpis.creditExposure > 0 ? 'red' : 'green'}
        subText="Delivered, not yet approved"
        delay={120}
      />
    </div>
  );
}

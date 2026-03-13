import { useEffect, useState, useRef } from 'react';
import { formatCurrency } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: number;
  tag: string;
  tagColor: 'green' | 'red' | 'yellow' | 'neutral';
  subText: string;
  barPercent: number;
  barColor: 'primary' | 'green' | 'yellow' | 'navy';
  delay: number;
}

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
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay]);

  return current;
}

const tagStyles = {
  green: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-red-700',
  yellow: 'bg-amber-50 text-amber-700',
  neutral: 'bg-accent text-muted-foreground',
};

const barStyles = {
  primary: 'bg-primary',
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  navy: 'bg-secondary opacity-60',
};

function KPICard({ label, value, tag, tagColor, subText, barPercent, barColor, delay }: KPICardProps) {
  const animatedValue = useCountUp(value, 900, delay);
  const [barWidth, setBarWidth] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    const t = setTimeout(() => setBarWidth(barPercent), 300 + delay);
    return () => clearTimeout(t);
  }, [barPercent, delay]);

  return (
    <div
      className={`bg-card border border-border rounded-lg px-3.5 md:px-4 py-3.5 md:py-[18px] transition-all duration-300 hover:-translate-y-px hover:shadow-md ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2.5'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="text-[0.7rem] md:text-[0.72rem] uppercase tracking-[0.4px] md:tracking-[0.5px] text-muted-foreground mb-2">
        {label}
      </div>
      <div className="flex items-center justify-between mb-1">
        <span className="font-heading text-[2rem] font-black tracking-tight text-foreground leading-none">
          {formatCurrency(animatedValue)}
        </span>
        <span className={`text-[0.68rem] font-semibold px-2 py-0.5 rounded-full ${tagStyles[tagColor]}`}>
          {tag}
        </span>
      </div>
      <div className="text-[0.72rem] text-muted-foreground mb-3">{subText}</div>
      <div className="h-1 md:h-[3px] bg-accent rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${barStyles[barColor]}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

interface DashboardKPIRowProps {
  financials: {
    totalRevenue: number;
    totalBilled: number;
  };
  billing: {
    outstandingToPay: number;
    outstandingToCollect: number;
  };
  attentionCount: number;
}

export function DashboardKPIRow({ financials, billing, attentionCount }: DashboardKPIRowProps) {
  const contractValue = financials.totalRevenue || 0;
  const invoicesPaid = financials.totalBilled || 0;
  const billedPercent = contractValue > 0 ? Math.round((invoicesPaid / contractValue) * 100) : 0;

  const outstandingToPay = billing.outstandingToPay || 0;
  const outstandingToCollect = billing.outstandingToCollect || 0;

  const pendingValue = outstandingToPay;
  const pendingPercent = contractValue > 0 ? Math.round((pendingValue / contractValue) * 100) : 0;

  const collectPercent = contractValue > 0 ? Math.min(Math.round((outstandingToCollect / contractValue) * 100), 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      <KPICard
        label="Contract Value"
        value={contractValue}
        tag="Active"
        tagColor="neutral"
        subText="Total portfolio value"
        barPercent={100}
        barColor="primary"
        delay={0}
      />
      <KPICard
        label="Invoices Paid"
        value={invoicesPaid}
        tag={billedPercent > 0 ? `↑ ${billedPercent}%` : '0%'}
        tagColor={billedPercent > 0 ? 'green' : 'neutral'}
        subText={`${billedPercent}% of contract`}
        barPercent={billedPercent}
        barColor="green"
        delay={40}
      />
      <KPICard
        label="Pending Review"
        value={pendingValue}
        tag={`${attentionCount} items`}
        tagColor="yellow"
        subText="Invoices awaiting approval"
        barPercent={Math.min(pendingPercent, 100)}
        barColor="yellow"
        delay={80}
      />
      <KPICard
        label="Outstanding"
        value={outstandingToCollect}
        tag="To collect"
        tagColor="neutral"
        subText="Submitted & approved"
        barPercent={collectPercent}
        barColor="navy"
        delay={120}
      />
    </div>
  );
}

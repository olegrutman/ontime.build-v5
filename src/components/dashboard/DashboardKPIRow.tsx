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
      className={`bg-card border border-border rounded-lg px-3.5 md:px-4 py-3.5 md:py-[18px] relative overflow-hidden transition-all duration-300 hover:-translate-y-px hover:shadow-md animate-fade-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Bottom accent line */}
      <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${barStyles[barColor]}`} />
      <div className="text-[0.7rem] md:text-[0.72rem] uppercase tracking-[0.4px] md:tracking-[0.5px] text-muted-foreground mb-2">
        {label}
      </div>
      <div className="flex items-center justify-between mb-1">
        <span className="font-heading text-[1.5rem] md:text-[2rem] font-black tracking-tight text-foreground leading-none">
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
    paidByYou: number;
    paidToYou: number;
  };
}

export function DashboardKPIRow({ financials }: DashboardKPIRowProps) {
  const contractValue = financials.totalRevenue || 0;
  const paidByYou = financials.paidByYou || 0;
  const paidToYou = financials.paidToYou || 0;
  const paidByYouPercent = contractValue > 0 ? Math.round((paidByYou / contractValue) * 100) : 0;
  const paidToYouPercent = contractValue > 0 ? Math.round((paidToYou / contractValue) * 100) : 0;

  const profit = paidToYou - paidByYou;
  const marginPercent = paidToYou > 0 ? Math.round((profit / paidToYou) * 100) : 0;
  const profitBarPercent = contractValue > 0 ? Math.min(Math.round((Math.abs(profit) / contractValue) * 100), 100) : 0;

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
        label="Paid by You"
        value={paidByYou}
        tag={paidByYouPercent > 0 ? `${paidByYouPercent}%` : '0%'}
        tagColor="red"
        subText="Outgoing payments"
        barPercent={Math.min(paidByYouPercent, 100)}
        barColor="yellow"
        delay={40}
      />
      <KPICard
        label="Paid to You"
        value={paidToYou}
        tag={paidToYouPercent > 0 ? `${paidToYouPercent}%` : '0%'}
        tagColor="green"
        subText="Incoming payments"
        barPercent={Math.min(paidToYouPercent, 100)}
        barColor="green"
        delay={80}
      />
      <KPICard
        label="Profit Margin"
        value={Math.abs(profit)}
        tag={`${marginPercent}%`}
        tagColor={profit >= 0 ? 'green' : 'red'}
        subText="Net from paid invoices"
        barPercent={profitBarPercent}
        barColor={profit >= 0 ? 'green' : 'yellow'}
        delay={120}
      />
    </div>
  );
}

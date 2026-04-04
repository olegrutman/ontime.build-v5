import { useEffect, useRef, useState } from 'react';

interface KpiCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  accent: string;
  subtitle: string;
  index: number;
}

function formatCompact(n: number, prefix = ''): string {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(1)}K`;
  return `${prefix}${n}`;
}

export function KpiCard({ label, value, prefix = '', accent, subtitle, index }: KpiCardProps) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    if (animated.current) return;
    const timer = setTimeout(() => {
      animated.current = true;
      const duration = 1100;
      const start = performance.now();
      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(value * eased));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, 100 + index * 80);
    return () => clearTimeout(timer);
  }, [value, index]);

  return (
    <div
      ref={ref}
      className="bg-[#0D1F3C] rounded-lg p-4 relative overflow-hidden opacity-0 animate-[fadeUp_400ms_ease-out_forwards]"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: accent }} />
      <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">{label}</p>
      <p className="text-2xl font-black text-white mt-1 font-heading">
        {formatCompact(display, prefix)}
      </p>
      <p className="text-[11px] text-white/30 mt-1">{subtitle}</p>
    </div>
  );
}

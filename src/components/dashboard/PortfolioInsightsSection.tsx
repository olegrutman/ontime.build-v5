import { useState, type ReactNode } from 'react';
import { ChevronDown, BarChart3 } from 'lucide-react';
import { C, fontLabel, fontVal } from '@/components/shared/KpiCard';
import { useIsMobile } from '@/hooks/use-mobile';

interface PortfolioInsightsSectionProps {
  children: ReactNode;
  /** Default open state. If omitted, defaults to true on desktop and false on mobile. */
  defaultOpen?: boolean;
}

export function PortfolioInsightsSection({ children, defaultOpen }: PortfolioInsightsSectionProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(defaultOpen ?? !isMobile);


  return (
    <section
      style={{
        display: 'flex', flexDirection: 'column', gap: 12,
        ...fontLabel,
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between',
          padding: '10px 14px', borderRadius: 12,
          background: C.surface, border: `1px solid ${C.border}`,
          cursor: 'pointer', textAlign: 'left',
        }}
        className="hover:bg-muted/40 transition-colors"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart3 size={16} color={C.muted} />
          <span style={{
            fontSize: '0.92rem', color: C.ink, ...fontVal,
            textTransform: 'uppercase', letterSpacing: '0.6px',
          }}>
            Portfolio Insights
          </span>
          <span className="hidden sm:inline" style={{ fontSize: '0.68rem', color: C.faint, fontWeight: 600 }}>
            Aggregate KPIs across all projects
          </span>

        </div>
        <ChevronDown
          size={16}
          color={C.muted}
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms ease' }}
        />
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="animate-fade-in">
          {children}
        </div>
      )}
    </section>
  );
}

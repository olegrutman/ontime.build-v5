import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { C, KpiCard, fmt } from '@/components/shared/KpiCard';

export interface StatTile {
  label: string;
  /** Numeric value, or a pre-formatted string (e.g. a count). */
  value: number | string;
  /** When true the value is rendered as-is instead of currency-formatted. */
  raw?: boolean;
  hint?: string;
  tab?: string;
}

interface Props {
  tiles: StatTile[];
  onNavigate: (tab: string) => void;
}

/**
 * Compact strip for KPI stages that have no data yet — keeps them visible
 * and clickable without spending a full expandable card on a `$0`.
 */
export function SupplierStatStrip({ tiles, onNavigate }: Props) {
  if (tiles.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
      {tiles.map((t, idx) => <KpiCard key={t.label} label={t.label}
        value={t.raw ? String(t.value) : fmt(typeof t.value === 'number' ? t.value : 0)} sub={t.hint ?? t.label}
        icon={<Package size={18} />} accent={C.blue} iconBg={C.blueBg} idx={idx}>
        <div className="space-y-3 p-4 text-sm text-muted-foreground"><p>{t.hint ?? t.label}</p>
          {t.tab && <Button variant="outline" onClick={() => t.tab && onNavigate(t.tab)}>Open {t.label}</Button>}
        </div>
      </KpiCard>)}
    </div>
  );
}

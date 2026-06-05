import { Children, cloneElement, isValidElement, type ReactNode } from 'react';

interface KpiGridProps {
  children: ReactNode;
  /** Optional cap for lg+ columns. Defaults to 4. */
  columns?: 3 | 4 | 5;
}

// Pick a lg column count that produces a full final row whenever possible.
const COL_MAP: Record<number, number> = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5,
  6: 3, 7: 4, 8: 4, 9: 3,
  10: 5, 11: 4, 12: 4,
};

const LG_CLASS: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
};

export function KpiGrid({ children, columns }: KpiGridProps) {
  const items = Children.toArray(children).filter(Boolean);
  const count = items.length;

  // Resolve column count: explicit prop wins (clamped), otherwise auto-balance.
  let cols = columns ?? COL_MAP[count] ?? 4;
  if (count > 0 && cols > count) cols = count;

  const remainder = count % cols;
  const stretch = remainder > 0 ? Math.floor(cols / remainder) : 1;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 ${LG_CLASS[cols] ?? 'lg:grid-cols-4'}`}>
      {items.map((child, i) => {
        // Stretch trailing orphan cards to fill the final row on lg+ only.
        const isOrphan = remainder > 0 && i >= count - remainder;
        if (!isOrphan || stretch <= 1) return child;

        const wrapperClass = `lg:col-span-${stretch}`;
        // Wrap to avoid mutating arbitrary children; keep contents identical.
        if (isValidElement(child)) {
          return (
            <div key={(child as any).key ?? i} className={wrapperClass} style={{ display: 'contents' }}>
              <div className={wrapperClass}>{child}</div>
            </div>
          );
        }
        return <div key={i} className={wrapperClass}>{child}</div>;
      })}
    </div>
  );
}

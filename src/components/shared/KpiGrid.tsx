import { Children, type ReactNode } from 'react';

interface KpiGridProps {
  children: ReactNode;
  /** Optional cap for lg+ columns. Defaults to auto-balance based on child count. */
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

// Static class strings so Tailwind keeps them in the build.
const SPAN_CLASS: Record<number, string> = {
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
};

export function KpiGrid({ children, columns }: KpiGridProps) {
  const items = Children.toArray(children).filter(Boolean);
  const count = items.length;

  let cols = columns ?? COL_MAP[count] ?? 4;
  if (count > 0 && cols > count) cols = count;

  const remainder = count % cols;
  const stretch = remainder > 0 ? Math.floor(cols / remainder) : 1;
  const spanClass = stretch > 1 ? SPAN_CLASS[stretch] : '';

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 ${LG_CLASS[cols] ?? 'lg:grid-cols-4'}`}>
      {items.map((child, i) => {
        const isOrphan = remainder > 0 && i >= count - remainder;
        if (!isOrphan || !spanClass) return child;
        return (
          <div key={i} className={spanClass}>
            {child}
          </div>
        );
      })}
    </div>
  );
}

import type { ReactNode } from 'react';

interface KpiGridProps {
  children: ReactNode;
  columns?: 3 | 4;
}

export function KpiGrid({ children, columns = 4 }: KpiGridProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 ${columns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
      {children}
    </div>
  );
}

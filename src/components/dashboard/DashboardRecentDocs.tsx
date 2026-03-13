import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

type DocFilter = 'all' | 'invoices' | 'work_orders' | 'change_orders';

const filters: { key: DocFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'work_orders', label: 'Work Orders' },
  { key: 'change_orders', label: 'Change Orders' },
];

export function DashboardRecentDocs() {
  const [filter, setFilter] = useState<DocFilter>('all');
  const isMobile = useIsMobile();

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="font-heading text-[1rem] font-bold text-foreground">Recent Documents</h3>
      </div>

      <div className="px-4 pb-2.5 flex gap-1 overflow-x-auto scrollbar-hide">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-[0.75rem] md:text-[0.7rem] font-medium px-3 py-1.5 md:px-2.5 md:py-1 rounded transition-colors whitespace-nowrap min-h-[36px] md:min-h-0 ${
              filter === f.key
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isMobile ? (
        /* ── Mobile: Empty state as stacked row ── */
        <div className="px-4 py-8 text-center">
          <span className="text-[1.8rem]">📄</span>
          <p className="text-[0.82rem] text-muted-foreground mt-1">No recent documents</p>
        </div>
      ) : (
        /* ── Desktop: Table ── */
        <table className="w-full text-left">
          <thead>
            <tr className="border-y border-border bg-accent">
              <th className="px-[18px] py-[7px] text-[0.64rem] uppercase tracking-[0.8px] text-muted-foreground font-medium">Description</th>
              <th className="px-[18px] py-[7px] text-[0.64rem] uppercase tracking-[0.8px] text-muted-foreground font-medium hidden sm:table-cell">Type</th>
              <th className="px-[18px] py-[7px] text-[0.64rem] uppercase tracking-[0.8px] text-muted-foreground font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-[18px] py-6 text-center text-[0.8rem] text-muted-foreground" colSpan={3}>
                No recent documents
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

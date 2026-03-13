import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import type { RecentDoc } from '@/hooks/useDashboardData';

type DocFilter = 'all' | 'invoices' | 'change_orders';

const filters: { key: DocFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'change_orders', label: 'Change Orders' },
];

const typeLabels: Record<string, string> = {
  invoice: 'Invoice',
  change_order: 'Change Order',
};

const typeBadgeStyles: Record<string, string> = {
  invoice: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  change_order: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
};

const statusBadgeStyles: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  PAID: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  contracted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  priced: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
};

interface Props {
  docs: RecentDoc[];
}

export function DashboardRecentDocs({ docs }: Props) {
  const [filter, setFilter] = useState<DocFilter>('all');
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const handleRowClick = (doc: RecentDoc) => {
    const tab = doc.type === 'invoice' ? 'invoices' : 'work-orders';
    navigate(`/project/${doc.projectId}?tab=${tab}`);
  };

  const filtered = filter === 'all'
    ? docs
    : filter === 'invoices'
    ? docs.filter(d => d.type === 'invoice')
    : docs.filter(d => d.type === 'change_order');

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="font-heading text-[1rem] font-bold text-foreground">Recent Documents</h3>
        <span className="text-[0.72rem] text-muted-foreground">{filtered.length} items</span>
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

      {filtered.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <span className="text-[1.8rem]">📄</span>
          <p className="text-[0.82rem] text-muted-foreground mt-1">No recent documents</p>
        </div>
      ) : isMobile ? (
        <div className="divide-y divide-border">
          {filtered.map(doc => (
            <div key={doc.id} className="px-4 py-3" style={{ minHeight: '56px' }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-[0.82rem] font-semibold text-foreground truncate">{doc.title}</span>
                  <Badge className={`text-[0.6rem] px-1.5 py-0 shrink-0 ${typeBadgeStyles[doc.type] || ''}`}>
                    {typeLabels[doc.type]}
                  </Badge>
                </div>
                <span className="text-[0.82rem] font-semibold text-foreground shrink-0">
                  {doc.amount != null ? formatCurrency(doc.amount) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[0.68rem] text-muted-foreground truncate">{doc.projectName}</span>
                <Badge className={`text-[0.58rem] px-1.5 py-0 shrink-0 ${statusBadgeStyles[doc.status] || statusBadgeStyles.draft}`}>
                  {doc.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-y border-border bg-accent">
              <th className="px-[18px] py-[7px] text-[0.64rem] uppercase tracking-[0.8px] text-muted-foreground font-medium">Description</th>
              <th className="px-[18px] py-[7px] text-[0.64rem] uppercase tracking-[0.8px] text-muted-foreground font-medium">Type</th>
              <th className="px-[18px] py-[7px] text-[0.64rem] uppercase tracking-[0.8px] text-muted-foreground font-medium">Status</th>
              <th className="px-[18px] py-[7px] text-[0.64rem] uppercase tracking-[0.8px] text-muted-foreground font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(doc => (
              <tr key={doc.id} className="border-b border-border">
                <td className="px-[18px] py-[10px]">
                  <div className="text-[0.8rem] font-semibold text-foreground">{doc.title}</div>
                  <div className="text-[0.68rem] text-muted-foreground">{doc.projectName}</div>
                </td>
                <td className="px-[18px] py-[10px]">
                  <Badge className={`text-[0.6rem] ${typeBadgeStyles[doc.type] || ''}`}>
                    {typeLabels[doc.type]}
                  </Badge>
                </td>
                <td className="px-[18px] py-[10px]">
                  <Badge className={`text-[0.6rem] capitalize ${statusBadgeStyles[doc.status] || statusBadgeStyles.draft}`}>
                    {doc.status.replace(/_/g, ' ')}
                  </Badge>
                </td>
                <td className="px-[18px] py-[10px] text-right">
                  <span className="text-[0.8rem] font-semibold text-foreground">
                    {doc.amount != null ? formatCurrency(doc.amount) : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

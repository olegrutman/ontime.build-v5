// Archived during dashboard + overview redesign. Kept for reference only. Not used in active UI.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { RecentDoc } from '@/hooks/useDashboardData';

type DocFilter = 'all' | 'invoice' | 'change_order' | 'purchase_order';

const filterLabels: { value: DocFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'change_order', label: 'Change Orders' },
  { value: 'purchase_order', label: 'POs' },
];

const typeLabels: Record<string, string> = {
  invoice: 'Invoice',
  change_order: 'CO',
  purchase_order: 'PO',
};

const typeBadgeStyles: Record<string, string> = {
  invoice: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  change_order: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  purchase_order: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const statusBadgeStyles: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  PAID: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  PENDING_APPROVAL: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  ACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  PRICED: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  ORDERED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  contracted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  priced: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
};

const ATTENTION_STATUSES = new Set(['SUBMITTED', 'PENDING_APPROVAL', 'submitted', 'pending']);

interface Props {
  docs: RecentDoc[];
}

export function DashboardRecentDocs({ docs }: Props) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<DocFilter>('all');
  const [expanded, setExpanded] = useState(false);

  const filtered = filter === 'all' ? docs : docs.filter(d => d.type === filter);
  const displayed = expanded ? filtered : filtered.slice(0, 3);

  const handleRowClick = (doc: RecentDoc) => {
    switch (doc.type) {
      case 'invoice':
        navigate(`/project/${doc.projectId}/invoices`);
        break;
      case 'change_order':
        navigate(`/project/${doc.projectId}/change-orders`);
        break;
      case 'purchase_order':
        navigate(`/project/${doc.projectId}/purchase-orders`);
        break;
    }
  };

  const needsAttention = (status: string) => ATTENTION_STATUSES.has(status);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="font-heading text-[1rem] font-bold text-foreground">Recent Documents</h3>
        <span className="text-[0.72rem] text-muted-foreground">{filtered.length} items</span>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 px-4 pb-2">
        {filterLabels.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-[0.68rem] px-3 py-1 rounded-full font-medium transition-colors ${
              filter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
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
          {displayed.map(doc => (
            <div
              key={doc.id}
              className={`px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors ${
                needsAttention(doc.status) ? 'border-l-[3px] border-l-amber-400' : ''
              }`}
              style={{ minHeight: '56px' }}
              onClick={() => handleRowClick(doc)}
            >
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
            {displayed.map(doc => (
              <tr
                key={doc.id}
                className={`border-b border-border cursor-pointer hover:bg-accent/50 transition-colors ${
                  needsAttention(doc.status) ? 'border-l-[3px] border-l-amber-400' : ''
                }`}
                onClick={() => handleRowClick(doc)}
              >
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

      {filtered.length > 3 && (
        <div className="px-4 py-2 border-t border-border">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[0.72rem] text-primary hover:underline font-medium w-full text-center"
          >
            {expanded ? 'Show less' : `Show all (${filtered.length})`}
          </button>
        </div>
      )}
    </div>
  );
}

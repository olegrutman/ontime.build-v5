import { useState } from 'react';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown } from 'lucide-react';

interface ProjectPOSummaryProps {
  projectId: string;
}

interface PORow {
  id: string;
  po_number: string | null;
  po_name: string | null;
  status: string;
  po_total: number | null;
}

const STATUS_BADGE: Record<string, string> = {
  DELIVERED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  ORDERED: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  FINALIZED: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  DRAFT: 'bg-accent text-muted-foreground',
  SUBMITTED: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400',
};

export function ProjectPOSummary({ projectId }: ProjectPOSummaryProps) {
  const [pos, setPOs] = useState<PORow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchPOs = async () => {
      const { data } = await supabase
        .from('purchase_orders')
        .select('id, po_number, po_name, status, po_total')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20);
      setPOs(data || []);
      setLoading(false);
    };
    fetchPOs();
  }, [projectId]);

  if (loading) return <Skeleton className="h-48 rounded-3xl" />;
  if (pos.length === 0) return null;

  const visiblePOs = expanded ? pos : pos.slice(0, 3);
  const hasMore = pos.length > 3;

  return (
    <div className="rounded-3xl border border-border/60 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border/40">
        <h3 className="text-xl font-semibold tracking-tight">Purchase orders</h3>
        <p className="text-sm text-muted-foreground">Fast read version of the PO lifecycle</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-accent/30 text-muted-foreground">
            <tr>
              <th className="text-left px-5 py-3 font-medium">PO #</th>
              <th className="text-left px-5 py-3 font-medium">Package</th>
              <th className="text-left px-5 py-3 font-medium">Amount</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {visiblePOs.map((po) => (
              <tr key={po.id}>
                <td className="px-5 py-4 font-medium">{po.po_number || '—'}</td>
                <td className="px-5 py-4">{po.po_name || '—'}</td>
                <td className="px-5 py-4" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {po.po_total ? formatCurrency(po.po_total) : '—'}
                </td>
                <td className="px-5 py-4">
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', STATUS_BADGE[po.status] || STATUS_BADGE.DRAFT)}>
                    {po.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-3 text-sm text-primary font-medium hover:bg-accent/30 transition-colors flex items-center justify-center gap-1 border-t border-border/40"
        >
          {expanded ? 'Show less' : `Show all (${pos.length})`}
          <ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
        </button>
      )}
    </div>
  );
}

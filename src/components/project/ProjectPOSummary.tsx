import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/status-pill';
import { SurfaceCard, SurfaceCardHeader, SurfaceCardFooter } from '@/components/ui/surface-card';
import { CollapseToggle } from '@/components/ui/collapse-toggle';

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

const STATUS_VARIANT: Record<string, 'healthy' | 'info' | 'watch' | 'neutral' | 'at_risk'> = {
  DELIVERED: 'healthy',
  ORDERED: 'info',
  FINALIZED: 'watch',
  DRAFT: 'neutral',
  SUBMITTED: 'info',
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

  if (loading) return <Skeleton className="h-48 rounded-2xl" />;
  if (pos.length === 0) return null;

  const visiblePOs = expanded ? pos : pos.slice(0, 3);
  const hasMore = pos.length > 3;

  return (
    <SurfaceCard>
      <SurfaceCardHeader
        title="Purchase orders"
        subtitle="Fast read version of the PO lifecycle"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-[0.85rem]">
          <thead className="bg-slate-50 dark:bg-accent/20 text-muted-foreground">
            <tr>
              <th className="text-left px-5 py-2.5 font-medium text-[0.75rem]">PO #</th>
              <th className="text-left px-5 py-2.5 font-medium text-[0.75rem]">Package</th>
              <th className="text-left px-5 py-2.5 font-medium text-[0.75rem]">Amount</th>
              <th className="text-left px-5 py-2.5 font-medium text-[0.75rem]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {visiblePOs.map((po) => (
              <tr key={po.id}>
                <td className="px-5 py-3 font-medium">{po.po_number || '—'}</td>
                <td className="px-5 py-3">{po.po_name || '—'}</td>
                <td className="px-5 py-3 tabular-nums" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {po.po_total ? formatCurrency(po.po_total) : '—'}
                </td>
                <td className="px-5 py-3">
                  <StatusPill variant={STATUS_VARIANT[po.status] || 'neutral'}>
                    {po.status}
                  </StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <SurfaceCardFooter>
          <CollapseToggle expanded={expanded} totalCount={pos.length} onToggle={() => setExpanded(!expanded)} />
        </SurfaceCardFooter>
      )}
    </SurfaceCard>
  );
}

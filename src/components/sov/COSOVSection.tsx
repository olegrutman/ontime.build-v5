import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, FileSpreadsheet, GitPullRequestArrow, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Change Order SOVs.
 *
 * Each approved fixed-price CO carries its own SOV (`project_sov.sov_kind =
 * 'change_order'`) that sums to 100% of that CO's billable amount. The base
 * contract SOV is never touched by change orders — they are billed as separate
 * schedules from this section.
 */

interface COSOVRow {
  id: string;
  sov_name: string | null;
  contract_id: string | null;
  source_co_id: string;
  co_number: string | null;
  co_status: string | null;
  items: {
    id: string;
    item_name: string;
    item_group: string | null;
    value_amount: number;
    percent_of_contract: number;
    total_billed_amount: number;
    total_completion_percent: number;
  }[];
}

function fmt(n: number) {
  return `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function COSOVSection({
  projectId,
  contractIds,
  retainagePctByContract,
}: {
  projectId: string;
  contractIds: string[];
  retainagePctByContract?: Record<string, number>;
}) {
  const navigate = useNavigate();

  const { data: coSovs = [], isLoading } = useQuery<COSOVRow[]>({
    queryKey: ['co-sovs', projectId, contractIds.join(',')],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: sovs, error } = await supabase
        .from('project_sov')
        .select('id, sov_name, contract_id, source_co_id')
        .eq('project_id', projectId)
        .eq('sov_kind', 'change_order')
        .order('created_at');
      if (error) throw error;
      const rows = (sovs || []).filter(s => !!s.source_co_id);
      if (rows.length === 0) return [];

      const [itemsRes, cosRes] = await Promise.all([
        supabase
          .from('project_sov_items')
          .select('id, sov_id, item_name, item_group, value_amount, percent_of_contract, total_billed_amount, total_completion_percent')
          .in('sov_id', rows.map(r => r.id))
          .order('sort_order'),
        supabase
          .from('change_orders')
          .select('id, co_number, status')
          .in('id', rows.map(r => r.source_co_id as string)),
      ]);

      const itemsBySov = new Map<string, any[]>();
      (itemsRes.data || []).forEach((it: any) => {
        const list = itemsBySov.get(it.sov_id) || [];
        list.push(it);
        itemsBySov.set(it.sov_id, list);
      });
      const coById = new Map((cosRes.data || []).map((c: any) => [c.id, c]));

      return rows.map(r => ({
        id: r.id,
        sov_name: r.sov_name,
        contract_id: r.contract_id,
        source_co_id: r.source_co_id as string,
        co_number: coById.get(r.source_co_id as string)?.co_number ?? null,
        co_status: coById.get(r.source_co_id as string)?.status ?? null,
        items: (itemsBySov.get(r.id) || []).map((it: any) => ({
          id: it.id,
          item_name: it.item_name,
          item_group: it.item_group,
          value_amount: Number(it.value_amount ?? 0),
          percent_of_contract: Number(it.percent_of_contract ?? 0),
          total_billed_amount: Number(it.total_billed_amount ?? 0),
          total_completion_percent: Number(it.total_completion_percent ?? 0),
        })),
      }));
    },
  });

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  // Only surface CO SOVs tied to a contract the viewer can already see.
  const visible = coSovs.filter(s => !s.contract_id || contractIds.includes(s.contract_id));
  if (visible.length === 0) return null;

  const grandTotal = visible.reduce(
    (sum, s) => sum + s.items.reduce((a, i) => a + i.value_amount, 0),
    0
  );
  const grandBilled = visible.reduce(
    (sum, s) => sum + s.items.reduce((a, i) => a + i.total_billed_amount, 0),
    0
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <GitPullRequestArrow className="h-4 w-4 text-primary" />
              Change Order Schedules
              <Badge variant="outline" className="text-xs">{visible.length}</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Each approved fixed-price change order is billed on its own schedule. The base contract SOV stays unchanged.
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm font-semibold">{fmt(grandTotal)}</div>
            <div className="text-[0.7rem] uppercase tracking-[0.04em] text-muted-foreground">
              {fmt(grandBilled)} billed
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {visible.map(sov => (
          <COSOVRowCard
            key={sov.id}
            sov={sov}
            projectId={projectId}
            retainagePct={sov.contract_id ? retainagePctByContract?.[sov.contract_id] ?? 0 : 0}
            onBill={() => navigate(`/project/${projectId}/invoices`)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function COSOVRowCard({
  sov,
  retainagePct,
  onBill,
}: {
  sov: COSOVRow;
  projectId: string;
  retainagePct: number;
  onBill: () => void;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const total = sov.items.reduce((a, i) => a + i.value_amount, 0);
  const billed = sov.items.reduce((a, i) => a + i.total_billed_amount, 0);
  const pctBilled = total > 0 ? (billed / total) * 100 : 0;
  const fullyBilled = total > 0 && billed >= total - 0.005;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border border-border rounded-xl overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer select-none hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', !open && '-rotate-90')} />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{sov.sov_name || sov.co_number || 'Change order'}</div>
                <div className="text-xs text-muted-foreground">
                  {sov.items.length} line{sov.items.length === 1 ? '' : 's'} · {pctBilled.toFixed(1)}% billed
                  {retainagePct > 0 && ` · ${retainagePct}% ret.`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0" onClick={e => e.stopPropagation()}>
              <div className="text-right">
                <div className="font-mono text-sm font-semibold">{fmt(total)}</div>
                <div className="font-mono text-[0.7rem] text-muted-foreground">{fmt(billed)} billed</div>
              </div>
              {fullyBilled ? (
                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 text-xs">
                  Fully Billed
                </Badge>
              ) : (
                <Button size="sm" variant="outline" onClick={onBill}>
                  <Receipt className="h-3.5 w-3.5 mr-1" />Bill
                </Button>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {sov.items.length === 0 ? (
            <div className="px-3.5 py-6 text-center text-sm text-muted-foreground border-t border-border">
              <FileSpreadsheet className="h-6 w-6 mx-auto mb-1 opacity-40" />
              No priced lines on this change order yet
            </div>
          ) : (
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-3 py-2 w-8">#</th>
                    <th className="text-left px-3 py-2">Line Item</th>
                    <th className="text-right px-3 py-2 w-20">%</th>
                    <th className="text-right px-3 py-2 w-28">Value</th>
                    <th className="text-right px-3 py-2 w-28 hidden sm:table-cell">Billed</th>
                    <th className="text-right px-3 py-2 w-28 hidden md:table-cell">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {sov.items.map((item, idx) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium">{item.item_name}</td>
                      <td className="px-3 py-2 text-right font-mono">{item.percent_of_contract.toFixed(2)}%</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(item.value_amount)}</td>
                      <td className="px-3 py-2 text-right font-mono hidden sm:table-cell">{fmt(item.total_billed_amount)}</td>
                      <td className="px-3 py-2 text-right font-mono hidden md:table-cell">
                        {fmt(Math.max(0, item.value_amount - item.total_billed_amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-3.5 py-2 border-t border-border flex justify-end">
            <Button size="sm" variant="ghost" onClick={() => navigate(`/change-orders/${sov.source_co_id}`)}>
              Open change order
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

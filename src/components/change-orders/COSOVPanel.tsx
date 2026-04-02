import { DT } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface COSOVPanelProps {
  coId: string;
  isGC: boolean;
  isTC: boolean;
  isFC: boolean;
  myOrgId: string;
}

interface SOVItem {
  id: string;
  line_item_name: string;
  amount: number;
  status: string;
  org_id: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600',
  approved: 'bg-emerald-500/10 text-emerald-600',
  invoiced: 'bg-blue-500/10 text-blue-600',
};

function fmtCurrency(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function COSOVPanel({ coId, isGC, isTC, isFC, myOrgId }: COSOVPanelProps) {
  if (!isGC && !isTC) return null;

  const { data: items = [] } = useQuery({
    queryKey: ['co-sov-items', coId],
    enabled: !!coId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('co_sov_items')
        .select('*')
        .eq('co_id', coId)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as SOVItem[];
    },
  });

  // FC sees only their org's items
  const visibleItems = isFC ? items.filter(i => i.org_id === myOrgId) : items;

  if (visibleItems.length === 0) return null;

  const total = visibleItems.reduce((s, i) => s + (i.amount ?? 0), 0);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-3.5 py-3 border-b border-border flex items-center justify-between">
        <h3
          className="text-[0.7rem] uppercase tracking-[0.04em] font-semibold text-muted-foreground"
          style={DT.heading}
        >
          SOV Items
        </h3>
        <span className="text-xs font-semibold text-foreground" style={DT.mono}>
          {fmtCurrency(total)}
        </span>
      </div>
      <div className="divide-y divide-border">
        {visibleItems.map(item => (
          <div key={item.id} className="flex items-center justify-between px-3.5 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground truncate">{item.line_item_name}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-xs font-medium text-foreground" style={DT.mono}>
                {fmtCurrency(item.amount)}
              </span>
              <span
                className={cn(
                  'text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase',
                  STATUS_STYLES[item.status] ?? 'bg-muted text-muted-foreground',
                )}
              >
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

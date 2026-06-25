import { useQuery } from '@tanstack/react-query';
import { Loader2, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CombinedSOVCardProps {
  projectId: string;
  /** When provided, highlight this CO in the per-CO list. */
  currentCoId?: string;
}

interface PerCoRow {
  source_co_id: string;
  contract_id: string;
  line_count: number;
  total_scheduled_value: number;
  total_billed_to_date: number;
  total_remaining: number;
}

interface ContractRollupRow {
  contract_id: string;
  approved_co_count: number;
  total_scheduled_value: number;
  total_billed_to_date: number;
  total_remaining: number;
}

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/**
 * Combined CO SOV mini-card.
 *
 * Reads two complementary rollups:
 *  - `co_sov_per_co_view`        → one row per approved CO  (per-CO view)
 *  - `co_sov_contract_rollup`    → one row per contract     (per-contract view)
 *
 * Both are derived from `co_sov_lines`, which is itself maintained by the
 * existing change-order approval pipeline. This component is read-only.
 */
export function CombinedSOVCard({ projectId, currentCoId }: CombinedSOVCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['combined-co-sov', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const [perCoRes, contractRes] = await Promise.all([
        supabase
          .from('co_sov_per_co_view' as any)
          .select('source_co_id, contract_id, line_count, total_scheduled_value, total_billed_to_date, total_remaining')
          .eq('project_id', projectId),
        supabase
          .from('co_sov_contract_rollup' as any)
          .select('contract_id, approved_co_count, total_scheduled_value, total_billed_to_date, total_remaining')
          .eq('project_id', projectId),
      ]);
      return {
        perCo: ((perCoRes.data ?? []) as unknown as PerCoRow[]),
        byContract: ((contractRes.data ?? []) as unknown as ContractRollupRow[]),
      };
    },
  });

  if (isLoading) {
    return (
      <Card className="p-4 rounded-2xl flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading combined SOV…
      </Card>
    );
  }

  const perCo = data?.perCo ?? [];
  const byContract = data?.byContract ?? [];
  const totalScheduled = byContract.reduce((s, r) => s + Number(r.total_scheduled_value ?? 0), 0);
  const totalBilled = byContract.reduce((s, r) => s + Number(r.total_billed_to_date ?? 0), 0);
  const totalRemaining = byContract.reduce((s, r) => s + Number(r.total_remaining ?? 0), 0);

  if (perCo.length === 0 && byContract.length === 0) {
    return (
      <Card className="p-4 rounded-2xl">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-heading text-sm font-extrabold uppercase tracking-wide">
            Combined CO SOV
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          No approved CO lines have hit the combined SOV yet.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 rounded-2xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-heading text-sm font-extrabold uppercase tracking-wide">
            Combined CO SOV
          </h3>
        </div>
        <Badge variant="secondary" className="text-[0.65rem]">
          {perCo.length} CO{perCo.length === 1 ? '' : 's'} · {byContract.length} contract
          {byContract.length === 1 ? '' : 's'}
        </Badge>
      </div>

      {/* Top totals */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-lg border bg-background">
          <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-semibold">
            Scheduled
          </div>
          <div className="font-mono text-base font-bold">{fmt(totalScheduled)}</div>
        </div>
        <div className="p-2.5 rounded-lg border bg-background">
          <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-semibold">
            Billed
          </div>
          <div className="font-mono text-base font-bold">{fmt(totalBilled)}</div>
        </div>
        <div className="p-2.5 rounded-lg border bg-amber-50/40">
          <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-semibold">
            Remaining
          </div>
          <div className="font-mono text-base font-bold">{fmt(totalRemaining)}</div>
        </div>
      </div>

      {/* Per-CO breakdown */}
      {perCo.length > 0 && (
        <div>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
            Per CO
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {perCo.map((r) => {
              const active = r.source_co_id === currentCoId;
              const pct =
                Number(r.total_scheduled_value) > 0
                  ? (Number(r.total_billed_to_date) / Number(r.total_scheduled_value)) * 100
                  : 0;
              return (
                <div
                  key={r.source_co_id}
                  className={`flex items-center justify-between text-xs p-1.5 rounded ${
                    active ? 'bg-amber-50 border border-amber-300' : ''
                  }`}
                >
                  <div className="font-mono truncate max-w-[140px]" title={r.source_co_id}>
                    {r.source_co_id.slice(0, 8)}
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span>{fmt(Number(r.total_scheduled_value))}</span>
                    <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

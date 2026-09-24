import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const TOTAL_CHECKS = 12;

export function IntegrityAuditCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['integrity-audit-latest'],
    queryFn: async () => {
      const { data: run } = await supabase
        .from('integrity_audit_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!run) return { run: null, findings: [] as any[] };
      const { data: findings } = await supabase
        .from('integrity_audit_findings')
        .select('*')
        .eq('run_id', run.id)
        .order('check_key');
      return { run, findings: findings ?? [] };
    },
  });

  const runNow = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('run_integrity_audit' as any, { _source: 'manual' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrity-audit-latest'] }),
  });

  const groups = new Map<string, any[]>();
  (data?.findings ?? []).forEach((f) => {
    const arr = groups.get(f.check_key) ?? [];
    arr.push(f);
    groups.set(f.check_key, arr);
  });

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Money health audit
          </CardTitle>
          <CardDescription>
            Runs every night across all projects. Checks that invoices, change orders and schedules of values add up.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => runNow.mutate()} disabled={runNow.isPending}>
          <RefreshCw className={`h-4 w-4 mr-1 ${runNow.isPending ? 'animate-spin' : ''}`} /> Run now
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data?.run ? (
          <p className="text-sm text-muted-foreground">No audit has run yet.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant={groups.size ? 'destructive' : 'default'}>
                {TOTAL_CHECKS - groups.size}/{TOTAL_CHECKS} checks passing
              </Badge>
              <span className="text-muted-foreground">
                {data.run.findings_count} problem{data.run.findings_count === 1 ? '' : 's'} · last run{' '}
                {new Date(data.run.started_at).toLocaleString()} ({data.run.trigger_source})
              </span>
            </div>
            {[...groups.entries()].map(([key, items]) => (
              <details key={key} className="rounded-xl border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  {items[0].check_name} — {items.length} problem{items.length === 1 ? '' : 's'}
                </summary>
                <ul className="mt-2 space-y-1 text-xs">
                  {items.slice(0, 50).map((f) => (
                    <li key={f.id} className="flex flex-wrap gap-2">
                      {f.project_id ? (
                        <Link className="underline" to={`/project/${f.project_id}/overview`}>open project</Link>
                      ) : null}
                      <span>{f.detail}</span>
                      {f.expected != null && (
                        <span className="font-mono text-muted-foreground">
                          expected {Number(f.expected).toFixed(2)} · actual {Number(f.actual ?? 0).toFixed(2)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}

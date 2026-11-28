import { useQuery } from '@tanstack/react-query';
import { Check, History, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';
import { cn } from '@/lib/utils';

interface ReviewEvent {
  id: string;
  agreement: 'upstream' | 'crew';
  subject_label: string;
  decision: string;
  reason: string | null;
  decided_by_name: string | null;
  decided_by_org_name: string | null;
  decided_at: string;
}

const when = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Who accepted or rejected each item, per agreement. Rows are visible only to that agreement's two companies. */
export function COReviewHistory({ coId }: { coId: string }) {
  const rl = useRoleLabelsContext();
  const { data = [] } = useQuery({
    queryKey: ['co-review-events', coId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('co_review_events')
        .select('id, agreement, subject_label, decision, reason, decided_by_name, decided_by_org_name, decided_at')
        .eq('co_id', coId)
        .order('decided_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReviewEvent[];
    },
  });
  if (data.length === 0) return null;

  const groups = [
    { key: 'upstream', title: `${rl.TC} → ${rl.GC}`, rows: data.filter(e => e.agreement === 'upstream') },
    { key: 'crew', title: `${rl.FC} → ${rl.TC}`, rows: data.filter(e => e.agreement === 'crew') },
  ].filter(g => g.rows.length > 0);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm" id="co-review-history">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <History className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">Review history</h3>
      </div>
      {groups.map(group => (
        <details key={group.key} open className="border-b border-border last:border-b-0">
          <summary className="cursor-pointer select-none px-4 py-2 text-xs font-semibold text-foreground break-words">
            {group.title} · {group.rows.length} decision{group.rows.length === 1 ? '' : 's'}
          </summary>
          <ul className="space-y-2 px-4 pb-3">
            {group.rows.map(e => (
              <li key={e.id} className="flex gap-2">
                <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                  e.decision === 'approved' ? 'bg-state-approved-bg text-state-approved-foreground' : 'bg-destructive/10 text-destructive')}>
                  {e.decision === 'approved' ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-xs text-foreground">
                    <span className="font-semibold">{e.decision === 'approved' ? 'Accepted' : 'Rejected'}</span> · {e.subject_label}
                  </p>
                  <p className="break-words text-[11px] text-muted-foreground">
                    {(e.decided_by_name ?? 'Someone').replace(/\s+/g, ' ')}{e.decided_by_org_name ? `, ${e.decided_by_org_name}` : ''} · {when(e.decided_at)}
                  </p>
                  {e.reason && <p className="mt-0.5 break-words text-[11px] text-destructive">Reason: {e.reason}</p>}
                </div>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

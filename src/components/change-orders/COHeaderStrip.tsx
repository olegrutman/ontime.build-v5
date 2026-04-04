import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DT } from '@/lib/design-tokens';
import { format } from 'date-fns';
import { CO_STATUS_LABELS, CO_REASON_LABELS } from '@/types/changeOrder';
import type { ChangeOrder, COStatus, COReasonCode, COCreatedByRole } from '@/types/changeOrder';

interface COHeaderStripProps {
  co: ChangeOrder;
  role: COCreatedByRole;
  myOrgName: string;
}

function getTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ROLE_PILL_COLORS: Record<string, string> = {
  GC: 'bg-blue-500',
  TC: 'bg-emerald-500',
  FC: 'bg-amber-500',
};

export function COHeaderStrip({ co, role, myOrgName }: COHeaderStripProps) {
  const displayTitle = co.title ?? co.co_number ?? 'Change Order';

  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground font-medium">
            {co.co_number ?? '—'}
          </p>
          <h1
            className="font-heading text-foreground truncate mt-0.5"
            style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.1 }}
          >
            {displayTitle}
          </h1>
        </div>

        {/* Role pill */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn(
            'inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white',
            ROLE_PILL_COLORS[role] ?? 'bg-muted',
          )}>
            {role.charAt(0)}
          </span>
          <span className="text-xs text-muted-foreground font-medium">{myOrgName}</span>
        </div>
      </div>

      {/* Meta chips */}
      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
        {co.location_tag && (
          <span className="inline-flex items-center gap-1 text-[0.65rem] px-2 py-0.5 rounded-md bg-muted/30 text-muted-foreground">
            📍 {co.location_tag}
          </span>
        )}
        {co.reason && (
          <span className="inline-flex items-center text-[0.65rem] px-2 py-0.5 rounded-md bg-muted/30 text-muted-foreground">
            {CO_REASON_LABELS[co.reason as COReasonCode] ?? co.reason}
          </span>
        )}
        {co.created_at && (
          <span className="inline-flex items-center text-[0.65rem] px-2 py-0.5 rounded-md bg-muted/30 text-muted-foreground">
            {format(new Date(co.created_at), 'MMM d, yyyy')}
          </span>
        )}
        {co.submitted_at && (
          <span className="inline-flex items-center text-[0.65rem] px-2 py-0.5 rounded-md bg-muted/30 text-muted-foreground">
            Submitted {getTimeAgo(co.submitted_at)}
          </span>
        )}
      </div>
    </div>
  );
}

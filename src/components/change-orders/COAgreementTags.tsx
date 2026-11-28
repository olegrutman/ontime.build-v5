import { cn } from '@/lib/utils';
import type { COLineItem } from '@/types/changeOrder';
import { visibleAgreements, crewStatusLabel, upstreamStatusLabel, type AgreementView, type CrewAgreementStatus } from '@/lib/agreementStatus';

const tone = (kind: 'ok' | 'bad' | 'wait') => cn(
  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap',
  kind === 'ok' && 'bg-state-approved-bg text-state-approved-foreground',
  kind === 'bad' && 'bg-destructive/10 text-destructive',
  kind === 'wait' && 'bg-muted text-muted-foreground',
);

interface Props {
  item: COLineItem;
  view: AgreementView;
  crewStatus: CrewAgreementStatus;
  crewName?: string;
  upstreamName?: string;
  className?: string;
}

/** Item status tags scoped to the agreements the viewer is party to. */
export function COAgreementTags({ item, view, crewStatus, crewName, upstreamName, className }: Props) {
  const up = item.approval_status ?? 'pending';
  const show = visibleAgreements(view);
  const labeled = view === 'both';
  // Labeled tags stack: a small truncating company name above a short status pill, so long names never cover prices.
  const tag = (label: string | undefined, text: string, kind: 'ok' | 'bad' | 'wait') => (
    <span className={cn('flex min-w-0 max-w-full flex-col items-end gap-0.5', !labeled && 'contents')}>
      {labeled && label && <span className="max-w-full truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground" title={label}>{label}</span>}
      <span className={tone(kind)}>{text}</span>
    </span>
  );
  return (
    <span className={cn('inline-flex min-w-0 max-w-full flex-wrap items-start justify-end gap-1.5', className)}>
      {show.upstream && tag(upstreamName, upstreamStatusLabel(up), up === 'approved' ? 'ok' : up === 'rejected' ? 'bad' : 'wait')}
      {show.crew && crewStatus !== 'none' && tag(crewName ?? 'Crew', crewStatusLabel(crewStatus), crewStatus === 'accepted' ? 'ok' : crewStatus === 'rejected' ? 'bad' : 'wait')}
    </span>
  );
}

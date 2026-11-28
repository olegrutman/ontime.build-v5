import { cn } from '@/lib/utils';
import type { COLineItem } from '@/types/changeOrder';
import { crewStatusLabel, upstreamStatusLabel, type AgreementView, type CrewAgreementStatus } from '@/lib/agreementStatus';

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
  const upTag = (
    <span className={tone(up === 'approved' ? 'ok' : up === 'rejected' ? 'bad' : 'wait')}>
      {view === 'both' && upstreamName ? `${upstreamName}: ` : ''}{upstreamStatusLabel(up)}
    </span>
  );
  const crewTag = (
    <span className={tone(crewStatus === 'accepted' ? 'ok' : crewStatus === 'rejected' ? 'bad' : 'wait')}>
      {view === 'both' ? `${crewName ?? 'Crew'}: ` : ''}{crewStatusLabel(crewStatus)}
    </span>
  );
  return (
    <span className={cn('inline-flex flex-wrap items-center justify-end gap-1', className)}>
      {view === 'crew' ? crewTag : upTag}
      {view === 'both' && crewStatus !== 'none' && crewTag}
    </span>
  );
}

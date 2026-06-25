import { RFIStatusBadge } from './RFIStatusBadge';
import { RFIPriorityBadge } from './RFIPriorityBadge';
import { format } from 'date-fns';
import type { ProjectRFI } from '@/types/rfi';
import { DT, STATUS_ACCENTS } from '@/lib/design-tokens';

interface RFICardProps {
  rfi: ProjectRFI;
  onClick: () => void;
}

function getAccent(priority: string): string {
  return STATUS_ACCENTS[priority as keyof typeof STATUS_ACCENTS] || STATUS_ACCENTS.normal;
}

export function RFICard({ rfi, onClick }: RFICardProps) {
  return (
    <div
      className="relative bg-card border border-border rounded-lg cursor-pointer hover:shadow-md transition-all animate-fade-in"
      onClick={onClick}
      data-sasha-card="RFI"
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg"
        style={{ backgroundColor: getAccent(rfi.priority) }}
      />
      <div className="pl-4 pr-3.5 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs text-muted-foreground"
               
              >
                RFI-{rfi.rfi_number}
              </span>
              <RFIPriorityBadge priority={rfi.priority} />
              <RFIStatusBadge status={rfi.status} />
            </div>
            <h3 className="font-heading font-medium text-sm truncate">{rfi.subject}</h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {rfi.question}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span>To: {rfi.assigned_to_org?.name || '—'}</span>
          <span>From: {rfi.submitted_by_org?.name || '—'}</span>
          {rfi.due_date && (
            <span>Due: {format(new Date(rfi.due_date), 'MMM d, yyyy')}</span>
          )}
        </div>
      </div>
    </div>
  );
}

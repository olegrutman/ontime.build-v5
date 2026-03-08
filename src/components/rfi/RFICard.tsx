import { Card, CardContent } from '@/components/ui/card';
import { RFIStatusBadge } from './RFIStatusBadge';
import { RFIPriorityBadge } from './RFIPriorityBadge';
import { format } from 'date-fns';
import type { ProjectRFI } from '@/types/rfi';

interface RFICardProps {
  rfi: ProjectRFI;
  onClick: () => void;
}

export function RFICard({ rfi, onClick }: RFICardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
      data-sasha-card="RFI"
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">
                RFI-{rfi.rfi_number}
              </span>
              <RFIPriorityBadge priority={rfi.priority} />
              <RFIStatusBadge status={rfi.status} />
            </div>
            <h3 className="font-medium text-sm truncate">{rfi.subject}</h3>
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
      </CardContent>
    </Card>
  );
}

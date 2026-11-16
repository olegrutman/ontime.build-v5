import { useQuery } from '@tanstack/react-query';
import { Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FieldReportPhotoGallery, type FieldReportPhoto } from '@/components/field-reports/FieldReportPhotoGallery';
import { releasedReportIds } from '@/lib/fieldReportPhotos';

const db = supabase as any;
const GROUPS: { kind: string; label: string }[] = [
  { kind: 'progress', label: 'Progress' },
  { kind: 'material', label: 'Materials needed' },
  { kind: 'blocker', label: 'Blocking problems' },
  { kind: 'extra_work', label: 'Extra work' },
];

/** Read-only daily summary built from field items the Subcontractor released that day. */
export function FieldSummaryCard({ projectId, date }: { projectId: string; date: string }) {
  const { data } = useQuery({
    queryKey: ['field-summary', projectId, date],
    queryFn: async () => {
      const next = new Date(date + 'T00:00:00Z'); next.setUTCDate(next.getUTCDate() + 1);
      const { data: itemData, error: itemError } = await db.from('field_report_items')
        .select('id,report_id,kind,description,location,quantity,unit,status,released_at')
        .eq('project_id', projectId).in('status', ['released', 'converted'])
        .gte('released_at', date + 'T00:00:00Z').lt('released_at', next.toISOString())
        .order('released_at');
      if (itemError) throw itemError;
      const items = (itemData || []) as any[];
      const reportIds = releasedReportIds(items);
      const { data: photoData, error: photoError } = reportIds.length
        ? await db.from('field_report_photos').select('*').in('report_id', reportIds).order('created_at')
        : { data: [], error: null };
      if (photoError) throw photoError;
      return { items, photos: (photoData || []) as FieldReportPhoto[] };
    },
  });
  const items = data?.items || [];
  const photos = data?.photos || [];
  if (!items.length) return null;
  const hours = items.filter(i => i.kind === 'hours').reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Radio className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold">From the field</h3>
        <span className="ml-auto text-xs text-muted-foreground">{items.length} released</span>
      </div>
      {hours > 0 && (
        <p className="text-sm">Crew hours reported: <span className="font-mono font-semibold">{hours}</span></p>
      )}
      {GROUPS.map(g => {
        const list = items.filter(i => i.kind === g.kind);
        if (!list.length) return null;
        return (
          <div key={g.kind} className="space-y-1">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</p>
            <ul className="space-y-1">
              {list.map(i => (
                <li key={i.id} className="text-sm break-words">
                  {i.description}
                  {(i.quantity != null && g.kind === 'material') && <span className="text-muted-foreground"> · {i.quantity}{i.unit ? ` ${i.unit}` : ''}</span>}
                  {i.location && <span className="text-muted-foreground"> · {i.location}</span>}
                  {i.status === 'converted' && <span className="text-muted-foreground"> · turned into order</span>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <FieldReportPhotoGallery photos={photos} title="Report photos" />
    </div>
  );
}

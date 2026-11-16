import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, Expand, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const db = supabase as any;
export type FieldReportPhoto = Tables<'field_report_photos'>;

interface GalleryProps {
  photos: FieldReportPhoto[];
  title?: string;
  onDelete?: (photo: FieldReportPhoto) => void;
  deletingId?: string | null;
}

export function FieldReportPhotoGallery({ photos, title = 'Photos', onDelete, deletingId }: GalleryProps) {
  const [selected, setSelected] = useState<FieldReportPhoto | null>(null);
  if (!photos.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">{title} · {photos.length}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {photos.map(photo => (
          <PhotoTile
            key={photo.id}
            photo={photo}
            onOpen={() => setSelected(photo)}
            onDelete={onDelete ? () => onDelete(photo) : undefined}
            deleting={deletingId === photo.id}
          />
        ))}
      </div>
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-4xl p-3 sm:p-4">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle>Field photo</DialogTitle>
            <DialogDescription>{selected?.caption || 'Crew field report photo'}</DialogDescription>
          </DialogHeader>
          {selected && <LargePhoto photo={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PhotoTile({ photo, onOpen, onDelete, deleting }: {
  photo: FieldReportPhoto;
  onOpen: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const url = useSignedUrl('field-report-photos', photo.storage_path);
  return (
    <div className="relative aspect-square min-w-0 overflow-hidden rounded-xl border bg-muted">
      <button type="button" onClick={onOpen} className="group h-full w-full" aria-label="Open field photo">
        {url ? (
          <img src={url} alt={photo.caption || 'Crew field report'} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-full items-center justify-center"><Camera className="h-5 w-5 text-muted-foreground" /></span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-foreground/0 transition-colors group-hover:bg-foreground/10">
          <Expand className="h-5 w-5 text-background opacity-0 group-hover:opacity-100" />
        </span>
      </button>
      {onDelete && (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="absolute right-1 top-1 h-7 w-7"
          onClick={onDelete}
          disabled={deleting}
          aria-label="Remove field photo"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      )}
    </div>
  );
}

function LargePhoto({ photo }: { photo: FieldReportPhoto }) {
  const url = useSignedUrl('field-report-photos', photo.storage_path);
  return url ? (
    <img src={url} alt={photo.caption || 'Crew field report'} className="max-h-[75vh] w-full rounded-lg object-contain" />
  ) : (
    <div className="flex h-48 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  );
}

/** Read-only photos from the report item that became this work/material order. */
export function LinkedFieldReportPhotos({ coId, poId }: { coId?: string; poId?: string }) {
  const { data: photos = [] } = useQuery({
    queryKey: ['linked-field-report-photos', coId || poId],
    enabled: !!(coId || poId),
    queryFn: async () => {
      let query = db.from('field_report_items').select('report_id').in('status', ['released', 'converted']);
      query = coId ? query.eq('converted_co_id', coId) : query.eq('converted_po_id', poId);
      const { data: items, error: itemError } = await query;
      if (itemError) throw itemError;
      const reportIds = [...new Set((items || []).map((item: any) => item.report_id))];
      if (!reportIds.length) return [];
      const { data, error } = await db.from('field_report_photos').select('*').in('report_id', reportIds).order('created_at');
      if (error) throw error;
      return (data || []) as FieldReportPhoto[];
    },
  });

  if (!photos.length) return null;
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Camera className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-base font-semibold">Crew field photos</h3>
      </div>
      <FieldReportPhotoGallery photos={photos} title="From the original field report" />
    </div>
  );
}

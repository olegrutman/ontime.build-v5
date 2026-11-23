import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { fieldPhotoValidationError } from '@/lib/fieldReportPhotos';
import { FieldReportPhotoGallery, type FieldReportPhoto } from './FieldReportPhotoGallery';
import { emitSashaGuideAction } from '@/lib/sashaGuideActions';

const db = supabase as any;

export function FieldReportPhotoEditor({ report, photos, onChange }: {
  report: any;
  photos: FieldReportPhoto[];
  onChange: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    let added = 0;
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Sign in again before adding photos.');
      for (const file of Array.from(files)) {
        const validationError = fieldPhotoValidationError(file);
        if (validationError) {
          toast({ title: `Could not add ${file.name}`, description: validationError, variant: 'destructive' });
          continue;
        }
        const id = crypto.randomUUID();
        const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
        const path = `${report.id}/${id}.${extension}`;
        const { error: uploadError } = await supabase.storage.from('field-report-photos').upload(path, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });
        if (uploadError) {
          toast({ title: `Could not add ${file.name}`, description: uploadError.message, variant: 'destructive' });
          continue;
        }
        const { error: insertError } = await db.from('field_report_photos').insert({
          id,
          report_id: report.id,
          project_id: report.project_id,
          uploaded_by: auth.user.id,
          storage_path: path,
        });
        if (insertError) {
          await supabase.storage.from('field-report-photos').remove([path]);
          toast({ title: `Could not add ${file.name}`, description: insertError.message, variant: 'destructive' });
          continue;
        }
        added += 1;
      }
      if (added) {
        emitSashaGuideAction('field-report-photos-added');
        toast({ title: `${added} photo${added === 1 ? '' : 's'} added` });
        onChange();
      }
    } catch (error: any) {
      toast({ title: 'Could not add photos', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (photo: FieldReportPhoto) => {
    setDeletingId(photo.id);
    const { error } = await db.from('field_report_photos').delete().eq('id', photo.id);
    if (error) {
      toast({ title: 'Could not remove photo', description: error.message, variant: 'destructive' });
    } else {
      await supabase.storage.from('field-report-photos').remove([photo.storage_path]);
      onChange();
    }
    setDeletingId(null);
  };

  return (
    <div className="space-y-3 rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-sm font-medium">Report photos</p>
          <p className="text-xs text-muted-foreground">Add jobsite photos to send with this report.</p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Camera className="mr-1 h-4 w-4" />}
          {uploading ? 'Adding photos…' : 'Add photos'}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={event => upload(event.target.files)}
      />
      <FieldReportPhotoGallery photos={photos} onDelete={remove} deletingId={deletingId} />
    </div>
  );
}

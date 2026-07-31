import { useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PHOTO_TAGS } from '@/types/dailyLog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useSignedUrl } from '@/hooks/useSignedUrl';

interface PhotoEntry {
  id: string;
  storage_path: string;
  tag: string;
  caption: string;
}

interface PhotosCardProps {
  photos: PhotoEntry[];
  onAdd: (photo: { storage_path: string; tag: string }) => void;
  onDelete: (photoId: string) => void;
  disabled?: boolean;
}

export function PhotosCard({ photos, onAdd, onDelete, disabled }: PhotosCardProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('daily-log-photos')
      .upload(path, file);

    if (error) {
      toast({
        title: 'Photo upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      onAdd({ storage_path: path, tag: 'progress' });
    }

    // Reset input
    if (fileRef.current) fileRef.current.value = '';
  };

  return (

    <div className="bg-card rounded-2xl border p-4 space-y-3">
      <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Photos</h3>

      {/* Camera button */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={disabled}
        className={cn(
          'w-full h-20 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-colors',
          'text-muted-foreground hover:bg-muted/50 hover:border-primary/30',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Camera className="h-5 w-5" />
        <span className="text-sm font-medium">Add Photo</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map(photo => (
            <PhotoThumb
              key={photo.id}
              photo={photo}
              disabled={disabled}
              onDelete={() => onDelete(photo.id)}
            />
          ))}

        </div>
      )}
    </div>
  );
}

function PhotoThumb({
  photo,
  disabled,
  onDelete,
}: {
  photo: PhotoEntry;
  disabled?: boolean;
  onDelete: () => void;
}) {
  const url = useSignedUrl('daily-log-photos', photo.storage_path);

  return (
    <div className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
      {url && (
        <img src={url} alt={photo.tag} className="w-full h-full object-cover" loading="lazy" />
      )}
      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/60 text-white">
        {photo.tag}
      </span>
      {!disabled && (
        <button
          onClick={onDelete}
          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { COPhoto } from '@/hooks/useCOPhotos';

interface COPhotoNudgeBannerProps {
  status: string;
  photos: COPhoto[];
  onTakePhoto: (type: COPhoto['photo_type']) => void;
}

export function COPhotoNudgeBanner({ status, photos, onTakePhoto }: COPhotoNudgeBannerProps) {
  const hasAnyPhotos = photos.length > 0;
  const hasBeforePhotos = photos.some(p => p.photo_type === 'before');
  const hasAfterPhotos = photos.some(p => p.photo_type === 'after');

  // Nudge 1: WIP with no photos → suggest 'before' photo
  if (['work_in_progress', 'shared'].includes(status) && !hasAnyPhotos) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-state-open/50 bg-state-open-bg px-4 py-3">
        <Camera className="h-4 w-4 shrink-0" />
        <p className="flex-1 text-sm text-state-open-foreground">
          <span className="font-semibold">Take a 'before' photo before starting work.</span>{' '}
          <span className="text-state-open-foreground">It protects you in disputes.</span>
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 border-state-open text-state-open-foreground hover:bg-state-open-bg shrink-0"
          onClick={() => onTakePhoto('before')}
        >
          <Camera className="h-3.5 w-3.5" /> Take photo
        </Button>
      </div>
    );
  }

  // Nudge 2: Submitted/approved with 'before' but no 'after' → suggest 'after' photo
  if (['submitted', 'approved', 'contracted'].includes(status) && hasBeforePhotos && !hasAfterPhotos) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-type-sov/50 bg-type-sov/10 px-4 py-3">
        <Camera className="h-4 w-4 shrink-0" />
        <p className="flex-1 text-sm text-type-sov">
          <span className="font-semibold">Add 'after' photos</span>{' '}
          <span className="text-type-sov">so the upstream party can see completed work.</span>
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 border-type-sov text-type-sov hover:bg-type-sov/10 shrink-0"
          onClick={() => onTakePhoto('after')}
        >
          <Camera className="h-3.5 w-3.5" /> Add after
        </Button>
      </div>
    );
  }

  return null;
}

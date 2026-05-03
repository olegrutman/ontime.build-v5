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
      <div className="flex items-center gap-3 rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700/40 px-4 py-3">
        <span className="text-lg">📸</span>
        <p className="flex-1 text-sm text-amber-900 dark:text-amber-200">
          <span className="font-semibold">Take a 'before' photo before starting work.</span>{' '}
          <span className="text-amber-700 dark:text-amber-400">It protects you in disputes.</span>
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 border-amber-400 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/30 shrink-0"
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
      <div className="flex items-center gap-3 rounded-xl border border-blue-300/50 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-700/40 px-4 py-3">
        <span className="text-lg">📸</span>
        <p className="flex-1 text-sm text-blue-900 dark:text-blue-200">
          <span className="font-semibold">Add 'after' photos</span>{' '}
          <span className="text-blue-700 dark:text-blue-400">so the upstream party can see completed work.</span>
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 border-blue-400 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 shrink-0"
          onClick={() => onTakePhoto('after')}
        >
          <Camera className="h-3.5 w-3.5" /> Add after
        </Button>
      </div>
    );
  }

  return null;
}

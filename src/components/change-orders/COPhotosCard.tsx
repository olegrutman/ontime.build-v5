import { useState, useRef, useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Camera, ImagePlus, Plus, X, Expand, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useCOPhotos, getPhotoUrl, type COPhoto } from '@/hooks/useCOPhotos';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { COLineItem } from '@/types/changeOrder';

export const PHOTO_TYPE_CONFIG: Record<COPhoto['photo_type'], { label: string; color: string; bg: string }> = {
  before:  { label: 'Before',  color: '#2563EB', bg: '#EFF6FF' },
  after:   { label: 'After',   color: '#059669', bg: '#ECFDF5' },
  during:  { label: 'During',  color: '#D97706', bg: '#FFFBEB' },
  damage:  { label: 'Damage',  color: '#DC2626', bg: '#FEF2F2' },
  other:   { label: 'Other',   color: '#6B7280', bg: '#F9FAFB' },
};

export interface COPhotosCardHandle {
  openAdd: (presetType?: COPhoto['photo_type']) => void;
}

interface COPhotosCardProps {
  coId: string;
  role: string;
  lineItems: COLineItem[];
}

export const COPhotosCard = forwardRef<COPhotosCardHandle, COPhotosCardProps>(function COPhotosCard({ coId, role, lineItems }, ref) {
  const { user } = useAuth();
  const { photos, isLoading, uploadPhoto, deletePhoto } = useCOPhotos(coId);
  const [addOpen, setAddOpen] = useState(false);
  const [presetPhotoType, setPresetPhotoType] = useState<COPhoto['photo_type'] | undefined>(undefined);
  const [viewerPhoto, setViewerPhoto] = useState<COPhoto | null>(null);

  useImperativeHandle(ref, () => ({
    openAdd(presetType?: COPhoto['photo_type']) {
      setPresetPhotoType(presetType);
      setAddOpen(true);
    },
  }));

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-heading text-[0.75rem] uppercase tracking-wider font-semibold text-muted-foreground">
            📸 Photos
          </h3>
          <span className="text-[10px] bg-muted rounded-full px-2 py-0.5 font-bold text-muted-foreground">
            {photos.length}
          </span>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add photo
        </Button>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="px-6 py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : photos.length === 0 ? (
        /* Empty state */
        <div className="px-6 py-10 text-center">
          <Camera className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">No photos yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Photos help document conditions and protect against disputes.
          </p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={() => setAddOpen(true)}>
            <Camera className="h-3.5 w-3.5" /> Take first photo
          </Button>
        </div>
      ) : (
        /* Photo grid */
        <div className="p-3 grid grid-cols-3 md:grid-cols-4 gap-2">
          {photos.map(photo => {
            const url = getPhotoUrl(photo.storage_path);
            const cfg = PHOTO_TYPE_CONFIG[photo.photo_type];
            return (
              <button
                key={photo.id}
                onClick={() => setViewerPhoto(photo)}
                className="relative group rounded-lg overflow-hidden border border-border aspect-square bg-muted"
              >
                <img src={url} alt={photo.caption || 'CO photo'} className="w-full h-full object-cover" loading="lazy" />
                {/* Type pill */}
                <span
                  className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  {cfg.label}
                </span>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Expand className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Add Photo Sheet */}
      <AddPhotoSheet
        open={addOpen}
        onClose={() => { setAddOpen(false); setPresetPhotoType(undefined); }}
        coId={coId}
        role={role}
        userId={user?.id ?? ''}
        lineItems={lineItems}
        onUpload={uploadPhoto}
        initialPhotoType={presetPhotoType}
      />

      {/* Full-screen viewer */}
      {viewerPhoto && (
        <PhotoViewer
          photo={viewerPhoto}
          onClose={() => setViewerPhoto(null)}
          onDelete={user?.id === viewerPhoto.uploaded_by_user_id ? async () => {
            try {
              await deletePhoto.mutateAsync(viewerPhoto);
              setViewerPhoto(null);
              toast.success('Photo deleted');
            } catch { toast.error('Failed to delete'); }
          } : undefined}
        />
      )}
    </div>
  );
});

/* ─── Add Photo Sheet ─── */
interface AddPhotoSheetProps {
  open: boolean;
  onClose: () => void;
  coId: string;
  role: string;
  userId: string;
  lineItems: COLineItem[];
  onUpload: ReturnType<typeof useCOPhotos>['uploadPhoto'];
  initialPhotoType?: COPhoto['photo_type'];
}

function AddPhotoSheet({ open, onClose, coId, role, userId, lineItems, onUpload, initialPhotoType }: AddPhotoSheetProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState<COPhoto['photo_type']>(initialPhotoType ?? 'other');
  const [caption, setCaption] = useState('');
  const [lineItemId, setLineItemId] = useState<string>('none');
  const [saving, setSaving] = useState(false);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    e.target.value = '';
  }, []);

  const handleSave = useCallback(async () => {
    if (!file || saving) return;
    setSaving(true);
    try {
      await onUpload.mutateAsync({
        coId,
        file,
        userId,
        role,
        photoType,
        caption: caption.trim() || undefined,
        lineItemId: lineItemId !== 'none' ? lineItemId : undefined,
      });
      toast.success('Photo added');
      // Reset
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setCaption('');
      setPhotoType('other');
      setLineItemId('none');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload');
    } finally {
      setSaving(false);
    }
  }, [file, saving, onUpload, coId, userId, role, photoType, caption, lineItemId, preview, onClose]);

  const handleClose = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setCaption('');
    setPhotoType('other');
    setLineItemId('none');
    onClose();
  }, [preview, onClose]);

  return (
    <Sheet open={open} onOpenChange={v => !v && handleClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-3">
          <SheetTitle className="text-base font-heading">Add Photo</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          {/* Camera / file input */}
          {preview ? (
            <div className="relative rounded-xl overflow-hidden border border-border">
              <img src={preview} alt="Preview" className="w-full max-h-64 object-cover" />
              <button
                onClick={() => { if (preview) URL.revokeObjectURL(preview); setFile(null); setPreview(null); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-40 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-3 active:scale-[0.98] transition-transform"
            >
              <Camera className="h-8 w-8 text-primary" />
              <span className="text-sm font-semibold text-muted-foreground">Take or select photo</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

          {/* Photo type selector */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Photo type</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PHOTO_TYPE_CONFIG) as COPhoto['photo_type'][]).map(type => {
                const cfg = PHOTO_TYPE_CONFIG[type];
                const active = photoType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setPhotoType(type)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                      active
                        ? 'border-transparent shadow-sm'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted'
                    )}
                    style={active ? { background: cfg.bg, color: cfg.color } : undefined}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Caption (optional)</label>
            <Textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Describe what this photo shows…"
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* Attach to scope item */}
          {lineItems.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Attach to scope item (optional)</label>
              <Select value={lineItemId} onValueChange={setLineItemId}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {lineItems.map(li => (
                    <SelectItem key={li.id} value={li.id}>
                      {li.item_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Save */}
          <Button
            className="w-full"
            disabled={!file || saving}
            onClick={handleSave}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
              </span>
            ) : (
              'Save Photo'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─── Full-screen Photo Viewer ─── */
interface PhotoViewerProps {
  photo: COPhoto;
  onClose: () => void;
  onDelete?: () => void;
}

function PhotoViewer({ photo, onClose, onDelete }: PhotoViewerProps) {
  const url = getPhotoUrl(photo.storage_path);
  const cfg = PHOTO_TYPE_CONFIG[photo.photo_type];
  const takenAt = new Date(photo.taken_at).toLocaleString();

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={onClose}>
      {/* Close bar */}
      <div className="flex items-center justify-between px-4 py-3" onClick={e => e.stopPropagation()}>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: cfg.bg, color: cfg.color }}
        >
          {cfg.label}
        </span>
        <div className="flex items-center gap-2">
          {onDelete && (
            <button onClick={onDelete} className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <Trash2 className="h-4 w-4 text-red-400" />
            </button>
          )}
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center px-4" onClick={e => e.stopPropagation()}>
        <img src={url} alt={photo.caption || 'Photo'} className="max-w-full max-h-full object-contain rounded-lg" />
      </div>

      {/* Caption & metadata */}
      <div className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
        {photo.caption && <p className="text-sm text-white font-medium mb-1">{photo.caption}</p>}
        <p className="text-xs text-white/50">
          {photo.uploaded_by_role} · {takenAt}
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Check, Zap, StickyNote } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFieldCaptures, type ReasonCategory } from '@/hooks/useFieldCaptures';
import { useWorkOrderCatalog } from '@/hooks/useWorkOrderCatalog';
import { useWorkOrderLog } from '@/hooks/useWorkOrderLog';
import { CapturePhotoInput } from './CapturePhotoInput';
import { CaptureVoiceInput } from './CaptureVoiceInput';
import { CaptureReasonChips } from './CaptureReasonChips';
import { CatalogBrowser, QuickLogDetailPanel } from '@/components/quick-log';
import type { CatalogItem } from '@/types/quickLog';

interface FieldCaptureSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  organizationId: string;
}

export function FieldCaptureSheet({ open, onOpenChange, projectId, organizationId }: FieldCaptureSheetProps) {
  const { toast } = useToast();
  const { createCapture } = useFieldCaptures(projectId);
  const catalog = useWorkOrderCatalog(organizationId);
  const log = useWorkOrderLog(projectId, organizationId);

  const [captureMode, setCaptureMode] = useState<'note' | 'quicklog'>('note');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState<ReasonCategory | null>(null);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null);

  // Auto-capture GPS on open
  useEffect(() => {
    if (open && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => { /* GPS denied — ok */ }
      );
    }
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setPhotoFile(null);
      setPhotoPreview(null);
      setVoiceBlob(null);
      setDescription('');
      setReason(null);
      setGps(null);
      setCaptureMode('note');
      setSelectedCatalogItem(null);
    }
  }, [open]);

  const handlePhoto = useCallback((file: File) => {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }, []);

  const clearPhoto = useCallback(() => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  }, [photoPreview]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await createCapture.mutateAsync({
        project_id: projectId,
        organization_id: organizationId,
        description: description || undefined,
        reason_category: reason || undefined,
        gps_lat: gps?.lat,
        gps_lng: gps?.lng,
        photoFile: photoFile || undefined,
        voiceFile: voiceBlob || undefined,
        device_info: { userAgent: navigator.userAgent },
      });
      toast({ title: 'Issue captured ✓' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Failed to save capture', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[95dvh]">
        <DrawerTitle className="sr-only">Capture Issue</DrawerTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-bold text-foreground font-display">Capture Issue</h2>
          <button onClick={() => onOpenChange(false)} className="p-2 rounded-full hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="px-4 pt-3">
          <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/50 w-fit">
            <button
              onClick={() => setCaptureMode('note')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                captureMode === 'note' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              <StickyNote className="h-3.5 w-3.5" /> Note
            </button>
            <button
              onClick={() => setCaptureMode('quicklog')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                captureMode === 'quicklog' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              <Zap className="h-3.5 w-3.5" /> Quick Log
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-4 py-4 space-y-4" style={{ maxHeight: 'calc(95dvh - 180px)' }}>
          {captureMode === 'note' ? (
            <>
              <CapturePhotoInput onCapture={handlePhoto} preview={photoPreview} onClear={clearPhoto} />
              <CaptureVoiceInput onRecord={setVoiceBlob} hasRecording={!!voiceBlob} onClear={() => setVoiceBlob(null)} />
              <Input placeholder="Quick note…" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[48px] text-base rounded-xl" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Reason</p>
                <CaptureReasonChips value={reason} onChange={setReason} />
              </div>
            </>
          ) : (
            <>
              <CatalogBrowser catalog={catalog} selectedItemId={selectedCatalogItem?.id || null} onSelect={setSelectedCatalogItem} compact />
              {selectedCatalogItem && (
                <QuickLogDetailPanel
                  item={selectedCatalogItem}
                  role="fc"
                  projectId={projectId}
                  orgId={organizationId}
                  onSuccess={() => setSelectedCatalogItem(null)}
                  logItem={log.logItem}
                  inline
                />
              )}
            </>
          )}
        </div>

        {/* Save button */}
        <div className="px-4 pb-4 pt-2" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full min-h-[56px] rounded-xl text-base font-bold"
            size="lg"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Check className="h-5 w-5 mr-2" />
            )}
            Save Capture
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

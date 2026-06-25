import { format } from 'date-fns';
import { Camera, Mic, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { REASON_LABELS } from './CaptureReasonChips';
import type { FieldCapture } from '@/hooks/useFieldCaptures';

interface FieldCaptureCardProps {
  capture: FieldCapture;
  onConvert?: (capture: FieldCapture) => void;
}

export function FieldCaptureCard({ capture, onConvert }: FieldCaptureCardProps) {
  const time = format(new Date(capture.timestamp), 'h:mm a');
  const reasonLabel = capture.reason_category ? REASON_LABELS[capture.reason_category] : null;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Photo thumbnail */}
      {capture.photo_url && (
        <img
          src={capture.photo_url}
          alt="Capture"
          className="w-full h-32 object-cover"
          loading="lazy"
        />
      )}

      <div className="p-3 space-y-2">
        {/* Time + indicators */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">{time}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">Field Capture</Badge>
          {capture.photo_url && <Camera className="h-3.5 w-3.5 text-muted-foreground" />}
          {capture.voice_note_url && <Mic className="h-3.5 w-3.5 text-muted-foreground" />}
          {capture.status === 'converted' && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[10px] px-1.5 py-0">
              Converted
            </Badge>
          )}
        </div>

        {/* Description */}
        {capture.description && (
          <p className="text-sm text-foreground line-clamp-2">{capture.description}</p>
        )}

        {/* Reason chip */}
        {reasonLabel && (
          <Badge variant="secondary" className="text-xs">{reasonLabel}</Badge>
        )}

        {/* Voice playback */}
        {capture.voice_note_url && (
          <audio controls src={capture.voice_note_url} className="w-full h-8" preload="none" />
        )}

        {/* Convert button */}
        {capture.status === 'captured' && onConvert && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onConvert(capture)}
            className="w-full min-h-[44px] mt-1"
          >
            Convert to Work Order
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

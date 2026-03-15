import { useRef, useState, useCallback } from 'react';
import { Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CaptureVoiceInputProps {
  onRecord: (blob: Blob) => void;
  hasRecording: boolean;
  onClear: () => void;
  disabled?: boolean;
}

export function CaptureVoiceInput({ onRecord, hasRecording, onClear, disabled }: CaptureVoiceInputProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecord(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      // Mic permission denied — silently ignore
    }
  }, [onRecord]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (hasRecording && !recording) {
    return (
      <div className="flex items-center gap-3 bg-card rounded-xl border px-4 py-3">
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-sm font-medium text-foreground flex-1">Voice note recorded</span>
        {!disabled && (
          <button onClick={onClear} className="text-xs text-destructive font-semibold min-h-[44px] px-2">
            Remove
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onPointerDown={!disabled && !recording ? startRecording : undefined}
      onPointerUp={recording ? stopRecording : undefined}
      onPointerLeave={recording ? stopRecording : undefined}
      disabled={disabled}
      className={cn(
        'w-full flex items-center justify-center gap-3 rounded-xl border px-4 min-h-[56px] transition-all',
        recording
          ? 'bg-destructive/10 border-destructive animate-pulse'
          : 'bg-card border-border active:bg-muted',
        disabled && 'opacity-50'
      )}
    >
      {recording ? (
        <>
          <Square className="h-5 w-5 text-destructive fill-destructive" />
          <span className="text-sm font-semibold text-destructive">Recording {formatDuration(duration)}…</span>
        </>
      ) : (
        <>
          <Mic className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Hold to record voice note</span>
        </>
      )}
    </button>
  );
}

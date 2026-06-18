import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, X, Send, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface VoicePNRecorderProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Phase = 'idle' | 'recording' | 'recorded' | 'uploading' | 'done';

export function VoicePNRecorder({ projectId, open, onOpenChange }: VoicePNRecorderProps) {
  const { user, userOrgRoles } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const orgId = userOrgRoles?.[0]?.organization_id ?? null;

  useEffect(() => {
    if (!open) {
      cleanup();
      setPhase('idle');
      setSeconds(0);
      setBlob(null);
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function cleanup() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
    chunksRef.current = [];
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        setBlob(b);
        setAudioUrl(URL.createObjectURL(b));
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        setPhase('recorded');
      };
      mr.start();
      recorderRef.current = mr;
      setPhase('recording');
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s >= 119) {
            stopRecording();
            return 120;
          }
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      console.error('mic access', e);
      toast.error('Could not access microphone — check browser permissions.');
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  }

  function resetRecording() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setBlob(null);
    setSeconds(0);
    setPhase('idle');
  }

  async function blobToBase64(b: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // strip data URL prefix
        resolve(result.split(',')[1] ?? '');
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(b);
    });
  }

  async function submit() {
    if (!blob || !user || !orgId) return;
    setPhase('uploading');
    try {
      // 1) upload original audio for archival
      const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
      const path = `${orgId}/${projectId}/${Date.now()}-${user.id.substring(0, 8)}.${ext}`;
      const { error: upErr } = await supabase
        .storage
        .from('co-voice-notes')
        .upload(path, blob, { contentType: blob.type, upsert: false });
      let voiceUrl: string | null = null;
      if (!upErr) {
        const { data: signed } = await supabase
          .storage
          .from('co-voice-notes')
          .createSignedUrl(path, 60 * 60 * 24 * 30);
        voiceUrl = signed?.signedUrl ?? null;
      } else {
        console.warn('voice upload failed, continuing with transcription only', upErr);
      }

      // 2) transcribe + draft CO
      const base64 = await blobToBase64(blob);
      const { data, error } = await supabase.functions.invoke('co-voice-pn', {
        body: {
          project_id: projectId,
          audio_base64: base64,
          mime_type: blob.type || 'audio/webm',
          voice_url: voiceUrl,
          duration_sec: seconds,
        },
      });
      if (error) throw error;
      const result = data as { co_id?: string; co_number?: string; error?: string };
      if (result?.error) {
        toast.error(`Voice → PN failed: ${result.error}`);
        setPhase('recorded');
        return;
      }

      setPhase('done');
      toast.success(`Draft ${result.co_number ?? 'PN'} sent to GC inbox`);
      onOpenChange(false);
      if (result.co_id) {
        navigate(`/project/${projectId}/change-orders/${result.co_id}`);
      }
    } catch (e: any) {
      console.error('voice submit', e);
      toast.error(e?.message ?? 'Submission failed');
      setPhase('recorded');
    }
  }

  const mm = String(Math.floor(seconds / 60)).padStart(1, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-extrabold">
            Voice Problem Note
          </DialogTitle>
          <DialogDescription>
            Hold the field. Describe what you found. Sends a draft straight to the GC inbox.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex flex-col items-center gap-3">
            {(phase === 'idle' || phase === 'recording') && (
              <button
                type="button"
                onClick={phase === 'idle' ? startRecording : stopRecording}
                aria-label={phase === 'idle' ? 'Start recording' : 'Stop recording'}
                className={`w-28 h-28 rounded-full flex items-center justify-center text-white transition-all shadow-lg ${
                  phase === 'recording'
                    ? 'bg-red-600 animate-pulse'
                    : 'bg-[hsl(var(--navy))] hover:bg-[hsl(var(--navy))]/90'
                }`}
              >
                    ? 'bg-red-600 animate-pulse'
                    : 'bg-[hsl(var(--navy))] hover:bg-[hsl(var(--navy))]/90'
                }`}
              >
                {phase === 'recording' ? (
                  <Square className="h-10 w-10" fill="currentColor" />
                ) : (
                  <Mic className="h-10 w-10" />
                )}
              </button>
            )}

            {phase === 'recorded' && audioUrl && (
              <audio src={audioUrl} controls className="w-full" />
            )}

            {phase === 'uploading' && (
              <div className="flex flex-col items-center gap-2 py-6">
                <Loader2 className="h-10 w-10 animate-spin text-[hsl(var(--navy))]" />
                <p className="text-sm text-muted-foreground">Transcribing &amp; routing…</p>
              </div>
            )}

            <div className="font-mono text-2xl font-bold tabular-nums">
              {mm}:{ss}
              {phase === 'recording' && (
                <span className="ml-2 text-xs uppercase tracking-wider text-red-600">REC</span>
              )}
            </div>
            {phase === 'recording' && (
              <p className="text-xs text-muted-foreground">Max 2 minutes</p>
            )}
          </div>

          {phase === 'recorded' && (
            <div className="flex gap-2 justify-between">
              <Button variant="outline" onClick={resetRecording}>
                <RotateCcw className="h-4 w-4 mr-1.5" /> Re-record
              </Button>
              <Button onClick={submit}>
                <Send className="h-4 w-4 mr-1.5" /> Send to GC
              </Button>
            </div>
          )}

          {phase === 'idle' && (
            <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-1.5" /> Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

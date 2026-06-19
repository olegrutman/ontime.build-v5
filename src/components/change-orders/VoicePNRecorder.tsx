import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, X, Send, RotateCcw, Check, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
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

type Phase = 'idle' | 'recording' | 'recorded' | 'uploading' | 'transcribing' | 'drafting' | 'ready' | 'failed';
type StepState = 'pending' | 'active' | 'done' | 'failed';

export function VoicePNRecorder({ projectId, open, onOpenChange }: VoicePNRecorderProps) {
  const { user, userOrgRoles } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [readyCoId, setReadyCoId] = useState<string | null>(null);
  const [readyCoNumber, setReadyCoNumber] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
      setReadyCoId(null);
      setReadyCoNumber(null);
      setErrorMsg(null);
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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        },
      });
      streamRef.current = stream;
      // Prefer opus in webm; fall back to mp4 (Safari).
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
      ];
      const mime = candidates.find((t) => MediaRecorder.isTypeSupported(t)) || '';
      const mr = new MediaRecorder(
        stream,
        mime ? { mimeType: mime, audioBitsPerSecond: 128_000 } : { audioBitsPerSecond: 128_000 },
      );
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

  async function pollIntake(intakeId: string) {
    const start = Date.now();
    const timeoutMs = 90_000;
    setPhase('drafting');
    while (Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 1200));
      const { data } = await supabase
        .from('co_ai_intakes')
        .select('status, finalized_co_id, error_message, output_json')
        .eq('id', intakeId)
        .maybeSingle();
      if (!data) continue;
      if (data.status === 'succeeded' && data.finalized_co_id) {
        const coNumber = (data.output_json as any)?.co_number ?? 'PN';
        setReadyCoId(data.finalized_co_id as string);
        setReadyCoNumber(coNumber);
        setPhase('ready');
        toast.success(`Draft ${coNumber} ready in GC inbox`);
        return;
      }
      if (data.status === 'failed') {
        setErrorMsg(data.error_message ?? 'unknown');
        setPhase('failed');
        toast.error(`Voice → PN failed: ${data.error_message ?? 'unknown'}`);
        return;
      }
    }
    setErrorMsg('Timed out — check Change Orders shortly.');
    setPhase('failed');
  }

  async function submit() {
    if (!blob || !user || !orgId) return;
    setPhase('uploading');
    setErrorMsg(null);
    try {
      const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
      const path = `${orgId}/${projectId}/${Date.now()}-${user.id.substring(0, 8)}.${ext}`;
      const uploadPromise = supabase
        .storage
        .from('co-voice-notes')
        .upload(path, blob, { contentType: blob.type, upsert: false })
        .then(async ({ error: upErr }) => {
          if (upErr) {
            console.warn('voice upload failed, continuing without archival url', upErr);
            return null as string | null;
          }
          const { data: signed } = await supabase
            .storage
            .from('co-voice-notes')
            .createSignedUrl(path, 60 * 60 * 24 * 30);
          return signed?.signedUrl ?? null;
        });

      const voiceUrl = await uploadPromise;
      setPhase('transcribing');

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('not_authenticated');

      const form = new FormData();
      form.append('project_id', projectId);
      form.append('audio', blob, `recording.${ext}`);
      if (voiceUrl) form.append('voice_url', voiceUrl);

      const fnUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/co-voice-pn`;
      const resp = await fetch(fnUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const result = await resp.json().catch(() => ({}));
      if (!resp.ok || result?.error) {
        setErrorMsg(String(result?.error ?? resp.status));
        setPhase('failed');
        toast.error(`Voice → PN failed: ${result?.error ?? resp.status}`);
        return;
      }

      if (result.intake_id) {
        await pollIntake(result.intake_id);
      } else {
        setErrorMsg('No intake id returned');
        setPhase('failed');
      }
    } catch (e: any) {
      console.error('voice submit', e);
      setErrorMsg(e?.message ?? 'Submission failed');
      setPhase('failed');
      toast.error(e?.message ?? 'Submission failed');
    }
  }

  const mm = String(Math.floor(seconds / 60)).padStart(1, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const isProcessing = phase === 'uploading' || phase === 'transcribing' || phase === 'drafting';
  const steps: { key: Phase; label: string }[] = [
    { key: 'uploading', label: 'Uploading audio' },
    { key: 'transcribing', label: 'Transcribing speech' },
    { key: 'drafting', label: 'Drafting change order' },
    { key: 'ready', label: 'Draft ready' },
  ];
  const phaseIndex = steps.findIndex((s) => s.key === phase);
  const progressPct =
    phase === 'ready' ? 100 :
    phase === 'drafting' ? 80 :
    phase === 'transcribing' ? 50 :
    phase === 'uploading' ? 20 : 0;

  function stateFor(idx: number): StepState {
    if (phase === 'failed') return idx === 0 ? 'failed' : 'pending';
    if (phase === 'ready') return 'done';
    if (phaseIndex < 0) return 'pending';
    if (idx < phaseIndex) return 'done';
    if (idx === phaseIndex) return 'active';
    return 'pending';
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // prevent accidental close while a draft is being prepared
        if (!o && isProcessing) return;
        onOpenChange(o);
      }}
    >
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

            {(phase === 'idle' || phase === 'recording' || phase === 'recorded') && (
              <div className="font-mono text-2xl font-bold tabular-nums">
                {mm}:{ss}
                {phase === 'recording' && (
                  <span className="ml-2 text-xs uppercase tracking-wider text-red-600">REC</span>
                )}
              </div>
            )}
            {phase === 'recording' && (
              <p className="text-xs text-muted-foreground">Max 2 minutes</p>
            )}
          </div>

          {(isProcessing || phase === 'ready' || phase === 'failed') && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <Progress value={progressPct} className="h-2" />
              <ul className="space-y-2">
                {steps.map((s, idx) => {
                  const st = stateFor(idx);
                  return (
                    <li key={s.key} className="flex items-center gap-2 text-sm">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          st === 'done'
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : st === 'active'
                            ? 'border-[hsl(var(--navy))] text-[hsl(var(--navy))]'
                            : st === 'failed'
                            ? 'bg-red-600 border-red-600 text-white'
                            : 'border-muted-foreground/40 text-muted-foreground'
                        }`}
                      >
                        {st === 'done' ? (
                          <Check className="h-3 w-3" />
                        ) : st === 'active' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : st === 'failed' ? (
                          <X className="h-3 w-3" />
                        ) : (
                          <span className="text-[10px]">{idx + 1}</span>
                        )}
                      </span>
                      <span
                        className={
                          st === 'active'
                            ? 'font-medium text-foreground'
                            : st === 'done'
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }
                      >
                        {s.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {phase === 'failed' && errorMsg && (
                <p className="text-xs text-red-600">{errorMsg}</p>
              )}
              {isProcessing && (
                <p className="text-xs text-muted-foreground">
                  This usually takes 10–30 seconds. You can keep this dialog open.
                </p>
              )}
            </div>
          )}

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

          {phase === 'ready' && readyCoId && (
            <div className="flex gap-2 justify-between">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  navigate(`/project/${projectId}/change-orders/${readyCoId}`);
                  onOpenChange(false);
                }}
              >
                Open {readyCoNumber ?? 'draft'} <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          )}

          {phase === 'failed' && (
            <div className="flex gap-2 justify-between">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={resetRecording}>
                <RotateCcw className="h-4 w-4 mr-1.5" /> Try again
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

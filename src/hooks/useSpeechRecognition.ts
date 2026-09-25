import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionHook {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
  error: string | null;
}

interface UseSpeechRecognitionOptions {
  lang?: string;
  silenceTimeout?: number; // ms, default 30000
}

export function useSpeechRecognition(opts: UseSpeechRecognitionOptions = {}): SpeechRecognitionHook {
  const { lang = 'en-US', silenceTimeout = 30000 } = opts;

  const SpeechRecognitionCtor =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognitionCtor;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      recognitionRef.current?.stop();
    }, silenceTimeout);
  }, [clearSilenceTimer, silenceTimeout]);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [clearSilenceTimer]);

  const startListening = useCallback(() => {
    if (!isSupported || !SpeechRecognitionCtor) return;

    setError(null);
    setTranscript('');

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      resetSilenceTimer();
      // Android Chrome (continuous mode) re-sends earlier words inside each
      // new result ("fix wall" → "fix wall header"). Merge overlap-aware so
      // phrases aren't doubled.
      const segments: string[] = [];
      for (let i = 0; i < event.results.length; i++) {
        segments.push(String(event.results[i][0].transcript || '').trim());
      }
      setTranscript(mergeSegments(segments));
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      setError(event.error);
      setIsListening(false);
      clearSilenceTimer();
    };

    recognition.onend = () => {
      setIsListening(false);
      clearSilenceTimer();
    };

    recognitionRef.current = recognition;
    recognition.start();
    resetSilenceTimer();
  }, [isSupported, SpeechRecognitionCtor, lang, resetSilenceTimer, clearSilenceTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      recognitionRef.current?.stop();
    };
  }, [clearSilenceTimer]);

  return { isListening, transcript, startListening, stopListening, isSupported, error };
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** Join speech segments, dropping repeats where a segment re-contains earlier text. */
export function mergeSegments(segments: string[]): string {
  let out = '';
  for (const seg of segments) {
    if (!seg) continue;
    const a = norm(out);
    const b = norm(seg);
    if (!a) { out = seg; continue; }
    if (b.startsWith(a)) { out = seg; continue; }
    if (a.endsWith(b) || a.includes(b)) continue;
    out = `${out} ${seg}`;
  }
  return out.trim();
}

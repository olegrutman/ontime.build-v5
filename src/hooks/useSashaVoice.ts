import { useCallback, useEffect, useRef, useState } from 'react';

const SPEAK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sasha-speak`;

/**
 * Turns Sasha's replies into spoken audio via the backend voice function.
 * Exposes `isSpeaking` so the avatar can switch to its talking animation.
 */
export function useSashaVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    cleanup();
    setIsSpeaking(false);
    setIsPreparing(false);
  }, [cleanup]);

  const speak = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = (text || '').trim();
      if (!trimmed) return;
      stop();
      setIsPreparing(true);
      try {
        const resp = await fetch(SPEAK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: trimmed }),
        });
        if (!resp.ok) {
          const details = await resp.text().catch(() => '');
          console.error('sasha-speak failed:', resp.status, details);
          setIsPreparing(false);
          return;
        }
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        setIsPreparing(false);
        setIsSpeaking(true);
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
      } catch (e) {
        console.error('sasha-speak error:', e);
      } finally {
        setIsSpeaking(false);
        setIsPreparing(false);
        cleanup();
      }
    },
    [stop, cleanup],
  );

  useEffect(() => () => stop(), [stop]);

  return { speak, stop, isSpeaking, isPreparing };
}

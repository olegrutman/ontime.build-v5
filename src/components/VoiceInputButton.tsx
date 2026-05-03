import { useEffect, useRef, useCallback } from 'react';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function VoiceInputButton({ onTranscript, className, size = 'sm' }: VoiceInputButtonProps) {
  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition();
  const lastTranscriptRef = useRef('');

  const handleClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      lastTranscriptRef.current = '';
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // When listening stops and there's a transcript, call onTranscript
  useEffect(() => {
    if (transcript) {
      lastTranscriptRef.current = transcript;
    }
  }, [transcript]);

  useEffect(() => {
    if (!isListening && lastTranscriptRef.current) {
      onTranscript(lastTranscriptRef.current);
      lastTranscriptRef.current = '';
    }
  }, [isListening, onTranscript]);

  if (!isSupported) return null;

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const btnSize = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isListening ? 'Stop listening' : 'Voice input'}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-all shrink-0',
        isListening
          ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
          : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
        btnSize,
        className,
      )}
    >
      <Mic className={iconSize} />
    </button>
  );
}

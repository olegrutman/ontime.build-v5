import { useRef, useCallback, useEffect, useState } from 'react';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

export function OTPInput({ length = 6, value, onChange, error }: OTPInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (error) {
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 600);
      return () => clearTimeout(t);
    }
  }, [error]);

  // Focus first cell on mount
  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const chars = value.split('');

  const handleInput = useCallback((index: number, val: string) => {
    const digit = val.replace(/[^0-9]/g, '');
    const newChars = [...chars];
    // Pad array
    while (newChars.length < length) newChars.push('');
    newChars[index] = digit;
    onChange(newChars.join(''));
    if (digit && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  }, [chars, length, onChange]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !chars[index] && index > 0) {
      const newChars = [...chars];
      while (newChars.length < length) newChars.push('');
      newChars[index - 1] = '';
      onChange(newChars.join(''));
      refs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < length - 1) refs.current[index + 1]?.focus();
  }, [chars, length, onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = (e.clipboardData).getData('text').replace(/[^0-9]/g, '').slice(0, length);
    onChange(paste);
    const nextEmpty = Math.min(paste.length, length - 1);
    refs.current[nextEmpty]?.focus();
  }, [length, onChange]);

  return (
    <div className="auth-otp-grid">
      {Array.from({ length }, (_, i) => {
        const c = chars[i] || '';
        return (
          <input
            key={i}
            ref={el => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={c}
            className={`auth-otp-cell${c ? ' filled' : ''}${error && shaking ? ' error' : ''}`}
            onChange={e => handleInput(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
          />
        );
      })}
    </div>
  );
}

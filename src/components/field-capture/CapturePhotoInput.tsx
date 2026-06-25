import { useRef, useState } from 'react';
import { Camera, ImagePlus, X } from 'lucide-react';

interface CapturePhotoInputProps {
  onCapture: (file: File) => void;
  preview: string | null;
  onClear: () => void;
  disabled?: boolean;
}

export function CapturePhotoInput({ onCapture, preview, onClear, disabled }: CapturePhotoInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onCapture(file);
  };

  return (
    <div className="relative">
      {preview ? (
        <div className="relative rounded-2xl overflow-hidden border border-border">
          <img src={preview} alt="Captured" className="w-full h-48 object-cover" />
          {!disabled && (
            <button
              onClick={onClear}
              className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full p-1.5"
            >
              <X className="h-4 w-4 text-foreground" />
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="w-full h-48 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-3 active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Camera className="h-9 w-9 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-muted-foreground">Tap to take photo</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
}

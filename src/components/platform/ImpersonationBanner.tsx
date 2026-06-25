import { useImpersonation } from '@/hooks/useImpersonation';
import { Button } from '@/components/ui/button';
import { Shield, Timer } from 'lucide-react';

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function ImpersonationBanner() {
  const { isImpersonating, targetEmail, remainingMs, endImpersonation } = useImpersonation();

  if (!isImpersonating) return null;

  return (
    <div className="sticky top-0 z-[100] bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between text-sm font-medium shadow-md">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4" />
        <span>Viewing as <strong>{targetEmail}</strong> — Support Session</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 opacity-80">
          <Timer className="h-3.5 w-3.5" />
          <span className="font-mono text-xs">{formatTime(remainingMs)}</span>
        </div>
        <Button
          size="sm"
          variant="destructive"
          className="h-7 font-semibold"
          onClick={endImpersonation}
        >
          ← Return to Platform
        </Button>
      </div>
    </div>
  );
}

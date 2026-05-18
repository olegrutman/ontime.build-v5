import { useNavigate } from 'react-router-dom';
import { useDemo } from '@/contexts/DemoContext';
import { X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DemoRole } from '@/data/demoData';

const DEMO_ROLES: { value: DemoRole; label: string; short: string }[] = [
  { value: 'GC', label: 'General Contractor', short: 'GC' },
  { value: 'TC', label: 'Trade Contractor', short: 'TC' },
  { value: 'FC', label: 'Field Crew', short: 'FC' },
  { value: 'SUPPLIER', label: 'Supplier', short: 'Supplier' },
];

export function DemoBanner() {
  const { isDemoMode, demoRole, exitDemo, resetStore, switchRole } = useDemo();
  const navigate = useNavigate();

  if (!isDemoMode) return null;

  const handleExit = () => {
    exitDemo();
    navigate('/');
  };

  const handleReset = () => {
    resetStore();
    toast.success('Demo data reset to initial state');
  };

  const handleSwitch = (role: DemoRole) => {
    if (role === demoRole) return;
    switchRole(role);
    const label = DEMO_ROLES.find(r => r.value === role)?.label ?? role;
    toast.success(`Viewing as ${label}`);
  };

  return (
    <div className="sticky top-0 z-50 bg-foreground/95 text-background px-3 h-7 flex items-center justify-between gap-3 text-[11px] backdrop-blur">
      <div className="flex items-center gap-2 min-w-0">
        <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Demo
        </span>
        <span className="hidden md:inline text-background/60">
          Read-only sample data — no real records affected
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div
          role="tablist"
          aria-label="Switch demo role"
          className="flex items-center gap-0.5 rounded bg-background/15 p-0.5"
        >
          {DEMO_ROLES.map(r => {
            const active = r.value === demoRole;
            return (
              <button
                key={r.value}
                role="tab"
                aria-selected={active}
                aria-pressed={active}
                onClick={() => handleSwitch(r.value)}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-colors',
                  active
                    ? 'bg-background text-foreground'
                    : 'text-background/70 hover:bg-background/15 hover:text-background',
                )}
              >
                {r.short}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1 text-background/70 hover:text-background uppercase tracking-wider text-[10px] font-semibold"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
        <button
          onClick={handleExit}
          className="inline-flex items-center gap-1 text-background/70 hover:text-background uppercase tracking-wider text-[10px] font-semibold"
        >
          <X className="w-3 h-3" />
          Exit
        </button>
      </div>
    </div>
  );
}

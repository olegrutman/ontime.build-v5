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
    <div className="sticky top-0 z-50 bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-3 min-w-0">
        <strong className="shrink-0">Demo Mode</strong>
        <div
          role="tablist"
          aria-label="Switch demo role"
          className="flex items-center gap-1 rounded-md bg-primary-foreground/10 p-0.5"
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
                  'px-2.5 py-1 rounded text-xs font-semibold transition-colors',
                  active
                    ? 'bg-primary-foreground text-primary'
                    : 'text-primary-foreground/80 hover:bg-primary-foreground/15 hover:text-primary-foreground',
                )}
              >
                {r.short}
              </button>
            );
          })}
        </div>
        <span className="hidden md:inline text-primary-foreground/80">
          No real data is affected.
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="sm" onClick={handleReset} className="text-primary-foreground hover:bg-primary-foreground/20 h-7 gap-1">
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </Button>
        <Button variant="ghost" size="sm" onClick={handleExit} className="text-primary-foreground hover:bg-primary-foreground/20 h-7 gap-1">
          <X className="w-3.5 h-3.5" />
          Exit Demo
        </Button>
      </div>
    </div>
  );
}

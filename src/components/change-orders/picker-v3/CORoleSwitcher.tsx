import type { COCreatedByRole } from '@/types/changeOrder';
import { cn } from '@/lib/utils';

interface CORoleSwitcherProps {
  activeRole: COCreatedByRole;
  onSwitch: (role: COCreatedByRole) => void;
}

const ROLES: { role: COCreatedByRole; label: string; color: string }[] = [
  { role: 'GC', label: 'GC View', color: 'bg-blue-600' },
  { role: 'TC', label: 'TC View', color: 'bg-green-600' },
  { role: 'FC', label: 'FC View', color: 'bg-amber-500' },
];

export function CORoleSwitcher({ activeRole, onSwitch }: CORoleSwitcherProps) {
  return (
    <div className="flex gap-0.5 bg-muted border border-border rounded-lg p-[3px]">
      {ROLES.map(({ role, label, color }) => (
        <button
          key={role}
          type="button"
          onClick={() => onSwitch(role)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.74rem] font-semibold transition-all',
            activeRole === role
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <span
            className={cn(
              'w-[7px] h-[7px] rounded-full',
              activeRole === role ? color : 'bg-muted-foreground/40',
            )}
          />
          {label}
        </button>
      ))}
    </div>
  );
}

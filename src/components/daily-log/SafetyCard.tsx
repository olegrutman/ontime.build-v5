import { cn } from '@/lib/utils';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { SAFETY_INCIDENT_TYPES, type SafetyIncident } from '@/types/dailyLog';

interface SafetyCardProps {
  incidents: SafetyIncident[];
  onChange: (incidents: SafetyIncident[]) => void;
  disabled?: boolean;
}

export function SafetyCard({ incidents, onChange, disabled }: SafetyCardProps) {
  const hasIncidents = incidents.length > 0;

  const toggleIncidents = (on: boolean) => {
    if (disabled) return;
    onChange(on ? [{ type: 'near_miss' }] : []);
  };

  const toggleType = (type: string) => {
    if (disabled) return;
    const exists = incidents.some(i => i.type === type);
    if (exists) {
      const next = incidents.filter(i => i.type !== type);
      onChange(next.length === 0 ? [] : next);
    } else {
      onChange([...incidents, { type }]);
    }
  };

  return (
    <div className="bg-card rounded-2xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
          {hasIncidents ? <ShieldAlert className="h-3.5 w-3.5 text-destructive" /> : <ShieldCheck className="h-3.5 w-3.5 text-green-500" />}
          Safety
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{hasIncidents ? 'Incidents' : 'All clear'}</span>
          <Switch checked={hasIncidents} onCheckedChange={toggleIncidents} disabled={disabled} />
        </div>
      </div>
      {hasIncidents && (
        <div className="flex flex-wrap gap-2">
          {SAFETY_INCIDENT_TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => toggleType(t.key)}
              disabled={disabled}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                incidents.some(i => i.type === t.key)
                  ? 'bg-destructive text-destructive-foreground border-destructive'
                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

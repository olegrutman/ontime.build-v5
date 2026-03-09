import { cn } from '@/lib/utils';
import { WEATHER_CONDITIONS, type WeatherData } from '@/types/dailyLog';

interface WeatherCardProps {
  weather: WeatherData;
  onChange: (weather: WeatherData) => void;
  disabled?: boolean;
}

export function WeatherCard({ weather, onChange, disabled }: WeatherCardProps) {
  const conditions = weather.conditions || [];

  const toggleCondition = (key: string) => {
    if (disabled) return;
    const next = conditions.includes(key)
      ? conditions.filter(c => c !== key)
      : [...conditions, key];
    onChange({ ...weather, conditions: next });
  };

  return (
    <div className="bg-card rounded-2xl border p-4 space-y-3">
      <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Weather</h3>
      <div className="flex flex-wrap gap-2">
        {WEATHER_CONDITIONS.map(c => (
          <button
            key={c.key}
            onClick={() => toggleCondition(c.key)}
            disabled={disabled}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors border',
              conditions.includes(c.key)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span>{c.icon}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>
      {/* Temp range */}
      <div className="flex items-center gap-3 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Low</span>
          <div className="flex items-center gap-1">
            <button
              disabled={disabled}
              onClick={() => onChange({ ...weather, temp_low: (weather.temp_low ?? 50) - 5 })}
              className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-sm font-medium hover:bg-accent disabled:opacity-50"
            >−</button>
            <span className="text-sm font-medium w-8 text-center">{weather.temp_low ?? '--'}°</span>
            <button
              disabled={disabled}
              onClick={() => onChange({ ...weather, temp_low: (weather.temp_low ?? 50) + 5 })}
              className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-sm font-medium hover:bg-accent disabled:opacity-50"
            >+</button>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">High</span>
          <div className="flex items-center gap-1">
            <button
              disabled={disabled}
              onClick={() => onChange({ ...weather, temp_high: (weather.temp_high ?? 70) - 5 })}
              className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-sm font-medium hover:bg-accent disabled:opacity-50"
            >−</button>
            <span className="text-sm font-medium w-8 text-center">{weather.temp_high ?? '--'}°</span>
            <button
              disabled={disabled}
              onClick={() => onChange({ ...weather, temp_high: (weather.temp_high ?? 70) + 5 })}
              className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-sm font-medium hover:bg-accent disabled:opacity-50"
            >+</button>
          </div>
        </div>
      </div>
    </div>
  );
}

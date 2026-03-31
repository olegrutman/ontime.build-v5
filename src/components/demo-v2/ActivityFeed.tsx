import { ACTIVITY_FEED } from './mockData';

export function ActivityFeed() {
  return (
    <div className="space-y-1">
      <h3 className="text-[10px] uppercase tracking-wider text-white/30 font-medium px-1 mb-2">Live Activity</h3>
      {ACTIVITY_FEED.map((entry, i) => (
        <div
          key={entry.id}
          className="flex items-start gap-2.5 px-1 py-2 opacity-0 animate-[fadeUp_400ms_ease-out_forwards]"
          style={{ animationDelay: `${600 + i * 50}ms` }}
        >
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[9px] font-bold text-white/60">{entry.initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/70">
              <span className="font-semibold text-white/90">{entry.name}</span>{' '}
              {entry.description}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                style={{ background: `${entry.chipColor}15`, color: entry.chipColor }}
              >
                {entry.chipLabel}
              </span>
              <span className="text-[10px] text-white/20">{entry.time}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

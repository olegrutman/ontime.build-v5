import { useMemo } from 'react';
import { ScheduleItem } from '@/hooks/useProjectSchedule';
import { differenceInDays, addDays, format, startOfWeek, endOfWeek } from 'date-fns';

interface GanttChartProps {
  items: ScheduleItem[];
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}

const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 40;
const DAY_WIDTH = 28;
const LEFT_PAD = 8;

const TYPE_COLORS: Record<string, { bar: string; progress: string }> = {
  phase: { bar: 'hsl(var(--primary) / 0.25)', progress: 'hsl(var(--primary))' },
  task: { bar: 'hsl(142 76% 36% / 0.25)', progress: 'hsl(142 76% 36%)' },
  milestone: { bar: 'hsl(45 93% 47% / 0.6)', progress: 'hsl(45 93% 47%)' },
};

export function GanttChart({ items, onSelect, selectedId }: GanttChartProps) {
  const { startDate, totalDays, weeks } = useMemo(() => {
    if (!items.length) {
      const today = new Date();
      const s = startOfWeek(today, { weekStartsOn: 1 });
      return { startDate: s, totalDays: 28, weeks: buildWeeks(s, 28) };
    }
    const dates = items.flatMap(i => {
      const d = [new Date(i.start_date)];
      if (i.end_date) d.push(new Date(i.end_date));
      return d;
    });
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    const s = startOfWeek(addDays(min, -3), { weekStartsOn: 1 });
    const e = endOfWeek(addDays(max, 3), { weekStartsOn: 1 });
    const total = differenceInDays(e, s) + 1;
    return { startDate: s, totalDays: total, weeks: buildWeeks(s, total) };
  }, [items]);

  const svgWidth = totalDays * DAY_WIDTH + LEFT_PAD * 2;
  const svgHeight = HEADER_HEIGHT + items.length * ROW_HEIGHT + 8;

  return (
    <div className="overflow-x-auto overflow-y-auto border rounded-lg bg-card">
      <svg width={svgWidth} height={svgHeight} className="select-none">
        {/* Week headers */}
        {weeks.map((w, i) => (
          <g key={i}>
            <text
              x={LEFT_PAD + w.startDay * DAY_WIDTH + (w.days * DAY_WIDTH) / 2}
              y={16}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
              fontSize={10}
            >
              {w.label}
            </text>
            <line
              x1={LEFT_PAD + w.startDay * DAY_WIDTH}
              y1={HEADER_HEIGHT - 4}
              x2={LEFT_PAD + w.startDay * DAY_WIDTH}
              y2={svgHeight}
              stroke="hsl(var(--border))"
              strokeWidth={0.5}
            />
          </g>
        ))}
        {/* Day ticks */}
        {Array.from({ length: totalDays }).map((_, i) => {
          const d = addDays(startDate, i);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <g key={i}>
              {isWeekend && (
                <rect
                  x={LEFT_PAD + i * DAY_WIDTH}
                  y={HEADER_HEIGHT}
                  width={DAY_WIDTH}
                  height={svgHeight - HEADER_HEIGHT}
                  fill="hsl(var(--muted) / 0.4)"
                />
              )}
              <text
                x={LEFT_PAD + i * DAY_WIDTH + DAY_WIDTH / 2}
                y={HEADER_HEIGHT - 8}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={8}
              >
                {format(d, 'd')}
              </text>
            </g>
          );
        })}
        {/* Header separator */}
        <line x1={0} y1={HEADER_HEIGHT} x2={svgWidth} y2={HEADER_HEIGHT} stroke="hsl(var(--border))" strokeWidth={1} />

        {/* Dependency arrows */}
        {items.map((item, idx) => {
          if (!item.dependency_ids?.length) return null;
          return item.dependency_ids.map(depId => {
            const depIdx = items.findIndex(i => i.id === depId);
            if (depIdx === -1) return null;
            const dep = items[depIdx];
            const depEnd = dep.end_date || dep.start_date;
            const fromX = LEFT_PAD + (differenceInDays(new Date(depEnd), startDate) + 1) * DAY_WIDTH;
            const fromY = HEADER_HEIGHT + depIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
            const toX = LEFT_PAD + differenceInDays(new Date(item.start_date), startDate) * DAY_WIDTH;
            const toY = HEADER_HEIGHT + idx * ROW_HEIGHT + ROW_HEIGHT / 2;
            const midX = (fromX + toX) / 2;
            return (
              <path
                key={`${depId}-${item.id}`}
                d={`M${fromX},${fromY} C${midX},${fromY} ${midX},${toY} ${toX},${toY}`}
                fill="none"
                stroke="hsl(var(--muted-foreground) / 0.4)"
                strokeWidth={1.5}
                markerEnd="url(#arrow)"
              />
            );
          });
        })}

        {/* Arrow marker */}
        <defs>
          <marker id="arrow" viewBox="0 0 6 6" refX={6} refY={3} markerWidth={6} markerHeight={6} orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="hsl(var(--muted-foreground) / 0.4)" />
          </marker>
        </defs>

        {/* Items */}
        {items.map((item, idx) => {
          const y = HEADER_HEIGHT + idx * ROW_HEIGHT;
          const dayOffset = differenceInDays(new Date(item.start_date), startDate);
          const colors = TYPE_COLORS[item.item_type] || TYPE_COLORS.task;
          const isSelected = selectedId === item.id;

          if (item.item_type === 'milestone') {
            const cx = LEFT_PAD + dayOffset * DAY_WIDTH + DAY_WIDTH / 2;
            const cy = y + ROW_HEIGHT / 2;
            const s = 8;
            return (
              <g key={item.id} onClick={() => onSelect?.(item.id)} className="cursor-pointer">
                <rect x={0} y={y} width={svgWidth} height={ROW_HEIGHT} fill={isSelected ? 'hsl(var(--accent) / 0.3)' : 'transparent'} />
                <polygon
                  points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
                  fill={colors.progress}
                  stroke={isSelected ? 'hsl(var(--primary))' : 'none'}
                  strokeWidth={2}
                />
                <text x={cx + s + 4} y={cy + 3} fontSize={10} className="fill-foreground">{item.title}</text>
              </g>
            );
          }

          const duration = item.end_date ? differenceInDays(new Date(item.end_date), new Date(item.start_date)) + 1 : 1;
          const barX = LEFT_PAD + dayOffset * DAY_WIDTH;
          const barW = Math.max(duration * DAY_WIDTH - 4, 8);
          const barH = item.item_type === 'phase' ? 20 : 16;
          const barY = y + (ROW_HEIGHT - barH) / 2;
          const progressW = barW * (item.progress / 100);

          return (
            <g key={item.id} onClick={() => onSelect?.(item.id)} className="cursor-pointer">
              <rect x={0} y={y} width={svgWidth} height={ROW_HEIGHT} fill={isSelected ? 'hsl(var(--accent) / 0.3)' : 'transparent'} />
              <rect x={barX} y={barY} width={barW} height={barH} rx={4} fill={colors.bar} stroke={isSelected ? 'hsl(var(--primary))' : 'none'} strokeWidth={1.5} />
              {item.progress > 0 && (
                <rect x={barX} y={barY} width={progressW} height={barH} rx={4} fill={colors.progress} opacity={0.8} />
              )}
              <text x={barX + barW + 6} y={barY + barH / 2 + 3} fontSize={10} className="fill-foreground">{item.title}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function buildWeeks(start: Date, totalDays: number) {
  const weeks: { label: string; startDay: number; days: number }[] = [];
  let current = start;
  let dayIndex = 0;
  while (dayIndex < totalDays) {
    const weekEnd = endOfWeek(current, { weekStartsOn: 1 });
    const daysInWeek = Math.min(differenceInDays(weekEnd, current) + 1, totalDays - dayIndex);
    weeks.push({ label: format(current, 'MMM d'), startDay: dayIndex, days: daysInWeek });
    dayIndex += daysInWeek;
    current = addDays(weekEnd, 1);
  }
  return weeks;
}

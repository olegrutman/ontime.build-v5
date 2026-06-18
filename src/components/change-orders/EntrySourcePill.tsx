import { Sparkles, Mic, Wand2, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

type EntrySource = 'picker_v3' | 'ai_intake' | 'guided_v4' | 'field_pn' | null | undefined;

const META: Record<Exclude<EntrySource, null | undefined>, {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  bg: string;
  fg: string;
}> = {
  picker_v3: { label: 'Picker', Icon: ListChecks, bg: 'bg-muted', fg: 'text-muted-foreground' },
  ai_intake: { label: 'AI', Icon: Sparkles, bg: 'bg-violet-100', fg: 'text-violet-700' },
  guided_v4: { label: 'Guided', Icon: Wand2, bg: 'bg-amber-100', fg: 'text-amber-800' },
  field_pn: { label: 'Field PN', Icon: Mic, bg: 'bg-blue-100', fg: 'text-blue-700' },
};

interface EntrySourcePillProps {
  source: EntrySource;
  size?: 'sm' | 'md';
  className?: string;
}

export function EntrySourcePill({ source, size = 'sm', className }: EntrySourcePillProps) {
  if (!source || !(source in META)) return null;
  const m = META[source as keyof typeof META];
  const Icon = m.Icon;
  const sizing =
    size === 'sm'
      ? 'text-[0.6rem] px-1.5 py-0.5 gap-1'
      : 'text-[0.7rem] px-2 py-0.5 gap-1.5';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold uppercase tracking-wider',
        m.bg,
        m.fg,
        sizing,
        className,
      )}
      title={`Entry source: ${m.label}`}
    >
      <Icon className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {m.label}
    </span>
  );
}

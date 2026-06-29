import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Mic, Sparkles, FileText, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Mode = 'voice' | 'guided' | 'describe';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (mode: Mode) => void;
  docLabel?: string; // e.g. "Change Order" or "Work Order"
}

const cards: Array<{
  mode: Mode;
  title: string;
  desc: string;
  cta: string;
  Icon: typeof Mic;
  accent: { ring: string; iconBg: string; iconText: string; hoverIconBg: string; ctaText: string };
}> = [
  {
    mode: 'voice',
    title: 'Voice',
    desc: 'Dictate the change. Fastest from the field — just hold and talk.',
    cta: 'Start speaking',
    Icon: Mic,
    accent: {
      ring: 'hover:border-orange-300',
      iconBg: 'bg-orange-50',
      iconText: 'text-orange-600',
      hoverIconBg: 'group-hover:bg-orange-600 group-hover:text-white',
      ctaText: 'text-orange-600',
    },
  },
  {
    mode: 'guided',
    title: 'Guided',
    desc: 'Step-by-step wizard. Best when scope is structural and needs locations.',
    cta: 'Launch wizard',
    Icon: Sparkles,
    accent: {
      ring: 'hover:border-blue-300',
      iconBg: 'bg-blue-50',
      iconText: 'text-blue-600',
      hoverIconBg: 'group-hover:bg-blue-600 group-hover:text-white',
      ctaText: 'text-blue-600',
    },
  },
  {
    mode: 'describe',
    title: 'Describe',
    desc: 'Type, paste an RFI, or drop a quick note. AI turns it into a draft.',
    cta: 'Open editor',
    Icon: FileText,
    accent: {
      ring: 'hover:border-indigo-300',
      iconBg: 'bg-indigo-50',
      iconText: 'text-indigo-600',
      hoverIconBg: 'group-hover:bg-indigo-600 group-hover:text-white',
      ctaText: 'text-indigo-600',
    },
  },
];

export function NewCOChooserDialog({ open, onOpenChange, onPick, docLabel = 'Change Order' }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-6 sm:p-8">
        <DialogHeader className="mb-4 sm:mb-6">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div className="text-left">
              <DialogTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                New {docLabel}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base mt-1">
                Pick how you want to start.
              </DialogDescription>
            </div>
            <span className="hidden sm:inline-block px-3 py-1 bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-widest rounded-full">
              3 ways to start
            </span>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map(({ mode, title, desc, cta, Icon, accent }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onPick(mode)}
              className={cn(
                'group relative flex flex-col items-start text-left p-5 sm:p-6 bg-card border border-border rounded-2xl shadow-sm',
                'transition-all duration-300 cursor-pointer',
                'hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]',
                accent.ring,
              )}
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-colors duration-300',
                  accent.iconBg,
                  accent.iconText,
                  accent.hoverIconBg,
                )}
              >
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1.5">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{desc}</p>
              <span
                className={cn(
                  'mt-auto inline-flex items-center text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity',
                  accent.ctaText,
                )}
              >
                {cta}
                <ArrowRight className="w-4 h-4 ml-1" />
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

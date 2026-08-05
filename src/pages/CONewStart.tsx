import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Mic, Sparkles, FileText, ListChecks, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { coLabel, docTypeFromMode } from '@/lib/coLabel';

type Mode = 'voice' | 'guided' | 'describe' | 'manual';

const cards: Array<{
  mode: Mode;
  title: string;
  desc: string;
  cta: string;
  Icon: typeof Mic;
  accent: { border: string; iconBg: string; iconText: string; hoverIcon: string; cta: string };
}> = [
  {
    mode: 'voice',
    title: 'Voice',
    desc: 'Dictate the change. Fastest from the field — just hold and talk.',
    cta: 'Start speaking',
    Icon: Mic,
    accent: {
      border: 'hover:border-orange-300',
      iconBg: 'bg-orange-50',
      iconText: 'text-orange-600',
      hoverIcon: 'group-hover:bg-orange-600 group-hover:text-white',
      cta: 'text-orange-600',
    },
  },
  {
    mode: 'guided',
    title: 'Guided',
    desc: 'Step-by-step wizard. Best when scope is structural and needs locations.',
    cta: 'Launch wizard',
    Icon: Sparkles,
    accent: {
      border: 'hover:border-blue-300',
      iconBg: 'bg-blue-50',
      iconText: 'text-blue-600',
      hoverIcon: 'group-hover:bg-blue-600 group-hover:text-white',
      cta: 'text-blue-600',
    },
  },
  {
    mode: 'describe',
    title: 'Describe',
    desc: 'Type, paste an RFI, or drop a quick note. AI turns it into a draft.',
    cta: 'Open editor',
    Icon: FileText,
    accent: {
      border: 'hover:border-indigo-300',
      iconBg: 'bg-indigo-50',
      iconText: 'text-indigo-600',
      hoverIcon: 'group-hover:bg-indigo-600 group-hover:text-white',
      cta: 'text-indigo-600',
    },
  },
  {
    mode: 'manual',
    title: 'Pick items',
    desc: 'Browse the scope catalog and select line items yourself.',
    cta: 'Open picker',
    Icon: ListChecks,
    accent: {
      border: 'hover:border-emerald-300',
      iconBg: 'bg-emerald-50',
      iconText: 'text-emerald-600',
      hoverIcon: 'group-hover:bg-emerald-600 group-hover:text-white',
      cta: 'text-emerald-600',
    },
  },
];

/**
 * Single front door for creating a Change Order / Work Order.
 * Every role (GC, TC, FC) lands here and picks how to start, so the entry
 * experience is identical regardless of which button was pressed.
 */
export default function CONewStartPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');

  const { data: project } = useQuery({
    queryKey: ['project-contract-mode', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('contract_mode')
        .eq('id', projectId!)
        .maybeSingle();
      return data;
    },
  });

  const dt = docTypeFromMode(project?.contract_mode === 'tm');
  const label = coLabel(dt, false);

  const suffix = reason ? `?reason=${reason}` : '';

  const pick = (mode: Mode) => {
    const base = `/project/${projectId}/change-orders`;
    if (mode === 'voice') navigate(`${base}/new?mode=voice${reason ? `&reason=${reason}` : ''}`);
    else if (mode === 'guided') navigate(`${base}/guided${suffix}`);
    else if (mode === 'manual') navigate(`${base}/new/manual${suffix}`);
    else navigate(`${base}/new${suffix}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-36 md:pb-10">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 -ml-2 mb-4"
          onClick={() => navigate(`/project/${projectId}/change-orders`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-end justify-between gap-3 flex-wrap mb-5 sm:mb-7">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              New {label}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Pick how you want to start.</p>
          </div>
          <span className="hidden sm:inline-block px-3 py-1 bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-widest rounded-full">
            {cards.length} ways to start
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {cards.map(({ mode, title, desc, cta, Icon, accent }) => (
            <button
              key={mode}
              type="button"
              onClick={() => pick(mode)}
              className={cn(
                'group relative flex flex-col items-start text-left p-5 bg-card border border-border rounded-2xl shadow-sm',
                'transition-all duration-300 cursor-pointer hover:shadow-xl hover:-translate-y-1',
                accent.border,
              )}
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-300',
                  accent.iconBg,
                  accent.iconText,
                  accent.hoverIcon,
                )}
              >
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1.5">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{desc}</p>
              <span
                className={cn(
                  'mt-auto inline-flex items-center text-sm font-semibold sm:opacity-0 group-hover:opacity-100 transition-opacity',
                  accent.cta,
                )}
              >
                {cta}
                <ArrowRight className="w-4 h-4 ml-1" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

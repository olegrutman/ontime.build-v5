import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CO_STATUS_LABELS, CO_REASON_LABELS } from '@/types/changeOrder';
import type { ChangeOrder, COStatus, COReasonCode, COCreatedByRole } from '@/types/changeOrder';
import { Check, MapPin, Calendar, Tag } from 'lucide-react';

interface COHeaderStripProps {
  co: ChangeOrder;
  role: COCreatedByRole;
  myOrgName: string;
  isTM?: boolean;
}

const ROLE_PILL_COLORS: Record<string, string> = {
  GC: 'bg-blue-500',
  TC: 'bg-emerald-500',
  FC: 'bg-amber-500',
};

// Pipeline steps
const PIPELINE_STEPS = [
  { key: 'created', label: 'Created' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'review', label: 'Review' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'approved', label: 'Approved' },
] as const;

function getActiveStep(status: string): number {
  switch (status) {
    case 'draft': return 0;
    case 'shared':
    case 'work_in_progress':
    case 'closed_for_pricing': return 1;
    case 'submitted': return 3;
    case 'approved':
    case 'contracted': return 4;
    case 'rejected': return 2;
    default: return 0;
  }
}

export function COHeaderStrip({ co, role, myOrgName, isTM = false }: COHeaderStripProps) {
  const displayTitle = co.title ?? co.co_number ?? (isTM ? 'Work Order' : 'Change Order');
  const status = co.status as COStatus;
  const activeStep = getActiveStep(status);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Top section */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground font-medium">
              {co.co_number ?? '—'}
            </p>
            <h1 className="font-heading text-foreground truncate mt-1" style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.15 }}>
              {displayTitle}
            </h1>

            {/* Tag pills */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {co.location_tag && (
                <span className="inline-flex items-center gap-1 text-[0.65rem] px-2.5 py-1 rounded-full bg-accent text-muted-foreground font-medium">
                  <MapPin className="h-3 w-3" /> {co.location_tag}
                </span>
              )}
              {co.reason && (
                <span className="inline-flex items-center gap-1 text-[0.65rem] px-2.5 py-1 rounded-full bg-accent text-muted-foreground font-medium">
                  <Tag className="h-3 w-3" /> {CO_REASON_LABELS[co.reason as COReasonCode] ?? co.reason}
                </span>
              )}
              {co.created_at && (
                <span className="inline-flex items-center gap-1 text-[0.65rem] px-2.5 py-1 rounded-full bg-accent text-muted-foreground font-medium">
                  <Calendar className="h-3 w-3" /> {format(new Date(co.created_at), 'MMM d, yyyy')}
                </span>
              )}
              <span className={cn(
                'inline-flex items-center text-[0.65rem] px-2.5 py-1 rounded-full font-semibold',
                status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                status === 'rejected' ? 'bg-red-100 text-red-700' :
                status === 'work_in_progress' || status === 'closed_for_pricing' ? 'bg-amber-100 text-amber-700' :
                'bg-muted text-muted-foreground'
              )}>
                {CO_STATUS_LABELS[status]}
              </span>
            </div>
          </div>

          {/* TC name / role */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              'inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white',
              ROLE_PILL_COLORS[role] ?? 'bg-muted',
            )}>
              {role.charAt(0)}{role.charAt(1)}
            </span>
            <div className="text-right">
              <p className="text-xs font-semibold text-foreground">{myOrgName}</p>
              <p className="text-[10px] text-muted-foreground">{role === 'GC' ? 'General Contractor' : role === 'TC' ? 'Trade Contractor' : 'Field Crew'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Pipeline */}
      <div className="border-t border-border bg-accent/50 px-5 py-3.5">
        <div className="flex items-center justify-between">
          {PIPELINE_STEPS.map((step, i) => {
            const isCompleted = i < activeStep;
            const isActive = i === activeStep;
            const isFuture = i > activeStep;

            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-initial">
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all',
                    isCompleted && 'bg-[hsl(var(--navy))] text-white',
                    isActive && 'bg-[hsl(var(--amber))] text-[hsl(var(--navy))] shadow-[0_0_0_4px_hsl(var(--amber)/0.2)]',
                    isFuture && 'bg-muted/40 text-muted-foreground border border-border',
                  )}>
                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium whitespace-nowrap',
                    isCompleted && 'text-foreground',
                    isActive && 'text-[hsl(var(--amber-d))] font-semibold',
                    isFuture && 'text-muted-foreground/60',
                  )}>
                    {step.label}
                  </span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className={cn(
                    'flex-1 h-[2px] mx-2 mt-[-16px]',
                    i < activeStep ? 'bg-[hsl(var(--navy))]' : 'bg-border',
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

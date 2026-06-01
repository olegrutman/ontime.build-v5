import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TodayBarProps {
  orgType: string | null;
  attentionCount: number;
  pendingInviteCount: number;
  activeProjects: number;
  outstandingToPay?: number;
  outstandingToCollect?: number;
  firstName?: string | null;
}

function fmt(n?: number) {
  if (!n || n < 1) return null;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

/**
 * Role-aware one-sentence summary of what's on your plate today.
 * Replaces the generic "8 KPI tile" dashboard intro.
 */
export function TodayBar({
  orgType,
  attentionCount,
  pendingInviteCount,
  activeProjects,
  outstandingToPay,
  outstandingToCollect,
  firstName,
}: TodayBarProps) {
  const navigate = useNavigate();

  const greeting = firstName ? `${firstName},` : 'Today —';

  // Compose role-aware fragments
  const fragments: string[] = [];

  if (pendingInviteCount > 0) {
    fragments.push(`${pendingInviteCount} project invite${pendingInviteCount === 1 ? '' : 's'} to respond to`);
  }
  if (attentionCount > 0) {
    fragments.push(`${attentionCount} item${attentionCount === 1 ? '' : 's'} need${attentionCount === 1 ? 's' : ''} your action`);
  }

  if (orgType === 'GC' || orgType === 'TC') {
    const pay = fmt(outstandingToPay);
    const collect = fmt(outstandingToCollect);
    if (pay) fragments.push(`${pay} payable`);
    if (collect) fragments.push(`${collect} to collect`);
  } else if (orgType === 'FC') {
    const collect = fmt(outstandingToCollect);
    if (collect) fragments.push(`${collect} owed to you`);
  } else if (orgType === 'SUPPLIER') {
    const collect = fmt(outstandingToCollect);
    if (collect) fragments.push(`${collect} outstanding`);
  }

  if (fragments.length === 0) {
    fragments.push(
      activeProjects > 0
        ? `${activeProjects} active project${activeProjects === 1 ? '' : 's'} — all clear`
        : 'no active projects yet'
    );
  }

  // Primary CTA per role
  const cta = (() => {
    if (pendingInviteCount > 0) return { label: 'Review invites', onClick: () => document.getElementById('projects-list')?.scrollIntoView({ behavior: 'smooth' }) };
    if (orgType === 'FC') return { label: 'Log today', onClick: () => navigate('/dashboard#daily-log') };
    if (orgType === 'SUPPLIER') return { label: 'View orders', onClick: () => navigate('/orders') };
    if (attentionCount > 0) return { label: 'Open inbox', onClick: () => navigate('/reminders') };
    return { label: 'New project', onClick: () => navigate('/create-project') };
  })();

  const sentence = fragments.join(' · ');

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 px-4 py-3 sm:px-5 sm:py-4',
        'bg-gradient-to-r from-[hsl(var(--role-accent))] to-[hsl(var(--role-accent))]/85',
        'text-[hsl(var(--role-accent-foreground))]',
        'flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 shadow-sm'
      )}
    >
      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
        <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70 leading-none mb-1">
            Today
          </div>
          <p className="text-sm sm:text-[15px] font-medium leading-snug">
            <span className="opacity-80">{greeting}</span> <span>{sentence}.</span>
          </p>
        </div>
      </div>
      <Button
        onClick={cta.onClick}
        size="sm"
        className="bg-white/15 hover:bg-white/25 text-[hsl(var(--role-accent-foreground))] border border-white/20 shrink-0"
      >
        {cta.label}
        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
      </Button>
    </div>
  );
}

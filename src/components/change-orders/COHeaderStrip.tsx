import { cn } from '@/lib/utils';
import { CO_STATUS_LABELS } from '@/types/changeOrder';
import type { ChangeOrder, COStatus, COCreatedByRole } from '@/types/changeOrder';
import { Check, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cleanTitle } from '@/lib/coTitle';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';
import { coPricingStatusLabel, type COPricingReadiness } from '@/lib/coPricingReadiness';

interface COHeaderStripProps {
  co: ChangeOrder;
  role: COCreatedByRole;
  myOrgName: string;
  pricingReadiness?: COPricingReadiness;
}

const ROLE_PILL_COLORS: Record<string, string> = {
  GC: 'bg-blue-500',
  TC: 'bg-emerald-500',
  FC: 'bg-amber-500',
};

// Pipeline steps — labels match the status pill / action button vocabulary
const PIPELINE_STEPS = [
  { key: 'draft', label: 'Draft' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'review', label: 'Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'invoiced', label: 'Invoiced' },
] as const;

function getActiveStep(status: string): number {
  switch (status) {
    case 'draft': return 0;
    case 'shared':
    case 'work_in_progress':
    case 'closed_for_pricing':
    case 'rejected': return 1;
    case 'submitted': return 2;
    case 'approved': return 3;
    case 'contracted': return 4;
    default: return 0;
  }
}

export function COHeaderStrip({ co, role, myOrgName, pricingReadiness }: COHeaderStripProps) {
  const rl = useRoleLabelsContext();
  const status = co.status as COStatus;
  const isWithdrawn = status === 'withdrawn';
  const activeStep = getActiveStep(status);
  const userName = co.title && co.title !== co.co_number ? co.title : null;
  const canRename = !['approved', 'contracted', 'withdrawn'].includes(status);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(co.title ?? '');
  const [saving, setSaving] = useState(false);

  const saveTitle = async () => {
    const next = cleanTitle(draft);
    if (!next || next === co.title) { setEditing(false); return; }
    setSaving(true);
    const { data, error } = await supabase.from('change_orders').update({ title: next }).eq('id', co.id).select('id');
    setSaving(false);
    if (error || !data?.length) {
      toast({ title: 'Could not rename', description: error?.message ?? 'You do not have permission to rename this order.', variant: 'destructive' });
      return;
    }
    setEditing(false);
    qc.invalidateQueries({ queryKey: ['co-detail', co.id] });
    qc.invalidateQueries({ queryKey: ['change-orders', co.project_id] });
  };

  // Avatar shows the company's initials — never the internal role code.
  const roleName = rl.label(role);
  const orgInitials = (myOrgName || roleName)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('') || '—';
  const showRoleLine =
    !!myOrgName && roleName.trim().toLowerCase() !== myOrgName.trim().toLowerCase();

  return (
    <div className={cn('bg-card border border-border rounded-xl overflow-hidden shadow-sm', isWithdrawn && 'opacity-60')}>
      {/* Top section */}
      <div className="px-3 py-3 sm:px-5 sm:py-4">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1
                className={cn('font-heading text-foreground min-w-0 break-words text-[1.5rem] sm:text-[2rem]', isWithdrawn && 'line-through')}
                style={{ fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.01em' }}
              >

                {co.co_number ?? (co.document_type === 'WO' ? 'Work Order' : 'Change Order')}
              </h1>
              <span className={cn(
                'inline-flex items-center text-[0.7rem] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide',
                status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                status === 'rejected' ? 'bg-red-100 text-red-700' :
                status === 'work_in_progress' || status === 'closed_for_pricing' ? 'bg-amber-100 text-amber-700' :
                'bg-muted text-muted-foreground'
              )}>
                {coPricingStatusLabel(status, pricingReadiness, co.kept_internal) ?? CO_STATUS_LABELS[status]}
              </span>
            </div>
            {editing ? (
              <input
                autoFocus
                aria-label="Order title"
                value={draft}
                maxLength={100}
                disabled={saving}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') { setDraft(co.title ?? ''); setEditing(false); }
                }}
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
              />
            ) : canRename ? (
              <button
                type="button"
                onClick={() => { setDraft(co.title ?? ''); setEditing(true); }}
                className="group mt-1 flex max-w-full items-start gap-1.5 text-left text-sm text-muted-foreground hover:text-foreground"
                aria-label="Rename order"
              >
                <span className="break-words">{userName ?? 'Add a title'}</span>
                <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
              </button>
            ) : userName && (
              <p className="text-sm text-muted-foreground mt-1 break-words">{userName}</p>
            )}
          </div>

          {/* TC name / role */}
          <div className="flex items-center gap-2 shrink-0 max-w-[45%]">
            <span
              className={cn(
                'inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white shrink-0',
                ROLE_PILL_COLORS[role] ?? 'bg-muted',
              )}
              title={myOrgName}
            >
              {orgInitials}
            </span>
            <div className="hidden min-[380px]:block text-right min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{myOrgName || roleName}</p>
              {showRoleLine && (
                <p className="text-[10px] text-muted-foreground truncate">{roleName}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Pipeline */}
      <div className="border-t border-border bg-accent/50 px-3 sm:px-5 py-3.5">
        <div className="flex min-w-0 items-start justify-between gap-1">

          {PIPELINE_STEPS.map((step, i) => {
            const isCompleted = i < activeStep;
            const isActive = i === activeStep;
            const isFuture = i > activeStep;

            return (
              <div key={step.key} className="flex min-w-0 items-center flex-1 last:flex-initial">
                <div className="flex min-w-0 flex-col items-center gap-1">
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all',
                    isCompleted && 'bg-[hsl(var(--navy))] text-white',
                    isActive && 'bg-[hsl(var(--amber))] text-[hsl(var(--navy))] shadow-[0_0_0_4px_hsl(var(--amber)/0.2)]',
                    isFuture && 'bg-muted/40 text-muted-foreground border border-border',
                  )}>
                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className={cn(
                    'max-w-full text-center text-[9px] min-[360px]:text-[10px] font-medium leading-tight whitespace-normal break-words',
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

import { cn } from '@/lib/utils';
import { CO_STATUS_LABELS } from '@/types/changeOrder';
import type { ChangeOrder, COStatus, COCreatedByRole } from '@/types/changeOrder';
import { ArrowRight, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cleanTitle } from '@/lib/coTitle';
import { CODescriptionEditor } from './CODescriptionEditor';
import { coPricingStatusLabel, type COPricingReadiness } from '@/lib/coPricingReadiness';

interface COHeaderStripProps {
  co: ChangeOrder;
  role: COCreatedByRole;
  myOrgName: string;
  pricingReadiness?: COPricingReadiness;
  myOrgId?: string;
  fromLabel: string;
  toLabel: string;
}

export function COHeaderStrip({
  co,
  myOrgName,
  pricingReadiness,
  myOrgId,
  fromLabel,
  toLabel,
}: COHeaderStripProps) {
  const status = co.status as COStatus;
  const isWithdrawn = status === 'withdrawn';
  const userName = co.title && co.title !== co.co_number ? co.title : null;
  const isCreator = !!myOrgId && co.org_id === myOrgId && !isWithdrawn;
  const summary = (co as { problem_summary?: string | null }).problem_summary ?? '';
  const canRename = !isCreator && !['approved', 'contracted', 'withdrawn'].includes(status);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(co.title ?? '');
  const [saving, setSaving] = useState(false);
  const documentLabel = co.document_type === 'WO' ? 'Work order workspace' : 'Change order workspace';
  const statusLabel = coPricingStatusLabel(status, pricingReadiness, co.kept_internal) ?? CO_STATUS_LABELS[status];

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

  return (
    <header className={cn('rounded-2xl bg-[hsl(var(--foreground))] px-4 py-4 text-white shadow-sm sm:px-5', isWithdrawn && 'opacity-60')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.25em] text-white/60">{documentLabel}</p>
        <span className={cn(
          'inline-flex max-w-full items-center rounded-md border px-2.5 py-1 text-center text-[0.68rem] font-bold uppercase tracking-wider',
          status === 'approved' || status === 'contracted'
            ? 'border-state-approved/30 bg-state-approved/15 text-state-approved'
            : status === 'submitted'
              ? 'border-type-sov/30 bg-type-sov/15 text-type-sov'
              : status === 'rejected' || status === 'withdrawn'
                ? 'border-destructive/30 bg-destructive/15 text-destructive'
                : 'border-white/15 bg-white/10 text-white/80',
        )}>
          {statusLabel}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className={cn('break-words font-heading text-[1.75rem] font-bold uppercase leading-none tracking-normal [overflow-wrap:anywhere] sm:text-4xl', isWithdrawn && 'line-through')}>
            {co.co_number ?? (co.document_type === 'WO' ? 'Work Order' : 'Change Order')}
          </h1>
          {editing ? (
            <input
              autoFocus
              aria-label="Order title"
              value={draft}
              maxLength={100}
              disabled={saving}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={saveTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveTitle();
                if (event.key === 'Escape') { setDraft(co.title ?? ''); setEditing(false); }
              }}
              className="mt-2 w-full rounded-md border border-white/20 bg-white/10 px-2 py-1 text-sm text-white outline-none placeholder:text-white/40"
            />
          ) : canRename ? (
            <button
              type="button"
              onClick={() => { setDraft(co.title ?? ''); setEditing(true); }}
              className="group mt-2 flex max-w-full items-start gap-1.5 text-left text-sm text-white/70 hover:text-white"
              aria-label="Rename order"
            >
              <span className="break-words">{userName ?? 'Add a title'}</span>
              <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
            </button>
          ) : isCreator ? (
            <CODescriptionEditor
              coId={co.id}
              status={status}
              title={co.title ?? ''}
              description={summary}
              label="Edit title & description"
              triggerClassName="group mt-2 -mx-1.5 block max-w-full rounded-md px-1.5 py-1 text-left hover:bg-white/10 transition-colors"
            >
              <span className="flex items-start gap-1.5 text-sm text-white/80 group-hover:text-white">
                <span className="break-words">{userName ?? 'Add a title'}</span>
                <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
              </span>
              <span className="mt-1 block whitespace-pre-line break-words text-xs text-white/60">{summary || 'Add a description'}</span>
            </CODescriptionEditor>
          ) : userName ? (
            <p className="mt-2 break-words text-sm text-white/70">{userName}</p>
          ) : null}
          {!(isCreator && !canRename && !editing) && summary && <p className="mt-1 whitespace-pre-line break-words text-xs text-white/60">{summary}</p>}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs sm:max-w-[46%]">
          <span className="min-w-0 break-words font-semibold text-white">{fromLabel || myOrgName}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/40" />
          <span className="min-w-0 break-words font-semibold text-white">{toLabel}</span>
        </div>
      </div>
    </header>
  );
}

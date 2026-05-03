import { formatDistanceToNow, format } from 'date-fns';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { COAuditEntry } from '@/hooks/useCOAuditLog';

interface COAuditLogProps {
  entries: COAuditEntry[];
  viewerRole: string; // GC | TC | FC
}

const CURRENCY_FIELDS = new Set([
  'tc_submitted_price', 'gc_budget', 'nte_cap', 'hourly_rate', 'lump_sum', 'line_total',
]);

const FIELD_LABELS: Record<string, string> = {
  tc_submitted_price: 'TC Submitted Price',
  gc_budget: 'GC Budget',
  nte_cap: 'NTE Cap',
  status: 'Status',
  pricing_type: 'Pricing Type',
  assigned_to_org_id: 'Assigned Org',
  materials_responsible: 'Materials Responsible',
  equipment_responsible: 'Equipment Responsible',
  hours: 'Hours',
  hourly_rate: 'Hourly Rate',
  lump_sum: 'Lump Sum',
  line_total: 'Line Total',
};

const ROLE_STYLES: Record<string, string> = {
  GC: 'co-light-role-gc',
  TC: 'co-light-role-tc',
  FC: 'co-light-role-fc',
};

// Fields that are internal to TC/FC and should not be shown to GC
const TC_INTERNAL_FIELDS = new Set(['hourly_rate', 'lump_sum', 'line_total', 'hours']);
// Fields internal to GC
const GC_INTERNAL_FIELDS = new Set(['gc_budget']);

function formatValue(field: string, val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (CURRENCY_FIELDS.has(field)) {
    const num = typeof val === 'number' ? val : Number(val);
    if (isNaN(num)) return String(val);
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (field === 'hours') {
    const num = typeof val === 'number' ? val : Number(val);
    if (!isNaN(num)) return `${num}h`;
  }
  return String(val);
}

function filterEntries(entries: COAuditEntry[], viewerRole: string): COAuditEntry[] {
  if (viewerRole === 'GC') {
    // GC sees everything except TC/FC internal cost fields
    return entries.filter(e => !TC_INTERNAL_FIELDS.has(e.field_name));
  }
  if (viewerRole === 'TC') {
    // TC sees own entries + GC-sourced non-budget entries
    return entries.filter(e => !GC_INTERNAL_FIELDS.has(e.field_name));
  }
  // FC sees only FC-actor entries
  return entries.filter(e => e.actor_role === 'FC');
}

export function COAuditLog({ entries, viewerRole }: COAuditLogProps) {
  const filtered = filterEntries(entries, viewerRole);

  if (filtered.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        No audit entries yet
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {filtered.map(entry => (
        <div key={entry.id} className="px-4 py-3 flex items-start gap-2.5">
          <span
            className={cn(
              'text-[10px] font-semibold rounded-full px-1.5 py-0.5 mt-0.5 shrink-0',
              ROLE_STYLES[entry.actor_role ?? ''] ?? 'bg-muted text-muted-foreground',
            )}
          >
            {entry.actor_role ?? '?'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground">
              changed{' '}
              <span className="font-semibold">{FIELD_LABELS[entry.field_name] ?? entry.field_name}</span>
              {' '}from{' '}
              <span className="font-mono text-xs bg-muted/60 px-1 py-0.5 rounded">{formatValue(entry.field_name, entry.old_value)}</span>
              {' '}→{' '}
              <span className="font-mono text-xs bg-primary/10 text-primary px-1 py-0.5 rounded">{formatValue(entry.field_name, entry.new_value)}</span>
            </p>
            {entry.source_table !== 'change_orders' && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                on {entry.source_table === 'co_line_items' ? 'line item' : 'labor entry'}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground/70 mt-0.5" title={format(new Date(entry.changed_at), 'PPpp')}>
              {formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

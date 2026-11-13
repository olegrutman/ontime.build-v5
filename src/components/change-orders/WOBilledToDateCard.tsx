import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { fetchWoBilledToDate } from '@/lib/woProgressBillingData';
import { woBillingSummary, WO_BILLING_LABEL } from '@/lib/woProgressBilling';

interface Props {
  projectId: string;
  coId: string;
  orgId: string | null | undefined;
  value: number;
  nteCap?: number | null;
  status: string;
}

const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function WOBilledToDateCard({ projectId, coId, orgId, value, nteCap, status }: Props) {
  const [billed, setBilled] = useState<number | null>(null);
  const [draft, setDraft] = useState(0);
  const [legacy, setLegacy] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    fetchWoBilledToDate(projectId, orgId, [coId]).then(m => {
      const info = m.get(coId);
      setBilled(info?.billed ?? 0);
      setDraft(info?.draft ?? 0);
      setLegacy(!!info?.legacyFullyBilled);
    });
  }, [projectId, coId, orgId]);

  if (!['approved', 'contracted'].includes(status) || billed === null || value <= 0) return null;
  const s = woBillingSummary(value, legacy ? value : billed, nteCap);
  const tone = s.status === 'fully_billed' ? 'bg-success' : 'bg-primary';

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
          <Receipt className="h-3.5 w-3.5 shrink-0" /> Billed to date
        </span>
        <Badge variant="secondary" className="text-[10px] shrink-0">{draft > 0 && s.billed === 0 ? 'Draft in progress' : WO_BILLING_LABEL[s.status]}</Badge>
      </div>
      <div className={draft > 0 ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-2 gap-3'}>
        <div className="rounded-lg bg-muted/30 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Billed</p>
          <p className="mt-1 whitespace-nowrap font-mono text-sm font-bold text-foreground sm:text-lg">{fmt(s.billed)}</p>
        </div>
        {draft > 0 && (
          <div className="rounded-lg bg-muted/30 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Draft · not billed</p>
            <p className="mt-1 whitespace-nowrap font-mono text-sm font-bold text-foreground sm:text-lg">{fmt(draft)}</p>
          </div>
        )}
        <div className="rounded-lg bg-muted/30 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Remaining</p>
          <p className="mt-1 whitespace-nowrap font-mono text-sm font-bold text-foreground sm:text-lg">{fmt(s.remaining)}</p>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${s.percentBilled}%` }} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {s.remaining > 0 ? `${s.percentBilled}% of the approved price billed` : 'Nothing left to bill'}
      </p>
    </div>
  );
}

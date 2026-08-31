import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowDown, ArrowUp, FileText, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useChangeOrders } from '@/hooks/useChangeOrders';
import { useCreateProposal, downloadProposalPdf } from '@/hooks/useCOProposals';

const money = (v: number) =>
  `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ProposalBuilder() {
  const { id: projectId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { changeOrders, isLoading } = useChangeOrders(projectId ?? null);
  const createProposal = useCreateProposal(projectId ?? null);

  const initialIds = useMemo(
    () => (searchParams.get('ids') ?? '').split(',').filter(Boolean),
    [searchParams],
  );
  const [orderedIds, setOrderedIds] = useState<string[]>(initialIds);

  const [title, setTitle] = useState('Proposal');
  const [intro, setIntro] = useState('');
  const [validityDays, setValidityDays] = useState('30');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [markup, setMarkup] = useState('0');
  const [saving, setSaving] = useState(false);

  const coById = useMemo(() => new Map(changeOrders.map(co => [co.id, co])), [changeOrders]);
  const rows = orderedIds
    .map(id => coById.get(id))
    .filter((co): co is NonNullable<typeof co> => !!co)
    .map(co => ({
      id: co.id,
      number: co.co_number ?? '—',
      title: co.title ?? 'Untitled',
      amount: (co as { display_total?: number }).display_total ?? co.tc_submitted_price ?? 0,
    }));

  const subtotal = rows.reduce((s, r) => s + r.amount, 0);
  const markupPct = Number(markup) || 0;
  const markupAmt = (subtotal * markupPct) / 100;
  const total = subtotal + markupAmt;

  function move(index: number, dir: -1 | 1) {
    const next = [...orderedIds];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrderedIds(next);
  }

  async function handleSave() {
    if (rows.length === 0) {
      toast.error('Add at least one work order to the proposal.');
      return;
    }
    setSaving(true);
    try {
      const proposal = await createProposal.mutateAsync({
        title: title.trim() || 'Proposal',
        intro: intro.trim() || null,
        validity_days: Number(validityDays) || 30,
        payment_terms: paymentTerms.trim() || null,
        markup_percent: markupPct,
        items: rows.map(r => ({ change_order_id: r.id, amount: r.amount })),
      });
      toast.success(`${proposal.proposal_number} created`);
      try {
        await downloadProposalPdf(proposal.id, `Proposal-${proposal.proposal_number}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Proposal saved, but the PDF failed to generate');
      }
      navigate(`/project/${projectId}/proposals/${proposal.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create the proposal');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-36 md:pb-10">
      <div className="mx-auto max-w-3xl px-4 py-5 space-y-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}`)} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <header>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">New proposal</h1>
          <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {rows.length} work order{rows.length === 1 ? '' : 's'} bundled
          </p>
        </header>

        {/* Bundled work orders */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Included work orders
          </h2>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Nothing selected. Go back to the list, tap Select, and pick the work orders to bundle.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r, i) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="rounded p-0.5 text-muted-foreground hover:bg-accent disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === rows.length - 1}
                      className="rounded p-0.5 text-muted-foreground hover:bg-accent disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6rem] font-semibold text-muted-foreground">
                      {r.number}
                    </span>
                    <p className="mt-0.5 truncate text-sm font-medium text-foreground">{r.title}</p>
                  </div>
                  <span className="font-mono tabular-nums text-sm font-semibold text-foreground">{money(r.amount)}</span>
                  <button
                    type="button"
                    onClick={() => setOrderedIds(ids => ids.filter(x => x !== r.id))}
                    className="rounded p-1 text-muted-foreground hover:bg-accent"
                    aria-label="Remove from proposal"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Cover fields */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Cover details
          </h2>
          <div className="space-y-1.5">
            <Label htmlFor="prop-title">Proposal title</Label>
            <Input id="prop-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Kitchen & bath additional work" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prop-intro">Intro paragraph</Label>
            <Textarea
              id="prop-intro"
              value={intro}
              onChange={e => setIntro(e.target.value)}
              rows={3}
              placeholder="Summarize the package for the client in one or two sentences."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prop-validity">Valid for (days)</Label>
              <Input id="prop-validity" type="number" inputMode="numeric" value={validityDays} onChange={e => setValidityDays(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-markup">Proposal markup %</Label>
              <Input id="prop-markup" type="number" inputMode="decimal" value={markup} onChange={e => setMarkup(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prop-terms">Payment terms</Label>
            <Input id="prop-terms" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="50% on acceptance, balance on completion" />
          </div>
        </section>

        {/* Totals */}
        <section className="rounded-2xl border border-border bg-[hsl(var(--primary))] p-4 text-primary-foreground">
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-80">Subtotal</span>
            <span className="font-mono tabular-nums">{money(subtotal)}</span>
          </div>
          {markupPct > 0 && (
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="opacity-80">Markup ({markupPct}%)</span>
              <span className="font-mono tabular-nums">{money(markupAmt)}</span>
            </div>
          )}
          <div className="mt-3 flex items-baseline justify-between border-t border-white/20 pt-3">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] opacity-80">Total proposal</span>
            <span className="font-mono tabular-nums text-2xl font-semibold">{money(total)}</span>
          </div>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => navigate(`/project/${projectId}`)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || rows.length === 0} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Save &amp; generate PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowDown, ArrowUp, FileText, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useChangeOrders } from '@/hooks/useChangeOrders';
import {
  useCreateProposal,
  useUpdateProposal,
  useCOProposal,
  downloadProposalPdf,
  computeProposalTotals,
  type MilestoneInput,
} from '@/hooks/useCOProposals';
import { PaymentScheduleEditor } from '@/components/change-orders/PaymentScheduleEditor';

const money = (v: number) =>
  `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DEFAULT_TERMS = `Work is performed per the scope described above. Concealed conditions, code-required upgrades, or owner-directed changes are handled by written change order before work proceeds.
Schedule commences upon written acceptance and access to the work area.
Permits, engineering, and testing fees are billed at cost unless stated otherwise.`;

export default function ProposalBuilder() {
  const { id: projectId, proposalId } = useParams<{ id: string; proposalId?: string }>();
  const isEdit = !!proposalId;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { changeOrders, isLoading } = useChangeOrders(projectId ?? null);
  const createProposal = useCreateProposal(projectId ?? null);
  const updateProposal = useUpdateProposal(projectId ?? null);
  const { data: existing, isLoading: loadingExisting } = useCOProposal(proposalId ?? null);

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
  const [tax, setTax] = useState('0');
  const [saving, setSaving] = useState(false);

  // Client / quote fields
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [scopeNotes, setScopeNotes] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [termsText, setTermsText] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [milestones, setMilestones] = useState<MilestoneInput[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!isEdit || !existing || hydrated) return;
    setOrderedIds(existing.items.map(i => i.change_order_id));
    setTitle(existing.title ?? 'Proposal');
    setIntro(existing.intro ?? '');
    setValidityDays(String(existing.validity_days ?? 30));
    setPaymentTerms(existing.payment_terms ?? '');
    setMarkup(String(existing.markup_percent ?? 0));
    setTax(String(existing.tax_percent ?? 0));
    setClientName(existing.client_name ?? '');
    setClientCompany(existing.client_company ?? '');
    setClientEmail(existing.client_email ?? '');
    setClientPhone(existing.client_phone ?? '');
    setClientAddress(existing.client_address ?? '');
    setSiteAddress(existing.site_address ?? '');
    setScopeNotes(existing.scope_notes ?? '');
    setExclusions(existing.exclusions ?? '');
    setTermsText(existing.terms_text ?? '');
    setDepositNote(existing.deposit_note ?? '');
    setMilestones(
      existing.milestones.map(m => ({
        label: m.label,
        due_trigger: m.due_trigger,
        basis: m.basis,
        percent: Number(m.percent) || 0,
        amount: Number(m.amount) || 0,
      })),
    );
    setHydrated(true);
  }, [isEdit, existing, hydrated]);

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

  const markupPct = Number(markup) || 0;
  const taxPct = Number(tax) || 0;
  const { subtotal, markupAmount, taxAmount, total } = computeProposalTotals(
    rows.map(r => r.amount),
    markupPct,
    taxPct,
  );

  function move(index: number, dir: -1 | 1) {
    const next = [...orderedIds];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrderedIds(next);
  }

  function buildInput() {
    return {
      title: title.trim() || 'Proposal',
      intro: intro.trim() || null,
      validity_days: Number(validityDays) || 30,
      payment_terms: paymentTerms.trim() || null,
      markup_percent: markupPct,
      tax_percent: taxPct,
      client_name: clientName,
      client_company: clientCompany,
      client_email: clientEmail,
      client_phone: clientPhone,
      client_address: clientAddress,
      site_address: siteAddress,
      scope_notes: scopeNotes,
      exclusions,
      terms_text: termsText,
      deposit_note: depositNote,
      items: rows.map(r => ({ change_order_id: r.id, amount: r.amount })),
      milestones: milestones.filter(m => m.label.trim() || m.percent || m.amount),
    };
  }

  async function handleSave() {
    if (rows.length === 0) {
      toast.error('Add at least one work order to the proposal.');
      return;
    }
    if (!clientName.trim() && !clientCompany.trim()) {
      toast.error('Add the client name or company this quote is addressed to.');
      return;
    }
    setSaving(true);
    try {
      const input = buildInput();
      if (isEdit && proposalId) {
        await updateProposal.mutateAsync({ id: proposalId, input });
        toast.success('Quote updated');
        navigate(`/project/${projectId}`);
        return;
      }
      const proposal = await createProposal.mutateAsync(input);
      toast.success(`${proposal.proposal_number} created`);
      try {
        await downloadProposalPdf(proposal.id, `Quote-${proposal.proposal_number}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Quote saved, but the PDF failed to generate');
      }
      navigate(`/project/${projectId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the quote');
    } finally {
      setSaving(false);
    }
  }

  const busy = isLoading || (isEdit && loadingExisting);

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
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            {isEdit ? `Edit quote ${existing?.proposal_number ?? ''}` : 'New quote'}
          </h1>
          <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {rows.length} work order{rows.length === 1 ? '' : 's'} bundled
          </p>
        </header>

        {/* Bundled work orders */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Included work orders
          </h2>
          {busy ? (
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

        {/* Client */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Quote for (client)
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="q-client-name">Client name</Label>
              <Input id="q-client-name" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Sarah Whitman" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-client-company">Company (optional)</Label>
              <Input id="q-client-company" value={clientCompany} onChange={e => setClientCompany(e.target.value)} placeholder="Whitman Holdings LLC" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-client-email">Email</Label>
              <Input id="q-client-email" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="sarah@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-client-phone">Phone</Label>
              <Input id="q-client-phone" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(303) 555-0142" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q-client-address">Billing address</Label>
            <Input id="q-client-address" value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="1420 Grant St, Denver, CO 80203" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q-site-address">Job site address (if different)</Label>
            <Input id="q-site-address" value={siteAddress} onChange={e => setSiteAddress(e.target.value)} placeholder="Leave blank to use the project address" />
          </div>
        </section>

        {/* Cover fields */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Cover details
          </h2>
          <div className="space-y-1.5">
            <Label htmlFor="prop-title">Quote title</Label>
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
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prop-validity">Valid (days)</Label>
              <Input id="prop-validity" type="number" inputMode="numeric" value={validityDays} onChange={e => setValidityDays(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-markup">Markup %</Label>
              <Input id="prop-markup" type="number" inputMode="decimal" value={markup} onChange={e => setMarkup(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-tax">Tax %</Label>
              <Input id="prop-tax" type="number" inputMode="decimal" value={tax} onChange={e => setTax(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prop-terms">Payment terms summary</Label>
            <Input id="prop-terms" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="50% on acceptance, balance on completion" />
          </div>
        </section>

        {/* Payment schedule */}
        <PaymentScheduleEditor milestones={milestones} onChange={setMilestones} total={total} />

        {/* Scope & terms */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Scope clarifications & terms
            </h2>
            {!termsText.trim() && (
              <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[0.65rem]" onClick={() => setTermsText(DEFAULT_TERMS)}>
                Insert standard terms
              </Button>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q-scope">Inclusions / clarifications</Label>
            <Textarea id="q-scope" rows={3} value={scopeNotes} onChange={e => setScopeNotes(e.target.value)} placeholder="One item per line, e.g. Includes dust containment and daily cleanup." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q-excl">Exclusions</Label>
            <Textarea id="q-excl" rows={3} value={exclusions} onChange={e => setExclusions(e.target.value)} placeholder="One item per line, e.g. Excludes asbestos abatement, permit fees, finish painting." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q-terms">General terms</Label>
            <Textarea id="q-terms" rows={4} value={termsText} onChange={e => setTermsText(e.target.value)} placeholder="Contract terms printed on the quote." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q-deposit">Deposit / retainage note</Label>
            <Input id="q-deposit" value={depositNote} onChange={e => setDepositNote(e.target.value)} placeholder="Deposit due before mobilization; 10% retainage released at final walkthrough." />
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
              <span className="font-mono tabular-nums">{money(markupAmount)}</span>
            </div>
          )}
          {taxPct > 0 && (
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="opacity-80">Tax ({taxPct}%)</span>
              <span className="font-mono tabular-nums">{money(taxAmount)}</span>
            </div>
          )}
          <div className="mt-3 flex items-baseline justify-between border-t border-white/20 pt-3">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] opacity-80">Total quote</span>
            <span className="font-mono tabular-nums text-2xl font-semibold">{money(total)}</span>
          </div>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => navigate(`/project/${projectId}`)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || rows.length === 0} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {isEdit ? 'Save quote' : 'Create quote & download PDF'}
          </Button>
        </div>
      </div>
    </div>
  );
}

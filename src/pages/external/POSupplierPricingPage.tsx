import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';

const money = (n: number) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Item { id: string; line_number: number; sku: string | null; description: string; quantity: number; uom: string; notes: string | null; }
interface Row { price: string; unavailable: boolean; note: string; }

export default function POSupplierPricingPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [po, setPo] = useState<any>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [tax, setTax] = useState('');
  const [name, setName] = useState('');
  const [locked, setLocked] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error: e } = await supabase.functions.invoke('po-supplier-access', { body: { action: 'load', token } });
      if (e || !data || data.error) { setError(data?.error ?? 'This link is invalid or has expired.'); setLoading(false); return; }
      setPo(data.po); setItems(data.items); setLocked(data.locked); setSubmittedAt(data.submitted_at);
      setName(data.submitter_name ?? '');
      setTax(data.po.tax_percent ? String(Number(data.po.tax_percent)) : '');
      const r: Record<string, Row> = {};
      data.items.forEach((i: any) => { r[i.id] = { price: i.unit_price != null ? String(i.unit_price) : '', unavailable: !!i.is_unavailable, note: i.supplier_notes ?? '' }; });
      setRows(r); setLoading(false);
    })();
  }, [token]);

  const subtotal = useMemo(() => items.reduce((s, i) => {
    const r = rows[i.id]; if (!r || r.unavailable) return s;
    const p = parseFloat(r.price); return s + (isFinite(p) ? p * Number(i.quantity) : 0);
  }, 0), [items, rows]);
  const taxPct = parseFloat(tax) || 0;
  const taxNum = Math.round(subtotal * taxPct) / 100;

  const update = (id: string, patch: Partial<Row>) => setRows((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  const submit = async () => {
    setFormError(null);
    if (!name.trim()) return setFormError('Please enter your name.');
    const missing = items.find((i) => !rows[i.id].unavailable && !(parseFloat(rows[i.id].price) >= 0));
    if (taxPct > 25) return setFormError('Tax rate must be between 0% and 25%.');
    if (missing) return setFormError(`Enter a price for line ${missing.line_number} or mark it out of stock.`);
    setSaving(true);
    const { data, error: e } = await supabase.functions.invoke('po-supplier-access', {
      body: { action: 'submit', token, name, tax_percent: taxPct,
        items: items.map((i) => ({ id: i.id, unit_price: parseFloat(rows[i.id].price), unavailable: rows[i.id].unavailable, note: rows[i.id].note })) },
    });
    setSaving(false);
    if (e || data?.error) return setFormError(data?.error ?? 'Could not submit. Please try again.');
    setSubmittedAt(new Date().toISOString()); setJustSent(true);
  };

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error) return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="max-w-md text-center space-y-3"><AlertTriangle className="h-8 w-8 mx-auto text-destructive" /><p className="font-medium">{error}</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/40 pb-16">
      <header className="bg-[hsl(var(--navy))] text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <p className="text-xs uppercase tracking-widest opacity-70">Purchase order from {po.buyer}</p>
          <h1 className="font-heading text-2xl font-bold">{po.po_number} · {po.po_name}</h1>
          {po.project && <p className="text-sm opacity-80">Project: {po.project}</p>}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {locked ? (
          <div className="flex gap-2 items-start rounded-2xl border bg-card p-4 text-sm"><Lock className="h-4 w-4 mt-0.5 shrink-0" />The buyer has placed this order. Pricing is now final and can't be changed.</div>
        ) : submittedAt ? (
          <div className="flex gap-2 items-start rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span>{justSent ? 'Thanks — your pricing was sent to the buyer.' : `Pricing submitted ${new Date(submittedAt).toLocaleDateString()}.`} You can still make changes and resubmit until the buyer places the order.</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Enter your unit price for each item, add your sales tax rate, and mark anything out of stock. No account needed.</p>
        )}

        <div className="space-y-2">
          {items.map((i) => {
            const r = rows[i.id];
            const p = parseFloat(r.price);
            const line = r.unavailable ? 0 : (isFinite(p) ? p * Number(i.quantity) : 0);
            return (
              <div key={i.id} className={`rounded-2xl border bg-card p-4 ${r.unavailable ? 'opacity-70' : ''}`}>
                <div className="flex flex-wrap gap-3 justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Line {i.line_number}{i.sku ? ` · ${i.sku}` : ''}</p>
                    <p className={`font-medium break-words ${r.unavailable ? 'line-through' : ''}`}>{i.description}</p>
                    <p className="text-sm text-muted-foreground">Qty {Number(i.quantity)} {i.uom}</p>
                    {i.notes && <p className="text-xs italic text-muted-foreground mt-1">{i.notes}</p>}
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="w-32">
                      <Label className="text-xs">Unit price</Label>
                      <Input inputMode="decimal" value={r.price} disabled={locked || r.unavailable} placeholder="0.00"
                        onChange={(e) => update(i.id, { price: e.target.value.replace(/[^0-9.]/g, '') })} className="font-mono" />
                    </div>
                    <div className="w-28 text-right font-mono text-sm pb-2">{r.unavailable ? 'Out of stock' : money(line)}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={r.unavailable} disabled={locked} onCheckedChange={(v) => update(i.id, { unavailable: !!v })} />
                    Out of stock / unavailable
                  </label>
                  <Input value={r.note} disabled={locked} maxLength={500} placeholder="Note (lead time, substitute…)"
                    onChange={(e) => update(i.id, { note: e.target.value })} className="flex-1 min-w-[200px] h-8 text-sm" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-mono">{money(subtotal)}</span></div>
          <div className="flex justify-between items-center text-sm gap-3">
            <Label htmlFor="tax">Sales tax rate</Label>
            <div className="flex items-center gap-2">
              <Input id="tax" inputMode="decimal" value={tax} disabled={locked} placeholder="0.00"
                onChange={(e) => setTax(e.target.value.replace(/[^0-9.]/g, ''))} className="w-24 font-mono text-right" />
              <span className="text-muted-foreground">%</span>
            </div>
          </div>
          <div className="flex justify-between text-sm"><span>Tax</span><span className="font-mono">{money(taxNum)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-3"><span>Total</span><span className="font-mono">{money(subtotal + taxNum)}</span></div>
        </div>

        {!locked && (
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <div><Label htmlFor="nm">Your name</Label><Input id="nm" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} /></div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button className="w-full" size="lg" onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{submittedAt ? 'Resubmit pricing' : 'Submit pricing'}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

import { format } from 'date-fns';
import { FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PurchaseOrder, POLineItem } from '@/types/purchaseOrder';

interface Props {
  po: PurchaseOrder;
  lineItems: POLineItem[];
  showPricing: boolean;
}

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const date = (d?: string | null) => (d ? format(new Date(d), 'MMMM d, yyyy') : '—');

export function TypedPOSheet({ po, lineItems, showPricing }: Props) {
  const subtotal = lineItems.reduce((s, i) => s + (i.line_total || 0), 0);
  const taxPct = Number(po.tax_percent_applied ?? po.sales_tax_percent ?? 0);
  const tax = po.po_tax_total ?? subtotal * (taxPct / 100);
  const total = po.po_total ?? subtotal + tax;

  return (
    <div className="min-w-0 rounded-2xl bg-muted/40 p-2 sm:p-5 lg:p-8">
      <div className="no-print mx-auto mb-4 flex w-full max-w-[900px] flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><FileText size={15} />Print-ready supplier document · Actions stay available above</p>
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer />Print / Save PDF</Button>
      </div>

      <article className="field-report-print mx-auto w-full max-w-[900px] border border-border bg-card text-card-foreground shadow-lg" aria-label={`Typed purchase order ${po.po_number}`}>
        <header className="border-b-[3px] border-command px-5 py-6 sm:px-9 sm:py-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Ontime.build / Procurement</p>
              <h2 className="mt-3 font-heading text-4xl font-bold uppercase leading-none tracking-wide sm:text-5xl">Purchase Order</h2>
              <p className="mt-2 break-words text-sm text-muted-foreground">{po.po_name}</p>
            </div>
            <div className="max-w-full border-2 border-command px-4 py-2 text-center">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Order status</p>
              <p className="mt-1 break-words font-heading text-xl font-bold uppercase tracking-wide">{po.status.replace(/_/g, ' ')}</p>
            </div>
          </div>
        </header>

        <dl className="grid grid-cols-2 border-b border-border sm:grid-cols-4">
          <Field label="Order number" value={po.po_number} mono />
          <Field label="Order date" value={date(po.created_at)} />
          <Field label="Sent to supplier" value={date(po.sent_at)} />
          <Field label="Delivery" value={date(po.delivered_at ?? po.ready_for_delivery_at)} />
          <Field label="From" value={po.organization?.name || '—'} className="col-span-2" />
          <Field label="Supplier" value={po.supplier?.name || '—'} className="col-span-2" />
          <Field label="Project" value={po.project?.name || '—'} className="col-span-2" />
          <Field label="Work order" value={po.work_item?.title || '—'} className="col-span-2" />
        </dl>

        <section className="px-5 py-6 sm:px-9">
          <h3 className="mb-3 font-heading text-lg font-bold uppercase tracking-wide">01 · Line items</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-y-2 border-command text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="py-2 pr-2">#</th><th className="py-2 pr-2">Code</th><th className="py-2 pr-2">Description</th>
                  <th className="py-2 pr-2 text-right">Qty</th><th className="py-2 pr-2">Unit</th>
                  {showPricing && <><th className="py-2 pr-2 text-right">Unit price</th><th className="py-2 text-right">Amount</th></>}
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 && (
                  <tr><td colSpan={showPricing ? 7 : 5} className="py-4 text-muted-foreground">No line items on this order.</td></tr>
                )}
                {lineItems.map(i => (
                  <tr key={i.id} className="border-b border-border align-top">
                    <td className="py-2 pr-2 font-mono text-muted-foreground">{i.line_number}</td>
                    <td className="py-2 pr-2 font-mono text-xs">{i.supplier_sku || '—'}</td>
                    <td className="py-2 pr-2 break-words">{i.description}{i.notes && <span className="block text-xs text-muted-foreground">{i.notes}</span>}</td>
                    <td className="py-2 pr-2 text-right font-mono">{i.quantity}</td>
                    <td className="py-2 pr-2 font-mono text-xs uppercase">{i.uom}</td>
                    {showPricing && <>
                      <td className="py-2 pr-2 text-right font-mono">{i.unit_price != null ? money(i.unit_price) : '—'}</td>
                      <td className="py-2 text-right font-mono">{i.line_total != null ? money(i.line_total) : '—'}</td>
                    </>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showPricing && (
            <dl className="ml-auto mt-4 w-full max-w-xs space-y-1 font-mono text-sm">
              <Row label="Subtotal" value={money(subtotal)} />
              <Row label={`Sales tax${taxPct ? ` (${taxPct}%)` : ''}`} value={money(tax)} />
              <div className="flex justify-between border-t-2 border-command pt-2 font-bold"><dt>Total</dt><dd>{money(total)}</dd></div>
            </dl>
          )}
        </section>

        {po.notes && (
          <section className="border-t border-border px-5 py-5 sm:px-9">
            <h3 className="mb-2 font-heading text-lg font-bold uppercase tracking-wide">02 · Notes</h3>
            <p className="whitespace-pre-wrap break-words text-sm">{po.notes}</p>
          </section>
        )}

        <footer className="grid gap-6 border-t border-border px-5 py-8 sm:grid-cols-2 sm:px-9">
          {['Ordered by', 'Received by'].map(l => (
            <div key={l}>
              <div className="h-10 border-b border-foreground/60" />
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{l} · Signature / Date</p>
            </div>
          ))}
        </footer>
      </article>
    </div>
  );
}

function Field({ label, value, mono, className = '' }: { label: string; value: string; mono?: boolean; className?: string }) {
  return (
    <div className={`min-w-0 border-b border-r border-border px-4 py-3 sm:px-5 ${className}`}>
      <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className={`mt-1 break-words text-sm font-semibold ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><dt className="text-muted-foreground">{label}</dt><dd>{value}</dd></div>;
}

// Token-gated supplier pricing for purchase orders. No sign-in required.
// The supplier can enter unit prices, tax and mark items unavailable, and
// resubmit until the buyer places the order.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { queueEmail, renderEmail, serviceClient, escapeHtml, fmtMoney } from '../_shared/coEmail.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const LOCKED = new Set(['ORDERED', 'READY_FOR_DELIVERY', 'DELIVERED', 'FINALIZED']);
const round2 = (n: number) => Math.round(n * 100) / 100;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid request' }, 400); }
  const { action, token } = body ?? {};
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return json({ error: 'This link is invalid.' }, 404);

  const svc = serviceClient();
  const { data: link } = await svc.from('po_supplier_links').select('*').eq('token', token).maybeSingle();
  if (!link) return json({ error: 'This link is invalid or has expired.' }, 404);
  if (new Date(link.expires_at) < new Date()) return json({ error: 'This link has expired. Ask the buyer to send a new one.' }, 410);

  const { data: po } = await svc
    .from('purchase_orders')
    .select('id, po_number, po_name, status, notes, created_at, sales_tax_percent, po_subtotal_total, po_tax_total, po_total, project_id, organization:organizations!purchase_orders_organization_id_fkey(name), project:projects(name), supplier:suppliers(name)')
    .eq('id', link.po_id)
    .maybeSingle();
  if (!po) return json({ error: 'Purchase order not found.' }, 404);

  const { data: items } = await svc
    .from('po_line_items')
    .select('id, line_number, supplier_sku, description, quantity, uom, unit_price, line_total, notes, supplier_notes, is_unavailable, original_unit_price')
    .eq('po_id', po.id)
    .order('line_number');
  const locked = LOCKED.has(po.status);

  if (action === 'load') {
    return json({
      po: {
        po_number: po.po_number, po_name: po.po_name, status: po.status, notes: po.notes, created_at: po.created_at,
        buyer: (po.organization as any)?.name ?? '', project: (po.project as any)?.name ?? '', supplier: (po.supplier as any)?.name ?? '',
        subtotal: po.po_subtotal_total, tax: po.po_tax_total, tax_percent: po.sales_tax_percent, total: po.po_total,
      },
      items: (items || []).map((i: any) => ({
        id: i.id, line_number: i.line_number, sku: i.supplier_sku, description: i.description, quantity: i.quantity, uom: i.uom,
        unit_price: i.unit_price, notes: i.notes, supplier_notes: i.supplier_notes, is_unavailable: i.is_unavailable,
      })),
      locked, submitted_at: link.submitted_at, submitter_name: link.submitter_name,
    });
  }

  if (action !== 'submit') return json({ error: 'Unknown action' }, 400);
  if (locked) return json({ error: 'The buyer has already placed this order, so pricing can no longer change.' }, 409);

  const name = String(body.name ?? '').trim().slice(0, 120);
  if (!name) return json({ error: 'Please enter your name.' }, 400);
  const taxPct = Number(body.tax_percent ?? 0);
  if (!Number.isFinite(taxPct) || taxPct < 0 || taxPct > 25) return json({ error: 'Tax rate must be between 0% and 25%.' }, 400);
  const input = Array.isArray(body.items) ? body.items : [];
  const byId = new Map<string, any>(input.map((x: any) => [String(x?.id), x]));

  let subtotal = 0;
  for (const it of items || []) {
    const x = byId.get(it.id);
    if (!x) return json({ error: `Line ${it.line_number} is missing.` }, 400);
    const unavailable = !!x.unavailable;
    const price = unavailable ? null : Number(x.unit_price);
    if (!unavailable && (!Number.isFinite(price) || price! < 0 || price! > 1_000_000)) {
      return json({ error: `Enter a price for line ${it.line_number} or mark it unavailable.` }, 400);
    }
    const lineTotal = unavailable ? 0 : round2(price! * Number(it.quantity || 0));
    subtotal += lineTotal;
    const orig = it.original_unit_price ?? it.unit_price;
    const { error } = await svc.from('po_line_items').update({
      unit_price: price,
      line_total: lineTotal,
      is_unavailable: unavailable,
      supplier_notes: String(x.note ?? '').trim().slice(0, 500) || null,
      original_unit_price: orig,
      price_adjusted_by_supplier: orig != null && price != null && Number(orig) !== price,
      price_source: 'SUPPLIER_LINK',
    }).eq('id', it.id);
    if (error) return json({ error: error.message }, 500);
  }
  subtotal = round2(subtotal);
  const pct = Math.round(taxPct * 1000) / 1000;
  const tax = round2(subtotal * pct / 100);
  const total = round2(subtotal + tax);
  const now = new Date().toISOString();

  const { error: poErr } = await svc.from('purchase_orders').update({
    po_subtotal_total: subtotal, po_tax_total: tax, po_total: total, sales_tax_percent: pct, tax_percent_applied: pct,
    status: 'PRICED', priced_at: now,
  }).eq('id', po.id);
  if (poErr) return json({ error: poErr.message }, 500);

  await svc.from('po_supplier_links').update({
    submitted_at: now, submitted_count: (link.submitted_count ?? 0) + 1, submitter_name: name,
  }).eq('id', link.id);

  // Notify the buyer who sent the link.
  try {
    const { data: u } = await svc.auth.admin.getUserById(link.created_by);
    const to = u?.user?.email;
    if (to) {
      const unavailableCount = (input as any[]).filter((x) => x?.unavailable).length;
      const url = `https://ontime.build/project/${po.project_id}/purchase-orders?tab=purchase-orders&po=${po.id}`;
      const again = (link.submitted_count ?? 0) > 0;
      const html = renderEmail({
        heading: `${again ? 'Updated pricing' : 'Pricing received'} for ${po.po_number}`,
        intro: `${escapeHtml(name)} (${escapeHtml(link.email)}) ${again ? 'updated' : 'submitted'} pricing for ${escapeHtml(po.po_name)}.`,
        rows: [
          ['Subtotal', fmtMoney(subtotal)], [`Tax (${pct}%)`, fmtMoney(tax)], ['Total', fmtMoney(total)],
          ['Unavailable items', unavailableCount ? String(unavailableCount) : ''],
        ],
        ctaLabel: 'Review purchase order', ctaUrl: url, status: unavailableCount ? 'warning' : 'success',
      });
      await queueEmail(svc, {
        to, subject: `${again ? 'Updated pricing' : 'Pricing received'}: ${po.po_number} — ${po.po_name}`, html,
        text: `${name} submitted pricing for ${po.po_number}. Total ${fmtMoney(total)}. ${url}`, label: 'po_supplier_priced',
      });
    }
  } catch (e) { console.error('buyer notify failed', (e as Error).message); }

  return json({ ok: true, subtotal, tax, total });
});

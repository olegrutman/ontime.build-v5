// Builds a branded PDF of one invoice, stores it privately, and returns a
// long-lived signed download link that the submission email can carry.
// The mail transport does not support file attachments, so the email links here.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Anyone holding the link can open the document for two weeks.
const LINK_TTL_SECONDS = 60 * 60 * 24 * 14;

const NAVY: [number, number, number] = [15, 23, 42];
const ORANGE: [number, number, number] = [249, 115, 22];
const GREY: [number, number, number] = [100, 116, 139];

const num = (v: unknown) => Number(v ?? 0) || 0;
const money = (v: unknown) =>
  `$${num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (v: unknown) =>
  v ? new Date(String(v)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const invoiceId: string | undefined = body.invoice_id;
    if (!invoiceId) return json({ error: 'invoice_id required' }, 400);

    // Access check runs through the caller's own RLS view of the invoice.
    const asUser = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { data: visible } = await asUser.from('invoices').select('id').eq('id', invoiceId).maybeSingle();
    if (!visible) return json({ error: 'Invoice not found' }, 404);

    const svc = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: invoice, error: invErr } = await svc
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .maybeSingle();
    if (invErr || !invoice) return json({ error: 'Invoice not found' }, 404);

    const [{ data: lines }, { data: project }] = await Promise.all([
      svc
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('sort_order', { ascending: true }),
      svc.from('projects').select('name, address, city, state').eq('id', invoice.project_id).maybeSingle(),
    ]);

    let fromName = '';
    let toName = '';
    if (invoice.contract_id) {
      const { data: contract } = await svc
        .from('project_contracts')
        .select('from_org_id, to_org_id')
        .eq('id', invoice.contract_id)
        .maybeSingle();
      if (contract) {
        const ids = [contract.from_org_id, contract.to_org_id].filter(Boolean) as string[];
        const { data: orgs } = await svc.from('organizations').select('id, name').in('id', ids);
        const nameOf = (id: string | null) => orgs?.find((o: any) => o.id === id)?.name ?? '';
        fromName = nameOf(contract.from_org_id);
        toName = nameOf(contract.to_org_id);
      }
    }

    // ---------- Document ----------
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();
    const M = 40;
    let y = 0;

    // Header band
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 86, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold').setFontSize(16);
    doc.text('Ontime.Build', M, 34);
    doc.setFillColor(...ORANGE);
    doc.rect(M, 44, 44, 2.5, 'F');
    doc.setFontSize(19);
    doc.text('INVOICE', W - M, 34, { align: 'right' });
    doc.setFont('helvetica', 'normal').setFontSize(11);
    doc.text(String(invoice.invoice_number ?? ''), W - M, 54, { align: 'right' });
    y = 110;

    const label = (text: string, x: number, yy: number) => {
      doc.setTextColor(...GREY).setFont('helvetica', 'bold').setFontSize(7.5);
      doc.text(text.toUpperCase(), x, yy);
    };
    const value = (text: string, x: number, yy: number, size = 10.5) => {
      doc.setTextColor(...NAVY).setFont('helvetica', 'normal').setFontSize(size);
      doc.text(text || '—', x, yy);
    };

    const col2 = W / 2 + 10;
    label('From', M, y);
    label('Billed to', col2, y);
    value(fromName, M, y + 15);
    value(toName, col2, y + 15);
    y += 40;

    label('Project', M, y);
    label('Billing period', col2, y);
    value(project?.name ?? '', M, y + 15);
    value(`${day(invoice.billing_period_start)} – ${day(invoice.billing_period_end)}`, col2, y + 15);
    y += 40;

    label('Status', M, y);
    label(invoice.submitted_at ? 'Submitted' : 'Created', col2, y);
    value(String(invoice.status ?? ''), M, y + 15);
    value(day(invoice.submitted_at ?? invoice.created_at), col2, y + 15);
    y += 44;

    // Line item table
    const cols = [M, M + 232, M + 320, M + 404, W - M];
    doc.setFillColor(241, 245, 249);
    doc.rect(M, y, W - M * 2, 20, 'F');
    doc.setTextColor(...GREY).setFont('helvetica', 'bold').setFontSize(7.5);
    doc.text('DESCRIPTION', cols[0] + 6, y + 13);
    doc.text('SCHEDULED', cols[1], y + 13, { align: 'left' });
    doc.text('PREVIOUS', cols[2], y + 13, { align: 'left' });
    doc.text('THIS INVOICE', cols[3], y + 13, { align: 'left' });
    y += 30;

    doc.setFont('helvetica', 'normal').setFontSize(9.5);
    for (const li of lines ?? []) {
      if (y > 700) {
        doc.addPage();
        y = 60;
      }
      const text = doc.splitTextToSize(String(li.description ?? ''), 210) as string[];
      doc.setTextColor(...NAVY);
      doc.text(text.slice(0, 3), cols[0] + 6, y);
      doc.text(money(li.scheduled_value), cols[1], y);
      doc.text(money(li.previous_billed), cols[2], y);
      doc.setFont('helvetica', 'bold');
      doc.text(money(li.current_billed), cols[3], y);
      doc.setFont('helvetica', 'normal');
      y += Math.max(16, text.slice(0, 3).length * 12) + 4;
      doc.setDrawColor(226, 232, 240);
      doc.line(M, y - 8, W - M, y - 8);
    }

    // Totals
    y += 14;
    if (y > 660) {
      doc.addPage();
      y = 60;
    }
    const totalRow = (text: string, amount: unknown, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(bold ? 12 : 10);
      doc.setTextColor(...(bold ? NAVY : GREY));
      doc.text(text, W - M - 200, y);
      doc.setTextColor(...NAVY);
      doc.text(money(amount), W - M, y, { align: 'right' });
      y += bold ? 22 : 17;
    };
    totalRow('Subtotal', invoice.subtotal);
    if (num(invoice.retainage_amount) > 0) totalRow('Retainage held', -num(invoice.retainage_amount));
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(1.2);
    doc.line(W - M - 200, y - 8, W - M, y - 8);
    doc.setLineWidth(0.4);
    y += 8;
    totalRow('Amount due', invoice.total_amount, true);

    if (invoice.notes) {
      y += 10;
      label('Notes', M, y);
      doc.setTextColor(...NAVY).setFont('helvetica', 'normal').setFontSize(9.5);
      doc.text(doc.splitTextToSize(String(invoice.notes), W - M * 2) as string[], M, y + 15);
    }

    const bytes = new Uint8Array(doc.output('arraybuffer'));

    const path = `${invoice.project_id}/${invoiceId}-${Date.now()}.pdf`;
    const { error: upErr } = await svc.storage
      .from('invoice-documents')
      .upload(path, bytes, { contentType: 'application/pdf', upsert: true });
    if (upErr) throw upErr;

    const { data: signed, error: signErr } = await svc.storage
      .from('invoice-documents')
      .createSignedUrl(path, LINK_TTL_SECONDS, {
        download: `${invoice.invoice_number ?? 'invoice'}.pdf`,
      });
    if (signErr || !signed?.signedUrl) throw signErr ?? new Error('Could not create download link');

    await svc
      .from('invoices')
      .update({ invoice_pdf_url: signed.signedUrl, invoice_pdf_generated_at: new Date().toISOString() })
      .eq('id', invoiceId);

    return json({ url: signed.signedUrl });
  } catch (err) {
    console.error('generate-invoice-pdf failed', err);
    return json({ error: err instanceof Error ? err.message : 'unknown' }, 500);
  }
});

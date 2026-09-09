// Emails a purchase order to one or more recipients as downloadable
// CSV + PDF documents. The mail transport does not support file attachments,
// so the files are stored privately and shared as time-limited secure links.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.2';
import { queueEmail, renderEmail, serviceClient, escapeHtml, fmtMoney } from '../_shared/coEmail.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINK_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const csvRow = (cells: unknown[]) => cells.map(csvCell).join(',');
const money2 = (n: number | null | undefined) =>
  n === null || n === undefined ? '' : Number(n).toFixed(2);

function safeName(po: any, ext: string) {
  const base = `${po.po_number}-${po.po_name}`.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80);
  return `${base}.${ext}`;
}

function buildCsv(po: any, items: any[], includePrices: boolean) {
  const lines: string[] = [];
  lines.push(csvRow(['Purchase Order', po.po_number]));
  lines.push(csvRow(['Name', po.po_name]));
  lines.push(csvRow(['Status', po.status]));
  lines.push(csvRow(['Project', po.project?.name ?? '']));
  lines.push(csvRow(['Supplier', po.supplier?.name ?? '']));
  lines.push(csvRow(['Buyer', po.organization?.name ?? '']));
  lines.push(csvRow(['Created', po.created_at ? String(po.created_at).slice(0, 10) : '']));
  if (po.notes) lines.push(csvRow(['Notes', po.notes]));
  lines.push('');

  const header = ['Line', 'SKU', 'Description', 'Quantity', 'UOM'];
  if (includePrices) header.push('Unit Price', 'Line Total');
  lines.push(csvRow(header));

  let subtotal = 0;
  items.forEach((item, idx) => {
    const cells: unknown[] = [
      item.line_number ?? idx + 1,
      item.supplier_sku ?? '',
      item.description ?? '',
      item.quantity ?? 0,
      item.uom ?? '',
    ];
    if (includePrices) {
      const lineTotal = item.line_total ?? Number(item.unit_price || 0) * Number(item.quantity || 0);
      subtotal += Number(lineTotal || 0);
      cells.push(money2(item.unit_price), money2(lineTotal));
    }
    lines.push(csvRow(cells));
  });

  const taxPercent = Number(po.sales_tax_percent || 0);
  const tax = po.po_tax_total ?? Math.round(subtotal * taxPercent) / 100;
  const total = po.po_total ?? subtotal + Number(tax || 0);

  if (includePrices) {
    const pad = ['', '', '', '', ''];
    lines.push('');
    lines.push(csvRow([...pad, 'Subtotal', money2(subtotal)]));
    lines.push(csvRow([...pad, `Sales tax (${taxPercent}%)`, money2(tax)]));
    lines.push(csvRow([...pad, 'Total', money2(total)]));
  }

  return { csv: lines.join('\r\n'), subtotal, tax: Number(tax || 0), total: Number(total || 0) };
}

function buildPdf(
  po: any,
  items: any[],
  includePrices: boolean,
  totals: { subtotal: number; tax: number; total: number },
): Uint8Array {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 40;
  const right = pageWidth - 40;

  // Masthead
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 68, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PURCHASE ORDER', left, 30);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(String(po.po_number ?? ''), left, 48);
  doc.setTextColor(249, 115, 22);
  doc.setFont('helvetica', 'bold');
  doc.text('ONTIME.BUILD', right, 30, { align: 'right' });
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.text(String(po.status ?? ''), right, 48, { align: 'right' });

  let y = 100;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(String(po.po_name ?? ''), left, y);
  y += 22;

  doc.setFontSize(9);
  const meta: Array<[string, string]> = [
    ['Project', po.project?.name ?? '—'],
    ['Supplier', po.supplier?.name ?? '—'],
    ['Buyer', po.organization?.name ?? '—'],
    ['Created', po.created_at ? String(po.created_at).slice(0, 10) : '—'],
  ];
  meta.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), left, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(value), left + 90, y);
    y += 15;
  });

  y += 12;

  // Table header
  const cols = includePrices
    ? [left, left + 30, left + 110, right - 190, right - 130, right - 60]
    : [left, left + 30, left + 130, right - 120, right - 50];

  const drawHeader = () => {
    doc.setFillColor(241, 245, 249);
    doc.rect(left, y - 12, right - left, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('#', cols[0] + 4, y);
    doc.text('SKU', cols[1], y);
    doc.text('DESCRIPTION', cols[2], y);
    if (includePrices) {
      doc.text('QTY', cols[3], y, { align: 'right' });
      doc.text('UNIT', cols[4], y, { align: 'right' });
      doc.text('TOTAL', cols[5] + 60, y, { align: 'right' });
    } else {
      doc.text('QTY', cols[3], y, { align: 'right' });
      doc.text('UOM', cols[4], y);
    }
    y += 18;
  };
  drawHeader();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);

  const descWidth = (includePrices ? right - 190 : right - 120) - (cols[2] + 4);
  items.forEach((item, idx) => {
    const descLines: string[] = doc.splitTextToSize(String(item.description ?? ''), descWidth);
    const rowHeight = Math.max(14, descLines.length * 11);
    if (y + rowHeight > pageHeight - 60) {
      doc.addPage();
      y = 60;
      drawHeader();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
    }
    doc.text(String(item.line_number ?? idx + 1), cols[0] + 4, y);
    doc.text(String(item.supplier_sku ?? '—').slice(0, 16), cols[1], y);
    descLines.forEach((line, i) => doc.text(line, cols[2] + 4, y + i * 11));
    const qty = `${Number(item.quantity || 0)} ${item.uom ?? ''}`.trim();
    if (includePrices) {
      doc.text(qty, cols[3], y, { align: 'right' });
      doc.text(money2(item.unit_price), cols[4], y, { align: 'right' });
      const lineTotal = item.line_total ?? Number(item.unit_price || 0) * Number(item.quantity || 0);
      doc.text(money2(lineTotal), cols[5] + 60, y, { align: 'right' });
    } else {
      doc.text(String(Number(item.quantity || 0)), cols[3], y, { align: 'right' });
      doc.text(String(item.uom ?? ''), cols[4], y);
    }
    y += rowHeight;
    doc.setDrawColor(226, 232, 240);
    doc.line(left, y - 4, right, y - 4);
  });

  if (includePrices) {
    y += 16;
    const label = right - 150;
    const rows: Array<[string, string]> = [
      ['Subtotal', money2(totals.subtotal)],
      [`Sales tax (${Number(po.sales_tax_percent || 0)}%)`, money2(totals.tax)],
      ['Total', money2(totals.total)],
    ];
    rows.forEach(([l, v], i) => {
      const bold = i === rows.length - 1;
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(bold ? 11 : 9);
      doc.text(l, label, y);
      doc.text(`$${v}`, right, y, { align: 'right' });
      y += bold ? 18 : 14;
    });
  }

  if (po.notes) {
    y += 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('NOTES', left, y);
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.splitTextToSize(String(po.notes), right - left).forEach((line: string) => {
      doc.text(line, left, y);
      y += 11;
    });
  }

  return new Uint8Array(doc.output('arraybuffer'));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const poId: string | undefined = body.po_id;
    const rawRecipients: unknown = body.recipients;
    const note: string = typeof body.message === 'string' ? body.message.slice(0, 1000) : '';

    if (!poId || typeof poId !== 'string') return json({ error: 'po_id is required' }, 400);

    const recipients = Array.isArray(rawRecipients)
      ? Array.from(new Set(rawRecipients.map((r) => String(r).trim().toLowerCase()).filter(Boolean)))
      : [];
    if (recipients.length === 0) return json({ error: 'At least one recipient is required' }, 400);
    if (recipients.length > 5) return json({ error: 'Up to 5 recipients per send' }, 400);
    const invalid = recipients.filter((r) => !EMAIL_RE.test(r));
    if (invalid.length > 0) return json({ error: `Invalid email: ${invalid[0]}` }, 400);

    // Access check runs through the caller's own permissions (RLS).
    const { data: po, error: poError } = await userClient
      .from('purchase_orders')
      .select(`
        id, po_number, po_name, status, notes, created_at, sales_tax_percent,
        po_total, po_tax_total, organization_id, created_by_org_id, pricing_owner_org_id,
        organization:organizations!purchase_orders_organization_id_fkey(name),
        supplier:suppliers(id, name, organization_id),
        project:projects(id, name)
      `)
      .eq('id', poId)
      .maybeSingle();

    if (poError) return json({ error: poError.message }, 400);
    if (!po) return json({ error: 'Purchase order not found' }, 404);

    const svc = serviceClient();

    // Pricing visibility mirrors the on-screen rules.
    const { data: roles } = await svc
      .from('user_org_roles')
      .select('organization_id')
      .eq('user_id', user.id);
    const orgIds = new Set((roles || []).map((r: any) => r.organization_id));
    const includePrices =
      orgIds.has(po.pricing_owner_org_id) ||
      orgIds.has(po.created_by_org_id) ||
      orgIds.has(po.organization_id) ||
      orgIds.has((po.supplier as any)?.organization_id);

    const { data: items } = await userClient
      .from('po_line_items')
      .select('line_number, supplier_sku, description, quantity, uom, unit_price, line_total')
      .eq('po_id', poId)
      .order('line_number');
    const lineItems = items || [];

    const { csv, subtotal, tax, total } = buildCsv(po, lineItems, includePrices);
    const pdf = buildPdf(po, lineItems, includePrices, { subtotal, tax, total });

    const folder = `${poId}/${crypto.randomUUID()}`;
    const csvPath = `${folder}/${safeName(po, 'csv')}`;
    const pdfPath = `${folder}/${safeName(po, 'pdf')}`;

    const csvUpload = await svc.storage
      .from('po-documents')
      .upload(csvPath, new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }), {
        contentType: 'text/csv;charset=utf-8',
        upsert: true,
      });
    if (csvUpload.error) return json({ error: csvUpload.error.message }, 500);

    const pdfUpload = await svc.storage
      .from('po-documents')
      .upload(pdfPath, pdf, { contentType: 'application/pdf', upsert: true });
    if (pdfUpload.error) return json({ error: pdfUpload.error.message }, 500);

    const [csvSigned, pdfSigned] = await Promise.all([
      svc.storage.from('po-documents').createSignedUrl(csvPath, LINK_TTL_SECONDS, {
        download: safeName(po, 'csv'),
      }),
      svc.storage.from('po-documents').createSignedUrl(pdfPath, LINK_TTL_SECONDS, {
        download: safeName(po, 'pdf'),
      }),
    ]);
    if (csvSigned.error || pdfSigned.error) {
      return json({ error: csvSigned.error?.message || pdfSigned.error?.message }, 500);
    }

    const rows: Array<[string, string]> = [
      ['Purchase order', String(po.po_number ?? '')],
      ['Project', (po.project as any)?.name ?? ''],
      ['Supplier', (po.supplier as any)?.name ?? ''],
      ['Line items', String(lineItems.length)],
    ];
    if (includePrices) rows.push(['Total', fmtMoney(total)]);

    const extraHtml = `
      <p style="margin:16px 0 8px;font-size:13px;color:#0f172a;">Documents (links expire in 14 days):</p>
      <p style="margin:0 0 6px;font-size:13px;">
        <a href="${escapeHtml(pdfSigned.data!.signedUrl)}" style="color:#f97316;font-weight:600;">Download PDF</a>
      </p>
      <p style="margin:0;font-size:13px;">
        <a href="${escapeHtml(csvSigned.data!.signedUrl)}" style="color:#f97316;font-weight:600;">Download spreadsheet (CSV)</a>
      </p>`;

    const intro = note
      ? escapeHtml(note)
      : `${escapeHtml((po.organization as any)?.name ?? 'Ontime.Build')} shared purchase order ${escapeHtml(po.po_number)} with you.`;

    const html = renderEmail({
      heading: `Purchase order ${po.po_number}`,
      intro,
      rows,
      ctaLabel: 'Download PDF',
      ctaUrl: pdfSigned.data!.signedUrl,
      footnote: 'The spreadsheet version is linked below the summary.',
      status: 'info',
    }).replace('</body>', `${extraHtml}</body>`);

    const text = [
      `Purchase order ${po.po_number} — ${po.po_name}`,
      note,
      `PDF: ${pdfSigned.data!.signedUrl}`,
      `CSV: ${csvSigned.data!.signedUrl}`,
      'Links expire in 14 days.',
    ]
      .filter(Boolean)
      .join('\n\n');

    const failed: string[] = [];
    for (const to of recipients) {
      try {
        await queueEmail(svc, {
          to,
          subject: `Purchase order ${po.po_number} — ${po.po_name}`,
          html,
          text,
          label: 'po_documents',
        });
      } catch (e) {
        console.error('queueEmail failed', to, (e as Error).message);
        failed.push(to);
      }
    }

    return json({
      sent: recipients.filter((r) => !failed.includes(r)),
      failed,
      included_prices: includePrices,
      pdf_url: pdfSigned.data!.signedUrl,
      csv_url: csvSigned.data!.signedUrl,
    });
  } catch (err) {
    console.error('send-po-documents error', err);
    return json({ error: (err as Error).message }, 500);
  }
});

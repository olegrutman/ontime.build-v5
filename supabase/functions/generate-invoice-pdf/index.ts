// Builds the sender's company-branded invoice, stores it privately, and returns
// a 14-day signed link. Email attachments are not supported, so alerts link here.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LINK_TTL_SECONDS = 60 * 60 * 24 * 14;

const NAVY: [number, number, number] = [30, 58, 95];
const TEAL: [number, number, number] = [13, 148, 136];
const INK: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];
const BORDER: [number, number, number] = [226, 232, 240];
const PANEL: [number, number, number] = [248, 250, 252];

const num = (value: unknown) => Number(value ?? 0) || 0;
const money = (value: unknown) =>
  `$${num(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (value: unknown) =>
  value ? new Date(String(value)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const safeText = (value: unknown, fallback = '—') => String(value ?? '').trim() || fallback;

type Address = { street?: string; line1?: string; city?: string; state?: string; zip?: string } | string | null;
type Organization = { id: string; name: string; address: Address; phone: string | null; logo_url: string | null };

function addressLine(address: Address): string {
  if (!address) return '';
  if (typeof address === 'string') return address;
  const street = address.street ?? address.line1;
  const locality = [address.city, address.state, address.zip].filter(Boolean).join(', ').replace(/, ([0-9]{5})$/, ' $1');
  return [street, locality].filter(Boolean).join(' · ');
}

async function fetchLogo(url: string | null): Promise<{ bytes: Uint8Array; format: 'PNG' | 'JPEG' } | null> {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    const format = contentType.includes('png') ? 'PNG' : contentType.includes('jpeg') || contentType.includes('jpg') ? 'JPEG' : null;
    if (!format) return null;
    return { bytes: new Uint8Array(await response.arrayBuffer()), format };
  } catch (error) {
    console.warn('Invoice logo could not be loaded', error);
    return null;
  }
}

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
    const invoiceId = typeof body.invoice_id === 'string' ? body.invoice_id : '';
    const submitting = body.submitting === true;
    if (!invoiceId) return json({ error: 'invoice_id required' }, 400);

    const asUser = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { data: visible } = await asUser.from('invoices').select('id').eq('id', invoiceId).maybeSingle();
    if (!visible) return json({ error: 'Invoice not found' }, 404);

    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: invoice, error: invoiceError } = await svc.from('invoices').select('*').eq('id', invoiceId).maybeSingle();
    if (invoiceError || !invoice) return json({ error: 'Invoice not found' }, 404);

    const [{ data: lines = [] }, { data: project }] = await Promise.all([
      svc.from('invoice_line_items').select('*').eq('invoice_id', invoiceId).order('sort_order'),
      svc.from('projects').select('name, address, city, state, zip').eq('id', invoice.project_id).maybeSingle(),
    ]);

    let senderId: string | null = null;
    let recipientId: string | null = null;
    if (invoice.contract_id) {
      const { data: contract } = await svc
        .from('project_contracts')
        .select('from_org_id, to_org_id')
        .eq('id', invoice.contract_id)
        .maybeSingle();
      senderId = contract?.from_org_id ?? null;
      recipientId = contract?.to_org_id ?? null;
    } else if (invoice.po_id) {
      const { data: po } = await svc
        .from('purchase_orders')
        .select('pricing_owner_org_id, supplier:suppliers!purchase_orders_supplier_id_fkey(organization_id)')
        .eq('id', invoice.po_id)
        .maybeSingle();
      senderId = (po?.supplier as { organization_id?: string } | null)?.organization_id ?? null;
      recipientId = po?.pricing_owner_org_id ?? null;
    }

    const orgIds = [senderId, recipientId].filter((id): id is string => Boolean(id));
    const { data: orgs = [] } = orgIds.length
      ? await svc.from('organizations').select('id, name, address, phone, logo_url').in('id', orgIds)
      : { data: [] as Organization[] };
    const organization = (id: string | null) => (orgs as Organization[]).find((org) => org.id === id) ?? null;
    const sender = organization(senderId);
    const recipient = organization(recipientId);
    const logo = await fetchLogo(sender?.logo_url ?? null);

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const margin = 38;
    const right = width - margin;
    const contentWidth = width - margin * 2;
    let y = 30;

    const drawHeader = (continuation = false) => {
      y = 30;
      if (!continuation && logo) {
        try {
          const props = doc.getImageProperties(logo.bytes);
          const maxW = 42;
          const maxH = 28;
          const ratio = Math.min(maxW / props.width, maxH / props.height);
          doc.addImage(logo.bytes, logo.format, margin, y - 4, props.width * ratio, props.height * ratio);
        } catch (error) {
          console.warn('Invoice logo could not be rendered', error);
        }
      }
      const senderX = !continuation && logo ? margin + 50 : margin;
      doc.setTextColor(...NAVY).setFont('helvetica', 'bold').setFontSize(continuation ? 9 : 12);
      doc.text(continuation ? `${safeText(sender?.name)} · INVOICE CONTINUED` : safeText(sender?.name, 'Company'), senderX, y + 4);
      if (!continuation) {
        const senderAddress = addressLine(sender?.address ?? null);
        doc.setTextColor(...MUTED).setFont('helvetica', 'normal').setFontSize(6.5);
        if (senderAddress) doc.text(senderAddress, senderX, y + 15);
        if (sender?.phone) doc.text(sender.phone, senderX, y + 25);
        doc.setTextColor(...NAVY).setFont('helvetica', 'bold').setFontSize(17);
        doc.text('INVOICE', right, y + 2, { align: 'right' });
        doc.setFont('courier', 'bold').setFontSize(9);
        doc.text(safeText(invoice.invoice_number), right, y + 17, { align: 'right' });
        doc.setFillColor(...TEAL);
        doc.roundedRect(right - 34, y + 23, 34, 11, 2, 2, 'F');
        doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(5.5);
        doc.text(submitting ? 'SUBMITTED' : safeText(invoice.status).toUpperCase(), right - 17, y + 30.5, { align: 'center' });
        doc.setTextColor(...MUTED).setFont('helvetica', 'normal').setFontSize(6.5);
        doc.text(`${submitting || invoice.submitted_at ? 'Submitted' : 'Created'}: ${day(submitting ? new Date().toISOString() : invoice.submitted_at ?? invoice.created_at)}`, right, y + 44, { align: 'right' });
      }
      y = continuation ? 52 : 78;
      doc.setDrawColor(...NAVY).setLineWidth(1.3);
      doc.line(margin, y, right, y);
      y += 12;
    };

    const panel = (x: number, top: number, panelWidth: number, title: string, primary: string, secondary = '') => {
      doc.setFillColor(...PANEL).setDrawColor(...BORDER).setLineWidth(0.5);
      doc.roundedRect(x, top, panelWidth, 49, 3, 3, 'FD');
      doc.setTextColor(...MUTED).setFont('helvetica', 'bold').setFontSize(6);
      doc.text(title.toUpperCase(), x + 9, top + 12);
      doc.setTextColor(...INK).setFont('helvetica', 'bold').setFontSize(8);
      doc.text(safeText(primary), x + 9, top + 27, { maxWidth: panelWidth - 18 });
      if (secondary) {
        doc.setTextColor(...MUTED).setFont('helvetica', 'normal').setFontSize(6.5);
        doc.text(secondary, x + 9, top + 39, { maxWidth: panelWidth - 18 });
      }
    };

    const projectAddress = addressLine(project?.address ?? null) ||
      [typeof project?.address === 'string' ? project.address : '', project?.city, project?.state, project?.zip].filter(Boolean).join(', ');
    drawHeader();
    const gap = 10;
    const panelWidth = (contentWidth - gap) / 2;
    panel(margin, y, panelWidth, 'Project details', safeText(project?.name), projectAddress);
    panel(margin + panelWidth + gap, y, panelWidth, 'Billing period', `${day(invoice.billing_period_start)} – ${day(invoice.billing_period_end)}`, `Invoice ${safeText(invoice.invoice_number)}`);
    y += 58;
    panel(margin, y, panelWidth, 'From', safeText(sender?.name), addressLine(sender?.address ?? null));
    panel(margin + panelWidth + gap, y, panelWidth, 'To', safeText(recipient?.name), addressLine(recipient?.address ?? null));
    y += 63;

    const columns = {
      number: margin + 5,
      description: margin + 20,
      scheduled: margin + 260,
      previous: margin + 331,
      current: margin + 397,
      total: margin + 458,
      remaining: margin + 516,
      percent: right - 2,
    };

    const drawTableHeader = () => {
      doc.setFillColor(...PANEL).setDrawColor(...BORDER);
      doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'FD');
      doc.setTextColor(...MUTED).setFont('helvetica', 'bold').setFontSize(5.4);
      doc.text('#', columns.number, y + 15);
      doc.text('DESCRIPTION', columns.description, y + 15);
      doc.text('SCHEDULED', columns.scheduled, y + 15, { align: 'right' });
      doc.text('PREVIOUS', columns.previous, y + 15, { align: 'right' });
      doc.text('THIS PERIOD', columns.current, y + 15, { align: 'right' });
      doc.text('TOTAL BILLED', columns.total, y + 15, { align: 'right' });
      doc.text('REMAINING', columns.remaining, y + 15, { align: 'right' });
      doc.text('%', columns.percent, y + 15, { align: 'right' });
      y += 31;
    };

    drawTableHeader();
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const descriptionLines = (doc.splitTextToSize(safeText(line.description), 212) as string[]).slice(0, 2);
      const rowHeight = Math.max(18, descriptionLines.length * 9 + 5);
      if (y + rowHeight > height - 115) {
        doc.addPage();
        drawHeader(true);
        drawTableHeader();
      }
      const totalBilled = num(line.total_billed) || num(line.previous_billed) + num(line.current_billed);
      const remaining = num(line.scheduled_value) - totalBilled;
      const percent = num(line.scheduled_value) > 0 ? (totalBilled / num(line.scheduled_value)) * 100 : 0;
      doc.setTextColor(...MUTED).setFont('helvetica', 'normal').setFontSize(6.5);
      doc.text(String(index + 1), columns.number, y);
      doc.setTextColor(...INK).setFontSize(7);
      doc.text(descriptionLines, columns.description, y);
      doc.setFont('courier', 'normal').setFontSize(6.1);
      doc.text(money(line.scheduled_value), columns.scheduled, y, { align: 'right' });
      doc.text(money(line.previous_billed), columns.previous, y, { align: 'right' });
      doc.setTextColor(...TEAL).setFont('courier', 'bold');
      doc.text(money(line.current_billed), columns.current, y, { align: 'right' });
      doc.setTextColor(...INK).setFont('courier', 'normal');
      doc.text(money(totalBilled), columns.total, y, { align: 'right' });
      doc.text(money(remaining), columns.remaining, y, { align: 'right' });
      doc.setTextColor(...TEAL);
      doc.text(`${percent.toFixed(1)}%`, columns.percent, y, { align: 'right' });
      y += rowHeight;
      doc.setDrawColor(...BORDER).setLineWidth(0.35);
      doc.line(margin, y - 7, right, y - 7);
    }

    y += 8;
    if (y > height - 185) {
      doc.addPage();
      drawHeader(true);
    }

    const scheduledTotal = lines.reduce((sum, line) => sum + num(line.scheduled_value), 0);
    const previousTotal = lines.reduce((sum, line) => sum + num(line.previous_billed), 0);
    const totalsLeft = right - 188;
    const totalRow = (label: string, amount: number, strong = false) => {
      if (strong) {
        doc.setFillColor(...NAVY);
        doc.roundedRect(totalsLeft, y - 11, 188, 21, 3, 3, 'F');
        doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(7);
      } else {
        doc.setTextColor(...MUTED).setFont('helvetica', 'normal').setFontSize(7);
      }
      doc.text(label, totalsLeft + 8, y + 1);
      doc.setFont('courier', 'bold').setFontSize(strong ? 8.5 : 7);
      doc.text(money(amount), right - 8, y + 1, { align: 'right' });
      y += strong ? 28 : 17;
    };
    totalRow('Scheduled Value Total', scheduledTotal);
    totalRow('Previously Billed', previousTotal);
    totalRow('Current Period Subtotal', num(invoice.subtotal));
    if (num(invoice.retainage_amount) > 0) totalRow('Retainage Held', -num(invoice.retainage_amount));
    totalRow('Total Due This Period', num(invoice.total_amount), true);

    if (invoice.notes) {
      y += 3;
      doc.setTextColor(...MUTED).setFont('helvetica', 'bold').setFontSize(6);
      doc.text('NOTES', margin, y);
      y += 10;
      doc.setTextColor(...INK).setFont('helvetica', 'normal').setFontSize(7);
      const notes = (doc.splitTextToSize(String(invoice.notes), contentWidth) as string[]).slice(0, 5);
      doc.text(notes, margin, y);
      y += notes.length * 9 + 8;
    }

    if (y > height - 60) {
      doc.addPage();
      y = 60;
    }
    const signatureY = Math.max(y + 18, height - 50);
    doc.setDrawColor(...BORDER).setLineWidth(0.5);
    doc.line(margin, signatureY, margin + 225, signatureY);
    doc.line(right - 225, signatureY, right, signatureY);
    doc.setTextColor(...MUTED).setFont('helvetica', 'bold').setFontSize(5.8);
    doc.text('CONTRACTOR AUTHORIZATION', margin, signatureY + 11);
    doc.text('CUSTOMER AUTHORIZATION', right - 225, signatureY + 11);
    doc.setFont('helvetica', 'normal').setFontSize(6);
    doc.text(safeText(sender?.name), margin, signatureY + 21);
    doc.text(safeText(recipient?.name), right - 225, signatureY + 21);

    const bytes = new Uint8Array(doc.output('arraybuffer'));
    const path = `${invoice.project_id}/${invoiceId}-${Date.now()}.pdf`;
    const { error: uploadError } = await svc.storage
      .from('invoice-documents')
      .upload(path, bytes, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw uploadError;

    const { data: signed, error: signError } = await svc.storage
      .from('invoice-documents')
      .createSignedUrl(path, LINK_TTL_SECONDS, { download: `${invoice.invoice_number ?? 'invoice'}.pdf` });
    if (signError || !signed?.signedUrl) throw signError ?? new Error('Could not create download link');

    await svc.from('invoices').update({
      invoice_pdf_url: signed.signedUrl,
      invoice_pdf_generated_at: new Date().toISOString(),
    }).eq('id', invoiceId);

    return json({ url: signed.signedUrl });
  } catch (error) {
    console.error('generate-invoice-pdf failed', error);
    return json({ error: error instanceof Error ? error.message : 'unknown' }, 500);
  }
});
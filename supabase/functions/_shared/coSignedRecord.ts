// Builds and stores the signed external-approval record (PDF) for a CO/WO.
// Stored privately in `co-signed-records/{co_id}/{type}-signed-record.pdf`.
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import { fmtMoney } from './coEmail.ts';

const BUCKET = 'co-signed-records';

function wrap(text: string, font: any, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of String(text ?? '').replace(/[^\x20-\x7E\n]/g, ' ').split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > maxWidth && line) { out.push(line); line = word; }
      else line = next;
    }
    out.push(line);
  }
  return out;
}

export async function buildSignedRecord(supabase: any, coId: string, type: 'owner' | 'architect') {
  const { data: co } = await supabase
    .from('change_orders')
    .select('id, project_id, org_id, co_number, title, document_type, location_tag, reason_note, tc_submitted_price, total_tax, owner_approval_status, owner_approver_name, owner_approver_email, owner_approved_at, owner_rejection_note, architect_approval_status, architect_approver_name, architect_approver_email, architect_approved_at, architect_rejection_note, updated_at')
    .eq('id', coId).maybeSingle();
  if (!co) throw new Error('Change order not found');
  const status = co[`${type}_approval_status`];
  if (status !== 'approved' && status !== 'rejected') throw new Error('Not signed yet');

  const [{ data: project }, { data: org }, { data: lines }] = await Promise.all([
    supabase.from('projects').select('name').eq('id', co.project_id).maybeSingle(),
    supabase.from('organizations').select('name').eq('id', co.org_id).maybeSingle(),
    supabase.from('co_line_items').select('item_name, description, unit, qty, location_tag, sort_order').eq('co_id', co.id).order('sort_order'),
  ]);

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.08, 0.13, 0.24);
  const grey = rgb(0.4, 0.43, 0.5);
  let page = pdf.addPage([612, 792]);
  let y = 792;
  const M = 50, W = 512;
  const ensure = (h: number) => { if (y - h < 60) { page = pdf.addPage([612, 792]); y = 742; } };
  const text = (s: string, x: number, size = 10, f = font, color = rgb(0.1, 0.1, 0.12)) =>
    page.drawText(String(s ?? '').replace(/[^\x20-\x7E]/g, ' '), { x, y, size, font: f, color });

  page.drawRectangle({ x: 0, y: 712, width: 612, height: 80, color: navy });
  y = 760; text('ONTIME.BUILD', M, 10, bold, rgb(1, 0.6, 0.2));
  y = 738; text(status === 'approved' ? 'SIGNED APPROVAL RECORD' : 'SIGNED REJECTION RECORD', M, 18, bold, rgb(1, 1, 1));
  y = 680;

  const docLabel = co.document_type === 'WO' ? 'Work order' : 'Change order';
  const total = Number(co.tc_submitted_price ?? 0) + Number(co.total_tax ?? 0);
  const signedAt = co[`${type}_approved_at`] ?? co.updated_at;
  const rows: [string, string][] = [
    ['Project', project?.name ?? ''],
    [docLabel, co.co_number ?? ''],
    ['Title', co.title ?? ''],
    ['Submitted by', org?.name ?? ''],
    ['Location', co.location_tag ?? ''],
    ['Subtotal', fmtMoney(Number(co.tc_submitted_price ?? 0))],
    ['Tax', fmtMoney(Number(co.total_tax ?? 0))],
    ['Contract change', fmtMoney(total)],
  ];
  for (const [k, v] of rows) {
    if (!v) continue;
    const ls = wrap(v, font, 10, W - 130);
    ensure(14 * ls.length + 4);
    text(k.toUpperCase(), M, 8, bold, grey);
    ls.forEach((l, i) => { const yy = y; y = yy - i * 14; text(l, M + 130, 10); y = yy; });
    y -= 14 * ls.length + 4;
  }

  y -= 10; ensure(30); text('SCOPE OF WORK', M, 9, bold, navy); y -= 16;
  for (const [i, li] of (lines ?? []).entries()) {
    const head = `${i + 1}. ${li.item_name ?? ''}${li.qty ? `  (${li.qty} ${li.unit ?? ''})` : ''}${li.location_tag ? `  - ${li.location_tag}` : ''}`;
    for (const l of wrap(head, bold, 10, W)) { ensure(14); text(l, M, 10, bold); y -= 14; }
    if (li.description) for (const l of wrap(li.description, font, 9, W - 14)) { ensure(12); text(l, M + 14, 9, font, grey); y -= 12; }
    y -= 4;
  }
  if (co.reason_note) {
    y -= 6; ensure(20); text('NOTES', M, 9, bold, navy); y -= 14;
    for (const l of wrap(co.reason_note, font, 9, W)) { ensure(12); text(l, M, 9); y -= 12; }
  }

  y -= 16; ensure(130);
  page.drawRectangle({ x: M, y: y - 110, width: W, height: 118, borderColor: navy, borderWidth: 1 });
  y -= 10; text('SIGNATURE', M + 12, 9, bold, navy); y -= 18;
  text(`Decision: ${status === 'approved' ? 'APPROVED' : 'REJECTED'}`, M + 12, 11, bold); y -= 16;
  text(`Signed by: ${co[`${type}_approver_name`] ?? ''} (${type === 'owner' ? 'Owner' : 'Architect'})`, M + 12, 10); y -= 14;
  if (co[`${type}_approver_email`]) { text(`Email: ${co[`${type}_approver_email`]}`, M + 12, 10); y -= 14; }
  text(`Signed at: ${new Date(signedAt).toUTCString()}`, M + 12, 10); y -= 14;
  if (status === 'rejected' && co[`${type}_rejection_note`]) {
    for (const l of wrap(`Reason: ${co[`${type}_rejection_note`]}`, font, 9, W - 24).slice(0, 2)) { text(l, M + 12, 9); y -= 12; }
  }
  y -= 30;
  ensure(30);
  for (const l of wrap(`Electronically signed via a secure single-use link. Record ID ${co.id}-${type}. This document is part of the project's audit trail.`, font, 8, W)) { text(l, M, 8, font, grey); y -= 11; }

  const bytes = await pdf.save();
  const path = `${co.id}/${type}-signed-record.pdf`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: 'application/pdf', upsert: true });
  if (error) throw error;
  await supabase.from('change_orders').update({ [`${type}_signed_record_path`]: path }).eq('id', co.id);
  return { path, bytes };
}

export async function signedRecordUrl(supabase: any, path: string) {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

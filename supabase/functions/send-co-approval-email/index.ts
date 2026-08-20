// Sends the owner/architect change-order approval email.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { serviceClient, renderEmail, queueEmail, fmtMoney } from '../_shared/coEmail.ts';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Only signed-in project users may trigger sends.
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const supabase = serviceClient();
  const { data: userData } = await supabase.auth.getUser(authHeader.slice(7));
  if (!userData?.user) return json({ error: 'Unauthorized' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const recipient = String(body?.recipient_email ?? '').trim().toLowerCase();
  const approveUrl = String(body?.approve_url ?? '').trim();
  const approvalType = body?.approval_type === 'architect' ? 'architect' : 'owner';
  if (!recipient || !recipient.includes('@')) return json({ error: 'Valid recipient_email required' }, 400);
  if (!approveUrl.startsWith('http')) return json({ error: 'Valid approve_url required' }, 400);

  const coNumber = String(body?.co_number ?? '').trim();
  const coTitle = String(body?.co_title ?? 'Change Order').trim();
  const projectName = String(body?.project_name ?? '').trim();
  const coTotal = Number(body?.co_total ?? 0);
  const roleLabel = approvalType === 'owner' ? 'Owner' : 'Architect';

  const subject = `${roleLabel} approval needed — ${coNumber || 'Change Order'}${projectName ? ` · ${projectName}` : ''}`;

  const html = renderEmail({
    heading: `${roleLabel} approval requested`,
    intro: `You've been asked to review and approve a change order${projectName ? ` on ${projectName}` : ''}. No account or password is needed — the link below opens the signed approval form.`,
    rows: [
      ['Project', projectName],
      ['Change order', coNumber],
      ['Description', coTitle],
      ['Amount', fmtMoney(coTotal)],
    ],
    ctaLabel: 'Review & approve',
    ctaUrl: approveUrl,
    footnote: 'This link is unique to you. Your typed name is recorded as your signature.',
  });

  const text = [
    `${roleLabel} approval requested`,
    projectName && `Project: ${projectName}`,
    coNumber && `Change order: ${coNumber}`,
    `Description: ${coTitle}`,
    `Amount: ${fmtMoney(coTotal)}`,
    '',
    `Review & approve: ${approveUrl}`,
  ].filter(Boolean).join('\n');

  try {
    await queueEmail(supabase, { to: recipient, subject, html, text, label: 'co_external_approval' });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Failed to queue email' }, 500);
  }

  return json({ ok: true });
});

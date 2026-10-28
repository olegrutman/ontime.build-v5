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
  const rawLabel = String(body?.role_label ?? '').trim();
  const roleLabel = rawLabel && rawLabel.length <= 40
    ? rawLabel
    : approvalType === 'owner' ? 'Owner' : 'Architect';

  const { data: roleRow } = await supabase
    .from('user_org_roles').select('organization_id').eq('user_id', userData.user.id).limit(1).maybeSingle();
  let senderOrg = '';
  if ((roleRow as any)?.organization_id) {
    const { data: org } = await supabase.from('organizations').select('name').eq('id', (roleRow as any).organization_id).maybeSingle();
    senderOrg = String(org?.name ?? '');
  }

  const subject = `${roleLabel} approval needed — ${coNumber || 'Change Order'}${projectName ? ` · ${projectName}` : ''}`;

  const html = renderEmail({
    heading: `${roleLabel} approval requested`,
    status: 'warning',
    intro: `${senderOrg || 'Your contractor'} has submitted a change order${projectName ? ` on ${projectName}` : ''} for your review. It changes the contract scope and price, so your signed decision is required before the work is added to the contract. No account or password is needed.`,
    rows: [
      ['Project', projectName],
      ['Submitted by', senderOrg],
      ['Change order', coNumber],
      ['Description', coTitle],
      ['Amount', fmtMoney(coTotal)],
    ],
    steps: [
      'Open the secure link and review the scope, items and amount.',
      'Approve, or reject with a short reason for the team.',
      'Type your full name to sign. A signed copy is emailed to you.',
    ],
    ctaLabel: 'Review & sign',
    ctaUrl: approveUrl,
    footnote: 'This secure link is issued only to you and can be used once. Your typed name, decision and timestamp are recorded as a legally binding electronic signature and shared with the project team. Questions about the work? Reply to the contractor directly before signing.',
  });

  const text = [
    `${roleLabel} approval requested`,
    projectName && `Project: ${projectName}`,
    coNumber && `Change order: ${coNumber}`,
    `Description: ${coTitle}`,
    `Amount: ${fmtMoney(coTotal)}`,
    '',
    senderOrg && `Submitted by: ${senderOrg}`,
    '',
    `Review & sign: ${approveUrl}`,
  ].filter(Boolean).join('\n');

  try {
    await queueEmail(supabase, { to: recipient, subject, html, text, label: 'co_external_approval' });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Failed to queue email' }, 500);
  }

  return json({ ok: true });
});

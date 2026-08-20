// Sends the external-party invite email for a change order (pricing / scope ack / acknowledge).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { serviceClient, renderEmail, queueEmail } from '../_shared/coEmail.ts';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const PURPOSE: Record<string, { heading: string; intro: string; cta: string }> = {
  pricing: {
    heading: 'Pricing requested',
    intro: "You've been asked to price the scope on a change order. Open the link below to enter your prices and submit — no account needed.",
    cta: 'Submit pricing',
  },
  scope_ack: {
    heading: 'Scope confirmation requested',
    intro: "You've been asked to review and confirm the scope on a change order. Open the link below to confirm — no account needed.",
    cta: 'Review scope',
  },
  acknowledge: {
    heading: 'Change order sent to you',
    intro: 'A change order has been shared with you. Open the link below to review it and acknowledge receipt — no account needed.',
    cta: 'Review & acknowledge',
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const supabase = serviceClient();
  const { data: userData } = await supabase.auth.getUser(authHeader.slice(7));
  if (!userData?.user) return json({ error: 'Unauthorized' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const recipient = String(body?.recipient_email ?? '').trim().toLowerCase();
  const viewUrl = String(body?.view_url ?? '').trim();
  if (!recipient || !recipient.includes('@')) return json({ error: 'Valid recipient_email required' }, 400);
  if (!viewUrl.startsWith('http')) return json({ error: 'Valid view_url required' }, 400);

  const purposeKey = String(body?.invite_purpose ?? 'pricing');
  const purpose = PURPOSE[purposeKey] ?? PURPOSE.pricing;
  const coNumber = String(body?.co_number ?? '').trim();
  const coTitle = String(body?.co_title ?? 'Change Order').trim();
  const projectName = String(body?.project_name ?? '').trim();

  const subject = `${purpose.heading} — ${coNumber || 'Change Order'}${projectName ? ` · ${projectName}` : ''}`;

  const html = renderEmail({
    heading: purpose.heading,
    intro: purpose.intro,
    rows: [
      ['Project', projectName],
      ['Change order', coNumber],
      ['Description', coTitle],
    ],
    ctaLabel: purpose.cta,
    ctaUrl: viewUrl,
    footnote: 'This link is unique to you and expires in 14 days.',
  });

  const text = [
    purpose.heading,
    projectName && `Project: ${projectName}`,
    coNumber && `Change order: ${coNumber}`,
    `Description: ${coTitle}`,
    '',
    `${purpose.cta}: ${viewUrl}`,
  ].filter(Boolean).join('\n');

  try {
    await queueEmail(supabase, { to: recipient, subject, html, text, label: 'co_external_invite' });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Failed to queue email' }, 500);
  }

  return json({ ok: true });
});

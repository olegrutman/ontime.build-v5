// Sends the branded "[Company] has invited you to Ontime.Build" invitation email.
// Called from the app when a user invites another company to a project, or a
// person to their own company.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { serviceClient, queueEmail, escapeHtml } from '../_shared/coEmail.ts';

const APP_URL = 'https://ontime.build';
const LOGO_URL = 'https://ontime.build/ontime-logo-email.png';

interface Body {
  to?: string;
  invitedName?: string | null;
  companyName?: string;
  projectName?: string | null;
  roleLabel?: string | null;
}

const BENEFITS: Array<[string, string]> = [
  [
    'Work orders & change orders',
    'Price it, send it, get it approved — with a clear record of who agreed to what.',
  ],
  [
    'Purchase orders',
    'Order materials, track deliveries and keep costs tied to the right job.',
  ],
  [
    'Straight talk with your suppliers',
    'Quotes, pricing and delivery updates in one thread instead of scattered texts and calls.',
  ],
  [
    'Accountability for everyone',
    'Every approval, price and photo is time-stamped, so nothing gets lost or disputed later.',
  ],
];

function renderInvite(opts: {
  companyName: string;
  invitedName?: string | null;
  projectName?: string | null;
  roleLabel?: string | null;
  ctaUrl: string;
}): string {
  const { companyName, invitedName, projectName, roleLabel, ctaUrl } = opts;

  const benefitRows = BENEFITS.map(
    ([title, copy], i) => `
      <tr>
        <td valign="top" style="width:26px;padding:0 10px 14px 0;">
          <div style="width:22px;height:22px;border-radius:11px;background:#0f172a;color:#ffffff;font-size:12px;font-weight:700;text-align:center;line-height:22px;">${i + 1}</div>
        </td>
        <td valign="top" style="padding:0 0 14px;">
          <div style="color:#0f172a;font-size:14px;font-weight:700;margin-bottom:2px;">${escapeHtml(title)}</div>
          <div style="color:#475569;font-size:13px;line-height:1.5;">${escapeHtml(copy)}</div>
        </td>
      </tr>`,
  ).join('');

  const contextLine = [
    projectName ? `Project: ${projectName}` : null,
    roleLabel ? `Invited as: ${roleLabel}` : null,
  ]
    .filter(Boolean)
    .join(' &nbsp;·&nbsp; ');

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
    <tr><td style="background:#0f172a;padding:20px 26px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="padding-right:10px;" valign="middle">
          <img src="${LOGO_URL}" width="34" height="34" alt="Ontime.Build" style="display:block;border:0;width:34px;height:34px;" />
        </td>
        <td valign="middle">
          <div style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:0.3px;">Ontime<span style="color:#f97316;">.Build</span></div>
        </td>
      </tr></table>
      <div style="height:2px;background:#f97316;margin:16px 0 14px;width:52px;"></div>
      <div style="color:#ffffff;font-size:21px;font-weight:700;line-height:1.3;">${escapeHtml(companyName)} has invited you to Ontime.Build</div>
    </td></tr>
    <tr><td style="padding:26px;">
      <p style="margin:0 0 18px;color:#334155;font-size:14px;line-height:1.6;">
        ${invitedName ? `${escapeHtml(invitedName)}, ` : ''}${escapeHtml(companyName)} runs their jobs on Ontime.Build and wants you on it with them.
        Activate your free account to work together on scope, pricing, approvals and billing — from the office or your phone.
      </p>
      ${contextLine ? `<p style="margin:0 0 18px;color:#64748b;font-size:12px;">${contextLine}</p>` : ''}
      <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:10px;">Accept Invitation</a>
      <div style="height:1px;background:#e2e8f0;margin:26px 0 20px;"></div>
      <div style="color:#0f172a;font-size:11px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;margin-bottom:14px;">What you get</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${benefitRows}</table>
      <div style="height:1px;background:#e2e8f0;margin:6px 0 18px;"></div>
      <div style="color:#0f172a;font-size:14px;font-weight:700;margin-bottom:6px;">Having trouble getting started?</div>
      <p style="margin:0 0 6px;color:#475569;font-size:13px;line-height:1.55;">
        Use the button above, or paste this link into your browser:
      </p>
      <p style="margin:0;color:#64748b;font-size:12px;word-break:break-all;">${escapeHtml(ctaUrl)}</p>
    </td></tr>
    <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 26px;color:#64748b;font-size:11px;line-height:1.5;">
      Ontime.Build — construction project, change order and billing management.<br />
      You received this because ${escapeHtml(companyName)} invited you to collaborate. If this wasn't expected, you can ignore this email.
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) return json({ error: 'unauthorized' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'unauthorized' }, 401);

    const body = (await req.json()) as Body;
    const to = String(body.to ?? '').trim().toLowerCase();
    const companyName = String(body.companyName ?? '').trim();
    if (!to || !to.includes('@')) return json({ error: 'invalid_recipient' }, 400);
    if (!companyName) return json({ error: 'missing_company' }, 400);

    const ctaUrl = `${APP_URL}/signup?email=${encodeURIComponent(to)}`;
    const html = renderInvite({
      companyName,
      invitedName: body.invitedName ?? null,
      projectName: body.projectName ?? null,
      roleLabel: body.roleLabel ?? null,
      ctaUrl,
    });

    const text = [
      `${companyName} has invited you to Ontime.Build.`,
      body.projectName ? `Project: ${body.projectName}` : '',
      body.roleLabel ? `Invited as: ${body.roleLabel}` : '',
      '',
      `Accept the invitation: ${ctaUrl}`,
      '',
      ...BENEFITS.map(([t, c], i) => `${i + 1}. ${t} — ${c}`),
    ]
      .filter(Boolean)
      .join('\n');

    const supabase = serviceClient();
    await queueEmail(supabase, {
      to,
      subject: `${companyName} has invited you to Ontime.Build`,
      html,
      text,
      label: 'company-invite',
    });

    return json({ sent: true });
  } catch (e) {
    console.error('send-company-invite failed', e);
    return json({ error: (e as Error).message }, 500);
  }
});

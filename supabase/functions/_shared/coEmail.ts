// Shared transactional email helper for change-order external flows.
// Enqueues into the same pgmq queue that `process-email-queue` drains.
import { createClient } from 'npm:@supabase/supabase-js@2';

// Must be the verified delegated sending subdomain — the root domain is not verified.
const SENDER_DOMAIN = 'notify.ontime.build';
const FROM = 'Ontime.Build <noreply@notify.ontime.build>';


export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

export function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function fmtMoney(n: number): string {
  return `$${Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface Layout {
  heading: string;
  intro: string;
  rows: Array<[string, string]>;
  ctaLabel: string;
  ctaUrl: string;
  footnote?: string;
  status?: 'success' | 'danger' | 'warning' | 'info';
}

const LOGO_URL = 'https://ontime.build/ontime-logo-email.png';

const STATUS_BANDS: Record<string, { bg: string; text: string; label: string }> = {
  success: { bg: '#16a34a', text: '#ffffff', label: 'Approved' },
  danger: { bg: '#dc2626', text: '#ffffff', label: 'Needs attention' },
  warning: { bg: '#f59e0b', text: '#0f172a', label: 'Action required' },
  info: { bg: '#f97316', text: '#ffffff', label: 'Update' },
};

export function renderEmail({ heading, intro, rows, ctaLabel, ctaUrl, footnote, status }: Layout): string {
  const rowsHtml = rows
    .filter(([, v]) => v)
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;">${escapeHtml(label)}</td>
          <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join('');

  const band = status ? STATUS_BANDS[status] : null;
  const bandHtml = band
    ? `<tr><td style="background:${band.bg};padding:9px 24px;color:${band.text};font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">${escapeHtml(band.label)}</td></tr>`
    : '';

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
    <tr><td style="background:#0f172a;padding:20px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="padding-right:10px;" valign="middle">
          <img src="${LOGO_URL}" width="34" height="34" alt="Ontime.Build" style="display:block;border:0;width:34px;height:34px;" />
        </td>
        <td valign="middle">
          <div style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:0.3px;">Ontime<span style="color:#f97316;">.Build</span></div>
        </td>
      </tr></table>
      <div style="height:2px;background:#f97316;margin:16px 0 14px;width:52px;"></div>
      <div style="color:#ffffff;font-size:19px;font-weight:700;">${escapeHtml(heading)}</div>
    </td></tr>
    ${bandHtml}
    <tr><td style="padding:24px;">
      <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.55;">${escapeHtml(intro)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin-bottom:20px;">
        ${rowsHtml}
      </table>
      <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px;">${escapeHtml(ctaLabel)}</a>
      ${footnote ? `<p style="margin:18px 0 0;color:#64748b;font-size:12px;line-height:1.5;">${escapeHtml(footnote)}</p>` : ''}
      <p style="margin:16px 0 0;color:#64748b;font-size:12px;word-break:break-all;">${escapeHtml(ctaUrl)}</p>
    </td></tr>
    <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 24px;color:#64748b;font-size:11px;line-height:1.5;">
      Ontime.Build — construction project, change order and billing management.
    </td></tr>
  </table>
</body></html>`;
}


// The email API rejects transactional sends without an unsubscribe token, so
// every recipient address gets a stable token reused across sends.
async function ensureUnsubscribeToken(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', email)
    .is('used_at', null)
    .limit(1)
    .maybeSingle();
  if (existing?.token) return existing.token as string;

  const token = crypto.randomUUID().replaceAll('-', '');
  const { error } = await supabase
    .from('email_unsubscribe_tokens')
    .insert({ token, email });
  if (error) {
    const { data: raced } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', email)
      .limit(1)
      .maybeSingle();
    if (raced?.token) return raced.token as string;
    throw new Error(`Failed to prepare unsubscribe token: ${error.message}`);
  }
  return token;
}

export async function queueEmail(
  supabase: ReturnType<typeof createClient>,
  opts: { to: string; subject: string; html: string; text: string; label: string },
) {
  const unsubscribeToken = await ensureUnsubscribeToken(supabase, opts.to);

  const payload = {
    to: opts.to,
    from: FROM,
    sender_domain: SENDER_DOMAIN,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    purpose: 'transactional',
    label: opts.label,
    message_id: crypto.randomUUID(),
    idempotency_key: crypto.randomUUID(),
    unsubscribe_token: unsubscribeToken,
    queued_at: new Date().toISOString(),

  };

  const { error } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload,
  });
  if (error) throw new Error(`Failed to queue email: ${error.message}`);

  // Best effort: nudge the worker so the email goes out now.
  try {
    await supabase.rpc('email_queue_wake');
  } catch (_) {
    // ignore
  }
}

// Shared transactional email helper for change-order external flows.
// Enqueues into the same pgmq queue that `process-email-queue` drains.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SENDER_DOMAIN = 'pm.ontime.build';
const FROM = 'OnTime <noreply@pm.ontime.build>';

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
}

export function renderEmail({ heading, intro, rows, ctaLabel, ctaUrl, footnote }: Layout): string {
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

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
    <tr><td style="background:#0f172a;padding:20px 24px;">
      <div style="color:#f97316;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">OnTime</div>
      <div style="color:#ffffff;font-size:19px;font-weight:700;margin-top:4px;">${escapeHtml(heading)}</div>
    </td></tr>
    <tr><td style="padding:24px;">
      <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.55;">${escapeHtml(intro)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin-bottom:20px;">
        ${rowsHtml}
      </table>
      <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px;">${escapeHtml(ctaLabel)}</a>
      ${footnote ? `<p style="margin:18px 0 0;color:#94a3b8;font-size:12px;line-height:1.5;">${escapeHtml(footnote)}</p>` : ''}
      <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;word-break:break-all;">${escapeHtml(ctaUrl)}</p>
    </td></tr>
  </table>
</body></html>`;
}

export async function queueEmail(
  supabase: ReturnType<typeof createClient>,
  opts: { to: string; subject: string; html: string; text: string; label: string },
) {
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

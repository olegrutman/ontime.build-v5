// Shared transactional email helper for change-order external flows.
// Sends through Lovable's managed email API.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { EmailAPIError, sendLovableEmail } from 'npm:@lovable.dev/email-js@0.1.0';

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
  /** Optional secondary button, e.g. a document download link. */
  secondaryLabel?: string;
  secondaryUrl?: string;
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


// Sends through Lovable's managed email API. Delivery, retries, rate limits,
// suppression and the unsubscribe page are handled on Lovable's side.
export async function queueEmail(
  supabase: ReturnType<typeof createClient>,
  opts: { to: string; subject: string; html: string; text: string; label: string },
): Promise<{ sent: boolean }> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY is not configured');

  const messageId = crypto.randomUUID();

  const logRow = async (
    status: 'sent' | 'suppressed' | 'failed',
    errorMessage?: string,
  ) => {
    const { error } = await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: opts.label,
      recipient_email: opts.to,
      status,
      error_message: errorMessage ? errorMessage.slice(0, 1000) : null,
    });
    if (error) {
      console.error('Failed to write email_send_log row', {
        status,
        code: error.code,
        message: error.message,
      });
    }
  };

  try {
    await sendLovableEmail(
      {
        to: opts.to,
        from: FROM,
        sender_domain: SENDER_DOMAIN,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        purpose: 'transactional',
        label: opts.label,
        idempotency_key: messageId,
      },
      { apiKey, sendUrl: Deno.env.get('LOVABLE_SEND_URL') },
    );
  } catch (error) {
    if (error instanceof EmailAPIError && error.code === 'recipient_suppressed') {
      await logRow('suppressed', 'Recipient is suppressed');
      return { sent: false };
    }
    const message = error instanceof Error ? error.message : String(error);
    await logRow('failed', message);
    throw error;
  }

  await logRow('sent');
  return { sent: true };
}

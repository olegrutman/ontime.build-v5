// Emails the business-critical in-app alerts (Tier 1 money + Tier 2 blocked work).
// Called by the AFTER INSERT trigger on public.notifications, which only fires for
// an allowlisted set of notification types.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { serviceClient, queueEmail, renderEmail } from '../_shared/coEmail.ts';

const APP_URL = 'https://ontime.build';

// How long to wait before emailing the same person about the same kind of event again.
const THROTTLE_MINUTES = 15;

// Max people emailed for an org-wide alert (admins first).
const MAX_ORG_RECIPIENTS = 6;

type Category =
  | 'notify_inv_submitted'
  | 'notify_inv_approved'
  | 'notify_inv_rejected'
  | 'notify_inv_paid'
  | 'notify_wo_submitted'
  | 'notify_wo_approved'
  | 'notify_wo_rejected'
  | 'notify_wo_assigned'
  | 'notify_wo_input_requested'
  | 'notify_po'
  | 'notify_project_invite'
  | 'notify_join_request'
  | 'notify_estimate';

const CATEGORY_BY_TYPE: Record<string, Category> = {
  INVOICE_SUBMITTED: 'notify_inv_submitted',
  INVOICE_APPROVED: 'notify_inv_approved',
  INVOICE_REJECTED: 'notify_inv_rejected',
  INVOICE_PAID: 'notify_inv_paid',
  CHANGE_SUBMITTED: 'notify_wo_submitted',
  CHANGE_APPROVED: 'notify_wo_approved',
  CHANGE_REJECTED: 'notify_wo_rejected',
  WORK_ORDER_ASSIGNED: 'notify_wo_input_requested',
  CO_CLOSED_FOR_PRICING: 'notify_wo_input_requested',
  FC_PRICING_SUBMITTED: 'notify_wo_assigned',
  PO_SENT: 'notify_po',
  PO_APPROVED: 'notify_po',
  PROJECT_INVITE: 'notify_project_invite',
  WORK_ITEM_INVITE: 'notify_project_invite',
  JOIN_REQUEST: 'notify_join_request',
  ESTIMATE_SUBMITTED: 'notify_estimate',
  ESTIMATE_APPROVED: 'notify_estimate',
};

const CTA_BY_TYPE: Record<string, string> = {
  INVOICE_SUBMITTED: 'Review invoice',
  INVOICE_APPROVED: 'View invoice',
  INVOICE_REJECTED: 'Review and fix',
  INVOICE_PAID: 'View payment',
  CHANGE_SUBMITTED: 'Review and approve',
  CHANGE_APPROVED: 'View details',
  CHANGE_REJECTED: 'Review details',
  WORK_ORDER_ASSIGNED: 'Open work order',
  CO_CLOSED_FOR_PRICING: 'Submit pricing',
  FC_PRICING_SUBMITTED: 'Review pricing',
  PO_SENT: 'Open purchase order',
  PO_APPROVED: 'View purchase order',
  PROJECT_INVITE: 'View invitation',
  WORK_ITEM_INVITE: 'View invitation',
  JOIN_REQUEST: 'Review request',
  ESTIMATE_SUBMITTED: 'Review estimate',
  ESTIMATE_APPROVED: 'View estimate',
};

interface TriggerBody {
  notification_id?: string;
  recipient_user_id?: string | null;
  recipient_org_id?: string | null;
  type?: string;
  title?: string;
  body?: string | null;
  action_url?: string | null;
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
    const supabase = serviceClient();

    const secret = req.headers.get('x-trigger-secret') ?? '';
    const { data: ok, error: verifyError } = await supabase.rpc(
      'verify_notification_trigger_secret',
      { _candidate: secret },
    );
    if (verifyError || ok !== true) {
      return json({ error: 'unauthorized' }, 401);
    }

    const payload = (await req.json()) as TriggerBody;
    const type = String(payload.type ?? '');
    const category = CATEGORY_BY_TYPE[type];
    if (!category) {
      return json({ skipped: 'type_not_emailable' });
    }

    // Resolve who should get the email.
    const userIds: string[] = [];
    if (payload.recipient_user_id) {
      userIds.push(payload.recipient_user_id);
    } else if (payload.recipient_org_id) {
      const { data: members } = await supabase
        .from('user_org_roles')
        .select('user_id, role')
        .eq('organization_id', payload.recipient_org_id);

      const sorted = (members ?? []).sort((a, b) => {
        const rank = (r: unknown) => (String(r ?? '').toLowerCase() === 'admin' ? 0 : 1);
        return rank(a.role) - rank(b.role);
      });
      for (const m of sorted) {
        if (m.user_id && !userIds.includes(m.user_id)) userIds.push(m.user_id);
        if (userIds.length >= MAX_ORG_RECIPIENTS) break;
      }
    }

    if (userIds.length === 0) {
      return json({ skipped: 'no_recipients' });
    }

    const actionUrl = payload.action_url
      ? `${APP_URL}${payload.action_url.startsWith('/') ? '' : '/'}${payload.action_url}`
      : `${APP_URL}/dashboard`;

    const results: Array<{ user_id: string; status: string }> = [];
    const cutoff = new Date(Date.now() - THROTTLE_MINUTES * 60_000).toISOString();

    for (const userId of userIds) {
      const logSkip = async (email: string, reason: string) => {
        await supabase.from('notification_email_log').insert({
          notification_id: payload.notification_id ?? null,
          user_id: userId,
          recipient_email: email,
          notification_type: type,
          status: 'skipped',
          reason,
        });
        results.push({ user_id: userId, status: `skipped:${reason}` });
      };

      // Preference check: master email switch + category switch.
      const { data: settings } = await supabase
        .from('user_settings')
        .select(`notify_email, ${category}`)
        .eq('user_id', userId)
        .maybeSingle();

      const settingsRow = (settings ?? {}) as Record<string, boolean | null>;
      if (settingsRow.notify_email === false) {
        await logSkip('', 'email_disabled');
        continue;
      }
      if (settingsRow[category] === false) {
        await logSkip('', 'category_disabled');
        continue;
      }

      // Look up the address.
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const email = authUser?.user?.email;
      if (!email || !authUser?.user?.email_confirmed_at) {
        await logSkip(email ?? '', 'no_confirmed_email');
        continue;
      }

      // Collapse bursts: one email per person per event kind per window.
      const { count } = await supabase
        .from('notification_email_log')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('notification_type', type)
        .eq('status', 'sent')
        .gte('created_at', cutoff);

      if ((count ?? 0) > 0) {
        await logSkip(email, 'throttled');
        continue;
      }

      const heading = payload.title ?? 'Update on your project';
      const intro = payload.body ?? 'There is an update waiting for you in Ontime.Build.';
      const t = type.toUpperCase();
      const status: 'success' | 'danger' | 'warning' | 'info' =
        t.includes('APPROVED') || t.includes('PAID') || t.includes('ACCEPTED')
          ? 'success'
          : t.includes('REJECTED') || t.includes('DECLINED') || t.includes('WITHDRAWN')
            ? 'danger'
            : t.includes('REQUEST') || t.includes('SUBMITTED') || t.includes('ASSIGNED')
              ? 'warning'
              : 'info';
      const html = renderEmail({
        heading,
        intro,
        status,
        rows: [],
        ctaLabel: CTA_BY_TYPE[type] ?? 'Open in Ontime.Build',
        ctaUrl: actionUrl,
        footnote:
          'You are receiving this because this action needs your attention. Manage which alerts are emailed to you in Settings → Notifications.',
      });


      await queueEmail(supabase, {
        to: email,
        subject: heading,
        html,
        text: `${heading}\n\n${intro}\n\n${actionUrl}`,
        label: `notification:${type}`,
      });

      await supabase.from('notification_email_log').insert({
        notification_id: payload.notification_id ?? null,
        user_id: userId,
        recipient_email: email,
        notification_type: type,
        status: 'sent',
      });
      results.push({ user_id: userId, status: 'sent' });
    }

    return json({ ok: true, type, results });
  } catch (err) {
    console.error('send-notification-email failed', err);
    return json({ error: err instanceof Error ? err.message : 'unknown' }, 500);
  }
});

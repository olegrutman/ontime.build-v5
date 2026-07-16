// Send Web Push notifications via VAPID.
// Two entry paths:
//  1. Internal (from DB trigger): header `x-internal-secret` matches PUSH_INTERNAL_SECRET.
//     Body: { notification_id, user_id } — function fetches title/body/url and all user subs.
//  2. User test: valid JWT. Body: { title, body, url } — sends to caller's own subscriptions only.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@ontime.build';
const INTERNAL_SECRET = Deno.env.get('PUSH_INTERNAL_SECRET')!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type Sub = {
  id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
};

async function sendToSubs(subs: Sub[], payload: Record<string, unknown>, notificationId: string | null) {
  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh_key, auth: s.auth_key } },
        body,
        { TTL: 60 * 60 * 24 },
      );
      sent++;
      await admin.from('notification_deliveries').insert({
        notification_id: notificationId,
        channel: 'push',
        status: 'sent',
        subscription_id: s.id,
      });
    } catch (err: any) {
      failed++;
      const status = err?.statusCode ?? 0;
      const msg = String(err?.body ?? err?.message ?? err);
      if (status === 404 || status === 410) {
        // Subscription is gone — remove it.
        await admin.from('push_subscriptions').delete().eq('id', s.id);
      }
      await admin.from('notification_deliveries').insert({
        notification_id: notificationId,
        channel: 'push',
        status: 'failed',
        subscription_id: s.id,
        error: `${status}: ${msg.slice(0, 500)}`,
      });
    }
  }));

  return { sent, failed };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const internalHeader = req.headers.get('x-internal-secret');
    const body = await req.json().catch(() => ({}));

    // ---- Internal path (DB trigger) ----
    if (internalHeader && internalHeader === INTERNAL_SECRET) {
      const { notification_id, user_id } = body ?? {};
      if (!notification_id || !user_id) {
        return new Response(JSON.stringify({ error: 'notification_id and user_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Respect user preference.
      const { data: prefs } = await admin
        .from('user_settings').select('notify_push').eq('user_id', user_id).maybeSingle();
      if (prefs && prefs.notify_push === false) {
        return new Response(JSON.stringify({ skipped: 'user disabled push' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: notif } = await admin
        .from('notifications')
        .select('id,title,body,action_url,type')
        .eq('id', notification_id).maybeSingle();
      if (!notif) {
        return new Response(JSON.stringify({ error: 'notification not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: subs } = await admin
        .from('push_subscriptions')
        .select('id,endpoint,p256dh_key,auth_key')
        .eq('user_id', user_id)
        .neq('is_active', false);

      if (!subs || subs.length === 0) {
        return new Response(JSON.stringify({ sent: 0, failed: 0, reason: 'no subs' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await sendToSubs(subs as Sub[], {
        title: notif.title,
        body: notif.body ?? '',
        url: notif.action_url,
        tag: notif.type,
        notificationId: notif.id,
      }, notif.id);

      return new Response(JSON.stringify(result), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- User test path (JWT required) ----
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub as string;

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('id,endpoint,p256dh_key,auth_key')
      .eq('user_id', userId)
      .neq('is_active', false);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, failed: 0, reason: 'no subscriptions' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = {
      title: body.title ?? 'Ontime.Build test',
      body: body.body ?? 'Push notifications are working.',
      url: body.url ?? '/',
      tag: 'test',
    };
    const result = await sendToSubs(subs as Sub[], payload, null);
    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('send-push-notification error:', err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

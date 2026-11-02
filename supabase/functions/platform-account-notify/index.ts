// Sends account emails after a platform-staff action (reset, new user,
// email change, access change). Only platform staff may call it.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';
import { serviceClient, renderEmail, queueEmail } from '../_shared/coEmail.ts';

const SITE = 'https://ontime.build';
const RESET_URL = `${SITE}/reset-password`;

const Body = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('reset_password'), user_id: z.string().uuid() }),
  z.object({ kind: z.literal('welcome'), email: z.string().email().max(255) }),
  z.object({ kind: z.literal('email_changed'), user_id: z.string().uuid(), old_email: z.string().email().max(255) }),
  z.object({ kind: z.literal('access_changed'), user_org_role_id: z.string().uuid() }),
]);

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const STAFF = ['PLATFORM_OWNER', 'PLATFORM_ADMIN', 'SUPPORT_AGENT'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: authErr } = await userClient.auth.getClaims(auth.slice(7));
    if (authErr || !claims?.claims?.sub) return json({ error: 'Unauthorized' }, 401);

    const admin = serviceClient();
    const { data: staff } = await admin.from('platform_users').select('platform_role').eq('user_id', claims.claims.sub).maybeSingle();
    if (!staff || !STAFF.includes(String(staff.platform_role))) return json({ error: 'Forbidden' }, 403);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const body = parsed.data;

    const recoveryLink = async (email: string) => {
      const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: RESET_URL } });
      if (error) throw error;
      return data.properties.action_link as string;
    };
    const nameOf = async (userId: string) => {
      const { data } = await admin.from('profiles').select('full_name, first_name').eq('user_id', userId).maybeSingle();
      return (data?.first_name || data?.full_name || '').trim();
    };
    const send = (to: string, subject: string, label: string, html: string, text: string) =>
      queueEmail(admin, { to, subject, html, text, label });

    if (body.kind === 'reset_password') {
      const { data: u, error } = await admin.auth.admin.getUserById(body.user_id);
      if (error || !u?.user?.email) return json({ error: 'User not found' }, 404);
      const email = u.user.email;
      const link = await recoveryLink(email);
      const name = await nameOf(body.user_id);
      const r = await send(email, 'Reset your Ontime.Build password', 'platform_password_reset',
        renderEmail({
          heading: 'Reset your password',
          intro: `${name ? `Hi ${name}, ` : ''}the Ontime.Build support team started a password reset for your account. Use the button below to choose a new password.`,
          rows: [['Account', email]],
          ctaLabel: 'Choose a new password', ctaUrl: link, status: 'info',
          footnote: "This link works once and expires soon. If you didn't ask for this, you can ignore this email; your password stays the same.",
        }),
        `Reset your Ontime.Build password: ${link}`);
      return json({ sent: r.sent, email, action_link: link });
    }

    if (body.kind === 'welcome') {
      const { data: prof } = await admin.from('profiles').select('user_id, first_name, full_name').ilike('email', body.email).maybeSingle();
      if (!prof) return json({ error: 'User not found' }, 404);
      const { data: roles } = await admin.from('user_org_roles').select('role, organization:organizations(name)').eq('user_id', prof.user_id).limit(1);
      const org = (roles?.[0] as any)?.organization?.name as string | undefined;
      const link = await recoveryLink(body.email);
      const name = (prof.first_name || prof.full_name || '').trim();
      const r = await send(body.email, 'Your Ontime.Build account is ready', 'platform_welcome',
        renderEmail({
          heading: 'Your account is ready',
          intro: `${name ? `Hi ${name}, ` : ''}an Ontime.Build account was created for you${org ? ` at ${org}` : ''}. Set your own password to sign in.`,
          rows: [['Sign-in email', body.email], ['Company', org || ''], ['Role', (roles?.[0] as any)?.role || '']],
          ctaLabel: 'Set your password', ctaUrl: link, status: 'info',
          secondaryLabel: 'Go to sign in', secondaryUrl: `${SITE}/auth`,
          footnote: 'This link works once and expires soon. If it expires, use "Forgot password" on the sign-in page.',
        }),
        `Your Ontime.Build account is ready. Set your password: ${link}`);
      return json({ sent: r.sent, email: body.email });
    }

    if (body.kind === 'email_changed') {
      const { data: u, error } = await admin.auth.admin.getUserById(body.user_id);
      if (error || !u?.user?.email) return json({ error: 'User not found' }, 404);
      const newEmail = u.user.email;
      const rows: Array<[string, string]> = [['Previous email', body.old_email], ['New email', newEmail]];
      const footnote = "If you didn't expect this change, reply to your Ontime.Build contact right away.";
      const a = await send(body.old_email, 'Your Ontime.Build sign-in email was changed', 'platform_email_changed_old',
        renderEmail({ heading: 'Sign-in email changed', intro: 'The sign-in email for your Ontime.Build account was changed by our support team. You will now sign in with the new address.', rows, ctaLabel: 'Go to sign in', ctaUrl: `${SITE}/auth`, status: 'warning', footnote }),
        `Your Ontime.Build sign-in email was changed from ${body.old_email} to ${newEmail}.`);
      const b = await send(newEmail, 'This is now your Ontime.Build sign-in email', 'platform_email_changed_new',
        renderEmail({ heading: 'New sign-in email', intro: 'This address is now the sign-in email for your Ontime.Build account. Your password has not changed.', rows, ctaLabel: 'Go to sign in', ctaUrl: `${SITE}/auth`, status: 'info', footnote }),
        `Your Ontime.Build sign-in email is now ${newEmail}.`);
      return json({ sent: a.sent && b.sent });
    }

    // access_changed
    const { data: m } = await admin.from('user_org_roles').select('user_id, role, is_admin, organization:organizations(name)').eq('id', body.user_org_role_id).maybeSingle();
    if (!m) return json({ error: 'Membership not found' }, 404);
    const { data: u } = await admin.auth.admin.getUserById(m.user_id);
    if (!u?.user?.email) return json({ error: 'User not found' }, 404);
    const name = await nameOf(m.user_id);
    const org = (m as any).organization?.name || '';
    const r = await send(u.user.email, 'Your Ontime.Build access was updated', 'platform_access_changed',
      renderEmail({
        heading: 'Your access was updated',
        intro: `${name ? `Hi ${name}, ` : ''}your role or permissions${org ? ` at ${org}` : ''} were updated by the Ontime.Build support team. Sign in to see what you can access.`,
        rows: [['Company', org], ['Role', String(m.role || '')], ['Company admin', m.is_admin ? 'Yes' : 'No']],
        ctaLabel: 'Open Ontime.Build', ctaUrl: `${SITE}/auth`, status: 'info',
      }),
      `Your Ontime.Build access${org ? ` at ${org}` : ''} was updated.`);
    return json({ sent: r.sent });
  } catch (e) {
    console.error('platform-account-notify failed', e);
    return json({ error: e instanceof Error ? e.message : 'Failed' }, 500);
  }
});

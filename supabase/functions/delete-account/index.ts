import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const BUCKETS = ['field-captures', 'co-photos', 'co-voice-notes', 'daily-log-photos', 'estimate-pdfs'];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function removeUserObjects(admin: ReturnType<typeof createClient>, userId: string) {
  for (const bucket of BUCKETS) {
    try {
      const { data } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
      if (data && data.length) {
        const paths = data.filter((f) => f.id !== null).map((f) => `${userId}/${f.name}`);
        if (paths.length) await admin.storage.from(bucket).remove(paths);
      }
    } catch (_e) {
      // bucket may not exist or be empty — keep going
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, code: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ ok: false, code: 'not_authenticated' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Validate the caller's JWT in code
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const userId = userData?.user?.id;
  if (userErr || !userId) return json({ ok: false, code: 'not_authenticated' }, 401);

  // Run the data cascade as the caller so auth.uid() scopes it to their own account
  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: result, error: rpcErr } = await asUser.rpc('delete_own_account');
  if (rpcErr) {
    console.error('delete_own_account failed', rpcErr.message);
    return json({ ok: false, code: 'cascade_failed', message: rpcErr.message }, 500);
  }

  const payload = result as { ok?: boolean; code?: string; organization_id?: string } | null;
  if (!payload?.ok) {
    return json({ ok: false, code: payload?.code ?? 'cascade_failed', organization_id: payload?.organization_id }, 400);
  }

  await removeUserObjects(admin, userId);

  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    console.error('auth.admin.deleteUser failed', delErr.message);
    return json({ ok: false, code: 'auth_delete_failed', message: delErr.message }, 500);
  }

  return json({ ok: true });
});

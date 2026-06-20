// Public, token-validated access to a single CO for external approval / invite response.
// Bypasses RLS via the service role only AFTER verifying the caller supplied the matching token.
// Replaces the previous over-permissive anon RLS policies on `change_orders`
// and `co_external_invites` (read/update by any anon if a token exists).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Constant-time string compare to mitigate token-guess timing attacks
function safeEq(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = String(payload?.action ?? "");
  const token = String(payload?.token ?? "");
  if (!isUuid(token)) return json({ error: "Invalid token" }, 400);

  try {
    switch (action) {
      case "load_approval":
        return await loadApproval(token);
      case "submit_approval":
        return await submitApproval(token, payload);
      case "load_invite":
        return await loadInvite(token);
      case "submit_invite_response":
        return await submitInviteResponse(token, payload);
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e: any) {
    console.error("co-public-access error:", e?.message ?? e);
    return json({ error: "Server error" }, 500);
  }
});

// ── Approval (owner / architect) ──────────────────────────────────────

async function findApprovalCO(token: string) {
  // Fetch any CO whose owner or architect token matches.
  const { data: byOwner } = await admin
    .from("change_orders")
    .select("id, title, co_number, tc_submitted_price, total_tax, owner_approval_status, owner_approval_token, architect_approval_status, architect_approval_token")
    .eq("owner_approval_token", token)
    .maybeSingle();
  if (byOwner && safeEq(byOwner.owner_approval_token ?? "", token)) {
    return { co: byOwner, type: "owner" as const };
  }
  const { data: byArch } = await admin
    .from("change_orders")
    .select("id, title, co_number, tc_submitted_price, total_tax, owner_approval_status, owner_approval_token, architect_approval_status, architect_approval_token")
    .eq("architect_approval_token", token)
    .maybeSingle();
  if (byArch && safeEq(byArch.architect_approval_token ?? "", token)) {
    return { co: byArch, type: "architect" as const };
  }
  return null;
}

async function loadApproval(token: string) {
  const hit = await findApprovalCO(token);
  if (!hit) return json({ error: "Invalid or expired link" }, 404);
  const { co, type } = hit;
  // Do NOT echo the raw tokens back.
  return json({
    approval_type: type,
    co: {
      id: co.id,
      title: co.title,
      co_number: co.co_number,
      tc_submitted_price: co.tc_submitted_price,
      total_tax: co.total_tax,
      owner_approval_status: co.owner_approval_status,
      architect_approval_status: co.architect_approval_status,
    },
  });
}

async function submitApproval(token: string, payload: any) {
  const hit = await findApprovalCO(token);
  if (!hit) return json({ error: "Invalid or expired link" }, 404);
  const { co, type } = hit;

  const decision = payload?.decision === "approved" ? "approved"
    : payload?.decision === "rejected" ? "rejected" : null;
  if (!decision) return json({ error: "Invalid decision" }, 400);

  const approverName = String(payload?.approver_name ?? "").trim().slice(0, 200);
  if (!approverName) return json({ error: "Approver name required" }, 400);

  const rejectionNote = decision === "rejected"
    ? String(payload?.rejection_note ?? "").trim().slice(0, 2000)
    : null;
  if (decision === "rejected" && !rejectionNote) {
    return json({ error: "Rejection note required" }, 400);
  }

  const prefix = type; // 'owner' | 'architect'
  const update: Record<string, unknown> = {
    [`${prefix}_approval_status`]: decision,
    [`${prefix}_approver_name`]: approverName,
  };
  if (decision === "approved") {
    update[`${prefix}_approved_at`] = new Date().toISOString();
  } else {
    update[`${prefix}_rejection_note`] = rejectionNote;
  }

  const { error } = await admin
    .from("change_orders")
    .update(update)
    .eq("id", co.id)
    .eq(`${prefix}_approval_token`, token);
  if (error) return json({ error: "Update failed" }, 500);

  // If both approvals are now finalized -> contracted
  if (decision === "approved") {
    const { data: latest } = await admin
      .from("change_orders")
      .select("owner_approval_status, architect_approval_status, status")
      .eq("id", co.id)
      .single();
    if (latest) {
      const ownerDone = latest.owner_approval_status === "not_required" || latest.owner_approval_status === "approved";
      const archDone = latest.architect_approval_status === "not_required" || latest.architect_approval_status === "approved";
      if (ownerDone && archDone && latest.status !== "contracted") {
        await admin
          .from("change_orders")
          .update({ status: "contracted", contracted_at: new Date().toISOString() })
          .eq("id", co.id);
      }
    }
  }

  return json({ ok: true, decision });
}

// ── External invite ───────────────────────────────────────────────────

async function loadInvite(token: string) {
  const { data: inv } = await admin
    .from("co_external_invites")
    .select("id, co_id, email, invite_purpose, responded_at, response_data, respondent_name, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!inv) return json({ error: "Invalid link" }, 404);
  if (new Date(inv.expires_at).getTime() < Date.now()) {
    return json({ error: "This invitation has expired" }, 410);
  }

  const { data: co } = await admin
    .from("change_orders")
    .select("id, co_number, title, status, document_type, location_tag, reason_note, pricing_type")
    .eq("id", inv.co_id)
    .maybeSingle();
  const { data: lineItems } = await admin
    .from("co_line_items")
    .select("id, item_name, description, unit")
    .eq("co_id", inv.co_id)
    .order("sort_order");

  return json({
    invite: inv,
    co: co ?? null,
    line_items: lineItems ?? [],
  });
}

async function submitInviteResponse(token: string, payload: any) {
  const { data: inv } = await admin
    .from("co_external_invites")
    .select("id, co_id, email, invite_purpose, responded_at, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!inv) return json({ error: "Invalid link" }, 404);
  if (new Date(inv.expires_at).getTime() < Date.now()) {
    return json({ error: "Expired" }, 410);
  }
  if (inv.responded_at) {
    return json({ error: "Already responded" }, 409);
  }

  const respondentName = String(payload?.respondent_name ?? "").trim().slice(0, 200);
  const respondentEmail = String(payload?.respondent_email ?? "").trim().slice(0, 320);
  if (!respondentName || !respondentEmail) {
    return json({ error: "Name and email required" }, 400);
  }
  // Trust the server-side invite purpose, not the client-provided one.
  const responseData = {
    purpose: inv.invite_purpose,
    notes: String(payload?.notes ?? "").slice(0, 5000),
    submitted_at: new Date().toISOString(),
    respondent_email: respondentEmail,
    line_item_pricing: Array.isArray(payload?.line_item_pricing)
      ? payload.line_item_pricing.slice(0, 500)
      : undefined,
    total_price: typeof payload?.total_price === "number" ? payload.total_price : undefined,
    scope_acknowledged: typeof payload?.scope_acknowledged === "boolean" ? payload.scope_acknowledged : undefined,
  };

  const { error } = await admin
    .from("co_external_invites")
    .update({
      responded_at: new Date().toISOString(),
      response_data: responseData,
      respondent_name: respondentName,
    })
    .eq("id", inv.id)
    .eq("token", token);
  if (error) return json({ error: "Update failed" }, 500);

  await admin.from("co_activity").insert({
    co_id: inv.co_id,
    actor_user_id: null,
    actor_role: "EXT",
    action: "external_response",
    detail: `External response from ${respondentName} (${respondentEmail}) — ${inv.invite_purpose}`,
  });

  return json({ ok: true });
}

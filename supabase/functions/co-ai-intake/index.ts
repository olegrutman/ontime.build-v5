// co-ai-intake — async job pattern.
//
// POST { project_id, source_kind, raw_text?, voice_url? }
//   1. Insert co_ai_intakes row with status='pending', return { intake_id } immediately.
//   2. Run the model call inside EdgeRuntime.waitUntil(...) and write
//      output_json + status='succeeded' (or 'failed' + error_message) when done.
//
// Client polls co_ai_intakes by intake_id until status != 'pending'.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

// Faster model, smaller cap. Splitting prose into ~3-10 line items doesn't
// need 2.5-flash; 3-flash-preview returns in ~1-2s for this shape.
const MODEL = "google/gemini-3-flash-preview";

const SYSTEM_PROMPT = `You split a contractor change-order request into reviewable line items.

Return strict JSON: { "lines": [ {
  "order": number,
  "title": string,          // <= 80 chars, action-led
  "problem": string,        // 1-2 sentences, plain English
  "location_hint": string|null,  // e.g. "2nd floor bath", "north wall"
  "qty": number|null,
  "unit": string|null,      // EA, LF, SF, HR, LS
  "group_key": string|null, // share key when one logical item fans out
  "confidence": number      // 0..1
} ] }

Rules:
- Split only on real scope changes; do not invent items.
- Keep titles short and concrete. No prices, no markup, no schedule talk.
- If qty is unclear, set qty=null and unit=null.
- Max 12 lines. Prefer fewer, clearer items.`;

interface ModelLine {
  order: number;
  title: string;
  problem: string;
  location_hint: string | null;
  qty: number | null;
  unit: string | null;
  group_key: string | null;
  confidence: number;
}

async function callModel(rawText: string): Promise<ModelLine[]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: rawText.slice(0, 8000) },
      ],
      response_format: { type: "json_object" },
      max_tokens: 900,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`gateway ${res.status}: ${errBody.slice(0, 400)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  const lines = Array.isArray(parsed?.lines) ? parsed.lines : [];

  return lines.slice(0, 12).map((l: any, i: number) => ({
    order: typeof l.order === "number" ? l.order : i + 1,
    title: String(l.title ?? "").slice(0, 200),
    problem: String(l.problem ?? "").slice(0, 800),
    location_hint: l.location_hint ?? null,
    qty: typeof l.qty === "number" ? l.qty : null,
    unit: l.unit ?? null,
    group_key: l.group_key ?? null,
    confidence:
      typeof l.confidence === "number"
        ? Math.max(0, Math.min(1, l.confidence))
        : 0.7,
  }));
}

async function processIntake(intakeId: string, rawText: string) {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  try {
    const lines = await callModel(rawText);
    await admin
      .from("co_ai_intakes")
      .update({
        status: "succeeded",
        model: MODEL,
        output_json: { lines },
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId);
  } catch (err) {
    await admin
      .from("co_ai_intakes")
      .update({
        status: "failed",
        error_message: String(err?.message ?? err).slice(0, 1000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const projectId: string | undefined = body?.project_id;
    const sourceKind: string = body?.source_kind ?? "paste";
    const rawText: string = (body?.raw_text ?? "").toString();
    const voiceUrl: string | null = body?.voice_url ?? null;

    if (!projectId || (sourceKind === "paste" && rawText.trim().length === 0)) {
      return new Response(JSON.stringify({ error: "missing project_id or raw_text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Resolve org_id from user's org membership for this project's space.
    // We just need any org the user belongs to; the row's org_id is bookkeeping.
    const { data: roleRow } = await admin
      .from("user_org_roles")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const orgId = roleRow?.organization_id;
    if (!orgId) {
      return new Response(JSON.stringify({ error: "no org membership" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: intake, error: insErr } = await admin
      .from("co_ai_intakes")
      .insert({
        project_id: projectId,
        org_id: orgId,
        created_by: user.id,
        source_kind: sourceKind,
        raw_text: rawText.slice(0, 8000),
        voice_url: voiceUrl,
        status: "pending",
      })
      .select("id")
      .single();

    if (insErr || !intake) {
      return new Response(
        JSON.stringify({ error: insErr?.message ?? "insert failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Kick off model call in the background; respond immediately.
    // @ts-ignore — EdgeRuntime is provided by Supabase runtime.
    EdgeRuntime.waitUntil(processIntake(intake.id, rawText));

    return new Response(
      JSON.stringify({ intake_id: intake.id, status: "pending" }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

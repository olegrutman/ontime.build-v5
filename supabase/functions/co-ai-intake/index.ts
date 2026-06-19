// CO v4 — AI Intake
// GC pastes (or voice-transcribes) a messy owner/architect request.
// We split it into reviewable CO line item proposals using the platform catalog
// + project context as grounding. The result is persisted in co_ai_intakes;
// nothing is written to change_orders yet — the GC reviews + finalizes in the UI.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You split messy owner/architect/GC requests into discrete change-order line items
for a construction PM app. Output STRICT JSON. Never invent catalog items — use exact slugs from the catalog provided.

Rules:
1. One discrete change of scope = one line. Group multi-unit identical work into a single line with a group_key and qty.
2. Pick the closest catalog item by slug. If no good match, set catalog_slug=null and provide a clear title + unit.
3. Title: 4-10 words, action-first ("Replace water-damaged subfloor at L2 bath").
4. Problem: 1 sentence from the source text only — do not invent damage, scope, or context.
5. location_hint: free text echoing what the source said about where (unit numbers, room, elevation). null if unknown.
6. qty + unit: only fill if the source clearly states or strongly implies them.
7. confidence 0..1; reasoning 1 sentence.
8. Use scenario_id from the scenario library when one clearly matches; otherwise null.
9. Cap at 12 lines. If the source is one cohesive change, return 1 line.
10. If the source has no scope content (greeting only, etc.), return lines: [].`;

interface Body {
  project_id: string;
  source_kind: "paste" | "voice";
  raw_text?: string;
  voice_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "missing_auth" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Per-request auth client to identify the user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "invalid_auth" }, 401);
    const user = userData.user;

    const body = (await req.json()) as Body;
    if (!body?.project_id || !body?.source_kind) return json({ error: "bad_request" }, 400);
    const text = (body.raw_text ?? "").trim();
    if (body.source_kind === "paste" && text.length < 5) return json({ error: "text_too_short" }, 400);

    // Service client for DB writes that bypass RLS noise (we still gate via auth above)
    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve org for this project + user via user_org_roles → project_participants
    const { data: userOrgs } = await supabase
      .from("user_org_roles")
      .select("organization_id")
      .eq("user_id", user.id);
    const orgIds = (userOrgs ?? []).map((r) => r.organization_id);
    if (orgIds.length === 0) return json({ error: "no_org" }, 403);

    const { data: membership } = await supabase
      .from("project_participants")
      .select("organization_id")
      .eq("project_id", body.project_id)
      .in("organization_id", orgIds)
      .eq("invite_status", "ACCEPTED")
      .maybeSingle();

    const orgId = membership?.organization_id;
    if (!orgId) return json({ error: "not_a_participant" }, 403);

    // Insert pending intake row up front so we can return its id even if AI fails
    const { data: intake, error: intakeErr } = await supabase
      .from("co_ai_intakes")
      .insert({
        project_id: body.project_id,
        org_id: orgId,
        created_by: user.id,
        source_kind: body.source_kind,
        raw_text: text || null,
        voice_url: body.voice_url ?? null,
        status: "pending",
        model: "google/gemini-2.5-flash",
      })
      .select("id")
      .single();
    if (intakeErr || !intake) {
      console.error("intake insert failed", intakeErr);
      return json({ error: "intake_insert_failed" }, 500);
    }

    // Grounding: platform catalog (slim) + scenarios available to this org
    const [{ data: catalog }, { data: scenarios }] = await Promise.all([
      supabase
        .from("catalog_definitions")
        .select("slug, canonical_name, unit, division, category, applicable_zone")
        .is("deprecated_at", null)
        .order("division")
        .limit(400),
      supabase
        .from("co_scenarios")
        .select("id, name, problem_tags, system_tag, default_unit")
        .or(`is_platform.eq.true,org_id.eq.${orgId}`)
        .limit(200),
    ]);

    const userMsg = [
      `Source text:\n"""${text}"""`,
      "",
      `Catalog (slug | name | unit | division | zone):`,
      (catalog ?? []).map((c) => `${c.slug} | ${c.canonical_name} | ${c.unit} | ${c.division} | ${c.applicable_zone ?? "any"}`).join("\n"),
      "",
      `Scenarios (id | name | tags):`,
      (scenarios ?? []).map((s) => `${s.id} | ${s.name} | ${(s.problem_tags ?? []).join(",")}`).join("\n") || "(none)",
      "",
      `Respond as JSON: {"lines":[{"title":"...","problem":"...","catalog_slug":"..."|null,"scenario_id":"..."|null,"location_hint":"..."|null,"qty":number|null,"unit":"..."|null,"group_key":"..."|null,"confidence":0..1,"reasoning":"..."}]}`,
    ].join("\n");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (aiResp.status === 429 || aiResp.status === 402) {
      await supabase.from("co_ai_intakes").update({
        status: "failed",
        error_message: aiResp.status === 429 ? "rate_limited" : "credits_exhausted",
      }).eq("id", intake.id);
      return json({ error: aiResp.status === 429 ? "rate_limited" : "credits_exhausted", intake_id: intake.id }, aiResp.status);
    }

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway error", aiResp.status, txt);
      await supabase.from("co_ai_intakes").update({ status: "failed", error_message: `ai_${aiResp.status}` }).eq("id", intake.id);
      return json({ error: "ai_unavailable", intake_id: intake.id }, 200);
    }

    const aiData = await aiResp.json();
    const raw = aiData.choices?.[0]?.message?.content?.trim() ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); }
    catch (e) {
      console.error("AI JSON parse failed", e);
      await supabase.from("co_ai_intakes").update({ status: "failed", error_message: "parse_failed" }).eq("id", intake.id);
      return json({ error: "parse_failed", intake_id: intake.id }, 200);
    }

    const lines = Array.isArray(parsed.lines) ? parsed.lines.slice(0, 12) : [];
    const catBySlug = new Map((catalog ?? []).map((c) => [c.slug, c]));

    const validated = lines.map((l: any, i: number) => {
      const cat = l?.catalog_slug ? catBySlug.get(l.catalog_slug) : null;
      return {
        order: i,
        title: typeof l?.title === "string" ? l.title.slice(0, 200) : "Untitled change",
        problem: typeof l?.problem === "string" ? l.problem.slice(0, 500) : "",
        catalog_slug: cat ? l.catalog_slug : null,
        catalog_name: cat?.canonical_name ?? null,
        scenario_id: typeof l?.scenario_id === "string" ? l.scenario_id : null,
        location_hint: typeof l?.location_hint === "string" ? l.location_hint : null,
        qty: typeof l?.qty === "number" ? l.qty : null,
        unit: typeof l?.unit === "string" ? l.unit : cat?.unit ?? null,
        group_key: typeof l?.group_key === "string" ? l.group_key : null,
        confidence: typeof l?.confidence === "number" ? Math.max(0, Math.min(1, l.confidence)) : 0.5,
        reasoning: typeof l?.reasoning === "string" ? l.reasoning : "",
      };
    });

    const output = { lines: validated };

    await supabase.from("co_ai_intakes").update({
      status: "succeeded",
      output_json: output,
    }).eq("id", intake.id);

    return json({ intake_id: intake.id, ...output });
  } catch (e) {
    console.error("co-ai-intake error", e);
    return json({ error: "server_error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

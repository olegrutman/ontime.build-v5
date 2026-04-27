import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a scope-item matcher for framing contractors using Ontime.Build. Your job
is to read a short description of a construction situation (damage, addition, demo, or
rework) and return 3–6 catalog items from the platform catalog that best describe
the work needed.

You receive:
- A description of what happened (plain English)
- Location tag (e.g. "Interior · L2 · Master Bath · Floor joists")
- Zone slug, reason code, work type, building type, framing method
- Work intent (one of: repair_damage, add_new, modify_existing, redo_work,
  tear_out, envelope_work, structural_install, mep_blocking, inspection_fix, other)
- Optionally: structured answers from a Q&A flow
- The full platform catalog of ~110 items with slugs, names, zones, and applicable reasons

Rules:
1. NEVER invent items not in the catalog. Use exact slugs.
2. Rank by confidence (0..1). Top pick should usually be >0.85 for clear descriptions.
3. Provide a one-sentence reasoning per pick, using framing vocabulary appropriate
   to the building type (residential vs MF vs commercial metal stud).
4. Extract quantity if the description contains a number + unit. Prefer the unit
   that matches the catalog item's unit field.
5. For multifamily/commercial, flag rated-assembly concerns in warnings.
6. For exterior/water damage, flag WRB investigation in warnings if rot is plausible.
7. INTENT-AWARE RANKING (critical):
   - When intent is "tear_out": prioritize demolition / removal / tear-off /
     disposal / shoring catalog items. Do NOT suggest generic "scope addition"
     or placeholder items unless no demolition catalog item exists.
   - When intent is "envelope_work": prioritize WRB, flashing, sheathing,
     siding, membrane items.
   - When intent is "structural_install": prioritize beam, post, hold-down,
     shear-wall, hardware items.
   - When intent is "repair_damage" or "redo_work": prioritize like-for-like
     replacement of the affected member.
8. Return valid JSON only. No markdown, no preamble.`;

interface SuggestBody {
  project_id: string;
  description: string;
  location_tag: string;
  zone: string | null;
  reason: string;
  work_type: string | null;
  building_type: string;
  framing_method: string | null;
  intent?: string | null;
  answers?: Record<string, string | string[]>;
  photo_urls?: string[];
  recent_co_items?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = (await req.json()) as SuggestBody;
    if (!body?.project_id || !body?.description) {
      return new Response(
        JSON.stringify({ error: "project_id and description are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Pull the active platform catalog for grounding
    const { data: catalog, error: catErr } = await supabase
      .from("catalog_definitions")
      .select("id, slug, canonical_name, unit, applicable_zone, applicable_reasons, applicable_work_types, division, category")
      .is("deprecated_at", null)
      .order("division");

    if (catErr) {
      console.error("catalog fetch error:", catErr);
      return new Response(
        JSON.stringify({ picks: [], extracted: null, warnings: ["catalog_unavailable"] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const catalogJson = JSON.stringify(catalog ?? []);

    const userMsg = [
      `Description: ${body.description}`,
      `Location tag: ${body.location_tag}`,
      `Zone: ${body.zone ?? "unknown"}`,
      `Reason: ${body.reason}`,
      `Work type: ${body.work_type ?? "unspecified"}`,
      `Work intent: ${body.intent ?? "unspecified"}`,
      `Building type: ${body.building_type}`,
      `Framing method: ${body.framing_method ?? "unspecified"}`,
      body.answers ? `Structured answers: ${JSON.stringify(body.answers)}` : "",
      body.recent_co_items?.length ? `Recent CO items in this project: ${body.recent_co_items.join(", ")}` : "",
      body.photo_urls?.length ? `Attached photo URLs: ${body.photo_urls.join(", ")}` : "",
      "",
      "Catalog (use these slugs and ids exactly):",
      catalogJson,
      "",
      "Respond with JSON of the shape:",
      `{"picks":[{"slug":"...","catalog_id":"...","name":"...","unit":"...","confidence":0..1,"reasoning":"...","suggested_quantity":number|null,"quantity_source":"inferred"|"answered"|null}],"extracted":{"quantity":number|null,"unit_hint":string|null,"zone_refinement":string|null},"warnings":[]}`,
    ].filter(Boolean).join("\n");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
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

    if (aiResp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit reached. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (aiResp.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, txt);
      return new Response(
        JSON.stringify({ picks: [], extracted: null, warnings: ["ai_unavailable"] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResp.json();
    const raw = aiData.choices?.[0]?.message?.content?.trim() ?? "{}";

    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse AI JSON:", e, raw);
      return new Response(
        JSON.stringify({ picks: [], extracted: null, warnings: ["ai_parse_failed"] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate picks against catalog
    const catBySlug = new Map<string, any>();
    for (const c of catalog ?? []) catBySlug.set(c.slug, c);

    const validPicks = (Array.isArray(parsed.picks) ? parsed.picks : [])
      .filter((p: any) => p?.slug && catBySlug.has(p.slug))
      .slice(0, 6)
      .map((p: any) => {
        const cat = catBySlug.get(p.slug);
        return {
          slug: p.slug,
          catalog_id: cat.id,
          name: cat.canonical_name,
          unit: cat.unit,
          confidence: typeof p.confidence === "number" ? Math.max(0, Math.min(1, p.confidence)) : 0.5,
          reasoning: typeof p.reasoning === "string" ? p.reasoning : "",
          suggested_quantity: typeof p.suggested_quantity === "number" ? p.suggested_quantity : null,
          quantity_source: p.quantity_source === "inferred" || p.quantity_source === "answered" ? p.quantity_source : null,
        };
      });

    return new Response(
      JSON.stringify({
        picks: validPicks,
        extracted: parsed.extracted ?? null,
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("suggest-scope-items error:", error);
    return new Response(
      JSON.stringify({ picks: [], extracted: null, warnings: ["server_error"] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

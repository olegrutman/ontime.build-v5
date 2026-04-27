import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LocationData {
  inside_outside?: "inside" | "outside";
  level?: string;
  unit?: string;
  room_area?: string;
  custom_room_area?: string;
  exterior_feature?: string;
  custom_exterior?: string;
}

interface ScopeItemContext {
  id?: string;
  name: string;
  qty?: number | null;
  unit?: string | null;
  category?: string | null;
  /** True when this item bundles several originals into one row. */
  combined?: boolean;
  /** Snapshot of original items merged into this combined row. */
  sub_items?: Array<{ name: string; qty?: number | null; unit?: string | null; category?: string | null }>;
}

interface ProjectContext {
  home_type?: string | null;
  framing_method?: string | null;
  floors?: number | null;
  total_sqft?: number | null;
  construction_type?: string | null;
}

interface GenerateRequest {
  /** 'per_item' returns { items: [{id, description}], summary }. Default returns { description }. */
  mode?: 'per_item' | 'single';
  work_type: string;
  location?: LocationData;
  location_tag?: string;
  project_name: string;
  project_context?: ProjectContext;
  intent?: string | null;
  intent_label?: string | null;
  qa_answers?: Record<string, unknown>;
  reason?: string;
  reason_code?: string;
  /** Legacy: array of names. Preferred: array of {id, name, qty, unit, category} */
  selected_items?: Array<string | ScopeItemContext>;
  fixing_trade_notes?: string;
  requires_materials: boolean;
  requires_equipment: boolean;
  material_responsibility?: string;
  equipment_responsibility?: string;
  structural_element?: string;
  scope_size?: string;
  urgency?: string;
  access_conditions?: string;
  existing_conditions?: string;
  rfi_context?: string;
  trigger_code?: string;
  assembly_state?: string;
}

function buildLocationDescription(location?: LocationData): string {
  if (!location) return "";
  if (location.inside_outside === "inside") {
    const parts = [];
    if (location.level) parts.push(location.level.toLowerCase());
    if (location.unit) parts.push(`unit ${location.unit}`);
    if (location.room_area === "Other" && location.custom_room_area) {
      parts.push(location.custom_room_area.toLowerCase());
    } else if (location.room_area) {
      parts.push(location.room_area.toLowerCase());
    }
    return parts.length > 0 ? parts.join(", ") : "interior";
  } else if (location.inside_outside === "outside") {
    if (location.exterior_feature === "other" && location.custom_exterior) {
      return location.custom_exterior.toLowerCase();
    }
    if (location.exterior_feature) {
      return location.exterior_feature
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
        .toLowerCase();
    }
    return "exterior";
  }
  return "";
}

/** Group items by category and format each as "name (qty unit)" when qty present */
function formatItemsForPrompt(items: Array<string | ScopeItemContext>): string {
  if (!items || items.length === 0) return "";

  // Normalize to objects
  const normalized: ScopeItemContext[] = items.map((it) =>
    typeof it === "string" ? { name: it } : it
  );

  // Group by category
  const groups = new Map<string, ScopeItemContext[]>();
  for (const item of normalized) {
    const cat = item.category?.trim() || "General";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(item);
  }

  const lines: string[] = [];
  for (const [cat, group] of groups) {
    const formatted = group.map((g) => {
      const qtyPart =
        g.qty != null && g.qty > 0
          ? ` (${g.qty}${g.unit ? ` ${g.unit}` : ""})`
          : "";
      return `${g.name}${qtyPart}`;
    });
    lines.push(`  - ${cat}: ${formatted.join(", ")}`);
  }
  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: GenerateRequest = await req.json();

    const locationDesc =
      body.location_tag || buildLocationDescription(body.location) || "unspecified location";

    // ── Per-item mode ───────────────────────────────────────
    if (body.mode === "per_item" && body.selected_items?.length) {
      const items: ScopeItemContext[] = body.selected_items.map((it) =>
        typeof it === "string" ? { name: it } : it,
      );

      const intentLine = body.intent_label ? `Intent: ${body.intent_label}` : "";
      const reasonLine = body.reason_code || body.reason ? `Reason: ${body.reason_code || body.reason}` : "";
      const qaLine = body.qa_answers && Object.keys(body.qa_answers).length
        ? `QA answers: ${JSON.stringify(body.qa_answers)}`
        : "";

      const itemList = items
        .map((i, idx) => {
          const qty = i.qty != null && i.qty > 0 ? `${i.qty}${i.unit ? " " + i.unit : ""}` : "";
          return `${idx + 1}. id=${i.id ?? `idx${idx}`} | name="${i.name}" | category="${i.category ?? ""}" | qty="${qty}"`;
        })
        .join("\n");

      const perItemSystem = `You are a precise construction scope writer.
Return STRICT JSON: { "items": [ { "id": "<exact id>", "description": "<1-2 sentences>" } ], "summary": "<one short sentence summarizing the whole CO>" }.

Rules:
1. Output one description per scope item, keyed by the exact id provided. No extra items, no missing items.
2. Each description is 1-2 sentences, plain prose, grounded ONLY in: the item name, the location, the intent, and the QA answers provided.
3. Mention the location and what makes this specific item necessary (intent + relevant QA detail).
4. If a quantity/unit is provided for an item, include it inline (e.g. "120 SF").
5. Do NOT invent dimensions, materials, methods, sequencing, pricing, schedules, or items.
6. Do NOT add caveats, recommendations, or pleasantries.
7. Output JSON only — no markdown fences, no commentary.`;

      const perItemUser = `Project: ${body.project_name}
Location: ${locationDesc}
${intentLine}
${reasonLine}
${qaLine}

Scope items:
${itemList}`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: perItemSystem },
            { role: "user", content: perItemUser },
          ],
          max_tokens: 800,
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      });

      if (!aiResp.ok) {
        const txt = await aiResp.text();
        console.error("per-item AI error:", aiResp.status, txt);
        // Fallback: synthesize minimal per-item descriptions locally
        const fallback = items.map((i, idx) => ({
          id: i.id ?? `idx${idx}`,
          description: `${i.name}${i.qty ? ` (${i.qty}${i.unit ? " " + i.unit : ""})` : ""} at ${locationDesc}${body.intent_label ? ` — ${body.intent_label.toLowerCase()}` : ""}.`,
        }));
        return new Response(JSON.stringify({ items: fallback, summary: "" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiJson = await aiResp.json();
      const raw = aiJson.choices?.[0]?.message?.content?.trim() || "{}";
      let parsed: { items?: Array<{ id: string; description: string }>; summary?: string } = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = {};
      }

      // Ensure every requested id has a description; fill missing with fallback.
      const byId = new Map((parsed.items ?? []).map((r) => [r.id, r.description]));
      const finalItems = items.map((i, idx) => {
        const id = i.id ?? `idx${idx}`;
        return {
          id,
          description:
            byId.get(id) ||
            `${i.name}${i.qty ? ` (${i.qty}${i.unit ? " " + i.unit : ""})` : ""} at ${locationDesc}.`,
        };
      });

      return new Response(JSON.stringify({ items: finalItems, summary: parsed.summary ?? "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }



    const itemsBlock = body.selected_items?.length
      ? formatItemsForPrompt(body.selected_items)
      : body.structural_element || "";

    const reason = body.reason_code || body.reason || "";
    const itemCount = body.selected_items?.length ?? 0;

    // Build project context lines
    const projParts: string[] = [];
    const pc = body.project_context;
    if (pc?.home_type) projParts.push(`home type: ${pc.home_type}`);
    if (pc?.framing_method) projParts.push(`framing: ${pc.framing_method}`);
    if (pc?.floors) projParts.push(`${pc.floors} floors`);
    if (pc?.total_sqft) projParts.push(`${pc.total_sqft} SF`);
    if (pc?.construction_type) projParts.push(pc.construction_type);
    const projectContextLine = projParts.length ? projParts.join(", ") : "";

    const contextParts = [
      `Project: ${body.project_name}`,
      projectContextLine ? `Project context: ${projectContextLine}` : "",
      `Work type: ${body.work_type}`,
      `Location: ${locationDesc}`,
    ].filter(Boolean);

    if (itemsBlock) contextParts.push(`Scope items (${itemCount}):\n${itemsBlock}`);
    if (reason) contextParts.push(`Reason: ${reason}`);
    if (body.trigger_code) contextParts.push(`Trigger: ${body.trigger_code}`);
    if (body.assembly_state) contextParts.push(`Assembly state: ${body.assembly_state}`);
    if (body.existing_conditions) contextParts.push(`Conditions: ${body.existing_conditions}`);
    if (body.rfi_context) contextParts.push(`RFI context: ${body.rfi_context}`);
    if (body.requires_materials && body.material_responsibility) {
      contextParts.push(`Materials: ${body.material_responsibility} responsible`);
    }
    if (body.requires_equipment && body.equipment_responsibility) {
      contextParts.push(`Equipment: ${body.equipment_responsibility} responsible`);
    }

    const systemPrompt = `You are a precise construction scope writer. Output ONLY 2-4 sentences of plain prose (no bullets, no headings).

Rules — follow strictly:
1. Name the project exactly once using the exact project name provided ("the {project_name}"). Do not abbreviate or invent variants.
2. State the location exactly as provided.
3. Enumerate EVERY scope item by its exact name. Do NOT collapse multiple items into vague phrases like "siding work" or "various tasks".
4. When 4+ items are provided, group them by their category in the input ("Framing tasks include X, Y, Z. Sheathing tasks include A, B.").
5. When a quantity and unit are provided for an item, include them inline (e.g. "120 SF of sheathing replacement").
6. State the reason in plain language at the end ("...due to {reason}.").
7. Do NOT invent items, dimensions, materials, methods, sequencing, pricing, or scheduling that are not in the input.
8. Do NOT add caveats, recommendations, or pleasantries.`;

    const userPrompt = `Write the scope description from this data:\n\n${contextParts.join("\n")}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 400,
          temperature: 0.2,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate description");
    }

    const aiResponse = await response.json();
    const description =
      aiResponse.choices?.[0]?.message?.content?.trim() ||
      "Unable to generate description. Please write manually.";

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating work order description:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

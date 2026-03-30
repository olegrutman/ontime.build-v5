import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildFloorLabels(profile: any): string[] {
  const floors: string[] = [];
  const stories = profile.stories || 1;
  const foundationTypes: string[] = profile.foundation_types || [];
  const hasBasement = foundationTypes.some((f: string) => f.toLowerCase().includes("basement"));

  if (hasBasement) floors.push("Basement");
  for (let i = 1; i <= stories; i++) floors.push(`Floor ${i}`);
  floors.push("Roof");
  floors.push("Exterior");
  if (profile.has_garage) floors.push("Garage");
  if (profile.has_deck_balcony || profile.has_covered_porch) floors.push("Decks / Porches");
  if (profile.has_stairs && stories > 1) floors.push("Stairs");
  floors.push("Punch / Misc");

  return floors;
}

function buildProfileContext(profile: any, pt: any): string {
  const stories = profile.stories || 1;
  const foundationTypes: string[] = profile.foundation_types || [];
  const hasBasement = foundationTypes.some((f: string) => f.toLowerCase().includes("basement"));
  const isMultifamily = pt?.is_multifamily;
  const isSingleFamily = pt?.is_single_family;
  const elevationNaming = isMultifamily ? "South/North/East/West" : "Front/Rear/Left/Right";

  const features: string[] = [];
  if (profile.has_garage) features.push(`Garage (${profile.garage_car_count || 2}-car, types: ${(profile.garage_types || []).join(", ") || "standard"})`);
  if (hasBasement) features.push(`Basement (${profile.basement_type || "Standard"})`);
  if (profile.has_stairs) features.push(`Stairs (${(profile.stair_types || []).join(", ") || "standard"})`);
  if (profile.has_deck_balcony) features.push("Decks & Balconies");
  if (profile.has_covered_porch) features.push("Covered Porch");
  if (profile.has_pool) features.push("Pool");
  if (profile.has_elevator) features.push("Elevator");
  if (profile.has_clubhouse) features.push("Clubhouse");
  if (profile.has_commercial_spaces) features.push("Commercial Spaces");
  if (profile.has_shed) features.push("Shed / Outbuilding");

  // Scope details
  const scopeLines: string[] = [];
  if (profile.scope_wrb) scopeLines.push(`WRB: Yes (${profile.wrb_type || "standard"})`);
  if (profile.scope_siding) scopeLines.push(`Siding: Yes (type: ${profile.siding_type || "unknown"}, elevation naming: ${elevationNaming})`);
  if (profile.scope_exterior_trim) scopeLines.push(`Exterior Trim: Yes (${profile.exterior_trim_type || "standard"})`);
  if (profile.scope_soffit_fascia) scopeLines.push(`Soffit & Fascia: Yes (soffit: ${profile.soffit_type || "standard"}, fascia: ${profile.fascia_type || "standard"})`);
  if (profile.scope_windows_install) scopeLines.push("Windows Install: Yes");
  if (profile.scope_patio_doors) scopeLines.push("Patio Doors: Yes");
  if (profile.scope_garage_framing) scopeLines.push(`Garage Framing: Yes`);

  // Backout details
  if (profile.scope_backout) {
    const backoutParts: string[] = [];
    if (profile.scope_backout_blocking) {
      const items = (profile.scope_backout_blocking_items || []).join(", ");
      backoutParts.push(`Blocking (${items || "general"})`);
    }
    if (profile.scope_backout_shimming) backoutParts.push("Shimming");
    if (profile.scope_backout_stud_repair) backoutParts.push("Stud Repair");
    if (profile.scope_backout_nailer_plates) backoutParts.push("Nailer Plates");
    if (profile.scope_backout_pickup_framing) backoutParts.push("Pickup Framing");
    scopeLines.push(`Backout: Yes (${backoutParts.join(", ")})`);
  }

  return `PROJECT PROFILE:
Project type: ${pt?.name || "Unknown"}
Stories: ${stories}
Has basement: ${hasBasement}${hasBasement ? ` (type: ${profile.basement_type || "Standard"})` : ""}
${profile.units_per_building ? `Units per building: ${profile.units_per_building}` : ""}
${profile.number_of_buildings > 1 ? `Number of buildings: ${profile.number_of_buildings}` : ""}
Framing system: ${profile.framing_system || "Stick Frame"}
Floor system: ${profile.floor_system || "Not specified"}
Roof system: ${profile.roof_type || "Not specified"}
Foundation: ${foundationTypes.join(", ") || "Not specified"}
is_single_family: ${isSingleFamily}
is_multifamily: ${isMultifamily}
Active features: ${features.length > 0 ? features.join("; ") : "None"}

SCOPE INCLUSIONS:
${scopeLines.length > 0 ? scopeLines.join("\n") : "No specific scope flags set"}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { project_id, contract_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch contract
    let contractQuery = admin.from("project_contracts").select("id, contract_sum, retainage_percent, from_role, to_role").eq("project_id", project_id);
    if (contract_id) contractQuery = contractQuery.eq("id", contract_id);
    const contractRes = await contractQuery.limit(1).maybeSingle();

    // Fetch profile, scope, team
    const [profileRes, scopeRes, teamRes] = await Promise.all([
      admin.from("project_profiles").select("*, project_types(name, slug, is_multifamily, is_single_family)").eq("project_id", project_id).maybeSingle(),
      admin.from("project_scope_selections").select("scope_item_id, scope_items(label, scope_sections(slug, label))").eq("project_id", project_id).eq("is_on", true),
      admin.from("project_team").select("user_id").eq("project_id", project_id).eq("user_id", user.id).eq("status", "Accepted").maybeSingle(),
    ]);

    if (!teamRes.data) {
      return new Response(JSON.stringify({ error: "Not a team member" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const profile = profileRes.data;
    const contract = contractRes.data;

    // Filter scope items for FC contracts
    let scopeItems = scopeRes.data || [];
    if (contract_id && contract) {
      const isFCContract = contract.from_role === 'Field Crew' || contract.to_role === 'Field Crew';
      if (isFCContract) {
        const { data: assignments } = await admin
          .from("project_scope_assignments")
          .select("scope_item_id, assigned_role")
          .eq("project_id", project_id);
        if (assignments && assignments.length > 0) {
          const fcIds = new Set(assignments.filter((a: any) => a.assigned_role === 'Field Crew').map((a: any) => a.scope_item_id));
          scopeItems = scopeItems.filter((s: any) => fcIds.has(s.scope_item_id));
        }
      }
    }

    if (!profile || !contract?.contract_sum) {
      return new Response(JSON.stringify({ error: "Missing profile or contract" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const pt = (profile as any).project_types;

    // Build scope sections string
    const sectionMap: Record<string, { label: string; items: string[] }> = {};
    for (const s of scopeItems) {
      const sec = (s as any).scope_items?.scope_sections;
      const itemLabel = (s as any).scope_items?.label;
      if (!sec || !itemLabel) continue;
      if (!sectionMap[sec.slug]) sectionMap[sec.slug] = { label: sec.label, items: [] };
      sectionMap[sec.slug].items.push(itemLabel);
    }

    let scopeStr = "";
    for (const [slug, { label, items }] of Object.entries(sectionMap)) {
      scopeStr += `\nSection: ${label}\n`;
      for (const item of items) scopeStr += `- ${item}\n`;
    }

    // Build floor labels and profile context
    const floorLabels = buildFloorLabels(profile);
    const profileContext = buildProfileContext(profile, pt);

    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const systemPrompt = `You are an expert construction cost estimator specializing in framing and exterior subcontracts. Generate a floor-based Schedule of Values (SOV) for a framing/exterior subcontractor.

CORE PRINCIPLE: The SOV must represent HOW THE BUILD HAPPENS IN REAL LIFE — organized by floors, then categories within each floor. NOT abstract accounting buckets.

FLOOR STRUCTURE:
The SOV must use these exact floor_label values: ${JSON.stringify(floorLabels)}

PERCENTAGE DISTRIBUTION RULES:
- Floor levels (Basement + Floor 1..N) combined: 60–80% of total
- Roof: 8–15%
- Exterior: 3–10% (only if exterior scope items exist)
- Garage: only if garage is included in scope
- Decks/Porches: only if present
- Stairs: only if multi-story
- Punch / Misc: 1–5% (always present)

WITHIN EACH FLOOR LEVEL, include categories as appropriate:
- Layout (5–10% of floor)
- Walls (30–45% of floor) — adjust down for Pre-Fabricated/Panelized walls
- Floor System (20–35% of floor) — adjust up for Floor Trusses
- Sheathing (15–25% of floor)
- Backout (per floor, with specific sub-items if provided)
- Hardware & Holdowns

SCOPE-DRIVEN ADJUSTMENTS:
- Pre-Fabricated Walls → reduce wall %, increase installation %
- Floor Trusses → increase floor system %
- Stick Frame Roof → increase roof %
- Trusses Roof → standard distribution
- Hardie siding → higher % than vinyl
- PVC soffit/fascia → higher % than aluminum
- Composite decking → higher % than wood

SIDING RULES:
- Break out siding by elevation (Front/Rear/Left/Right for single family, South/North/East/West for multifamily)
- If garage exists, add a "Siding — Garage" line under the Garage floor_label

WRB RULES:
- WRB is ALWAYS its own standalone line under "Exterior". Never merge with windows or siding.

BACKOUT RULES:
- One backout line per floor level (NOT global)
- Include the specific backout sub-items in the item name if provided

CRITICAL RULES:
1. Every line must have a floor_label from the provided list
2. Roof trusses should be the HIGHEST single line item
3. Pre-pour embeds: max 0.5% single building, 0.6% multi-building
4. Punchlist: 0.3–0.5% max
5. All percentages must sum to exactly 100.00%
6. Do not add lines for scope not included

OUTPUT FORMAT: Return a JSON array only (no markdown, no explanation). Each element:
{"item_name": "string", "group": "string", "percent": number, "scope_section_slug": "string", "floor_label": "string"}

The "group" field is a category within the floor (e.g., "Layout", "Walls", "Floor System", "Sheathing", "Backout", "Hardware", "Trusses", "WRB", "Siding", "Trim", "Soffit & Fascia", "Framing", "Punchlist").
The "floor_label" must be one of: ${JSON.stringify(floorLabels)}`;

    const userMessage = `Generate a floor-based Schedule of Values for this project.

CONTRACT:
Contract value: $${contract.contract_sum.toLocaleString()}
Retainage: ${contract.retainage_percent || 0}%

${profileContext}

ACTIVE SCOPE ITEMS (from scope catalog):
${scopeStr || "No catalog scope items selected — use profile scope flags above."}

FLOOR LABELS TO USE: ${JSON.stringify(floorLabels)}

IMPORTANT: Generate SOV lines grouped by floor. Each line must have a floor_label from the list above. The SOV must cover all relevant scope and every floor level must have at least one line item.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted, please add funds" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "AI generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let lines: Array<{ item_name: string; group: string; percent: number; scope_section_slug: string; floor_label: string }>;
    try {
      lines = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return new Response(JSON.stringify({ error: "AI returned empty result" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Normalize percentages to sum to exactly 100.00%
    const rawTotal = lines.reduce((s, l) => s + l.percent, 0);
    if (Math.abs(rawTotal - 100) > 0.001) {
      const scale = 100 / rawTotal;
      for (const line of lines) {
        line.percent = Math.round(line.percent * scale * 100) / 100;
      }
      const adjusted = lines.slice(0, -1).reduce((s, l) => s + l.percent, 0);
      lines[lines.length - 1].percent = Math.round((100 - adjusted) * 100) / 100;
    }

    // Determine version
    // Delete old SOV versions for this contract
    const { data: oldSovs } = await admin
      .from("project_sov")
      .select("id")
      .eq("project_id", project_id)
      .eq("contract_id", contract.id);

    if (oldSovs && oldSovs.length > 0) {
      const oldIds = oldSovs.map((s: any) => s.id);
      await admin.from("project_sov_items").delete().in("sov_id", oldIds);
      await admin.from("project_sov").delete().in("id", oldIds);
    }

    const newVersion = 1;

    // Create new SOV record
    const { data: newSov, error: sovErr } = await admin.from("project_sov").insert({
      project_id,
      contract_id: contract.id,
      project_profile_id: profile.id,
      sov_name: `SOV v${newVersion}`,
      version: newVersion,
      previous_version_id: null,
      scope_snapshot: sectionMap,
    }).select("id").single();

    if (sovErr) {
      console.error("Failed to create SOV:", sovErr);
      return new Response(JSON.stringify({ error: "Failed to create SOV record" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert SOV items with floor_label
    const contractValue = contract.contract_sum;
    const retainagePct = contract.retainage_percent || 0;

    // Sort lines by floor order, then by sort within group
    const floorOrder = Object.fromEntries(floorLabels.map((f, i) => [f, i]));
    lines.sort((a, b) => (floorOrder[a.floor_label] ?? 99) - (floorOrder[b.floor_label] ?? 99));

    let runningTotal = 0;
    const sovItems = lines.map((line, idx) => {
      let value: number;
      if (idx === lines.length - 1) {
        value = Math.round((contractValue - runningTotal) * 100) / 100;
      } else {
        value = Math.round((contractValue * line.percent / 100) * 100) / 100;
        runningTotal += value;
      }
      const retainage = Math.round((value * retainagePct / 100) * 100) / 100;
      return {
        sov_id: newSov.id,
        project_id,
        item_name: line.item_name,
        item_group: line.group,
        floor_label: line.floor_label,
        percent_of_contract: line.percent,
        value_amount: value,
        scheduled_value: value - retainage,
        remaining_amount: value,
        sort_order: idx + 1,
        source: "user",
        scope_section_slug: line.scope_section_slug,
        ai_original_pct: line.percent,
        default_enabled: true,
      };
    });

    const { error: itemsErr } = await admin.from("project_sov_items").insert(sovItems);
    if (itemsErr) {
      console.error("Failed to insert SOV items:", itemsErr);
      return new Response(JSON.stringify({ error: "Failed to save SOV items" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ sov_id: newSov.id, version: newVersion, line_count: lines.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-sov error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

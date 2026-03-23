import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    // Verify user
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

    // Fetch contract — use specific contract_id if provided, else first contract
    let contractQuery = admin.from("project_contracts").select("id, contract_sum, retainage_percent").eq("project_id", project_id);
    if (contract_id) {
      contractQuery = contractQuery.eq("id", contract_id);
    }
    const contractRes = await contractQuery.limit(1).maybeSingle();

    // Fetch all three data sources
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
    
    // If contract_id provided, check for scope assignments to filter items
    let scopeItems = scopeRes.data || [];
    if (contract_id) {
      // Determine if this is an FC contract (check both roles for consistency)
      const { data: fullContract } = await admin
        .from("project_contracts")
        .select("from_role, to_role")
        .eq("id", contract_id)
        .single();
      const isFCContract = fullContract?.from_role === 'Field Crew' || fullContract?.to_role === 'Field Crew';

      // Only filter scope items for FC contracts — GC↔TC covers all work
      if (isFCContract) {
        const { data: assignments } = await admin
          .from("project_scope_assignments")
          .select("scope_item_id, assigned_role")
          .eq("project_id", project_id);

        if (assignments && assignments.length > 0) {
          const fcIds = new Set(
            assignments.filter(a => a.assigned_role === 'Field Crew').map(a => a.scope_item_id)
          );
          scopeItems = scopeItems.filter((s: any) => fcIds.has(s.scope_item_id));
        }
      }
    }

    if (!profile || !contract?.contract_sum) {
      return new Response(JSON.stringify({ error: "Missing profile or contract" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const pt = (profile as any).project_types;
    const isMultifamily = pt?.is_multifamily;
    const isSingleFamily = pt?.is_single_family;

    // Group scope items by section
    const sectionMap: Record<string, { label: string; items: string[] }> = {};
    for (const s of scopeItems) {
      const sec = (s as any).scope_items?.scope_sections;
      const itemLabel = (s as any).scope_items?.label;
      if (!sec || !itemLabel) continue;
      if (!sectionMap[sec.slug]) sectionMap[sec.slug] = { label: sec.label, items: [] };
      sectionMap[sec.slug].items.push(itemLabel);
    }

    // Build scope string
    let scopeStr = "";
    for (const [slug, { label, items }] of Object.entries(sectionMap)) {
      scopeStr += `\nSection: ${label}\n`;
      for (const item of items) scopeStr += `- ${item}\n`;
    }

    const elevationNaming = isMultifamily ? "South/North/East/West" : "Front/Rear/Left/Right";
    const stories = profile.stories || 1;

    const features: string[] = [];
    if (profile.has_garage) features.push("Garage");
    if (profile.has_basement) features.push("Basement");
    if (profile.has_stairs) features.push("Stairs");
    if (profile.has_deck_balcony) features.push("Decks & Balconies");
    if (profile.has_pool) features.push("Pool");
    if (profile.has_elevator) features.push("Elevator");
    if (profile.has_clubhouse) features.push("Clubhouse");
    if (profile.has_commercial_spaces) features.push("Commercial Spaces");
    if (profile.has_shed) features.push("Shed / Outbuilding");

    const systemPrompt = `You are an expert construction cost estimator specializing in framing and exterior subcontracts. Generate a Schedule of Values (SOV) for a framing/exterior subcontractor.

CRITICAL RULES:
1. WRB (Weather Resistive Barrier) is ALWAYS its own standalone group. Never merge with windows or siding.
2. Backout items are broken out PER FLOOR LEVEL: "Backout — Level 1", "Backout — Level 2", etc.
3. Siding is broken out by elevation. For multifamily: South, North, East, West. For single family: Front, Rear, Left, Right. If garage exists, add "Siding — Garage" line.
4. Roof trusses should be the HIGHEST single line item.
5. Wall sheathing per level: 3.0–3.8%, NEVER exceed 4%.
6. Floor-to-floor wall difference: max 1.2 percentage points.
7. Pre-pour embeds: max 0.5% single building, 0.6% multi-building.
8. Building layout: max 0.5%.
9. Windows and patio/SGD doors: ALWAYS separate lines.
10. Framing hardware + backout per floor combined: 2.5–3.5%.
11. Punchlist: 0.3–0.5% max.
12. Upper floor premium: 0.3–0.8% per level, 4th floor+ adds 0.5–1.0% height premium.
13. The SOV must cover EVERY scope section listed. Do not add lines for sections not in scope.
14. All percentages must sum to exactly 100.00%.

OUTPUT FORMAT: Return a JSON array only (no markdown, no explanation). Each element:
{"item_name": "string", "group": "string", "percent": number, "scope_section_slug": "string"}

The "group" field groups related items (e.g., "Foundation", "Interior Framing", "Roof", "Sheathing & WRB", "Windows & Doors", "Siding", "Decks", "Garage", etc.).
The "scope_section_slug" must match one of the section slugs from the scope data.`;

    const userMessage = `Generate a Schedule of Values for this project.

CONTRACT:
Contract value: $${contract.contract_sum.toLocaleString()}
Retainage: ${contract.retainage_percent || 0}%

PROJECT PROFILE:
Project type: ${pt?.name || "Unknown"}
Stories: ${stories}
${profile.units_per_building ? `Units per building: ${profile.units_per_building}` : ""}
${profile.number_of_buildings > 1 ? `Number of buildings: ${profile.number_of_buildings}` : ""}
Foundation: ${(profile.foundation_types || []).join(", ") || "Not specified"}
Roof: ${profile.roof_type || "Not specified"}
Garage: ${profile.has_garage ? (profile.garage_types || []).join(", ") : "None"}
Basement: ${profile.has_basement ? (profile.basement_type || "Yes") : "None"}
Stairs: ${profile.has_stairs ? (profile.stair_types || []).join(", ") : "None"}
Active features: ${features.length > 0 ? features.join(", ") : "None"}
is_single_family: ${isSingleFamily}
is_multifamily: ${isMultifamily}
Siding elevation naming: ${elevationNaming}
Backout lines: one per floor, Level 1 through Level ${stories}

ACTIVE SCOPE ITEMS:
${scopeStr}

IMPORTANT: The SOV must cover every scope section listed above. If a scope section has active items, there must be at least one SOV line for it. Do not add SOV lines for scope sections not listed above.`;

    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
    
    // Strip markdown code fences if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let lines: Array<{ item_name: string; group: string; percent: number; scope_section_slug: string }>;
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
    const { data: existingSov } = await admin.from("project_sov").select("id, version").eq("project_id", project_id).order("version", { ascending: false }).limit(1).maybeSingle();

    const newVersion = existingSov ? existingSov.version + 1 : 1;

    // Create new SOV record
    const { data: newSov, error: sovErr } = await admin.from("project_sov").insert({
      project_id,
      contract_id: contract.id,
      project_profile_id: profile.id,
      sov_name: `SOV v${newVersion}`,
      version: newVersion,
      previous_version_id: existingSov?.id || null,
      scope_snapshot: sectionMap,
    }).select("id").single();

    if (sovErr) {
      console.error("Failed to create SOV:", sovErr);
      return new Response(JSON.stringify({ error: "Failed to create SOV record" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert SOV items
    const contractValue = contract.contract_sum;
    const retainagePct = contract.retainage_percent || 0;

    const sovItems = lines.map((line, idx) => {
      const value = contractValue * line.percent / 100;
      const retainage = value * retainagePct / 100;
      return {
        sov_id: newSov.id,
        project_id,
        item_name: line.item_name,
        item_group: line.group,
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

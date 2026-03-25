import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const [projectRes, profileRes, selectionsRes] = await Promise.all([
      supabase.from("projects").select("name, city, state").eq("id", project_id).single(),
      supabase.from("project_profiles").select("*").eq("project_id", project_id).maybeSingle(),
      supabase
        .from("project_scope_selections")
        .select("scope_item_id, is_on, scope_items(label)")
        .eq("project_id", project_id)
        .eq("is_on", true),
    ]);

    const project = projectRes.data;
    const profile = profileRes.data;

    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context
    const parts: string[] = [];
    parts.push(`Project: ${project.name}`);
    if (project.city && project.state) parts.push(`Location: ${project.city}, ${project.state}`);

    if (profile) {
      // Scale
      if (profile.stories) parts.push(`Stories: ${profile.stories}`);
      if (profile.units_per_building) parts.push(`Units per building: ${profile.units_per_building}`);
      if (profile.number_of_buildings > 1) parts.push(`Buildings: ${profile.number_of_buildings}`);
      if (profile.stories_per_unit) parts.push(`Stories per unit: ${profile.stories_per_unit}`);

      // Structural systems
      if (profile.framing_system) parts.push(`Framing: ${profile.framing_system}`);
      if (profile.floor_system) parts.push(`Floor system: ${profile.floor_system}`);
      if (profile.roof_system) parts.push(`Roof system: ${profile.roof_system}`);
      if (profile.structure_type) parts.push(`Structure: ${profile.structure_type}`);
      if (profile.roof_type) parts.push(`Roof: ${profile.roof_type}`);

      // Foundation
      const foundations = profile.foundation_types;
      if (Array.isArray(foundations) && foundations.length) parts.push(`Foundation: ${foundations.join(", ")}`);

      // Features
      if (profile.has_corridors && profile.corridor_type) parts.push(`Corridors: ${profile.corridor_type}`);
      if (profile.entry_type && profile.entry_type !== 'Standard') parts.push(`Entry: ${profile.entry_type}`);
      if (profile.garage_car_count) parts.push(`Garage: ${profile.garage_car_count}-car`);
      const specials = profile.special_rooms;
      if (Array.isArray(specials) && specials.length) parts.push(`Special rooms: ${specials.join(", ")}`);

      const boolFeatures: [string, string][] = [
        ["has_garage", "garage"], ["has_basement", "basement"], ["has_stairs", "stairs"],
        ["has_elevator", "elevator"], ["has_clubhouse", "clubhouse"],
        ["has_commercial_spaces", "commercial spaces"], ["has_pool", "pool"],
      ];
      for (const [key, label] of boolFeatures) {
        if ((profile as any)[key]) parts.push(`Has ${label}`);
      }

      // ── Scope inclusions & exclusions ──
      const scopeLines: string[] = [];
      const addScope = (included: boolean, label: string, detail?: string | null) => {
        if (included) {
          scopeLines.push(detail ? `${label}: Included (${detail})` : `${label}: Included`);
        } else {
          scopeLines.push(`${label}: Not included`);
        }
      };

      addScope(profile.scope_windows_install, "Windows install", profile.scope_windows_type);
      addScope(profile.scope_patio_doors, "Patio doors", profile.scope_patio_door_type);
      addScope(profile.scope_siding, "Siding",
        [profile.scope_siding_type, profile.scope_siding_level].filter(Boolean).join(", ") || null);
      addScope(profile.scope_exterior_trim, "Exterior trim", profile.scope_exterior_trim_type);
      addScope(profile.scope_soffit_fascia, "Soffit & fascia",
        [profile.scope_soffit_type, profile.scope_fascia_type].filter(Boolean).join(" / ") || null);
      addScope(profile.scope_wrb, "WRB", profile.scope_wrb_type);
      addScope(profile.scope_sheathing, "Sheathing");
      if (profile.scope_backout) {
        const backoutParts: string[] = [];
        if (profile.scope_backout_blocking) {
          const items = profile.scope_backout_blocking_items;
          backoutParts.push(Array.isArray(items) && items.length ? `Blocking (${items.join(", ")})` : "Blocking");
        }
        if (profile.scope_backout_shimming) backoutParts.push("Shimming");
        if (profile.scope_backout_stud_repair) backoutParts.push("Stud Repair");
        if (profile.scope_backout_nailer_plates) backoutParts.push("Nailer Plates");
        if (profile.scope_backout_pickup_framing) backoutParts.push("Pickup Framing");
        scopeLines.push(`Backout plan: Included (${backoutParts.join(", ")})`);
      } else {
        scopeLines.push("Backout plan: Not included");
      }
      addScope(profile.scope_decks_railings, "Decks & railings", profile.scope_deck_type);
      if (profile.scope_decks_railings && profile.scope_railings) scopeLines.push("Railings: Included");
      addScope(profile.scope_garage_framing, "Garage framing");
      if (profile.scope_garage_framing && profile.scope_garage_trim_openings) scopeLines.push("Garage trim openings: Included");
      addScope(profile.scope_fire_stopping, "Fire stopping");
      addScope(profile.scope_stairs_scope, "Stairs scope");
      addScope(profile.scope_curtain_wall, "Curtain wall");
      addScope(profile.scope_storefront_framing, "Storefront framing");

      const extras = profile.scope_extras;
      if (Array.isArray(extras) && extras.length) {
        scopeLines.push(`Extras: ${extras.join(", ")}`);
      }

      if (scopeLines.length) parts.push(`\nScope:\n${scopeLines.join("\n")}`);
    }

    // Active scope items from scope_selections table
    const scopeItems = (selectionsRes.data || [])
      .map((s: any) => s.scope_items?.label)
      .filter(Boolean);
    if (scopeItems.length) parts.push(`Active scope items: ${scopeItems.join(", ")}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a construction project describer. Write a concise 3-4 sentence project brief that summarizes: (1) the building type, scale, and location, (2) the structural systems (framing, floor, roof), (3) what work is included in this project's scope (siding, windows, trim, etc.), and (4) any notable extras or exclusions. Write in professional construction language as if briefing all project stakeholders. Output only the description, nothing else.",
          },
          { role: "user", content: parts.join("\n") },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate description");
    }

    const aiData = await response.json();
    const description = aiData.choices?.[0]?.message?.content?.trim() || "";

    if (!description) {
      return new Response(JSON.stringify({ error: "Failed to generate description" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("projects").update({ description }).eq("id", project_id);

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

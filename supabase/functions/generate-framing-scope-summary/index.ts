import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function yn(v: string | null | undefined): string {
  return v === "yes" ? "Yes" : v === "no" ? "No" : "Not specified";
}

function buildScopeText(answers: any): string {
  const parts: string[] = [];
  const a = answers;

  // Method
  if (a.method?.framing_method) parts.push(`Framing method: ${a.method.framing_method}`);
  if (a.method?.material_responsibility) parts.push(`Material responsibility: ${a.method.material_responsibility}`);
  if (a.method?.mobilization === "yes") parts.push(`Mobilization: ${a.method.mobilization_percent ?? 5}%`);

  // Structure
  if (a.structure) {
    const feats: string[] = [];
    if (a.structure.wood_stairs === "yes") feats.push("wood stairs");
    if (a.structure.elevator_shaft === "yes") feats.push("elevator shaft");
    if (a.structure.enclosed_corridors === "yes") feats.push("enclosed corridors");
    if (a.structure.balconies === "yes") feats.push("balconies");
    if (a.structure.tuck_under_garages === "yes") feats.push("tuck-under garages");
    if (feats.length) parts.push(`Building features included: ${feats.join(", ")}`);
  }

  // Steel
  if (a.steel) {
    const steelItems: string[] = [];
    if (a.steel.steel_columns === "yes") steelItems.push("columns");
    if (a.steel.steel_beams === "yes") steelItems.push("beams");
    if (a.steel.moment_frames === "yes") steelItems.push("moment frames");
    if (a.steel.steel_decking === "yes") steelItems.push("decking");
    if (a.steel.fireproofing === "yes") steelItems.push("fireproofing");
    if (steelItems.length) parts.push(`Structural steel: ${steelItems.join(", ")}`);
    else parts.push("Structural steel: not in scope");
  }

  // Sheathing
  if (a.sheathing) {
    if (a.sheathing.wall_sheathing_type) parts.push(`Wall sheathing: ${a.sheathing.wall_sheathing_type}`);
    parts.push(`Roof sheathing: ${yn(a.sheathing.roof_sheathing)}`);
    parts.push(`Roof dry-in/underlayment: ${yn(a.sheathing.roof_underlayment)}`);
  }

  // Exterior
  if (a.exterior) {
    parts.push(`Rough fascia: ${yn(a.exterior.rough_fascia)}`);
    parts.push(`Finished fascia: ${yn(a.exterior.finished_fascia)}`);
    parts.push(`Finished soffit: ${yn(a.exterior.finished_soffit)}`);
  }

  // Siding
  if (a.siding?.siding_in_scope === "yes") {
    const types = a.siding.siding_types?.length ? a.siding.siding_types.join(", ") : "various";
    parts.push(`Siding in scope: ${types}`);
    if (a.siding.window_trim === "yes") parts.push("Window trim: included");
    if (a.siding.corner_treatment === "yes") parts.push("Corner treatment: included");
  } else {
    parts.push("Siding: not in scope");
  }

  // Openings
  if (a.openings) {
    if (a.openings.window_mode && a.openings.window_mode !== "NOT_IN_SCOPE") {
      parts.push(`Windows: ${a.openings.window_mode.replace(/_/g, " ")}`);
    } else {
      parts.push("Windows: not in scope");
    }
    if (a.openings.ext_door_mode && a.openings.ext_door_mode !== "NOT_IN_SCOPE") {
      parts.push(`Exterior doors: ${a.openings.ext_door_mode.replace(/_/g, " ")}`);
    } else {
      parts.push("Exterior doors: not in scope");
    }
  }

  // Blocking
  parts.push(`Back-out framing: ${yn(a.blocking?.backout)}`);

  // Fire
  parts.push(`Fire blocking: ${yn(a.fire?.fire_blocking)}`);
  parts.push(`Demising walls: ${yn(a.fire?.demising_walls)}`);

  // Hardware
  parts.push(`Structural connectors: ${yn(a.hardware?.structural_connectors)}`);

  // Cleanup
  parts.push(`Daily cleanup: ${yn(a.cleanup?.daily_cleanup)}`);
  if (a.cleanup?.warranty) parts.push(`Warranty: ${a.cleanup.warranty}`);

  return parts.join("\n");
}

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

    const [scopeRes, projectRes, profileRes] = await Promise.all([
      supabase.from("project_framing_scope").select("id, answers").eq("project_id", project_id).maybeSingle(),
      supabase.from("projects").select("name").eq("id", project_id).single(),
      supabase.from("project_profiles").select("building_type").eq("project_id", project_id).maybeSingle(),
    ]);

    if (scopeRes.error || !scopeRes.data) {
      return new Response(JSON.stringify({ error: "Framing scope not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const answers = scopeRes.data.answers;
    const projectName = projectRes.data?.name || "Project";
    const buildingType = profileRes.data?.building_type || "";
    const scopeText = buildScopeText(answers);

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
              "You are a construction scope of work writer specializing in wood-frame rough carpentry subcontracts. Write a clear, professional 4-6 sentence scope summary. Cover framing method, material responsibility, what structural features are included, exterior skin scope, openings approach, and any notable exclusions. Use plain English a field superintendent would understand. No bullet points or lists. Output only the summary text.",
          },
          {
            role: "user",
            content: `Project: ${projectName}\nBuilding type: ${buildingType}\n\nFraming scope details:\n${scopeText}`,
          },
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate summary");
    }

    const aiData = await response.json();
    const summary = aiData.choices?.[0]?.message?.content?.trim() || "";

    if (!summary) {
      return new Response(JSON.stringify({ error: "Failed to generate summary" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save to DB
    await supabase
      .from("project_framing_scope")
      .update({ ai_summary: summary } as any)
      .eq("id", scopeRes.data.id);

    return new Response(JSON.stringify({ summary }), {
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

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
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

    const [scopeRes, projectRes] = await Promise.all([
      supabase
        .from("project_scope_details")
        .select("*")
        .eq("project_id", project_id)
        .maybeSingle(),
      supabase
        .from("projects")
        .select("name, project_type")
        .eq("id", project_id)
        .single(),
    ]);

    if (scopeRes.error || !scopeRes.data) {
      return new Response(
        JSON.stringify({ error: "Scope details not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scope = scopeRes.data;
    const projectName = projectRes.data?.name || "Unknown Project";
    const projectType = projectRes.data?.project_type || "";

    const scopeParts: string[] = [];
    if (scope.home_type) scopeParts.push(`Home type: ${scope.home_type}`);
    if (scope.floors) scopeParts.push(`Floors: ${scope.floors}`);
    if (scope.num_buildings) scopeParts.push(`Buildings: ${scope.num_buildings}`);
    if (scope.stories) scopeParts.push(`Stories: ${scope.stories}`);
    if (scope.num_units) scopeParts.push(`Units: ${scope.num_units}`);
    if (scope.foundation_type) scopeParts.push(`Foundation: ${scope.foundation_type}`);
    if (scope.basement_type) scopeParts.push(`Basement: ${scope.basement_type} (${scope.basement_finish || "unfinished"})`);
    if (scope.stairs_type) scopeParts.push(`Stairs: ${scope.stairs_type}`);
    if (scope.has_elevator) scopeParts.push(`Elevator shaft: ${scope.shaft_type || "yes"}`);
    if (scope.roof_type) scopeParts.push(`Roof: ${scope.roof_type}`);
    if (scope.has_roof_deck) scopeParts.push(`Roof deck: ${scope.roof_deck_type || "yes"}`);
    if (scope.has_covered_porches) scopeParts.push("Covered porches: yes");
    if (scope.has_balconies) scopeParts.push(`Balconies: ${scope.balcony_type || "yes"}`);
    if (scope.decking_included) scopeParts.push(`Decking: ${scope.decking_type || "included"}`);
    if (scope.siding_included) {
      const materials = Array.isArray(scope.siding_materials) ? scope.siding_materials.join(", ") : "";
      scopeParts.push(`Siding: ${materials || "included"}`);
    }
    if (scope.fascia_included) scopeParts.push("Fascia: included");
    if (scope.soffit_included) scopeParts.push("Soffit: included");
    if (scope.fascia_soffit_material) scopeParts.push(`Fascia/soffit material: ${scope.fascia_soffit_material}`);
    if (scope.decorative_included) {
      const items = Array.isArray(scope.decorative_items) ? scope.decorative_items.join(", ") : "";
      scopeParts.push(`Decorative items: ${items || "included"}`);
    }
    if (scope.windows_included) scopeParts.push("Windows: included");
    if (scope.wrb_included) scopeParts.push("WRB: included");
    if (scope.ext_doors_included) scopeParts.push("Exterior doors: included");
    if (scope.construction_type) scopeParts.push(`Construction type: ${scope.construction_type}`);

    const scopeText = scopeParts.join("\n");

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
            {
              role: "system",
              content:
                "You are a construction scope of work writer. Write a concise 2-3 sentence essential scope of work description for a framing contractor. Cover the structure type, key structural features, and what is included in scope. Use professional construction language. Do not use bullet points or lists. Do not include project name. Output only the description text, nothing else.",
            },
            {
              role: "user",
              content: `Project: ${projectName}\nProject type: ${projectType}\n\nScope details:\n${scopeText}`,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Please try again later." }),
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

    const aiData = await response.json();
    const description = aiData.choices?.[0]?.message?.content?.trim() || "";

    if (!description) {
      return new Response(
        JSON.stringify({ error: "Failed to generate description" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("project_scope_details")
      .update({ scope_description: description })
      .eq("project_id", project_id);

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

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

    // Fetch project, profile, and scope selections
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
      if (profile.stories) parts.push(`Stories: ${profile.stories}`);
      if (profile.units_per_building) parts.push(`Units per building: ${profile.units_per_building}`);
      if (profile.number_of_buildings > 1) parts.push(`Buildings: ${profile.number_of_buildings}`);
      if (profile.roof_type) parts.push(`Roof: ${profile.roof_type}`);
      const foundations = profile.foundation_types;
      if (Array.isArray(foundations) && foundations.length) parts.push(`Foundation: ${foundations.join(", ")}`);

      const features = ["garage", "basement", "stairs", "deck_balcony", "pool", "elevator", "clubhouse", "commercial_spaces", "shed"];
      for (const f of features) {
        if ((profile as any)[`has_${f}`]) parts.push(`Has ${f.replace(/_/g, " ")}`);
      }
    }

    // Add active scope items
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
              "You are a construction project describer. Write a concise 1-2 sentence project description summarizing the building type, scale, location, and key features. Use professional language. Output only the description, nothing else.",
          },
          { role: "user", content: parts.join("\n") },
        ],
        max_tokens: 300,
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

    // Save to projects table
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

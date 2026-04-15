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

interface GenerateRequest {
  work_type: string;
  location?: LocationData;
  location_tag?: string;
  project_name: string;
  reason?: string;
  reason_code?: string;
  selected_items?: string[];
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

    // Resolve location: prefer location_tag, fall back to structured location
    const locationDesc = body.location_tag || buildLocationDescription(body.location) || "unspecified location";

    // Resolve scope items: prefer selected_items array, fall back to structural_element
    const scopeItems = body.selected_items?.length
      ? body.selected_items.join(", ")
      : body.structural_element || "";

    // Resolve reason
    const reason = body.reason_code || body.reason || "";

    // Build concise context
    const contextParts = [
      `Project: ${body.project_name}`,
      `Work type: ${body.work_type}`,
      `Location: ${locationDesc}`,
    ];

    if (scopeItems) contextParts.push(`Scope items: ${scopeItems}`);
    if (reason) contextParts.push(`Reason: ${reason}`);
    if (body.existing_conditions) contextParts.push(`Conditions: ${body.existing_conditions}`);
    if (body.rfi_context) contextParts.push(`RFI context: ${body.rfi_context}`);
    if (body.requires_materials && body.material_responsibility) {
      contextParts.push(`Materials: ${body.material_responsibility} responsible`);
    }
    if (body.requires_equipment && body.equipment_responsibility) {
      contextParts.push(`Equipment: ${body.equipment_responsibility} responsible`);
    }

    const systemPrompt = `You are a construction scope writer. Output ONLY a 1-3 sentence description.
State the selected scope items, the exact location provided, and the reason if given.
Do NOT add details, assumptions, or recommendations not present in the input.
Do NOT mention pricing, scheduling, or general construction advice.`;

    const userPrompt = `Write a scope description from this data:\n\n${contextParts.join("\n")}`;

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
          max_tokens: 200,
          temperature: 0.3,
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

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
  location: LocationData;
  project_name: string;
  reason?: string;
  fixing_trade_notes?: string;
  requires_materials: boolean;
  requires_equipment: boolean;
  material_responsibility?: string;
  equipment_responsibility?: string;
  rfi_context?: string;
}

const WORK_TYPE_DESCRIPTIONS: Record<string, string> = {
  reframe: "re-framing work",
  reinstall: "reinstallation work",
  addition: "additional framing work",
  adjust: "adjustment work",
  fixing: "repair/fix work",
};

const REASON_DESCRIPTIONS: Record<string, string> = {
  other_trade: "damage caused by another trade",
  design_error: "a design error",
  material_defect: "a material defect",
  weather_damage: "weather-related damage",
  owner_damage: "damage by owner/tenant",
  code_requirement: "code compliance requirements",
  other: "other issues",
};

function buildLocationDescription(location: LocationData): string {
  if (location.inside_outside === "inside") {
    const parts = [];
    if (location.level) parts.push(location.level.toLowerCase());
    if (location.unit) parts.push(`unit ${location.unit}`);
    if (location.room_area === "Other" && location.custom_room_area) {
      parts.push(location.custom_room_area.toLowerCase());
    } else if (location.room_area) {
      parts.push(location.room_area.toLowerCase());
    }
    return parts.length > 0 ? parts.join(", ") : "interior location";
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
    return "exterior location";
  }
  return "specified location";
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
    const {
      work_type,
      location,
      project_name,
      reason,
      fixing_trade_notes,
      requires_materials,
      requires_equipment,
      material_responsibility,
      equipment_responsibility,
      rfi_context,
    } = body;

    const workTypeDesc = WORK_TYPE_DESCRIPTIONS[work_type] || work_type;
    const locationDesc = buildLocationDescription(location);

    // Build context for the AI
    let contextParts = [
      `Project: ${project_name}`,
      `Work Type: ${workTypeDesc}`,
      `Location: ${locationDesc}`,
    ];

    if (work_type === "fixing" && reason) {
      const reasonDesc = REASON_DESCRIPTIONS[reason] || reason;
      contextParts.push(`Reason for fix: ${reasonDesc}`);
      if (fixing_trade_notes) {
        contextParts.push(`Trade issue details: ${fixing_trade_notes}`);
      }
    }

    if (rfi_context) {
      contextParts.push(`RFI Context (question & answer):\n${rfi_context}`);
    }

    if (material_responsibility) {
      contextParts.push(
        `Materials: ${material_responsibility} responsible${requires_materials ? " (additional materials needed)" : ""}`
      );
    }

    if (equipment_responsibility) {
      contextParts.push(
        `Equipment: ${equipment_responsibility} responsible${requires_equipment ? " (equipment needed)" : ""}`
      );
    }

    const systemPrompt = `You are a construction project manager writing work order descriptions for a framing contractor. 
Write clear, professional, and concise scope of work descriptions.
Use industry-standard terminology.
Focus on what needs to be done, where, and any special considerations.
Keep descriptions under 150 words.
Do not include pricing or scheduling information.
Write in a professional but direct tone.
If RFI context is provided, combine the question and answer into a clear, actionable scope of work description.`;

    const userPrompt = `Generate a scope of work description for the following work order:

${contextParts.join("\n")}

Write a professional description that clearly communicates:
1. What work needs to be performed
2. Where the work is located
3. Any relevant context (like why this work is needed)
4. Materials or equipment considerations if applicable

Keep it concise but complete.`;

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
          max_tokens: 500,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again later.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Please add credits to continue.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
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
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

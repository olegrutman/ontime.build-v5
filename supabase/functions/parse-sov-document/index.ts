import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SOVItem {
  name: string;
  percent: number;
}

const SYSTEM_PROMPT = `You are a construction Schedule of Values (SOV) parser. Your job is to extract line items from an uploaded SOV document.

Rules:
- Each line item has a name/description and either a dollar amount or a percentage of the total contract.
- Skip headers, footers, page numbers, company addresses, totals rows, and disclaimers.
- Clean up descriptions: remove numbering prefixes, extra whitespace, and formatting noise.
- If items have dollar amounts but no percentages, you will receive the contract_sum to calculate percentages.
- Return all items you find. The caller will normalize percentages to 100%.`;

const EXTRACT_TOOL = {
  type: "function" as const,
  function: {
    name: "extract_sov_items",
    description: "Extract Schedule of Values line items from a document.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "Array of SOV line items",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Line item name/description",
              },
              amount: {
                type: "number",
                description: "Dollar amount for this item (0 if only percent given)",
              },
              percent: {
                type: "number",
                description: "Percentage of total contract (0 if only amount given)",
              },
            },
            required: ["name", "amount", "percent"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_base64, file_type, contract_sum } = await req.json();

    if (!file_base64 || !file_type) {
      return new Response(
        JSON.stringify({ error: "file_base64 and file_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build user message content based on file type
    let userContent: any[];
    if (file_type === "csv") {
      // Decode CSV to text
      const bytes = Uint8Array.from(atob(file_base64), c => c.charCodeAt(0));
      const csvText = new TextDecoder().decode(bytes);
      userContent = [
        {
          type: "text",
          text: `Extract all Schedule of Values line items from this CSV document. The contract total is $${contract_sum || 0}.\n\nCSV Content:\n${csvText}`,
        },
      ];
    } else {
      // PDF - send as image
      userContent = [
        {
          type: "text",
          text: `Extract all Schedule of Values line items from this document. The contract total is $${contract_sum || 0}.`,
        },
        {
          type: "image_url",
          image_url: {
            url: `data:application/pdf;base64,${file_base64}`,
          },
        },
      ];
    }

    console.log("Calling AI gateway for SOV extraction...");

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          max_tokens: 16000,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
          tools: [EXTRACT_TOOL],
          tool_choice: {
            type: "function",
            function: { name: "extract_sov_items" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error(`AI gateway error ${status}:`, errorText);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "AI service is busy. Please try again in a minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI extraction failed. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const warnings: string[] = [];

    if (aiData.choices?.[0]?.finish_reason === "length") {
      warnings.push("AI response was truncated — some items may be missing.");
    }

    let rawItems: { name: string; amount: number; percent: number }[] = [];

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        rawItems = args.items || [];
      } catch {
        console.warn("Tool call JSON parse failed");
      }
    }

    if (rawItems.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Could not extract any SOV items from this document. Try a cleaner scan or different format.",
          warnings,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert to percentages
    const items: SOVItem[] = rawItems.map(item => {
      let pct = item.percent || 0;
      if (pct === 0 && item.amount > 0 && contract_sum > 0) {
        pct = (item.amount / contract_sum) * 100;
      }
      return { name: item.name.trim(), percent: Math.round(pct * 100) / 100 };
    }).filter(item => item.name.length > 0);

    // Normalize to 100%
    const totalPct = items.reduce((s, i) => s + i.percent, 0);
    if (totalPct > 0 && Math.abs(totalPct - 100) > 0.01) {
      const factor = 100 / totalPct;
      let running = 0;
      for (let i = 0; i < items.length; i++) {
        if (i === items.length - 1) {
          items[i].percent = Math.round((100 - running) * 100) / 100;
        } else {
          items[i].percent = Math.round(items[i].percent * factor * 100) / 100;
          running += items[i].percent;
        }
      }
      if (Math.abs(totalPct - 100) > 5) {
        warnings.push(`Original percentages totaled ${totalPct.toFixed(1)}% — normalized to 100%.`);
      }
    }

    console.log(`Extracted ${items.length} SOV items`);

    return new Response(
      JSON.stringify({ items, warnings }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("parse-sov-document error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

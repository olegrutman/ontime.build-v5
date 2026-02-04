import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ParseRequest {
  estimate_id: string;
  file_path: string;
  supplier_org_id: string;
}

interface ParsedLineItem {
  pack_name: string;
  description: string;
  quantity: number | null;
  uom: string | null;
  supplier_sku: string | null;
  confidence: "high" | "medium" | "low";
}

interface ParsedEstimate {
  line_items: ParsedLineItem[];
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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: ParseRequest = await req.json();
    const { estimate_id, file_path, supplier_org_id } = body;

    if (!estimate_id || !file_path || !supplier_org_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: estimate_id, file_path, supplier_org_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("estimate-pdfs")
      .download(file_path);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download PDF file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert PDF to base64 for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Content = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    // Fetch catalog items for matching - join through suppliers table using org_id
    const { data: supplierData } = await supabase
      .from("suppliers")
      .select("id")
      .eq("organization_id", supplier_org_id)
      .single();

    const { data: catalogItems } = await supabase
      .from("catalog_items")
      .select("id, supplier_sku, description, dimension, wood_species, length, category")
      .eq("supplier_id", supplierData?.id || "")
      .limit(1000);

    const catalogContext = catalogItems && catalogItems.length > 0
      ? `\n\nAvailable catalog products for matching (supplier_sku | description):\n${catalogItems
          .slice(0, 200)
          .map((c) => `${c.supplier_sku || "N/A"} | ${c.description}`)
          .join("\n")}`
      : "";

    const systemPrompt = `You are a construction material estimate parser. Your job is to extract line items from PDF estimates.

CRITICAL RULES:
1. Extract ALL line items from the PDF
2. Identify section headings (like "Basement", "1st Floor Framing", "Garden Level") as pack names
3. Items after a heading belong to that pack until the next heading
4. If no heading is detected, use "Loose Estimate Items" as the pack name
5. Extract quantity and unit of measure when visible
6. Extract supplier SKU codes when visible (usually alphanumeric codes)
7. Set confidence to "low" if you're uncertain about any field

Return a JSON object with this exact structure:
{
  "line_items": [
    {
      "pack_name": "section heading or 'Loose Estimate Items'",
      "description": "item description",
      "quantity": number or null,
      "uom": "EA|BF|LF|SF|PC|BD|etc" or null,
      "supplier_sku": "SKU code" or null,
      "confidence": "high|medium|low"
    }
  ]
}

Common pack/section names in construction estimates:
- Basement, Foundation, Crawl Space
- 1st Floor, 2nd Floor, 3rd Floor
- Garden Level, Main Level, Upper Level
- Roof Framing, Trusses
- Exterior Walls, Interior Walls
- Stairs, Decks, Porches${catalogContext}`;

    const userPrompt = `Parse this PDF estimate and extract all line items with their pack groupings. The PDF content is provided as a base64-encoded file.`;

    // Call Lovable AI with the PDF
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
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${base64Content}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 8000,
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
      throw new Error("Failed to parse PDF with AI");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("Empty response from AI");
    }

    // Parse the JSON response
    let parsed: ParsedEstimate;
    try {
      // Extract JSON from potential markdown code blocks
      let jsonStr = content;
      
      // Try multiple patterns to extract JSON
      // Pattern 1: ```json ... ```
      const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)```/);
      if (jsonBlockMatch) {
        jsonStr = jsonBlockMatch[1].trim();
      } else {
        // Pattern 2: ``` ... ``` (no language specifier)
        const codeBlockMatch = content.match(/```\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          jsonStr = codeBlockMatch[1].trim();
        } else {
          // Pattern 3: Try to find JSON object directly
          const jsonObjectMatch = content.match(/\{[\s\S]*"line_items"[\s\S]*\}/);
          if (jsonObjectMatch) {
            jsonStr = jsonObjectMatch[0];
          }
        }
      }
      
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", content);
      throw new Error("Failed to parse AI response");
    }

    if (!parsed.line_items || !Array.isArray(parsed.line_items)) {
      throw new Error("Invalid response structure from AI");
    }

    // Attempt to match items to catalog
    const matchedItems = parsed.line_items.map((item, index) => {
      let catalog_item_id: string | null = null;
      let status = item.confidence === "low" ? "needs_review" : "imported";

      if (catalogItems && item.supplier_sku) {
        // Priority 1: Exact SKU match
        const skuMatch = catalogItems.find(
          (c) => c.supplier_sku?.toLowerCase() === item.supplier_sku?.toLowerCase()
        );
        if (skuMatch) {
          catalog_item_id = skuMatch.id;
          status = "matched";
        }
      }

      if (!catalog_item_id && catalogItems && item.description) {
        // Priority 2: Description fuzzy match (simple contains check)
        const descLower = item.description.toLowerCase();
        const descMatch = catalogItems.find((c) => {
          const catalogDesc = c.description.toLowerCase();
          // Check if significant words match
          const itemWords = descLower.split(/\s+/).filter((w) => w.length > 3);
          const matchCount = itemWords.filter((w) => catalogDesc.includes(w)).length;
          return matchCount >= Math.ceil(itemWords.length * 0.6);
        });
        if (descMatch) {
          catalog_item_id = descMatch.id;
          status = "matched";
        }
      }

      if (!catalog_item_id && status !== "needs_review") {
        status = "unmatched";
      }

      return {
        estimate_id,
        raw_text_line: item.description,
        description: item.description,
        quantity: item.quantity,
        uom: item.uom,
        pack_name: item.pack_name || "Loose Estimate Items",
        status,
        catalog_item_id,
        sort_order: index,
      };
    });

    // Insert line items into database
    const { data: insertedItems, error: insertError } = await supabase
      .from("estimate_line_items")
      .insert(matchedItems)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save parsed items to database");
    }

    // Get summary stats
    const stats = {
      total_items: matchedItems.length,
      matched: matchedItems.filter((i) => i.status === "matched").length,
      needs_review: matchedItems.filter((i) => i.status === "needs_review").length,
      unmatched: matchedItems.filter((i) => i.status === "unmatched").length,
      packs: [...new Set(matchedItems.map((i) => i.pack_name))],
    };

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        items: insertedItems,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error parsing estimate PDF:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

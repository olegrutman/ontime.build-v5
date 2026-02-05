import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Types ──────────────────────────────────────────────────────────────

interface ParsedItem {
  supplier_sku: string;
  description: string;
  quantity: number;
  uom: string;
}

interface ParsedPack {
  name: string;
  items: ParsedItem[];
}

interface ParseResult {
  packs: ParsedPack[];
  totalItems: number;
  warnings: string[];
}

// ── Extraction prompt ──────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a construction materials estimate parser. Your job is to extract structured line items from supplier PDF quotes.

Rules:
- Identify section headings, categories, or groupings as pack names. If no clear sections exist, use "General" as the pack name.
- Extract ONLY material line items — skip headers, footers, page numbers, totals, subtotals, tax lines, terms & conditions, company addresses, and disclaimers.
- For each item extract: supplier SKU, product description, quantity, and unit of measure (UOM).
- Normalize SKUs: strip whitespace, convert to UPPERCASE.
- Common UOMs: EA (each), PC (piece), LF (linear foot), BF (board foot), SF (square foot), BDL (bundle), RL (roll), BX (box), CTN (carton), MSF (thousand square feet), MBF (thousand board feet), GAL (gallon), BAG, SHEET, PAIL.
- If a UOM is not explicit, infer from context (e.g., lumber is typically BF or LF, sheets are EA or SHEET).
- IGNORE all pricing columns (unit price, extended price, totals, discounts). Do not include any pricing data.
- If quantity is missing or unclear, default to 0.
- Clean up descriptions: remove embedded pricing data, page artifacts, and formatting noise.`;

const EXTRACT_TOOL = {
  type: "function" as const,
  function: {
    name: "extract_estimate_items",
    description:
      "Extract structured material line items grouped by pack/section from a supplier PDF quote.",
    parameters: {
      type: "object",
      properties: {
        packs: {
          type: "array",
          description: "Array of packs/sections found in the document",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description:
                  "Section heading or category name (e.g., 'Framing Lumber', 'Roofing', 'Hardware')",
              },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    supplier_sku: {
                      type: "string",
                      description: "Product SKU or item number (uppercase, no spaces)",
                    },
                    description: {
                      type: "string",
                      description: "Clean product description without pricing data",
                    },
                    quantity: {
                      type: "number",
                      description: "Quantity ordered (0 if unclear)",
                    },
                    uom: {
                      type: "string",
                      description: "Unit of measure (EA, PC, LF, BF, SF, BDL, etc.)",
                    },
                  },
                  required: ["supplier_sku", "description", "quantity", "uom"],
                  additionalProperties: false,
                },
              },
            },
            required: ["name", "items"],
            additionalProperties: false,
          },
        },
      },
      required: ["packs"],
      additionalProperties: false,
    },
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────

function repairAndExtractJSON(raw: string): ParsedPack[] | null {
  // Try to find the tool call arguments in the raw response
  try {
    const parsed = JSON.parse(raw);
    if (parsed.packs) return parsed.packs;
  } catch {
    // Try to find a JSON object with "packs" key
    const match = raw.match(/\{[\s\S]*"packs"\s*:\s*\[[\s\S]*\]/);
    if (match) {
      let jsonStr = match[0];
      // Balance braces
      let open = 0;
      let end = 0;
      for (let i = 0; i < jsonStr.length; i++) {
        if (jsonStr[i] === "{") open++;
        if (jsonStr[i] === "}") open--;
        if (open === 0) {
          end = i + 1;
          break;
        }
      }
      if (end > 0) jsonStr = jsonStr.slice(0, end);
      else jsonStr += "}";

      try {
        const repaired = JSON.parse(jsonStr);
        if (repaired.packs) return repaired.packs;
      } catch {
        return null;
      }
    }
  }
  return null;
}

// ── Main handler ────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { estimateId, filePath } = await req.json();

    if (!estimateId || !filePath) {
      return new Response(
        JSON.stringify({ error: "estimateId and filePath are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create admin Supabase client to access storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Download PDF from storage ────────────────────────────────────
    console.log(`Downloading PDF: ${filePath}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("estimate-pdfs")
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download PDF from storage" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64Pdf = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    const fileSizeMB = arrayBuffer.byteLength / (1024 * 1024);
    console.log(`PDF size: ${fileSizeMB.toFixed(1)}MB`);

    if (fileSizeMB > 20) {
      return new Response(
        JSON.stringify({
          error: "PDF is too large (over 20MB). Please split into smaller files.",
        }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Call Gemini via Lovable AI Gateway ────────────────────────────
    console.log("Calling AI gateway for extraction...");

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
          max_tokens: 32000,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extract all material line items from this supplier quote PDF. Group them by section/category as packs. Ignore all pricing information.`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${base64Pdf}`,
                  },
                },
              ],
            },
          ],
          tools: [EXTRACT_TOOL],
          tool_choice: {
            type: "function",
            function: { name: "extract_estimate_items" },
          },
        }),
      }
    );

    // ── Handle AI gateway errors ─────────────────────────────────────
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

    // ── Parse AI response ────────────────────────────────────────────
    const aiData = await aiResponse.json();
    const warnings: string[] = [];

    // Check for truncation
    const finishReason = aiData.choices?.[0]?.finish_reason;
    if (finishReason === "length") {
      warnings.push(
        "The AI response was truncated — some items at the end of the PDF may be missing. Consider splitting large PDFs."
      );
    }

    let packs: ParsedPack[] = [];

    // Try tool call first (expected path)
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        packs = args.packs || [];
      } catch {
        // Tool call arguments might be truncated — try repair
        console.warn("Tool call JSON parse failed, attempting repair...");
        const repaired = repairAndExtractJSON(toolCall.function.arguments);
        if (repaired) {
          packs = repaired;
          warnings.push("Some data was recovered from a truncated AI response.");
        }
      }
    }

    // Fallback: try to extract from message content
    if (packs.length === 0 && aiData.choices?.[0]?.message?.content) {
      const repaired = repairAndExtractJSON(aiData.choices[0].message.content);
      if (repaired) {
        packs = repaired;
        warnings.push("Extracted data from AI text response (fallback mode).");
      }
    }

    // ── Validate and clean results ───────────────────────────────────
    packs = packs
      .map((pack) => ({
        name: (pack.name || "General").trim(),
        items: (pack.items || [])
          .filter(
            (item) =>
              item.supplier_sku &&
              item.description &&
              typeof item.quantity === "number"
          )
          .map((item) => ({
            supplier_sku: String(item.supplier_sku).replace(/\s+/g, "").toUpperCase(),
            description: String(item.description).trim(),
            quantity: Math.max(0, Number(item.quantity) || 0),
            uom: String(item.uom || "EA").toUpperCase().trim(),
          })),
      }))
      .filter((pack) => pack.items.length > 0);

    const totalItems = packs.reduce((sum, p) => sum + p.items.length, 0);

    if (totalItems === 0) {
      return new Response(
        JSON.stringify({
          error:
            "Could not extract any items from this PDF. The document may not contain recognizable line items. Try a cleaner scan or use CSV upload instead.",
          warnings,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Extracted ${totalItems} items across ${packs.length} packs`);

    // ── Return structured result ─────────────────────────────────────
    const result: ParseResult = { packs, totalItems, warnings };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("parse-estimate-pdf error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

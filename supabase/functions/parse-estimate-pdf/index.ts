import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  ext_price: number;
  unit_price: number;
}

interface ParsedPack {
  name: string;
  items: ParsedItem[];
}

interface ParseResult {
  packs: ParsedPack[];
  totalItems: number;
  warnings: string[];
  estimate_total: number | null;
}

// ── Extraction prompt ──────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a construction materials estimate parser. Your job is to extract structured line items from supplier PDF quotes.

Rules:
- Identify section headings, categories, or groupings as pack names. If no clear sections exist, use "General" as the pack name.
- Extract ONLY material line items — skip headers, footers, page numbers, subtotals, tax lines, terms & conditions, company addresses, and disclaimers.
- For each item extract: supplier SKU, product description, quantity, unit of measure (UOM), and extended price (ext_price — the line total for that item).
- The ext_price is the total cost for that line item (quantity × unit cost). It is usually the last dollar amount on the line.
- Normalize SKUs: strip whitespace, convert to UPPERCASE.
- Common UOMs: EA (each), PC (piece), LF (linear foot), BF (board foot), SF (square foot), BDL (bundle), RL (roll), BX (box), CTN (carton), MSF (thousand square feet), MBF (thousand board feet), GAL (gallon), BAG, SHEET, PAIL.
- If a UOM is not explicit, infer from context (e.g., lumber is typically BF or LF, sheets are EA or SHEET).
- If quantity is missing or unclear, default to 0.
- If ext_price is missing or unclear, default to 0.
- Clean up descriptions: remove embedded pricing data, page artifacts, and formatting noise.
- IMPORTANT: Extract the document's GRAND TOTAL / ESTIMATE TOTAL as a single number. Look for the final total amount on the quote (after tax, or the bottom-line total). If no total is found, return null.`;

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
                    ext_price: {
                      type: "number",
                      description: "Extended price / line total for this item (the total dollar amount for this line). 0 if not found.",
                    },
                  },
                  required: ["supplier_sku", "description", "quantity", "uom", "ext_price"],
                  additionalProperties: false,
                },
              },
            },
            required: ["name", "items"],
            additionalProperties: false,
          },
        },
        estimate_total: {
          type: "number",
          description: "The grand total / bottom-line total amount from the quote document. Null if not found.",
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

// ── DB helper to update upload row status ───────────────────────────────

async function updateUploadStatus(
  supabaseUrl: string,
  serviceKey: string,
  estimateId: string,
  filePath: string,
  status: string,
  parsedResult?: ParseResult | null,
  errorMessage?: string
) {
  const body: Record<string, unknown> = { status };
  if (parsedResult) {
    body.parsed_result = parsedResult;
    body.completed_at = new Date().toISOString();
  }
  if (errorMessage) {
    body.error_message = errorMessage;
    body.completed_at = new Date().toISOString();
  }

  try {
    const resp = await fetch(
      `${supabaseUrl}/rest/v1/estimate_pdf_uploads?estimate_id=eq.${encodeURIComponent(estimateId)}&file_path=eq.${encodeURIComponent(filePath)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(body),
      }
    );
    if (!resp.ok) {
      console.error("Failed to update upload status:", resp.status, await resp.text());
    }
  } catch (e) {
    console.error("Error updating upload status:", e);
  }
}

// ── Main handler ────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  let estimateId = "";
  let filePath = "";

  try {
    const body = await req.json();
    estimateId = body.estimateId;
    filePath = body.filePath;

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

    // Mark as processing
    await updateUploadStatus(supabaseUrl, supabaseServiceKey, estimateId, filePath, "processing");

    // ── Download PDF from storage ────────────────────────────────────
    console.log(`Downloading PDF: ${filePath}`);
    const storageResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/estimate-pdfs/${encodeURIComponent(filePath)}`,
      {
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          apikey: supabaseServiceKey,
        },
      }
    );

    if (!storageResponse.ok) {
      console.error("Download error:", storageResponse.status, await storageResponse.text());
      const errMsg = "Failed to download PDF from storage";
      await updateUploadStatus(supabaseUrl, supabaseServiceKey, estimateId, filePath, "failed", null, errMsg);
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await storageResponse.arrayBuffer();
    const base64Pdf = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    const fileSizeMB = arrayBuffer.byteLength / (1024 * 1024);
    console.log(`PDF size: ${fileSizeMB.toFixed(1)}MB`);

    if (fileSizeMB > 20) {
      const errMsg = "PDF is too large (over 20MB). Please split into smaller files.";
      await updateUploadStatus(supabaseUrl, supabaseServiceKey, estimateId, filePath, "failed", null, errMsg);
      return new Response(
        JSON.stringify({ error: errMsg }),
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
                  text: `Extract all material line items from this supplier quote PDF. Group them by section/category as packs. For each item, extract the extended price (line total). Also extract the grand total.`,
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

      let errMsg = "AI extraction failed. Please try again.";
      let httpStatus = 500;

      if (status === 429) {
        errMsg = "AI service is busy. Please try again in a minute.";
        httpStatus = 429;
      } else if (status === 402) {
        errMsg = "AI credits exhausted. Please add credits to continue.";
        httpStatus = 402;
      }

      await updateUploadStatus(supabaseUrl, supabaseServiceKey, estimateId, filePath, "failed", null, errMsg);
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: httpStatus, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Parse AI response ────────────────────────────────────────────
    const aiText = await aiResponse.text();
    let aiData: any;
    try {
      aiData = JSON.parse(aiText);
    } catch {
      console.error("AI response not valid JSON:", aiText.slice(0, 500));
      const errMsg = "AI returned an invalid response. Please try again.";
      await updateUploadStatus(supabaseUrl, supabaseServiceKey, estimateId, filePath, "failed", null, errMsg);
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const warnings: string[] = [];

    // Check for truncation
    const finishReason = aiData.choices?.[0]?.finish_reason;
    if (finishReason === "length") {
      warnings.push(
        "The AI response was truncated — some items at the end of the PDF may be missing. Consider splitting large PDFs."
      );
    }

    let packs: ParsedPack[] = [];
    let estimate_total: number | null = null;

    // Try tool call first (expected path)
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        packs = args.packs || [];
        if (typeof args.estimate_total === 'number') estimate_total = args.estimate_total;
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

    // ── Validate, clean, and calculate unit_price ────────────────────
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
          .map((item) => {
            const quantity = Math.max(0, Number(item.quantity) || 0);
            const ext_price = Math.max(0, Number(item.ext_price) || 0);
            const unit_price = quantity > 0 && ext_price > 0
              ? Math.round((ext_price / quantity) * 100) / 100
              : 0;

            return {
              supplier_sku: String(item.supplier_sku).replace(/\s+/g, "").toUpperCase(),
              description: String(item.description).trim(),
              quantity,
              uom: String(item.uom || "EA").toUpperCase().trim(),
              ext_price,
              unit_price,
            };
          }),
      }))
      .filter((pack) => pack.items.length > 0);

    const totalItems = packs.reduce((sum, p) => sum + p.items.length, 0);

    if (totalItems === 0) {
      const errMsg = "Could not extract any items from this PDF. The document may not contain recognizable line items. Try a cleaner scan or use CSV upload instead.";
      await updateUploadStatus(supabaseUrl, supabaseServiceKey, estimateId, filePath, "failed", null, errMsg);
      return new Response(
        JSON.stringify({ error: errMsg, warnings }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Extracted ${totalItems} items across ${packs.length} packs`);

    // ── Persist result to DB ─────────────────────────────────────────
    const result: ParseResult = { packs, totalItems, warnings, estimate_total };
    await updateUploadStatus(supabaseUrl, supabaseServiceKey, estimateId, filePath, "completed", result);

    // ── Return structured result ─────────────────────────────────────
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("parse-estimate-pdf error:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";

    // Persist failure if we have context
    if (estimateId && filePath) {
      await updateUploadStatus(supabaseUrl, supabaseServiceKey, estimateId, filePath, "failed", null, errMsg);
    }

    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

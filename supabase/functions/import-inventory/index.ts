import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { read, utils } from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Enhanced category normalization mapping with fallback variants
const CATEGORY_MAP: Record<string, string> = {
  // Decking
  "decking": "Decking",
  
  // Drywall
  "drywall": "Drywall",
  
  // Engineered Wood
  "engineered wood": "Engineered",
  "engineered": "Engineered",
  "engineeredwood": "Engineered",
  
  // Exterior Trim
  "exterior trim": "Exterior",
  "exterior": "Exterior",
  "exteriortrim": "Exterior",
  
  // Framing Accessories  
  "framing accessories": "FramingAccessories",
  "framingaccessories": "FramingAccessories",
  "framing_accessories": "FramingAccessories",
  
  // Framing Lumber
  "framing lumber": "FramingLumber",
  "framinglumber": "FramingLumber",
  "framing_lumber": "FramingLumber",
  
  // Hardware
  "hardware": "Hardware",
  
  // Sheathing (handle typo in file)
  "sheating and plywood": "Sheathing",
  "sheathing and plywood": "Sheathing", 
  "sheathing": "Sheathing",
  "sheatingandplywood": "Sheathing",
  "sheating": "Sheathing",
  
  // Structural Steel
  "structural steel": "Structural",
  "structural": "Structural",
  "structuralsteel": "Structural",
};

function normalizeCategory(category: string | undefined): string {
  if (!category) return "Other";
  
  // Remove all non-printable characters and normalize whitespace
  const cleaned = category
    .replace(/[^\x20-\x7E]/g, ' ')  // Replace non-ASCII with space
    .replace(/\s+/g, ' ')           // Collapse multiple spaces
    .toLowerCase()
    .trim();
  
  // Try direct lookup first
  if (CATEGORY_MAP[cleaned]) {
    return CATEGORY_MAP[cleaned];
  }
  
  // Try without spaces
  const noSpaces = cleaned.replace(/\s/g, '');
  if (CATEGORY_MAP[noSpaces]) {
    return CATEGORY_MAP[noSpaces];
  }
  
  // Log unrecognized categories for debugging
  console.log(`Unrecognized category: "${category}" -> cleaned: "${cleaned}"`);
  
  return "Other";
}

// UOM mapping
function normalizeUOM(qtyType: string | undefined): string {
  if (!qtyType) return "EA";
  const normalized = qtyType.toLowerCase().trim();
  const mapping: Record<string, string> = {
    count: "EA",
    each: "EA",
    lf: "LF",
    sf: "SF",
    bf: "BF",
  };
  return mapping[normalized] || "EA";
}

interface ExcelRow {
  code?: string;
  sku?: string;
  name?: string;
  description?: string;
  "Main Category"?: string;
  main_category?: string;
  "Secondary Category"?: string;
  secondary_category?: string;
  Manufacture?: string;
  manufacturer?: string;
  Use?: string;
  use_type?: string;
  Type?: string;
  product_type?: string;
  Edge?: string;
  edge_type?: string;
  Dimension?: string;
  dimension?: string;
  Thickness?: string;
  thickness?: string;
  Depth?: string;
  depth?: string;
  Width?: string;
  width?: string;
  Length?: string;
  length?: string;
  "Minimum Length"?: number;
  min_length?: number;
  "Maximum Length"?: number;
  max_length?: number;
  "Length Increment"?: number;
  length_increment?: number;
  "Length Unit"?: string;
  length_unit?: string;
  Color?: string;
  color?: string;
  Finish?: string;
  finish?: string;
  "Bundle Name"?: string;
  bundle_name?: string;
  bundle_type?: string;
  "Bundle Count"?: number;
  bundle_count?: number;
  bundle_qty?: number;
  "Wood Species"?: string;
  wood_species?: string;
  qtyType?: string;
  qty_type?: string;
  Diameter?: string;
  diameter?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Parse request body
    const { fileData, supplierId, fileName } = await req.json();

    if (!fileData || !supplierId) {
      return new Response(
        JSON.stringify({ error: "Missing fileData or supplierId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Processing file: ${fileName} for supplier: ${supplierId}`);

    // Decode base64 file data
    const binaryData = Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0));

    // Parse Excel file
    const workbook = read(binaryData, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: ExcelRow[] = utils.sheet_to_json(firstSheet);

    console.log(`Parsed ${rows.length} rows from Excel`);

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No data found in Excel file" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // De-duplicate by SKU (keep last occurrence)
    const uniqueItems = new Map<string, any>();

    for (const row of rows) {
      const sku = row.code || row.sku || "";
      if (!sku) continue;

      const name = row.name || "";
      const description = row.description || row.name || "";
      if (!description) continue;

      // Map category
      const mainCategory = row["Main Category"] || row.main_category || "";
      const category = normalizeCategory(mainCategory);

      // Map UOM
      const qtyType = row.qtyType || row.qty_type || "count";
      const uom = normalizeUOM(qtyType);

      // Parse bundle count
      const bundleQty =
        row["Bundle Count"] || row.bundle_count || row.bundle_qty
          ? parseInt(String(row["Bundle Count"] || row.bundle_count || row.bundle_qty), 10) || null
          : null;

      // Parse length fields
      const minLength = row["Minimum Length"] || row.min_length || null;
      const maxLength = row["Maximum Length"] || row.max_length || null;
      const lengthIncrement = row["Length Increment"] || row.length_increment || null;

      uniqueItems.set(sku, {
        supplier_id: supplierId,
        supplier_sku: sku,
        name: name || null,
        description: description,
        category: category,
        secondary_category: row["Secondary Category"] || row.secondary_category || null,
        manufacturer: row.Manufacture || row.manufacturer || null,
        use_type: row.Use || row.use_type || null,
        product_type: row.Type || row.product_type || null,
        edge_type: row.Edge || row.edge_type || null,
        dimension: row.Dimension || row.dimension || null,
        thickness: row.Thickness || row.thickness || null,
        depth: row.Depth || row.depth || null,
        width: row.Width || row.width || null,
        length: row.Length || row.length || null,
        min_length: minLength ? parseFloat(String(minLength)) : null,
        max_length: maxLength ? parseFloat(String(maxLength)) : null,
        length_increment: lengthIncrement ? parseFloat(String(lengthIncrement)) : null,
        length_unit: row["Length Unit"] || row.length_unit || null,
        color: row.Color || row.color || null,
        finish: row.Finish || row.finish || null,
        bundle_type: row["Bundle Name"] || row.bundle_name || row.bundle_type || null,
        bundle_qty: bundleQty,
        wood_species: row["Wood Species"] || row.wood_species || null,
        diameter: row.Diameter || row.diameter || null,
        uom_default: uom,
      });
    }

    const itemsToInsert = Array.from(uniqueItems.values());
    const duplicatesRemoved = rows.length - itemsToInsert.length;

    console.log(
      `Inserting ${itemsToInsert.length} unique items (${duplicatesRemoved} duplicates merged)`,
    );

    // Delete existing catalog items for this supplier (full replace strategy)
    const { error: deleteError } = await supabase
      .from("catalog_items")
      .delete()
      .eq("supplier_id", supplierId);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return new Response(
        JSON.stringify({ error: `Failed to clear existing catalog: ${deleteError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Insert in batches of 500
    const BATCH_SIZE = 500;
    let insertedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < itemsToInsert.length; i += BATCH_SIZE) {
      const batch = itemsToInsert.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase.from("catalog_items").insert(batch);

      if (insertError) {
        console.error(`Batch insert error at index ${i}:`, insertError);
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${insertError.message}`);
      } else {
        insertedCount += batch.length;
      }
    }

    console.log(`Successfully inserted ${insertedCount} items`);

    // Return results
    return new Response(
      JSON.stringify({
        success: true,
        totalRows: rows.length,
        uniqueItems: itemsToInsert.length,
        insertedCount,
        duplicatesRemoved,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("Error processing import:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to process import";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

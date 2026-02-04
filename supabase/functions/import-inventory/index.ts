import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { read, utils } from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Category mapping from Excel to database enum
const CATEGORY_MAPPING: Record<string, string> = {
  'DECKING': 'Decking',
  'EXTERIOR TRIM': 'Exterior',
  'FRAMING ACCESSORIES': 'Fasteners',
  'FRAMING LUMBER': 'Dimensional',
  'HARDWARE': 'Hardware',
  'SHEATING AND PLYWOOD': 'Sheathing',
  'STRUCTURAL STEEL': 'Structural',
  'ENGINEERED': 'Engineered',
};

// UOM mapping
const UOM_MAPPING: Record<string, string> = {
  'count': 'EA',
  'each': 'EA',
  'piece': 'EA',
  'pcs': 'EA',
  'lineal': 'LF',
  'linear': 'LF',
  'lf': 'LF',
  'sqft': 'SF',
  'sf': 'SF',
  'bundle': 'BDL',
  'bdl': 'BDL',
  'box': 'BOX',
};

interface ExcelRow {
  qtyType?: string;
  code?: string;
  name?: string;
  description?: string;
  'Main Category'?: string;
  'Secondary Category'?: string;
  Manufacture_Deck?: string;
  Use?: string;
  Type?: string;
  Edge?: string;
  Dimension?: string;
  Thickness?: string;
  Depth?: string;
  Width?: string;
  'Minimum Length'?: string;
  'Maximum Length'?: string;
  'Length Increment'?: string;
  'Length Unit'?: string;
  Length?: string;
  Diameter?: string;
  Color?: string;
  Finish?: string;
  'Bundle Name'?: string;
  'Bundle Count'?: string | number;
  'Wood Species'?: string;
  Manufacture?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get supplier_id from query params or body
    const url = new URL(req.url);
    let supplierId = url.searchParams.get('supplier_id');

    // Check content type for body parsing
    const contentType = req.headers.get('content-type') || '';
    let fileBuffer: ArrayBuffer | null = null;

    if (contentType.includes('multipart/form-data')) {
      // Parse multipart form data
      const formData = await req.formData();
      const file = formData.get('file') as File;
      supplierId = supplierId || (formData.get('supplier_id') as string);

      if (!file) {
        return new Response(JSON.stringify({ error: 'No file provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      fileBuffer = await file.arrayBuffer();
    } else if (contentType.includes('application/json')) {
      // Handle JSON body with base64 encoded file
      const body = await req.json();
      supplierId = supplierId || body.supplier_id;

      if (body.file_base64) {
        const binaryString = atob(body.file_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        fileBuffer = bytes.buffer;
      }
    }

    if (!supplierId) {
      return new Response(JSON.stringify({ error: 'supplier_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!fileBuffer) {
      return new Response(JSON.stringify({ error: 'File data is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse Excel file
    const workbook = read(new Uint8Array(fileBuffer), { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData: ExcelRow[] = utils.sheet_to_json(worksheet);

    console.log(`Parsed ${rawData.length} rows from Excel file`);

    // Transform rows to catalog items
    const catalogItems: any[] = [];
    const seenSkus = new Set<string>();
    let skippedDuplicates = 0;
    let skippedNoSku = 0;
    let skippedNoCategory = 0;

    for (const row of rawData) {
      // Skip rows without SKU
      const sku = row.code?.toString().trim();
      if (!sku) {
        skippedNoSku++;
        continue;
      }

      // Skip duplicate SKUs (keep last one)
      if (seenSkus.has(sku)) {
        skippedDuplicates++;
        // Remove previous entry
        const prevIndex = catalogItems.findIndex(item => item.supplier_sku === sku);
        if (prevIndex > -1) {
          catalogItems.splice(prevIndex, 1);
        }
      }
      seenSkus.add(sku);

      // Get category - skip if no main category
      const mainCategory = row['Main Category']?.toString().trim().toUpperCase();
      const dbCategory = mainCategory ? CATEGORY_MAPPING[mainCategory] : null;
      
      if (!dbCategory && !mainCategory) {
        skippedNoCategory++;
        continue;
      }

      // Get UOM
      const qtyType = row.qtyType?.toString().toLowerCase().trim() || 'count';
      const uom = UOM_MAPPING[qtyType] || 'EA';

      // Get manufacturer (prefer Manufacture_Deck for decking, otherwise use Manufacture)
      const manufacturer = row.Manufacture_Deck?.toString().trim() || row.Manufacture?.toString().trim() || null;

      // Parse bundle count
      let bundleQty: number | null = null;
      if (row['Bundle Count']) {
        const parsed = parseInt(row['Bundle Count'].toString(), 10);
        if (!isNaN(parsed) && parsed > 0) {
          bundleQty = parsed;
        }
      }

      // Parse min/max length as numbers
      let minLength: number | null = null;
      let maxLength: number | null = null;
      if (row['Minimum Length']) {
        const parsed = parseFloat(row['Minimum Length'].toString());
        if (!isNaN(parsed)) minLength = parsed;
      }
      if (row['Maximum Length']) {
        const parsed = parseFloat(row['Maximum Length'].toString());
        if (!isNaN(parsed)) maxLength = parsed;
      }

      const item = {
        supplier_id: supplierId,
        supplier_sku: sku,
        name: row.name?.toString().trim() || null,
        description: row.description?.toString().trim() || row.name?.toString().trim() || sku,
        category: dbCategory || 'Other',
        secondary_category: row['Secondary Category']?.toString().trim().toUpperCase() || null,
        manufacturer,
        use_type: row.Use?.toString().trim() || null,
        product_type: row.Type?.toString().trim() || null,
        dimension: row.Dimension?.toString().trim() || null,
        thickness: row.Thickness?.toString().trim() || null,
        length: row.Length?.toString().trim() || null,
        color: row.Color?.toString().trim() || null,
        finish: row.Finish?.toString().trim() || null,
        bundle_type: row['Bundle Name']?.toString().trim() || null,
        bundle_qty: bundleQty,
        wood_species: row['Wood Species']?.toString().trim() || null,
        uom_default: uom,
        min_length: minLength,
        max_length: maxLength,
        edge_type: row.Edge?.toString().trim() || null,
        depth: row.Depth?.toString().trim() || null,
        width: row.Width?.toString().trim() || null,
        diameter: row.Diameter?.toString().trim() || null,
        length_unit: row['Length Unit']?.toString().trim() || null,
        length_increment: row['Length Increment'] ? parseFloat(row['Length Increment'].toString()) : null,
      };

      catalogItems.push(item);
    }

    console.log(`Prepared ${catalogItems.length} items for import`);
    console.log(`Skipped: ${skippedNoSku} no SKU, ${skippedDuplicates} duplicates, ${skippedNoCategory} no category`);

    // Delete existing items for this supplier
    const { error: deleteError } = await supabase
      .from('catalog_items')
      .delete()
      .eq('supplier_id', supplierId);

    if (deleteError) {
      console.error('Error deleting existing items:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to clear existing catalog', details: deleteError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Deleted existing catalog items');

    // Insert in batches of 500
    const batchSize = 500;
    let insertedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < catalogItems.length; i += batchSize) {
      const batch = catalogItems.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from('catalog_items')
        .insert(batch)
        .select('id');

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
        errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
      } else {
        insertedCount += data?.length || 0;
      }
    }

    // Get category counts for summary
    const { data: categoryCounts } = await supabase
      .from('catalog_items')
      .select('category')
      .eq('supplier_id', supplierId);

    const countByCategory: Record<string, number> = {};
    categoryCounts?.forEach(item => {
      countByCategory[item.category] = (countByCategory[item.category] || 0) + 1;
    });

    const response = {
      success: true,
      inserted: insertedCount,
      total_rows: rawData.length,
      skipped: {
        no_sku: skippedNoSku,
        duplicates: skippedDuplicates,
        no_category: skippedNoCategory,
      },
      categories: countByCategory,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Import complete:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({ 
      error: 'Import failed', 
      details: error instanceof Error ? error.message : String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

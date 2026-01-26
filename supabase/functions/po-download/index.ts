import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const downloadToken = url.searchParams.get("token");
    const format = url.searchParams.get("format") || "csv";
    const authHeader = req.headers.get("Authorization");

    // Two modes: download_token (for external share links) OR authenticated request
    let po: any = null;
    let lineItems: any[] = [];

    if (downloadToken) {
      // Token-based download (for supplier access via email link)
      // Use service role since suppliers may not have accounts
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: poData, error: poError } = await serviceClient
        .from("purchase_orders")
        .select(`
          *,
          organization:organizations(name, org_code),
          supplier:suppliers(name, supplier_code),
          project:projects(name),
          work_item:work_items(title)
        `)
        .eq("download_token", downloadToken)
        .single();

      if (poError || !poData) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired download link" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      po = poData;
      
      const { data: items } = await serviceClient
        .from("po_line_items")
        .select("*")
        .eq("po_id", po.id)
        .order("line_number");
      
      lineItems = items || [];
    } else if (authHeader?.startsWith('Bearer ')) {
      // Authenticated download - verify user has access via RLS
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      // Validate the JWT token by getting the user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const poId = url.searchParams.get("po_id");
      if (!poId) {
        return new Response(
          JSON.stringify({ error: "Missing po_id parameter" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Fetch PO with RLS - user must have access
      const { data: poData, error: poError } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          organization:organizations(name, org_code),
          supplier:suppliers(name, supplier_code),
          project:projects(name),
          work_item:work_items(title)
        `)
        .eq("id", poId)
        .single();

      if (poError || !poData) {
        return new Response(
          JSON.stringify({ error: "PO not found or access denied" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      po = poData;
      
      const { data: items } = await supabase
        .from("po_line_items")
        .select("*")
        .eq("po_id", po.id)
        .order("line_number");
      
      lineItems = items || [];
    } else {
      return new Response(
        JSON.stringify({ error: "Unauthorized - provide token or Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const items = lineItems;
    const projectName = po.project?.name || po.work_item?.title || "";

    if (format === "csv") {
      // Generate CSV
      const csvHeader = "Line,SKU,Description,Quantity,UOM,Pieces,Length_Ft,Board_Feet,Linear_Feet,Notes";
      const csvRows = items.map((item: any) => 
        [
          item.line_number,
          `"${(item.supplier_sku || '').replace(/"/g, '""')}"`,
          `"${(item.description || '').replace(/"/g, '""')}"`,
          item.quantity,
          item.uom,
          item.pieces || '',
          item.length_ft || '',
          item.computed_bf || '',
          item.computed_lf || '',
          `"${(item.notes || '').replace(/"/g, '""')}"`
        ].join(",")
      );

      const csvContent = [
        `# Purchase Order: ${po.po_number}`,
        `# Name: ${po.po_name}`,
        `# Supplier: ${po.supplier?.name} (${po.supplier?.supplier_code})`,
        `# Project: ${projectName}`,
        `# Generated: ${new Date().toISOString()}`,
        "",
        csvHeader,
        ...csvRows
      ].join("\n");

      return new Response(csvContent, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${po.po_number}.csv"`,
        },
      });
    } else if (format === "pdf") {
      // Generate simple HTML that can be printed as PDF
      // For a production app, you'd use a PDF library like jsPDF or puppeteer
      const itemsHtml = items.map((item: any) => `
        <tr>
          <td>${item.line_number}</td>
          <td>${item.supplier_sku || '-'}</td>
          <td>${item.description}</td>
          <td style="text-align: right;">${item.quantity}</td>
          <td>${item.uom}</td>
          ${item.computed_bf ? `<td style="text-align: right;">${item.computed_bf}</td>` : '<td>-</td>'}
          ${item.computed_lf ? `<td style="text-align: right;">${item.computed_lf}</td>` : '<td>-</td>'}
        </tr>
      `).join("");

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${po.po_number}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { margin-bottom: 5px; }
    .header { margin-bottom: 30px; }
    .info { background: #f5f5f5; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .info p { margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #333; color: white; }
    tr:nth-child(even) { background: #f9f9f9; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Purchase Order</h1>
    <h2>${po.po_number}</h2>
  </div>
  
  <div class="info">
    <p><strong>PO Name:</strong> ${po.po_name}</p>
    <p><strong>From:</strong> ${po.organization?.name} (${po.organization?.org_code})</p>
    <p><strong>To:</strong> ${po.supplier?.name} (${po.supplier?.supplier_code})</p>
    <p><strong>Project:</strong> ${projectName}</p>
    <p><strong>Date:</strong> ${new Date(po.created_at).toLocaleDateString()}</p>
    ${po.sent_at ? `<p><strong>Sent:</strong> ${new Date(po.sent_at).toLocaleDateString()}</p>` : ''}
  </div>
  
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>SKU</th>
        <th>Description</th>
        <th>Qty</th>
        <th>UOM</th>
        <th>BF</th>
        <th>LF</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
  
  ${po.notes ? `<div style="margin-top: 20px;"><strong>Notes:</strong> ${po.notes}</div>` : ''}
  
  <div class="footer">
    <p>Generated by Ontime.Build on ${new Date().toLocaleString()}</p>
    <p>To save as PDF: Press Ctrl+P (or Cmd+P) and select "Save as PDF"</p>
  </div>
</body>
</html>
      `;

      return new Response(htmlContent, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html",
        },
      });
    }

    return new Response("Invalid format", { status: 400, headers: corsHeaders });
  } catch (error: any) {
    console.error("Error generating download:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

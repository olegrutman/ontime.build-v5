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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const returnId = url.searchParams.get("return_id");
    if (!returnId) {
      return new Response("return_id required", { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch return with items and org names
    const { data: ret, error: retErr } = await supabase
      .from("returns")
      .select(`
        *,
        return_items(*),
        supplier_org:supplier_org_id(name),
        created_by_org:created_by_org_id(name),
        pricing_owner:pricing_owner_org_id(name)
      `)
      .eq("id", returnId)
      .single();

    if (retErr || !ret) {
      return new Response("Return not found", { status: 404, headers: corsHeaders });
    }

    // Fetch project name
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", ret.project_id)
      .single();

    const returnableItems = (ret.return_items || []).filter(
      (i: any) => i.returnable_flag === "Yes"
    );

    const itemRows = returnableItems
      .map(
        (item: any) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${item.description_snapshot}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.qty_requested}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${item.uom}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">$${(item.credit_unit_price || 0).toFixed(2)}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">$${(item.credit_line_total || 0).toFixed(2)}</td>
        </tr>`
      )
      .join("");

    const restockingLabel =
      ret.restocking_type === "Percent"
        ? `Restocking Fee (${ret.restocking_value}%)`
        : ret.restocking_type === "Flat"
        ? "Restocking Fee (Flat)"
        : "Restocking Fee";

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Credit Memo – ${ret.return_number}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; font-size: 14px; }
    .meta dt { color: #6b7280; margin: 0; }
    .meta dd { margin: 0 0 8px; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; }
    th { background: #f9fafb; padding: 10px 8px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600; }
    .totals { width: 300px; margin-left: auto; font-size: 14px; }
    .totals tr td { padding: 6px 0; }
    .totals .total { font-weight: 700; font-size: 16px; border-top: 2px solid #1a1a1a; padding-top: 8px; }
    .footer { margin-top: 40px; font-size: 12px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <h1>Credit Memo</h1>
  <p class="subtitle">${ret.return_number} • ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

  <div class="meta">
    <dl>
      <dt>Project</dt>
      <dd>${project?.name || "—"}</dd>
      <dt>Supplier</dt>
      <dd>${(ret as any).supplier_org?.name || "—"}</dd>
    </dl>
    <dl>
      <dt>Material Responsible Party</dt>
      <dd>${(ret as any).pricing_owner?.name || (ret as any).created_by_org?.name || "—"}</dd>
      <dt>Return Reason</dt>
      <dd>${ret.reason}${ret.wrong_type ? " – " + ret.wrong_type : ""}</dd>
    </dl>
  </div>

  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th style="text-align:center;">Qty</th>
        <th>UOM</th>
        <th style="text-align:right;">Unit Price</th>
        <th style="text-align:right;">Line Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <table class="totals">
    <tr>
      <td>Credit Subtotal</td>
      <td style="text-align:right;">$${(ret.credit_subtotal || 0).toFixed(2)}</td>
    </tr>
    <tr>
      <td>${restockingLabel}</td>
      <td style="text-align:right;color:#dc2626;">-$${(ret.restocking_total || 0).toFixed(2)}</td>
    </tr>
    <tr class="total">
      <td>Net Credit</td>
      <td style="text-align:right;">$${(ret.net_credit_total || 0).toFixed(2)}</td>
    </tr>
  </table>

  <p class="footer">Generated by Ontime.Build</p>
</body>
</html>`;

    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

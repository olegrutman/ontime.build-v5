import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const invoiceId = url.searchParams.get("invoice_id");
    const authHeader = req.headers.get("Authorization");

    if (!invoiceId) {
      return new Response("Missing invoice_id", { status: 400, headers: corsHeaders });
    }

    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create client with user's auth token to respect RLS policies
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate the JWT token by getting the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("Token validation failed:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch invoice with related data - RLS will enforce access control
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        *,
        project:projects(name, city, state),
        contract:project_contracts(
          from_role,
          to_role,
          contract_sum,
          retainage_percent,
          from_org:organizations!project_contracts_from_org_id_fkey(name),
          to_org:organizations!project_contracts_to_org_id_fkey(name)
        )
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error("Invoice fetch error:", invoiceError);
      return new Response(
        JSON.stringify({ error: "Invoice not found or access denied" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch line items - RLS will also apply here
    const { data: lineItems, error: lineItemsError } = await supabase
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("sort_order");

    if (lineItemsError) {
      console.error("Line items fetch error:", lineItemsError);
    }

    const items = lineItems || [];

    // Calculate totals
    const scheduledTotal = items.reduce((sum, item) => sum + (item.scheduled_value || 0), 0);
    const previousTotal = items.reduce((sum, item) => sum + (item.previous_billed || 0), 0);
    const currentTotal = items.reduce((sum, item) => sum + (item.current_billed || 0), 0);
    const totalBilledSum = items.reduce((sum, item) => sum + (item.total_billed || 0), 0);
    const retainageTotal = items.reduce((sum, item) => sum + (item.retainage_amount || 0), 0);

    // Generate line items HTML
    const itemsHtml = items.map((item, index) => {
      const percentComplete = item.scheduled_value > 0
        ? ((item.total_billed / item.scheduled_value) * 100).toFixed(1)
        : '0.0';
      const remaining = item.scheduled_value - item.total_billed;
      const isOverbilled = remaining < 0;

      return `
        <tr${isOverbilled ? ' class="overbilled"' : ''}>
          <td>${index + 1}</td>
          <td>${item.description}</td>
          <td class="amount">${formatCurrency(item.scheduled_value)}</td>
          <td class="amount">${formatCurrency(item.previous_billed)}</td>
          <td class="amount current">${formatCurrency(item.current_billed)}</td>
          <td class="amount">${formatCurrency(item.total_billed)}</td>
          <td class="amount${isOverbilled ? ' overbilled-text' : ''}">${formatCurrency(remaining)}</td>
          <td class="amount${parseFloat(percentComplete) > 100 ? ' overbilled-text' : ''}">${percentComplete}%</td>
        </tr>
      `;
    }).join("");

    // Status badge color
    const statusColors: Record<string, string> = {
      DRAFT: '#6b7280',
      SUBMITTED: '#3b82f6',
      APPROVED: '#22c55e',
      REJECTED: '#ef4444',
      PAID: '#a855f7',
    };
    const statusColor = statusColors[invoice.status] || '#6b7280';

    // Build project and party info
    const projectName = invoice.project?.name || 'Unknown Project';
    const projectLocation = [invoice.project?.city, invoice.project?.state].filter(Boolean).join(', ');
    const fromParty = invoice.contract?.from_org?.name || invoice.contract?.from_role || 'N/A';
    const toParty = invoice.contract?.to_org?.name || invoice.contract?.to_role || 'N/A';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      margin: 0; 
      padding: 40px;
      color: #1f2937;
      font-size: 12px;
      line-height: 1.5;
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start;
      margin-bottom: 30px; 
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .header-left h1 { 
      margin: 0 0 5px 0; 
      font-size: 28px;
      color: #111827;
    }
    .header-left .invoice-number { 
      font-size: 18px; 
      color: #6b7280;
      font-weight: 500;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      color: white;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      background-color: ${statusColor};
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    .info-box {
      background: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .info-box h3 {
      margin: 0 0 10px 0;
      font-size: 11px;
      text-transform: uppercase;
      color: #6b7280;
      letter-spacing: 0.5px;
    }
    .info-box p {
      margin: 4px 0;
      font-size: 13px;
    }
    .info-box .value {
      font-weight: 600;
      color: #111827;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 20px;
      font-size: 11px;
    }
    th { 
      background: #1f2937; 
      color: white; 
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    th.amount { text-align: right; }
    td { 
      border-bottom: 1px solid #e5e7eb; 
      padding: 10px 8px;
    }
    td.amount { text-align: right; font-family: 'Courier New', monospace; }
    td.current { font-weight: 600; color: #059669; }
    tr:nth-child(even) { background: #f9fafb; }
    tr.overbilled { background: #fef2f2; }
    .overbilled-text { color: #dc2626; font-weight: 600; }
    
    .totals-section {
      margin-top: 30px;
      display: flex;
      justify-content: flex-end;
    }
    .totals-box {
      width: 350px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
    }
    .totals-row:last-child { border-bottom: none; }
    .totals-row.highlight {
      background: #1f2937;
      color: white;
    }
    .totals-row .label { font-weight: 500; }
    .totals-row .value { 
      font-family: 'Courier New', monospace; 
      font-weight: 600;
    }
    .totals-row.retainage .value { color: #d97706; }
    .totals-row.highlight .value { font-size: 16px; }

    .notes-section {
      margin-top: 30px;
      padding: 16px;
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 8px;
    }
    .notes-section h3 {
      margin: 0 0 8px 0;
      font-size: 12px;
      color: #92400e;
    }
    .notes-section p {
      margin: 0;
      color: #78350f;
    }

    .rejection-section {
      margin-top: 30px;
      padding: 16px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
    }
    .rejection-section h3 {
      margin: 0 0 8px 0;
      font-size: 12px;
      color: #991b1b;
    }
    .rejection-section p {
      margin: 0;
      color: #7f1d1d;
    }
    
    .footer { 
      margin-top: 40px; 
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 10px; 
      color: #9ca3af;
      text-align: center;
    }
    
    @media print { 
      body { margin: 20px; padding: 20px; }
      .header { page-break-after: avoid; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>Invoice</h1>
      <div class="invoice-number">${invoice.invoice_number}</div>
    </div>
    <div class="status-badge">${invoice.status}</div>
  </div>
  
  <div class="info-grid">
    <div class="info-box">
      <h3>Project Details</h3>
      <p><span class="value">${projectName}</span></p>
      ${projectLocation ? `<p>${projectLocation}</p>` : ''}
    </div>
    <div class="info-box">
      <h3>Billing Period</h3>
      <p><span class="value">${formatDate(invoice.billing_period_start)} – ${formatDate(invoice.billing_period_end)}</span></p>
      <p>Created: ${formatDate(invoice.created_at)}</p>
    </div>
    <div class="info-box">
      <h3>From</h3>
      <p><span class="value">${fromParty}</span></p>
    </div>
    <div class="info-box">
      <h3>To</h3>
      <p><span class="value">${toParty}</span></p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40px;">#</th>
        <th>Description</th>
        <th class="amount">Scheduled Value</th>
        <th class="amount">Previous Billed</th>
        <th class="amount">This Period</th>
        <th class="amount">Total Billed</th>
        <th class="amount">Remaining</th>
        <th class="amount">% Complete</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="totals-section">
    <div class="totals-box">
      <div class="totals-row">
        <span class="label">Scheduled Value Total</span>
        <span class="value">${formatCurrency(scheduledTotal)}</span>
      </div>
      <div class="totals-row">
        <span class="label">Previously Billed</span>
        <span class="value">${formatCurrency(previousTotal)}</span>
      </div>
      <div class="totals-row">
        <span class="label">Current Period Subtotal</span>
        <span class="value">${formatCurrency(invoice.subtotal)}</span>
      </div>
      <div class="totals-row retainage">
        <span class="label">Retainage Withheld</span>
        <span class="value">-${formatCurrency(invoice.retainage_amount)}</span>
      </div>
      <div class="totals-row highlight">
        <span class="label">Total Due This Period</span>
        <span class="value">${formatCurrency(invoice.total_amount)}</span>
      </div>
    </div>
  </div>

  ${invoice.notes ? `
  <div class="notes-section">
    <h3>Notes</h3>
    <p>${invoice.notes}</p>
  </div>
  ` : ''}

  ${invoice.status === 'REJECTED' && invoice.rejection_reason ? `
  <div class="rejection-section">
    <h3>Rejection Reason</h3>
    <p>${invoice.rejection_reason}</p>
  </div>
  ` : ''}
  
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
  } catch (error: any) {
    console.error("Error generating invoice download:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

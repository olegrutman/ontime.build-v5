import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

const ITEM_TYPE_LABELS: Record<string, string> = {
  PROJECT: 'Project',
  SOV_ITEM: 'SOV Item',
  CHANGE_WORK: 'Work Order',
  TM_WORK: 'T&M Work',
};

const STATE_COLORS: Record<string, string> = {
  OPEN: '#3b82f6',
  PRICED: '#f59e0b',
  APPROVED: '#22c55e',
  EXECUTED: '#a855f7',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const workItemId = url.searchParams.get("work_item_id");
    const authHeader = req.headers.get("Authorization");

    if (!workItemId) {
      return new Response(
        JSON.stringify({ error: "Missing work_item_id" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch work item with project info
    const { data: workItem, error: wiError } = await supabase
      .from("work_items")
      .select(`
        *,
        project:projects(name, city, state),
        organization:organizations(name, org_code)
      `)
      .eq("id", workItemId)
      .single();

    if (wiError || !workItem) {
      return new Response(
        JSON.stringify({ error: "Work item not found or access denied" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch labor entries, materials (change_work_pricing), and participants in parallel
    const [laborRes, pricingRes, participantsRes] = await Promise.all([
      supabase
        .from("labor_entries")
        .select("*")
        .eq("work_item_id", workItemId)
        .order("entry_date"),
      supabase
        .from("change_work_pricing")
        .select("*")
        .eq("work_item_id", workItemId)
        .order("sort_order"),
      supabase
        .from("work_item_participants")
        .select(`
          role,
          organization:organizations(name, org_code)
        `)
        .eq("work_item_id", workItemId),
    ]);

    const laborEntries = laborRes.data || [];
    const pricingItems = pricingRes.data || [];
    const participants = participantsRes.data || [];

    const stateColor = STATE_COLORS[workItem.state] || '#6b7280';
    const typeLabel = ITEM_TYPE_LABELS[workItem.item_type] || workItem.item_type;
    const projectName = workItem.project?.name || '';
    const projectLocation = [workItem.project?.city, workItem.project?.state].filter(Boolean).join(', ');
    const orgName = workItem.organization?.name || '';

    // Build labor table
    const totalLaborHours = laborEntries.reduce((sum: number, e: any) => sum + (e.hours || 0), 0);
    const totalLaborCost = laborEntries.reduce((sum: number, e: any) => sum + ((e.hours || 0) * (e.hourly_rate || 0)), 0);

    const laborHtml = laborEntries.length > 0 ? `
      <h3>Labor Entries</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th class="amount">Hours</th>
            <th class="amount">Rate</th>
            <th class="amount">Total</th>
          </tr>
        </thead>
        <tbody>
          ${laborEntries.map((e: any) => `
            <tr>
              <td>${formatDate(e.entry_date)}</td>
              <td>${e.description || '—'}</td>
              <td class="amount">${e.hours}</td>
              <td class="amount">${e.hourly_rate ? formatCurrency(e.hourly_rate) : '—'}</td>
              <td class="amount">${e.hourly_rate ? formatCurrency(e.hours * e.hourly_rate) : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="2"><strong>Total</strong></td>
            <td class="amount"><strong>${totalLaborHours}</strong></td>
            <td></td>
            <td class="amount"><strong>${totalLaborCost > 0 ? formatCurrency(totalLaborCost) : '—'}</strong></td>
          </tr>
        </tfoot>
      </table>
    ` : '';

    // Build pricing/materials table
    const totalPricing = pricingItems.reduce((sum: number, p: any) => sum + ((p.quantity || 0) * (p.unit_price || 0)), 0);

    const pricingHtml = pricingItems.length > 0 ? `
      <h3>Pricing / Materials</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th class="amount">Qty</th>
            <th>UOM</th>
            <th class="amount">Unit Price</th>
            <th class="amount">Total</th>
          </tr>
        </thead>
        <tbody>
          ${pricingItems.map((p: any) => `
            <tr>
              <td>${p.sort_order}</td>
              <td>${p.description}</td>
              <td class="amount">${p.quantity}</td>
              <td>${p.uom}</td>
              <td class="amount">${formatCurrency(p.unit_price)}</td>
              <td class="amount">${formatCurrency(p.quantity * p.unit_price)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="5"><strong>Total</strong></td>
            <td class="amount"><strong>${formatCurrency(totalPricing)}</strong></td>
          </tr>
        </tfoot>
      </table>
    ` : '';

    // Participants list
    const participantsHtml = participants.length > 0 ? `
      <h3>Participants</h3>
      <div class="participants-list">
        ${participants.map((p: any) => `
          <div class="participant">
            <span class="participant-org">${p.organization?.name || 'Unknown'}</span>
            <span class="participant-role">${p.role}</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${typeLabel} — ${workItem.title}</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      margin: 0; padding: 40px;
      color: #1f2937; font-size: 12px; line-height: 1.5;
    }
    .header { 
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;
    }
    .header-left h1 { margin: 0 0 5px 0; font-size: 24px; color: #111827; }
    .header-left .subtitle { font-size: 14px; color: #6b7280; font-weight: 500; }
    .status-badge {
      display: inline-block; padding: 6px 16px; border-radius: 20px;
      color: white; font-weight: 600; font-size: 12px;
      text-transform: uppercase; background-color: ${stateColor};
    }
    .type-badge {
      display: inline-block; padding: 4px 10px; border-radius: 4px;
      background: #e5e7eb; color: #374151; font-size: 11px;
      font-weight: 600; text-transform: uppercase; margin-right: 8px;
    }
    .info-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;
    }
    .info-box {
      background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;
    }
    .info-box h3 { margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; }
    .info-box p { margin: 4px 0; font-size: 13px; }
    .info-box .value { font-weight: 600; color: #111827; }
    .description-box { 
      margin-bottom: 30px; padding: 16px; background: #f9fafb;
      border: 1px solid #e5e7eb; border-radius: 8px;
    }
    .description-box h3 { margin: 0 0 8px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .description-box p { margin: 0; color: #374151; white-space: pre-wrap; }
    h3 { color: #111827; font-size: 16px; margin: 30px 0 12px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
    th { background: #1f2937; color: white; padding: 10px 8px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; }
    th.amount { text-align: right; }
    td { border-bottom: 1px solid #e5e7eb; padding: 10px 8px; }
    td.amount { text-align: right; font-family: 'Courier New', monospace; }
    tr:nth-child(even) { background: #f9fafb; }
    .total-row { background: #f3f4f6 !important; border-top: 2px solid #d1d5db; }
    .participants-list { display: flex; flex-wrap: wrap; gap: 12px; }
    .participant { background: #f3f4f6; padding: 8px 14px; border-radius: 6px; font-size: 12px; }
    .participant-org { font-weight: 600; margin-right: 6px; }
    .participant-role { color: #6b7280; }
    .amount-card {
      display: inline-block; margin-top: 10px; padding: 12px 20px;
      background: #1f2937; color: white; border-radius: 8px; font-size: 18px; font-weight: 700;
    }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
    @media print { body { margin: 20px; padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${workItem.title}</h1>
      <div class="subtitle">
        <span class="type-badge">${typeLabel}</span>
        ${workItem.code ? `<span>${workItem.code}</span>` : ''}
      </div>
    </div>
    <div class="status-badge">${workItem.state}</div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>Project</h3>
      <p><span class="value">${projectName}</span></p>
      ${projectLocation ? `<p>${projectLocation}</p>` : ''}
    </div>
    <div class="info-box">
      <h3>Organization</h3>
      <p><span class="value">${orgName}</span></p>
    </div>
    ${workItem.location_ref ? `
    <div class="info-box">
      <h3>Location</h3>
      <p><span class="value">${workItem.location_ref}</span></p>
    </div>` : ''}
    <div class="info-box">
      <h3>Created</h3>
      <p><span class="value">${formatDate(workItem.created_at)}</span></p>
    </div>
  </div>

  ${workItem.amount !== null ? `
  <div>
    <strong>Contract Amount:</strong>
    <div class="amount-card">${formatCurrency(workItem.amount)}</div>
  </div>` : ''}

  ${workItem.description ? `
  <div class="description-box">
    <h3>Description</h3>
    <p>${workItem.description}</p>
  </div>` : ''}

  ${pricingHtml}
  ${laborHtml}
  ${participantsHtml}

  ${workItem.rejection_notes ? `
  <div style="margin-top: 20px; padding: 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">
    <h3 style="margin: 0 0 8px 0; font-size: 12px; color: #991b1b;">Rejection Notes</h3>
    <p style="margin: 0; color: #7f1d1d;">${workItem.rejection_notes}</p>
  </div>` : ''}

  <div class="footer">
    <p>Generated by Ontime.Build on ${new Date().toLocaleString()}</p>
    <p>To save as PDF: Press Ctrl+P (or Cmd+P) and select "Save as PDF"</p>
  </div>
</body>
</html>
    `;

    return new Response(htmlContent, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  } catch (error: any) {
    console.error("Error generating work order download:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

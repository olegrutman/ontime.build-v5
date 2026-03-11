import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function fmt(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("project_id");
    const authHeader = req.headers.get("Authorization");

    if (!projectId) return new Response("Missing project_id", { status: 400, headers: corsHeaders });
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch project
    const { data: project, error: pErr } = await supabase.from("projects").select("*").eq("id", projectId).single();
    if (pErr || !project) return new Response("Project not found", { status: 404, headers: corsHeaders });

    // Fetch org name
    const { data: org } = await supabase.from("organizations").select("name, type").eq("id", project.organization_id).single();

    // Fetch contracts
    const { data: contracts } = await supabase
      .from("project_contracts")
      .select("*, from_org:organizations!project_contracts_from_org_id_fkey(name), to_org:organizations!project_contracts_to_org_id_fkey(name)")
      .eq("project_id", projectId);

    // Fetch work orders
    const { data: workOrders } = await supabase
      .from("change_order_projects")
      .select("id, title, status, final_price, pricing_mode, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    // Fetch invoices
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, invoice_number, status, total_amount, billing_period_start, billing_period_end")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    // Fetch team
    const { data: team } = await supabase
      .from("project_participants")
      .select("role, invite_status, organization:organizations!project_participants_organization_id_fkey(name)")
      .eq("project_id", projectId);

    // Compute stats
    const wos = workOrders || [];
    const woStatusCounts: Record<string, number> = {};
    let woTotalValue = 0;
    wos.forEach(wo => {
      woStatusCounts[wo.status] = (woStatusCounts[wo.status] || 0) + 1;
      woTotalValue += wo.final_price || 0;
    });

    const invs = invoices || [];
    const invStatusCounts: Record<string, number> = {};
    let invTotalAmount = 0;
    invs.forEach(inv => {
      invStatusCounts[inv.status] = (invStatusCounts[inv.status] || 0) + 1;
      invTotalAmount += inv.total_amount || 0;
    });

    const contractTotal = (contracts || []).reduce((s, c) => s + (c.contract_sum || 0), 0);

    const woRows = wos.map((wo, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${wo.title}</td>
        <td><span class="badge badge-${wo.status}">${wo.status}</span></td>
        <td class="amount">${wo.final_price ? fmt(wo.final_price) : '—'}</td>
        <td>${fmtDate(wo.created_at)}</td>
      </tr>
    `).join('');

    const invRows = invs.map((inv, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${inv.invoice_number}</td>
        <td><span class="badge badge-${inv.status}">${inv.status}</span></td>
        <td class="amount">${fmt(inv.total_amount)}</td>
        <td>${fmtDate(inv.billing_period_start)} – ${fmtDate(inv.billing_period_end)}</td>
      </tr>
    `).join('');

    const teamRows = (team || []).map((t: any) => `
      <tr>
        <td>${t.organization?.name || '—'}</td>
        <td>${t.role}</td>
        <td>${t.invite_status}</td>
      </tr>
    `).join('');

    const addr = project.address;
    const location = addr ? [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ') : (project.city ? `${project.city}, ${project.state}` : '—');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Project Summary – ${project.name}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; color: #1f2937; font-size: 12px; line-height: 1.5; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 30px 0 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; }
  .subtitle { color: #6b7280; font-size: 13px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
  .box { background: #f9fafb; padding: 14px; border-radius: 8px; border: 1px solid #e5e7eb; }
  .box h3 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; }
  .box .val { font-size: 18px; font-weight: 700; color: #111827; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
  th { background: #1f2937; color: white; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
  td { border-bottom: 1px solid #e5e7eb; padding: 8px; }
  td.amount { text-align: right; font-family: 'Courier New', monospace; }
  tr:nth-child(even) { background: #f9fafb; }
  .badge { padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
  .badge-draft, .badge-DRAFT { background: #e5e7eb; color: #374151; }
  .badge-submitted, .badge-SUBMITTED { background: #dbeafe; color: #1d4ed8; }
  .badge-approved, .badge-APPROVED, .badge-contracted { background: #dcfce7; color: #166534; }
  .badge-rejected, .badge-REJECTED { background: #fee2e2; color: #991b1b; }
  .badge-PAID { background: #f3e8ff; color: #7e22ce; }
  .badge-active { background: #dcfce7; color: #166534; }
  .badge-priced { background: #fef3c7; color: #92400e; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
  @media print { body { margin: 20px; padding: 20px; } }
</style></head>
<body>
  <h1>${project.name}</h1>
  <p class="subtitle">${org?.name || ''} · ${org?.type || ''} · ${location}</p>
  <p class="subtitle">Status: <span class="badge badge-${project.status}">${project.status}</span> · Generated ${fmtDate(new Date().toISOString())}</p>

  <h2>Financial Summary</h2>
  <div class="grid">
    <div class="box"><h3>Contract Value</h3><div class="val">${fmt(contractTotal)}</div></div>
    <div class="box"><h3>Work Order Value</h3><div class="val">${fmt(woTotalValue)}</div></div>
    <div class="box"><h3>Total Invoiced</h3><div class="val">${fmt(invTotalAmount)}</div></div>
    <div class="box"><h3>Work Orders</h3><div class="val">${wos.length}</div></div>
  </div>

  <h2>Work Orders (${wos.length})</h2>
  ${wos.length > 0 ? `<table><thead><tr><th>#</th><th>Title</th><th>Status</th><th>Value</th><th>Created</th></tr></thead><tbody>${woRows}</tbody></table>` : '<p>No work orders.</p>'}

  <h2>Invoices (${invs.length})</h2>
  ${invs.length > 0 ? `<table><thead><tr><th>#</th><th>Number</th><th>Status</th><th>Amount</th><th>Period</th></tr></thead><tbody>${invRows}</tbody></table>` : '<p>No invoices.</p>'}

  <h2>Team</h2>
  ${(team || []).length > 0 ? `<table><thead><tr><th>Organization</th><th>Role</th><th>Status</th></tr></thead><tbody>${teamRows}</tbody></table>` : '<p>No team members.</p>'}

  <div class="footer">
    <p>Generated by Ontime.Build on ${new Date().toLocaleString()}</p>
    <p>To save as PDF: Press Ctrl+P (or Cmd+P) and select "Save as PDF"</p>
  </div>
</body></html>`;

    return new Response(html, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  } catch (error: any) {
    console.error("Error generating project summary:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);

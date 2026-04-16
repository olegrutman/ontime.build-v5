import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}
function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusClass(s: string): string {
  const map: Record<string, string> = { draft: 'st-draft', active: 'st-approved', contracted: 'st-approved', DRAFT: 'st-draft', SUBMITTED: 'st-submitted', APPROVED: 'st-approved', REJECTED: 'st-rejected', PAID: 'st-paid' };
  return map[s] || 'st-draft';
}

const V3_CSS = `
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
:root{
  --amber:#F5A623;--amber-pale:#FFF7E6;
  --imis-navy:#1a3b6e;
  --surface:#FFFFFF;--surface2:#F7F9FC;
  --border:#E4E8F0;--border2:#C9D0DC;
  --ink:#0F1923;--ink2:#253347;--muted:#5A6A7E;--faint:#9AAABB;
  --green:#059669;--green-bg:#ECFDF5;--red:#DC2626;--red-bg:#FEF2F2;
  --blue:#2563EB;--blue-bg:#EFF6FF;--yellow:#D97706;--yellow-bg:#FFFBEB;
  --teal:#0D9488;--teal-bg:#F0FDFA;--purple:#7C3AED;
  --radius-xs:4px;--radius-sm:8px;
}
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink);background:#fff;padding:0;line-height:1.45;}
.page{width:8.5in;min-height:11in;margin:0 auto;background:#fff;display:flex;flex-direction:column;}
.form-header{background:var(--surface);padding:20px 32px 16px;display:flex;align-items:flex-start;justify-content:space-between;border-bottom:3px solid var(--imis-navy);}
.fh-left{display:flex;align-items:center;gap:14px;}
.fh-logo-img{width:64px;height:64px;border-radius:6px;object-fit:contain;}
.fh-company{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.3rem;color:var(--imis-navy);line-height:1.1;}
.fh-company-addr{font-size:.7rem;color:var(--muted);margin-top:2px;line-height:1.4;}
.fh-right{text-align:right;}
.fh-doc-type{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.8rem;text-transform:uppercase;letter-spacing:1px;color:var(--imis-navy);line-height:1;}
.fh-id{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:1rem;color:var(--ink);margin-top:4px;}
.fh-status{display:inline-block;margin-top:4px;font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:3px 10px;border-radius:20px;}
.st-draft{background:rgba(0,0,0,.06);color:var(--muted);}
.st-approved{background:var(--green-bg);color:var(--green);}
.st-submitted{background:var(--teal-bg);color:var(--teal);}
.st-rejected{background:var(--red-bg);color:var(--red);}
.st-paid{background:#F5F3FF;color:var(--purple);}
.fh-date{font-size:.68rem;color:var(--faint);margin-top:4px;line-height:1.4;}
.form-body{flex:1;padding:16px 32px 12px;display:flex;flex-direction:column;gap:12px;}
.section{border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;}
.sec-title{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:.72rem;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);background:var(--surface2);padding:7px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px;}
.sec-title .dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
.sec-content{padding:10px 14px;}
.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;}
.field-grid.cols-4{grid-template-columns:1fr 1fr 1fr 1fr;}
.field{display:flex;flex-direction:column;gap:2px;}
.field label{font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--faint);}
.field .val{font-size:.8rem;font-weight:500;color:var(--ink);padding:5px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-xs);min-height:28px;display:flex;align-items:center;}
.field .val.mono{font-family:'IBM Plex Mono',monospace;font-weight:600;}
.line-table{width:100%;border-collapse:collapse;font-size:.72rem;}
.line-table th{font-size:.55rem;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--faint);text-align:left;padding:6px 6px;background:var(--surface2);border-bottom:1.5px solid var(--border);white-space:nowrap;}
.line-table th.r,.line-table td.r{text-align:right;}
.line-table td{padding:6px 6px;border-bottom:1px solid var(--border);color:var(--ink2);}
.line-table tr:last-child td{border-bottom:none;}
.line-table .mono{font-family:'IBM Plex Mono',monospace;font-weight:600;color:var(--ink);}
.line-table .item-num{font-family:'IBM Plex Mono',monospace;font-size:.62rem;font-weight:600;color:var(--faint);width:20px;}
.badge{display:inline-block;font-size:.56rem;font-weight:700;text-transform:uppercase;letter-spacing:.8px;padding:2px 7px;border-radius:10px;}
.form-footer{background:var(--surface2);border-top:1px solid var(--border);padding:8px 32px;display:flex;justify-content:space-between;align-items:center;}
.ff-left{display:flex;align-items:center;gap:8px;}
.ff-powered{display:flex;align-items:center;gap:5px;font-size:.6rem;color:var(--faint);}
.ff-powered-label{font-size:.52rem;text-transform:uppercase;letter-spacing:1px;color:var(--faint);}
.ff-ot-brand{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:.72rem;color:var(--muted);}
.ff-ot-brand em{color:var(--amber);font-style:normal;}
.ff-meta{font-size:.58rem;color:var(--faint);margin-left:12px;}
.ff-right{display:flex;gap:6px;}
.ff-tag{font-size:.56rem;font-weight:700;text-transform:uppercase;letter-spacing:.8px;padding:2px 7px;border-radius:3px;background:var(--surface);border:1px solid var(--border);color:var(--muted);}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
@media print{@page{margin:0.5in;}body{padding:0;}.page{box-shadow:none;}}
</style>`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("project_id");
    const authHeader = req.headers.get("Authorization");

    if (!projectId) return new Response("Missing project_id", { status: 400, headers: corsHeaders });
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const { data: project, error: pErr } = await supabase.from("projects").select("*").eq("id", projectId).single();
    if (pErr || !project) return new Response("Project not found", { status: 404, headers: corsHeaders });

    const { data: org } = await supabase.from("organizations").select("name, type, logo_url, address").eq("id", project.organization_id).single();

    const [contractsRes, workOrdersRes, invoicesRes, teamRes] = await Promise.all([
      supabase.from("project_contracts").select("*, from_org:organizations!project_contracts_from_org_id_fkey(name), to_org:organizations!project_contracts_to_org_id_fkey(name)").eq("project_id", projectId),
      supabase.from("change_order_projects").select("id, title, status, final_price, created_at").eq("project_id", projectId).order("created_at", { ascending: false }),
      supabase.from("invoices").select("id, invoice_number, status, total_amount, billing_period_start, billing_period_end").eq("project_id", projectId).order("created_at", { ascending: false }),
      supabase.from("project_participants").select("role, invite_status, organization:organizations!project_participants_organization_id_fkey(name)").eq("project_id", projectId),
    ]);

    const contracts = contractsRes.data || [];
    const wos = workOrdersRes.data || [];
    const invs = invoicesRes.data || [];
    const team = teamRes.data || [];

    let woTotalValue = 0;
    wos.forEach(wo => { woTotalValue += wo.final_price || 0; });
    let invTotalAmount = 0;
    invs.forEach(inv => { invTotalAmount += inv.total_amount || 0; });
    const contractTotal = contracts.reduce((s: number, c: any) => s + (c.contract_sum || 0), 0);

    const addr = project.address;
    const location = addr ? [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ') : (project.city ? `${project.city}, ${project.state}` : '—');
    const now = fmtDate(new Date().toISOString());

    const woRows = wos.map((wo: any, i: number) => `
      <tr><td class="item-num">${i + 1}</td><td>${wo.title}</td><td><span class="badge ${statusClass(wo.status)}">${wo.status}</span></td><td class="r mono">${wo.final_price ? fmt(wo.final_price) : '—'}</td><td>${fmtDate(wo.created_at)}</td></tr>
    `).join('');

    const invRows = invs.map((inv: any, i: number) => `
      <tr><td class="item-num">${i + 1}</td><td>${inv.invoice_number}</td><td><span class="badge ${statusClass(inv.status)}">${inv.status}</span></td><td class="r mono">${fmt(inv.total_amount)}</td><td>${fmtDate(inv.billing_period_start)} – ${fmtDate(inv.billing_period_end)}</td></tr>
    `).join('');

    const teamRows = team.map((t: any) => `
      <tr><td>${(t as any).organization?.name || '—'}</td><td>${t.role}</td><td>${t.invite_status}</td></tr>
    `).join('');

    function orgAddrLocal(o: any): string {
      if (!o?.address) return '';
      const a = o.address;
      return [a.street, [a.city, a.state].filter(Boolean).join(', '), a.zip].filter(Boolean).join(' · ');
    }

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Project Summary – ${project.name}</title>
${V3_CSS}
</head><body>
<div class="page">
  <div class="form-header">
    <div class="fh-left">
      ${org?.logo_url ? `<img class="fh-logo-img" src="${org.logo_url}" alt="Logo"/>` : ''}
      <div>
        <div class="fh-company">${org?.name || ''}</div>
        <div class="fh-company-addr">${orgAddrLocal(org)}</div>
      </div>
    </div>
    <div class="fh-right">
      <div class="fh-doc-type">Project Summary</div>
      <div class="fh-id">${project.name}</div>
      <div class="fh-status ${statusClass(project.status)}">${project.status}</div>
      <div class="fh-date">Generated: ${now}</div>
    </div>
  </div>

  <div class="form-body">
    <div class="section">
      <div class="sec-title"><div class="dot" style="background:var(--blue)"></div>Project Details</div>
      <div class="sec-content">
        <div style="font-size:.82rem;font-weight:700;color:var(--ink);">${project.name}</div>
        <div style="font-size:.72rem;color:var(--muted);margin-top:2px;">${location}</div>
        <div style="font-size:.72rem;color:var(--muted);margin-top:2px;">${org?.name || ''} · ${org?.type || ''}</div>
      </div>
    </div>

    <div class="section">
      <div class="sec-title"><div class="dot" style="background:var(--amber)"></div>Financial Summary</div>
      <div class="sec-content">
        <div class="field-grid cols-4">
          <div class="field"><label>Contract Value</label><div class="val mono">${fmt(contractTotal)}</div></div>
          <div class="field"><label>Work Order Value</label><div class="val mono">${fmt(woTotalValue)}</div></div>
          <div class="field"><label>Total Invoiced</label><div class="val mono">${fmt(invTotalAmount)}</div></div>
          <div class="field"><label>Work Orders</label><div class="val">${wos.length}</div></div>
        </div>
      </div>
    </div>

    ${wos.length > 0 ? `
    <div class="section">
      <div class="sec-title"><div class="dot" style="background:var(--teal)"></div>Work Orders (${wos.length})</div>
      <div class="sec-content" style="padding:0;">
        <table class="line-table">
          <thead><tr><th style="width:22px;">#</th><th>Title</th><th>Status</th><th class="r">Value</th><th>Created</th></tr></thead>
          <tbody>${woRows}</tbody>
        </table>
      </div>
    </div>` : ''}

    ${invs.length > 0 ? `
    <div class="section">
      <div class="sec-title"><div class="dot" style="background:var(--green)"></div>Invoices (${invs.length})</div>
      <div class="sec-content" style="padding:0;">
        <table class="line-table">
          <thead><tr><th style="width:22px;">#</th><th>Number</th><th>Status</th><th class="r">Amount</th><th>Period</th></tr></thead>
          <tbody>${invRows}</tbody>
        </table>
      </div>
    </div>` : ''}

    ${team.length > 0 ? `
    <div class="section">
      <div class="sec-title"><div class="dot" style="background:var(--blue)"></div>Team</div>
      <div class="sec-content" style="padding:0;">
        <table class="line-table">
          <thead><tr><th>Organization</th><th>Role</th><th>Status</th></tr></thead>
          <tbody>${teamRows}</tbody>
        </table>
      </div>
    </div>` : ''}
  </div>

  <div class="form-footer">
    <div class="ff-left">
      <div class="ff-powered"><span class="ff-powered-label">Powered by</span><span class="ff-ot-brand">Ontime<em>.build</em></span></div>
      <span class="ff-meta">Generated ${now} · Page 1 of 1</span>
    </div>
    <div class="ff-right"><div class="ff-tag">${project.name}</div></div>
  </div>
</div>
</body></html>`;

    return new Response(html, { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } });
  } catch (error: any) {
    console.error("Error generating project summary:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);

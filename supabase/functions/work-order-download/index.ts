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
  const map: Record<string, string> = { OPEN: 'st-submitted', PRICED: 'st-pending', APPROVED: 'st-approved', EXECUTED: 'st-approved' };
  return map[s] || 'st-draft';
}

function orgAddr(org: any): string {
  if (!org?.address) return '';
  const a = org.address;
  return [a.street, [a.city, a.state].filter(Boolean).join(', '), a.zip].filter(Boolean).join(' · ');
}

const V3_CSS = `
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
:root{
  --amber:#F5A623;--amber-d:#C8850A;--amber-pale:#FFF7E6;
  --imis-navy:#1a3b6e;
  --surface:#FFFFFF;--surface2:#F7F9FC;
  --border:#E4E8F0;--border2:#C9D0DC;
  --ink:#0F1923;--ink2:#253347;--muted:#5A6A7E;--faint:#9AAABB;
  --green:#059669;--green-bg:#ECFDF5;--red:#DC2626;
  --blue:#2563EB;--yellow:#D97706;--yellow-bg:#FFFBEB;
  --teal:#0D9488;--teal-bg:#F0FDFA;
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
.st-pending{background:var(--yellow-bg);color:var(--yellow);}
.st-approved{background:var(--green-bg);color:var(--green);}
.st-submitted{background:var(--teal-bg);color:var(--teal);}
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
.field .val.highlight{background:var(--amber-pale);border-color:rgba(245,166,35,.3);}
.line-table{width:100%;border-collapse:collapse;font-size:.72rem;}
.line-table th{font-size:.55rem;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--faint);text-align:left;padding:6px 6px;background:var(--surface2);border-bottom:1.5px solid var(--border);white-space:nowrap;}
.line-table th.r,.line-table td.r{text-align:right;}
.line-table td{padding:6px 6px;border-bottom:1px solid var(--border);color:var(--ink2);}
.line-table tr:last-child td{border-bottom:none;}
.line-table .mono{font-family:'IBM Plex Mono',monospace;font-weight:600;color:var(--ink);}
.line-table .item-num{font-family:'IBM Plex Mono',monospace;font-size:.62rem;font-weight:600;color:var(--faint);width:20px;}
.task-check{width:14px;height:14px;border-radius:2px;border:1.5px solid var(--border2);display:inline-flex;align-items:center;justify-content:center;font-size:.55rem;flex-shrink:0;}
.sig-row{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:auto;padding-top:4px;}
.sig-block{display:flex;flex-direction:column;gap:2px;}
.sig-line{height:26px;border-bottom:1.5px solid var(--border2);margin-bottom:2px;}
.sig-label{font-size:.56rem;font-weight:700;color:var(--faint);text-transform:uppercase;letter-spacing:.8px;}
.sig-meta{font-size:.6rem;color:var(--faint);font-style:italic;}
.form-footer{background:var(--surface2);border-top:1px solid var(--border);padding:8px 32px;display:flex;justify-content:space-between;align-items:center;}
.ff-left{display:flex;align-items:center;gap:8px;}
.ff-powered{display:flex;align-items:center;gap:5px;font-size:.6rem;color:var(--faint);}
.ff-powered-label{font-size:.52rem;text-transform:uppercase;letter-spacing:1px;color:var(--faint);}
.ff-ot-brand{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:.72rem;color:var(--muted);}
.ff-ot-brand em{color:var(--amber);font-style:normal;}
.ff-meta{font-size:.58rem;color:var(--faint);margin-left:12px;}
.ff-right{display:flex;gap:6px;}
.ff-tag{font-size:.56rem;font-weight:700;text-transform:uppercase;letter-spacing:.8px;padding:2px 7px;border-radius:3px;background:var(--surface);border:1px solid var(--border);color:var(--muted);}
.notes-box{padding:8px 12px;background:var(--surface2);border:1px dashed var(--border2);border-radius:var(--radius-xs);font-size:.7rem;color:var(--muted);line-height:1.5;}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
@media print{body{padding:0;}.page{box-shadow:none;}}
</style>`;

const ITEM_TYPE_LABELS: Record<string, string> = {
  PROJECT: 'Project', SOV_ITEM: 'SOV Item', CHANGE_WORK: 'Work Order', TM_WORK: 'T&M Work',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const workItemId = url.searchParams.get("work_item_id");
    const authHeader = req.headers.get("Authorization");

    if (!workItemId) return new Response(JSON.stringify({ error: "Missing work_item_id" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const { data: workItem, error: wiError } = await supabase
      .from("work_items")
      .select(`*, project:projects(name, city, state), organization:organizations(name, org_code, logo_url, address)`)
      .eq("id", workItemId).single();

    if (wiError || !workItem) return new Response(JSON.stringify({ error: "Work item not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const [laborRes, pricingRes, participantsRes] = await Promise.all([
      supabase.from("labor_entries").select("*").eq("work_item_id", workItemId).order("entry_date"),
      supabase.from("change_work_pricing").select("*").eq("work_item_id", workItemId).order("sort_order"),
      supabase.from("work_item_participants").select(`role, organization:organizations(name, org_code)`).eq("work_item_id", workItemId),
    ]);

    const laborEntries = laborRes.data || [];
    const pricingItems = pricingRes.data || [];
    const participants = participantsRes.data || [];

    const typeLabel = ITEM_TYPE_LABELS[workItem.item_type] || workItem.item_type;
    const projectName = workItem.project?.name || '';
    const projectLocation = [workItem.project?.city, workItem.project?.state].filter(Boolean).join(', ');
    const org = workItem.organization;
    const now = fmtDate(new Date().toISOString());

    const totalLaborHours = laborEntries.reduce((s: number, e: any) => s + (e.hours || 0), 0);
    const totalLaborCost = laborEntries.reduce((s: number, e: any) => s + ((e.hours || 0) * (e.hourly_rate || 0)), 0);
    const totalPricing = pricingItems.reduce((s: number, p: any) => s + ((p.quantity || 0) * (p.unit_price || 0)), 0);

    const scopeTableRows = pricingItems.map((p: any, i: number) => `
      <tr>
        <td><div class="task-check"></div></td>
        <td class="item-num">${i + 1}</td>
        <td>${p.description}</td>
        <td class="r mono">${p.quantity} ${p.uom}</td>
        <td class="r mono">${p.unit_price != null ? fmt(p.unit_price) : '—'}</td>
        <td class="r mono">${p.unit_price != null ? fmt(p.quantity * p.unit_price) : '—'}</td>
      </tr>
    `).join('');

    const laborTableRows = laborEntries.map((e: any) => `
      <tr>
        <td>${fmtDate(e.entry_date)}</td>
        <td>${e.description || '—'}</td>
        <td class="r mono">${e.hours}</td>
        <td class="r mono">${e.hourly_rate ? fmt(e.hourly_rate) : '—'}</td>
        <td class="r mono">${e.hourly_rate ? fmt(e.hours * e.hourly_rate) : '—'}</td>
      </tr>
    `).join('');

    const assignmentInfo = participants.length > 0
      ? participants.map((p: any) => `${p.organization?.name || 'Unknown'} (${p.role})`).join(', ')
      : org?.name || '';

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>${typeLabel} — ${workItem.title}</title>
${V3_CSS}
</head><body>
<div class="page">
  <div class="form-header">
    <div class="fh-left">
      ${org?.logo_url ? `<img class="fh-logo-img" src="${org.logo_url}" alt="Logo"/>` : ''}
      <div>
        <div class="fh-company">${org?.name || ''}</div>
        <div class="fh-company-addr">${orgAddr(org)}</div>
      </div>
    </div>
    <div class="fh-right">
      <div class="fh-doc-type">${typeLabel}</div>
      <div class="fh-id">${workItem.code || ''}</div>
      <div class="fh-status ${statusClass(workItem.state)}">${workItem.state}</div>
      <div class="fh-date">Issued: ${fmtDate(workItem.created_at)}</div>
    </div>
  </div>

  <div class="form-body">
    <div class="two-col">
      <div class="section"><div class="sec-title"><div class="dot" style="background:var(--blue)"></div>Project Details</div><div class="sec-content"><div style="font-size:.82rem;font-weight:700;color:var(--ink);">${projectName}</div>${projectLocation ? `<div style="font-size:.72rem;color:var(--muted);margin-top:2px;">${projectLocation}</div>` : ''}${workItem.location_ref ? `<div style="font-size:.72rem;color:var(--muted);margin-top:2px;">${workItem.location_ref}</div>` : ''}</div></div>
      <div class="section"><div class="sec-title"><div class="dot" style="background:var(--teal)"></div>Assignment</div><div class="sec-content"><div style="font-size:.82rem;font-weight:700;color:var(--ink);">${assignmentInfo}</div></div></div>
    </div>

    ${workItem.description ? `<div class="section"><div class="sec-title"><div class="dot" style="background:var(--amber)"></div>Description</div><div class="sec-content"><div style="font-size:.78rem;color:var(--ink2);white-space:pre-wrap;">${workItem.description}</div></div></div>` : ''}

    <div class="section">
      <div class="sec-title"><div class="dot" style="background:var(--amber)"></div>Schedule & Budget</div>
      <div class="sec-content">
        <div class="field-grid cols-4">
          <div class="field"><label>Created</label><div class="val">${fmtDate(workItem.created_at)}</div></div>
          <div class="field"><label>Type</label><div class="val">${typeLabel}</div></div>
          <div class="field"><label>Estimated Labor</label><div class="val mono">${totalLaborCost > 0 ? fmt(totalLaborCost) : '—'}</div></div>
          <div class="field"><label>Contract Amount</label><div class="val mono highlight">${workItem.amount != null ? fmt(workItem.amount) : '—'}</div></div>
        </div>
      </div>
    </div>

    ${pricingItems.length > 0 ? `
    <div class="section" style="flex:1;">
      <div class="sec-title"><div class="dot" style="background:var(--teal)"></div>Scope of Work / Task Checklist</div>
      <div class="sec-content" style="padding:0;">
        <table class="line-table">
          <thead><tr><th style="width:22px;"></th><th style="width:22px;">#</th><th>Task Description</th><th class="r">Qty</th><th class="r">Unit Price</th><th class="r">Amount</th></tr></thead>
          <tbody>${scopeTableRows}</tbody>
        </table>
      </div>
    </div>` : ''}

    ${laborEntries.length > 0 ? `
    <div class="section">
      <div class="sec-title"><div class="dot" style="background:var(--green)"></div>Labor Entries</div>
      <div class="sec-content" style="padding:0;">
        <table class="line-table">
          <thead><tr><th>Date</th><th>Description</th><th class="r">Hours</th><th class="r">Rate</th><th class="r">Total</th></tr></thead>
          <tbody>${laborTableRows}
            <tr style="background:var(--surface2);border-top:1.5px solid var(--border);"><td colspan="2" style="font-weight:700;">Total</td><td class="r mono" style="font-weight:700;">${totalLaborHours}</td><td></td><td class="r mono" style="font-weight:700;">${totalLaborCost > 0 ? fmt(totalLaborCost) : '—'}</td></tr>
          </tbody>
        </table>
      </div>
    </div>` : ''}

    ${workItem.rejection_notes ? `<div class="notes-box" style="border-color:var(--red);background:#FEF2F2;"><strong style="color:var(--red);font-size:.6rem;text-transform:uppercase;letter-spacing:.5px;">Rejection Notes:</strong><br/><span style="color:var(--red);">${workItem.rejection_notes}</span></div>` : ''}

    <div class="sig-row">
      <div class="sig-block"><div class="sig-line"></div><div class="sig-label">GC Authorization</div><div class="sig-meta"></div></div>
      <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Trade Contractor Acceptance</div><div class="sig-meta">${org?.name || ''}</div></div>
    </div>
  </div>

  <div class="form-footer">
    <div class="ff-left">
      <div class="ff-powered"><span class="ff-powered-label">Powered by</span><span class="ff-ot-brand">Ontime<em>.build</em></span></div>
      <span class="ff-meta">Generated ${now} · Page 1 of 1</span>
    </div>
    <div class="ff-right"><div class="ff-tag">${workItem.code || typeLabel}</div><div class="ff-tag">${projectName}</div></div>
  </div>
</div>
</body></html>`;

    return new Response(html, { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } });
  } catch (error: any) {
    console.error("Error generating work order download:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);

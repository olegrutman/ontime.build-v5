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
function fmtDateLong(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function statusClass(s: string): string {
  const map: Record<string, string> = { DRAFT: 'st-draft', SUBMITTED: 'st-submitted', APPROVED: 'st-approved', REJECTED: 'st-rejected', PAID: 'st-paid' };
  return map[s] || 'st-draft';
}

function orgAddr(org: any): string {
  if (!org?.address) return '';
  const a = org.address;
  const parts = [a.street, [a.city, a.state].filter(Boolean).join(', '), a.zip].filter(Boolean);
  return parts.join(' · ');
}

function projectAddr(project: any): string {
  const a = project?.address;
  if (a && typeof a === 'object') {
    return [a.street, a.city, a.state, a.zip].filter(Boolean).join(', ');
  }
  return [project?.city, project?.state].filter(Boolean).join(', ');
}

const V3_CSS = `
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
:root{
  --amber:#F5A623;--amber-d:#C8850A;--amber-pale:#FFF7E6;
  --navy:#0D1F3C;--imis-navy:#1a3b6e;
  --surface:#FFFFFF;--surface2:#F7F9FC;
  --border:#E4E8F0;--border2:#C9D0DC;
  --ink:#0F1923;--ink2:#253347;--muted:#5A6A7E;--faint:#9AAABB;
  --green:#059669;--green-bg:#ECFDF5;--red:#DC2626;--red-bg:#FEF2F2;
  --blue:#2563EB;--blue-bg:#EFF6FF;--yellow:#D97706;--yellow-bg:#FFFBEB;
  --teal:#0D9488;--teal-bg:#F0FDFA;--purple:#7C3AED;
  --radius-xs:4px;--radius-sm:8px;--radius:12px;
}
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink);background:#fff;padding:0;line-height:1.45;}
.page{width:8.5in;min-height:11in;margin:0 auto;background:#fff;display:flex;flex-direction:column;position:relative;}
.form-header{background:var(--surface);padding:20px 32px 16px;display:flex;align-items:flex-start;justify-content:space-between;border-bottom:3px solid var(--imis-navy);}
.fh-left{display:flex;align-items:center;gap:14px;}
.fh-logo-img{width:64px;height:64px;border-radius:6px;object-fit:contain;background:#fff;}
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
.st-rejected{background:var(--red-bg);color:var(--red);}
.st-paid{background:#F5F3FF;color:var(--purple);}
.fh-date{font-size:.68rem;color:var(--faint);margin-top:4px;line-height:1.4;}
.form-body{flex:1;padding:16px 32px 12px;display:flex;flex-direction:column;gap:12px;}
.section{border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;}
.sec-title{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:.72rem;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);background:var(--surface2);padding:7px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px;}
.sec-title .dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
.sec-content{padding:10px 14px;}
.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;}
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
.line-table .this-period{font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--teal);}
.line-table .pct-col{font-family:'IBM Plex Mono',monospace;font-weight:600;color:var(--green);font-size:.68rem;}
.totals-box{margin-left:auto;width:270px;border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;}
.tot-row{display:flex;justify-content:space-between;align-items:center;padding:5px 12px;font-size:.73rem;color:var(--muted);}
.tot-row .tot-val{font-family:'IBM Plex Mono',monospace;font-weight:600;color:var(--ink2);}
.tot-row.grand{background:var(--imis-navy);padding:8px 12px;}
.tot-row.grand span{color:rgba(255,255,255,.55);font-weight:600;}
.tot-row.grand .tot-val{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.15rem;color:#fff;letter-spacing:-.3px;}
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
.approval-chain{display:flex;gap:8px;}
.ac-step{flex:1;padding:6px 8px;border-radius:var(--radius-xs);border:1px solid var(--border);text-align:center;}
.ac-step.done{background:var(--green-bg);border-color:rgba(5,150,105,.2);}
.ac-step.current{background:var(--amber-pale);border-color:rgba(245,166,35,.3);}
.ac-num{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1rem;color:var(--faint);line-height:1;}
.ac-step.done .ac-num{color:var(--green);}
.ac-step.current .ac-num{color:var(--amber-d);}
.ac-label{font-size:.56rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-top:1px;}
.ac-who{font-size:.58rem;color:var(--faint);margin-top:1px;}
.ac-arrow{display:flex;align-items:center;color:var(--border2);font-size:.75rem;flex-shrink:0;}
.notes-box{padding:8px 12px;background:var(--surface2);border:1px dashed var(--border2);border-radius:var(--radius-xs);font-size:.7rem;color:var(--muted);line-height:1.5;}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
@media print{@page{margin:0.5in;}body{padding:0;}.page{box-shadow:none;border-radius:0;}}
</style>`;

function buildFooter(docTag: string, secondTag: string, dateStr: string): string {
  return `<div class="form-footer">
    <div class="ff-left">
      <div class="ff-powered"><span class="ff-powered-label">Powered by</span><span class="ff-ot-brand">Ontime<em>.build</em></span></div>
      <span class="ff-meta">Generated ${dateStr} · Page 1 of 1</span>
    </div>
    <div class="ff-right"><div class="ff-tag">${docTag}</div>${secondTag ? `<div class="ff-tag">${secondTag}</div>` : ''}</div>
  </div>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const invoiceId = url.searchParams.get("invoice_id");
    const authHeader = req.headers.get("Authorization");

    if (!invoiceId) return new Response("Missing invoice_id", { status: 400, headers: corsHeaders });
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        *,
        project:projects(name, address, city, state),
        contract:project_contracts(
          from_role, to_role, contract_sum, retainage_percent,
          from_org:organizations!project_contracts_from_org_id_fkey(name, address, phone, logo_url),
          to_org:organizations!project_contracts_to_org_id_fkey(name, address, phone, logo_url)
        )
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: lineItems } = await supabase
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("sort_order");

    const items = lineItems || [];
    const fromOrg = invoice.contract?.from_org;
    const toOrg = invoice.contract?.to_org;
    const logoUrl = fromOrg?.logo_url || null;
    const projectName = invoice.project?.name || 'Unknown Project';
    const projectLocation = projectAddr(invoice.project);
    const now = fmtDate(new Date().toISOString());


    const itemRows = items.map((item: any, i: number) => {
      const pct = item.scheduled_value > 0 ? ((item.total_billed / item.scheduled_value) * 100).toFixed(1) : '0.0';
      const remaining = item.scheduled_value - item.total_billed;
      return `<tr>
        <td class="item-num">${i + 1}</td>
        <td>${item.description}</td>
        <td class="r mono">${fmt(item.scheduled_value)}</td>
        <td class="r mono">${fmt(item.previous_billed)}</td>
        <td class="r this-period">${fmt(item.current_billed)}</td>
        <td class="r mono">${fmt(item.total_billed)}</td>
        <td class="r mono">${fmt(remaining)}</td>
        <td class="r pct-col">${pct}%</td>
      </tr>`;
    }).join('');

    const scheduledTotal = items.reduce((s: number, i: any) => s + (i.scheduled_value || 0), 0);
    const previousTotal = items.reduce((s: number, i: any) => s + (i.previous_billed || 0), 0);

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Invoice ${invoice.invoice_number}</title>
${V3_CSS}
</head><body>
<div class="page">
  <div class="form-header">
    <div class="fh-left">
      ${logoUrl ? `<img class="fh-logo-img" src="${logoUrl}" alt="Logo"/>` : ''}
      <div>
        <div class="fh-company">${fromOrg?.name || ''}</div>
        <div class="fh-company-addr">${orgAddr(fromOrg)}</div>
      </div>
    </div>
    <div class="fh-right">
      <div class="fh-doc-type">Invoice</div>
      <div class="fh-id">${invoice.invoice_number}</div>
      <div class="fh-status ${statusClass(invoice.status)}">${invoice.status}</div>
      <div class="fh-date">Created: ${fmtDate(invoice.created_at)}</div>
    </div>
  </div>

  <div class="form-body">
    <div class="two-col">
      <div class="section"><div class="sec-title"><div class="dot" style="background:var(--blue)"></div>Project Details</div><div class="sec-content"><div style="font-size:.82rem;font-weight:700;color:var(--ink);">${projectName}</div>${projectLocation ? `<div style="font-size:.72rem;color:var(--muted);margin-top:2px;">${projectLocation}</div>` : ''}</div></div>
      <div class="section"><div class="sec-title"><div class="dot" style="background:var(--teal)"></div>Billing Period</div><div class="sec-content"><div style="font-size:.82rem;font-weight:700;color:var(--ink);">${fmtDateLong(invoice.billing_period_start)} – ${fmtDateLong(invoice.billing_period_end)}</div><div style="font-size:.72rem;color:var(--muted);margin-top:2px;">Created: ${fmtDate(invoice.created_at)}</div></div></div>
    </div>
    <div class="two-col">
      <div class="section"><div class="sec-title"><div class="dot" style="background:var(--amber)"></div>From</div><div class="sec-content"><div style="font-size:.82rem;font-weight:700;color:var(--ink);">${fromOrg?.name || 'N/A'}</div><div style="font-size:.72rem;color:var(--muted);margin-top:2px;">${orgAddr(fromOrg)}</div></div></div>
      <div class="section"><div class="sec-title"><div class="dot" style="background:var(--green)"></div>To</div><div class="sec-content"><div style="font-size:.82rem;font-weight:700;color:var(--ink);">${toOrg?.name || 'N/A'}</div><div style="font-size:.72rem;color:var(--muted);margin-top:2px;">${orgAddr(toOrg)}${toOrg?.phone ? '<br/>' + toOrg.phone : ''}</div></div></div>
    </div>

    <div class="section" style="flex:1;">
      <div class="sec-title"><div class="dot" style="background:var(--teal)"></div>Schedule of Values</div>
      <div class="sec-content" style="padding:0;">
        <table class="line-table">
          <thead><tr><th style="width:22px;">#</th><th>Description</th><th class="r">Scheduled Value</th><th class="r">Previous Billed</th><th class="r">This Period</th><th class="r">Total Billed</th><th class="r">Remaining</th><th class="r">% Complete</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>
    </div>

    <div class="totals-box">
      <div class="tot-row"><span>Scheduled Value Total</span><span class="tot-val">${fmt(scheduledTotal)}</span></div>
      <div class="tot-row"><span>Previously Billed</span><span class="tot-val">${fmt(previousTotal)}</span></div>
      <div class="tot-row"><span>Current Period Subtotal</span><span class="tot-val">${fmt(invoice.subtotal)}</span></div>
      ${(invoice.contract?.retainage_percent ?? 0) > 0 ? `<div class="tot-row"><span>Retainage Withheld</span><span class="tot-val" style="color:var(--yellow);">-${fmt(invoice.retainage_amount)}</span></div>` : ''}
      <div class="tot-row grand"><span>Total Due This Period</span><span class="tot-val">${fmt(invoice.total_amount)}</span></div>
    </div>

    ${invoice.notes ? `<div class="notes-box"><strong style="color:var(--ink2);font-size:.6rem;text-transform:uppercase;letter-spacing:.5px;">Notes:</strong><br/>${invoice.notes}</div>` : ''}

    ${invoice.status === 'REJECTED' && invoice.rejection_reason ? `<div class="notes-box" style="border-color:var(--red);background:var(--red-bg);"><strong style="color:var(--red);font-size:.6rem;text-transform:uppercase;letter-spacing:.5px;">Rejection Reason:</strong><br/><span style="color:var(--red);">${invoice.rejection_reason}</span></div>` : ''}


    <div class="sig-row">
      <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Trade Contractor Signature</div><div class="sig-meta">${fromOrg?.name || ''}</div></div>
      <div class="sig-block"><div class="sig-line"></div><div class="sig-label">GC Authorization</div><div class="sig-meta">${toOrg?.name || ''}</div></div>
    </div>
  </div>

  ${buildFooter(invoice.invoice_number, projectName, now)}
</div>
</body></html>`;

    return new Response(html, { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } });
  } catch (error: any) {
    console.error("Error generating invoice download:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);

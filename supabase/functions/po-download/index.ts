import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

const PO_SELECT = `
  *,
  organization:organizations!purchase_orders_organization_id_fkey(name, org_code, logo_url, address, phone),
  supplier:suppliers(name, supplier_code, contact_info),
  project:projects(name, address, city, state),
  work_item:work_items(title)
`;

function statusClass(s: string): string {
  const map: Record<string, string> = { ACTIVE: 'st-draft', PENDING_APPROVAL: 'st-pending', SUBMITTED: 'st-submitted', PRICED: 'st-pending', ORDERED: 'st-approved', DELIVERED: 'st-approved' };
  return map[s] || 'st-draft';
}

function orgAddr(org: any): string {
  if (!org?.address) return '';
  const a = org.address;
  return [a.street, [a.city, a.state].filter(Boolean).join(', '), a.zip].filter(Boolean).join(' · ');
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
  --imis-navy:#1a3b6e;
  --surface:#FFFFFF;--surface2:#F7F9FC;
  --border:#E4E8F0;--border2:#C9D0DC;
  --ink:#0F1923;--ink2:#253347;--muted:#5A6A7E;--faint:#9AAABB;
  --green:#059669;--green-bg:#ECFDF5;--red:#DC2626;--red-bg:#FEF2F2;
  --blue:#2563EB;--yellow:#D97706;--yellow-bg:#FFFBEB;
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
.st-pending{background:var(--yellow-bg);color:var(--yellow);}
.st-approved{background:var(--green-bg);color:var(--green);}
.st-submitted{background:var(--teal-bg);color:var(--teal);}
.fh-date{font-size:.68rem;color:var(--faint);margin-top:4px;line-height:1.4;}
.form-body{flex:1;padding:16px 32px 12px;display:flex;flex-direction:column;gap:12px;}
.section{border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;}
.sec-title{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:.72rem;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);background:var(--surface2);padding:7px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px;}
.sec-title .dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
.sec-content{padding:10px 14px;}
.line-table{width:100%;border-collapse:collapse;font-size:.72rem;}
.line-table th{font-size:.55rem;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--faint);text-align:left;padding:6px 6px;background:var(--surface2);border-bottom:1.5px solid var(--border);white-space:nowrap;}
.line-table th.r,.line-table td.r{text-align:right;}
.line-table td{padding:6px 6px;border-bottom:1px solid var(--border);color:var(--ink2);}
.line-table tr:last-child td{border-bottom:none;}
.line-table .mono{font-family:'IBM Plex Mono',monospace;font-weight:600;color:var(--ink);}
.line-table .item-num{font-family:'IBM Plex Mono',monospace;font-size:.62rem;font-weight:600;color:var(--faint);width:20px;}
.totals-box{margin-left:auto;width:270px;border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;}
.tot-row{display:flex;justify-content:space-between;align-items:center;padding:5px 12px;font-size:.73rem;color:var(--muted);}
.tot-row .tot-val{font-family:'IBM Plex Mono',monospace;font-weight:600;color:var(--ink2);}
.tot-row.grand{background:var(--imis-navy);padding:8px 12px;}
.tot-row.grand span{color:rgba(255,255,255,.55);font-weight:600;}
.tot-row.grand .tot-val{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.15rem;color:#fff;}
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
@media print{@page{margin:0.5in;}body{padding:0;}.page{box-shadow:none;}}
</style>`;

function buildHtml(po: any, items: any[]): string {
  const projectName = po.project?.name || po.work_item?.title || "";
  const projectLocation = projectAddr(po.project);
  const org = po.organization;
  const supplier = po.supplier;
  const now = fmtDate(new Date().toISOString());

  const itemRows = items.map((item: any, i: number) => `
    <tr>
      <td class="item-num">${item.line_number || i + 1}</td>
      <td class="mono" style="font-size:.6rem;">${item.supplier_sku || '—'}</td>
      <td>${item.description}</td>
      <td class="r mono">${item.quantity}</td>
      <td>${item.uom}</td>
      <td class="r mono">${item.unit_price != null ? fmt(item.unit_price) : '—'}</td>
      <td class="r mono">${item.line_total != null ? fmt(item.line_total) : (item.unit_price != null ? fmt(item.quantity * item.unit_price) : '—')}</td>
    </tr>
  `).join("");

  const subtotal = po.po_subtotal_total || items.reduce((s: number, i: any) => s + (i.line_total || (i.quantity * (i.unit_price || 0))), 0);
  const tax = po.po_tax_total || 0;
  const total = po.po_total || (subtotal + tax);

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>${po.po_number}</title>
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
      <div class="fh-doc-type">Purchase Order</div>
      <div class="fh-id">${po.po_number}</div>
      <div class="fh-status ${statusClass(po.status)}">${po.status}</div>
      ${po.ordered_at ? `<div class="fh-date">Ordered: ${fmtDate(po.ordered_at)}</div>` : ''}
      ${po.sent_at ? `<div class="fh-date">Sent: ${fmtDate(po.sent_at)}</div>` : ''}
    </div>
  </div>

  <div class="form-body">
    <div class="two-col">
      <div class="section"><div class="sec-title"><div class="dot" style="background:var(--blue)"></div>Project Details</div><div class="sec-content"><div style="font-size:.82rem;font-weight:700;color:var(--ink);">${projectName}</div>${projectLocation ? `<div style="font-size:.72rem;color:var(--muted);margin-top:2px;">${projectLocation}</div>` : ''}</div></div>
      <div class="section"><div class="sec-title"><div class="dot" style="background:var(--teal)"></div>PO Name</div><div class="sec-content"><div style="font-size:.82rem;font-weight:700;color:var(--ink);">${po.po_name}</div><div style="font-size:.72rem;color:var(--muted);margin-top:2px;">Created: ${fmtDate(po.created_at)}</div></div></div>
    </div>
    <div class="two-col">
      <div class="section"><div class="sec-title"><div class="dot" style="background:var(--amber)"></div>From (Buyer)</div><div class="sec-content"><div style="font-size:.82rem;font-weight:700;color:var(--ink);">${org?.name || 'N/A'}</div><div style="font-size:.72rem;color:var(--muted);margin-top:2px;">${orgAddr(org)}</div></div></div>
      <div class="section"><div class="sec-title"><div class="dot" style="background:var(--green)"></div>To (Supplier)</div><div class="sec-content"><div style="font-size:.82rem;font-weight:700;color:var(--ink);">${supplier?.name || 'N/A'}</div><div style="font-size:.72rem;color:var(--muted);margin-top:2px;">${supplier?.contact_info || supplier?.supplier_code || ''}</div></div></div>
    </div>

    <div class="section" style="flex:1;">
      <div class="sec-title"><div class="dot" style="background:var(--teal)"></div>Order Items</div>
      <div class="sec-content" style="padding:0;">
        <table class="line-table">
          <thead><tr><th style="width:22px;">#</th><th style="width:68px;">SKU</th><th>Description</th><th class="r">Qty</th><th>Unit</th><th class="r">Unit Price</th><th class="r">Amount</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>
    </div>

    <div style="display:flex;gap:14px;align-items:flex-start;">
      ${po.notes ? `<div style="flex:1;"><div class="notes-box"><strong style="color:var(--ink2);font-size:.6rem;text-transform:uppercase;letter-spacing:.5px;">Delivery Instructions:</strong><br/>${po.notes}</div></div>` : '<div style="flex:1;"></div>'}
      <div class="totals-box">
        <div class="tot-row"><span>Subtotal</span><span class="tot-val">${fmt(subtotal)}</span></div>
        ${tax > 0 ? `<div class="tot-row"><span>Tax${po.tax_percent_applied ? ` (${po.tax_percent_applied}%)` : ''}</span><span class="tot-val">${fmt(tax)}</span></div>` : ''}
        <div class="tot-row grand"><span>PO Total</span><span class="tot-val">${fmt(total)}</span></div>
      </div>
    </div>

    <div class="sig-row">
      <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Buyer Authorization</div><div class="sig-meta">${org?.name || ''}</div></div>
      <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Supplier Acknowledgment</div><div class="sig-meta">${supplier?.name || ''}</div></div>
    </div>
  </div>

  <div class="form-footer">
    <div class="ff-left">
      <div class="ff-powered"><span class="ff-powered-label">Powered by</span><span class="ff-ot-brand">Ontime<em>.build</em></span></div>
      <span class="ff-meta">Generated ${now} · Page 1 of 1</span>
    </div>
    <div class="ff-right"><div class="ff-tag">${po.po_number}</div>${supplier?.name ? `<div class="ff-tag">${supplier.name}</div>` : ''}</div>
  </div>
</div>
</body></html>`;
}

function buildCsv(po: any, items: any[]): string {
  const csvHeader = "Line,SKU,Description,Quantity,UOM,Pieces,Length_Ft,Board_Feet,Linear_Feet,Notes";
  const csvRows = items.map((item: any) =>
    [
      item.line_number,
      `"${(item.supplier_sku || '').replace(/"/g, '""')}"`,
      `"${(item.description || '').replace(/"/g, '""')}"`,
      item.quantity, item.uom, item.pieces || '', item.length_ft || '',
      item.computed_bf || '', item.computed_lf || '',
      `"${(item.notes || '').replace(/"/g, '""')}"`
    ].join(",")
  );
  const projectName = po.project?.name || po.work_item?.title || "";
  return [
    `# Purchase Order: ${po.po_number}`,
    `# Name: ${po.po_name}`,
    `# Supplier: ${po.supplier?.name} (${po.supplier?.supplier_code})`,
    `# Project: ${projectName}`,
    `# Generated: ${new Date().toISOString()}`,
    "", csvHeader, ...csvRows
  ].join("\n");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const downloadToken = url.searchParams.get("token");
    const format = url.searchParams.get("format") || "csv";
    const authHeader = req.headers.get("Authorization");

    let po: any = null;
    let lineItems: any[] = [];
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    if (downloadToken) {
      const { data: poData, error: poError } = await serviceClient
        .from("purchase_orders").select(PO_SELECT).eq("download_token", downloadToken).single();
      if (poError || !poData) {
        return new Response(JSON.stringify({ error: "Invalid or expired download link" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      if (poData.download_token_expires_at && new Date(poData.download_token_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Download link has expired." }), { status: 410, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      po = poData;
      await serviceClient.from("purchase_orders").update({ download_count: (po.download_count || 0) + 1 }).eq("id", po.id);
      const { data: items } = await serviceClient.from("po_line_items").select("*").eq("po_id", po.id).order("line_number");
      lineItems = items || [];
    } else if (authHeader?.startsWith('Bearer ')) {
      const poId = url.searchParams.get("po_id");
      if (!poId) return new Response(JSON.stringify({ error: "Missing po_id parameter" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      const { data: poData, error: poError } = await userClient.from("purchase_orders").select(PO_SELECT).eq("id", poId).single();
      if (poError || !poData) {
        return new Response(JSON.stringify({ error: "PO not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      po = poData;
      const { data: items } = await userClient.from("po_line_items").select("*").eq("po_id", po.id).order("line_number");
      lineItems = items || [];
    } else {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    if (format === "csv") {
      return new Response(buildCsv(po, lineItems), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${po.po_number}.csv"` },
      });
    } else if (format === "pdf") {
      return new Response(buildHtml(po, lineItems), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    return new Response("Invalid format", { status: 400, headers: corsHeaders });
  } catch (error: any) {
    console.error("Error generating download:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);

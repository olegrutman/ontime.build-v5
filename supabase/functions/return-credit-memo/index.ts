import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}
function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
@media print{@page{margin:0.5in;}body{padding:0;}.page{box-shadow:none;}}
</style>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = new URL(req.url);
    const returnId = url.searchParams.get("return_id");
    if (!returnId) return new Response("return_id required", { status: 400, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: ret, error: retErr } = await supabase
      .from("returns")
      .select(`
        *,
        return_items(*),
        supplier_org:supplier_org_id(name, logo_url, address),
        created_by_org:created_by_org_id(name, logo_url, address),
        pricing_owner:pricing_owner_org_id(name)
      `)
      .eq("id", returnId)
      .single();

    if (retErr || !ret) return new Response("Return not found", { status: 404, headers: corsHeaders });

    const { data: project } = await supabase.from("projects").select("name, address, city, state").eq("id", ret.project_id).single();

    const returnableItems = (ret.return_items || []).filter((i: any) => i.returnable_flag === "Yes");
    const createdByOrg = (ret as any).created_by_org;
    const supplierOrg = (ret as any).supplier_org;
    const now = fmtDate(new Date().toISOString());

    const restockingLabel = ret.restocking_type === "Percent"
      ? `Restocking Fee (${ret.restocking_value}%)`
      : ret.restocking_type === "Flat" ? "Restocking Fee (Flat)" : "Restocking Fee";

    const itemRows = returnableItems.map((item: any, i: number) => `
      <tr>
        <td class="item-num">${i + 1}</td>
        <td>${item.description_snapshot}</td>
        <td class="r mono">${item.qty_requested}</td>
        <td>${item.uom}</td>
        <td class="r mono">${fmt(item.credit_unit_price || 0)}</td>
        <td class="r mono">${fmt(item.credit_line_total || 0)}</td>
      </tr>
    `).join("");

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Credit Memo – ${ret.return_number}</title>
${V3_CSS}
</head><body>
<div class="page">
  <div class="form-header">
    <div class="fh-left">
      ${createdByOrg?.logo_url ? `<img class="fh-logo-img" src="${createdByOrg.logo_url}" alt="Logo"/>` : ''}
      <div>
        <div class="fh-company">${createdByOrg?.name || ''}</div>
        <div class="fh-company-addr">${orgAddr(createdByOrg)}</div>
      </div>
    </div>
    <div class="fh-right">
      <div class="fh-doc-type">Credit Memo</div>
      <div class="fh-id">${ret.return_number}</div>
      <div class="fh-date">${fmtDate(new Date().toISOString())}</div>
    </div>
  </div>

  <div class="form-body">
    <div class="two-col">
      <div class="section"><div class="sec-title"><div class="dot" style="background:var(--blue)"></div>Project</div><div class="sec-content"><div style="font-size:.82rem;font-weight:700;color:var(--ink);">${project?.name || '—'}</div>${projectAddr(project) ? `<div style="font-size:.72rem;color:var(--muted);margin-top:2px;">${projectAddr(project)}</div>` : ''}</div></div>
      <div class="section"><div class="sec-title"><div class="dot" style="background:var(--teal)"></div>Return Reason</div><div class="sec-content"><div style="font-size:.82rem;font-weight:700;color:var(--ink);">${ret.reason}${ret.wrong_type ? ' – ' + ret.wrong_type : ''}</div></div></div>
    </div>
    <div class="two-col">
      <div class="section"><div class="sec-title"><div class="dot" style="background:var(--amber)"></div>Supplier</div><div class="sec-content"><div style="font-size:.82rem;font-weight:700;color:var(--ink);">${supplierOrg?.name || '—'}</div></div></div>
      <div class="section"><div class="sec-title"><div class="dot" style="background:var(--green)"></div>Material Responsible Party</div><div class="sec-content"><div style="font-size:.82rem;font-weight:700;color:var(--ink);">${(ret as any).pricing_owner?.name || createdByOrg?.name || '—'}</div></div></div>
    </div>

    <div class="section" style="flex:1;">
      <div class="sec-title"><div class="dot" style="background:var(--teal)"></div>Returnable Items</div>
      <div class="sec-content" style="padding:0;">
        <table class="line-table">
          <thead><tr><th style="width:22px;">#</th><th>Product</th><th class="r">Qty</th><th>UOM</th><th class="r">Unit Price</th><th class="r">Line Total</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>
    </div>

    <div class="totals-box">
      <div class="tot-row"><span>Credit Subtotal</span><span class="tot-val">${fmt(ret.credit_subtotal || 0)}</span></div>
      <div class="tot-row"><span>${restockingLabel}</span><span class="tot-val" style="color:var(--red);">-${fmt(ret.restocking_total || 0)}</span></div>
      <div class="tot-row grand"><span>Net Credit</span><span class="tot-val">${fmt(ret.net_credit_total || 0)}</span></div>
    </div>

    <div class="sig-row">
      <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Contractor Signature</div><div class="sig-meta">${createdByOrg?.name || ''}</div></div>
      <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Supplier Acknowledgment</div><div class="sig-meta">${supplierOrg?.name || ''}</div></div>
    </div>
  </div>

  <div class="form-footer">
    <div class="ff-left">
      <div class="ff-powered"><span class="ff-powered-label">Powered by</span><span class="ff-ot-brand">Ontime<em>.build</em></span></div>
      <span class="ff-meta">Generated ${now} · Page 1 of 1</span>
    </div>
    <div class="ff-right"><div class="ff-tag">${ret.return_number}</div>${project?.name ? `<div class="ff-tag">${project.name}</div>` : ''}</div>
  </div>
</div>
</body></html>`;

    return new Response(html, { headers: { ...corsHeaders, "Content-Type": "text/html" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

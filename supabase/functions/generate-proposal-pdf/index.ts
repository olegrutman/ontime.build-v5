import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const proposal_id: string | undefined = body.proposal_id;
    if (!proposal_id) return json({ error: "proposal_id required" }, 400);

    const { data: proposal } = await supabase
      .from("co_proposals")
      .select("*")
      .eq("id", proposal_id)
      .maybeSingle();
    if (!proposal) return json({ error: "Proposal not found" }, 404);

    const { data: visible } = await userClient.from("co_proposals").select("id").eq("id", proposal_id).maybeSingle();
    if (!visible) return json({ error: "You do not have access to this proposal." }, 403);

    const { data: items = [] } = await supabase
      .from("co_proposal_items")
      .select("*")
      .eq("proposal_id", proposal_id)
      .order("sort_order");
    if (items.length === 0) return json({ error: "This proposal has no work orders." }, 400);

    const { data: milestones = [] } = await supabase
      .from("co_proposal_milestones")
      .select("*")
      .eq("proposal_id", proposal_id)
      .order("sort_order");

    const coIds = items.map((i: any) => i.change_order_id);

    const [
      { data: project },
      { data: cos = [] },
      { data: lineItems = [] },
      { data: labor = [] },
      { data: materials = [] },
      { data: equipment = [] },
    ] = await Promise.all([
      supabase.from("projects").select("name, address, sales_tax_rate, labor_taxable, owner_approval_email").eq("id", proposal.project_id).maybeSingle(),
      supabase.from("change_orders").select("*").in("id", coIds),
      supabase.from("co_line_items").select("*").in("co_id", coIds).order("sort_order"),
      supabase.from("co_labor_entries").select("*").in("co_id", coIds).eq("is_actual_cost", false),
      supabase.from("co_material_items").select("*").in("co_id", coIds).order("line_number"),
      supabase.from("co_equipment_items").select("*").in("co_id", coIds),
    ]);

    const billingOrgId: string = proposal.org_id;
    const { data: contracts = [] } = await supabase.from("project_contracts").select("to_org_id").eq("project_id", proposal.project_id).eq("from_org_id", billingOrgId);
    const payers = Array.from(new Set((contracts ?? []).map((c: any) => c.to_org_id).filter(Boolean))) as string[];
    const receivingOrgId = proposal.recipient_org_id ?? (payers.length === 1 ? payers[0] : null);
    const { data: orgs = [] } = await supabase.from("organizations").select("id, name, type, address, phone, logo_url").in("id", [billingOrgId, receivingOrgId].filter(Boolean));
    const sender = orgs.find((o: any) => o.id === billingOrgId);
    const recipient = orgs.find((o: any) => o.id === receivingOrgId);
    const addressText = (value: any): string => typeof value === "string" ? value : [value?.street ?? value?.line1, value?.city, value?.state, value?.zip].filter(Boolean).join(", ");

    // ===== PDF =====
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
    const pw = doc.internal.pageSize.getWidth();
    const margin = 50;
    const contentW = pw - margin * 2;
    let y = margin;

    const num = (v: unknown) => Number(v ?? 0);
    const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const brk = (limit = 720) => { if (y > limit) { doc.addPage(); y = margin; } };
    const writeText = (text: string, x = margin, width = contentW, size = 9, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      for (const line of doc.splitTextToSize(text, width)) { brk(); doc.text(line, x, y); y += size + 4; }
    };
    const heading = (text: string) => {
      brk(660);
      doc.setTextColor(26, 59, 110);
      writeText(text, margin, contentW, 11, true);
      doc.setDrawColor(26, 59, 110);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pw - margin, y);
      y += 16;
    };
    const addressLine = addressText(project?.address);

    // Classic Contract: company identity, document identity and paired parties.
    let companyX = margin;
    if (sender?.logo_url) {
      try {
        const logoResponse = await fetch(sender.logo_url, { signal: AbortSignal.timeout(8000) });
        const contentType = logoResponse.headers.get("content-type") ?? "";
        const format = contentType.includes("png") ? "PNG" : contentType.includes("jpeg") || contentType.includes("jpg") ? "JPEG" : null;
        if (logoResponse.ok && format) {
          const bytes = new Uint8Array(await logoResponse.arrayBuffer());
          const props = doc.getImageProperties(bytes);
          const ratio = Math.min(68 / props.width, 44 / props.height);
          doc.addImage(bytes, format, margin, y - 10, props.width * ratio, props.height * ratio);
          companyX += 80;
        }
      } catch { /* Company wordmark is the fallback, never the OnTime logo. */ }
    }
    doc.setTextColor(26, 59, 110);
    writeText(String(sender?.name ?? "Submitting company"), companyX, 275 - (companyX - margin), 16, true);
    const companyBottom = y;
    y = margin;
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text("WORK PROPOSAL", pw - margin, y, { align: "right" });
    y += 17; doc.setFontSize(8); doc.setTextColor(90);
    doc.text(String(proposal.proposal_number ?? "") + " | " + String(proposal.status ?? "draft").toUpperCase(), pw - margin, y, { align: "right" });
    y = Math.max(companyBottom, y, margin + 44) + 14;
    doc.setDrawColor(26, 59, 110); doc.setLineWidth(2); doc.line(margin, y, pw - margin, y); y += 23;
    const top = y, colW = (contentW - 28) / 2;
    const partyBlock = (label: string, lines: string[], x: number) => {
      doc.setTextColor(100); writeText(label, x, colW, 8, true);
      doc.setTextColor(45);
      for (const line of lines.filter(Boolean)) writeText(line, x, colW, 9);
      return y;
    };
    const senderBottom = partyBlock("FROM", [String(sender?.name ?? ""), addressText(sender?.address), sender?.phone ?? ""], margin);
    y = top;
    const recipientBottom = partyBlock("PREPARED FOR", [proposal.client_company || (sender?.type !== "GC" ? recipient?.name : "") || "", proposal.client_name || "", proposal.client_address || (sender?.type !== "GC" ? addressText(recipient?.address) : ""), proposal.client_email || (sender?.type === "GC" ? project?.owner_approval_email : "") || "", proposal.client_phone || (sender?.type !== "GC" ? recipient?.phone : "") || ""], margin + colW + 28);
    y = Math.max(senderBottom, recipientBottom) + 18;
    doc.setTextColor(26, 59, 110);
    writeText(String(proposal.title ?? "Proposal"), margin, contentW, 14, true);
    writeText("PROJECT  " + String(project?.name ?? "") + " / " + String(proposal.project_id).slice(0, 8).toUpperCase(), margin, contentW, 10, true);
    doc.setTextColor(80);
    writeText("SITE  " + String(proposal.site_address || addressLine), margin, contentW, 9);
    writeText("Issued " + new Date(proposal.created_at).toLocaleDateString("en-US") + " | Valid " + (num(proposal.validity_days) || 30) + " days | " + items.length + " work orders");
    y += 14;

    if (proposal.intro) {
      heading("OVERVIEW");
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60);
      for (const line of doc.splitTextToSize(String(proposal.intro), contentW)) {
        brk();
        doc.text(line, margin, y);
        y += 13;
      }
      y += 12;
    }

    // Per-WO sections
    const summary: { number: string; title: string; amount: number }[] = [];
    let sectionIndex = 0;

    for (const item of items) {
      const co = cos.find((c: any) => c.id === item.change_order_id);
      if (!co) continue;
      sectionIndex++;
      const coNumber = String(co.co_number ?? `WO-${sectionIndex}`);
      const coTitle = String(co.title ?? "Scope of work");
      const amount = num(item.amount_snapshot);
      summary.push({ number: coNumber, title: coTitle, amount });

      heading(`${sectionIndex}. ${coNumber} — ${coTitle}`.toUpperCase());
      doc.setTextColor(60);
      const descriptions = Array.from(new Set([co.problem_summary, co.reason_note].filter(Boolean))) as string[];
      if (co.location_tag) writeText("Location: " + co.location_tag);
      for (const narrative of descriptions) { writeText(narrative); y += 6; }
      // Scope text is public to the proposal; private rates, cost inputs and margins are not.
      const coLines = lineItems.filter((l: any) => l.co_id === co.id);
      const scopeSeen = new Set<string>();
      for (const li of coLines) {
        const key = [li.item_name, li.description, li.location_tag].join("|");
        if (scopeSeen.has(key)) continue;
        scopeSeen.add(key);
        brk(670);
        writeText(String(li.item_name ?? "Scope item"), margin, contentW, 9, true);
        if (li.location_tag && li.location_tag !== co.location_tag) writeText("Location: " + li.location_tag);
        if (li.qty != null) writeText("Qty " + li.qty + " " + (li.unit ?? ""), margin, contentW, 8);
        if (li.description) writeText(String(li.description));
        y += 5;
      }
      for (const entry of labor.filter((l: any) => l.co_id === co.id && l.org_id === billingOrgId && l.description)) {
        if (!scopeSeen.has(entry.description)) { writeText(String(entry.description)); scopeSeen.add(entry.description); }
      }
      y += 8;

      brk(710);
      doc.setDrawColor(200);
      doc.line(margin, y - 4, pw - margin, y - 4);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 95);
      doc.text(`${coNumber} TOTAL`, margin + 5, y + 8);
      doc.text(fmt(amount), pw - margin - 5, y + 8, { align: "right" });
      y += 30;
    }

    // Consolidated summary
    heading("PROPOSAL SUMMARY");
    doc.setFontSize(8);
    doc.setFillColor(235, 238, 243);
    doc.rect(margin, y - 10, contentW, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80);
    doc.text("#", margin + 5, y);
    doc.text("WORK ORDER", margin + 25, y);
    doc.text("DESCRIPTION", margin + 150, y);
    doc.text("AMOUNT", pw - margin - 5, y, { align: "right" });
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(40);
    summary.forEach((s, i) => {
      brk(700);
      doc.text(String(i + 1), margin + 5, y);
      const numberLines = doc.splitTextToSize(s.number, 115);
      const titleLines = doc.splitTextToSize(s.title, contentW - 265);
      const count = Math.max(numberLines.length, titleLines.length);
      for (let line = 0; line < count; line++) {
        brk(700);
        if (numberLines[line]) doc.text(numberLines[line], margin + 25, y);
        if (titleLines[line]) doc.text(titleLines[line], margin + 150, y);
        if (line === 0) doc.text(fmt(s.amount), pw - margin - 5, y, { align: "right" });
        y += 12;
      }
      y += 4;
    });

    const subtotal = summary.reduce((s, r) => s + r.amount, 0);
    const markupPct = num(proposal.markup_percent);
    const markupAmt = subtotal * markupPct / 100;
    const proposalTaxPct = num(proposal.tax_percent);
    const taxAmt = (subtotal + markupAmt) * proposalTaxPct / 100;
    const grandTotal = subtotal + markupAmt + taxAmt;

    doc.setDrawColor(200);
    doc.line(margin, y - 4, pw - margin, y - 4);
    y += 10;

    const finRows: [string, string, boolean?][] = [["Subtotal:", fmt(subtotal), true]];
    if (markupPct > 0) finRows.push([`Contractor fee (${markupPct}%):`, fmt(markupAmt)]);
    if (proposalTaxPct > 0) finRows.push([`Sales tax (${proposalTaxPct}%):`, fmt(taxAmt)]);
    finRows.push(["Total Quote Amount:", fmt(grandTotal), true]);

    doc.setFontSize(9.5);
    for (const [label, val, bold] of finRows) {
      brk(710);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(bold ? 30 : 60, bold ? 58 : 60, bold ? 95 : 60);
      doc.text(label, margin + contentW / 2, y);
      doc.text(val, pw - margin, y, { align: "right" });
      y += 16;
    }
    y += 20;

    // Payment schedule
    if (milestones.length > 0) {
      heading("PAYMENT SCHEDULE");
      doc.setFontSize(8);
      doc.setFillColor(235, 238, 243);
      doc.rect(margin, y - 10, contentW, 16, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80);
      doc.text("#", margin + 5, y);
      doc.text("MILESTONE", margin + 25, y);
      doc.text("DUE", margin + 190, y);
      doc.text("AMOUNT", pw - margin - 5, y, { align: "right" });
      y += 18;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(40);
      let scheduled = 0;
      milestones.forEach((m: any, i: number) => {
        brk(700);
        const amt = m.basis === "percent" ? grandTotal * num(m.percent) / 100 : num(m.amount);
        scheduled += amt;
        const label = String(m.label ?? `Payment ${i + 1}`) +
          (m.basis === "percent" ? ` (${num(m.percent)}%)` : "");
        doc.text(String(i + 1), margin + 5, y);
        const labels = doc.splitTextToSize(label, 150);
        const dues = doc.splitTextToSize(String(m.due_trigger ?? "—"), contentW - 295);
        for (let line = 0; line < Math.max(labels.length, dues.length); line++) {
          brk(700);
          if (labels[line]) doc.text(labels[line], margin + 25, y);
          if (dues[line]) doc.text(dues[line], margin + 190, y);
          if (line === 0) doc.text(fmt(amt), pw - margin - 5, y, { align: "right" });
          y += 12;
        }
        y += 4;
      });
      doc.setDrawColor(200);
      doc.line(margin, y - 4, pw - margin, y - 4);
      y += 10;
      brk(710);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 95);
      doc.setFontSize(9);
      doc.text("Total scheduled:", margin + contentW / 2, y);
      doc.text(fmt(scheduled), pw - margin, y, { align: "right" });
      y += 16;
      if (proposal.deposit_note) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(70);
        for (const line of doc.splitTextToSize(String(proposal.deposit_note), contentW)) {
          brk();
          doc.text(line, margin, y);
          y += 12;
        }
      }
      y += 16;
    }

    const bulletBlock = (title: string, text: string) => {
      heading(title);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(70);
      for (const raw of String(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean)) {
        for (const line of doc.splitTextToSize("• " + raw, contentW)) {
          brk();
          doc.text(line, margin, y);
          y += 12;
        }
      }
      y += 16;
    };

    if (proposal.scope_notes) bulletBlock("INCLUSIONS & CLARIFICATIONS", proposal.scope_notes);
    if (proposal.exclusions) bulletBlock("EXCLUSIONS", proposal.exclusions);

    // Terms
    heading("TERMS & CONDITIONS");
    const taxRate = num(project?.sales_tax_rate);
    const terms = [
      "Amounts above include all labor, materials, and equipment described for each work order.",
      proposalTaxPct > 0
        ? `Sales tax of ${proposalTaxPct}% is shown as a separate line above.`
        : taxRate > 0
          ? `Applicable sales tax of ${taxRate}% is included where required.`
          : "No sales tax has been added to this proposal.",
      proposal.payment_terms ? String(proposal.payment_terms) : "Payment terms are subject to the agreed payment schedule.",
      `This proposal is valid for ${num(proposal.validity_days) || 30} days from the date above. Work outside the listed scope requires a written change order.`,
      "Schedule commences upon written acceptance and availability of the work area.",
      ...String(proposal.terms_text ?? "").split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean),
    ];
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70);
    for (const t of terms) {
      for (const line of doc.splitTextToSize("• " + t, contentW)) {
        brk();
        doc.text(line, margin, y);
        y += 12;
      }
    }
    y += 20;

    // Acceptance
    if (y > 580) { doc.addPage(); y = margin; }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 95);
    doc.text("ACCEPTANCE", margin, y);
    y += 20;
    const sigLabels = ["PROPOSED BY", "ACCEPTED BY (CLIENT)"];
    const sigW = (contentW - 20) / 2;
    for (let i = 0; i < sigLabels.length; i++) {
      const x = margin + i * (sigW + 20);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100);
      doc.text(sigLabels[i], x, y);
      doc.setDrawColor(180);
      doc.setLineWidth(0.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.line(x, y + 35, x + sigW, y + 35);
      doc.text("Signature", x, y + 43);
      doc.line(x, y + 60, x + sigW, y + 60);
      doc.text("Printed Name", x, y + 68);
      doc.line(x, y + 85, x + sigW, y + 85);
      doc.text("Date", x, y + 93);
    }

    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(
        `Page ${p} of ${pageCount} — Proposal ${proposal.proposal_number ?? ""} — Generated ${new Date().toLocaleDateString()}`,
        pw / 2,
        doc.internal.pageSize.getHeight() - 20,
        { align: "center" },
      );
    }

    return new Response(doc.output("arraybuffer"), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Quote-${proposal.proposal_number ?? proposal_id}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("generate-proposal-pdf error:", err);
    return json({ error: err?.message ?? "Unexpected error" }, 500);
  }
});

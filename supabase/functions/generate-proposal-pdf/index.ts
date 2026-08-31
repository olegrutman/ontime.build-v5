import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    // Access check: viewer's org must be a participant on the project
    const [{ data: participants = [] }, { data: memberships = [] }] = await Promise.all([
      supabase.from("project_participants").select("organization_id, role").eq("project_id", proposal.project_id),
      supabase.from("user_org_roles").select("organization_id").eq("user_id", user.id),
    ]);
    const participantOrgs = new Set(participants.map((p: any) => p.organization_id));
    const viewerOrgs = memberships.map((m: any) => m.organization_id).filter((id: string) => participantOrgs.has(id));
    if (viewerOrgs.length === 0) return json({ error: "You do not have access to this proposal." }, 403);

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
      supabase.from("projects").select("name, address, sales_tax_rate, labor_taxable").eq("id", proposal.project_id).maybeSingle(),
      supabase.from("change_orders").select("*").in("id", coIds),
      supabase.from("co_line_items").select("*").in("co_id", coIds).order("sort_order"),
      supabase.from("co_labor_entries").select("*").in("co_id", coIds).eq("is_actual_cost", false),
      supabase.from("co_material_items").select("*").in("co_id", coIds).order("line_number"),
      supabase.from("co_equipment_items").select("*").in("co_id", coIds),
    ]);

    const billingOrgId: string = proposal.org_id;
    const firstCO = cos.find((c: any) => c.id === coIds[0]);
    const receivingOrgId: string = firstCO?.assigned_to_org_id ?? billingOrgId;
    const { data: orgs = [] } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", Array.from(new Set([billingOrgId, receivingOrgId])));
    const orgName = (id: string) => orgs.find((o: any) => o.id === id)?.name ?? "—";

    // ===== PDF =====
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
    const pw = doc.internal.pageSize.getWidth();
    const margin = 50;
    const contentW = pw - margin * 2;
    let y = margin;

    const num = (v: unknown) => Number(v ?? 0);
    const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const brk = (limit = 720) => { if (y > limit) { doc.addPage(); y = margin; } };
    const heading = (text: string) => {
      brk(660);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 95);
      doc.text(text, margin, y);
      y += 5;
      doc.setDrawColor(30, 58, 95);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pw - margin, y);
      y += 16;
    };

    const addr: any = project?.address;
    const addressLine = String(
      typeof addr === "string"
        ? addr
        : [addr?.street ?? addr?.line1, addr?.city, addr?.state, addr?.zip].filter(Boolean).join(", ") || "—",
    );

    // Cover header
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("PROPOSAL", margin, y);
    doc.text("PREPARED FOR CLIENT REVIEW", pw - margin, y, { align: "right" });
    y += 20;
    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(2);
    doc.line(margin, y, pw - margin, y);
    y += 25;

    doc.setFontSize(18);
    doc.setTextColor(30, 58, 95);
    doc.text(String(proposal.title ?? "Proposal").substring(0, 60), margin, y);
    y += 30;

    doc.setFontSize(9);
    doc.setTextColor(100);
    const infoRows: string[][] = [
      ["Project:", String(project?.name ?? "—"), "Proposal No:", String(proposal.proposal_number ?? "—")],
      ["Prepared by:", orgName(billingOrgId), "Date:", new Date(proposal.created_at).toLocaleDateString()],
      ["Prepared for:", String(proposal.client_company || proposal.client_name || orgName(receivingOrgId)).substring(0, 38), "Valid for:", `${num(proposal.validity_days) || 30} days`],
      ["Site Address:", String(proposal.site_address || addressLine).substring(0, 40), "Items:", `${items.length} work orders`],
    ];
    for (const row of infoRows) {
      doc.setFont("helvetica", "bold");
      doc.text(row[0], margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(row[1], margin + 80, y);
      doc.setFont("helvetica", "bold");
      doc.text(row[2], margin + contentW / 2, y);
      doc.setFont("helvetica", "normal");
      doc.text(row[3], margin + contentW / 2 + 80, y);
      y += 16;
    }
    y += 12;

    const clientLines = [
      proposal.client_name ? String(proposal.client_name) : null,
      proposal.client_company ? String(proposal.client_company) : null,
      proposal.client_address ? String(proposal.client_address) : null,
      [proposal.client_email, proposal.client_phone].filter(Boolean).join("  |  ") || null,
    ].filter(Boolean) as string[];

    if (clientLines.length > 0) {
      heading("CLIENT");
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60);
      for (const line of clientLines) {
        brk();
        doc.text(line.substring(0, 95), margin, y);
        y += 13;
      }
      y += 12;
    }

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

      heading(`${sectionIndex}. ${coNumber} — ${coTitle}`.substring(0, 78).toUpperCase());

      const narrative = co.problem_summary ?? co.reason_note ?? null;
      if (narrative) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60);
        for (const line of doc.splitTextToSize(String(narrative), contentW)) {
          brk();
          doc.text(line, margin, y);
          y += 12;
        }
        y += 8;
      }

      const coLines = lineItems.filter((l: any) => l.co_id === co.id && l.org_id === billingOrgId);
      const coLabor = labor.filter((l: any) => l.co_id === co.id && l.org_id === billingOrgId);

      const laborByItem = new Map<string, any[]>();
      const unassigned: any[] = [];
      for (const e of coLabor) {
        if (e.co_line_item_id) {
          const arr = laborByItem.get(e.co_line_item_id) ?? [];
          arr.push(e);
          laborByItem.set(e.co_line_item_id, arr);
        } else unassigned.push(e);
      }

      const renderBlock = (label: string, title: string, description: string | null, unitQty: string, blockTotal: number) => {
        brk(700);
        doc.setFillColor(240, 243, 248);
        doc.rect(margin, y - 10, contentW, 17, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 95);
        doc.text(`${label} — ${title}`.substring(0, 68), margin + 5, y);
        doc.text(fmt(blockTotal), pw - margin - 5, y, { align: "right" });
        y += 20;

        if (unitQty) {
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(120);
          doc.text(unitQty, margin + 12, y);
          y += 12;
        }
        if (description) {
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(90);
          for (const line of doc.splitTextToSize(description, contentW - 24)) {
            brk();
            doc.text(line, margin + 12, y);
            y += 11;
          }
          y += 4;
        }
        y += 6;
      };

      for (let i = 0; i < coLines.length; i++) {
        const li = coLines[i];
        const blockLabor = laborByItem.get(li.id) ?? [];
        const blockTotal = blockLabor.reduce((s: number, e: any) => s + num(e.line_total), 0);
        const unitQty = li.qty != null ? `Qty ${li.qty} ${li.unit ?? ""}`.trim() : (li.unit ? `Unit: ${li.unit}` : "");
        renderBlock(`ITEM ${i + 1}`, String(li.item_name ?? "Scope item"), li.description ? String(li.description) : null, unitQty, blockTotal);
      }
      if (unassigned.length > 0) {
        renderBlock("GENERAL", "Additional labor for this work order", null, "", unassigned.reduce((s: number, e: any) => s + num(e.line_total), 0));
      }

      const coMats = materials.filter((m: any) => m.co_id === co.id && m.org_id === billingOrgId);
      const coEquip = equipment.filter((e: any) => e.co_id === co.id && e.org_id === billingOrgId);
      const matsTotal = coMats.reduce((s: number, m: any) => s + num(m.billed_amount), 0);
      const equipTotal = coEquip.reduce((s: number, e: any) => s + num(e.billed_amount), 0);

      if (matsTotal > 0 || equipTotal > 0) {
        doc.setFontSize(8.5);
        doc.setTextColor(60);
        if (matsTotal > 0) {
          brk();
          doc.setFont("helvetica", "bold");
          doc.text("Materials", margin + 12, y);
          doc.setFont("helvetica", "normal");
          doc.text(fmt(matsTotal), pw - margin - 5, y, { align: "right" });
          y += 13;
        }
        if (equipTotal > 0) {
          brk();
          doc.setFont("helvetica", "bold");
          doc.text("Equipment", margin + 12, y);
          doc.setFont("helvetica", "normal");
          doc.text(fmt(equipTotal), pw - margin - 5, y, { align: "right" });
          y += 13;
        }
        y += 4;
      }

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
      doc.text(s.number.substring(0, 22), margin + 25, y);
      doc.text(s.title.substring(0, 46), margin + 150, y);
      doc.text(fmt(s.amount), pw - margin - 5, y, { align: "right" });
      y += 14;
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
        doc.text(label.substring(0, 46), margin + 25, y);
        doc.text(String(m.due_trigger ?? "—").substring(0, 34), margin + 190, y);
        doc.text(fmt(amt), pw - margin - 5, y, { align: "right" });
        y += 14;
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
          : "Sales tax is not applicable to this quote.",
      proposal.payment_terms ? String(proposal.payment_terms) : "Payment due upon completion of the scope described, net 30.",
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

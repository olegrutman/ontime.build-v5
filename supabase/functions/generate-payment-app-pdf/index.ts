import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/cors";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { project_id, co_ids, period_from, period_to } = await req.json();
    if (!project_id || !co_ids || !Array.isArray(co_ids) || co_ids.length === 0) {
      return new Response(JSON.stringify({ error: "project_id and co_ids[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch project
    const { data: project } = await supabase
      .from("projects")
      .select("name, address, sales_tax_rate, labor_taxable, retainage_percent")
      .eq("id", project_id)
      .single();

    // Fetch contracts
    const { data: contracts = [] } = await supabase
      .from("project_contracts")
      .select("contract_sum, from_org_id, to_org_id")
      .eq("project_id", project_id);

    const originalContractSum = contracts.reduce((s: number, c: any) => s + (c.contract_sum ?? 0), 0);

    // Fetch selected COs with financials
    const { data: cos = [] } = await supabase
      .from("change_orders")
      .select("*")
      .in("id", co_ids)
      .order("created_at");

    // For each CO, fetch labor/materials/equipment totals
    const coDetails: any[] = [];
    let totalNetChange = 0;

    for (const co of cos) {
      const { data: labor = [] } = await supabase
        .from("co_labor_entries")
        .select("line_total")
        .eq("co_id", co.id)
        .eq("is_actual_cost", false);
      const { data: mats = [] } = await supabase
        .from("co_material_items")
        .select("billed_amount")
        .eq("co_id", co.id);
      const { data: equip = [] } = await supabase
        .from("co_equipment_items")
        .select("billed_amount")
        .eq("co_id", co.id);

      const laborTotal = labor.reduce((s: number, e: any) => s + (e.line_total ?? 0), 0);
      const matsTotal = mats.reduce((s: number, m: any) => s + (m.billed_amount ?? 0), 0);
      const equipTotal = equip.reduce((s: number, e: any) => s + (e.billed_amount ?? 0), 0);
      const subtotal = laborTotal + matsTotal + equipTotal;

      const taxRate = co.tax_rate_snapshot ?? project?.sales_tax_rate ?? 0;
      const laborTaxable = co.labor_taxable_snapshot ?? project?.labor_taxable ?? false;
      const pct = taxRate / 100;
      const totalTax = (matsTotal * pct) + (laborTaxable ? laborTotal * pct : 0) + (equipTotal * pct);
      const grandTotal = subtotal + totalTax;

      totalNetChange += grandTotal;

      coDetails.push({
        co_number: co.co_number ?? "—",
        title: co.title ?? "—",
        laborTotal,
        matsTotal,
        equipTotal,
        subtotal,
        totalTax,
        grandTotal,
        status: co.status,
      });
    }

    const currentContractSum = originalContractSum + totalNetChange;
    const retainagePct = project?.retainage_percent ?? 0;
    const retainageHeld = totalNetChange * retainagePct / 100;
    const netPayable = totalNetChange - retainageHeld;

    // Save payment application record
    const { data: payApp } = await supabase
      .from("payment_applications")
      .insert({
        project_id,
        co_ids,
        period_from: period_from || null,
        period_to: period_to || null,
        generated_by_user_id: user.id,
        original_contract_sum: originalContractSum,
        net_change_orders: totalNetChange,
        current_contract_sum: currentContractSum,
        total_completed: totalNetChange,
        retainage_held: retainageHeld,
        total_earned_less_retainage: netPayable,
        less_previous_applications: 0,
        current_payment_due: netPayable,
        balance_to_finish: currentContractSum - totalNetChange,
      })
      .select()
      .single();

    // Build PDF
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 50;
    const contentW = pw - margin * 2;
    let y = margin;

    const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // ===== PAGE 1: G702-style Summary =====
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("APPLICATION AND CERTIFICATE FOR PAYMENT", margin, y);
    doc.text("NOT AN AIA FORM", pw - margin, y, { align: "right" });
    y += 20;

    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(2);
    doc.line(margin, y, pw - margin, y);
    y += 25;

    doc.setFontSize(16);
    doc.setTextColor(30, 58, 95);
    doc.text("Application for Payment", margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Application No. ${payApp?.application_number ?? "—"}`, margin, y + 14);
    y += 35;

    // Project info
    doc.setFontSize(9);
    doc.setTextColor(80);
    const infoRows = [
      ["Project:", project?.name ?? "—"],
      ["Period From:", period_from ?? "—"],
      ["Period To:", period_to ?? "—"],
    ];
    for (const [label, val] of infoRows) {
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(val, margin + 80, y);
      y += 15;
    }
    y += 15;

    // Summary table
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, y, contentW, 170, 4, 4, "F");
    y += 18;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 95);
    doc.text("CONTRACTOR'S APPLICATION FOR PAYMENT", margin + 12, y);
    y += 20;

    const summaryLines: [string, string, boolean][] = [
      ["1. Original Contract Sum", fmt(originalContractSum), false],
      ["2. Net Change by Change Orders", fmt(totalNetChange), false],
      ["3. Contract Sum to Date (1 + 2)", fmt(currentContractSum), true],
      ["4. Total Completed & Stored to Date", fmt(totalNetChange), false],
      [`5. Retainage (${retainagePct}% of Line 4)`, fmt(retainageHeld), false],
      ["6. Total Earned Less Retainage (4 - 5)", fmt(netPayable), true],
      ["7. Less Previous Applications", fmt(0), false],
      ["8. Current Payment Due (6 - 7)", fmt(netPayable), true],
      ["9. Balance to Finish (3 - 4)", fmt(currentContractSum - totalNetChange), false],
    ];

    doc.setFontSize(9);
    for (const [label, val, bold] of summaryLines) {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(bold ? 30 : 60, bold ? 58 : 60, bold ? 95 : 60);
      doc.text(label, margin + 12, y);
      doc.text(val, pw - margin - 12, y, { align: "right" });
      y += 16;
    }
    y += 30;

    // Signature blocks
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 95);
    doc.text("SIGNATURES", margin, y);
    y += 20;

    const sigLabels = ["CONTRACTOR", "OWNER"];
    const sigW = (contentW - 20) / 2;
    for (let i = 0; i < sigLabels.length; i++) {
      const x = margin + i * (sigW + 20);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100);
      doc.text(sigLabels[i], x, y);
      doc.setDrawColor(180);
      doc.setLineWidth(0.5);
      doc.line(x, y + 35, x + sigW, y + 35);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text("Signature / Date", x, y + 43);
    }

    // ===== PAGE 2: G703-style Line Items =====
    doc.addPage();
    y = margin;

    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("CONTINUATION SHEET — CHANGE ORDER DETAIL", margin, y);
    y += 20;

    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(2);
    doc.line(margin, y, pw - margin, y);
    y += 20;

    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text("Schedule of Change Orders", margin, y);
    y += 25;

    // Table header
    doc.setFontSize(7);
    doc.setFillColor(235, 238, 243);
    doc.rect(margin, y - 10, contentW, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80);
    const cols = [
      { label: "CO #", x: margin + 5 },
      { label: "DESCRIPTION", x: margin + 45 },
      { label: "LABOR", x: margin + 250 },
      { label: "MATERIALS", x: margin + 310 },
      { label: "EQUIP", x: margin + 375 },
      { label: "TAX", x: margin + 420 },
      { label: "TOTAL", x: pw - margin - 5 },
    ];
    for (const c of cols) {
      const align = c.label === "TOTAL" ? "right" : undefined;
      doc.text(c.label, c.x, y, align ? { align } : undefined);
    }
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(40);
    let runningTotal = 0;
    for (const d of coDetails) {
      if (y > 700) { doc.addPage(); y = margin; }
      runningTotal += d.grandTotal;
      doc.text(d.co_number, margin + 5, y);
      doc.text((d.title ?? "").substring(0, 35), margin + 45, y);
      doc.text(fmt(d.laborTotal), margin + 250, y);
      doc.text(fmt(d.matsTotal), margin + 310, y);
      doc.text(fmt(d.equipTotal), margin + 375, y);
      doc.text(fmt(d.totalTax), margin + 420, y);
      doc.text(fmt(d.grandTotal), pw - margin - 5, y, { align: "right" });
      y += 14;
    }

    // Totals row
    y += 5;
    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(1);
    doc.line(margin, y, pw - margin, y);
    y += 15;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 95);
    doc.text("TOTAL", margin + 5, y);
    doc.text(fmt(runningTotal), pw - margin - 5, y, { align: "right" });

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(
        `Page ${p} of ${pageCount} — Generated ${new Date().toLocaleDateString()} — This is not an AIA document`,
        pw / 2,
        ph - 20,
        { align: "center" }
      );
    }

    const pdfOutput = doc.output("arraybuffer");

    return new Response(pdfOutput, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="PaymentApp-${payApp?.application_number ?? "draft"}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("generate-payment-app-pdf error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

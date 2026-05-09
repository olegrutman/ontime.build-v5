import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Perspective = 'upstream' | 'downstream';

const normalizeOrgRole = (role?: string | null): 'FC' | 'TC' | 'GC' | null => {
  const value = (role ?? '').toUpperCase();
  if (value === 'FC' || value.includes('FIELD CREW') || value.startsWith('FC_')) return 'FC';
  if (value === 'TC' || value.includes('TRADE CONTRACTOR') || value.startsWith('TC_') || value === 'FS') return 'TC';
  if (value === 'GC' || value.includes('GENERAL CONTRACTOR') || value.startsWith('GC_')) return 'GC';
  return null;
};

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

    // Verify user
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

    const body = await req.json().catch(() => ({}));
    const co_id: string | undefined = body.co_id;
    const requestedPerspective: Perspective | undefined = body.perspective;
    if (!co_id) {
      return new Response(JSON.stringify({ error: "co_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch CO
    const { data: co, error: coErr } = await supabase
      .from("change_orders")
      .select("*")
      .eq("id", co_id)
      .single();
    if (coErr || !co) {
      return new Response(JSON.stringify({ error: "Change order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch project
    const { data: project } = await supabase
      .from("projects")
      .select("name, address, sales_tax_rate, labor_taxable, retainage_percent")
      .eq("id", co.project_id)
      .single();

    // Resolve viewer's organization through membership, then match it to the
    // project participant rows. project_participants is org-scoped, not user-scoped.
    const { data: projectParticipants = [] } = await supabase
      .from("project_participants")
      .select("organization_id, role")
      .eq("project_id", co.project_id);

    const { data: userOrgRoles = [] } = await supabase
      .from("user_org_roles")
      .select("organization_id, role, organization:organizations(type)")
      .eq("user_id", user.id);

    const participantByOrg = new Map(
      projectParticipants.map((p: any) => [p.organization_id, p])
    );
    const participatingMemberships = userOrgRoles.filter((m: any) => participantByOrg.has(m.organization_id));
    const activeMembership =
      participatingMemberships.find((m: any) => m.organization_id === co.assigned_to_org_id) ??
      participatingMemberships.find((m: any) => m.organization_id === co.org_id) ??
      participatingMemberships[0];
    const viewerOrgId: string | undefined = activeMembership?.organization_id;
    const viewerRole = normalizeOrgRole(
      participantByOrg.get(viewerOrgId)?.role ??
      activeMembership?.organization?.type ??
      activeMembership?.role
    );

    // Fetch all contracts for this project
    const { data: contracts = [] } = await supabase
      .from("project_contracts")
      .select("id, from_org_id, to_org_id, from_role, to_role, contract_sum")
      .eq("project_id", co.project_id);

    // Pick the contract that drives this PDF based on the viewer's role
    let chosenContract: any = null;
    let perspective: Perspective = requestedPerspective ?? 'upstream';

    if (viewerRole === 'FC' && viewerOrgId) {
      // FC is downstream of TC: their contract has from_org_id=FC
      chosenContract = contracts.find((c: any) => c.from_org_id === viewerOrgId) ?? null;
      perspective = 'upstream'; // FC always shows their upstream contract with TC
    } else if (viewerRole === 'GC' && viewerOrgId) {
      // GC is upstream of TC: their contract has to_org_id=GC
      chosenContract = contracts.find((c: any) => c.to_org_id === viewerOrgId) ?? null;
      perspective = 'downstream'; // GC always shows their downstream contract with TC
    } else if (viewerRole === 'TC' && viewerOrgId) {
      if (perspective === 'downstream') {
        // TC ↔ FC contract (FC bills TC)
        chosenContract = contracts.find((c: any) => c.to_org_id === viewerOrgId && normalizeOrgRole(c.from_role) === 'FC') ?? null;
      } else {
        // TC ↔ GC contract (TC bills GC)
        chosenContract = contracts.find((c: any) => c.from_org_id === viewerOrgId && normalizeOrgRole(c.to_role) === 'GC') ?? null;
      }
    }

    // Fallback: if we couldn't resolve, fail closed for non-platform users.
    if (!chosenContract) {
      return new Response(JSON.stringify({ error: "No contract perspective available for this user on this change order." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const billingOrgId: string = chosenContract.from_org_id;
    const receivingOrgId: string = chosenContract.to_org_id;

    // Fetch the two parties' org names
    const orgIds = Array.from(new Set([billingOrgId, receivingOrgId]));
    const { data: orgs = [] } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", orgIds);
    const orgName = (id: string) => orgs.find((o: any) => o.id === id)?.name ?? "—";

    // Fetch line items, labor, materials, equipment for this CO
    const { data: allLineItems = [] } = await supabase
      .from("co_line_items")
      .select("*")
      .eq("co_id", co_id)
      .order("sort_order");

    const { data: allLabor = [] } = await supabase
      .from("co_labor_entries")
      .select("*")
      .eq("co_id", co_id)
      .eq("is_actual_cost", false)
      .order("entry_date");

    const { data: allMaterials = [] } = await supabase
      .from("co_material_items")
      .select("*")
      .eq("co_id", co_id)
      .order("line_number");

    const { data: allEquipment = [] } = await supabase
      .from("co_equipment_items")
      .select("*")
      .eq("co_id", co_id)
      .order("created_at");

    // Scope to billing-side ownership
    const lineItems = allLineItems.filter((l: any) => l.org_id === billingOrgId);
    const laborForView = allLabor.filter((e: any) => e.org_id === billingOrgId);
    const materials = allMaterials.filter((m: any) => m.org_id === billingOrgId);
    const equipment = allEquipment.filter((e: any) => e.org_id === billingOrgId);

    // Calculate financials (scoped to perspective)
    const laborSum = laborForView.reduce((s: number, e: any) => s + (e.line_total ?? 0), 0);
    const isGCPerspective = viewerRole === 'GC';
    // GC sees TC's submitted price for labor, not the raw TC labor entries (privacy)
    const laborTotal = isGCPerspective && co.tc_submitted_price != null
      ? Number(co.tc_submitted_price)
      : laborSum;

    const materialsTotal = materials.reduce((s: number, m: any) => s + (m.billed_amount ?? 0), 0);
    const equipmentTotal = equipment.reduce((s: number, e: any) => s + (e.billed_amount ?? 0), 0);
    const subtotal = laborTotal + materialsTotal + equipmentTotal;

    const taxRate = co.tax_rate_snapshot ?? project?.sales_tax_rate ?? 0;
    const laborTaxable = co.labor_taxable_snapshot ?? project?.labor_taxable ?? false;
    const taxPct = taxRate / 100;
    const materialsTax = materialsTotal * taxPct;
    const laborTax = laborTaxable ? laborTotal * taxPct : 0;
    const equipmentTax = equipmentTotal * taxPct;
    const totalTax = materialsTax + laborTax + equipmentTax;
    const grandTotal = subtotal + totalTax;

    const retainagePct = project?.retainage_percent ?? 0;
    const retainageAmt = grandTotal * retainagePct / 100;

    const originalContractSum = Number(chosenContract.contract_sum ?? 0);

    // Build PDF
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
    const pw = doc.internal.pageSize.getWidth();
    const margin = 50;
    const contentW = pw - margin * 2;
    let y = margin;

    const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Header
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("CHANGE ORDER DOCUMENT", margin, y);
    doc.text("NOT AN AIA FORM", pw - margin, y, { align: "right" });
    y += 20;

    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(2);
    doc.line(margin, y, pw - margin, y);
    y += 25;

    // Title
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 95);
    doc.text("Change Order Document", margin, y);
    y += 30;

    // Info grid
    doc.setFontSize(9);
    doc.setTextColor(100);
    const infoRows = [
      ["Project:", project?.name ?? "—", "CO Number:", co.co_number ?? "—"],
      ["Contractor:", orgName(billingOrgId), "Date:", new Date(co.created_at).toLocaleDateString()],
      ["Owner:", orgName(receivingOrgId), "Status:", (co.status ?? "").toUpperCase()],
      ["Document Type:", co.document_type === "WO" ? "Work Order" : "Change Order", "Perspective:", perspective === 'downstream' ? `${orgName(billingOrgId)} → ${orgName(receivingOrgId)}` : `${orgName(billingOrgId)} → ${orgName(receivingOrgId)}`],
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
    y += 10;

    // Contract Summary Box
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, y, contentW, 80, 4, 4, "F");
    y += 18;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 95);
    doc.text("CONTRACT SUMMARY", margin + 12, y);
    y += 18;

    doc.setFontSize(9);
    doc.setTextColor(60);
    const summaryRows = [
      ["Original Contract Sum:", fmt(originalContractSum)],
      ["Net Change by this Change Order:", fmt(subtotal)],
      ["Contract Sum Including this Change Order:", fmt(originalContractSum + subtotal)],
    ];
    for (const [label, val] of summaryRows) {
      doc.setFont("helvetica", "normal");
      doc.text(label, margin + 12, y);
      doc.setFont("helvetica", "bold");
      doc.text(val, pw - margin - 12, y, { align: "right" });
      y += 15;
    }
    y += 20;

    // Description of Work
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 95);
    doc.text("DESCRIPTION OF WORK", margin, y);
    y += 5;
    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pw - margin, y);
    y += 15;

    // Line items table header
    doc.setFontSize(8);
    doc.setFillColor(235, 238, 243);
    doc.rect(margin, y - 10, contentW, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80);
    doc.text("#", margin + 5, y);
    doc.text("ITEM", margin + 25, y);
    doc.text("UNIT", margin + 280, y);
    doc.text("QTY", margin + 330, y);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(40);
    if (lineItems.length === 0) {
      doc.setTextColor(140);
      doc.text("No scope items on this contract.", margin + 5, y);
      y += 14;
      doc.setTextColor(40);
    } else {
      for (let i = 0; i < lineItems.length; i++) {
        const li = lineItems[i];
        if (y > 700) { doc.addPage(); y = margin; }
        doc.text(String(i + 1), margin + 5, y);
        doc.text((li.item_name ?? "").substring(0, 50), margin + 25, y);
        doc.text(li.unit ?? "", margin + 280, y);
        doc.text(String(li.qty ?? "—"), margin + 330, y);
        y += 14;
      }
    }
    y += 10;

    // Materials
    if (materials.length > 0) {
      if (y > 650) { doc.addPage(); y = margin; }
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 95);
      doc.text("MATERIALS", margin, y);
      y += 15;

      doc.setFontSize(8);
      doc.setFillColor(235, 238, 243);
      doc.rect(margin, y - 10, contentW, 16, "F");
      doc.setTextColor(80);
      doc.text("DESCRIPTION", margin + 5, y);
      doc.text("QTY", margin + 250, y);
      doc.text("UNIT COST", margin + 300, y);
      doc.text("AMOUNT", pw - margin - 5, y, { align: "right" });
      y += 18;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(40);
      for (const m of materials) {
        if (y > 700) { doc.addPage(); y = margin; }
        doc.text((m.description ?? "").substring(0, 45), margin + 5, y);
        doc.text(String(m.quantity ?? ""), margin + 250, y);
        doc.text(fmt(m.unit_cost ?? 0), margin + 300, y);
        doc.text(fmt(m.billed_amount ?? 0), pw - margin - 5, y, { align: "right" });
        y += 14;
      }
      y += 10;
    }

    // Financial Summary
    if (y > 600) { doc.addPage(); y = margin; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 95);
    doc.text("FINANCIAL SUMMARY", margin, y);
    y += 5;
    doc.line(margin, y, pw - margin, y);
    y += 18;

    doc.setFontSize(9);
    const finRows: [string, string][] = [
      ["Labor:", fmt(laborTotal)],
      ["Materials:", fmt(materialsTotal)],
      ["Equipment:", fmt(equipmentTotal)],
      ["Subtotal:", fmt(subtotal)],
    ];
    if (totalTax > 0) {
      finRows.push(["Materials Tax:", fmt(materialsTax)]);
      if (laborTaxable) finRows.push(["Labor Tax:", fmt(laborTax)]);
      finRows.push(["Equipment Tax:", fmt(equipmentTax)]);
      finRows.push(["Total Tax:", fmt(totalTax)]);
    }
    finRows.push(["Grand Total:", fmt(grandTotal)]);
    if (retainagePct > 0) {
      finRows.push([`Less Retainage (${retainagePct}%):`, "-" + fmt(retainageAmt)]);
      finRows.push(["Net Payable:", fmt(grandTotal - retainageAmt)]);
    }

    for (const [label, val] of finRows) {
      const isBold = label.startsWith("Grand") || label.startsWith("Net") || label.startsWith("Subtotal");
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setTextColor(isBold ? 30 : 60, isBold ? 58 : 60, isBold ? 95 : 60);
      doc.text(label, margin + contentW / 2, y);
      doc.text(val, pw - margin, y, { align: "right" });
      y += 16;
    }
    y += 30;

    // Signature blocks
    if (y > 580) { doc.addPage(); y = margin; }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 95);
    doc.text("SIGNATURES", margin, y);
    y += 20;

    const sigLabels = ["CONTRACTOR", "OWNER"];

    const sigW = (contentW - 20 * (sigLabels.length - 1)) / sigLabels.length;
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
      doc.text("Signature", x, y + 43);

      doc.line(x, y + 60, x + sigW, y + 60);
      doc.text("Printed Name", x, y + 68);

      doc.line(x, y + 85, x + sigW, y + 85);
      doc.text("Date", x, y + 93);
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(
        `Page ${p} of ${pageCount} — Generated ${new Date().toLocaleDateString()} — This is not an AIA document`,
        pw / 2,
        doc.internal.pageSize.getHeight() - 20,
        { align: "center" }
      );
    }

    const pdfOutput = doc.output("arraybuffer");

    return new Response(pdfOutput, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="CO-${co.co_number ?? co_id}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("generate-co-pdf error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

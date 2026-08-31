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
    // 'work_order' = internal/contractual full-ledger document (default)
    // 'proposal'   = client-facing quote: rolled-up pricing, no crew math / unit costs
    const mode: 'work_order' | 'proposal' = body.mode === 'proposal' ? 'proposal' : 'work_order';
    const isProposal = mode === 'proposal';

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

    // Fallback: projects can legitimately have no formal contract row yet
    // (e.g. a WO created before contracts are set up). As long as the viewer is
    // a participant on this project, render the CO from the CO's own parties:
    // the creating org bills, the assigned org receives.
    if (!chosenContract && viewerOrgId) {
      chosenContract = {
        from_org_id: co.org_id,
        to_org_id: co.assigned_to_org_id ?? co.org_id,
        contract_sum: 0,
      };
    }

    // Still nothing resolvable → the viewer isn't tied to this project.
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

    // Fetch prior approved COs on the same project (excluding this one)
    const { data: priorCOs = [] } = await supabase
      .from("change_orders")
      .select("id, co_number, title, approved_at, created_at, status, tc_submitted_price")
      .eq("project_id", co.project_id)
      .eq("status", "approved")
      .neq("id", co_id)
      .order("approved_at", { ascending: true, nullsFirst: false });

    const priorIds = priorCOs.map((c: any) => c.id);
    let priorLabor: any[] = [];
    let priorMats: any[] = [];
    let priorEquip: any[] = [];
    if (priorIds.length > 0) {
      const [{ data: pl = [] }, { data: pm = [] }, { data: pe = [] }] = await Promise.all([
        supabase.from("co_labor_entries").select("co_id, org_id, line_total").in("co_id", priorIds).eq("is_actual_cost", false),
        supabase.from("co_material_items").select("co_id, org_id, billed_amount").in("co_id", priorIds),
        supabase.from("co_equipment_items").select("co_id, org_id, billed_amount").in("co_id", priorIds),
      ]);
      priorLabor = pl; priorMats = pm; priorEquip = pe;
    }

    const sumFor = (rows: any[], coId: string, field: string) =>
      rows.filter((r) => r.co_id === coId && r.org_id === billingOrgId).reduce((s, r) => s + Number(r[field] ?? 0), 0);

    const priorCOsWithTotals = priorCOs.map((p: any) => {
      const labor = sumFor(priorLabor, p.id, "line_total");
      const laborTotalP = isGCPerspective && p.tc_submitted_price != null ? Number(p.tc_submitted_price) : labor;
      const mats = sumFor(priorMats, p.id, "billed_amount");
      const equip = sumFor(priorEquip, p.id, "billed_amount");
      return { ...p, _amount: laborTotalP + mats + equip };
    });
    const priorTotal = priorCOsWithTotals.reduce((s, p) => s + p._amount, 0);

    const originalContractSumRaw = Number(chosenContract.contract_sum ?? 0);
    // contract_sum already includes approved CO deltas via apply_co_contract_delta trigger.
    // Subtract prior approved CO totals AND this CO's delta (if it's also approved) to get the true original.
    const thisCOApproved = co.status === "approved";
    const originalContractSum = originalContractSumRaw - priorTotal - (thisCOApproved ? subtotal : 0);

    // Build PDF
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
    const pw = doc.internal.pageSize.getWidth();
    const margin = 50;
    const contentW = pw - margin * 2;
    let y = margin;

    const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const docKindLabel = co.document_type === "WO" ? "Work Order" : "Change Order";
    const pricingLabel = ((co.pricing_type ?? "fixed") as string).toLowerCase() === "tm"
      ? "T&M"
      : ((co.pricing_type ?? "fixed") as string).toUpperCase();
    const addr: any = project?.address;
    const addressLine = String(
      typeof addr === "string"
        ? addr
        : [addr?.street ?? addr?.line1, addr?.city, addr?.state, addr?.zip].filter(Boolean).join(", ") || "—"
    );

    // Header
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(isProposal ? "PROPOSAL" : `${docKindLabel.toUpperCase()} DOCUMENT`, margin, y);
    doc.text(isProposal ? "PREPARED FOR CLIENT REVIEW" : "NOT AN AIA FORM", pw - margin, y, { align: "right" });
    y += 20;

    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(2);
    doc.line(margin, y, pw - margin, y);
    y += 25;

    // Title
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 95);
    doc.text(isProposal ? "Proposal" : `${docKindLabel} Document`, margin, y);
    y += 30;

    // Info grid
    doc.setFontSize(9);
    doc.setTextColor(100);
    const numberLabel = co.document_type === "WO" ? "WO Number:" : "CO Number:";
    const infoRows = isProposal
      ? [
          ["Project:", project?.name ?? "—", "Proposal No:", co.co_number ?? "—"],
          ["Prepared by:", orgName(billingOrgId), "Date:", new Date().toLocaleDateString()],
          ["Prepared for:", orgName(receivingOrgId), "Valid for:", "30 days"],
          ["Site Address:", addressLine.substring(0, 40), "Pricing:", pricingLabel],
        ]
      : [
          ["Project:", project?.name ?? "—", numberLabel, co.co_number ?? "—"],
          ["Contractor:", orgName(billingOrgId), "Date:", new Date(co.created_at).toLocaleDateString()],
          ["Owner:", orgName(receivingOrgId), "Status:", (co.status ?? "").toUpperCase()],
          ["Document Type:", docKindLabel, "Parties:", `${orgName(billingOrgId)} to ${orgName(receivingOrgId)}`],
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

    // Contract Summary Box (AIA G701-style)
    const hasPriors = priorCOsWithTotals.length > 0;
    const thisCONumber = co.co_number ?? `this ${docKindLabel}`;
    const newSumLabel = thisCOApproved ? "New Contract Sum:" : "New Contract Sum (Pending Approval):";
    const summaryRows: [string, string, boolean?][] = hasPriors
      ? [
          ["Original Contract Sum:", fmt(originalContractSum)],
          [`Net Change by Previously Authorized ${docKindLabel}s:`, fmt(priorTotal)],
          [`Contract Sum Prior to This ${docKindLabel}:`, fmt(originalContractSum + priorTotal), true],
          [`Net Change by This ${docKindLabel} (${thisCONumber}):`, fmt(subtotal)],
          [newSumLabel, fmt(originalContractSum + priorTotal + subtotal), true],
        ]
      : [
          ["Original Contract Sum:", fmt(originalContractSum)],
          [`Net Change by This ${docKindLabel} (${thisCONumber}):`, fmt(subtotal)],
          [newSumLabel, fmt(originalContractSum + subtotal), true],
        ];
    if (!isProposal) {
    const boxHeight = 28 + summaryRows.length * 15 + 10;

    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, y, contentW, boxHeight, 4, 4, "F");
    y += 18;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 95);
    doc.text("CONTRACT SUMMARY", margin + 12, y);
    y += 18;

    doc.setFontSize(9);
    for (const [label, val, emphasize] of summaryRows) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(emphasize ? 30 : 60, emphasize ? 58 : 60, emphasize ? 95 : 60);
      doc.text(label, margin + 12, y);
      doc.setFont("helvetica", "bold");
      doc.text(val, pw - margin - 12, y, { align: "right" });
      y += 15;
    }
    y += 20;

    // Prior Change Orders table
    if (hasPriors) {
      if (y > 650) { doc.addPage(); y = margin; }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 95);
      doc.text(`PREVIOUSLY AUTHORIZED ${docKindLabel.toUpperCase()}S`, margin, y);
      y += 5;
      doc.setDrawColor(30, 58, 95);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pw - margin, y);
      y += 15;

      doc.setFontSize(8);
      doc.setFillColor(235, 238, 243);
      doc.rect(margin, y - 10, contentW, 16, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80);
      doc.text("#", margin + 5, y);
      doc.text(co.document_type === "WO" ? "WO NUMBER" : "CO NUMBER", margin + 25, y);
      doc.text("DATE APPROVED", margin + 145, y);
      doc.text("DESCRIPTION", margin + 230, y);
      doc.text("AMOUNT", pw - margin - 5, y, { align: "right" });
      y += 18;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(40);
      for (let i = 0; i < priorCOsWithTotals.length; i++) {
        const p = priorCOsWithTotals[i];
        if (y > 700) { doc.addPage(); y = margin; }
        const dateStr = p.approved_at
          ? new Date(p.approved_at).toLocaleDateString()
          : new Date(p.created_at).toLocaleDateString();
        doc.text(String(i + 1), margin + 5, y);
        doc.text((p.co_number ?? "—").toString().substring(0, 22), margin + 25, y);
        doc.text(dateStr, margin + 145, y);
        doc.text(String(p.title ?? "").substring(0, 38), margin + 230, y);
        doc.text(fmt(p._amount), pw - margin - 5, y, { align: "right" });
        y += 14;
      }

      doc.setDrawColor(200);
      doc.line(margin, y - 4, pw - margin, y - 4);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 95);
      doc.text("TOTAL PREVIOUSLY AUTHORIZED", margin + 25, y + 6);
      doc.text(fmt(priorTotal), pw - margin - 5, y + 6, { align: "right" });
      y += 26;
    }
    } // end !isProposal contract-summary section

    // Proposal narrative
    if (isProposal) {
      const narrative: string =
        (co as any).problem_summary ?? (co as any).reason_note ?? co.title ?? "";
      if (narrative) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 95);
        doc.text("PROPOSED WORK", margin, y);
        y += 5;
        doc.setDrawColor(30, 58, 95);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pw - margin, y);
        y += 16;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60);
        for (const line of doc.splitTextToSize(narrative, contentW)) {
          if (y > 720) { doc.addPage(); y = margin; }
          doc.text(line, margin, y);
          y += 13;
        }
        y += 12;
      }
    }



    // ===== Priced scope: one block per scope item (Design B) =====
    const laborByItem = new Map<string, any[]>();
    const unassignedLabor: any[] = [];
    for (const e of laborForView) {
      const key = e.co_line_item_id as string | null;
      if (key) {
        const arr = laborByItem.get(key) ?? [];
        arr.push(e);
        laborByItem.set(key, arr);
      } else {
        unassignedLabor.push(e);
      }
    }
    const showCostDetail = !isProposal && !isGCPerspective;
    const num = (v: any) => Number(v ?? 0);
    const workloadOf = (e: any) => {
      const crew = num(e.crew_size), days = num(e.days), hpd = num(e.hours_per_day);
      return crew > 0 && days > 0 && hpd > 0 ? `${crew} crew x ${days} d x ${hpd} h = ` : "";
    };

    if (y > 640) { doc.addPage(); y = margin; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 95);
    doc.text(isProposal ? "SCOPE OF WORK & PRICING" : "PRICED SCOPE OF WORK", margin, y);
    y += 5;
    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pw - margin, y);
    y += 16;

    if (lineItems.length === 0 && unassignedLabor.length === 0) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(140);
      doc.text("No scope items on this contract.", margin + 5, y);
      doc.setTextColor(40);
      y += 18;
    }

    const renderItemBlock = (
      label: string,
      title: string,
      description: string | null,
      unitQty: string,
      labor: any[],
      itemTotal: number,
    ) => {
      const estRows = 1 + (description ? 1 : 0) + (showCostDetail ? labor.length : labor.length > 0 ? 1 : 0);
      if (y + estRows * 14 > 715) { doc.addPage(); y = margin; }

      // Item header band
      doc.setFillColor(240, 243, 248);
      doc.rect(margin, y - 10, contentW, 17, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 95);
      doc.text(`${label} — ${title}`.substring(0, 68), margin + 5, y);
      doc.text(fmt(itemTotal), pw - margin - 5, y, { align: "right" });
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
          if (y > 720) { doc.addPage(); y = margin; }
          doc.text(line, margin + 12, y);
          y += 11;
        }
        y += 4;
      }

      if (labor.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(60);
        if (showCostDetail) {
          for (const e of labor) {
            if (y > 720) { doc.addPage(); y = margin; }
            doc.setFont("helvetica", "bold");
            doc.text("Labor", margin + 12, y);
            doc.setFont("helvetica", "normal");
            const detail = `${workloadOf(e)}${num(e.hours).toFixed(1)} hrs @ ${fmt(num(e.hourly_rate))}/hr${e.description ? ` — ${String(e.description).substring(0, 30)}` : ""}`;
            doc.text(detail.substring(0, 74), margin + 60, y);
            doc.text(fmt(num(e.line_total)), pw - margin - 5, y, { align: "right" });
            y += 13;
          }
        } else {
          const hrs = labor.reduce((s, e) => s + num(e.hours), 0);
          const amt = labor.reduce((s, e) => s + num(e.line_total), 0);
          if (y > 720) { doc.addPage(); y = margin; }
          doc.setFont("helvetica", "bold");
          doc.text("Labor", margin + 12, y);
          doc.setFont("helvetica", "normal");
          if (!isProposal) doc.text(`${hrs.toFixed(1)} hrs`, margin + 60, y);
          doc.text(fmt(amt), pw - margin - 5, y, { align: "right" });
          y += 13;
        }
      }
      y += 8;
    };

    for (let i = 0; i < lineItems.length; i++) {
      const li = lineItems[i];
      const labor = laborByItem.get(li.id) ?? [];
      const itemTotal = labor.reduce((s, e) => s + num(e.line_total), 0);
      const unitQty = li.qty != null
        ? `Qty ${li.qty} ${li.unit ?? ""}`.trim()
        : (li.unit ? `Unit: ${li.unit}` : "");
      renderItemBlock(
        `ITEM ${i + 1}`,
        String(li.item_name ?? "Scope item"),
        li.description ? String(li.description) : null,
        unitQty,
        labor,
        itemTotal,
      );
    }

    if (unassignedLabor.length > 0) {
      const total = unassignedLabor.reduce((s, e) => s + num(e.line_total), 0);
      renderItemBlock(
        "GENERAL",
        "Labor not allocated to a single scope item",
        null,
        "",
        unassignedLabor,
        total,
      );
    }

    // Materials & Equipment (not line-item scoped in the data model)
    if (materials.length > 0) {
      if (y > 640) { doc.addPage(); y = margin; }
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
      if (showCostDetail) doc.text("UNIT COST", margin + 300, y);
      doc.text("AMOUNT", pw - margin - 5, y, { align: "right" });
      y += 18;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(40);
      for (const m of materials) {
        if (y > 700) { doc.addPage(); y = margin; }
        doc.text(String(m.description ?? "").substring(0, 45), margin + 5, y);
        doc.text(String(m.quantity ?? ""), margin + 250, y);
        if (showCostDetail) doc.text(fmt(m.unit_cost ?? 0), margin + 300, y);
        doc.text(fmt(m.billed_amount ?? 0), pw - margin - 5, y, { align: "right" });
        y += 14;
      }
      doc.setDrawColor(200);
      doc.line(margin, y - 4, pw - margin, y - 4);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 95);
      doc.text("TOTAL MATERIALS", margin + 5, y + 6);
      doc.text(fmt(materialsTotal), pw - margin - 5, y + 6, { align: "right" });
      y += 28;
    }

    if (equipment.length > 0) {
      if (y > 650) { doc.addPage(); y = margin; }
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 95);
      doc.text("EQUIPMENT", margin, y);
      y += 15;

      doc.setFontSize(8);
      doc.setFillColor(235, 238, 243);
      doc.rect(margin, y - 10, contentW, 16, "F");
      doc.setTextColor(80);
      doc.text("DESCRIPTION", margin + 5, y);
      doc.text("DURATION / NOTE", margin + 250, y);
      doc.text("AMOUNT", pw - margin - 5, y, { align: "right" });
      y += 18;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(40);
      for (const eq of equipment) {
        if (y > 700) { doc.addPage(); y = margin; }
        doc.text(String(eq.description ?? "").substring(0, 45), margin + 5, y);
        doc.text(String(eq.duration_note ?? "—").substring(0, 24), margin + 250, y);
        doc.text(fmt(num(eq.billed_amount)), pw - margin - 5, y, { align: "right" });
        y += 14;
      }
      doc.setDrawColor(200);
      doc.line(margin, y - 4, pw - margin, y - 4);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 95);
      doc.text("TOTAL EQUIPMENT", margin + 5, y + 6);
      doc.text(fmt(equipmentTotal), pw - margin - 5, y + 6, { align: "right" });
      y += 28;
    }




    // Financial Summary
    if (y > 600) { doc.addPage(); y = margin; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 95);
    doc.text(isProposal ? "INVESTMENT SUMMARY" : "FINANCIAL SUMMARY", margin, y);

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

    // Approval trail (internal document only)
    if (!isProposal) {
      const trail: [string, string | null][] = [
        ["Created", co.created_at],
        ["Submitted", (co as any).submitted_at ?? null],
        ["Approved", (co as any).approved_at ?? null],
        ["Contracted", (co as any).contracted_at ?? null],
      ];
      if (y > 640) { doc.addPage(); y = margin; }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 95);
      doc.text("APPROVAL TRAIL", margin, y);
      y += 5;
      doc.setDrawColor(30, 58, 95);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pw - margin, y);
      y += 16;
      doc.setFontSize(9);
      for (const [label, ts] of trail) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60);
        doc.text(label, margin, y);
        doc.setFont("helvetica", ts ? "bold" : "normal");
        doc.setTextColor(ts ? 30 : 150, ts ? 58 : 150, ts ? 95 : 150);
        doc.text(ts ? new Date(ts).toLocaleString() : "Pending", margin + 120, y);
        y += 14;
      }
      y += 20;
    }

    // Proposal terms
    if (isProposal) {
      if (y > 620) { doc.addPage(); y = margin; }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 95);
      doc.text("TERMS & CONDITIONS", margin, y);
      y += 5;
      doc.setDrawColor(30, 58, 95);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pw - margin, y);
      y += 16;
      const terms = [
        `Pricing basis: ${pricingLabel}. Amounts above include all labor, materials, and equipment listed.`,
        `Applicable sales tax of ${taxRate}% is ${totalTax > 0 ? "included as itemized above" : "not applicable"}.`,
        retainagePct > 0 ? `Retainage of ${retainagePct}% applies to each progress payment.` : "Payment due upon completion of the scope described, net 30.",
        "This proposal is valid for 30 days from the date above. Work outside the listed scope requires a written change order.",
        "Schedule commences upon written acceptance and availability of the work area.",
      ];
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(70);
      for (const t of terms) {
        for (const line of doc.splitTextToSize("• " + t, contentW)) {
          if (y > 720) { doc.addPage(); y = margin; }
          doc.text(line, margin, y);
          y += 12;
        }
      }
      y += 20;
    }

    // Signature blocks
    if (y > 580) { doc.addPage(); y = margin; }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 95);
    doc.text(isProposal ? "ACCEPTANCE" : "SIGNATURES", margin, y);
    y += 20;

    const sigLabels = isProposal ? ["PROPOSED BY", "ACCEPTED BY (CLIENT)"] : ["CONTRACTOR", "OWNER"];


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
        isProposal
          ? `Page ${p} of ${pageCount} — Proposal ${co.co_number ?? ""} — Generated ${new Date().toLocaleDateString()}`
          : `Page ${p} of ${pageCount} — Generated ${new Date().toLocaleDateString()} — This is not an AIA document`,
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
        "Content-Disposition": `attachment; filename="${isProposal ? "Proposal" : co.document_type === "WO" ? "WO" : "CO"}-${co.co_number ?? co_id}.pdf"`,
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

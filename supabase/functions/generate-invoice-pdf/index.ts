import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceItem {
  id: string;
  sov_item_id: string;
  prior_percent_complete: number;
  new_percent_complete: number;
  this_period_amount: number;
  sov_items: {
    name: string;
    dollar_value: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoiceId } = await req.json();

    if (!invoiceId) {
      throw new Error("Invoice ID is required");
    }

    console.log("Generating PDF for invoice:", invoiceId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get the user's JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with user's JWT to verify access
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user has access to this invoice via RLS
    const { data: accessCheck, error: accessError } = await userSupabase
      .from("invoices")
      .select("id")
      .eq("id", invoiceId)
      .single();

    if (accessError || !accessCheck) {
      console.error("Access denied for invoice:", invoiceId);
      return new Response(
        JSON.stringify({ error: "Unauthorized - you do not have access to this invoice" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Now use service role to fetch full data for PDF generation
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch invoice with project details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        *,
        projects (
          name,
          address,
          retention_percentage,
          original_contract_value
        )
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError) {
      console.error("Invoice fetch error:", invoiceError);
      throw new Error("Failed to fetch invoice");
    }

    // Fetch invoice items with SOV details
    const { data: items, error: itemsError } = await supabase
      .from("invoice_items")
      .select(`
        *,
        sov_items (name, dollar_value)
      `)
      .eq("invoice_id", invoiceId);

    if (itemsError) {
      console.error("Items fetch error:", itemsError);
      throw new Error("Failed to fetch invoice items");
    }

    console.log("Invoice data fetched, generating PDF...");

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Helper functions
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(amount || 0);
    };

    const formatDate = (dateString: string | null) => {
      if (!dateString) return "N/A";
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    };

    // Header
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("PAY APPLICATION", pageWidth / 2, y, { align: "center" });
    y += 12;

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice #${invoice.invoice_number}`, pageWidth / 2, y, { align: "center" });
    y += 20;

    // Project Info
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PROJECT:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.projects?.name || "N/A", margin + 25, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text("ADDRESS:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.projects?.address || "N/A", margin + 25, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text("DATE:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(invoice.submitted_at || invoice.created_at), margin + 25, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text("STATUS:", margin, y);
    doc.setFont("helvetica", "normal");
    const statusText = invoice.status?.toUpperCase() || "DRAFT";
    doc.text(statusText, margin + 25, y);
    y += 15;

    // Separator line
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Contract Summary
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CONTRACT SUMMARY", margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const contractValue = invoice.projects?.original_contract_value || 0;
    const retentionPct = invoice.projects?.retention_percentage || 10;

    doc.text(`Original Contract Value:`, margin, y);
    doc.text(formatCurrency(contractValue), pageWidth - margin, y, { align: "right" });
    y += 6;

    doc.text(`Retention Rate:`, margin, y);
    doc.text(`${retentionPct}%`, pageWidth - margin, y, { align: "right" });
    y += 15;

    // Schedule of Values Table
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("SCHEDULE OF VALUES - BILLING BREAKDOWN", margin, y);
    y += 8;

    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const col1 = margin + 2;
    const col2 = margin + 70;
    const col3 = margin + 95;
    const col4 = margin + 120;
    const col5 = pageWidth - margin - 2;

    doc.text("ITEM DESCRIPTION", col1, y + 5.5);
    doc.text("VALUE", col2, y + 5.5);
    doc.text("PRIOR %", col3, y + 5.5);
    doc.text("NEW %", col4, y + 5.5);
    doc.text("THIS PERIOD", col5, y + 5.5, { align: "right" });
    y += 10;

    // Table rows
    doc.setFont("helvetica", "normal");
    let rowIndex = 0;

    items.forEach((item: InvoiceItem) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      if (rowIndex % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y - 2, pageWidth - margin * 2, 7, "F");
      }

      const itemName = item.sov_items?.name || "N/A";
      const truncatedName = itemName.length > 35 ? itemName.substring(0, 32) + "..." : itemName;
      
      doc.text(truncatedName, col1, y + 3);
      doc.text(formatCurrency(item.sov_items?.dollar_value || 0), col2, y + 3);
      doc.text(`${item.prior_percent_complete}%`, col3, y + 3);
      doc.text(`${item.new_percent_complete}%`, col4, y + 3);
      doc.text(formatCurrency(item.this_period_amount), col5, y + 3, { align: "right" });
      
      y += 7;
      rowIndex++;
    });

    y += 5;

    // Summary section
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFontSize(10);
    
    // Total Billed
    doc.setFont("helvetica", "normal");
    doc.text("Total Billed This Period:", margin, y);
    doc.text(formatCurrency(invoice.total_billed), pageWidth - margin, y, { align: "right" });
    y += 6;

    // Retention
    doc.text(`Less Retention (${retentionPct}%):`, margin, y);
    doc.setTextColor(180, 100, 0);
    doc.text(`(${formatCurrency(invoice.retention_withheld)})`, pageWidth - margin, y, { align: "right" });
    doc.setTextColor(0);
    y += 8;

    // Net Payable
    doc.setDrawColor(100);
    doc.line(pageWidth - 60, y, pageWidth - margin, y);
    y += 6;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("NET PAYABLE THIS PERIOD:", margin, y);
    doc.setTextColor(0, 100, 0);
    doc.text(formatCurrency(invoice.net_payable), pageWidth - margin, y, { align: "right" });
    doc.setTextColor(0);
    y += 20;

    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(128);
    doc.text(
      `Generated on ${new Date().toLocaleDateString("en-US", { 
        month: "long", 
        day: "numeric", 
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      })}`,
      pageWidth / 2,
      280,
      { align: "center" }
    );

    // Convert to base64
    const pdfBase64 = doc.output("datauristring").split(",")[1];

    console.log("PDF generated successfully");

    return new Response(
      JSON.stringify({ 
        pdf: pdfBase64,
        filename: `Invoice_${invoice.invoice_number}_${invoice.projects?.name?.replace(/\s+/g, "_") || "Project"}.pdf`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating PDF:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

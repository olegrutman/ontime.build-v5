import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Get and sanitize the API key (remove any whitespace/newlines that could break headers)
const rawApiKey = Deno.env.get("RESEND_API_KEY");
const RESEND_API_KEY = rawApiKey?.trim().replace(/[\r\n]/g, '');

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendPORequest {
  po_id: string;
  supplier_email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate RESEND_API_KEY before proceeding
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured. Please add it in your backend secrets.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { po_id, supplier_email }: SendPORequest = await req.json();

    // Fetch PO details
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        organization:organizations(name, org_code),
        supplier:suppliers(name, supplier_code),
        project:projects(name),
        work_item:work_items(title)
      `)
      .eq("id", po_id)
      .single();

    if (poError || !po) {
      throw new Error("Purchase order not found");
    }

    // Fetch line items
    const { data: lineItems } = await supabase
      .from("po_line_items")
      .select("*")
      .eq("po_id", po_id)
      .order("line_number");

    // Generate download URLs
    const baseUrl = Deno.env.get("SUPABASE_URL")!;
    const downloadToken = po.download_token;
    const pdfUrl = `${baseUrl}/functions/v1/po-download?token=${downloadToken}&format=pdf`;
    const csvUrl = `${baseUrl}/functions/v1/po-download?token=${downloadToken}&format=csv`;

    // Build line items table for email
    const itemsHtml = (lineItems || []).map((item: any) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.line_number}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.supplier_sku || '-'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.description}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.uom}</td>
      </tr>
    `).join("");

    const projectName = po.project?.name || po.work_item?.title || "N/A";
    const totalItems = lineItems?.length || 0;

    // Send email using Resend REST API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Ontime.Build <onboarding@resend.dev>",
        to: [supplier_email],
        subject: `New Purchase Order: ${po.po_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Purchase Order</h1>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>PO Number:</strong> ${po.po_number}</p>
              <p><strong>PO Name:</strong> ${po.po_name}</p>
              <p><strong>From:</strong> ${po.organization?.name} (${po.organization?.org_code})</p>
              <p><strong>Project:</strong> ${projectName}</p>
              <p><strong>Total Items:</strong> ${totalItems}</p>
            </div>
            
            <h2 style="color: #333;">Line Items</h2>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background: #333; color: white;">
                  <th style="padding: 8px; text-align: left;">#</th>
                  <th style="padding: 8px; text-align: left;">SKU</th>
                  <th style="padding: 8px; text-align: left;">Description</th>
                  <th style="padding: 8px; text-align: right;">Qty</th>
                  <th style="padding: 8px; text-align: left;">UOM</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            ${po.notes ? `<p><strong>Notes:</strong> ${po.notes}</p>` : ''}
            
            <div style="margin: 30px 0;">
              <h3>Download Options</h3>
              <p>
                <a href="${pdfUrl}" style="display: inline-block; padding: 10px 20px; background: #333; color: white; text-decoration: none; border-radius: 4px; margin-right: 10px;">Download PDF</a>
                <a href="${csvUrl}" style="display: inline-block; padding: 10px 20px; background: #666; color: white; text-decoration: none; border-radius: 4px;">Download CSV (ERP)</a>
              </p>
            </div>
            
            <p style="color: #666; font-size: 12px; margin-top: 40px;">
              This is an automated message from Ontime.Build. Please do not reply directly to this email.
            </p>
          </div>
        `,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(emailResult.message || "Failed to send email");
    }

    // Update PO status to SENT
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (token) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      
      // Get user ID from token
      const { data: { user } } = await userClient.auth.getUser(token);
      
      await supabase
        .from("purchase_orders")
        .update({
          status: "SUBMITTED",
          submitted_at: new Date().toISOString(),
          submitted_by: user?.id,
          sent_at: new Date().toISOString(),
          sent_by: user?.id,
        })
        .eq("id", po_id);
    }

    console.log("PO email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, emailId: emailResult.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending PO:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

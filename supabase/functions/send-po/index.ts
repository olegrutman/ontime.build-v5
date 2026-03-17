import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const rawApiKey = Deno.env.get("RESEND_API_KEY");

function getValidatedResendApiKey(): string {
  if (!rawApiKey) {
    throw new Error("RESEND_API_KEY is not configured. Please add it in your backend secrets.");
  }
  if (/[\x00-\x1F\x7F]/.test(rawApiKey)) {
    throw new Error("RESEND_API_KEY contains invalid hidden characters.");
  }
  const trimmed = rawApiKey.trim();
  if (/\s/.test(trimmed)) {
    throw new Error("RESEND_API_KEY contains whitespace.");
  }
  return trimmed;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SendPORequest {
  po_id: string;
  supplier_email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- AUTH CHECK ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = user.id;

    const RESEND_API_KEY = getValidatedResendApiKey();
    const { po_id, supplier_email }: SendPORequest = await req.json();

    // --- EMAIL VALIDATION ---
    if (!supplier_email || !EMAIL_RE.test(supplier_email)) {
      return new Response(JSON.stringify({ error: "Invalid supplier email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // --- Use service client for all DB operations (auth already verified above) ---
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: po, error: poError } = await serviceClient
      .from("purchase_orders")
      .select(`
        *,
        organization:organizations!purchase_orders_organization_id_fkey(name, org_code),
        supplier:suppliers(name, supplier_code),
        project:projects(name)
      `)
      .eq("id", po_id)
      .single();

    if (poError || !po) {
      console.error("PO fetch error:", poError);
      return new Response(JSON.stringify({ error: "Purchase order not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch line items
    const { data: lineItems } = await serviceClient
      .from("po_line_items")
      .select("*")
      .eq("po_id", po_id)
      .order("line_number");

    // Generate download URLs
    const downloadToken = po.download_token;
    const pdfUrl = `${supabaseUrl}/functions/v1/po-download?token=${downloadToken}&format=pdf`;
    const csvUrl = `${supabaseUrl}/functions/v1/po-download?token=${downloadToken}&format=csv`;

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

    const projectName = po.project?.name || "N/A";
    const totalItems = lineItems?.length || 0;

    // Send email via Resend
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("Authorization", `Bearer ${RESEND_API_KEY}`);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
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
              <tbody>${itemsHtml}</tbody>
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
    const emailSent = emailResponse.ok;

    if (!emailSent) {
      console.error("Email send failed (non-blocking):", emailResult);
    } else {
      console.log("PO email sent successfully:", emailResult);
    }

    // Always update PO status regardless of email outcome
    const updateFields: Record<string, unknown> = {
      status: "SUBMITTED",
      submitted_at: new Date().toISOString(),
      submitted_by: userId,
      sent_at: new Date().toISOString(),
      sent_by: userId,
      download_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      download_count: 0,
    };

    // If PO was PENDING_APPROVAL, record approval
    if (po.status === "PENDING_APPROVAL") {
      updateFields.approved_by = userId;
      updateFields.approved_at = new Date().toISOString();
    }

    await serviceClient
      .from("purchase_orders")
      .update(updateFields)
      .eq("id", po_id);

    return new Response(JSON.stringify({
      success: true,
      emailSent,
      ...(emailSent ? { emailId: emailResult.id } : { emailError: emailResult.message || "Email delivery failed" }),
    }), {
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

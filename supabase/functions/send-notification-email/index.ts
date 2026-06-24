import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'project_invite' | 'invoice_submitted' | 'invoice_approved' | 'invoice_rejected' | 'change_order_submitted' | 'change_order_approved' | 'change_order_rejected';
  recipientEmail: string;
  projectName: string;
  projectId?: string;
  invoiceNumber?: number;
  changeOrderLocation?: string;
  amount?: number;
  rejectionReason?: string;
  senderName?: string;
}

// HTML escape function to prevent XSS/injection attacks in emails
function escapeHtml(text: string | undefined | null): string {
  if (text === undefined || text === null) {
    return '';
  }
  const str = String(text);
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return str.replace(/[&<>"']/g, m => map[m]);
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getEmailContent = (request: EmailRequest) => {
  const baseStyles = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #1a1a2e;
  `;

  // Sanitize all user-provided inputs
  const safeProjectName = escapeHtml(request.projectName);
  const safeSenderName = escapeHtml(request.senderName) || 'A team member';
  const safeRejectionReason = escapeHtml(request.rejectionReason);
  const safeChangeOrderLocation = escapeHtml(request.changeOrderLocation);

  switch (request.type) {
    case 'project_invite':
      return {
        subject: `You've been invited to collaborate on ${safeProjectName}`,
        html: `
          <div style="${baseStyles}">
            <h1 style="color: #1a1a2e;">Project Invitation</h1>
            <p>Hello,</p>
            <p><strong>${safeSenderName}</strong> has invited you to collaborate on the project <strong>${safeProjectName}</strong>.</p>
            <p>Sign in to your account to view the project and start collaborating.</p>
            <br/>
            <p style="color: #666;">Best regards,<br/>The Construction App Team</p>
          </div>
        `
      };

    case 'invoice_submitted':
      return {
        subject: `Invoice #${request.invoiceNumber} submitted for ${safeProjectName}`,
        html: `
          <div style="${baseStyles}">
            <h1 style="color: #1a1a2e;">Invoice Submitted for Review</h1>
            <p>Hello,</p>
            <p>A new invoice has been submitted for your review on project <strong>${safeProjectName}</strong>.</p>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0;"><strong>Invoice Number:</strong> #${request.invoiceNumber}</p>
              ${request.amount ? `<p style="margin: 8px 0 0 0;"><strong>Amount:</strong> ${formatCurrency(request.amount)}</p>` : ''}
            </div>
            <p>Please log in to review and approve or reject this invoice.</p>
            <br/>
            <p style="color: #666;">Best regards,<br/>The Construction App Team</p>
          </div>
        `
      };

    case 'invoice_approved':
      return {
        subject: `Invoice #${request.invoiceNumber} approved for ${safeProjectName}`,
        html: `
          <div style="${baseStyles}">
            <h1 style="color: #16a34a;">Invoice Approved ✓</h1>
            <p>Hello,</p>
            <p>Great news! Your invoice has been approved on project <strong>${safeProjectName}</strong>.</p>
            <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #16a34a;">
              <p style="margin: 0;"><strong>Invoice Number:</strong> #${request.invoiceNumber}</p>
              ${request.amount ? `<p style="margin: 8px 0 0 0;"><strong>Amount:</strong> ${formatCurrency(request.amount)}</p>` : ''}
            </div>
            <br/>
            <p style="color: #666;">Best regards,<br/>The Construction App Team</p>
          </div>
        `
      };

    case 'invoice_rejected':
      return {
        subject: `Invoice #${request.invoiceNumber} rejected for ${safeProjectName}`,
        html: `
          <div style="${baseStyles}">
            <h1 style="color: #dc2626;">Invoice Rejected</h1>
            <p>Hello,</p>
            <p>Your invoice has been rejected on project <strong>${safeProjectName}</strong>.</p>
            <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #dc2626;">
              <p style="margin: 0;"><strong>Invoice Number:</strong> #${request.invoiceNumber}</p>
              ${safeRejectionReason ? `<p style="margin: 8px 0 0 0;"><strong>Reason:</strong> ${safeRejectionReason}</p>` : ''}
            </div>
            <p>Please review the feedback and resubmit your invoice with the necessary corrections.</p>
            <br/>
            <p style="color: #666;">Best regards,<br/>The Construction App Team</p>
          </div>
        `
      };

    case 'change_order_submitted':
      return {
        subject: `Change Order submitted for ${safeProjectName}`,
        html: `
          <div style="${baseStyles}">
            <h1 style="color: #1a1a2e;">Change Order Submitted for Review</h1>
            <p>Hello,</p>
            <p>A new change order has been submitted for your review on project <strong>${safeProjectName}</strong>.</p>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0;"><strong>Location:</strong> ${safeChangeOrderLocation}</p>
              ${request.amount ? `<p style="margin: 8px 0 0 0;"><strong>Amount:</strong> ${formatCurrency(request.amount)}</p>` : ''}
            </div>
            <p>Please log in to review and approve or reject this change order.</p>
            <br/>
            <p style="color: #666;">Best regards,<br/>The Construction App Team</p>
          </div>
        `
      };

    case 'change_order_approved':
      return {
        subject: `Change Order approved for ${safeProjectName}`,
        html: `
          <div style="${baseStyles}">
            <h1 style="color: #16a34a;">Change Order Approved ✓</h1>
            <p>Hello,</p>
            <p>Great news! Your change order has been approved and added to the Schedule of Values on project <strong>${safeProjectName}</strong>.</p>
            <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #16a34a;">
              <p style="margin: 0;"><strong>Location:</strong> ${safeChangeOrderLocation}</p>
              ${request.amount ? `<p style="margin: 8px 0 0 0;"><strong>Amount:</strong> ${formatCurrency(request.amount)}</p>` : ''}
            </div>
            <br/>
            <p style="color: #666;">Best regards,<br/>The Construction App Team</p>
          </div>
        `
      };

    case 'change_order_rejected':
      return {
        subject: `Change Order rejected for ${safeProjectName}`,
        html: `
          <div style="${baseStyles}">
            <h1 style="color: #dc2626;">Change Order Rejected</h1>
            <p>Hello,</p>
            <p>Your change order has been rejected on project <strong>${safeProjectName}</strong>.</p>
            <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #dc2626;">
              <p style="margin: 0;"><strong>Location:</strong> ${safeChangeOrderLocation}</p>
              ${safeRejectionReason ? `<p style="margin: 8px 0 0 0;"><strong>Reason:</strong> ${safeRejectionReason}</p>` : ''}
            </div>
            <p>Please review the feedback and make any necessary adjustments.</p>
            <br/>
            <p style="color: #666;">Best regards,<br/>The Construction App Team</p>
          </div>
        `
      };

    default:
      throw new Error(`Unknown email type: ${request.type}`);
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-notification-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailRequest: EmailRequest = await req.json();
    console.log("Email request type:", emailRequest.type);

    if (!emailRequest.recipientEmail || !emailRequest.type || !emailRequest.projectName) {
      throw new Error("Missing required fields: recipientEmail, type, or projectName");
    }

    // Validate input lengths to prevent abuse
    if (emailRequest.projectName.length > 200) {
      throw new Error("Project name too long");
    }
    if (emailRequest.rejectionReason && emailRequest.rejectionReason.length > 1000) {
      throw new Error("Rejection reason too long");
    }
    if (emailRequest.changeOrderLocation && emailRequest.changeOrderLocation.length > 500) {
      throw new Error("Change order location too long");
    }
    if (emailRequest.senderName && emailRequest.senderName.length > 200) {
      throw new Error("Sender name too long");
    }

    const { subject, html } = getEmailContent(emailRequest);

    console.log("Sending email to:", emailRequest.recipientEmail);
    const emailResponse = await resend.emails.send({
      from: "Construction App <onboarding@resend.dev>",
      to: [emailRequest.recipientEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

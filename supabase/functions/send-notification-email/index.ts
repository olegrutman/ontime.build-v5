import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Notification type → user_settings column mapping
const TYPE_TO_PREFERENCE: Record<string, string> = {
  PROJECT_INVITE: "notify_invites",
  WORK_ITEM_INVITE: "notify_invites",
  WORK_ORDER_ASSIGNED: "notify_invites",
  PROJECT_ADDED: "notify_invites",
  PO_SENT: "notify_email",
  CHANGE_SUBMITTED: "notify_change_orders",
  CHANGE_APPROVED: "notify_change_orders",
  CHANGE_REJECTED: "notify_change_orders",
  INVOICE_SUBMITTED: "notify_invoices",
  INVOICE_APPROVED: "notify_invoices",
  INVOICE_REJECTED: "notify_invoices",
};

interface NotificationPayload {
  notification_id: string;
  recipient_org_id: string;
  recipient_user_id: string | null;
  type: string;
  title: string;
  body: string | null;
  action_url: string;
}

function buildEmailHtml(title: string, body: string | null, actionUrl: string, appBaseUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background-color:#18181b;padding:24px 32px;">
            <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Ontime.Build</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 12px;font-size:18px;font-weight:600;color:#18181b;line-height:1.4;">${title}</h1>
            ${body ? `<p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">${body}</p>` : '<div style="margin-bottom:24px;"></div>'}
            <a href="${actionUrl}" style="display:inline-block;padding:12px 24px;background-color:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">View in App</a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e4e4e7;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
              You're receiving this because you have email notifications enabled.
              <a href="${appBaseUrl}/profile" style="color:#71717a;text-decoration:underline;">Manage notification preferences</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the request is from the service role (DB trigger)
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!authHeader || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    if (token !== serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const payload: NotificationPayload = await req.json();
    const { recipient_org_id, recipient_user_id, type, title, body, action_url } = payload;

    console.log(`Processing notification email: type=${type}, org=${recipient_org_id}, user=${recipient_user_id}`);

    // Get the preference column for this notification type
    const prefColumn = TYPE_TO_PREFERENCE[type];
    if (!prefColumn) {
      console.log(`No email preference mapping for notification type: ${type}`);
      return new Response(JSON.stringify({ skipped: true, reason: "unmapped_type" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // Determine which users to email
    let userIds: string[] = [];

    if (recipient_user_id) {
      // If targeted to a specific user, just use that user
      userIds = [recipient_user_id];
    } else {
      // Find all users in the recipient org
      const orgMembersRes = await fetch(
        `${supabaseUrl}/rest/v1/user_org_roles?organization_id=eq.${recipient_org_id}&select=user_id`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        }
      );
      const orgMembers = await orgMembersRes.json();
      if (!Array.isArray(orgMembers) || orgMembers.length === 0) {
        console.log("No org members found for org:", recipient_org_id);
        return new Response(JSON.stringify({ skipped: true, reason: "no_members" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      userIds = orgMembers.map((m: any) => m.user_id);
    }

    console.log(`Found ${userIds.length} potential recipient(s)`);

    // Fetch user settings for all users (check email preferences)
    const userIdFilter = userIds.map((id) => `"${id}"`).join(",");
    const settingsRes = await fetch(
      `${supabaseUrl}/rest/v1/user_settings?user_id=in.(${userIdFilter})&select=user_id,notify_email,${prefColumn}`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );
    const settings = await settingsRes.json();

    // Build a map of user_id → settings
    const settingsMap = new Map<string, any>();
    if (Array.isArray(settings)) {
      for (const s of settings) {
        settingsMap.set(s.user_id, s);
      }
    }

    // Filter users who have email notifications enabled
    const eligibleUserIds = userIds.filter((uid) => {
      const s = settingsMap.get(uid);
      if (!s) {
        // No settings row → defaults are true, so eligible
        return true;
      }
      // Must have global notify_email = true AND category-specific = true
      const globalEnabled = s.notify_email !== false;
      const categoryEnabled = prefColumn === "notify_email" || s[prefColumn] !== false;
      return globalEnabled && categoryEnabled;
    });

    if (eligibleUserIds.length === 0) {
      console.log("All recipients have email notifications disabled");
      return new Response(JSON.stringify({ skipped: true, reason: "all_disabled" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch emails from profiles
    const eligibleIdFilter = eligibleUserIds.map((id) => `"${id}"`).join(",");
    const profilesRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?user_id=in.(${eligibleIdFilter})&select=user_id,email,full_name`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );
    const profiles = await profilesRes.json();

    if (!Array.isArray(profiles) || profiles.length === 0) {
      console.log("No profiles found for eligible users");
      return new Response(JSON.stringify({ skipped: true, reason: "no_profiles" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Determine app base URL from action_url or fallback
    let appBaseUrl = "https://omni-work.lovable.app";
    try {
      const parsed = new URL(action_url);
      appBaseUrl = parsed.origin;
    } catch {
      // keep fallback
    }

    // Build the full action URL (ensure it's absolute)
    const fullActionUrl = action_url.startsWith("http")
      ? action_url
      : `${appBaseUrl}${action_url}`;

    // Send emails via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validate the API key
    if (/[\\x00-\\x1F\\x7F]/.test(resendApiKey) || /\\s/.test(resendApiKey.trim())) {
      console.error("RESEND_API_KEY contains invalid characters");
      return new Response(JSON.stringify({ error: "Invalid API key format" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const resend = new Resend(resendApiKey.trim());
    const emailHtml = buildEmailHtml(title, body, fullActionUrl, appBaseUrl);

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const profile of profiles) {
      if (!profile.email) continue;

      try {
        const { error: sendError } = await resend.emails.send({
          from: "Ontime.Build <onboarding@resend.dev>",
          to: [profile.email],
          subject: title,
          html: emailHtml,
        });

        if (sendError) {
          console.error(`Failed to send to ${profile.email}:`, sendError);
          results.push({ email: profile.email, success: false, error: sendError.message });
        } else {
          console.log(`Email sent to ${profile.email}`);
          results.push({ email: profile.email, success: true });
        }
      } catch (err: any) {
        console.error(`Error sending to ${profile.email}:`, err);
        results.push({ email: profile.email, success: false, error: err.message });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    console.log(`Email dispatch complete: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ sent, failed, results }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-notification-email:", error);
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ROLE_HIERARCHY: Record<string, number> = {
  PLATFORM_OWNER: 3,
  PLATFORM_ADMIN: 2,
  SUPPORT_AGENT: 1,
};

const ACTION_MIN_ROLE: Record<string, string> = {
  RESEND_INVITE: "SUPPORT_AGENT",
  FORCE_ACCEPT_PROJECT: "SUPPORT_AGENT",
  ADD_MEMBER_NO_VERIFICATION: "SUPPORT_AGENT",
  RESET_PASSWORD_LINK: "SUPPORT_AGENT",
  UNLOCK_RECORD: "SUPPORT_AGENT",
  CHANGE_USER_EMAIL: "PLATFORM_ADMIN",
  REBUILD_PERMISSIONS: "PLATFORM_ADMIN",
  CREATE_ORGANIZATION: "PLATFORM_OWNER",
};

function hasPermission(callerRole: string, requiredRole: string): boolean {
  return (ROLE_HIERARCHY[callerRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 99);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller identity using getUser
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }
    const callerId = userData.user.id;

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get caller's platform role
    const { data: roleData } = await adminClient.rpc("get_platform_role", {
      _user_id: callerId,
    });
    const callerRole = roleData as string | null;
    if (!callerRole || callerRole === "NONE") {
      return new Response(JSON.stringify({ error: "Not a platform user" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const body = await req.json();
    const { action_type, reason, ...params } = body;

    if (!action_type || !reason) {
      return new Response(
        JSON.stringify({ error: "action_type and reason are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const minRole = ACTION_MIN_ROLE[action_type];
    if (!minRole) {
      return new Response(JSON.stringify({ error: "Unknown action_type" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (!hasPermission(callerRole, minRole)) {
      return new Response(
        JSON.stringify({ error: "Insufficient platform role" }),
        { status: 403, headers: corsHeaders }
      );
    }

    let result: any = { success: true };
    let targetId = "";
    let snapshotBefore: any = null;
    let snapshotAfter: any = null;

    switch (action_type) {
      case "RESEND_INVITE": {
        const { invite_id } = params;
        if (!invite_id) {
          return new Response(JSON.stringify({ error: "invite_id is required" }), {
            status: 400,
            headers: corsHeaders,
          });
        }
        targetId = invite_id;

        // Fetch the invite
        const { data: invite, error: inviteErr } = await adminClient
          .from("project_invites")
          .select("*")
          .eq("id", invite_id)
          .single();

        if (inviteErr || !invite) {
          return new Response(JSON.stringify({ error: "Invite not found" }), {
            status: 404,
            headers: corsHeaders,
          });
        }

        snapshotBefore = { status: invite.status, sent_at: invite.sent_at };

        // Update the invite timestamp to mark as re-sent
        await adminClient
          .from("project_invites")
          .update({ sent_at: new Date().toISOString(), status: "pending" })
          .eq("id", invite_id);

        snapshotAfter = { status: "pending", resent: true };
        result = { success: true, message: "Invite resent" };
        break;
      }

      case "RESET_PASSWORD_LINK": {
        const { user_id } = params;
        targetId = user_id;
        // We need the email first
        const { data: profileData } = await adminClient
          .from("profiles")
          .select("email")
          .eq("user_id", user_id)
          .single();
        if (!profileData) {
          return new Response(JSON.stringify({ error: "User not found" }), {
            status: 404,
            headers: corsHeaders,
          });
        }
        const linkRes = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email: profileData.email,
        });
        if (linkRes.error) {
          return new Response(JSON.stringify({ error: linkRes.error.message }), {
            status: 500,
            headers: corsHeaders,
          });
        }
        result = { success: true, message: "Recovery link generated" };
        break;
      }

      case "CHANGE_USER_EMAIL": {
        const { user_id, new_email } = params;
        targetId = user_id;
        const { data: oldProfile } = await adminClient
          .from("profiles")
          .select("email")
          .eq("user_id", user_id)
          .single();
        snapshotBefore = { email: oldProfile?.email };

        const { error: authErr } = await adminClient.auth.admin.updateUserById(
          user_id,
          { email: new_email, email_confirm: true }
        );
        if (authErr) {
          return new Response(JSON.stringify({ error: authErr.message }), {
            status: 500,
            headers: corsHeaders,
          });
        }
        await adminClient
          .from("profiles")
          .update({ email: new_email })
          .eq("user_id", user_id);
        snapshotAfter = { email: new_email };
        result = { success: true, message: "Email changed" };
        break;
      }

      case "FORCE_ACCEPT_PROJECT": {
        const { team_id } = params;
        targetId = team_id;
        const { data: before } = await adminClient
          .from("project_team")
          .select("accepted")
          .eq("id", team_id)
          .single();
        snapshotBefore = before;

        const { error } = await adminClient
          .from("project_team")
          .update({ accepted: true })
          .eq("id", team_id);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: corsHeaders,
          });
        }
        snapshotAfter = { accepted: true };
        result = { success: true, message: "Project team membership accepted" };
        break;
      }

      case "ADD_MEMBER_NO_VERIFICATION": {
        const { organization_id, user_email, role } = params;
        targetId = organization_id;

        // Find user by email
        const { data: profileData } = await adminClient
          .from("profiles")
          .select("user_id")
          .eq("email", user_email)
          .single();
        if (!profileData) {
          return new Response(
            JSON.stringify({ error: "User not found with that email" }),
            { status: 404, headers: corsHeaders }
          );
        }

        const { error } = await adminClient.from("user_org_roles").insert({
          user_id: profileData.user_id,
          organization_id,
          role,
          is_admin: false,
        });
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: corsHeaders,
          });
        }
        snapshotAfter = { user_email, role, organization_id };
        result = { success: true, message: "Member added without verification" };
        break;
      }

      case "REBUILD_PERMISSIONS": {
        const { organization_id } = params;
        targetId = organization_id;

        // Get all members of the org
        const { data: members } = await adminClient
          .from("user_org_roles")
          .select("id")
          .eq("organization_id", organization_id);

        if (members && members.length > 0) {
          const roleIds = members.map((m: any) => m.id);
          // Delete existing permissions
          await adminClient
            .from("member_permissions")
            .delete()
            .in("user_org_role_id", roleIds);

          // Re-create with defaults
          const inserts = roleIds.map((id: string) => ({
            user_org_role_id: id,
            can_approve_invoices: false,
            can_create_pos: false,
            can_create_rfis: false,
            can_create_work_orders: false,
            can_manage_team: false,
            can_submit_time: false,
            can_view_financials: false,
          }));
          await adminClient.from("member_permissions").insert(inserts);
        }

        snapshotAfter = { members_count: members?.length ?? 0 };
        result = { success: true, message: "Permissions rebuilt" };
        break;
      }

      case "UNLOCK_RECORD": {
        const { record_type, record_id } = params;
        targetId = record_id;

        let table = "";
        let statusField = "status";
        let newStatus = "draft";

        switch (record_type) {
          case "po":
            table = "purchase_orders";
            newStatus = "draft";
            break;
          case "invoice":
            table = "invoices";
            newStatus = "draft";
            break;
          case "work_order":
            table = "work_items";
            newStatus = "draft";
            break;
          default:
            return new Response(
              JSON.stringify({ error: "Invalid record_type" }),
              { status: 400, headers: corsHeaders }
            );
        }

        const { data: before } = await adminClient
          .from(table)
          .select(statusField)
          .eq("id", record_id)
          .single();
        snapshotBefore = before;

        const { error } = await adminClient
          .from(table)
          .update({ [statusField]: newStatus })
          .eq("id", record_id);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: corsHeaders,
          });
        }
        snapshotAfter = { [statusField]: newStatus };
        result = { success: true, message: `${record_type} unlocked` };
        break;
      }

      case "CREATE_ORGANIZATION": {
        const { org_name, org_type, org_phone, admin_email } = params;
        if (!org_name || !org_type) {
          return new Response(JSON.stringify({ error: "org_name and org_type are required" }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        // Generate org_code from name (uppercase, no spaces, max 8 chars)
        const orgCode = org_name
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 8) + "-" + Date.now().toString(36).toUpperCase().slice(-4);

        const { data: newOrg, error: orgErr } = await adminClient
          .from("organizations")
          .insert({
            name: org_name,
            type: org_type,
            org_code: orgCode,
            phone: org_phone || null,
            created_by: callerId,
          })
          .select("id")
          .single();

        if (orgErr || !newOrg) {
          return new Response(JSON.stringify({ error: orgErr?.message || "Failed to create org" }), {
            status: 500,
            headers: corsHeaders,
          });
        }

        targetId = newOrg.id;
        snapshotAfter = { org_id: newOrg.id, org_code: orgCode, name: org_name, type: org_type };

        // Optionally add initial admin user
        if (admin_email) {
          const { data: adminProfile } = await adminClient
            .from("profiles")
            .select("user_id")
            .eq("email", admin_email)
            .single();

          if (adminProfile) {
            const roleMap: Record<string, string> = { GC: "GC_PM", TC: "TC_PM", FC: "FC_PM", SUPPLIER: "SUPPLIER" };
            await adminClient.from("user_org_roles").insert({
              user_id: adminProfile.user_id,
              organization_id: newOrg.id,
              role: roleMap[org_type] || "GC_PM",
              is_admin: true,
            });
            snapshotAfter.admin_email = admin_email;
          }
        }

        result = { success: true, message: "Organization created", org_id: newOrg.id };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Not implemented" }), {
          status: 400,
          headers: corsHeaders,
        });
    }

    // Log the action
    await adminClient.rpc("log_support_action", {
      _performed_by: callerId,
      _action_type: action_type,
      _target_type: action_type,
      _target_id: targetId || "unknown",
      _reason: reason,
      _snapshot_before: snapshotBefore ? JSON.stringify(snapshotBefore) : null,
      _snapshot_after: snapshotAfter ? JSON.stringify(snapshotAfter) : null,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("platform-support-action error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});

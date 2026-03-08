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
  CREATE_USER_AND_ADD: "PLATFORM_OWNER",
  DELETE_ORGANIZATION: "PLATFORM_OWNER",
  DELETE_USER: "PLATFORM_OWNER",
  CHANGE_USER_ROLE: "PLATFORM_OWNER",
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
    let logMeta: Record<string, any> = {};

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
        logMeta = { p_action_summary: `Resent invite ${invite_id}` };
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
        logMeta = { p_target_user_id: user_id, p_target_user_email: profileData.email, p_action_summary: `Generated recovery link for ${profileData.email}` };
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
        logMeta = { p_target_user_id: user_id, p_target_user_email: new_email, p_action_summary: `Changed email from ${oldProfile?.email} to ${new_email}` };
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
        logMeta = { p_action_summary: `Force-accepted project team membership ${team_id}` };
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
        logMeta = { p_target_user_id: profileData.user_id, p_target_user_email: user_email, p_target_org_id: organization_id, p_action_summary: `Added ${user_email} to org ${organization_id} as ${role}` };
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
        logMeta = { p_target_org_id: organization_id, p_action_summary: `Rebuilt permissions for ${members?.length ?? 0} members` };
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
        logMeta = { p_action_summary: `Unlocked ${record_type} ${record_id} → ${newStatus}` };
        result = { success: true, message: `${record_type} unlocked` };
        break;
      }

      case "CREATE_ORGANIZATION": {
        const { org_name, org_type, org_phone, org_address, admin_email } = params;
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
            address: org_address || null,
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

        logMeta = { p_target_org_id: newOrg.id, p_target_org_name: org_name, p_action_summary: `Created org "${org_name}" (${org_type})` };
        result = { success: true, message: "Organization created", org_id: newOrg.id };
        break;
      }

      case "CREATE_USER_AND_ADD": {
        const { email, full_name, first_name, last_name, password, organization_id: addOrgId, role: addRole } = params;
        if (!email || !password) {
          return new Response(JSON.stringify({ error: "email and password are required" }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        // Create auth user
        const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (createErr || !newUser?.user) {
          return new Response(JSON.stringify({ error: createErr?.message || "Failed to create user" }), {
            status: 500,
            headers: corsHeaders,
          });
        }

        const newUserId = newUser.user.id;

        // Create profile
        await adminClient.from("profiles").upsert({
          user_id: newUserId,
          email,
          full_name: full_name || `${first_name || ""} ${last_name || ""}`.trim() || null,
          first_name: first_name || null,
          last_name: last_name || null,
        }, { onConflict: 'user_id' });

        targetId = newUserId;
        snapshotAfter = { email, user_id: newUserId };

        // Optionally add to org
        if (addOrgId && addRole) {
          const { error: roleErr } = await adminClient.from("user_org_roles").insert({
            user_id: newUserId,
            organization_id: addOrgId,
            role: addRole,
            is_admin: false,
          });
          if (!roleErr) {
            snapshotAfter.organization_id = addOrgId;
            snapshotAfter.role = addRole;
          }
        }

        logMeta = { p_target_user_id: newUserId, p_target_user_email: email, p_target_org_id: addOrgId || undefined, p_action_summary: `Created user ${email}` + (addOrgId ? ` and added to org as ${addRole}` : "") };
        result = { success: true, message: "User created" + (addOrgId ? " and added to org" : ""), user_id: newUserId };
        break;
      }

      case "DELETE_ORGANIZATION": {
        const { organization_id } = params;
        if (!organization_id) {
          return new Response(JSON.stringify({ error: "organization_id is required" }), {
            status: 400, headers: corsHeaders,
          });
        }
        targetId = organization_id;

        // Snapshot before deletion
        const { data: orgData } = await adminClient
          .from("organizations")
          .select("name, type")
          .eq("id", organization_id)
          .single();
        if (!orgData) {
          return new Response(JSON.stringify({ error: "Organization not found" }), {
            status: 404, headers: corsHeaders,
          });
        }
        snapshotBefore = { name: orgData.name, type: orgData.type };

        // Delete org roles first
        await adminClient
          .from("user_org_roles")
          .delete()
          .eq("organization_id", organization_id);

        // Delete the organization
        const { error: delOrgErr } = await adminClient
          .from("organizations")
          .delete()
          .eq("id", organization_id);
        if (delOrgErr) {
          return new Response(JSON.stringify({ error: delOrgErr.message }), {
            status: 500, headers: corsHeaders,
          });
        }

        logMeta = { p_target_org_id: organization_id, p_target_org_name: orgData.name, p_action_summary: `Deleted org "${orgData.name}"` };
        result = { success: true, message: "Organization deleted" };
        break;
      }

      case "DELETE_USER": {
        const { user_id } = params;
        if (!user_id) {
          return new Response(JSON.stringify({ error: "user_id is required" }), {
            status: 400, headers: corsHeaders,
          });
        }
        targetId = user_id;

        // Snapshot before deletion
        const { data: userProfile } = await adminClient
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", user_id)
          .maybeSingle();
        snapshotBefore = userProfile ? { email: userProfile.email, full_name: userProfile.full_name } : { user_id };

        // Delete auth user — treat "User not found" as success (already gone)
        const { error: delUserErr } = await adminClient.auth.admin.deleteUser(user_id);
        if (delUserErr && !delUserErr.message?.toLowerCase().includes("user not found")) {
          return new Response(JSON.stringify({ error: delUserErr.message }), {
            status: 500, headers: corsHeaders,
          });
        }

        // Explicitly clean up in case FK cascade didn't fire (auth record was already absent)
        await adminClient.from("user_org_roles").delete().eq("user_id", user_id);
        await adminClient.from("profiles").delete().eq("user_id", user_id);

        logMeta = { p_target_user_id: user_id, p_target_user_email: userProfile?.email, p_action_summary: `Deleted user ${userProfile?.email || user_id}` };
        result = { success: true, message: "User deleted" };
        break;
      }

      case "CHANGE_USER_ROLE": {
        const { user_org_role_id, new_role, new_is_admin } = params;
        if (!user_org_role_id || !new_role) {
          return new Response(JSON.stringify({ error: "user_org_role_id and new_role are required" }), {
            status: 400, headers: corsHeaders,
          });
        }
        targetId = user_org_role_id;

        // Snapshot before
        const { data: oldRole, error: fetchErr } = await adminClient
          .from("user_org_roles")
          .select("role, is_admin")
          .eq("id", user_org_role_id)
          .single();
        if (fetchErr || !oldRole) {
          return new Response(JSON.stringify({ error: "Membership not found" }), {
            status: 404, headers: corsHeaders,
          });
        }
        snapshotBefore = { role: oldRole.role, is_admin: oldRole.is_admin };

        const updatePayload: Record<string, any> = { role: new_role };
        if (typeof new_is_admin === "boolean") {
          updatePayload.is_admin = new_is_admin;
        }

        const { error: updateErr } = await adminClient
          .from("user_org_roles")
          .update(updatePayload)
          .eq("id", user_org_role_id);
        if (updateErr) {
          return new Response(JSON.stringify({ error: updateErr.message }), {
            status: 500, headers: corsHeaders,
          });
        }

        snapshotAfter = { role: new_role, is_admin: typeof new_is_admin === "boolean" ? new_is_admin : oldRole.is_admin };
        logMeta = { p_action_summary: `Changed role from ${oldRole.role} to ${new_role}` };
        result = { success: true, message: "User role updated" };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Not implemented" }), {
          status: 400,
          headers: corsHeaders,
        });
    }

    // Log the action using user's client so auth.uid() resolves inside the RPC
    await userClient.rpc("log_support_action", {
      p_action_type: action_type,
      p_reason: reason,
      p_action_summary: logMeta.p_action_summary || `${action_type} on ${targetId}`,
      p_target_user_id: logMeta.p_target_user_id || null,
      p_target_user_email: logMeta.p_target_user_email || null,
      p_target_org_id: logMeta.p_target_org_id || null,
      p_target_org_name: logMeta.p_target_org_name || null,
      p_target_project_id: logMeta.p_target_project_id || null,
      p_target_project_name: logMeta.p_target_project_name || null,
      p_before_snapshot: snapshotBefore ? JSON.stringify(snapshotBefore) : null,
      p_after_snapshot: snapshotAfter ? JSON.stringify(snapshotAfter) : null,
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

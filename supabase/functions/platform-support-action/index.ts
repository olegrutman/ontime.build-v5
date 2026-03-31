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
  EDIT_USER_PROFILE: "PLATFORM_OWNER",
  EDIT_MEMBER_PERMISSIONS: "PLATFORM_OWNER",
  DELETE_PROJECT: "PLATFORM_OWNER",
  DELETE_INVOICE: "PLATFORM_OWNER",
  DELETE_PURCHASE_ORDER: "PLATFORM_OWNER",
  DELETE_WORK_ORDER: "PLATFORM_OWNER",
  DELETE_CHANGE_ORDER: "PLATFORM_OWNER",
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
        const { organization_id, user_email, user_id: directUserId, role, is_admin: assignAdmin } = params;
        targetId = organization_id;

        let resolvedUserId = directUserId;
        let resolvedEmail = user_email;

        if (!resolvedUserId && user_email) {
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
          resolvedUserId = profileData.user_id;
        }

        if (!resolvedUserId) {
          return new Response(
            JSON.stringify({ error: "Must provide user_email or user_id" }),
            { status: 400, headers: corsHeaders }
          );
        }

        if (!resolvedEmail) {
          const { data: pData } = await adminClient.from("profiles").select("email").eq("user_id", resolvedUserId).single();
          resolvedEmail = pData?.email || resolvedUserId;
        }

        const { error } = await adminClient.from("user_org_roles").insert({
          user_id: resolvedUserId,
          organization_id,
          role,
          is_admin: assignAdmin ?? false,
        });
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: corsHeaders,
          });
        }
        snapshotAfter = { user_email: resolvedEmail, role, organization_id, is_admin: assignAdmin ?? false };
        logMeta = { p_target_user_id: resolvedUserId, p_target_user_email: resolvedEmail, p_target_org_id: organization_id, p_action_summary: `Added ${resolvedEmail} to org ${organization_id} as ${role}` };
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

      case "EDIT_USER_PROFILE": {
        const { user_id, fields } = params;
        if (!user_id || !fields || typeof fields !== "object") {
          return new Response(JSON.stringify({ error: "user_id and fields are required" }), {
            status: 400, headers: corsHeaders,
          });
        }
        targetId = user_id;

        const allowedKeys = ["job_title", "phone"];
        const updatePayload: Record<string, any> = {};
        for (const key of allowedKeys) {
          if (key in fields) updatePayload[key] = fields[key];
        }
        if (Object.keys(updatePayload).length === 0) {
          return new Response(JSON.stringify({ error: "No valid fields to update" }), {
            status: 400, headers: corsHeaders,
          });
        }

        const { data: beforeProfile } = await adminClient
          .from("profiles")
          .select("job_title, phone")
          .eq("user_id", user_id)
          .single();
        if (!beforeProfile) {
          return new Response(JSON.stringify({ error: "User not found" }), {
            status: 404, headers: corsHeaders,
          });
        }
        snapshotBefore = beforeProfile;

        const { error: updateErr } = await adminClient
          .from("profiles")
          .update(updatePayload)
          .eq("user_id", user_id);
        if (updateErr) {
          return new Response(JSON.stringify({ error: updateErr.message }), {
            status: 500, headers: corsHeaders,
          });
        }

        snapshotAfter = { ...beforeProfile, ...updatePayload };
        const changedFields = Object.keys(updatePayload).join(", ");
        logMeta = { p_target_user_id: user_id, p_action_summary: `Edited profile fields: ${changedFields}` };
        result = { success: true, message: "Profile updated" };
        break;
      }

      case "EDIT_MEMBER_PERMISSIONS": {
        const { user_org_role_id, permissions: permPayload } = params;
        if (!user_org_role_id || !permPayload || typeof permPayload !== "object") {
          return new Response(JSON.stringify({ error: "user_org_role_id and permissions are required" }), {
            status: 400, headers: corsHeaders,
          });
        }
        targetId = user_org_role_id;

        const permCols = [
          "can_view_financials", "can_approve_invoices", "can_create_work_orders",
          "can_create_pos", "can_submit_time", "can_manage_team", "can_create_rfis",
        ];
        const permUpdate: Record<string, boolean> = {};
        for (const col of permCols) {
          if (col in permPayload && typeof permPayload[col] === "boolean") {
            permUpdate[col] = permPayload[col];
          }
        }
        if (Object.keys(permUpdate).length === 0) {
          return new Response(JSON.stringify({ error: "No valid permission fields" }), {
            status: 400, headers: corsHeaders,
          });
        }

        // Snapshot before
        const { data: existingPerm } = await adminClient
          .from("member_permissions")
          .select("*")
          .eq("user_org_role_id", user_org_role_id)
          .maybeSingle();
        snapshotBefore = existingPerm || { user_org_role_id, exists: false };

        // Upsert
        const { error: upsertErr } = await adminClient
          .from("member_permissions")
          .upsert(
            { user_org_role_id, ...permUpdate },
            { onConflict: "user_org_role_id" }
          );
        if (upsertErr) {
          return new Response(JSON.stringify({ error: upsertErr.message }), {
            status: 500, headers: corsHeaders,
          });
        }

        const { data: afterPerm } = await adminClient
          .from("member_permissions")
          .select("*")
          .eq("user_org_role_id", user_org_role_id)
          .single();
        snapshotAfter = afterPerm;

        const changedPerms = Object.keys(permUpdate).join(", ");
        logMeta = { p_action_summary: `Edited member permissions (${changedPerms}) for role ${user_org_role_id}` };
        result = { success: true, message: "Permissions updated" };
        break;
      }

      case "DELETE_PROJECT": {
        const { project_id } = params;
        if (!project_id) {
          return new Response(JSON.stringify({ error: "project_id is required" }), {
            status: 400, headers: corsHeaders,
          });
        }
        targetId = project_id;

        // Snapshot before deletion
        const { data: projData } = await adminClient
          .from("projects")
          .select("name, status, created_by")
          .eq("id", project_id)
          .single();
        if (!projData) {
          return new Response(JSON.stringify({ error: "Project not found" }), {
            status: 404, headers: corsHeaders,
          });
        }
        snapshotBefore = { name: projData.name, status: projData.status, created_by: projData.created_by };

        // Clean up dependent records that don't cascade on delete
        // 1. Change orders and their dependents
        const { data: coRows } = await adminClient
          .from("change_orders")
          .select("id")
          .eq("project_id", project_id);
        const coIds = (coRows || []).map((c: any) => c.id);
        if (coIds.length > 0) {
          await adminClient.from("co_activity").delete().in("co_id", coIds);
          await adminClient.from("co_nte_log").delete().in("co_id", coIds);
          await adminClient.from("co_equipment_items").delete().in("co_id", coIds);
          await adminClient.from("co_material_items").delete().in("co_id", coIds);
          // co_line_items and co_labor_entries
          const { data: lineRows } = await adminClient.from("co_line_items").select("id").in("co_id", coIds);
          const lineIds = (lineRows || []).map((l: any) => l.id);
          if (lineIds.length > 0) {
            await adminClient.from("co_labor_entries").delete().in("co_line_item_id", lineIds);
          }
          await adminClient.from("co_line_items").delete().in("co_id", coIds);
          await adminClient.from("co_combined_members").delete().in("combined_co_id", coIds);
          await adminClient.from("co_combined_members").delete().in("member_co_id", coIds);
          await adminClient.from("change_order_collaborators").delete().in("co_id", coIds);
          await adminClient.from("change_orders").delete().in("id", coIds);
        }

        // 2. CO activity by project_id (some reference project directly)
        await adminClient.from("co_activity").delete().eq("project_id", project_id);

        // 3. Invoices and line items
        const { data: invRows } = await adminClient.from("invoices").select("id").eq("project_id", project_id);
        const invIds = (invRows || []).map((i: any) => i.id);
        if (invIds.length > 0) {
          await adminClient.from("invoice_line_items").delete().in("invoice_id", invIds);
          await adminClient.from("invoices").delete().in("id", invIds);
        }

        // 4. Purchase orders
        const { data: poRows } = await adminClient.from("purchase_orders").select("id").eq("project_id", project_id);
        const poIds = (poRows || []).map((p: any) => p.id);
        if (poIds.length > 0) {
          await adminClient.from("purchase_order_items").delete().in("po_id", poIds);
          await adminClient.from("purchase_orders").delete().in("id", poIds);
        }

        // 5. SOV items and SOV
        const { data: sovRows } = await adminClient.from("project_sov").select("id").eq("project_id", project_id);
        const sovIds = (sovRows || []).map((s: any) => s.id);
        if (sovIds.length > 0) {
          await adminClient.from("project_sov_items").delete().in("sov_id", sovIds);
          await adminClient.from("project_sov").delete().in("id", sovIds);
        }

        // 6. Other project-level tables
        await adminClient.from("project_contracts").delete().eq("project_id", project_id);
        await adminClient.from("project_team").delete().eq("project_id", project_id);
        await adminClient.from("project_invites").delete().eq("project_id", project_id);
        await adminClient.from("project_participants").delete().eq("project_id", project_id);
        await adminClient.from("project_activity").delete().eq("project_id", project_id);
        await adminClient.from("actual_cost_entries").delete().eq("project_id", project_id);
        await adminClient.from("field_captures").delete().eq("project_id", project_id);
        await adminClient.from("notifications").delete().eq("entity_type", "project").eq("entity_id", project_id);

        // 7. Daily logs
        const { data: logRows } = await adminClient.from("daily_logs").select("id").eq("project_id", project_id);
        const logIds = (logRows || []).map((l: any) => l.id);
        if (logIds.length > 0) {
          await adminClient.from("daily_log_manpower").delete().in("log_id", logIds);
          await adminClient.from("daily_log_delays").delete().in("log_id", logIds);
          await adminClient.from("daily_log_deliveries").delete().in("log_id", logIds);
          await adminClient.from("daily_log_photos").delete().in("log_id", logIds);
          await adminClient.from("daily_logs").delete().in("id", logIds);
        }

        // 8. Contract scope
        await adminClient.from("contract_scope_details").delete().in("selection_id",
          ((await adminClient.from("contract_scope_selections").select("id").eq("project_id", project_id)).data || []).map((s: any) => s.id)
        );
        await adminClient.from("contract_scope_selections").delete().eq("project_id", project_id);
        await adminClient.from("contract_scope_exclusions").delete().eq("project_id", project_id);

        // 9. Estimates
        await adminClient.from("estimate_catalog_mapping").delete().eq("project_id", project_id);
        await adminClient.from("project_designated_suppliers").delete().eq("project_id", project_id);
        const { data: seRows } = await adminClient.from("supplier_estimates").select("id").eq("project_id", project_id);
        const seIds = (seRows || []).map((s: any) => s.id);
        if (seIds.length > 0) {
          await adminClient.from("estimate_line_items").delete().in("estimate_id", seIds);
          await adminClient.from("estimate_pdf_uploads").delete().in("estimate_id", seIds);
          await adminClient.from("supplier_estimates").delete().in("id", seIds);
        }
        const { data: peRows } = await adminClient.from("project_estimates").select("id").eq("project_id", project_id);
        const peIds = (peRows || []).map((p: any) => p.id);
        if (peIds.length > 0) {
          await adminClient.from("estimate_packs").delete().in("estimate_id", peIds);
          await adminClient.from("project_estimates").delete().in("id", peIds);
        }

        // Now delete the project itself
        const { error: delProjErr } = await adminClient
          .from("projects")
          .delete()
          .eq("id", project_id);
        if (delProjErr) {
          return new Response(JSON.stringify({ error: delProjErr.message }), {
            status: 500, headers: corsHeaders,
          });
        }

        logMeta = { p_target_project_id: project_id, p_target_project_name: projData.name, p_action_summary: `Deleted project "${projData.name}"` };
        result = { success: true, message: "Project deleted" };
        break;
      }

      case "DELETE_INVOICE": {
        const { invoice_id } = params;
        if (!invoice_id) {
          return new Response(JSON.stringify({ error: "invoice_id is required" }), {
            status: 400, headers: corsHeaders,
          });
        }
        targetId = invoice_id;

        const { data: invData } = await adminClient
          .from("invoices")
          .select("invoice_number, status, total_amount, project_id")
          .eq("id", invoice_id)
          .single();
        if (!invData) {
          return new Response(JSON.stringify({ error: "Invoice not found" }), {
            status: 404, headers: corsHeaders,
          });
        }
        snapshotBefore = invData;

        // Delete invoice — invoice_line_items cascade
        const { error: delInvErr } = await adminClient
          .from("invoices")
          .delete()
          .eq("id", invoice_id);
        if (delInvErr) {
          return new Response(JSON.stringify({ error: delInvErr.message }), {
            status: 500, headers: corsHeaders,
          });
        }

        logMeta = { p_target_project_id: invData.project_id, p_action_summary: `Deleted invoice "${invData.invoice_number}" (${invData.status}, ${invData.total_amount})` };
        result = { success: true, message: "Invoice deleted" };
        break;
      }

      case "DELETE_PURCHASE_ORDER": {
        const { po_id } = params;
        if (!po_id) {
          return new Response(JSON.stringify({ error: "po_id is required" }), {
            status: 400, headers: corsHeaders,
          });
        }
        targetId = po_id;

        const { data: poData } = await adminClient
          .from("purchase_orders")
          .select("po_number, po_name, status, po_total, project_id")
          .eq("id", po_id)
          .single();
        if (!poData) {
          return new Response(JSON.stringify({ error: "Purchase order not found" }), {
            status: 404, headers: corsHeaders,
          });
        }
        snapshotBefore = poData;

        // Nullify FK references that are NO ACTION
        await adminClient.from("invoices").update({ po_id: null }).eq("po_id", po_id);
        await adminClient.from("change_order_projects").update({ linked_po_id: null }).eq("linked_po_id", po_id);
        await adminClient.from("daily_log_deliveries").update({ po_id: null }).eq("po_id", po_id);

        // Delete PO — po_line_items cascade
        const { error: delPoErr } = await adminClient
          .from("purchase_orders")
          .delete()
          .eq("id", po_id);
        if (delPoErr) {
          return new Response(JSON.stringify({ error: delPoErr.message }), {
            status: 500, headers: corsHeaders,
          });
        }

        logMeta = { p_target_project_id: poData.project_id, p_action_summary: `Deleted PO "${poData.po_number}" (${poData.status}, ${poData.po_total})` };
        result = { success: true, message: "Purchase order deleted" };
        break;
      }

      case "DELETE_WORK_ORDER": {
        const { work_order_id } = params;
        if (!work_order_id) {
          return new Response(JSON.stringify({ error: "work_order_id is required" }), {
            status: 400, headers: corsHeaders,
          });
        }
        targetId = work_order_id;

        const { data: woData } = await adminClient
          .from("change_order_projects")
          .select("title, status, final_price, project_id")
          .eq("id", work_order_id)
          .single();
        if (!woData) {
          return new Response(JSON.stringify({ error: "Work order not found" }), {
            status: 404, headers: corsHeaders,
          });
        }
        snapshotBefore = woData;

        // Nullify FK references with SET NULL or NO ACTION
        await adminClient.from("work_order_line_items").update({ change_order_id: null }).eq("change_order_id", work_order_id);
        await adminClient.from("supplier_estimates").update({ work_order_id: null }).eq("work_order_id", work_order_id);
        await adminClient.from("field_captures").update({ converted_work_order_id: null }).eq("converted_work_order_id", work_order_id);

        // Clean up notifications
        await adminClient.from("notifications").delete().eq("entity_type", "work_order").eq("entity_id", work_order_id);

        // Delete WO — cascades participants, tasks, checklist, tc_labor, fc_hours, materials, equipment, time_cards, actual_cost_entries
        const { error: delWoErr } = await adminClient
          .from("change_order_projects")
          .delete()
          .eq("id", work_order_id);
        if (delWoErr) {
          return new Response(JSON.stringify({ error: delWoErr.message }), {
            status: 500, headers: corsHeaders,
          });
        }

        logMeta = { p_target_project_id: woData.project_id, p_action_summary: `Deleted work order "${woData.title}" (${woData.status})` };
        result = { success: true, message: "Work order deleted" };
        break;
      }

      case "DELETE_CHANGE_ORDER": {
        const { co_id } = params;
        if (!co_id) {
          return new Response(JSON.stringify({ error: "co_id is required" }), {
            status: 400, headers: corsHeaders,
          });
        }
        targetId = co_id;

        const { data: coData } = await adminClient
          .from("change_orders")
          .select("co_number, status, pricing_type, project_id")
          .eq("id", co_id)
          .single();
        if (!coData) {
          return new Response(JSON.stringify({ error: "Change order not found" }), {
            status: 404, headers: corsHeaders,
          });
        }
        snapshotBefore = coData;

        // Nullify self-referencing FKs (NO ACTION)
        await adminClient.from("change_orders").update({ combined_co_id: null }).eq("combined_co_id", co_id);
        await adminClient.from("change_orders").update({ parent_co_id: null }).eq("parent_co_id", co_id);

        // Nullify PO FK reference
        await adminClient.from("purchase_orders").update({ source_change_order_id: null }).eq("source_change_order_id", co_id);

        // Remove CO id from invoices.co_ids array
        const { data: linkedInvoices } = await adminClient
          .from("invoices")
          .select("id, co_ids")
          .contains("co_ids", [co_id]);
        if (linkedInvoices && linkedInvoices.length > 0) {
          for (const inv of linkedInvoices) {
            const updatedIds = (inv.co_ids || []).filter((id: string) => id !== co_id);
            await adminClient.from("invoices").update({ co_ids: updatedIds }).eq("id", inv.id);
          }
        }

        // Clean up notifications
        await adminClient.from("notifications").delete().eq("entity_type", "change_order").eq("entity_id", co_id);

        // Delete CO — child tables cascade
        const { error: delCoErr } = await adminClient
          .from("change_orders")
          .delete()
          .eq("id", co_id);
        if (delCoErr) {
          return new Response(JSON.stringify({ error: delCoErr.message }), {
            status: 500, headers: corsHeaders,
          });
        }

        logMeta = { p_target_project_id: coData.project_id, p_action_summary: `Deleted change order "${coData.co_number}" (${coData.status}, ${coData.pricing_type})` };
        result = { success: true, message: "Change order deleted" };
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

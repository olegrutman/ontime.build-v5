import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check platform role
    const { data: roleData } = await adminClient.rpc("get_platform_role", {
      _user_id: callerId,
    });
    const callerRole = roleData as string | null;

    if (!callerRole || (callerRole !== "PLATFORM_OWNER" && callerRole !== "PLATFORM_ADMIN")) {
      return new Response(
        JSON.stringify({ error: "Only PLATFORM_OWNER and PLATFORM_ADMIN can impersonate" }),
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { operation, target_user_id, reason } = body;

    if (operation === "start") {
      if (!target_user_id || !reason) {
        return new Response(
          JSON.stringify({ error: "target_user_id and reason required" }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Check if target is a platform user — only PLATFORM_OWNER can impersonate other platform users
      const { data: targetPlatformRole } = await adminClient.rpc("get_platform_role", {
        _user_id: target_user_id,
      });
      if (targetPlatformRole && targetPlatformRole !== "NONE" && callerRole !== "PLATFORM_OWNER") {
        return new Response(
          JSON.stringify({ error: "Only PLATFORM_OWNER can impersonate other platform users" }),
          { status: 403, headers: corsHeaders }
        );
      }

      // Get target user email
      const { data: targetUser, error: userErr } =
        await adminClient.auth.admin.getUserById(target_user_id);
      if (userErr || !targetUser?.user) {
        return new Response(JSON.stringify({ error: "Target user not found" }), {
          status: 404,
          headers: corsHeaders,
        });
      }

      // Generate magic link and extract the OTP token hash
      const { data: linkData, error: linkErr } =
        await adminClient.auth.admin.generateLink({
          type: "magiclink",
          email: targetUser.user.email!,
        });
      if (linkErr || !linkData) {
        return new Response(JSON.stringify({ error: linkErr?.message || "Failed to generate link" }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      // Extract the hashed_token from properties and verify it server-side to get session tokens
      const hashedToken = linkData.properties?.hashed_token;
      if (!hashedToken) {
        return new Response(JSON.stringify({ error: "Failed to extract token from magic link" }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      // Verify the OTP server-side using a fresh client to get actual session tokens
      const verifyClient = createClient(supabaseUrl, anonKey);
      const { data: verifyData, error: verifyErr } = await verifyClient.auth.verifyOtp({
        type: "magiclink",
        token_hash: hashedToken,
      });

      if (verifyErr || !verifyData?.session) {
        return new Response(
          JSON.stringify({ error: verifyErr?.message || "Failed to verify magic link token" }),
          { status: 500, headers: corsHeaders }
        );
      }

      // Update last_impersonation_at
      await adminClient
        .from("platform_users")
        .update({ last_impersonation_at: new Date().toISOString() })
        .eq("user_id", callerId);

      // Log the action
      await adminClient.rpc("log_support_action", {
        _performed_by: callerId,
        _action_type: "LOGIN_AS_USER_START",
        _target_type: "USER",
        _target_id: target_user_id,
        _reason: reason,
        _snapshot_before: null,
        _snapshot_after: JSON.stringify({ target_email: targetUser.user.email }),
      });

      return new Response(
        JSON.stringify({
          success: true,
          access_token: verifyData.session.access_token,
          refresh_token: verifyData.session.refresh_token,
          target_email: targetUser.user.email,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (operation === "end") {
      // Log end of impersonation
      await adminClient.rpc("log_support_action", {
        _performed_by: callerId,
        _action_type: "LOGIN_AS_USER_END",
        _target_type: "USER",
        _target_id: target_user_id || "unknown",
        _reason: reason || "Session ended",
        _snapshot_before: null,
        _snapshot_after: null,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid operation" }), {
      status: 400,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("platform-impersonate error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});

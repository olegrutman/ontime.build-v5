// Deletes an unsubmitted draft through the caller's row policies, then removes
// its private media. Reviewers and other project companies cannot delete it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Sign in again before deleting this draft." }, 401);
    const body = await req.json().catch(() => ({}));
    const reportId = typeof body?.report_id === "string" ? body.report_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(reportId)) return json({ error: "A valid report is required." }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) return json({ error: "Draft deletion is not available right now." }, 500);
    const sb = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: authData } = await sb.auth.getUser();
    if (!authData.user) return json({ error: "Sign in again before deleting this draft." }, 401);

    const { data: report, error: reportError } = await sb.from("field_reports")
      .select("id,status,audio_path,crew_org_id")
      .eq("id", reportId)
      .maybeSingle();
    if (reportError) return json({ error: "Could not open this draft." }, 500);
    if (!report) return json({ error: "This draft is not available." }, 404);
    if (report.status !== "draft") return json({ error: "Only an unsubmitted draft can be deleted." }, 409);

    const { data: membership } = await sb.from("user_org_roles")
      .select("id")
      .eq("user_id", authData.user.id)
      .eq("organization_id", report.crew_org_id)
      .maybeSingle();
    if (!membership) return json({ error: "Only the reporting company can delete this draft." }, 403);

    const { data: photos, error: photoError } = await sb.from("field_report_photos")
      .select("storage_path")
      .eq("report_id", reportId);
    if (photoError) return json({ error: "Could not check the draft attachments." }, 500);

    const { data: deleted, error: deleteError } = await sb.from("field_reports")
      .delete()
      .eq("id", reportId)
      .eq("status", "draft")
      .select("id");
    if (deleteError) return json({ error: "Could not delete this draft." }, 500);
    if (!deleted?.length) return json({ error: "Only the reporting company can delete this unsubmitted draft." }, 403);

    const admin = createClient(url, serviceKey);
    const photoPaths = (photos || []).map((photo) => photo.storage_path).filter(Boolean);
    if (photoPaths.length) {
      const { error } = await admin.storage.from("field-report-photos").remove(photoPaths);
      if (error) console.error("draft photo cleanup failed", error.message);
    }
    if (report.audio_path) {
      const { error } = await admin.storage.from("field-audio").remove([report.audio_path]);
      if (error) console.error("draft audio cleanup failed", error.message);
    }
    return json({ ok: true });
  } catch (error) {
    console.error("delete field report failed", error instanceof Error ? error.message : error);
    return json({ error: "Could not delete this draft." }, 500);
  }
});

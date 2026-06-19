// Field PN Voice → Draft CO in GC inbox
// Accepts multipart/form-data (binary audio) OR legacy JSON {audio_base64}.
// Returns 202 immediately with intake_id; transcription, summarization, and
// CO insert run in a background task so the client isn't blocked.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callGateway(apiKey: string, payload: unknown) {
  return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

interface JobInput {
  projectId: string;
  audioBlob: Blob;
  mimeType: string;
  voiceUrl: string | null;
  userId: string;
  orgId: string;
  role: "GC" | "TC" | "FC";
  gcOrgId: string | null;
  intakeId: string;
  apiKey: string;
  supabase: ReturnType<typeof createClient>;
}

async function runBackground(job: JobInput) {
  const { supabase, intakeId, apiKey, audioBlob, mimeType, projectId } = job;
  try {
    await supabase.from("co_ai_intakes").update({ status: "processing" }).eq("id", intakeId);

    const ext = mimeType.includes("mp4")
      ? "mp4"
      : mimeType.includes("mpeg")
      ? "mp3"
      : mimeType.includes("wav")
      ? "wav"
      : "webm";
    const upstream = new FormData();
    upstream.append("model", "openai/gpt-4o-mini-transcribe");
    upstream.append("language", "en");
    upstream.append("file", audioBlob, `recording.${ext}`);

    // Kick STT and project metadata in parallel
    const [transcribeResp, projRowRes, countRes] = await Promise.all([
      fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: upstream,
      }),
      supabase.from("projects").select("name, contract_mode").eq("id", projectId).maybeSingle(),
      supabase
        .from("change_orders")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("entry_source", "field_pn"),
    ]);

    if (!transcribeResp.ok) {
      const t = await transcribeResp.text();
      console.error("transcribe error", transcribeResp.status, t);
      await supabase.from("co_ai_intakes").update({
        status: "failed",
        error_message: transcribeResp.status === 429
          ? "rate_limited"
          : transcribeResp.status === 402
          ? "credits_exhausted"
          : `transcribe_${transcribeResp.status}`,
      }).eq("id", intakeId);
      return;
    }

    const transcribeData = await transcribeResp.json();
    const transcript: string = (transcribeData?.text ?? "").trim();
    if (!transcript) {
      await supabase.from("co_ai_intakes").update({ status: "failed", error_message: "empty_transcript" }).eq("id", intakeId);
      return;
    }

    // Summarization (short, cheap model)
    let problemSummary = transcript.slice(0, 280);
    try {
      const summaryResp = await callGateway(apiKey, {
        model: "google/gemini-2.5-flash-lite",
        temperature: 0.3,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              "You write short Problem Notes for construction change orders. Use 1-3 plain sentences derived strictly from the transcript. Never invent quantities, materials, or causes. No bullets, no markdown.",
          },
          { role: "user", content: `Transcript:\n"""${transcript}"""` },
        ],
      });
      if (summaryResp.ok) {
        const sd = await summaryResp.json();
        const s = (sd?.choices?.[0]?.message?.content ?? "").trim();
        if (s) problemSummary = s.slice(0, 1000);
      }
    } catch (e) {
      console.warn("summary failed, using transcript snippet", e);
    }

    const isTM = (projRowRes.data as any)?.contract_mode === "tm";
    const docType = isTM ? "WO" : "CO";
    const projCode =
      ((projRowRes.data as any)?.name ?? "PRJ")
        .replace(/^(the\s+)/i, "")
        .trim()
        .substring(0, 3)
        .toUpperCase() || "PRJ";
    const seq = (((countRes.count ?? 0) + 1)).toString().padStart(3, "0");
    const coNumber = `${docType}-${projCode}-PN${seq}`;
    const title = (problemSummary.split(/[\.\?\!]/)[0]?.trim() || "Field Problem Note").substring(0, 120);

    const targetOrgId = job.gcOrgId ?? job.orgId;
    const { data: co, error: coErr } = await supabase
      .from("change_orders")
      .insert({
        org_id: targetOrgId,
        project_id: projectId,
        created_by_user_id: job.userId,
        created_by_role: job.role,
        co_number: coNumber,
        title,
        status: "draft",
        document_type: docType,
        reason: "field_discovery",
        reason_note: "Voice Problem Note from field",
        entry_source: "field_pn",
        assigned_to_org_id: job.gcOrgId,
        problem_summary: problemSummary,
        problem_voice_url: job.voiceUrl,
        ai_intake_id: intakeId,
        fc_input_needed: false,
      })
      .select("id, co_number")
      .single();

    if (coErr || !co) {
      console.error("draft CO insert failed", coErr);
      await supabase.from("co_ai_intakes").update({
        status: "failed",
        error_message: `co_insert_${coErr?.code ?? "unknown"}`,
        output_json: { transcript, problemSummary },
      }).eq("id", intakeId);
      return;
    }

    await supabase.from("co_ai_intakes").update({
      status: "succeeded",
      raw_text: transcript,
      output_json: { transcript, problem_summary: problemSummary, co_id: co.id, co_number: co.co_number },
      finalized_co_id: co.id,
    }).eq("id", intakeId);

    await supabase.from("co_activity").insert({
      co_id: co.id,
      project_id: projectId,
      actor_user_id: job.userId,
      actor_role: job.role,
      action: "created",
      detail: `Voice Problem Note submitted to GC inbox`,
    });
  } catch (e) {
    console.error("background job error", e);
    await supabase.from("co_ai_intakes").update({
      status: "failed",
      error_message: `bg_${(e as Error).message ?? "unknown"}`,
    }).eq("id", intakeId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "missing_auth" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "invalid_auth" }, 401);
    const user = userData.user;

    // Parse body — multipart (preferred) or legacy JSON
    const contentType = req.headers.get("content-type") ?? "";
    let projectId = "";
    let mimeType = "";
    let voiceUrl: string | null = null;
    let audioBlob: Blob | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      projectId = String(form.get("project_id") ?? "");
      voiceUrl = (form.get("voice_url") as string) || null;
      const file = form.get("audio") as File | null;
      if (file) {
        audioBlob = file;
        mimeType = file.type || "audio/webm";
      }
    } else {
      const body = await req.json();
      projectId = body?.project_id;
      mimeType = body?.mime_type;
      voiceUrl = body?.voice_url ?? null;
      if (body?.audio_base64) {
        if (body.audio_base64.length > 20_000_000) return json({ error: "audio_too_large" }, 413);
        const binary = Uint8Array.from(atob(body.audio_base64), (c) => c.charCodeAt(0));
        audioBlob = new Blob([binary], { type: mimeType || "audio/webm" });
      }
    }

    if (!projectId || !audioBlob) return json({ error: "bad_request" }, 400);
    if (audioBlob.size > 15_000_000) return json({ error: "audio_too_large" }, 413);

    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve participant
    const { data: userOrgs } = await supabase
      .from("user_org_roles")
      .select("organization_id")
      .eq("user_id", user.id);
    const orgIds = (userOrgs ?? []).map((r) => r.organization_id);
    if (orgIds.length === 0) return json({ error: "no_org" }, 403);

    const { data: membership } = await supabase
      .from("project_participants")
      .select("organization_id, role")
      .eq("project_id", projectId)
      .in("organization_id", orgIds)
      .eq("invite_status", "ACCEPTED")
      .maybeSingle();
    if (!membership?.organization_id) return json({ error: "not_a_participant" }, 403);

    const orgId = membership.organization_id as string;
    const role = (membership.role ?? "FC") as "GC" | "TC" | "FC";

    const { data: gcPart } = await supabase
      .from("project_participants")
      .select("organization_id")
      .eq("project_id", projectId)
      .eq("role", "GC")
      .eq("invite_status", "ACCEPTED")
      .maybeSingle();
    const gcOrgId = gcPart?.organization_id ?? null;

    // Create intake row
    const { data: intake, error: intakeErr } = await supabase
      .from("co_ai_intakes")
      .insert({
        project_id: projectId,
        org_id: orgId,
        created_by: user.id,
        source_kind: "voice",
        voice_url: voiceUrl,
        status: "pending",
        model: "openai/gpt-4o-mini-transcribe",
      })
      .select("id")
      .single();
    if (intakeErr || !intake) {
      console.error("intake insert failed", intakeErr);
      return json({ error: "intake_insert_failed" }, 500);
    }

    // Kick off background processing — return immediately
    // @ts-ignore - EdgeRuntime is provided by Supabase Edge runtime
    EdgeRuntime.waitUntil(
      runBackground({
        projectId,
        audioBlob,
        mimeType,
        voiceUrl,
        userId: user.id,
        orgId,
        role,
        gcOrgId,
        intakeId: intake.id as string,
        apiKey: LOVABLE_API_KEY,
        supabase,
      }),
    );

    return json({ intake_id: intake.id, status: "processing" }, 202);
  } catch (e) {
    console.error("co-voice-pn error", e);
    return json({ error: "server_error", detail: (e as Error).message }, 500);
  }
});

// Step 3: Field PN Voice → Draft CO in GC inbox
// Receives an audio file (base64) from FC/TC, transcribes via Lovable AI (Gemini),
// extracts a short problem summary, and creates a draft change_order with
// entry_source='field_pn' assigned upstream to the GC.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  project_id: string;
  audio_base64: string;
  mime_type: string; // e.g. audio/webm, audio/mp4
  voice_url?: string | null;
  duration_sec?: number | null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callGateway(apiKey: string, payload: unknown) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r;
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

    const body = (await req.json()) as Body;
    if (!body?.project_id || !body?.audio_base64 || !body?.mime_type) {
      return json({ error: "bad_request" }, 400);
    }
    if (body.audio_base64.length > 20_000_000) {
      return json({ error: "audio_too_large" }, 413);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve participant — must be a member of an org on the project
    const { data: userOrgs } = await supabase
      .from("user_org_roles")
      .select("organization_id")
      .eq("user_id", user.id);
    const orgIds = (userOrgs ?? []).map((r) => r.organization_id);
    if (orgIds.length === 0) return json({ error: "no_org" }, 403);

    const { data: membership } = await supabase
      .from("project_participants")
      .select("organization_id, role")
      .eq("project_id", body.project_id)
      .in("organization_id", orgIds)
      .eq("invite_status", "ACCEPTED")
      .maybeSingle();
    if (!membership?.organization_id) return json({ error: "not_a_participant" }, 403);

    const orgId = membership.organization_id as string;
    const role = (membership.role ?? "FC") as "GC" | "TC" | "FC";

    // Find GC participant — destination inbox
    const { data: gcPart } = await supabase
      .from("project_participants")
      .select("organization_id")
      .eq("project_id", body.project_id)
      .eq("role", "GC")
      .eq("invite_status", "ACCEPTED")
      .maybeSingle();
    const gcOrgId = gcPart?.organization_id ?? null;

    // Create intake row up front
    const { data: intake, error: intakeErr } = await supabase
      .from("co_ai_intakes")
      .insert({
        project_id: body.project_id,
        org_id: orgId,
        created_by: user.id,
        source_kind: "voice",
        voice_url: body.voice_url ?? null,
        status: "pending",
        model: "openai/gpt-4o-mini-transcribe",
      })
      .select("id")
      .single();
    if (intakeErr || !intake) {
      console.error("intake insert failed", intakeErr);
      return json({ error: "intake_insert_failed" }, 500);
    }

    // ── 1) Transcribe via dedicated STT endpoint ──
    // Decode base64 to bytes, then forward as multipart to /v1/audio/transcriptions.
    const binary = Uint8Array.from(atob(body.audio_base64), (c) => c.charCodeAt(0));
    const ext = body.mime_type.includes("mp4")
      ? "mp4"
      : body.mime_type.includes("mpeg")
      ? "mp3"
      : body.mime_type.includes("wav")
      ? "wav"
      : "webm";
    const audioBlob = new Blob([binary], { type: body.mime_type });
    const upstream = new FormData();
    upstream.append("model", "openai/gpt-4o-transcribe");
    upstream.append("language", "en");
    upstream.append("file", audioBlob, `recording.${ext}`);

    const transcribeResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
        body: upstream,
      },
    );

    if (transcribeResp.status === 429 || transcribeResp.status === 402) {
      await supabase.from("co_ai_intakes").update({
        status: "failed",
        error_message: transcribeResp.status === 429 ? "rate_limited" : "credits_exhausted",
      }).eq("id", intake.id);
      return json(
        { error: transcribeResp.status === 429 ? "rate_limited" : "credits_exhausted", intake_id: intake.id },
        transcribeResp.status,
      );
    }
    if (!transcribeResp.ok) {
      const t = await transcribeResp.text();
      console.error("transcribe error", transcribeResp.status, t);
      await supabase.from("co_ai_intakes").update({
        status: "failed",
        error_message: `transcribe_${transcribeResp.status}`,
      }).eq("id", intake.id);
      return json({ error: "transcribe_failed", intake_id: intake.id, detail: t.slice(0, 200) }, 200);
    }

    // Endpoint returns SSE if stream=true; we didn't pass stream, so it returns JSON.
    const transcribeData = await transcribeResp.json();
    const transcript: string = (transcribeData?.text ?? "").trim();
    if (!transcript) {
      await supabase.from("co_ai_intakes").update({ status: "failed", error_message: "empty_transcript" }).eq("id", intake.id);
      return json({ error: "empty_transcript", intake_id: intake.id }, 200);
    }


    // ── 2) Summarize into a 1-3 sentence Problem Note ──
    const summaryResp = await callGateway(LOVABLE_API_KEY, {
      model: "google/gemini-2.5-flash",
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

    let problemSummary = transcript.slice(0, 280);
    if (summaryResp.ok) {
      const sd = await summaryResp.json();
      const s = (sd?.choices?.[0]?.message?.content ?? "").trim();
      if (s) problemSummary = s.slice(0, 1000);
    }

    // ── 3) Generate a CO number ──
    const { data: projRow } = await supabase
      .from("projects")
      .select("name, contract_mode")
      .eq("id", body.project_id)
      .maybeSingle();
    const isTM = projRow?.contract_mode === "tm";
    const docType = isTM ? "WO" : "CO";

    const projCode = (projRow?.name ?? "PRJ")
      .replace(/^(the\s+)/i, "")
      .trim()
      .substring(0, 3)
      .toUpperCase() || "PRJ";

    // Count existing field_pn drafts on the project for a sequential number
    const { count } = await supabase
      .from("change_orders")
      .select("id", { count: "exact", head: true })
      .eq("project_id", body.project_id)
      .eq("entry_source", "field_pn");
    const seq = ((count ?? 0) + 1).toString().padStart(3, "0");
    const coNumber = `${docType}-${projCode}-PN${seq}`;

    // ── 4) Title from first sentence ──
    const firstSentence = problemSummary.split(/[\.\?\!]/)[0]?.trim() || "Field Problem Note";
    const title = firstSentence.substring(0, 120);

    // ── 5) Insert draft CO into GC inbox (or current org if no GC) ──
    const targetOrgId = gcOrgId ?? orgId;
    const { data: co, error: coErr } = await supabase
      .from("change_orders")
      .insert({
        org_id: targetOrgId,
        project_id: body.project_id,
        created_by_user_id: user.id,
        created_by_role: role,
        co_number: coNumber,
        title,
        status: "draft",
        document_type: docType,
        reason: "field_discovery",
        reason_note: "Voice Problem Note from field",
        entry_source: "field_pn",
        assigned_to_org_id: gcOrgId, // GC owns the inbox
        problem_summary: problemSummary,
        problem_voice_url: body.voice_url ?? null,
        ai_intake_id: intake.id,
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
      }).eq("id", intake.id);
      return json({ error: "co_insert_failed", intake_id: intake.id, detail: coErr?.message }, 500);
    }

    await supabase.from("co_ai_intakes").update({
      status: "succeeded",
      raw_text: transcript,
      output_json: { transcript, problem_summary: problemSummary, co_id: co.id },
      finalized_co_id: co.id,
    }).eq("id", intake.id);

    await supabase.from("co_activity").insert({
      co_id: co.id,
      project_id: body.project_id,
      actor_user_id: user.id,
      actor_role: role,
      action: "created",
      detail: `Voice Problem Note submitted to GC inbox`,
    });

    return json({
      intake_id: intake.id,
      co_id: co.id,
      co_number: co.co_number,
      transcript,
      problem_summary: problemSummary,
    });
  } catch (e) {
    console.error("co-voice-pn error", e);
    return json({ error: "server_error", detail: (e as Error).message }, 500);
  }
});

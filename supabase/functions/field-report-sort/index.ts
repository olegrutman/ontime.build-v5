// Sorts a crew's field update (typed text and/or voice note) into draft items.
// Returns suggestions only; the crew's own client saves them, so row policies still apply.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { generateResponse, transcribeAudio, GatewayError } from "npm:@lovable.dev/ai-gateway@0.1.13";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const MODEL = "openai/gpt-6-astra";
const KINDS = ["progress", "material", "extra_work", "blocker", "hours"];

const PROMPT = `You sort a construction crew's daily field update into separate items.
Return strict JSON: { "items": [ { "kind": "progress"|"material"|"extra_work"|"blocker"|"hours", "description": string, "location": string|null, "quantity": number|null, "unit": string|null, "material_context": { "application": "exterior"|"interior"|null, "window_count": number|null, "dimension": string|null }|null } ] }
Kinds: progress = work done; material = material needed; extra_work = work outside the original scope; blocker = something stopping the work; hours = crew time worked (quantity = hours).
Rules: use only facts stated; never invent items, quantities or locations. One item per distinct fact. Description <= 120 chars in short, natural jobsite-report English as a foreman would write it; keep the crew's own words when they already read well. Never write commands or to-dos (no "Wait for...", "Install..."). Style by kind: progress = past tense or state ("Trusses 50% installed."); blocker = current state ("Waiting on plumber to finish kitchen rough-in."); material = need statement keeping the stated purpose ("Need 30 pcs 2x4 x 16 ft for truss bracing."); extra_work and hours = past tense ("Crew of 3 worked 8 hrs each (24 hrs)."). Never add facts. For progress, quantity and unit are null (percentages stay in the description). Never include prices, rates or costs, even if mentioned. Max 12 items.
Materials: put the stated material count in quantity and write lumber sizes as 2x4, 2x6 etc.; "N 2x4s by 16" means N pieces of 2x4 at 16 ft (quantity N, unit "pcs"). Hours: quantity = total crew hours (people x hours each), and say both in the description.
Trim requests: material_context.application = exterior only for explicit outside/siding/flashing/brickmold cues, interior only for explicit inside/casing/paint-grade/drywall cues, otherwise null. window_count = only a stated whole number of windows/openings, never an estimated material quantity. dimension = only a stated board dimension such as 1x4 or 5/4x4, otherwise null. If only window count is stated, leave quantity null. Use material_context null for non-trim requests.`;

const FIX = `You correct speech-to-text mistakes in a construction crew's spoken field update.
Fix only words that were clearly misheard construction terms, using the sound and context, e.g. "port"/"poured" -> "framing" when about walls, "by fourths"/"by fours" -> "2x4s", "32x4s" -> "32 2x4s", "two by six" -> "2x6", "trust"/"trusts" -> "trusses", "sheeting" -> "sheathing", "joyce" -> "joists", "header"/"headers", "studs", "plates", "OSB", "LVL", "drywall", "rough-in".
Keep the crew's meaning, numbers and order. Never add facts. If unsure, keep the original word. Return only the corrected text.`;

async function fixTerms(text: string): Promise<string> {
  try {
    const r: any = await generateResponse({ model: MODEL, instructions: FIX, input: [{ role: "user", content: text.slice(0, 6000) }] } as any);
    const out = typeof r?.output_text === "string" ? r.output_text : (r?.output ?? []).flatMap((o: any) => o?.content ?? []).filter((c: any) => c?.type === "output_text").map((c: any) => c.text).join("");
    return out.trim() || text;
  } catch (e) { console.error("term fix failed", e); return text; }
}

async function sortText(text: string): Promise<string> {
  const r: any = await generateResponse({
    model: MODEL,
    instructions: PROMPT,
    input: [{ role: "user", content: "Return JSON.\n\n" + text.slice(0, 8000) }],
    text: { format: { type: "json_object" } },
  } as any);
  if (typeof r?.output_text === "string") return r.output_text;
  const parts = (r?.output ?? []).flatMap((o: any) => o?.content ?? []).filter((c: any) => c?.type === "output_text");
  return parts.map((c: any) => c.text).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const reportId = typeof body?.report_id === "string" ? body.report_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(reportId)) return json({ error: "report_id required" }, 400);

    // Row policies decide whether this user may see the report.
    const { data: rep } = await sb.from("field_reports").select("id,status,raw_text,transcript,audio_path,crew_org_id").eq("id", reportId).maybeSingle();
    if (!rep) return json({ error: "Report not found" }, 404);
    if (rep.status !== "draft") return json({ error: "Report already sent" }, 400);
    const { data: member } = await sb.from("user_org_roles").select("id").eq("user_id", u.user.id).eq("organization_id", rep.crew_org_id).maybeSingle();
    if (!member) return json({ error: "Only the crew can sort its report" }, 403);

        let transcript: string | null = rep.transcript ?? null;
    let audioProblem = "";
    if (rep.audio_path && !transcript) {
      const { data: file, error: dlErr } = await sb.storage.from("field-audio").download(rep.audio_path);
      if (dlErr || !file) { console.error("audio download failed", dlErr); audioProblem = "Could not open the voice note. Try recording again."; }
      else {
        const isMp4 = rep.audio_path.endsWith(".m4a");
        const type = isMp4 ? "audio/mp4" : "audio/webm";
        const audio = new File([await file.arrayBuffer()], isMp4 ? "note.m4a" : "note.webm", { type });
        for (const model of ["google/gemini-3.5-transcribe", "openai/gpt-transcribe"]) {
          try {
            const t: any = await transcribeAudio({ model, file: audio } as any);
            const txt = String(t?.text ?? t?.transcript ?? "").trim();
            console.log("transcribed", model, txt.length);
            if (txt) { transcript = (await fixTerms(txt)).slice(0, 6000); break; }
          } catch (e) { console.error("transcribe failed", model, e instanceof GatewayError ? `${e.code} ${e.message}` : e); }
        }
        if (!transcript) audioProblem = "We couldn't hear any words in the voice note. Try recording again closer to the phone, or type the update.";
      }
    }

    const text = [rep.raw_text, transcript].filter(Boolean).join("\n\n").trim();
    if (!text) return json({ error: audioProblem || "Type an update or record a voice note first" }, 400);

    const raw = await sortText(text);
    const m = raw.match(/\{[\s\S]*\}/);
    const parsed = m ? JSON.parse(m[0]) : { items: [] };
    const items = (Array.isArray(parsed.items) ? parsed.items : []).slice(0, 12)
      .filter((i: any) => KINDS.includes(i?.kind) && typeof i?.description === "string" && i.description.trim())
      .map((i: any) => ({
        kind: i.kind,
        description: i.description.trim().slice(0, 200),
        location: typeof i.location === "string" && i.location.trim() ? i.location.trim().slice(0, 120) : null,
        quantity: typeof i.quantity === "number" && isFinite(i.quantity) ? i.quantity : null,
        unit: typeof i.unit === "string" && i.unit.trim() ? i.unit.trim().slice(0, 20) : null,
        material_context: i.kind === "material" && i.material_context && typeof i.material_context === "object" ? {
          application: ["exterior", "interior"].includes(i.material_context.application) ? i.material_context.application : null,
          window_count: Number.isInteger(i.material_context.window_count) && i.material_context.window_count > 0 && i.material_context.window_count <= 500 ? i.material_context.window_count : null,
          dimension: typeof i.material_context.dimension === "string" && /^(?:5\/4|\d+(?:\.\d+)?)x\d+(?:\.\d+)?$/i.test(i.material_context.dimension.replace(/\s/g, "").replace("×", "x")) ? i.material_context.dimension.replace(/\s/g, "").replace("×", "x").toLowerCase().slice(0, 20) : null,
        } : null,
      }));
    return json({ transcript, items });
  } catch (e: any) {
    if (e instanceof GatewayError) {
      console.error("gateway", e.code, e.httpStatus, e.ids);
      if (e.httpStatus === 429) return json({ error: "AI is busy, try again in a minute" }, 429);
      if (e.httpStatus === 402) return json({ error: "AI credits are used up" }, 402);
    }
    console.error(e);
    return json({ error: "Could not sort the update" }, 500);
  }
});

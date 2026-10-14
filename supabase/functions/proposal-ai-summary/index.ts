import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const Body = z.object({
  co_ids: z.array(z.string().uuid()).min(1).max(50),
  scope_type: z.enum(["labor_only", "labor_materials", "labor_materials_equipment"]),
});

const SCOPE_TEXT: Record<string, string> = {
  labor_only: "Labor only — materials and equipment are supplied by others",
  labor_materials: "Labor and materials",
  labor_materials_equipment: "Labor, materials and equipment",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Sign in required" }, 401);
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await client.auth.getUser();
    if (!u?.user) return json({ error: "Sign in required" }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid request" }, 400);
    const { co_ids, scope_type } = parsed.data;

    // Read through the user's own access rules — only work orders they can see.
    const [{ data: cos = [] }, { data: items = [] }] = await Promise.all([
      client.from("change_orders").select("id, title, problem_summary, reason_note, location_tag").in("id", co_ids),
      client.from("co_line_items").select("co_id, item_name, description, location_tag").in("co_id", co_ids),
    ]);
    if (!cos?.length) return json({ error: "No work orders found" }, 404);

    const facts = co_ids
      .map((id) => cos.find((c: any) => c.id === id))
      .filter(Boolean)
      .map((c: any, i: number) => {
        const scope = (items ?? []).filter((x: any) => x.co_id === c.id)
          .map((x: any) => `  - ${x.item_name}${x.description ? `: ${x.description}` : ""}${x.location_tag ? ` (${x.location_tag})` : ""}`)
          .join("\n");
        return `Work ${i + 1}: ${c.title ?? "Untitled"}\nLocation: ${c.location_tag ?? "not specified"}\nDescription: ${[c.problem_summary, c.reason_note].filter(Boolean).join(" ") || "none"}\nScope items:\n${scope || "  none"}`;
      }).join("\n\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY")!,
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions:
          "You write the overview paragraph of a construction proposal. Write 2-4 plain, professional sentences summarizing the whole package. Use ONLY the facts given. Never invent quantities, dates, materials, prices or details. Never mention costs, rates, margins or work order numbers. State the pricing basis exactly as given. Output only the paragraph.",
        input: `Pricing basis: ${SCOPE_TEXT[scope_type]}\n\n${facts}`,
      }),
    });
    if (!res.ok || !res.body) {
      const msg = res.status === 402 ? "AI credits are used up. Add credits in Settings → Plans & credits."
        : res.status === 429 ? "AI is busy right now. Please try again in a minute."
        : "Could not write the summary.";
      return json({ error: msg }, res.status === 402 || res.status === 429 ? res.status : 502);
    }

    let text = "";
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const d = line.slice(5).trim();
        if (!d || d === "[DONE]") continue;
        try {
          const ev = JSON.parse(d);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
        } catch { /* ignore partial */ }
      }
    }
    text = text.trim();
    if (!text) return json({ error: "The AI returned no summary." }, 502);
    return json({ summary: text });
  } catch (e) {
    console.error(e);
    return json({ error: "Could not write the summary." }, 500);
  }
});

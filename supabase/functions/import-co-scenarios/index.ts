// CO v4 — Scenario library importer
// Accepts pre-parsed JSON from the Platform Scenarios admin page and upserts
// platform-wide scenarios (is_platform=true, org_id=null) into:
//   - co_scenarios
//   - co_scenario_lines
//   - co_scenario_builder_map
// Idempotent on co_scenarios.id — re-running replaces lines + builder map for that id.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ScenarioLineInput {
  line_no: number;
  description: string;
  catalog_slug?: string | null;
  qty_expr?: string | null;
  default_unit?: string | null;
  role_hint?: "GC" | "TC" | "FC" | null;
  notes?: string | null;
}

interface ScenarioBuilderInput {
  step_no: number;
  prompt: string;
  child_scenario_ids?: string[];
}

interface ScenarioInput {
  id: string;
  name: string;
  description?: string | null;
  project_types?: string[];
  problem_tags?: string[];
  system_tag?: string | null;
  default_unit?: string | null;
  default_qty_formula?: string | null;
  sort_order?: number;
  lines?: ScenarioLineInput[];
  builder_map?: ScenarioBuilderInput[];
}

interface Body {
  scenarios: ScenarioInput[];
  /** If true, only validate and return counts; do not write. */
  dry_run?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    // Verify caller is a platform admin
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { data: platformRow } = await userClient
      .from("platform_users")
      .select("platform_role")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    const role = platformRow?.platform_role;
    if (!role || role === "NONE") {
      return json({ error: "Platform admin role required" }, 403);
    }

    const body = (await req.json()) as Body;
    if (!body?.scenarios || !Array.isArray(body.scenarios)) {
      return json({ error: "scenarios array required" }, 400);
    }

    // Validate
    const errors: string[] = [];
    const ids = new Set<string>();
    for (const s of body.scenarios) {
      if (!s.id || !s.name) {
        errors.push(`scenario missing id/name: ${JSON.stringify(s).slice(0, 120)}`);
        continue;
      }
      if (ids.has(s.id)) errors.push(`duplicate id ${s.id}`);
      ids.add(s.id);
    }
    if (errors.length) return json({ error: "validation failed", errors }, 400);

    if (body.dry_run) {
      const lineCount = body.scenarios.reduce((n, s) => n + (s.lines?.length ?? 0), 0);
      const mapCount = body.scenarios.reduce((n, s) => n + (s.builder_map?.length ?? 0), 0);
      return json({
        ok: true,
        dry_run: true,
        scenarios: body.scenarios.length,
        lines: lineCount,
        builder_map_steps: mapCount,
      });
    }

    // Use service role for writes
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Upsert scenarios
    const scenarioRows = body.scenarios.map((s, idx) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? null,
      project_types: s.project_types ?? [],
      problem_tags: s.problem_tags ?? [],
      system_tag: s.system_tag ?? null,
      default_unit: s.default_unit ?? null,
      default_qty_formula: s.default_qty_formula ?? null,
      sort_order: s.sort_order ?? idx,
      is_platform: true,
      org_id: null,
      updated_at: new Date().toISOString(),
    }));

    const { error: scenErr } = await admin
      .from("co_scenarios")
      .upsert(scenarioRows, { onConflict: "id" });
    if (scenErr) return json({ error: "scenario upsert failed", detail: scenErr.message }, 500);

    // Replace lines + builder map per scenario id (idempotent)
    const ids_arr = body.scenarios.map((s) => s.id);
    await admin.from("co_scenario_lines").delete().in("scenario_id", ids_arr);
    await admin.from("co_scenario_builder_map").delete().in("scenario_id", ids_arr);

    const lineRows: any[] = [];
    const mapRows: any[] = [];
    for (const s of body.scenarios) {
      (s.lines ?? []).forEach((l) => {
        lineRows.push({
          scenario_id: s.id,
          line_no: l.line_no,
          description: l.description,
          catalog_slug: l.catalog_slug ?? null,
          qty_expr: l.qty_expr ?? null,
          default_unit: l.default_unit ?? null,
          role_hint: l.role_hint ?? null,
          notes: l.notes ?? null,
        });
      });
      (s.builder_map ?? []).forEach((m) => {
        mapRows.push({
          scenario_id: s.id,
          step_no: m.step_no,
          prompt: m.prompt,
          child_scenario_ids: m.child_scenario_ids ?? [],
        });
      });
    }

    if (lineRows.length) {
      const { error: lineErr } = await admin.from("co_scenario_lines").insert(lineRows);
      if (lineErr) return json({ error: "line insert failed", detail: lineErr.message }, 500);
    }
    if (mapRows.length) {
      const { error: mapErr } = await admin.from("co_scenario_builder_map").insert(mapRows);
      if (mapErr) return json({ error: "builder map insert failed", detail: mapErr.message }, 500);
    }

    return json({
      ok: true,
      scenarios: scenarioRows.length,
      lines: lineRows.length,
      builder_map_steps: mapRows.length,
    });
  } catch (e) {
    return json({ error: "unexpected", detail: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

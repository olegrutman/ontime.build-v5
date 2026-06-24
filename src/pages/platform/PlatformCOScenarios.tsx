import { useState } from "react";
import * as XLSX from "xlsx";
import { PlatformLayout } from "@/components/platform/PlatformLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ParsedScenario {
  id: string;
  name: string;
  description?: string | null;
  project_types: string[];
  problem_tags: string[];
  system_tag?: string | null;
  default_unit?: string | null;
  default_qty_formula?: string | null;
  sort_order: number;
  lines: Array<{
    line_no: number;
    description: string;
    catalog_slug?: string | null;
    qty_expr?: string | null;
    default_unit?: string | null;
    role_hint?: "GC" | "TC" | "FC" | null;
    notes?: string | null;
  }>;
  builder_map: Array<{
    step_no: number;
    prompt: string;
    child_scenario_ids: string[];
  }>;
}

/** Split a delimited string field into a trimmed array. */
function splitList(v: unknown): string[] {
  if (!v) return [];
  return String(v)
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseWorkbook(wb: XLSX.WorkBook): ParsedScenario[] {
  const scenariosSheet =
    wb.Sheets["Scenarios"] ?? wb.Sheets["scenarios"] ?? wb.Sheets[wb.SheetNames[0]];
  const linesSheet = wb.Sheets["Lines"] ?? wb.Sheets["lines"] ?? wb.Sheets["ScenarioLines"];
  const mapSheet =
    wb.Sheets["BuilderMap"] ??
    wb.Sheets["Builder Map"] ??
    wb.Sheets["builder_map"] ??
    wb.Sheets["ScenarioBuilderMap"];

  if (!scenariosSheet) throw new Error("Workbook must have a Scenarios sheet");

  const scenarioRows = XLSX.utils.sheet_to_json<Record<string, any>>(scenariosSheet, { defval: "" });
  const lineRows = linesSheet
    ? XLSX.utils.sheet_to_json<Record<string, any>>(linesSheet, { defval: "" })
    : [];
  const mapRows = mapSheet
    ? XLSX.utils.sheet_to_json<Record<string, any>>(mapSheet, { defval: "" })
    : [];

  const byId = new Map<string, ParsedScenario>();
  scenarioRows.forEach((row, idx) => {
    const id = String(row.id ?? row.ID ?? row.scenario_id ?? "").trim();
    const name = String(row.name ?? row.Name ?? row.title ?? "").trim();
    if (!id || !name) return;
    byId.set(id, {
      id,
      name,
      description: String(row.description ?? "").trim() || null,
      project_types: splitList(row.project_types ?? row.projects ?? row.project_type),
      problem_tags: splitList(row.problem_tags ?? row.problems ?? row.tags),
      system_tag: String(row.system_tag ?? row.system ?? "").trim() || null,
      default_unit: String(row.default_unit ?? row.unit ?? "").trim() || null,
      default_qty_formula: String(row.default_qty_formula ?? row.qty_formula ?? "").trim() || null,
      sort_order: Number(row.sort_order ?? idx) || idx,
      lines: [],
      builder_map: [],
    });
  });

  lineRows.forEach((row, idx) => {
    const sid = String(row.scenario_id ?? row.id ?? "").trim();
    const target = byId.get(sid);
    if (!target) return;
    const role = String(row.role_hint ?? row.role ?? "").trim().toUpperCase();
    target.lines.push({
      line_no: Number(row.line_no ?? row.line ?? target.lines.length + 1) || target.lines.length + 1,
      description: String(row.description ?? row.desc ?? "").trim(),
      catalog_slug: String(row.catalog_slug ?? row.slug ?? "").trim() || null,
      qty_expr: String(row.qty_expr ?? row.qty ?? "").trim() || null,
      default_unit: String(row.default_unit ?? row.unit ?? "").trim() || null,
      role_hint: role === "GC" || role === "TC" || role === "FC" ? (role as any) : null,
      notes: String(row.notes ?? "").trim() || null,
    });
  });

  mapRows.forEach((row) => {
    const sid = String(row.scenario_id ?? "").trim();
    const target = byId.get(sid);
    if (!target) return;
    target.builder_map.push({
      step_no: Number(row.step_no ?? row.step ?? target.builder_map.length + 1) ||
        target.builder_map.length + 1,
      prompt: String(row.prompt ?? row.question ?? "").trim(),
      child_scenario_ids: splitList(row.child_scenario_ids ?? row.children),
    });
  });

  return Array.from(byId.values());
}

export default function PlatformCOScenarios() {
  const { toast } = useToast();
  const [parsed, setParsed] = useState<ParsedScenario[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleFile = async (file: File) => {
    setParseError(null);
    setParsed(null);
    setLastResult(null);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const scenarios = parseWorkbook(wb);
      if (!scenarios.length) throw new Error("No scenarios parsed — check the Scenarios sheet");
      setParsed(scenarios);
    } catch (e) {
      setParseError((e as Error).message);
    }
  };

  const runImport = async (dryRun: boolean) => {
    if (!parsed) return;
    setImporting(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("import-co-scenarios", {
        body: { scenarios: parsed, dry_run: dryRun },
      });
      if (error) throw error;
      setLastResult(data);
      toast({
        title: dryRun ? "Dry run complete" : "Import complete",
        description: `${data.scenarios} scenarios · ${data.lines} lines · ${data.builder_map_steps} builder steps`,
      });
    } catch (e: any) {
      toast({
        title: "Import failed",
        description: e?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const lineTotal = parsed?.reduce((n, s) => n + s.lines.length, 0) ?? 0;
  const mapTotal = parsed?.reduce((n, s) => n + s.builder_map.length, 0) ?? 0;

  return (
    <PlatformLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-heading uppercase tracking-wide">CO Scenario Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload the 106-scenario workbook to seed `co_scenarios`, `co_scenario_lines`, and
            `co_scenario_builder_map`. Idempotent on scenario id — re-running replaces lines + builder
            map for that scenario.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Workbook
            </CardTitle>
            <CardDescription>
              Expected sheets: <code>Scenarios</code>, <code>Lines</code>, <code>BuilderMap</code>.
              Column names are flexible (id/name/project_types/problem_tags/system_tag…). Lists may
              be comma, semicolon, or pipe-separated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {fileName && (
              <div className="text-xs text-muted-foreground">Loaded: {fileName}</div>
            )}
            {parseError && (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {parsed && (
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                <div className="flex gap-4 mt-2">
                  <Badge variant="secondary">{parsed.length} scenarios</Badge>
                  <Badge variant="secondary">{lineTotal} line items</Badge>
                  <Badge variant="secondary">{mapTotal} builder steps</Badge>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg max-h-96 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">System</th>
                      <th className="text-left p-2">Project Types</th>
                      <th className="text-left p-2">Problems</th>
                      <th className="text-right p-2">Lines</th>
                      <th className="text-right p-2">Steps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 200).map((s) => (
                      <tr key={s.id} className="border-t">
                        <td className="p-2 font-mono">{s.id}</td>
                        <td className="p-2">{s.name}</td>
                        <td className="p-2">{s.system_tag ?? "—"}</td>
                        <td className="p-2">{s.project_types.join(", ") || "—"}</td>
                        <td className="p-2">{s.problem_tags.join(", ") || "—"}</td>
                        <td className="p-2 text-right">{s.lines.length}</td>
                        <td className="p-2 text-right">{s.builder_map.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => runImport(true)}
                  disabled={importing}
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Dry run
                </Button>
                <Button onClick={() => runImport(false)} disabled={importing}>
                  {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Import to platform
                </Button>
              </div>

              {lastResult && (
                <div className="flex items-start gap-2 text-sm p-3 rounded-md bg-muted">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                  <pre className="text-xs">{JSON.stringify(lastResult, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PlatformLayout>
  );
}

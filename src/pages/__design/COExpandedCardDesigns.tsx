import { Lock, Pencil, Trash2, Plus, Users, CalendarDays, Clock, ChevronDown, Hammer } from "lucide-react";
import { useState } from "react";

/**
 * TEMPORARY design-preview page — three candidate layouts for the expanded
 * CO/WO scope-item card (TC viewing crew-submitted work). Not production code.
 * Real data from WO-5: Pacifico Builders, 48 hrs (2 workers × 2 days × 12 h/day),
 * $35/hr = $1,680 crew cost; TC billable $3,120 at $65/hr; margin 46.2%.
 */

const ITEM = "Install steel support angles between porch joists";
const CREW = "Pacifico Builders";
const UPSTREAM = "Haley Custom Homes";

function ItemHeader({ children }: { children?: React.ReactNode }) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
      <div className="flex items-start gap-3 px-4 sm:px-5 py-3.5">
        <div className="h-7 w-7 rounded-lg bg-[hsl(var(--navy))] flex items-center justify-center shrink-0 mt-0.5">
          <Hammer className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground leading-snug">{ITEM}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Porch floor framing · 1 item</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-sm font-bold text-foreground">$3,120.00</p>
          <p className="text-[10px] text-muted-foreground">billable</p>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground rotate-180 mt-1.5 shrink-0" />
      </div>
      {children}
    </div>
  );
}

/* ---------- Design A: Two labeled ledgers ---------- */
function DesignA() {
  return (
    <ItemHeader>
      <div className="border-t border-border">
        {/* Crew ledger — read only */}
        <div className="px-4 sm:px-5 pt-3 pb-1 flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <Lock className="h-2.5 w-2.5" /> {CREW}'s work · your private cost
          </span>
          <span className="text-[9px] px-1.5 py-px rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold uppercase tracking-wide">View only</span>
        </div>
        <div className="mx-4 sm:mx-5 mb-3 rounded-xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/10 px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-foreground">Steel angles — submitted time</p>
              <p className="text-[10px] text-muted-foreground">Oct 5, 2026</p>
            </div>
            <p className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">$1,680.00</p>
          </div>
          {/* workload spelled out */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-md bg-card border border-border px-2 py-1"><Users className="h-3 w-3 text-muted-foreground" />2 workers</span>
            <span className="text-muted-foreground">×</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-card border border-border px-2 py-1"><CalendarDays className="h-3 w-3 text-muted-foreground" />2 days</span>
            <span className="text-muted-foreground">×</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-card border border-border px-2 py-1"><Clock className="h-3 w-3 text-muted-foreground" />12 hrs/day</span>
            <span className="text-muted-foreground">=</span>
            <span className="inline-flex items-center rounded-md bg-emerald-100 dark:bg-emerald-950/50 px-2 py-1 font-mono font-bold text-emerald-800 dark:text-emerald-300">48 hrs</span>
            <span className="text-muted-foreground">@ $35/hr</span>
          </div>
        </div>

        {/* TC billing ledger — editable */}
        <div className="px-4 sm:px-5 pt-1 pb-1 flex items-center gap-2 border-t border-border/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-2">Your billing to {UPSTREAM}</span>
        </div>
        <div className="mx-4 sm:mx-5 mb-3 rounded-xl border border-border bg-card px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-foreground">Priced from {CREW} submitted time</p>
              <p className="text-[10px] text-muted-foreground">Oct 24, 2026 · 48 hrs @ $65/hr</p>
            </div>
            <div className="flex items-center gap-1.5">
              <p className="font-mono text-sm font-bold text-foreground">$3,120.00</p>
              <button className="p-1 rounded hover:bg-muted text-muted-foreground"><Pencil className="h-3 w-3" /></button>
              <button className="p-1 rounded hover:bg-destructive/10 text-muted-foreground"><Trash2 className="h-3 w-3" /></button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="border-t border-border bg-muted/20 px-4 sm:px-5 py-2.5 flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <span className="text-muted-foreground">Cost <span className="font-mono font-semibold text-foreground">$1,680.00</span></span>
          <span className="text-muted-foreground">Billable <span className="font-mono font-semibold text-foreground">$3,120.00</span></span>
          <span className="text-muted-foreground">Margin <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">$1,440.00 · 46.2%</span></span>
        </div>
      </div>
    </ItemHeader>
  );
}

/* ---------- Design B: One table, math as a sentence, crew rows locked ---------- */
function DesignB() {
  const [showMath, setShowMath] = useState(true);
  return (
    <ItemHeader>
      <div className="border-t border-border">
        <div className="hidden sm:flex items-center text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium px-4 sm:px-5 py-2 border-b border-border/50">
          <span className="w-20">Date</span>
          <span className="flex-1">Entry</span>
          <span className="w-40 text-right">Hours</span>
          <span className="w-24 text-right">Amount</span>
        </div>

        {/* Crew row — locked, math explained */}
        <div className="border-b border-border/30 bg-emerald-50/40 dark:bg-emerald-950/10">
          <div className="flex items-center text-xs px-4 sm:px-5 py-2.5">
            <span className="w-20 shrink-0 text-muted-foreground">Oct 5</span>
            <span className="flex-1 min-w-0 text-foreground truncate">
              <span className="inline-block mr-1.5 px-1.5 py-px rounded-full text-[9px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 align-middle">{CREW}</span>
              Steel angles
            </span>
            <span className="w-44 text-right font-mono text-muted-foreground">48 hrs</span>
            <span className="w-24 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center justify-end gap-1">
              <Lock className="h-2.5 w-2.5" /> $1,680.00
            </span>
          </div>
          <div className="px-4 sm:px-5 pb-2.5 -mt-0.5">
            <button onClick={() => setShowMath(!showMath)} className="text-[11px] text-primary font-medium hover:underline">
              {showMath ? "Hide" : "How did they get 48 hrs?"}
            </button>
            {showMath && (
              <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">2 workers</span> worked <span className="font-medium text-foreground">2 days</span>, <span className="font-medium text-foreground">12 hours each day</span> → 2 × 2 × 12 = <span className="font-mono font-semibold text-foreground">48 hrs</span> at $35/hr = <span className="font-mono font-semibold text-foreground">$1,680</span>. Crew numbers are locked — only {CREW} can change them.
              </p>
            )}
          </div>
        </div>

        {/* TC billing row — editable */}
        <div className="flex items-center text-xs px-4 sm:px-5 py-2.5 border-b border-border/30">
          <span className="w-20 shrink-0 text-muted-foreground">Oct 24</span>
          <span className="flex-1 min-w-0 text-foreground truncate">Your price to {UPSTREAM}</span>
          <span className="w-40 text-right font-mono text-muted-foreground">48 hrs<br /><span className="text-[10px] text-muted-foreground/70">@ $65/hr</span></span>
          <span className="w-24 text-right font-mono font-semibold text-foreground inline-flex items-center justify-end gap-1">
            $3,120.00
            <button className="p-0.5 rounded hover:bg-muted text-muted-foreground"><Pencil className="h-3 w-3" /></button>
            <button className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground"><Trash2 className="h-3 w-3" /></button>
          </span>
        </div>

        <div className="border-t border-border bg-muted/20 px-4 sm:px-5 py-2.5 flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <span className="text-muted-foreground">Cost <span className="font-mono font-semibold text-foreground">$1,680.00</span></span>
          <span className="text-muted-foreground">Margin <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">$1,440.00 · 46.2%</span></span>
        </div>
      </div>
    </ItemHeader>
  );
}

/* ---------- Design C: Entry cards ---------- */
function DesignC() {
  return (
    <ItemHeader>
      <div className="border-t border-border px-4 sm:px-5 py-3 space-y-2.5 bg-accent/20">
        {/* Crew card */}
        <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/10 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-emerald-700 dark:text-emerald-400" /> {CREW}'s time
              <span className="text-[9px] px-1.5 py-px rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold uppercase tracking-wide">Locked</span>
            </p>
            <p className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">$1,680.00</p>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
            2 workers × 2 days × 12 hrs/day = <span className="font-mono font-semibold text-foreground">48 hrs</span> @ $35/hr
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">Submitted Oct 5, 2026 · only {CREW} can edit these numbers</p>
        </div>

        {/* TC billing card */}
        <div className="rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-foreground">Your price to {UPSTREAM}</p>
            <div className="flex items-center gap-1.5">
              <p className="font-mono text-sm font-bold text-foreground">$3,120.00</p>
              <button className="p-1 rounded hover:bg-muted text-muted-foreground"><Pencil className="h-3 w-3" /></button>
              <button className="p-1 rounded hover:bg-destructive/10 text-muted-foreground"><Trash2 className="h-3 w-3" /></button>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">48 hrs @ $65/hr · entered Oct 24, 2026</p>
        </div>

        {/* Margin strip */}
        <div className="rounded-xl bg-[hsl(var(--navy))] px-3.5 py-2.5 flex items-center justify-between">
          <p className="text-[11px] font-medium text-[hsl(var(--navy-fg))]/80">Margin on this item</p>
          <p className="font-mono text-sm font-bold text-primary">$1,440.00 · 46.2%</p>
        </div>

        <button className="w-full flex items-center gap-2.5 rounded-xl border border-dashed border-border px-3.5 py-2.5 text-xs hover:bg-accent/40 transition-colors">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-foreground">Add pricing entry</p>
            <p className="text-[10px] text-muted-foreground">Log hours, flat rate, or unit pricing</p>
          </div>
        </button>
      </div>
    </ItemHeader>
  );
}

export default function COExpandedCardDesigns() {
  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-10">
        <div>
          <h1 className="text-xl font-bold text-foreground">Expanded item card — 3 designs</h1>
          <p className="text-sm text-muted-foreground mt-1">TC view of crew-submitted work (WO-5 data). Pick A, B, or C.</p>
        </div>
        {[
          { key: "A", label: "A — Two labeled ledgers", desc: "Crew work in its own green read-only box, your billing in a separate editable box. Workload shown as chips: 2 workers × 2 days × 12 hrs/day = 48 hrs.", el: <DesignA /> },
          { key: "B", label: "B — One table, math explained", desc: "Keeps today's compact table, but crew rows are locked (no pencils), and a “How did they get 48 hrs?” link expands into a plain-English sentence.", el: <DesignB /> },
          { key: "C", label: "C — Entry cards", desc: "Each entry becomes its own card: crew card locked and green, your billing card white and editable, navy margin strip at the bottom.", el: <DesignC /> },
        ].map((d) => (
          <section key={d.key}>
            <h2 className="text-sm font-bold text-foreground">{d.label}</h2>
            <p className="text-xs text-muted-foreground mb-3">{d.desc}</p>
            {d.el}
          </section>
        ))}
      </div>
    </div>
  );
}

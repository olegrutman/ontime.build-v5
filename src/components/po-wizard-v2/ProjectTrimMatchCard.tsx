import { BadgeCheck, ChevronRight, ClipboardList, PackageSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MaterialRequestContext, RankedTrimMatch } from "@/lib/trimMaterial";

interface ProjectTrimMatchCardProps {
  request: MaterialRequestContext;
  matches: RankedTrimMatch[];
  loading: boolean;
  onSelect: (match: RankedTrimMatch) => void;
  onBrowse: () => void;
}

export function ProjectTrimMatchCard({ request, matches, loading, onSelect, onBrowse }: ProjectTrimMatchCardProps) {
  const detail = [
    request.hints.kind !== "unknown" ? `${request.hints.kind} trim` : null,
    request.hints.windowCount ? `${request.hints.windowCount} windows` : null,
    request.hints.dimension,
  ].filter(Boolean).join(" · ");

  return (
    <section className="rounded-2xl border border-primary/25 bg-primary/5 p-4" aria-labelledby="project-trim-match-title">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <Badge variant="outline" className="mb-2 border-primary/25 bg-background text-primary">Field material request</Badge>
          <h3 id="project-trim-match-title" className="break-words text-sm font-semibold text-foreground">{request.description}</h3>
          {detail && <p className="mt-1 text-xs capitalize text-muted-foreground">{detail}</p>}
        </div>
      </div>

      <div className="mt-4 border-t border-primary/15 pt-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Matches come only from this project’s approved estimates and earlier orders. Confirm the product before updating the request.
        </p>
      </div>

      {loading ? (
        <div className="mt-3 space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
      ) : matches.length ? (
        <div className="mt-3 space-y-2">
          {matches.map((match, index) => (
            <button
              type="button"
              key={match.catalogItemId}
              onClick={() => onSelect(match)}
              className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <BadgeCheck className={`h-5 w-5 shrink-0 ${index === 0 ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{index === 0 ? "Best project match" : "Project match"}</span>
                  {index === 0 && <Badge variant="secondary" className="text-[10px]">Check & choose</Badge>}
                </span>
                <span className="mt-1 block break-words text-sm text-foreground">{match.name}</span>
                <span className="mt-1 block break-words font-mono text-[11px] text-muted-foreground">{match.sku || "No SKU"}</span>
                <span className="mt-1.5 block break-words text-xs text-muted-foreground">{match.reasons.join(" · ")}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex items-start gap-2 rounded-xl border bg-card p-3">
          <PackageSearch className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            No matching trim in this project’s estimates or earlier orders. Browse the catalog and confirm the size, profile, and length.
          </p>
        </div>
      )}

      <Button type="button" variant="outline" size="sm" className="mt-3 w-full sm:w-auto" onClick={onBrowse}>
        Browse {request.hints.kind === "interior" ? "interior casing" : "exterior trim"} catalog
        <ChevronRight className="h-4 w-4" />
      </Button>
    </section>
  );
}

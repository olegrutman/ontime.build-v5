export type TrimKind = "exterior" | "interior" | "unknown";

export interface TrimRequestHints {
  kind: TrimKind;
  windowCount: number | null;
  dimension: string | null;
  searchQuery: string;
}

export interface MaterialRequestContext {
  description: string;
  hints: TrimRequestHints;
}

export interface StoredMaterialContext {
  application?: "exterior" | "interior" | null;
  window_count?: number | null;
  dimension?: string | null;
}

function makeSearchQuery(kind: TrimKind, dimension: string | null) {
  const kindLabel = kind === "unknown" ? "" : `${kind} `;
  return `${kindLabel}window ${kind === "interior" ? "casing" : "trim"}${dimension ? ` ${dimension}` : ""}`.trim();
}

/** Prefer validated saved AI hints, while retaining manual-note parsing as a fallback. */
export function trimRequestFromMaterialContext(
  description: string,
  stored?: StoredMaterialContext | null,
): MaterialRequestContext | null {
  const parsed = parseTrimRequest(description);
  if (!parsed && !stored) return null;
  const application = stored?.application === "exterior" || stored?.application === "interior"
    ? stored.application
    : null;
  const kind = application ?? parsed?.kind ?? "unknown";
  const savedCount = stored?.window_count;
  const windowCount = Number.isInteger(savedCount) && (savedCount ?? 0) > 0
    ? savedCount!
    : parsed?.windowCount ?? null;
  const savedDimensions = typeof stored?.dimension === "string"
    ? dimensionsIn(stored.dimension)
    : [];
  const dimension = savedDimensions[0] ?? parsed?.dimension ?? null;
  if (!parsed && !application && !windowCount && !dimension) return null;

  return {
    description,
    hints: { kind, windowCount, dimension, searchQuery: makeSearchQuery(kind, dimension) },
  };
}

export interface TrimMatchCandidate {
  catalogItemId: string;
  supplierId: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  source: "project_estimate" | "project_order";
  sourceLabel: string;
  lastOrderedAt?: string | null;
  estimateItemId?: string | null;
  estimateUnitPrice?: number | null;
  estimatePackName?: string | null;
}

export interface RankedTrimMatch extends TrimMatchCandidate {
  score: number;
  reasons: string[];
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const normalizeDimension = (value: string) =>
  value.toLowerCase().replace(/\s+/g, "").replace("×", "x");

const dimensionsIn = (value: string) => {
  const normalized = value.toLowerCase().replace(/×/g, "x");
  return Array.from(
    normalized.matchAll(/(?:5\s*\/\s*4|\d+(?:\.\d+)?)\s*x\s*\d+(?:\.\d+)?/g),
    (match) => normalizeDimension(match[0]),
  );
};

/** Extract only details explicitly present in the field note. */
export function parseTrimRequest(text: string): TrimRequestHints | null {
  const normalized = text.toLowerCase().replace(/×/g, "x");
  if (!/\b(trim|casing|brick\s*mou?ld)\b/.test(normalized)) return null;

  const hasExterior = /\b(exterior|outside|siding|flashing|brick\s*mou?ld)\b/.test(normalized);
  const hasInterior = /\b(interior|inside|casing|paint\s*grade|drywall|sheetrock)\b/.test(normalized);
  const kind: TrimKind = hasExterior === hasInterior
    ? "unknown"
    : hasExterior
      ? "exterior"
      : "interior";

  const countMatch = normalized.match(
    /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:window\s+openings?|windows?)\b/,
  );
  const rawCount = countMatch?.[1];
  const windowCount = rawCount
    ? NUMBER_WORDS[rawCount] ?? Number.parseInt(rawCount, 10)
    : null;
  const dimension = dimensionsIn(normalized)[0] ?? null;

  return {
    kind,
    windowCount: windowCount && windowCount > 0 ? windowCount : null,
    dimension,
    searchQuery: makeSearchQuery(kind, dimension),
  };
}

export function parseBoardLengthFeet(text: string): number | null {
  const normalized = text.toLowerCase().replace(/×/g, "x");
  const dimensional = normalized.match(
    /(?:5\s*\/\s*4|\d+(?:\.\d+)?)\s*x\s*\d+(?:\.\d+)?\s*x\s*(\d+(?:\.\d+)?)\s*(?:ft\.?|feet|')?/,
  );
  const standalone = normalized.match(/\b(\d+(?:\.\d+)?)\s*(?:ft\.?|feet|')\b/);
  const rawLength = dimensional?.[1] ?? standalone?.[1];
  if (!rawLength) return null;
  const length = Number.parseFloat(rawLength);
  return Number.isFinite(length) && length > 0 ? length : null;
}

export function calculateTrimPieces({
  windowCount,
  linearFeetPerWindow = 18,
  boardLengthFeet,
  extraBoards = 1,
}: {
  windowCount: number;
  linearFeetPerWindow?: number;
  boardLengthFeet: number;
  extraBoards?: number;
}) {
  if (!Number.isInteger(windowCount) || windowCount <= 0) {
    throw new Error("Window count must be a positive whole number.");
  }
  if (!Number.isFinite(linearFeetPerWindow) || linearFeetPerWindow <= 0) {
    throw new Error("Linear feet per window must be greater than zero.");
  }
  if (!Number.isFinite(boardLengthFeet) || boardLengthFeet <= 0) {
    throw new Error("Board length must be greater than zero.");
  }
  if (!Number.isInteger(extraBoards) || extraBoards < 0) {
    throw new Error("Extra boards must be a non-negative whole number.");
  }

  const totalLinearFeet = windowCount * linearFeetPerWindow;
  const boardsForMeasuredLength = Math.ceil(totalLinearFeet / boardLengthFeet);
  const pieces = boardsForMeasuredLength + extraBoards;

  return {
    totalLinearFeet,
    boardsForMeasuredLength,
    extraBoards,
    pieces,
    suppliedLinearFeet: pieces * boardLengthFeet,
  };
}

function candidateTrimKind(text: string): TrimKind {
  const hasExterior = /\b(exterior|brick\s*mou?ld|smartside|hardie|miratec|azek)\b/i.test(text);
  const hasInterior = /\b(interior|casing|paint\s*grade)\b/i.test(text);
  return hasExterior === hasInterior
    ? "unknown"
    : hasExterior
      ? "exterior"
      : "interior";
}

/**
 * Rank only supplier-available trim already evidenced by this project.
 * Explicitly conflicting kind or dimensions are rejected, never guessed away.
 */
export function rankProjectTrimMatches(
  candidates: TrimMatchCandidate[],
  hints: TrimRequestHints,
  supplierId: string,
  limit = 5,
): RankedTrimMatch[] {
  const byCatalogItem = new Map<string, RankedTrimMatch>();

  for (const candidate of candidates) {
    if (candidate.supplierId !== supplierId) continue;
    const text = `${candidate.name} ${candidate.description ?? ""} ${candidate.sku ?? ""}`;
    if (!/\b(trim|casing|brick\s*mou?ld)\b/i.test(text)) continue;

    const candidateKind = candidateTrimKind(text);
    if (hints.kind !== "unknown" && candidateKind !== "unknown" && candidateKind !== hints.kind) {
      continue;
    }

    const candidateDimensions = dimensionsIn(text);
    if (
      hints.dimension &&
      candidateDimensions.length > 0 &&
      !candidateDimensions.includes(hints.dimension)
    ) {
      continue;
    }

    const reasons = [candidate.sourceLabel];
    let score = candidate.source === "project_order" ? 60 : 50;
    if (candidateKind === hints.kind && hints.kind !== "unknown") {
      score += 30;
      reasons.push(`${hints.kind === "exterior" ? "Exterior" : "Interior"} trim`);
    }
    if (hints.dimension && candidateDimensions.includes(hints.dimension)) {
      score += 40;
      reasons.push(`${hints.dimension} dimension`);
    }
    if (/\bwindow\b/i.test(text)) {
      score += 10;
      reasons.push("Window application");
    }

    const ranked = { ...candidate, score, reasons };
    const existing = byCatalogItem.get(candidate.catalogItemId);
    if (existing) {
      const preferred = ranked.score > existing.score ||
        (ranked.score === existing.score && (ranked.lastOrderedAt ?? "") > (existing.lastOrderedAt ?? ""))
        ? ranked
        : existing;
      const other = preferred === ranked ? existing : ranked;
      byCatalogItem.set(candidate.catalogItemId, {
        ...preferred,
        sourceLabel: Array.from(new Set([preferred.sourceLabel, other.sourceLabel])).join(" + "),
        reasons: Array.from(new Set([...preferred.reasons, ...other.reasons])),
        estimateItemId: preferred.estimateItemId ?? other.estimateItemId,
        estimateUnitPrice: preferred.estimateUnitPrice ?? other.estimateUnitPrice,
        estimatePackName: preferred.estimatePackName ?? other.estimatePackName,
      });
    } else {
      byCatalogItem.set(candidate.catalogItemId, ranked);
    }
  }

  return Array.from(byCatalogItem.values())
    .sort((a, b) =>
      b.score - a.score ||
      (b.lastOrderedAt ?? "").localeCompare(a.lastOrderedAt ?? "") ||
      a.name.localeCompare(b.name),
    )
    .slice(0, limit);
}

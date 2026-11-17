import { describe, expect, it } from "vitest";
import {
  calculateTrimPieces,
  parseBoardLengthFeet,
  parseTrimRequest,
  rankProjectTrimMatches,
  trimRequestFromMaterialContext,
  type TrimMatchCandidate,
} from "@/lib/trimMaterial";

const candidate = (overrides: Partial<TrimMatchCandidate>): TrimMatchCandidate => ({
  catalogItemId: "trim-1",
  supplierId: "supplier-1",
  name: "LP SmartSide Exterior Trim 1x4x16'",
  source: "project_order",
  sourceLabel: "Earlier project order",
  ...overrides,
});

describe("field trim request parsing", () => {
  it("recognizes five exterior windows and preserves the stated 1x4 dimension", () => {
    expect(parseTrimRequest("Need exterior trim for five windows, 1 x 4")).toEqual({
      kind: "exterior",
      windowCount: 5,
      dimension: "1x4",
      searchQuery: "exterior window trim 1x4",
    });
  });

  it("recognizes interior casing without inventing a window count", () => {
    expect(parseTrimRequest("Interior casing for the windows")).toMatchObject({
      kind: "interior",
      windowCount: null,
      dimension: null,
    });
  });

  it("leaves conflicting exterior and interior evidence unknown", () => {
    expect(parseTrimRequest("Exterior siding and interior casing trim for 2 windows")?.kind).toBe("unknown");
  });

  it("does not treat an unrelated material note as trim", () => {
    expect(parseTrimRequest("Need 20 sheets of drywall")).toBeNull();
  });

  it("uses saved AI context without replacing the original crew description", () => {
    expect(trimRequestFromMaterialContext("Need window trim upstairs", {
      application: "exterior",
      window_count: 5,
      dimension: "1 x 4",
    })).toEqual({
      description: "Need window trim upstairs",
      hints: {
        kind: "exterior",
        windowCount: 5,
        dimension: "1x4",
        searchQuery: "exterior window trim 1x4",
      },
    });
  });

  it("ignores an invalid saved window count instead of ordering fractions of windows", () => {
    expect(trimRequestFromMaterialContext("Need trim for 5 windows", {
      application: "exterior",
      window_count: 2.5,
    })?.hints.windowCount).toBe(5);
  });
});

describe("trim board quantity", () => {
  it("converts five 18 LF windows into seven 16-foot boards including one cut-allowance board", () => {
    expect(calculateTrimPieces({ windowCount: 5, boardLengthFeet: 16 })).toEqual({
      totalLinearFeet: 90,
      boardsForMeasuredLength: 6,
      extraBoards: 1,
      pieces: 7,
      suppliedLinearFeet: 112,
    });
  });

  it("uses the selected product's documented length", () => {
    expect(parseBoardLengthFeet("Primed Trim Board 5/4 x 4 x 12 ft")).toBe(12);
    expect(parseBoardLengthFeet("Primed Trim Board 1x4")).toBeNull();
  });

  it("rejects a zero board length instead of producing an infinite quantity", () => {
    expect(() => calculateTrimPieces({ windowCount: 5, boardLengthFeet: 0 })).toThrow(
      "Board length must be greater than zero.",
    );
  });
});

describe("project trim matching", () => {
  it("ranks an exact estimate dimension above a generic earlier trim order", () => {
    const hints = parseTrimRequest("Exterior trim for 5 windows, 1x4")!;
    const matches = rankProjectTrimMatches([
      candidate({ catalogItemId: "generic", name: "Exterior trim board" }),
      candidate({
        catalogItemId: "exact",
        name: "LP SmartSide Exterior Trim 1x4x16'",
        source: "project_estimate",
        sourceLabel: "Approved project estimate",
      }),
    ], hints, "supplier-1");

    expect(matches.map((match) => match.catalogItemId)).toEqual(["exact", "generic"]);
    expect(matches[0].reasons).toContain("1x4 dimension");
  });

  it("excludes a product from another supplier", () => {
    const hints = parseTrimRequest("Exterior trim for 5 windows, 1x4")!;
    expect(rankProjectTrimMatches([
      candidate({ supplierId: "supplier-2" }),
    ], hints, "supplier-1")).toEqual([]);
  });

  it("excludes an explicitly conflicting 1x6 product when the crew specified 1x4", () => {
    const hints = parseTrimRequest("Exterior trim for 5 windows, 1x4")!;
    expect(rankProjectTrimMatches([
      candidate({ name: "LP SmartSide Exterior Trim 1x6x16'" }),
    ], hints, "supplier-1")).toEqual([]);
  });

  it("does not use an interior casing product for an exterior request", () => {
    const hints = parseTrimRequest("Exterior trim for 5 windows")!;
    expect(rankProjectTrimMatches([
      candidate({ name: "Interior Window Casing 1x4x16'" }),
    ], hints, "supplier-1")).toEqual([]);
  });

  it("deduplicates estimate and order evidence for the same catalog item", () => {
    const hints = parseTrimRequest("Exterior trim for 5 windows, 1x4")!;
    const matches = rankProjectTrimMatches([
      candidate({
        source: "project_estimate",
        sourceLabel: "Approved project estimate",
        estimateItemId: "estimate-line-1",
        estimateUnitPrice: 12.5,
      }),
      candidate({ source: "project_order", sourceLabel: "Earlier project order" }),
    ], hints, "supplier-1");

    expect(matches).toHaveLength(1);
    expect(matches[0].source).toBe("project_order");
    expect(matches[0].estimateItemId).toBe("estimate-line-1");
    expect(matches[0].estimateUnitPrice).toBe(12.5);
    expect(matches[0].sourceLabel).toContain("Approved project estimate");
  });
});

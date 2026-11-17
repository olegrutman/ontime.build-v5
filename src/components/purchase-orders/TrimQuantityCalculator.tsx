import { useMemo, useState } from "react";
import { Calculator, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateTrimPieces } from "@/lib/trimMaterial";

interface TrimQuantityCalculatorProps {
  initialWindowCount: number;
  boardLengthFeet: number;
  onApply: (pieces: number) => void;
  disabled?: boolean;
}

export function TrimQuantityCalculator({
  initialWindowCount,
  boardLengthFeet,
  onApply,
  disabled = false,
}: TrimQuantityCalculatorProps) {
  const [windowCount, setWindowCount] = useState(String(initialWindowCount));
  const [linearFeetPerWindow, setLinearFeetPerWindow] = useState("18");
  const [extraBoards, setExtraBoards] = useState("1");

  const calculation = useMemo(() => {
    const windows = Number(windowCount);
    const feetPerWindow = Number(linearFeetPerWindow);
    const extras = Number(extraBoards);
    if (
      !Number.isInteger(windows) || windows <= 0 ||
      !Number.isFinite(feetPerWindow) || feetPerWindow <= 0 ||
      !Number.isInteger(extras) || extras < 0
    ) {
      return null;
    }
    return calculateTrimPieces({
      windowCount: windows,
      linearFeetPerWindow: feetPerWindow,
      boardLengthFeet,
      extraBoards: extras,
    });
  }, [boardLengthFeet, extraBoards, linearFeetPerWindow, windowCount]);

  return (
    <section className="rounded-xl border border-primary/20 bg-primary/5 p-3" aria-label="Window trim calculator">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Calculator className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Window trim calculator</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Planning help only. Confirm the opening sizes and cut allowance before adding.
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="trim-window-count" className="text-[11px]">Windows</Label>
          <Input
            id="trim-window-count"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={windowCount}
            onChange={(event) => setWindowCount(event.target.value)}
            className="h-9 bg-background px-2"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trim-feet-per-window" className="text-[11px]">LF / window</Label>
          <Input
            id="trim-feet-per-window"
            type="number"
            min="0.1"
            step="0.5"
            inputMode="decimal"
            value={linearFeetPerWindow}
            onChange={(event) => setLinearFeetPerWindow(event.target.value)}
            className="h-9 bg-background px-2"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trim-extra-boards" className="text-[11px]">Extra boards</Label>
          <Input
            id="trim-extra-boards"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={extraBoards}
            onChange={(event) => setExtraBoards(event.target.value)}
            className="h-9 bg-background px-2"
          />
        </div>
      </div>

      {calculation ? (
        <div className="mt-3 flex flex-col gap-2.5 border-t border-primary/15 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Ruler className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="leading-relaxed">
              {calculation.totalLinearFeet} LF ÷ {boardLengthFeet} ft = {calculation.boardsForMeasuredLength} boards
              {calculation.extraBoards > 0 ? ` + ${calculation.extraBoards} for cuts` : ""}
              {" · "}<strong className="font-semibold text-foreground">{calculation.pieces} total pieces</strong>
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            disabled={disabled}
            onClick={() => onApply(calculation.pieces)}
          >
            Use {calculation.pieces} pieces
          </Button>
        </div>
      ) : (
        <p className="mt-3 border-t border-primary/15 pt-3 text-xs text-muted-foreground">
          Enter whole windows and extra boards, plus linear feet greater than zero.
        </p>
      )}
    </section>
  );
}

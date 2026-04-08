

# Fix Duplicate Structural Steel in SOV

## Problem
When both "structural steel" and "basement" are enabled, the SOV generates two steel lines for the basement:
1. `Structural steel — Basement` (from the steel floor loop at line 724)
2. `Structural steel & post bases — Basement` (from the basement block at line 730)

## Fix

### `src/hooks/useSetupWizardV2.ts`

**Remove the dedicated basement steel line (line 730)** since the structural steel floor picker already handles it when the user selects "Basement" as one of the floors. The basement block should only generate floor system, hardware, and wall framing lines — not steel.

If structural steel is **not** in scope but basement **is**, we still need basement hardware and floor system but no steel line at all (steel wasn't selected).

| File | Change |
|------|--------|
| `src/hooks/useSetupWizardV2.ts` | Remove `Structural steel & post bases — Basement` line from the basement block (line 730) |




# Project Info Page — Full Design Audit & Fix

## Issues Found

### Visual Inconsistencies
1. **ProjectInfoCard**: Uses `p-5` padding, `text-base` heading — doesn't have the shared `CardHeader2` treatment other cards get
2. **Framing Scope card**: Has 3-panel layout (200px nav + content + 240px summary) creating massive empty space when scope is complete — the summary panel fills poorly. When editing, the `max-w-[680px]` inner content leaves whitespace on wide screens
3. **Contracts card**: Uses raw `px-5 py-5` padding, no `DT.mono` on currency, `text-sm` for names — different font treatment than SOV
4. **SOV card**: `ContractSOVEditor` renders its own `<Card>` with `CardHeader`/`CardTitle` (large `text-xl` heading, generic card styling) — nested card-in-card since `ProjectSetupFlow` already wraps it in a `<Card>`. Also uses `text-xl font-semibold` heading vs `text-sm font-bold` Barlow Condensed everywhere else
5. **Typography mismatch**: SOV uses default font stack (`text-xl font-semibold`), contracts use default `text-sm font-medium`, info card uses `DT.heading` — no consistency
6. **Currency formatting**: Contracts shows raw `$` prefix + Input, SOV uses `Intl.NumberFormat`, PhaseSOV header uses `toLocaleString()` — three different approaches

### Bugs Found
1. **forwardRef warning**: `CleanupSection` is a function component receiving refs — console error on every render
2. **`onComplete` called on every render**: Line 136 of `FramingScopeWizard.tsx` calls `onComplete()` inside the render body when `scopeComplete && embedded` — this triggers on every re-render, causing unnecessary scroll-to-contracts calls
3. **SOV heading says "Schedule of Values"** (line 862) redundant with the `CardHeader2` that already says "Schedule of Values" — double heading
4. **SOV section labels still say "GC → TC"** and "TC → FC" (lines 872, 881) — abbreviations not full names, inconsistent with the overview page fix

### Active Step Logic
5. **Step 1 is never "done"**: `activeStep` starts at 1 and jumps to 3 when scope is complete — step 1 (Project Info) never shows a green checkmark. It should always be considered complete since the project already exists.

## Plan

### 1. `ProjectSetupFlow.tsx` — Unified card styling + fix step logic
- Fix `activeStep`: start at 2 minimum (project info is always complete) → `scopeComplete ? (contractsComplete ? 4 : 3) : 2`
- Make all four cards use the same `CardHeader2` component (ProjectInfoCard currently doesn't)
- Add `DT.heading` font to all card title text consistently

### 2. `ProjectInfoCard.tsx` — Match card header pattern
- Replace current standalone layout with `CardHeader2`-style header (icon + title + subtitle)
- Keep inline edit functionality
- Use `DT.heading` for name, `DT.mono` for any data values
- Add consistent `px-5 py-5` content padding

### 3. `FramingScopeWizard.tsx` — Fix render-time side effect + empty space
- Move `onComplete()` call from render body into a `useEffect` guarded by `scopeComplete`
- When in embedded complete state, remove the 3-panel layout (no left nav, no right summary) — just show the summary card at full width within the card content area

### 4. `PhaseContracts.tsx` — Match typography
- Add `DT.mono` to currency display and column headers
- Add `DT.heading` to party names
- Use consistent `text-xs` for column headers matching the design system's `sectionHeader` token

### 5. `PhaseSOV.tsx` — Remove redundant heading
- Add `DT.mono` to total contract value display (already partially there)
- Keep clean

### 6. `ContractSOVEditor.tsx` — Remove nested card + fix abbreviations
- Remove the outer `<h2>Schedule of Values</h2>` heading (redundant with parent `CardHeader2`)
- Remove wrapping `<Card>` from `renderSOVCard` — use a `div` with `border rounded-lg` instead to avoid card-in-card nesting
- Replace `"GC → TC Contracts"` / `"TC → FC Contracts"` section labels with org names or descriptive labels like "Upstream Contracts" / "Downstream Contracts"
- Apply `DT.mono` to all currency values
- Apply `DT.heading` to SOV names and section headers

### 7. `CleanupSection.tsx` — Fix forwardRef warning
- Wrap with `React.forwardRef` or ensure parent doesn't pass ref

## Files Modified
| File | Change |
|------|--------|
| `ProjectSetupFlow.tsx` | Fix activeStep logic, consistent card wrapper for step 1 |
| `ProjectInfoCard.tsx` | Redesign to match CardHeader2 pattern with DT fonts |
| `FramingScopeWizard.tsx` | Fix onComplete side effect, clean embedded complete layout |
| `PhaseContracts.tsx` | DT.mono on currency, DT.heading on names, consistent sizing |
| `PhaseSOV.tsx` | Minor font consistency |
| `ContractSOVEditor.tsx` | Remove nested cards, remove duplicate heading, fix GC/TC labels, apply DT fonts |
| `CleanupSection.tsx` | Add forwardRef to fix console warning |


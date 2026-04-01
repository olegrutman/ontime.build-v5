

# CO System Audit: Archive Legacy Files + Bug Report

## Legacy Files to Archive

These files are **no longer imported or used** anywhere in the active codebase. They should be moved to `src/components/change-orders/_archived/`.

| File | Reason |
|------|--------|
| `CODetailPage.tsx` (675 lines) | The old detail page. `CODetail.tsx` page route now uses `CODetailLayout`. The only remaining reference is `index.ts` re-export — nothing actually imports it. |
| `COJobTicket.tsx` | Wrapper that just calls `CODetailLayout` — identical to `CODetail.tsx` page. Never imported anywhere. |
| `COBoard.tsx` | Kanban board view. Exported from `index.ts` but never imported by any page or component. `COListPage` uses card grid, not board columns. |
| `InlineHourEntry.tsx` | Old hour entry form. Replaced by `COHourEntryInline.tsx`. Never imported anywhere. |
| `CORoleBanner.tsx` | Old role explanation banner. Replaced by `COContextualAlert.tsx`. Only referenced in `index.ts` export, never actually used. |
| `GCApprovalCard.tsx` | Standalone GC approval widget. Never imported — approval actions are now in `COStatusActions` + `COHeroBlock`. |

**Files that stay** (still actively used):
- `VisualLocationPicker.tsx` — used by wizard `StepCatalog` and `QuickLogWizard`
- `LaborEntryForm.tsx` — used by `COLineItemRow.tsx` for inline labor entry within scope rows
- `COBoardCard.tsx` — used by `COListPage.tsx` for the card grid

## Bug Report

### Bug 1: `CODetailPage` still exported from `index.ts`
**Severity**: Low (dead code, no runtime impact)
**Location**: `src/components/change-orders/index.ts` line 3
**Issue**: `export { CODetailPage }` still exists but nothing imports it. Causes confusion and increases bundle size.
**Fix**: Remove the export line.

### Bug 2: Comment avatar shows wrong role initial
**Severity**: Medium (cosmetic confusion)
**Location**: `CODetailLayout.tsx` line 233-237
**Issue**: The comment input avatar shows "G" (green circle) for a GC user, but the avatar color is using `role` which is `'GC'` → `charAt(0)` = `'G'`. This is correct for GC, but the green color (`bg-emerald-500`) is mapped to TC, not GC. GC should be blue. The color mapping is: GC = blue, TC = emerald, FC = amber. But `role === 'GC'` triggers `bg-blue-500` which IS correct in the ternary. Actually reviewing again — `role === 'GC' ? 'bg-blue-500'` — this is correct. Not a bug.

### Bug 3: Hero block shows only 2 cards for draft status (GC)
**Severity**: Low (design gap)
**Location**: `COHeroBlock.tsx`
**Issue**: When viewing a draft CO as GC, the hero block shows "Review cost" and "View scope" — only 2 tiles in the 2x2 grid, leaving the bottom row empty. The design spec called for 4 tiles per role/status combo. Missing tiles for: "Add scope item" and "Share with TC" actions.

### Bug 4: KPI strip shows "$0" for materials/equipment even when not applicable
**Severity**: Low (visual noise)
**Location**: `COKPIStrip.tsx`
**Issue**: GC view always shows 4 tiles including Materials ($0) and Equipment ($0) even when CO has `materials_needed = false` and `equipment_needed = false`. These should be conditionally hidden like in `CODetailPage` (the old version handled this).

### Bug 5: `COWhosHere` presence strip renders but may not connect
**Severity**: Low (no visible error, just empty strip)
**Location**: `COWhosHere.tsx`
**Issue**: The presence feature requires Supabase Realtime channels. If the channel subscription fails silently, the strip shows nothing — no indication it's non-functional. Should show a fallback or be hidden when empty.

### Bug 6: No "Add Scope Item" button on new detail layout
**Severity**: High (feature regression)
**Location**: `CODetailLayout.tsx` — Scope & Labor section
**Issue**: The old `CODetailPage` had an `AddScopeItemButton` that opened the `StepCatalog` dialog for adding items. The new `CODetailLayout` does NOT include this button. Users cannot add scope items from the redesigned detail page.

### Bug 7: Hero block action handlers incomplete
**Severity**: Medium (buttons don't work)
**Location**: `CODetailLayout.tsx` lines 94-113
**Issue**: `handleHeroAction` only handles `scroll_scope`, `scroll_materials`, `scroll_pricing`, and `log_hours`. Actions like `approve`, `reject`, `submit`, `share`, `budget_impact` fall through to the default case which just scrolls to top. These actions should trigger the actual approve/reject/submit mutations.

## Implementation Plan

### Step 1: Archive legacy files
Create `src/components/change-orders/_archived/` directory. Move the 6 legacy files there. Update `index.ts` to remove their exports.

### Step 2: Fix Bug 6 — Add "Add Scope Item" button
Port the `AddScopeItemButton` from `CODetailPage.tsx` into `CODetailLayout.tsx`'s Scope & Labor section header.

### Step 3: Fix Bug 7 — Wire hero action handlers
Connect `approve`, `reject`, `submit` actions to the existing `COStatusActions` mutations or trigger the appropriate dialogs.

### Step 4: Fix Bug 4 — Conditional KPI tiles
Make materials/equipment KPI tiles conditional on `co.materials_needed` or `financials.materialsTotal > 0`.

### Files Modified
| File | Change |
|------|--------|
| `src/components/change-orders/_archived/CODetailPage.tsx` | Moved |
| `src/components/change-orders/_archived/COJobTicket.tsx` | Moved |
| `src/components/change-orders/_archived/COBoard.tsx` | Moved |
| `src/components/change-orders/_archived/InlineHourEntry.tsx` | Moved |
| `src/components/change-orders/_archived/CORoleBanner.tsx` | Moved |
| `src/components/change-orders/_archived/GCApprovalCard.tsx` | Moved |
| `src/components/change-orders/index.ts` | Remove archived exports |
| `src/components/change-orders/CODetailLayout.tsx` | Add scope item button, wire hero actions |
| `src/components/change-orders/COKPIStrip.tsx` | Conditional materials/equipment tiles |


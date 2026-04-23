

## Plan — Bugs found in the new Smart Picker

I tested the picker code path end-to-end (read SmartPicker, StepByStepFilter, both call sites, the three RPC signatures, and the live catalog data). Here's what's broken or wrong, in order of severity.

### 🔴 Bug 1 — Recent Items strip uses raw catalog rows, missing required fields
`SmartPicker.tsx:540` casts a `RecentItem` straight into a `CatalogProduct` and hands it to the `QuantityPanel`:
```ts
onClick={() => onRecentSelect(item as unknown as CatalogProduct)}
```
But `recent_catalog_items` RPC returns only 11 columns (no `manufacturer`, `bundle_type`, `bundle_qty`, `wood_species`, `thickness`, `finish`, `color`). `QuantityPanel` reads `product.bundle_type` and `product.bundle_qty` to decide bundle vs each mode (line 33-34). Result: every recent-item quick-add silently treats bundled SKUs (most lumber) as singles → wrong quantity, wrong UOM mode.
**Fix**: After the user taps a recent item, fetch the full catalog row by `id` (mirror the edit-mode effect at line 137-151) before pushing to `quantity` step.

### 🔴 Bug 2 — Header title doesn't refresh while inside picker
`POWizardV2.tsx:404-412` calls `pickerRef.current.getTitle()` inside `getHeaderTitle`, but the `useCallback` dependency array is `[screen]` only. Same in `COMaterialsPanel.tsx:692` (`pickerRef.current?.getTitle() ?? 'Add Material'` is computed once per render of the parent, which doesn't re-render on inner step change). Tapping a category, drilling into a funnel, switching to search → header keeps saying "Add Materials" the whole time.
**Fix**: Lift current step + title into local state in the parent, and have SmartPicker push changes via a new `onStateChange?: (step, title) => void` prop instead of imperative pull.

### 🔴 Bug 3 — Exact-SKU short-circuit fires while user is still typing
`SmartPicker.tsx:198-202` jumps to `quantity` whenever `results[0].score >= 1000` after the 250ms debounce. If a user types a SKU partially that prefix-matches one row exactly along the way (e.g. typing "12345" and "12345" exists as a SKU on its own), the picker yanks them into the quantity panel mid-keystroke. Worse: clearing the search no longer brings them back, because we already mutated `step`.
**Fix**: Only short-circuit on Enter key OR when results are length===1 AND score≥1000 AND the user has stopped typing for ≥600ms; preserve `searchQuery` so back-navigation restores the search.

### 🟡 Bug 4 — Search ignores active category context
The search RPC is called with `p_category: null, p_secondary: null` (line 192-193) regardless of where the user is. If they're already inside "Hardware → Anchors" and type "1/2", they get global results across all categories instead of filtered ones.
**Fix**: Pass `dbCategory` and `selectedSecondary` into the RPC when `step` is `funnel`, `secondary`, or `products`.

### 🟡 Bug 5 — Back from `funnel` at step 0 lands wrong for `structured` categories
In `handleBack` (line 277-280), `funnel` always delegates to `filterRef.current?.goBack()`, which (in StepByStepFilter line 209-219) calls `onBack()` at step 0. `onBack` is wired to `setStep(selectedSecondary ? 'secondary' : 'landing')` (line 451). For a `structured` category like FramingLumber there's no `selectedSecondary`, so it correctly returns to landing — but `selectedCategoryKey` is never cleared, leaving stale state if the user immediately re-opens search.
**Fix**: Clear `selectedCategoryKey` and `selectedSecondary` when returning to landing.

### 🟡 Bug 6 — `Other` category (142 items in DB) is invisible
Live data shows the `Other` DB category has 142 items for the system supplier — second-largest after Hardware. `CATEGORY_FUNNELS` has no `OTHER` entry, so `categoryCards` (filter `count > 0`) silently drops it. Users can't browse to cedar/hemlock.
**Fix**: Add an `OTHER` entry to `categoryFunnels.ts` (`pattern: 'search'`, displayName "Other Lumber", icon 📦) — matches what the legacy picker exposes.

### 🟡 Bug 7 — Recent strip is hidden whenever facets fail to load
The combined `Promise.all` (line 159-167) means a slow / failing `catalog_facets` call also throws away the `recent` data inside the same `.then`. The `.catch` clears nothing but `recent` never gets set if `facetsRes` errors first inside the destructuring.
**Fix**: Settle them independently (`Promise.allSettled`) so a recent-items hit still renders even when the facets call fails.

### 🟢 Minor 8 — Loading state for secondary list is wrong
`SecondaryCategoryList` at line 439 receives `loading={landingLoading}`, but landing has long since finished by the time the user enters a hybrid category. It should be `false` (data is already in `secondaryList` memo) — or better, show "No subcategories" only after we know facets loaded.

### 🟢 Minor 9 — `productCount` in StepByStepFilter footer doesn't account for `fixedSequence`
When `fixedSequence` is supplied, the discovery scan (which set `productCount` as a side-effect through `availableValues`) is skipped, so the "Skip — View All N Products" button shows whatever count the first filter step calculates rather than the unfiltered category total. Cosmetic but misleading.

### Files to change

| Action | File | Why |
|---|---|---|
| Edit | `src/components/po-wizard-v2/SmartPicker.tsx` | Fixes 1, 3, 4, 5, 7, 8 |
| Edit | `src/components/po-wizard-v2/POWizardV2.tsx` | Fix 2 (lift picker title to state) |
| Edit | `src/components/change-orders/COMaterialsPanel.tsx` | Fix 2 (same lift) |
| Edit | `src/lib/categoryFunnels.ts` | Fix 6 (add OTHER) |
| Edit | `src/components/po-wizard-v2/StepByStepFilter.tsx` | Fix 9 (preload count when `fixedSequence` is set) |

### Verification after fixes
- Tap a recently-ordered bundled SKU → quantity panel opens in **Bundle** mode with correct bundle qty.
- Drill into Hardware, type "1/2" — results stay scoped to Hardware.
- Type a real SKU character-by-character — picker waits for you to finish or press Enter before jumping.
- Header title updates as you move from "Add Materials" → "Hardware" → "Anchors" → "Add to PO".
- "Other Lumber" (cedar/hemlock) appears on the landing grid.
- Back button from a `structured` funnel returns to landing with category selection cleared.


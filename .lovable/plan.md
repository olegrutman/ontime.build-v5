
## What I found (why desktop still doesn’t scroll)

On desktop, the Product Picker renders inside a **Radix Dialog**:

- `ProductPicker.tsx` uses `<DialogContent className="... max-h-[85vh] overflow-hidden ...">`
- The shared `DialogContent` component (`src/components/ui/dialog.tsx`) renders with `display: grid` by default and **does not set an explicit height** (only `max-w-*` etc.)
- Inside the dialog, the picker content expects a real height so its children can do `h-full` / `flex-1 min-h-0` and then scroll.

On desktop, because the dialog container is only `max-height` constrained (not an explicit height) and uses grid layout, **the inner “Products” list never gets a concrete height**, so `overflow-y-auto` has nothing to “overflow” within. Result: “No scroll at all” on the Products screen.

This matches your report: desktop + Products screen + no scrolling despite wheel/touchpad input.

## Goal

Make the desktop Product Picker dialog provide a stable height + flex column layout so each step (Categories, Secondary, Filters, Products, Quantity) can reliably scroll inside its own scroll container.

---

## Implementation approach (desktop-specific, minimal changes)

### 1) Fix the desktop Dialog container sizing for ProductPicker

**File:** `src/components/po-wizard-v2/ProductPicker.tsx`

Change the desktop `<DialogContent />` className so that:

- The dialog becomes a **flex column** container (overrides the base `grid`)
- The dialog has an **explicit height** (not just `max-h`)
- Children can safely use `h-full` and `min-h-0`

**Proposed className update (conceptual):**
- Add: `flex flex-col h-[85vh] min-h-0`
- Keep: `max-w-lg p-0 gap-0 overflow-hidden`

Why:
- `h-[85vh]` gives a real height so internal flex children can compute `flex-1` correctly.
- `flex flex-col` ensures the picker’s header + content area behave predictably.
- `min-h-0` is the flexbox “allow children to shrink” requirement for overflow containers.

### 2) Ensure the picker’s internal root also allows shrinking

**File:** `src/components/po-wizard-v2/ProductPicker.tsx`

Inside `content`, the root is currently:
```tsx
<div className="flex flex-col h-full">
```

Update to:
- `flex flex-col h-full min-h-0`

Why:
- This prevents the header/content layout from forcing “auto min height” behavior that can block scrolling.

### 3) Keep “single scroll owner” behavior on each step

You already added `min-h-0` and/or `overflow-y-auto` in:
- `ProductList.tsx` (products list scroll area)
- `StepByStepFilter.tsx` (options scroll area)
- `CategoryGrid.tsx`, `SecondaryCategoryList.tsx`, `QuantityPanel.tsx` (wrappers)

After step (1) & (2), these should begin working consistently on desktop because they’ll finally have a measurable height to overflow within.

---

## Verification checklist (desktop)

On desktop viewport (e.g., 1366×768 and 1920×1080), test the Product Picker in this order:

1. Open a project → Purchase Orders tab → open PO Wizard v2 → go to Items → “Add item” (opens Product Picker).
2. **Categories screen:** if there are many categories, wheel/trackpad scroll works.
3. **Secondary screen:** wheel/trackpad scroll works.
4. **Filters screen:** wheel/trackpad scroll works and you can reach the bottom options.
5. **Products screen (your reported failure):**
   - Ensure there are enough products (or search results) to exceed the viewport.
   - Confirm wheel/trackpad scroll moves the list.
   - Confirm the dialog remains fixed and the background page does not scroll.
6. **Quantity screen:** confirm notes/controls can be scrolled to bottom.

Success criteria:
- You can reach and click the last visible product card and the last controls in Quantity screen without resizing the window.
- No “dead scrolling” (wheel events doing nothing) on Products screen.

---

## If it still fails after this (fallback plan)

If the dialog still captures wheel events incorrectly, we’ll add an explicit scroll container inside the dialog and route all steps through it:

- Add a single `div` wrapper in ProductPicker: `flex-1 min-h-0 overflow-y-auto`
- Remove per-step `overflow-y-auto` (except where necessary), so there is only one scroll surface.

But we should try the height + flex override first, because it’s the cleanest fix and aligns with your existing per-step scroll design.

---

## Files that will be changed

- `src/components/po-wizard-v2/ProductPicker.tsx` (desktop DialogContent sizing + internal `min-h-0`)

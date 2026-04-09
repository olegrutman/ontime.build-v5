

# Fix Side-by-Side SOVs — Bugs Found

## Root Causes

### Bug 1: AppLayout constrains width to max-w-7xl (1280px)
`src/components/app-shell/AppShell.tsx` line 81 wraps content in `max-w-7xl mx-auto` (1280px max). The `CreateProjectNew` page does NOT pass `fullWidth` to `AppLayout`, so the entire wizard is capped at 1280px. After the sidebar (col-span-2 = ~213px), card padding (48px), and the questions/SOV split, each SOV panel gets only ~230px — far too narrow to be useful.

**Fix:** Pass `fullWidth` to `AppLayout` in `CreateProjectNew.tsx`.

### Bug 2: SOV containers have no defined height
`SOVLivePreview` uses `h-full flex flex-col`, but its parent containers never define a height. The `flex-1 overflow-y-auto` scroll area inside the preview collapses to zero height because there's no height constraint from above.

**Fix:** Give the SOV wrapper divs in `ScopeQuestionsPanel` an explicit `min-h-[400px]` and `h-[calc(100vh-280px)]` so the previews have room to render.

### Bug 3: Single SOV has no wrapper when showDualSov is false
Line 106: when `showDualSov` is false, the className is empty string `''`. The single SOV div has no layout structure — it just floats as a bare div. This inconsistency means the single SOV might not fill the available space properly.

**Fix:** Always wrap SOVs in a consistent grid container.

## Changes

| File | Change |
|------|--------|
| `src/pages/CreateProjectNew.tsx` | Add `fullWidth` prop to `AppLayout` |
| `src/components/setup-wizard-v2/ScopeQuestionsPanel.tsx` | Fix SOV container: always use grid wrapper, add explicit height constraints, ensure dual SOVs each get proper height |




# Make Wizard Full-Screen + Show SOV Line Items

## Changes

### 1. `src/pages/CreateProjectNew.tsx` — Full-screen layout
- Remove `max-w-5xl` container constraint — let the wizard use the full viewport width
- Change main content from `col-span-9` to use all remaining space
- On the **Scope step (step 3)**, hide the Card wrapper and let `ScopeQuestionsPanel` fill the full width so SOVs have room to breathe side-by-side
- Keep the progress sidebar narrow (col-span-2 instead of col-span-3) to give more room

### 2. `src/components/setup-wizard-v2/ScopeQuestionsPanel.tsx` — Fix dual SOV layout
- Change the right-side SOV container from `xl:grid-cols-2` to `grid-cols-2` (always side-by-side when dual) since `xl` never triggers inside a half-width panel
- Use `min-h-[calc(100vh-200px)]` to fill available height
- Remove `max-h-[600px]` on the questions panel — use `flex-1 overflow-y-auto` instead

### 3. `src/components/setup-wizard-v2/SOVLivePreview.tsx` — Already shows line items
The SOV preview already renders individual line items with line number, description, percentage, and dollar amount. No changes needed here — the items just need more screen space to be visible, which the full-screen layout provides.

| File | Change |
|------|--------|
| `src/pages/CreateProjectNew.tsx` | Remove `max-w-5xl`, widen layout, slim sidebar to col-span-2 |
| `src/components/setup-wizard-v2/ScopeQuestionsPanel.tsx` | Fix dual SOV grid breakpoint; remove height cap; fill viewport |


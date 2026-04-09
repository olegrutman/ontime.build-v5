

# Side-by-Side Dual SOVs — 3-Column Layout

## Problem
The current layout splits the scope step into 2 columns (questions | SOVs), then tries to fit two SOVs stacked vertically in the right half. The second SOV gets pushed below the fold or squeezed. The user wants both SOVs **side by side**, each in its own column.

## Solution
Change the scope step to a **3-column layout** when TC has dual contracts:

```text
┌──────────────┬──────────────────┬──────────────────┐
│  Questions   │   GC → TC SOV    │   TC → FC SOV    │
│  (col 1)     │   (col 2)        │   (col 3)        │
│  scrollable  │   scrollable     │   scrollable     │
└──────────────┴──────────────────┴──────────────────┘
```

For non-TC users (single SOV), keep the current 2-column layout.

## Changes

### `src/components/setup-wizard-v2/ScopeQuestionsPanel.tsx`
- Change outer grid from `lg:grid-cols-2` to conditionally use `lg:grid-cols-3` when `showDualSov` is true
- Remove the flex-col stacking wrapper — each SOV gets its own grid column
- Both SOV cards use full height `h-[calc(100vh-280px)]` since they no longer share vertical space
- Each card: border, header label, scrollable `SOVLivePreview` inside

| File | Change |
|------|--------|
| `src/components/setup-wizard-v2/ScopeQuestionsPanel.tsx` | 3-column grid for dual SOV; each SOV in its own column, full height, side by side |


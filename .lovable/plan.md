

# Framing Scope Summary Card with Expandable Full Scope

## What Changes

When the framing scope is marked complete (in the embedded setup flow), instead of showing just a green "Complete" banner, display a **summary card** showing key scope highlights. Clicking it expands to show the full `ScopeDocument`.

## Current Behavior
Lines 134-147 of `FramingScopeWizard.tsx`: when `scopeComplete && embedded`, it shows a minimal green banner + "Edit scope" button. The rich `ScopeSummaryPanel` and `ScopeDocument` are not shown.

## New Behavior

```text
┌─────────────────────────────────────────────┐
│  ✓ Framing Scope Complete                   │
│                                             │
│  FRAMING METHOD          BUILDING FEATURES  │
│  ✓ Stick framing         ✓ Wood stairs      │
│  ✓ Labor only            ✓ Balconies        │
│                                             │
│  EXTERIOR SKIN           OPENINGS           │
│  ✓ Wall sheathing        ✓ Windows: GFCI    │
│  ✓ Roof sheathing                           │
│                                             │
│  [View Full Scope]  [Edit Scope]            │
└─────────────────────────────────────────────┘

 ▼ Clicking "View Full Scope" expands:

┌─────────────────────────────────────────────┐
│  Division 06100 — Rough Carpentry Scope...  │
│  (full ScopeDocument component)             │
│  [Collapse]  [Edit Scope]                   │
└─────────────────────────────────────────────┘
```

## Implementation

### File: `src/components/framing-scope/FramingScopeWizard.tsx`

Replace the minimal completed-state block (lines 134-147) with:
- A scope summary card using `ScopeSummaryPanel` rendered in a 2-column grid layout
- Include/exclude count badges
- "View Full Scope" button that toggles showing `ScopeDocument` below
- "Edit Scope" button (existing behavior)
- Use `useState` for the expand/collapse toggle

### File: `src/components/framing-scope/ScopeSummaryPanel.tsx`

Add an optional `compact` prop that renders summary groups in a 2-column CSS grid instead of a single column, for better use of horizontal space in the card layout.

## Files Modified
- `FramingScopeWizard.tsx` — replace embedded complete state with summary card + expandable full scope
- `ScopeSummaryPanel.tsx` — add `compact` grid layout prop

## Files NOT Changed
- `ScopeDocument.tsx` — reused as-is
- Types, hooks, database — untouched




# Redesign: Prominent Labor/Pricing Entry Per Line Item

## Problem
The labor entry form is buried — users must expand a line item, then click a small "Log hours" button, which reveals a cramped form inline. The most important action on the CO detail page feels hidden and secondary.

## Design Approach

Instead of hiding the entry form behind expand → click → form, make each line item show its entry interface **directly and always visible** when the user can add labor. The form becomes part of the line item card itself.

### New UX Flow

```text
┌─────────────────────────────────────────────────┐
│ Foundation Repair            [$1,200.00] [▼]    │
│ CSI 03 · Concrete · Scope change                │
│                                                 │
│ ┌─ ENTER PRICING ─────────────────────────────┐ │
│ │  [Hourly ⊙] [Lump Sum ○]                   │ │
│ │                                             │ │
│ │  [2h] [4h] [8h] [10h] [__custom__]         │ │
│ │                                             │ │
│ │  Rate: [$75/hr]  Date: [Today, Apr 3]       │ │
│ │  Notes: [________________________]          │ │
│ │                                             │ │
│ │  Total: $600.00          [✓ Save Entry]     │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ▾ 3 entries logged — $2,400.00                  │
└─────────────────────────────────────────────────┘
```

## Changes

### 1. `COLineItemRow.tsx` — Always-visible entry section
- Remove the hidden expand-to-reveal pattern for the entry form
- When `canAddLabor` is true, render the `LaborEntryForm` directly below the item header — no toggle button needed
- Move existing entries into a collapsible "history" section below the form (collapsed by default, showing count + total)
- The form stays open; after saving, it resets but remains visible for the next entry
- Keep the "Actual cost" button as a secondary action

### 2. `LaborEntryForm.tsx` — Visual redesign for prominence
- Remove `onCancel` prop requirement — form is always visible, no cancel needed
- Add a prominent colored header bar: "ENTER PRICING" with role-colored left border
- Make quick-hour pills larger (min-h-[48px], bigger text) and always visible for all roles (not just FC)
- Increase input sizes from `h-8` to `h-10` for better touch targets
- Make the mode toggle (Hourly/Lump Sum) more prominent — larger pills with icons
- Add a prominent live total bar with larger font and colored background
- Make the Save button full-width, taller (h-12), with a strong green background
- Date defaults to today with a friendly label ("Today, Apr 3") instead of raw date input
- Remove the cramped grid layout — stack fields vertically for clarity

### 3. `CODetailLayout.tsx` — Remove FC-only hour entry overlay
- Remove the `showHourEntry` state and `COHourEntryInline` usage — the inline form per line item replaces this
- Remove the "log_hours" hero action since entry is now always accessible per item
- Keep `COHourEntryInline.tsx` file but it becomes unused (can be cleaned up later)

### Files Modified
| File | Change |
|------|--------|
| `COLineItemRow.tsx` | Always-visible form when `canAddLabor`, collapsible entry history |
| `LaborEntryForm.tsx` | Bigger inputs, prominent header, full-width save, no cancel requirement |
| `CODetailLayout.tsx` | Remove `showHourEntry` state and `COHourEntryInline` usage |


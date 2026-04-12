

# Redesign Scope & Labor Section for Better UX

## Goal
Make Scope & Labor the clear focal point of the Work Order detail page with intuitive visual hierarchy and obvious next actions.

## Changes

### 1. `CODetailLayout.tsx` — Elevate the section visually
- Add a thicker left accent border (4px primary color) to the Scope & Labor card
- Use a subtle tinted background (`bg-primary/[0.02]`) to distinguish it from other sections
- Add a mini summary strip below the header: "2 items · 1 priced · $55,000 logged"

### 2. `COLineItemRow.tsx` — Cleaner layout + status indicator + promoted CTA
- **Status dot**: Add a colored dot before the item name — gray (no entries), amber (has entries but not approved), green (approved)
- **Location pill**: Render `location_tag` as a styled pill with icon instead of plain text
- **Always-visible CTA**: When `canAddLabor` is true and no entries exist, show the `LaborEntryForm` expanded by default instead of hidden behind a collapsible
- When entries exist, keep the collapsible but change the trigger from plain text to a styled button: "＋ Add more" with primary accent
- **Entry summary**: Show the entry count and total inline on the item row (right-aligned) instead of only in the collapsed trigger
- **Cleaner typography**: Bump item name to `text-sm font-semibold`, keep metadata as `text-xs` but with better spacing

### 3. `COLineItemRow.tsx` — Better entry history display
- Show the most recent entry preview (date + amount) always visible below the item, without needing to expand
- Keep full history in the collapsible for detail
- Add subtle alternating row backgrounds for readability

### 4. Section header enhancement
- Change "📋 Scope & Labor" to a more prominent heading with item count badge
- Add a completion indicator: "2/3 items priced" with a tiny progress bar

## Files changed
- `src/components/change-orders/CODetailLayout.tsx` — section wrapper styling + summary strip
- `src/components/change-orders/COLineItemRow.tsx` — status dot, layout cleanup, auto-expand, promoted CTA

## What stays the same
- All data flow, hooks, and business logic unchanged
- LaborEntryForm component unchanged
- Sidebar, Materials, Equipment, Activity sections unchanged
- Mobile behavior preserved




# Scope & Labor Visual Overhaul — Matching Reference Mockup

## What changes

Bring the Scope & Labor section, line item rows, and pricing form closer to the high-fidelity HTML mockup: more visual weight, always-visible internal cost indicators, better status chips, and a richer pricing entry form.

## Changes by file

### 1. `COLineItemRow.tsx` — Visual weight + status chips + internal cost visibility

- **Left amber border stripe**: Replace the small status dot with a 4px left border on each line-item wrapper (amber for priced, gray for unpriced, green for approved)
- **Numbered index**: Accept an `index` prop and show a navy circle with the item number (e.g., "1", "2") instead of a plain dot
- **Status chip**: Add a pill badge to the right side — "Priced" (green bg), "Needs Pricing" (yellow bg) — replacing the plain "Needs pricing" text
- **Entry history rows**: Add an "Internal Cost" column with lock icon showing actual cost per entry (only visible to the role that entered it). Show "—" when no actual cost is logged for that entry
- **Margin % chip**: Show a small margin percentage badge on each item when both billable and actual cost exist
- **Scope description**: Show `item.description` more prominently with better line-clamp and styling

### 2. `LaborEntryForm.tsx` — Enhanced to match mockup form

- **3-tile Entry Type**: Add "Unit Price" as a third mode option alongside Hourly and Lump Sum, with icons and sub-labels (e.g., "Rate × Hours", "Fixed Amount", "Qty × Unit")
- **Live margin preview**: When the user fills in billable amount, show a "Margin on this entry" block with dollar amount and percentage in green, updating live
- **Optional internal cost section**: Add a collapsible "Log internal cost" section at the bottom with lock icon and "Private: optional" badge. Fields: "Your Cost" input + "Cost Type" dropdown (Labor wages, Subcontractor, Materials, Other)
- **Description + Date on same row**: Place description and date side-by-side instead of stacked
- **Billable Amount field**: Show alongside hours (side-by-side) with a "$0.00" placeholder

### 3. `COKPIStrip.tsx` — Add sub-labels and status badges

- Add a `sub` line to each KPI tile (e.g., "1 item · 52 hrs logged")
- Add a `badge` with status text and color (e.g., "Priced", "Awaiting input", "Incomplete")
- These are derived from the financial data: zero = "Awaiting input", partial = "Incomplete", complete = "Priced"

### 4. `CODetailLayout.tsx` — Pass index to line items + show scope description

- Pass `index={idx + 1}` to each `COLineItemRow`
- If the CO has a `scope_of_work` text field, render it as a styled paragraph at the top of the Scope & Labor card body (before the line items), matching the mockup's description block

## What stays the same
- All data hooks, mutations, and business logic unchanged
- Sidebar financials, activity feed, materials/equipment panels unchanged
- Mobile layout behavior preserved
- RLS policies and database schema unchanged

## Technical notes
- "Unit Price" mode will map to a new `pricing_mode` value or be handled client-side as `hourly` with renamed labels (qty × unit price = hours × rate)
- Internal cost logging in the form reuses the existing `is_actual_cost` insertion path
- The margin preview is purely client-side calculation, no new data needed


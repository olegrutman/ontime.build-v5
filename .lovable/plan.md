

# Fix Remaining CO/Contract References in TC Overview for T&M Projects

## What's wrong
The TC Project Overview still has ~15 hardcoded "CO" and "Contract" references that don't swap to "WO" / "Work Order" terminology when `isTM` is true. The screenshot shows these clearly.

## All changes in one file: `src/components/project/TCProjectOverview.tsx`

### Card 1 — GC Contract card (lines ~482-498)
- Label: `"{gcName} CONTRACT (YOUR REVENUE)"` → if T&M: `"{gcName} T&M REVENUE"`
- Row: `"Contract Value (set by {gcName})"` → if T&M: `"T&M Total (approved WOs)"`
- Row: `"Approved COs (billed to {gcName})"` → if T&M: `"Approved WOs (billed to {gcName})"`
- Info box: `"This contract value was set by {gcName}"` → if T&M: `"This total reflects approved Work Orders"`

### Card 2 — FC Contract card (lines ~502-580)
- Label: `"{FC} CONTRACT (YOU SET THIS)"` → if T&M: `"{FC} COST TRACKING"`
- Section header `"FC CONTRACT TERMS"` → if T&M: `"FC TERMS"`
- Row `"CO Revenue (from {gcName})"` → if T&M: `"WO Revenue (from {gcName})"`
- Row `"CO Cost (to {fcName})"` → if T&M: `"WO Cost (to {fcName})"`
- Row `"Your Net Margin after COs"` → if T&M: `"Your Net Margin after WOs"`

### Card 3 — Gross Margin card (lines ~584-598)
- Row `"CO Revenue"` → if T&M: `"WO Revenue"`
- Row `"CO Cost"` → if T&M: `"WO Cost"`

### Card 4 — CO/WO Net Margin card (lines ~601-631)
- Table header `"CO #"` → if T&M: `"WO #"`
- Summary row `"{n} COs"` → if T&M: `"{n} WOs"` (line 623)
- Button `"+ Submit CO to {gcName}"` → if T&M: `"+ Submit WO to {gcName}"` (line 630)

## Approach
- All changes are conditional on the existing `isTM` prop (already accepted by this component)
- Use inline ternaries: `isTM ? 'WO' : 'CO'` pattern
- No new props, no database changes, no new files needed


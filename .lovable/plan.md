
# SOV Page: Separate Contracts from Work Orders + Billing Info

## Changes

### File: `src/components/sov/ContractSOVEditor.tsx`

**1. Split SOVs into two groups**

Before the `sovs.map()` rendering loop (line 235), partition `sovs` into two arrays:
- `contractSovs` -- SOVs where the linked contract's trade is NOT "Work Order" or "Work Order Labor"
- `workOrderSovs` -- SOVs where the linked contract's trade IS "Work Order" or "Work Order Labor"

Render them in two separate sections with section headings:
- "Main Contracts" section (always on top, rendered first)
- "Work Orders" section (below, with a separator/heading)

**2. Add billing summary to Work Order SOV cards**

For each Work Order SOV card, display a small summary line showing how much of the main contract SOV has been billed. This is calculated by:
- Finding the main contract SOVs (non-work-order)
- Summing `billed_to_date` across all main contract SOV items
- Summing `value_amount` (scheduled value) across all main contract SOV items
- Displaying: "Main Contract Billed: $X of $Y (Z%)"

This gives users context on overall project billing progress when looking at work order SOVs.

**3. Add overall billing summary at the top**

Add a compact summary bar above all SOVs showing:
- Total main contract value
- Total billed to date across main contracts
- Percentage complete

## Technical Details

The SOV rendering block changes from:

```
{sovs.map(sov => { ... })}
```

To:

```
{/* Main Contracts */}
<h3>Main Contracts</h3>
{contractSovs.map(sov => { ... })}

{/* Work Orders */}
{workOrderSovs.length > 0 && (
  <>
    <h3>Work Orders</h3>
    <div>Main Contract Billed: $X of $Y (Z%)</div>
    {workOrderSovs.map(sov => { ... })}
  </>
)}
```

The existing SOV card rendering code (the content inside the `.map()`) stays completely unchanged -- only the grouping and section headings are new.

### Files Modified
- `src/components/sov/ContractSOVEditor.tsx` -- split rendering into two grouped sections with billing summary

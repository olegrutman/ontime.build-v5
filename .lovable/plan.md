

# Improve Work Order Page for GC Review (No Redesign)

## Summary
Restructure the existing `ChangeOrderDetailPage.tsx` to improve clarity for GC users before final approval. All changes use existing components, existing design system, and existing card/layout patterns. No new routes, no new visual system.

## Changes Overview

### File 1: `src/components/change-order-detail/ChangeOrderDetailPage.tsx`
**Reorder sidebar sections for GC users and add collapsible behavior**

Current GC sidebar order:
1. ContractedPricingCard
2. ApprovalPanel
3. Checklist (at bottom)

New GC sidebar order:
1. **Checklist** (moved to top -- highest priority when incomplete)
2. **Price Summary Tile** (always visible, shows total + contract/schedule impact)
3. ApprovalPanel (with approval summary added above buttons)

Current GC main content order:
1. Header + Scope card (always expanded)
2. GCLaborReviewPanel
3. WorkOrderMaterialsPanel
4. EquipmentPanel

New GC main content (all collapsible for GC):
1. Header meta row (unchanged)
2. **Scope/Description** -- collapsed by default (show first 3 lines, "Show more" toggle)
3. **Labor tile** -- collapsed shows total + responsible party; expanded shows hours/rate detail. Title uses full TC company name.
4. **Materials tile** -- collapsed shows total; expanded shows full line item table (existing WorkOrderMaterialsPanel content)
5. **Equipment tile** -- collapsed shows total + responsible party; expanded shows item list

### File 2: `src/components/change-order-detail/ApprovalPanel.tsx`
**Add approval summary above action buttons**

Before the Reject/Approve buttons, insert a compact summary block:
- Contract Change: +$X
- Labor: $X
- Materials: $X
- Equipment: $X
- Total: $X

Also update finalize confirmation dialog to show the computed total (labor + materials + equipment) instead of just `final_price`.

### File 3: `src/components/change-order-detail/ChangeOrderChecklist.tsx`
**Auto-collapse when complete, show progress bar**

- When all items complete: collapse checklist body, show green check + "All complete" in header
- When incomplete: show progress indicator (e.g., "4 of 6") and highlight missing items
- Use Radix Collapsible (already installed) for expand/collapse

### File 4: `src/components/change-order-detail/GCLaborReviewPanel.tsx`
**Make collapsible, show full TC company name in title**

- Accept `tcCompanyName` prop for full company name display in title
- Collapsed view: show Labor Total and "Responsible: Trade Contractor"
- Expanded view: existing table with hours, rate, totals per entry
- Use Collapsible from Radix

### File 5: `src/components/change-order-detail/ContractedPricingCard.tsx`
**Add contract/schedule impact lines under the total**

In the GC view, below "Total Work Order Cost", add:
- "Contract Impact: +$X" (smaller text)
- "Schedule Impact: +X days" (smaller text, placeholder for now since `schedule_impact` field may not exist yet)

---

## Technical Details

### Collapsible Pattern (reused across sections)
All collapsible sections will use the existing `@radix-ui/react-collapsible` (already in `src/components/ui/collapsible.tsx`):

```tsx
<Collapsible defaultOpen={false}>
  <Card>
    <CollapsibleTrigger asChild>
      <CardHeader className="cursor-pointer">
        {/* Title + collapsed summary */}
      </CardHeader>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <CardContent>
        {/* Full detail content */}
      </CardContent>
    </CollapsibleContent>
  </Card>
</Collapsible>
```

### Scope Collapsible Logic
- Split `changeOrder.description` by newlines
- Show first 3 lines when collapsed
- "Show more" / "Show less" toggle
- Only collapsible when not editing

### Sidebar Reorder (GC only)
The sidebar `div` in `ChangeOrderDetailPage.tsx` (lines 383-484) will be restructured so that for GC users:
1. Checklist renders first
2. ContractedPricingCard renders second
3. ApprovalPanel renders third
4. Other items (participants, resource toggles) follow

Non-GC users keep current order unchanged.

### Approval Validation
The existing `isChecklistComplete` logic in `ApprovalPanel.tsx` already blocks approval. No new validation logic needed -- the spec's validation rules (labor, materials, schedule) map to existing checklist items. The checklist already enforces `tc_pricing_complete`, `materials_priced`, etc.

### Schedule Impact
The `schedule_impact` field does not exist in the current schema. The plan will show "Not specified" as placeholder. A future migration can add this field if needed.

### No New Files
All changes are modifications to existing components. No new routes, pages, or components needed.




# Highlight Ordered Packs on Estimate Page & PO Wizard

## Summary
Add visual "Already Ordered" indicators to packs in two places:
1. **EstimateSummaryCard** (estimate detail view on the Estimates tab)
2. **PackSelector** (PO Wizard pack picker)

Both will query `purchase_orders` for matching `source_estimate_id` + `source_pack_name` (excluding `ACTIVE` drafts). Ordered packs get an amber/green badge. In the PO Wizard, clicking an ordered pack shows a confirmation dialog before proceeding.

---

## Changes

### 1. `EstimateSummaryCard.tsx`
- Add optional `estimateId?: string` prop
- When provided, fetch POs with `source_estimate_id = estimateId` and collect `source_pack_name` values (status != `ACTIVE`)
- On each pack row, show a `✓ Ordered` badge (green) next to the pack name if it's in the ordered set

### 2. `ProjectEstimatesReview.tsx`
- Pass `estimateId={selectedEstimate.id}` to `EstimateSummaryCard`

### 3. `SupplierEstimatesSection.tsx`
- Pass `estimateId` to `EstimateSummaryCard` (same pattern)

### 4. `PackSelector.tsx`
- After fetching estimate items, also fetch POs where `source_estimate_id = estimateId` and `status != ACTIVE`
- Build a `Set<string>` of ordered pack names
- Show an amber "Already Ordered" badge on ordered pack cards
- On click of an ordered pack: show a confirmation dialog ("This pack already has a PO. Create another?") with Cancel / Continue buttons
- Unordered packs proceed as normal

---

## Files to Modify

| File | Change |
|---|---|
| `src/components/estimate-summary/EstimateSummaryCard.tsx` | Add `estimateId` prop, fetch ordered packs, show badge |
| `src/components/project/ProjectEstimatesReview.tsx` | Pass `estimateId` |
| `src/components/project/SupplierEstimatesSection.tsx` | Pass `estimateId` |
| `src/components/po-wizard-v2/PackSelector.tsx` | Fetch ordered packs, badge + confirm dialog |


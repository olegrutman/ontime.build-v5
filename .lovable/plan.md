
# Plan: Pack-Based Estimate Upload and Project-Specific Ordering

## What We Have Today

### Estimate System (Current State)
- **supplier_estimates** table: Stores flat estimate records (name, status, total_amount) linked to a supplier org and project
- **supplier_estimate_items** table: Flat list of line items (sku, description, qty, uom, unit_price) -- no pack grouping
- **estimate_packs** / **estimate_line_items** tables (legacy): Support pack grouping with pack_name and pack_type (LOOSE_MODIFIABLE / ENGINEERED_LOCKED), but they belong to the old `project_estimates` system and are not used by the active supplier workflow
- **estimate_catalog_mapping** table: Maps estimate line items to catalog products (estimate_id, catalog_item_id, line_item_id) -- exists but currently unused since no matching step is active
- **CSV upload**: Current parser expects flat columns (sku, desc, qty, uom, price, notes); does not understand packs

### PO Wizard (Current State)
- 3-screen wizard: Header -> Items -> Review
- Items screen always opens the full ProductPicker (category -> secondary -> spec filters -> product -> quantity)
- POs already have `source_estimate_id` and `source_pack_name` columns on the `purchase_orders` table
- No UI toggle between "project-specific" vs "full catalog" ordering modes
- No concept of ordering an entire pack at once

### Roles
- GC_PM role is auto-assigned when a user creates a GC organization
- Role cannot be changed from the Profile page (job title is cosmetic only)
- GC_PM can approve/reject estimates at `/approvals/estimates`

---

## Uploaded CSV Analysis

The uploaded file is a real supplier quote (Quote #63590) exported as CSV. Key observations:

**Structure:**
- Column headers: `pack_name, supplier_sku, description, quantity, unit`
- Each row has a `pack_name` (e.g., "1st Floor Wall Framing", "Roof Framing System", "Components", "Backout")
- Noise rows exist: page headers/footers with dates, addresses, page numbers -- these have no valid pack_name or have pack_name = "End of..."
- No pricing columns in the user's desired format (user said: "exclude pricing")

**Pack groups identified from the file:**
1. 1st Floor Wall Framing
2. 2nd Floor Framing & Sub-Floor
3. 2nd Floor Wall Framing
4. 3rd Floor Framing & Sub-Floor
5. 3rd Floor Wall Framing
6. 4th Floor Framing & Sub-Floor
7. 4th Floor Wall Framing
8. Roof Framing System
9. Ext Siding & Soffit Trim
10. Backout
11. Components

**SKU matching potential:**
SKUs like `2X4X12`, `2X8X16`, `2X6X12` map to framing lumber in the catalog. Hardware items like `HDU11-SDS2.5`, `LUS28`, `JB28` would need SKU-based matching. Components (trusses, wall panels) are custom items with `zz_NSBLDMT_*` SKUs that likely won't match the catalog.

---

## What We Will Build

### 1. New Pack-Aware CSV Parser
Build a smart CSV parser that:
- Reads the `pack_name` column to group items into packs
- Strips noise rows (page headers containing dates, addresses, "End of", page numbers)
- Extracts clean SKU and description from the messy combined description field
- Ignores pricing data (as requested)
- Returns structured data: `{ packs: [{ name, items: [{ sku, description, qty, uom }] }] }`

### 2. Add Pack Support to supplier_estimate_items
Add a `pack_name` column to `supplier_estimate_items` so items are grouped by pack within the existing estimate system. Also add a `catalog_item_id` column for catalog matching results.

### 3. Catalog Matching Step
After CSV upload, run automatic matching:
- Match by `supplier_sku` against `catalog_items.supplier_sku`
- Display results grouped by pack, showing: matched items (green), unmatched items (amber)
- Allow user to confirm or manually re-match unmatched items
- Save `catalog_item_id` on each `supplier_estimate_item`

### 4. PO Wizard: Ordering Mode Toggle
On the Items Screen (Step 2), add a toggle at the top:
- **"Project Estimate"** mode: Shows packs from the approved estimate. User can tap a pack to auto-populate PO with all items from that pack. The PO gets tagged with `source_estimate_id` and `source_pack_name`, plus a `pack_modified` flag if any items are added/removed/changed.
- **"Full Catalog"** mode: Current behavior -- opens the full ProductPicker with category drill-down

### 5. Pack-to-PO Flow
When user selects a pack:
- All matched items from that pack are loaded into PO line items
- Items are editable (quantity changes, removals, additions)
- If any modification is made, the PO is marked as `pack_modified = true`
- Unmatched items (no catalog match) are included with their original description/SKU but flagged

---

## Technical Details

### Database Changes

**Migration 1: Add pack support to supplier_estimate_items**
```sql
ALTER TABLE supplier_estimate_items
  ADD COLUMN pack_name text,
  ADD COLUMN catalog_item_id uuid REFERENCES catalog_items(id);
```

**Migration 2: Add pack_modified flag to purchase_orders**
```sql
ALTER TABLE purchase_orders
  ADD COLUMN pack_modified boolean DEFAULT false;
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/parseEstimateCSV.ts` | Smart CSV parser that extracts packs, strips noise rows, normalizes SKUs |
| `src/components/estimate-upload/EstimateUploadWizard.tsx` | Multi-step upload wizard: Upload -> Review Packs -> Catalog Match -> Confirm |
| `src/components/estimate-upload/PackReviewStep.tsx` | Shows parsed packs and items for user verification |
| `src/components/estimate-upload/CatalogMatchStep.tsx` | Shows match results, allows manual corrections |
| `src/components/po-wizard-v2/OrderingModeToggle.tsx` | Toggle between "Project Estimate" and "Full Catalog" |
| `src/components/po-wizard-v2/PackSelector.tsx` | Lists available packs from approved estimate for quick PO creation |

### Files to Modify

| File | Change |
|------|---------|
| `src/pages/SupplierProjectEstimates.tsx` | Replace simple CSV upload with new EstimateUploadWizard |
| `src/components/po-wizard-v2/POWizardV2.tsx` | Add ordering mode state, pass to ItemsScreen |
| `src/components/po-wizard-v2/ItemsScreen.tsx` | Add OrderingModeToggle; when "Project Estimate" selected, show PackSelector instead of ProductPicker |
| `src/components/po-wizard-v2/HeaderScreen.tsx` | Fetch approved estimates for the project; pass to next step |
| `src/pages/EstimateApprovals.tsx` | Show items grouped by pack_name in the detail view |
| `src/types/supplierEstimate.ts` | Add pack_name and catalog_item_id to SupplierEstimateItem type |
| `src/types/poWizardV2.ts` | Add source_estimate_id, source_pack_name, pack_modified to POWizardV2Data |

### Catalog Matching Logic

The matching algorithm will:
1. Normalize the SKU (uppercase, strip spaces)
2. Query `catalog_items` WHERE `supplier_sku ILIKE normalized_sku`
3. For lumber items (e.g., `2X4X12`), also try parsing dimension + length to match against `dimension` and `length` columns
4. Return match confidence: EXACT (SKU match), FUZZY (dimension match), NONE

### Noise Row Detection

Rows are discarded if:
- `pack_name` is empty or starts with "End of"
- `supplier_sku` contains a date pattern (e.g., `07/02/2018`)
- `description` contains "Quote Date", "Page X of Y", "E BATES AVE", or "Sales Tax"
- `supplier_sku` contains `*QU-` (quote page marker)

### User Flow Summary

```
Supplier uploads CSV
      |
      v
Smart parser extracts 11 packs, ~100 clean items
      |
      v
Pack Review: "We found 11 packs with 95 items. 5 noise rows removed."
      |
      v
Catalog Match: "78 items matched, 17 unmatched (custom/components)"
      |
      v
Supplier confirms and submits estimate
      |
      v
GC_PM approves estimate (sees items grouped by pack)
      |
      v
GC_PM creates PO:
  - Toggle: [Project Estimate] | [Full Catalog]
  - Project Estimate mode shows packs:
    "1st Floor Wall Framing (7 items)"
    "2nd Floor Framing & Sub-Floor (11 items)"
    ...
  - Tap pack -> items auto-populate PO
  - Edit quantities, add/remove items
  - PO tagged: source_estimate_id, source_pack_name, pack_modified
```

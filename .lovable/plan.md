
# Fix: PDF Upload Button Missing on `/estimates` Route

## Problem Identified

The PDF upload feature was implemented in `SupplierProjectEstimates.tsx`, but this page is only accessible at `/supplier/estimates`. When you navigate to `/estimates`, you see a different page (`SupplierEstimates.tsx`) which only has CSV upload functionality.

## Solution Options

### Option A: Redirect `/estimates` to `/supplier/estimates` (Recommended - Quick Fix)

Update the routing so that `/estimates` uses the new page with PDF upload:

**File: `src/App.tsx`**
- Change line 53 from: `<Route path="/estimates" element={<SupplierEstimates />} />`
- To: `<Route path="/estimates" element={<SupplierProjectEstimates />} />`

This immediately gives Supplier users the PDF upload feature at the expected URL.

### Option B: Add PDF Upload to Old Page (More Work)

Copy the PDF upload components and logic into `SupplierEstimates.tsx`. This would require:
- Adding the tabbed interface
- Integrating `EstimatePDFUpload`, `EstimateReviewTable`, and `EstimatePackList` components
- Updating data model references

This is more work and duplicates functionality.

### Option C: Consolidate Both Pages (Best Long-Term)

Review both pages and merge them into one cohesive experience, deciding which data model to use going forward.

---

## Recommended Action

**Go with Option A** - Update the route mapping so `/estimates` loads `SupplierProjectEstimates`:

```typescript
// src/App.tsx line 53
// Before:
<Route path="/estimates" element={<SupplierEstimates />} />

// After:
<Route path="/estimates" element={<SupplierProjectEstimates />} />
```

This is a one-line change that immediately exposes the PDF upload feature at the expected route.

---

## Technical Details

### Current Routing
| Route | Component | Has PDF Upload |
|-------|-----------|----------------|
| `/estimates` | `SupplierEstimates.tsx` | No (CSV only) |
| `/supplier/estimates` | `SupplierProjectEstimates.tsx` | Yes |

### After Fix
| Route | Component | Has PDF Upload |
|-------|-----------|----------------|
| `/estimates` | `SupplierProjectEstimates.tsx` | Yes |
| `/supplier/estimates` | `SupplierProjectEstimates.tsx` | Yes |

### Data Model Notes

The two pages use different database tables:
- Old page: `project_estimates`, `estimate_packs`, `pack_items`
- New page: `supplier_estimates`, `estimate_pdf_uploads`, `estimate_line_items`, `estimate_catalog_mapping`

The new page's data model better supports the PDF parsing and catalog restriction workflow. If you have existing data in the old tables that needs to be preserved, we may need a migration strategy.

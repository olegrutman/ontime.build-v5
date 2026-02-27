

# One Estimate Per Project + Allow Update

## Overview
Limit suppliers to a single estimate per project. If an estimate already exists, show it directly with an "Update" option (re-upload) instead of offering a "Create" button.

## Changes

### 1. SupplierEstimatesSection.tsx -- Simplify to single-estimate model
- Remove the "+" create button and the create dialog
- On load, check if an estimate already exists for this project + supplier org
- If **no estimate exists**: show a single "Create Estimate" button that auto-creates a default-named estimate (e.g., "Materials Estimate") and immediately opens the upload wizard
- If **estimate exists**: show it directly (status, total, items) with an **"Update"** button that opens the upload wizard to re-upload/replace items
- Remove the list layout since there will only ever be one estimate
- Keep the detail sheet, delete confirmation, and submit functionality as-is

### 2. Database -- Add unique constraint
Add a migration with a unique constraint on `supplier_estimates(project_id, supplier_org_id)` to enforce one estimate per project per supplier at the database level.

```sql
ALTER TABLE supplier_estimates
  ADD CONSTRAINT supplier_estimates_project_org_unique
  UNIQUE (project_id, supplier_org_id);
```

### 3. SupplierProjectEstimates page (standalone /supplier/estimates)
- When creating a new estimate, check if one already exists for the selected project
- If it does, show a toast saying "An estimate already exists for this project" and navigate to it instead
- Add an "Update" button on existing estimates that opens the upload wizard to replace items

### 4. Upload Wizard behavior on update
The wizard already deletes existing items before inserting new ones (line 100-103 in EstimateUploadWizard.tsx), so re-uploading naturally replaces the old data. No changes needed here.

## Technical Details

### Files Modified
1. **New migration** -- unique constraint on `supplier_estimates(project_id, supplier_org_id)`
2. **`src/components/project/SupplierEstimatesSection.tsx`** -- single-estimate UX: auto-create or show existing with Update button
3. **`src/pages/SupplierEstimates.tsx`** (if used) -- prevent duplicate creation, add update flow

### What stays the same
- Upload wizard (already supports re-upload via delete + insert)
- Estimate detail sheet with items table
- Submit for review flow
- Delete confirmation


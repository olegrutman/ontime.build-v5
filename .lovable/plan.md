

# Replace TMWOWizard Step 2 with StepCatalog

## What changes
Remove the hardcoded `StepScopeDetails` component (sub-type chips, quantity, notes) from the TMWOWizard and replace it with the existing `StepCatalog` component — the same catalog drill-down used in the standard CO wizard.

## Why
The current Step 2 uses a flat list of hardcoded chips per work type. The real scope catalog (screenshot 2) provides proper categorized items from the database, search, and location filtering — far more useful for actual construction scoping.

## File: `src/components/change-orders/wizard/TMWOWizard.tsx`

### 1. Import StepCatalog and required types
- Import `StepCatalog` from `./StepCatalog`
- Import `COWizardData` and `ScopeCatalogItem` types needed by StepCatalog

### 2. Add scope items state
- Add a `scopeItems: ScopeCatalogItem[]` field to `TMWOData` (or maintain a parallel `COWizardData`-compatible object to pass to StepCatalog)
- StepCatalog expects `data.scopeItems` and `data.locationTag` from `COWizardData` — create a thin adapter object

### 3. Replace Step 2 rendering
- Remove `<StepScopeDetails>` from the step rendering
- Replace with `<StepCatalog data={adaptedData} onChange={handleCatalogChange} projectId={projectId} />`
- The adapter maps TMWOData fields to/from the COWizardData shape StepCatalog expects

### 4. Update validation
- `canAdvance()` for the scope step: check `scopeItems.length > 0` instead of `subtypes.length > 0`

### 5. Update submission
- When creating `co_line_items`, iterate over the selected `scopeItems` array instead of building a single line item from subtypes
- Each catalog item becomes its own `co_line_items` row with proper `item_name`, `description`, `catalog_item_id`, etc.

### 6. Update AI description generation
- Pass the selected scope item names to the AI prompt instead of subtype strings

### 7. Clean up
- Remove the `StepScopeDetails` component and the `subtypes`/`customSubtype` fields from `TMWOData`
- Keep `quantity` and `scopeNotes` if still used in Review step; otherwise remove

## What stays the same
- Step 1 (Work Type tiles), Step 3 (Location), Step 4 (Resources), Step 5 (Review) — unchanged
- The `StepCatalog` component itself — no modifications needed
- Database tables — no changes


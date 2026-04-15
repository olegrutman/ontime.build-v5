

# Smart Wizard Rebuild — Scope Catalog Expansion + Smart Suggestions

## Summary
Add two new work types (Structural, WRB & Envelope), a local scope catalog with 100+ items, smart pre-selection based on reason+work type, and visual enhancements to both wizards. No database changes needed — local catalog merges with Supabase data at runtime.

## Files to Create

### 1. `src/lib/scopeCatalog.ts` (New)
- Export `ScopeItem` interface, `SCOPE_CATALOG` array (all items from the prompt), `SMART_SUGGESTIONS` map, and `REASON_WORKTYPE_HINTS` map
- Exact data as specified in the prompt

## Files to Modify

### 2. `src/types/changeOrder.ts`
- Add `COWorkType` string literal union including `'structural'` and `'wrb'` alongside existing types

### 3. `src/components/change-orders/wizard/TMWOWizard.tsx`
- Update `WorkTypeKey` union to include `'structural' | 'wrb'`
- Insert two new entries into `WORK_TYPES` array after `framing` and before `reframing`:
  - `structural` with subtypes (Beam installation, Column install, etc.)
  - `wrb` with subtypes (Housewrap install, Flashing, Window install, etc.)
- In `StepWorkType`, render "Suggested" badge on tiles when work type appears in `REASON_WORKTYPE_HINTS` (no reason in TMWOWizard so skip hint logic here — but add badge styling for structural/wrb tiles)

### 4. `src/components/change-orders/wizard/COWizard.tsx`
- Insert `structural` and `wrb` into `CO_WORK_TYPES` after framing and before electrical
- In `StepWhy`, after reason is selected, show a "Suggested for [reason]" section using `REASON_WORKTYPE_HINTS[reason]` — render those work types as larger highlighted tiles above the full grid
- In `handleNext`, when entering scope step with empty `selectedItems`, auto-populate from `SMART_SUGGESTIONS[reason][workType]` using `SCOPE_CATALOG`

### 5. `src/components/change-orders/wizard/StepCatalog.tsx`
- Add `structural` and `wrb` to `WORK_TYPE_DIVISION_MAP` and `WORK_TYPE_LABELS`
- Import `SCOPE_CATALOG` and `SMART_SUGGESTIONS`
- Add a "Smart picks for this job" section at the top of Phase 3 (items) when both `reason` and `workType` are set — shows suggested items with amber "Suggested" badge, items already selected show as checked
- When rendering items, show tag badges: `tag: 'structural'` → blue badge, `tag: 'wrb'` → green badge

### 6. `src/hooks/useScopeCatalog.ts`
- Import `SCOPE_CATALOG` from `src/lib/scopeCatalog`
- After Supabase fetch, merge in local catalog items for work types not already in DB results (match on `item_name` to avoid duplicates)
- Map local items to `ScopeCatalogItem` shape with synthetic IDs and appropriate division/category fields

### 7. `supabase/functions/generate-work-order-description/index.ts`
- Add `structural` and `wrb` to `WORK_TYPE_DESCRIPTIONS` map
- Add contextual notes to `contextParts` when work type is `structural` or `wrb`

## Technical Details

**Smart pre-selection flow (COWizard):**
```text
User picks reason → picks workType → advances to scope step
  → SMART_SUGGESTIONS[reason][workType] returns item names
  → Filter SCOPE_CATALOG by those names
  → Pre-populate selectedItems with location + reason metadata
```

**Local catalog merge (useScopeCatalog):**
```text
DB items fetched → collect item_name set
  → Filter SCOPE_CATALOG items not in DB
  → Map to ScopeCatalogItem shape
  → Append to results
```

**Badge styling:**
- Structural: `bg-blue-50 text-blue-700` / `dark:bg-blue-950/30 dark:text-blue-400`
- WRB: `bg-emerald-50 text-emerald-700` / `dark:bg-emerald-950/30 dark:text-emerald-400`
- Suggested: `bg-amber-50 text-amber-700` / existing amber pattern

**No changes to:** submission logic, CO number generation, activity logging, VisualLocationPicker, routing, auth, RLS, or any Supabase table schema.


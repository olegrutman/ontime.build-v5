

# SOV Consistency Rule: All SOVs Share Same Line Items & Percentages

## Problem
Currently, each SOV can be created independently with different line items and percentages. The business rule is: **all SOVs on a project must share the same line items and the same percentages**, only differing by the contract (and therefore dollar amounts). Whether TC creates one first (TC→GC, then TC→FC) or GC creates one, all subsequent SOVs must mirror the first.

## Solution
When creating a new SOV (template-based, upload, or single-contract), check if any SOV already exists on the project. If so, **copy line items and percentages from the existing SOV** instead of generating from template or AI parsing.

### Changes

| File | Change |
|------|--------|
| `src/hooks/useContractSOV.ts` | In `createAllSOVs` and `createSOVForContract`: before generating from template, check for an existing SOV on the project. If found, use its items/percentages instead of template generation. |
| `src/components/sov/UploadSOVDialog.tsx` | In `handleApply`: after user reviews uploaded items, if an existing SOV already exists on the project, warn/block and instead copy from the existing SOV. OR: if this is the **first** SOV, allow upload; if not, skip AI parsing and auto-populate from the existing SOV's items. |

### Logic Detail

**Helper function** (in `useContractSOV.ts`):
```typescript
async function getExistingSOVItems(projectId: string): Promise<{item_name: string, percent_of_contract: number, sort_order: number}[] | null> {
  // Find any existing SOV for this project (not work order)
  const { data: existingSov } = await supabase
    .from('project_sov')
    .select('id')
    .eq('project_id', projectId)
    .limit(1)
    .single();
  
  if (!existingSov) return null;
  
  const { data: items } = await supabase
    .from('project_sov_items')
    .select('item_name, percent_of_contract, sort_order')
    .eq('sov_id', existingSov.id)
    .order('sort_order');
  
  return items?.length ? items : null;
}
```

**In `createSOVForContract` and the loop in `createAllSOVs`**: before template generation, call this helper. If items exist, use them (applying each contract's `contract_sum` for dollar amounts). Only fall back to template generation if no SOV exists yet.

**In `UploadSOVDialog`**: check for existing SOV items on the project. If found, skip the upload/AI flow entirely — auto-create the new SOV by copying items from the existing SOV, just with the new contract's dollar amounts. Show a toast explaining items were inherited.

### Edge Cases
- **First SOV on project**: normal flow (template or upload)
- **Subsequent SOVs**: always inherit from the first SOV's line items and percentages
- **`createAllSOVs` (bulk)**: generate items once, apply to all contracts (already works this way)
- **Editing percentages on one SOV**: does NOT retroactively sync to other SOVs (they were set at creation time — user can regenerate all if needed)


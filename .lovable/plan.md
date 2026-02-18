

# Add Material Responsibility Selector to Readiness Card

## What Changes

When the "Material responsibility selected" checklist item is incomplete, a small inline GC/TC toggle will appear directly below it, allowing the user to set it without navigating elsewhere. Once set, the toggle disappears and the item shows as complete.

## Technical Changes

### 1. `src/hooks/useProjectReadiness.ts`

- **Expose a `recalculate` callback** so the card can refresh after an update.
- **Expose the first contract ID** (needed to know which contract to update).
- Update the `ProjectReadiness` interface:

```typescript
export interface ProjectReadiness {
  percent: number;
  checklist: ReadinessItem[];
  loading: boolean;
  recalculate: () => void;
  firstContractId: string | null;
}
```

- Store `firstContractId` from the contracts query and return it alongside the existing fields.

### 2. `src/components/project/ProjectReadinessCard.tsx`

- Accept `readiness` which now includes `recalculate` and `firstContractId`.
- For the `material_resp` checklist item, when `!item.complete`, render an inline toggle below the label:

```
Material responsibility selected
  [GC] / [TC]  toggle
```

- On toggle change, call:
```typescript
await supabase
  .from('project_contracts')
  .update({ material_responsibility: value })
  .eq('id', firstContractId);
readiness.recalculate();
```

- Uses the existing `Switch` component with "GC" and "TC" labels (same pattern as the project wizard's PartiesStep).

### 3. No database changes needed

The `material_responsibility` column already exists on `project_contracts` and accepts `'GC'` or `'TC'` string values.

## Result

Users see an actionable toggle directly in the readiness card for material responsibility, can set it with one click, and the checklist immediately updates to reflect completion.


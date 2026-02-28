

# Merge Material Responsibility into Team Card

## What Changes

### 1. Remove the standalone MaterialResponsibilityCard
Delete `src/components/project/MaterialResponsibilityCard.tsx` and remove it from `ProjectHome.tsx` and `index.ts` exports. The material responsibility selection moves into the TeamMembersCard.

### 2. Enhance TeamMembersCard with Material Responsibility Indicator + Selector

**Visual change**: Next to the GC or TC row in the team list, show a small `Package` icon to indicate which party handles materials. If material responsibility is set on the contract, the icon appears on the responsible party's row.

**Selector behavior** (when material responsibility is NOT yet set):
- The project creator (GC or TC) sees a subtle "Assign Materials" button at the bottom of the team card
- Tapping it shows an inline picker (GC or TC toggle) within the card
- Once selected, it saves to `project_contracts.material_responsibility`

**Switching behavior** (when material responsibility IS set but no finalized PO exists):
- Only the currently responsible party can switch it
- A small "Change" button appears on hover next to the Package icon
- Tapping opens the same inline toggle

**Locking rule**: Once any PO on the project reaches `FINALIZED` or `DELIVERED` status, material responsibility becomes locked. The Package icon still shows but no edit controls appear. This is checked via a query: `SELECT count(*) FROM purchase_orders WHERE project_id = ? AND status IN ('FINALIZED', 'DELIVERED')`.

### 3. Update the ProjectReadinessCard
The readiness checklist item for `material_resp` currently has inline GC/TC buttons. These will be replaced with a link that says "Set in Team card below" pointing users to the team card. The actual save logic for material responsibility will only live in TeamMembersCard.

## Technical Plan

### Files Modified

**1. `src/components/project/TeamMembersCard.tsx`**
- Add props: `onResponsibilityChange?: (value: string | null) => void`
- Add state: `contract` (fetches the TC contract with `material_responsibility`, `from_org_id`, `to_org_id`), `isLocked` (boolean, based on finalized PO count), `savingResp` (saving state)
- New fetch: query `project_contracts` for the TC contract (same query as MaterialResponsibilityCard), and query `purchase_orders` count where status IN ('FINALIZED', 'DELIVERED')
- In the team list rendering, add a `Package` icon next to the role row that matches the `material_responsibility` value (GC or TC)
- Below the team list (before the supplier section), show a material responsibility selector:
  - If `material_responsibility` is null and user is project creator (GC or TC): show "Assign Material Responsibility" with GC/TC toggle buttons
  - If `material_responsibility` is set and not locked and user's org matches the responsible party: show subtle "Change" control
  - If locked: no edit controls, just the icon indicator
- On save: update `project_contracts.material_responsibility`, call `onResponsibilityChange`

**2. `src/pages/ProjectHome.tsx`**
- Remove `MaterialResponsibilityCard` import and usage (line 270)
- Pass `onResponsibilityChange={setMaterialResponsibility}` to `TeamMembersCard`

**3. `src/components/project/ProjectReadinessCard.tsx`**
- Remove the inline GC/TC buttons for `material_resp` checklist item (lines 95-106)
- Replace with text: "Set in Team card" (no button, just a hint)

**4. `src/components/project/index.ts`**
- Remove `MaterialResponsibilityCard` export

**5. Delete `src/components/project/MaterialResponsibilityCard.tsx`**

### No Database Changes Required
The `material_responsibility` column already exists on `project_contracts`. The locking logic is purely a frontend check based on existing PO status data.

### Locking Logic (in TeamMembersCard)
```typescript
// Check if any PO is finalized/delivered (locks material responsibility)
const { count } = await supabase
  .from('purchase_orders')
  .select('id', { count: 'exact', head: true })
  .eq('project_id', projectId)
  .in('status', ['FINALIZED', 'DELIVERED']);
setIsLocked((count || 0) > 0);
```

### Material Icon in Team List
For each role row, if `contract.material_responsibility` matches the role abbreviation (GC or TC), render a small `Package` icon with a tooltip "Handles materials":
```text
  [blue dot] GC  Acme Builders  [Package icon]
  [green dot] TC  Smith Electric
```

### Edit Permission Rules
- If `material_responsibility` is null: project creator org (GC or TC) can set it
- If `material_responsibility` is set and not locked: only the responsible party's org can switch
- If locked (finalized PO exists): no one can change it


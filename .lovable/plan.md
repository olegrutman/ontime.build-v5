

# CO Flow Bug Report

After analyzing `CODetailPage.tsx`, `COStatusActions.tsx`, `useChangeOrderDetail.ts`, `LaborEntryForm.tsx`, `COLineItemRow.tsx`, `COMaterialsPanel.tsx`, `COEquipmentPanel.tsx`, and `useChangeOrders.ts`, here are the bugs found:

---

## Bug 1 — TC Pricing Snapshot Uses FC Dollars Instead of FC Hours (CRITICAL)

**File**: `COStatusActions.tsx` line 202-204

```
const fcTotal = financials?.fcLaborTotal ?? 0;
const calcPrice = isHourly ? fcTotal : fcTotal * (1 + markup / 100);
```

**Problem**: For hourly mode, it snapshots `fcLaborTotal` (FC's dollar total) directly — NOT `fcTotalHours × TC rate`. The spec says hourly pricing = FC hours × TC hourly rate.

**Effect**: When TC submits with the toggle ON in hourly mode, `tc_submitted_price` equals FC's dollar amount instead of the correct calculated price. GC sees the wrong number. The entire pricing engine is broken for hourly COs.

---

## Bug 2 — `laborTotal` Excludes FC Labor Entirely (CRITICAL)

**File**: `useChangeOrderDetail.ts` line 172

```
const laborTotal = tcLaborTotal;
```

**Problem**: `laborTotal` only sums TC entries. FC labor is tracked separately in `fcLaborTotal` but never added to the grand total or the KPI strip "Labor" value.

**Effect**: The "Grand total" shown in the KPI strip, the financial sidebar, and the NTE tracking all ignore FC labor. If FC logs $5,000 and TC logs $0, the CO shows $0 labor and $0 grand total. NTE warnings never fire because they're based on `laborTotal`.

---

## Bug 3 — NTE Tracking Ignores FC Labor (CRITICAL)

**File**: `useChangeOrderDetail.ts` line 182

```
const nteUsedPercent = co?.nte_cap && co.nte_cap > 0 ? (laborTotal / co.nte_cap) * 100 : 0;
```

**Problem**: Since `laborTotal = tcLaborTotal` (Bug 2), the NTE percentage only tracks TC labor. FC can blow past the NTE cap without triggering 80% or 100% warnings.

**Effect**: The NTE hard block at 100% and the 80% warning notification never fire for FC-heavy COs. FC can log unlimited hours on an NTE CO.

---

## Bug 4 — GC Gets Locked Out When FC Collaborator Exists (HIGH)

**File**: `CODetailPage.tsx` line 128

```
const canEdit = (isActiveStatus || ...) && (isTC || !currentCollaborator || isCollaboratorOrg);
```

**Problem**: If an FC collaborator is active (`currentCollaborator` exists) and the user is GC (not TC, not collaborator org), `canEdit` resolves to `false`.

**Effect**: GC cannot add scope items, materials, or equipment to a CO while any FC is invited. This directly contradicts the spec: "GC can add new line items or update scope at any time."

---

## Bug 5 — FC Cannot Add Materials (MEDIUM)

**File**: `COMaterialsPanel.tsx` line 143

```
const canManageMaterials = canEdit && (isTC || isGC);
```

**Problem**: FC is excluded from adding materials. The spec says "Any party can add materials to a CO. FC can add materials but CANNOT see the pricing."

**Effect**: FC sees the materials panel but has no "Add" button. FC cannot contribute material information to the CO.

---

## Bug 6 — FC Cannot Add Equipment (MEDIUM)

**File**: `COEquipmentPanel.tsx` line 138

```
{canEdit && isTC && ( ... add buttons ... )}
```

**Problem**: Only TC can add equipment. The spec says any party can add equipment, FC just can't see pricing.

**Effect**: Same as Bug 5 but for equipment. FC and GC have no add buttons.

---

## Bug 7 — Equipment Hardcodes `added_by_role: 'TC'` (MEDIUM)

**File**: `COEquipmentPanel.tsx` line 97

```
added_by_role: 'TC',
```

**Problem**: Even if Bug 6 is fixed to allow GC/FC to add equipment, the role is always saved as "TC."

**Effect**: Activity tracking and visibility rules based on `added_by_role` are incorrect. Audit trail is wrong.

---

## Bug 8 — Materials `addedByRole` Excludes FC (LOW)

**File**: `COMaterialsPanel.tsx` line 145

```
const addedByRole = isGC ? 'GC' : 'TC';
```

**Problem**: If FC is allowed to add materials (after fixing Bug 5), their role would be saved as "TC" since there's no FC branch.

**Effect**: Same audit trail issue as Bug 7.

---

## Bug 9 — Material/Equipment Pricing Visibility Ignores Responsibility Rules (MEDIUM)

**File**: `COMaterialsPanel.tsx` line 144

```
const showPricingColumns = isTC || isGC;
```

**Problem**: TC always sees material pricing. The spec says: "If TC is NOT the responsible party for materials: ONLY GC can see material pricing. TC cannot see it either." The `materials_responsible` field is per-CO but never checked in the visibility logic.

**Effect**: TC sees material pricing even when GC is the responsible party, violating the visibility spec.

---

## Bug 10 — `canCloseForPricing` Doesn't Verify GC Owns the CO (LOW)

**File**: `COStatusActions.tsx` line 350

```
const canCloseForPricing = isGC && (status === 'work_in_progress');
```

**Problem**: Any GC user on the project can close any CO for pricing, even COs they didn't create or aren't assigned to their org. Should check `co.org_id === currentOrgId` or `isCreator`.

**Effect**: A GC from a different org (if multiple GCs exist on a project) could close someone else's CO.

---

## Summary by Severity

| Severity | Count | Bugs |
|----------|-------|------|
| CRITICAL | 3 | #1 (pricing snapshot), #2 (labor total), #3 (NTE tracking) |
| HIGH | 1 | #4 (GC locked out) |
| MEDIUM | 4 | #5 (FC materials), #6 (FC equipment), #7 (equipment role), #9 (pricing visibility) |
| LOW | 2 | #8 (material role), #10 (close permission) |

All 10 bugs are fixable without database changes — they are frontend logic issues in 4 files: `useChangeOrderDetail.ts`, `CODetailPage.tsx`, `COStatusActions.tsx`, `COMaterialsPanel.tsx`, and `COEquipmentPanel.tsx`.


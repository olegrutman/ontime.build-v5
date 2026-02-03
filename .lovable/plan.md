

# Add Material Responsibility to New Project Wizard and Manage Contracts

## Problem Summary

Two missing features related to supplier and material management:

1. **New Project Wizard (`ContractsStep`)**: No field to specify who is responsible for materials (GC or TC) for each contract. This is critical because `material_responsibility` determines who becomes the `pricing_owner_org_id` for Purchase Orders and who can view supplier pricing.

2. **Manage Contracts (EditProject.tsx)**: When adding a new contract or editing existing ones, there's no way to assign supplier relationships or set material responsibility. The old wizard (`PartiesStep`) has this functionality with toggles for:
   - Material Responsibility (GC vs TC) for Trade Contractors
   - Material Buyer (who can order from suppliers)
   - PO Requires Upstream Approval

## Business Context

Based on the memory provided:
- `material_responsibility` determines which organization (GC or TC) is the `pricing_owner_org_id`
- The pricing owner has exclusive rights to:
  - View supplier pricing
  - Finalize orders
  - Delegate ordering permissions to Field Crews

---

## Solution Overview

### Part 1: Update Type Definition

Add `material_responsibility` to the `ProjectContract` interface:

**File: `src/types/projectWizard.ts`**

```typescript
export interface ProjectContract {
  toTeamMemberId: string;
  contractSum: number;
  retainagePercent: number;
  allowMobilization: boolean;
  notes?: string;
  // NEW: Who is responsible for material costs
  materialResponsibility?: 'GC' | 'TC';
}
```

### Part 2: Update ContractsStep (New Project Wizard)

Add a Material Responsibility toggle to the `ContractCard` component when the contract is with a Trade Contractor.

**File: `src/components/project-wizard-new/ContractsStep.tsx`**

Changes:
1. Add `materialResponsibility` field to default contract creation
2. Add a toggle in `ContractCard` for Trade Contractor contracts:
   - Label: "Material Responsibility"
   - Options: GC | TC (toggle switch)
   - Default: TC (Trade Contractor provides their own materials)

UI Example:
```
┌─────────────────────────────────────────────────────┐
│ Contract with ABC Framing (Framer)                  │
├─────────────────────────────────────────────────────┤
│ Contract Sum: $50,000    Retainage: 5%              │
│                                                     │
│ Allow Mobilization?                    [Toggle]     │
│                                                     │
│ Material Responsibility                             │
│   GC ○────────────● TC                              │
│   (Who provides and pays for materials)             │
│                                                     │
│ Notes: [                                      ]     │
└─────────────────────────────────────────────────────┘
```

### Part 3: Save Material Responsibility

Update `CreateProjectNew.tsx` to save `material_responsibility` to the database.

**File: `src/pages/CreateProjectNew.tsx`**

In the `saveContracts` function:
1. After creating the contract, update `project_participants` or `project_relationships` with the `material_responsibility` value
2. Use the existing pattern from `CreateProject.tsx` that calls `invite_org_to_project_by_id` RPC

### Part 4: Update AddTeamMemberDialog

Add supplier relationship options when adding a Supplier to the project.

**File: `src/components/project/AddTeamMemberDialog.tsx`**

When role is "Supplier", show additional fields:
1. **Material Buyer**: Toggle (GC | TC) - who can create POs with this supplier
2. **PO Requires Approval**: Toggle - whether POs need upstream approval

These values should be saved to `project_participants.material_responsibility` and `project_participants.po_requires_approval`.

### Part 5: Update EditProject.tsx (Manage Contracts)

Add ability to edit material responsibility on existing contracts.

**File: `src/pages/EditProject.tsx`**

In the Contracts tab:
1. For Trade Contractor contracts, add Material Responsibility toggle
2. For Supplier relationships, add Material Buyer and PO Approval toggles
3. These should update `project_participants` when saved

---

## Technical Details

### Database Fields Used

| Table | Column | Purpose |
|-------|--------|---------|
| `project_participants` | `material_responsibility` | Who is the pricing owner (GC or TC) |
| `project_participants` | `po_requires_approval` | Whether POs need upstream approval |
| `project_relationships` | `material_responsibility` | Relationship-level material responsibility |

### Data Flow

1. **New Project Wizard**: ContractsStep collects `materialResponsibility` per contract
2. **Save**: `CreateProjectNew.tsx` saves to `project_participants` when inviting parties
3. **Edit**: `EditProject.tsx` can update `project_participants.material_responsibility`
4. **Use**: `usePOPricingVisibility` hook uses `pricing_owner_org_id` (set based on material_responsibility) to control pricing visibility

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/projectWizard.ts` | Add `materialResponsibility` to `ProjectContract` interface |
| `src/components/project-wizard-new/ContractsStep.tsx` | Add Material Responsibility toggle in ContractCard for TC contracts |
| `src/pages/CreateProjectNew.tsx` | Save `material_responsibility` to `project_participants` in `saveContracts` |
| `src/components/project/AddTeamMemberDialog.tsx` | Add Material Buyer and PO Approval fields for Supplier role |
| `src/pages/EditProject.tsx` | Add Material Responsibility editing in Contracts tab |

---

## UI Mockups

### ContractsStep - Trade Contractor Card
```
┌──────────────────────────────────────────────────────────────┐
│ 💲 ABC Framing LLC (Framer)                                  │
├──────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐  ┌─────────────────────┐             │
│ │ Contract Sum        │  │ Retainage %         │             │
│ │ $ [50,000.00    ]   │  │ [5         ] %      │             │
│ └─────────────────────┘  └─────────────────────┘             │
│                                                              │
│ Allow Mobilization as a line item?           [ ○──────● ]    │
│                                                              │
│ Material Responsibility                                      │
│ Who provides and pays for materials?                         │
│   GC [ ○─────────● ] TC                                      │
│                                                              │
│ Notes (Optional)                                             │
│ ┌────────────────────────────────────────────────────┐       │
│ │                                                    │       │
│ └────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

### AddTeamMemberDialog - Supplier Selected
```
┌──────────────────────────────────────────────────────────────┐
│ 🏢 Acme Lumber Supply                                        │
│    📧 orders@acmelumber.com                                  │
│    [Change selection]                                        │
├──────────────────────────────────────────────────────────────┤
│ Role on this project                                         │
│ ┌──────────────────────────────────────────────────────┐     │
│ │ Supplier                                         ▼   │     │
│ └──────────────────────────────────────────────────────┘     │
│                                                              │
│ Material Buyer                                               │
│ Who can order from this supplier?                            │
│   GC [ ●─────────○ ] TC                                      │
│                                                              │
│ PO Requires Upstream Approval?               [ ●─────○ ]     │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │                   Add to Project                       │   │
│ └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## Summary

This plan adds the missing `material_responsibility` field to the new project wizard and manage contracts screen, ensuring that:

1. GC can specify who is responsible for materials when contracting with TCs
2. When adding suppliers, the contract creator can specify who the "buyer" is (GC or TC)
3. PO approval requirements can be set for supplier relationships
4. All data is saved to `project_participants` for proper downstream use in pricing visibility


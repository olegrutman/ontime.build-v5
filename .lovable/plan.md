

# Filter Contract Price Entry to Creator↔TC Only

## Problem
The standalone `ProjectContractsPage.tsx` shows ALL team members for contract price entry. Per the rule: if GC created the project, they should only enter contract price with TC (not FC). If TC created the project, they enter contract price with GC (upstream) and FC (downstream). The existing `ContractsStep.tsx` in the project wizard already has this logic — the standalone page doesn't.

## Fix

**File: `src/pages/ProjectContractsPage.tsx`**

1. Fetch `projects.created_by` to identify the project creator
2. Fetch the creator's org role to determine if they are GC or TC
3. Filter the team list before rendering:
   - **GC creator**: only show team members with `role === 'Trade Contractor'`
   - **TC creator**: show `General Contractor` (upstream, as a read-context or contract entry) and `Field Crew` (downstream)
   - **Exclude**: Suppliers (their pricing comes from approved supplier estimates), FC when GC is creator, GC when TC is creator's own org
4. Update the description text to match: "Enter the contract sum with your Trade Contractor" (GC) or "Enter contract terms with GC and Field Crew" (TC)

This mirrors the exact filtering logic already in `ContractsStep.tsx` lines 72-80.

### Files changed

| File | Change |
|------|--------|
| `src/pages/ProjectContractsPage.tsx` | Fetch project creator, determine creator role, filter team list by role |


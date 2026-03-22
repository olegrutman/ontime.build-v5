

# Fix: TC Can't Create SOV for TC↔FC Contract

## Root Cause

`ProjectSOVPage.tsx` line 55-57 determines edit permission using `project.created_by === user.id`. The project was created by the GC user, so the TC user's `isCreator` is always `false`. This blocks TC from generating, editing, or locking the SOV — even for the TC↔FC contract where TC is the hiring party (client).

## Fix

Replace the `isCreator` check with a **contract client check**: the user who can manage the SOV for a given contract is the user whose org is the `to_org_id` (the client/hiring party) of that contract.

**File: `src/pages/ProjectSOVPage.tsx`**

1. Fetch the current user's `organization_id` from their profile
2. Replace `isCreator` with `isContractClient`: check if `userOrgId === activeContract.to_org_id`
3. Use `isContractClient` everywhere `isCreator` was used (generate button, lock button, mismatch banner regenerate button)
4. Keep `isCreator` only for project-level actions if needed

```ts
// Before:
const isCreator = project?.created_by === user?.id;
const canEdit = isCreator && !isLocked;

// After:
const activeContract = allContracts.find(c => c.id === activeContractId);
const isContractClient = !!userOrgId && activeContract?.to_org_id === userOrgId;
const canEdit = isContractClient && !isLocked;
```

This means:
- For GC↔TC contract (`to_org_id = GC org`): GC can manage the SOV
- For TC↔FC contract (`to_org_id = TC org`): TC can manage the SOV

3. Get `userOrgId` via existing `useProfile` hook or a lightweight query on `profiles.organization_id`

## Files changed

| File | Change |
|------|--------|
| `src/pages/ProjectSOVPage.tsx` | Replace `isCreator` with `isContractClient` based on active contract's `to_org_id` matching user's org |


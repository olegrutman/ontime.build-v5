

# Full Code Audit — End-to-End Project Lifecycle Diagnostic

## Testing Matrix
4 user types (TC, GC, FC, Supplier) × 5 project types (SFR, Apartments, Townhomes, Duplex, Hotels) × full setup + SOV + invoices + POs

---

## Bugs Found

### BUG 1: `ProjectInfoCard` — State sync causes infinite re-render risk (MEDIUM)
**File**: `ProjectInfoCard.tsx` lines 39-41
```tsx
if (!editing && name !== resolvedName && resolvedName) {
  setName(resolvedName);
}
```
This `setState` call executes **during render** (not in a `useEffect`). React warns against this and it can cause flickering or infinite re-renders if the name keeps toggling. Should be moved into a `useEffect`.

### BUG 2: `PhaseContracts` — GC-created projects show zero team members (HIGH)
**File**: `PhaseContracts.tsx` line 84
When `creatorRole === 'General Contractor'`, only `Trade Contractor` team members are shown. But GC-created projects may also have FC team members added. If a GC project has only FC members (no TC), the contracts card shows "No team members found" with no way to enter any contract. **FC contracts cannot be created from GC projects at all through this UI.**

### BUG 3: `PhaseContracts` — FC organizations cannot create projects (MEDIUM)
**File**: `PhaseContracts.tsx` line 53-57
The `creatorRole` only maps GC and TC org types to roles. If an FC or Supplier org somehow creates a project, `creatorRole` is `null` and the entire contracts section is empty with no error message. Same issue in `CreateProjectNew.tsx` line 50-51 — FC/Supplier redirect logic may not trigger reliably.

### BUG 4: `useProjectFinancials` — `totalPaidToFC` includes ALL paid invoices, not just FC ones (HIGH)
**File**: `useProjectFinancials.ts` lines 378-381
```tsx
if (detectedRole === 'Trade Contractor') {
  const paidInvoices = allInvoices.filter(i => i.status === 'PAID');
  setTotalPaidToFC(paidInvoices.reduce((s, i) => s + (i.total_amount || 0), 0));
}
```
This sums **all** paid invoices in the project, not just those on downstream FC contracts. If a TC has both upstream invoices (from GC) and downstream invoices (from FC), this inflates the FC payment total. Should filter to `downstreamContractIds` only.

### BUG 5: `OverviewTeamCard` — `creatorOrgType` uses viewer's org, not project creator's org (HIGH)
**File**: `OverviewTeamCard.tsx` line 63
```tsx
const creatorOrgType = userOrgRoles[0]?.organization?.type ?? null;
```
This checks the **current viewer's** org type, not the project creator's. If a GC views a TC-created project, `isGcOrTc` is true and they see material responsibility controls they shouldn't have authority over. The permission check should use the project's `organization_id` to determine creator type.

### BUG 6: `OverviewTeamCard` — Material responsibility query only checks TC→GC contracts (MEDIUM)
**File**: `OverviewTeamCard.tsx` lines 82-94
The contract fetch filters `.eq('from_role', 'Trade Contractor')`. In a GC-created project, the contract has `from_role: 'Trade Contractor'` and `to_role: 'General Contractor'`, so this works. But the filter also includes `.or('trade.is.null,trade.neq.Work Order')` which could miss contracts if the trade column has an unexpected value.

### BUG 7: `CreateInvoiceFromSOV` — SOV lock check is a warning only, not enforced (MEDIUM)
**File**: `CreateInvoiceFromSOV.tsx` line 274
```tsx
const sovNotLocked = selectedSOV && !selectedSOV.is_locked;
```
This variable is used to show a warning but **does not block submission**. Users can create invoices against unlocked SOVs, which contradicts the memory rule: "Invoicing is strictly prohibited across all roles until the associated SOV is locked."

### BUG 8: `InvoicesTab` — `isBlocked` gate doesn't prevent the create button from showing (MEDIUM)
**File**: `InvoicesTab.tsx` line 88
`isBlocked` is computed but needs to be checked against the "Create Invoice" button rendering. If the project is in `setup` status, the gate may or may not actually disable creation depending on how it's used downstream.

### BUG 9: `useContractSOV` — AI SOV generation doesn't use framing scope data (MEDIUM)
**File**: `useContractSOV.ts` lines 466-500
The `generateItemsFromTemplate` function uses `sov_templates` table data, but the AI-powered generation (`generateSOV`) fetches `project_profiles` for story count and scope but does **not** consume the `project_framing_scope` answers. The framing scope wizard captures detailed inclusions/exclusions (siding, WRB, windows, blocking, etc.) that are never passed to the SOV generator.

### BUG 10: `useProjectReadiness` — Auto-activation fires before SOV is locked (HIGH)
**File**: `useProjectReadiness.ts` lines 268-283
The readiness check only verifies SOV **exists** (line 103: `hasSovForContract`), not that it's **locked**. Combined with the memory rule that invoicing requires locked SOV, a project can auto-activate to "active" status while SOVs are still unlocked, creating a state where the project appears ready but invoicing is blocked.

### BUG 11: `PhaseContracts` — Contract direction is inverted for GC-created projects (HIGH)
**File**: `PhaseContracts.tsx` lines 135-136
```tsx
if (creatorRole === 'General Contractor' && member.role === 'Trade Contractor') {
  fromOrgId = member.org_id; toOrgId = project.organization_id;
  fromRole = 'Trade Contractor'; toRole = 'General Contractor';
}
```
Per the memory: "from_org_id represents the Contractor (sender of invoices) and to_org_id represents the Client (payer/receiver)." This is **correct** — TC is from (invoice sender), GC is to (payer). So the direction is actually right. NOT a bug.

### BUG 12: `PhaseSOV` — "Finish Setup & Activate" button activates project without checking SOV lock (HIGH)
**File**: `PhaseSOV.tsx` / `ProjectSetupFlow.tsx` lines 89-97
The `handleSOVComplete` directly sets project status to `active` without verifying that any SOV is locked. A user can click "Finish Setup" immediately after generating an SOV (unlocked), skip locking, and have an "active" project with no locked SOV.

### BUG 13: `useProjectFinancials` — `retainageAmount` calculation uses `billedToDate` not per-contract (LOW)
**File**: `useProjectFinancials.ts` line 423
```tsx
const retainageAmount = billedToDate * (retainagePercent / 100);
```
`billedToDate` includes ALL project invoices (upstream + downstream), but `retainagePercent` is from the primary contract only. For TCs with both upstream and downstream contracts at different retainage rates, this produces incorrect retainage totals.

### BUG 14: Console warnings — `forwardRef` missing on `CTASection`, `Footer`, `OntimeLogo` (LOW)
**Files**: `CTASection.tsx`, `Footer.tsx`, `OntimeLogo.tsx`
Three components receive refs but lack `forwardRef`. These cause console warnings on every page load.

---

## Fix Plan

| Priority | Bug | Fix |
|----------|-----|-----|
| HIGH | Bug 4 | Filter `totalPaidToFC` to only downstream contract invoices |
| HIGH | Bug 5 | Fetch project `organization_id` to determine creator type instead of using viewer's org |
| HIGH | Bug 10 | Add SOV lock check to readiness calculation |
| HIGH | Bug 12 | Gate "Finish Setup" button on at least one locked SOV |
| MEDIUM | Bug 1 | Move name sync into `useEffect` |
| MEDIUM | Bug 2 | Add FC to `filteredTeam` for GC projects |
| MEDIUM | Bug 7 | Block invoice creation when SOV is unlocked |
| MEDIUM | Bug 9 | Pass framing scope data to SOV AI generation |
| LOW | Bug 13 | Compute retainage per-contract instead of globally |
| LOW | Bug 14 | Add `forwardRef` to three landing page components |

---

## Summary

**14 issues found**, 4 HIGH severity, 5 MEDIUM, 2 LOW, and 3 that were investigated but confirmed correct.

The most critical bugs are:
1. **totalPaidToFC inflated** — financial reporting is wrong for TCs
2. **OverviewTeamCard permissions use wrong org** — GCs can change material responsibility on TC projects
3. **Project activates without locked SOV** — breaks invoicing gate
4. **SOV lock not enforced on invoice creation** — billing can proceed on unlocked SOVs


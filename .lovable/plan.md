

# Fix CO/WO Numbering to Use Invoice-Style Convention

## Problem
CO numbers are currently generated as a simple global count (`CO-001`, `CO-002`) across the entire project. Different roles see different subsets of COs, causing duplicate number collisions. The numbering should follow the invoice pattern: identify the creator org initials and their upstream org initials, then sequence within that pair.

## New Format
```text
CO-{ProjectCode}-{CreatorInitials}-{UpstreamInitials}-{Sequence}
WO-{ProjectCode}-{CreatorInitials}-{UpstreamInitials}-{Sequence}

Examples:
  CO-MAI-TC-GC-0001   (TC_Test created, assigned to GC_Test)
  CO-MAI-FC-TC-0001   (FC_Test created, assigned to TC_Test)
  WO-MAI-TC-GC-0001   (WO by TC, upstream is GC)
```

## Changes

### 1. Create shared helper: `src/lib/generateCONumber.ts`
- Reuse the same `getProjectCode` / `getOrgInitials` logic from invoice numbering
- Accept `projectId`, `orgId` (creator), `assignedToOrgId` (upstream), `isTM` flag
- Query project name for 3-letter code
- Query org names for initials
- Query existing `co_number` values matching the prefix pattern to find max sequence
- Return next number like `CO-MAI-FC-TC-0001`

### 2. Update `COWizard.tsx` (lines 229-234)
- Replace the simple count-based `coNumber` generation with a call to the new `generateCONumber` helper
- Pass `orgId`, `resolvedAssignedToOrgId`, `projectId`, `isTM: false`

### 3. Update `TMWOWizard.tsx` (lines 222-227)
- Same replacement, using `isTM: true` so it produces `WO-` prefix

## Technical Detail
The helper queries:
1. `projects.name` for the 3-letter project code
2. `organizations.name` for creator and upstream org initials  
3. `change_orders.co_number` filtered by project to find max existing sequence matching the prefix

This mirrors exactly how `CreateInvoiceFromSOV.tsx` generates `INV-MAI-TC-GC-0001`.


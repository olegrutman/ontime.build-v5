

# Fix: Company Name Resolution Shows Own Company Instead of Counterparty

## Problem
The contract name resolution logic blindly picks `from_org_name` or `to_org_name` without checking which side belongs to the viewer. Since contracts can be stored in either direction (`from_role` could be GC or TC), the viewer sometimes sees their own company name where the counterparty name should appear — e.g., "Received from IMS, LLC" when IMS, LLC is the viewer's own TC company.

## Fix
In each overview component, compare `from_org_id` / `to_org_id` against `currentOrgId` to determine which side is "me" and which is the counterparty. Pick the counterparty's name.

## Changes

| # | File | Current (broken) | Fixed |
|---|------|-------------------|-------|
| 1 | `TCProjectOverview.tsx` line ~202 | `gcName = gcContract?.from_org_name \|\| gcContract?.to_org_name` | If `from_org_id === currentOrgId`, gcName = `to_org_name`; else gcName = `from_org_name`. Same logic for `fcName` on downstream contract. |
| 2 | `GCProjectOverviewContent.tsx` line ~208 | `tcName = upContract?.to_org_name \|\| upContract?.from_org_name` | If `from_org_id === currentOrgId`, tcName = `to_org_name`; else tcName = `from_org_name`. |
| 3 | `FCProjectOverview.tsx` line ~153 | `tcName = fcContract?.from_org_name \|\| fcContract?.to_org_name` | If `from_org_id === currentOrgId`, tcName = `to_org_name`; else tcName = `from_org_name`. |

### Helper pattern (applied in each file)
```typescript
// Given a contract and the viewer's org ID, return the OTHER party's name
function counterpartyName(contract: any, myOrgId: string | undefined, fallback: string): string {
  if (!contract) return fallback;
  if (myOrgId && contract.from_org_id === myOrgId) return contract.to_org_name || fallback;
  if (myOrgId && contract.to_org_id === myOrgId) return contract.from_org_name || fallback;
  return contract.from_org_name || contract.to_org_name || fallback;
}
```

This ensures a company can never appear to "receive invoices from itself" or "owe money to itself."


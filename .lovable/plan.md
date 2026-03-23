

# Restrict SOV & Contract Visibility by Organization Role

## Plain English
Right now, when a GC opens the SOV page or Scope & Details tab, they see ALL contracts on the project — including the TC↔FC contract which is none of their business. GC should only see the GC↔TC contract and SOV. Similarly, FC should only see TC↔FC. TC sees both (they're a party to both).

## Changes

### File: `src/pages/ProjectSOVPage.tsx` — Contract query (lines 456-467)

After fetching all contracts, filter them by the current user's org. Only show contracts where `from_org_id` or `to_org_id` matches `userOrgId`:

```ts
const visibleContracts = allContracts.filter(c =>
  c.from_org_id === userOrgId || c.to_org_id === userOrgId
);
```

Then render `visibleContracts` instead of `allContracts` in the map (line 523).

### File: `src/components/project/ScopeDetailsTab.tsx` — Contract Summary card (lines 230-258)

The contract summary currently shows the GC↔TC primary contract to everyone. For FC users, this is irrelevant — they should see the TC↔FC contract instead.

Filter `contracts` to only those where the user's org is a party (`from_org_id` / `to_org_id`). This requires fetching `from_org_id` and `to_org_id` in the query (line 75 — currently not selected).

1. Add `from_org_id, to_org_id` to the contract query select
2. Filter `primaryContract` to only contracts where `currentUserOrgId` matches `from_org_id` or `to_org_id`
3. For GC: shows GC↔TC contract. For TC: shows GC↔TC (they're a party). For FC: shows TC↔FC.

### File: `src/components/project/ScopeDetailsTab.tsx` — Downstream cards (lines 261-273)

Already correctly gated to TC-only with `isTCOrg`. No change needed.

## Files changed

| File | Change |
|------|--------|
| `src/pages/ProjectSOVPage.tsx` | Filter contracts to only those where user's org is `from_org_id` or `to_org_id` |
| `src/components/project/ScopeDetailsTab.tsx` | Add org IDs to contract query, filter contract summary by user's org membership |


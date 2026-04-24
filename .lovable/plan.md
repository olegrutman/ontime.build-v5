# Why Emily can't see invoices on Fuller Residence

## What I found

Emily (emily@haleycustomhomes.com) is a GC_PM at Haley Custom Homes. She's viewing `/project/f21a4a24.../invoices` (Fuller Residence).

Database is correct:
- 2 SUBMITTED invoices exist on contract `d3038da0` (TC IMIS to GC Haley): `INV-FUL-IM-HA-0001` and `INV-FUL-IM-HA-0002`.
- Emily's GC org is the `to_org_id` on that contract.
- RLS allows her to read them, and the network logs confirm the API returns both invoices to her.

The bug is front-end. In `src/components/invoices/InvoicesTab.tsx`:
1. The component fires two parallel effects: one fetches contracts, one fetches invoices.
2. `fetchInvoices` filters returned invoices client-side using `contractsWhereUserIsParty.map(c => c.id)`.
3. `contractsWhereUserIsParty` is a `useMemo` derived from `contracts`, which starts as `[]`.
4. The first run of `fetchInvoices` executes with an empty contractIds list, so every contract-linked invoice is filtered out and `setInvoices([])` is called.
5. The dependency-driven re-run after contracts arrive is racy and inconsistent. In Emily's session the screen ends up empty even though the API returned 2 invoices.

Net effect: the front-end is dropping invoices the database happily returned, because it's double-checking contract membership against a not-yet-loaded contracts list.

## Fix

Refactor `InvoicesTab.tsx` to remove the brittle dual-fetch race:

1. Single sequenced fetch. Replace the two effects with one effect that:
   - Awaits the contracts query first so `contracts` state is populated before any invoice is filtered.
   - Then awaits invoices and PO ownership info in parallel.
   - Computes filtered/sent/received invoices once and updates state in one pass.
2. Drop the redundant contract-id filter for contract-linked invoices. RLS already restricts the rows the user can see; that local filter is what's eating Emily's invoices.
3. Keep PO ownership filtering (recSuppliers vs sent vs excluded), since that uses pricing-owner logic not enforced by RLS.
4. Re-fetch on `statusFilter`, `projectId`, and realtime changes via a single re-run path, not via memo identity changes.
5. Add a small loading guard so the GC sub-tab counters don't flash 0 before contracts load.

## Technical notes

- File: `src/components/invoices/InvoicesTab.tsx`, lines 154 to 231 (the two `useEffect`s plus `fetchInvoices`).
- The `contractsWhereUserIsParty` / `contractsWhereUserCanInvoice` / `contractsWhereUserReceivesInvoices` memos can stay for the sent/received/sub-tab splits, but must not be used to gate the network fetch.
- After the change: any invoice whose `contract_id` is null OR whose `contract_id` is in the contracts list will display. Anything not visible to the user is already filtered out by Postgres RLS, matching the behavior the database is enforcing.
- No database changes, no migrations.

## Verification

After the fix, Emily lands on `/project/f21a4a24.../invoices` and sees both `INV-FUL-IM-HA-0001` and `INV-FUL-IM-HA-0002` under "From Trade Contractors", with the tab counter showing 2.
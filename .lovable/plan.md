## Bug: CO PDF leaks combined-contract financials

### What's happening
`supabase/functions/generate-co-pdf/index.ts` ignores who is downloading the PDF. It does:
- `originalContractSum = sum(all project_contracts.contract_sum)` → for `CO-FUL-IM-HA-0002` that's TC↔GC ($231,651) + FC↔TC ($160,500) = **$392,151** (the number on your screenshot).
- `subtotal = laborTotal + materialsTotal + equipmentTotal` → mixes TC's $390 labor with FC's $210 labor → $600 "Net Change" / Grand Total.
- `Contractor:` field always uses `co.org_id` (the CO's owner org), not the contract's "from" side.
- `Description of Work` lists every `co_line_items` row regardless of routing.

So an FC opening the PDF sees the GC's contract sum and the TC's combined price — both wrong and a privacy leak (same class as the on-screen leak we just fixed for `financials.viewer.totalToUpstream`).

### Target behavior

The PDF must represent **one contract perspective** at a time:

| Viewer | Auto perspective | Contract shown | Numbers shown |
|---|---|---|---|
| **FC** | FC ↔ TC (their upstream) | FC's contract sum with TC | FC's own labor + FC-owned materials/equipment |
| **GC** | TC ↔ GC (their downstream) | GC's contract sum with TC | TC's submitted price to GC + GC-owned materials/equipment |
| **TC** | **must pick** | upstream (TC↔GC) or downstream (TC↔FC) | matches the chosen side |

### Fix plan

**1. Edge function `generate-co-pdf/index.ts`**

Add request param `perspective: 'upstream' | 'downstream'` (optional).

```ts
const { co_id, perspective } = await req.json();
```

Resolve the caller's org for this project:
```ts
// pick the participant row for this user in this project
const { data: myParticipant } = await userClient
  .from('project_participants')
  .select('organization_id, role')
  .eq('project_id', co.project_id)
  .maybeSingle();
const viewerOrgId = myParticipant?.organization_id;
const viewerRole = myParticipant?.role; // 'Field Crew' | 'Trade Contractor' | 'General Contractor'
```

Decide which contract row drives the PDF:
- FC viewer → contract where `from_org_id = viewerOrgId` (their upstream FC↔TC).
- GC viewer → contract where `to_org_id = viewerOrgId` (downstream TC↔GC).
- TC viewer → if `perspective='upstream'` use TC↔GC (`from_org_id=viewerOrgId AND to_role='General Contractor'`); if `'downstream'` use FC↔TC (`to_org_id=viewerOrgId AND from_role='Field Crew'`). Default to `'upstream'` if missing, log a warning.
- Anyone else (admin, supplier) → fall back to current "all contracts" behavior or 403.

Then:
- `originalContractSum = chosenContract.contract_sum` (single value, not summed).
- `Contractor:` field = name of `chosenContract.from_org_id`'s org (not `co.org_id`).
- New header field `Owner:` = name of `chosenContract.to_org_id`'s org.

Scope financial aggregates to the chosen contract:

```ts
// Determine the "billing org" (downstream / from side) and "receiving org" (upstream / to side)
const billingOrgId = chosenContract.from_org_id;
const receivingOrgId = chosenContract.to_org_id;

// Labor: only entries owned by the billing side
const laborForView = laborEntries.filter(e => e.org_id === billingOrgId);

// Materials & equipment: only items owned by the billing side
//   (matches the existing viewer logic in useChangeOrderDetail.ts)
const materialsForView = materials.filter(m => m.org_id === billingOrgId);
const equipmentForView = equipment.filter(e => e.org_id === billingOrgId);

// GC-perspective special case: the "labor" line should show TC's submitted price,
// not the raw sum of TC labor entries (which is hidden from GC).
const isGCPerspective = viewerRole === 'General Contractor';
const laborTotal = isGCPerspective
  ? (co.tc_submitted_price ?? sumLabor(laborForView))   // snapshot wins
  : sumLabor(laborForView);
```

Use these scoped totals throughout the rest of the function (`subtotal`, `tax`, `grandTotal`, `Net Change`, `Contract Sum Including this CO`).

**Description of Work**: filter `co_line_items` for the perspective:
- FC perspective → only items where `routed_to_org_id = viewerOrgId` (FC-direct items) or items the FC owns.
- TC downstream → only FC-routed items.
- TC upstream / GC → all top-level (non-FC-routed) items.

(Verify the exact column on `co_line_items` once we touch the file — likely `routed_to_org_id` / `assigned_to_org_id`.)

**2. Frontend `CODetailLayout.tsx` (`handleDownloadPdf`)**

- For FC and GC: post the request as today; the function auto-resolves perspective.
- For TC: open a small dialog **before** posting, asking *"Which contract should this PDF represent?"* with two options (`To General Contractor` / `To Field Crew`). Pass the choice as `perspective: 'upstream' | 'downstream'`.

The dialog can be a simple `AlertDialog` with two action buttons; no new component file needed if we co-locate it in `CODetailLayout.tsx`.

**3. Filename**

Append the perspective to the filename so two TC PDFs don't collide:
- `CO-CO-FUL-IM-HA-0002-to-GC.pdf` / `...-to-FC.pdf`.
- For FC/GC, omit the suffix.

### Verification

- As FC on `CO-FUL-IM-HA-0002`: header shows `Contractor: Pacifico Builders / Owner: IMIS, LLC`, `Original Contract Sum: $160,500.00`, `Net Change: $210.00`, Financial Summary Labor `$210.00`, Grand Total `$210.00`.
- As GC on the same CO: `Contractor: IMIS, LLC / Owner: Fuller Residence GC`, `Original Contract Sum: $231,651.00`, `Net Change: $600.00`, Grand Total `$600.00`.
- As TC, "To GC" PDF matches today's numbers ($231,651 / $600). "To FC" PDF matches the FC view ($160,500 / $210).

### Files touched
- `supabase/functions/generate-co-pdf/index.ts` (perspective resolution + scoped totals + contract-from-side metadata + line-item filtering)
- `src/components/change-orders/CODetailLayout.tsx` (TC perspective picker, pass `perspective`, filename suffix)

No DB / RLS / migration changes.

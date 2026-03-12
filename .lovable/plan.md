

# Bug Report: Dashboard Project Card Shows Mixed Financial Directions for TC Users

## The Core Problem

The TC user (IMIS, LLC) logged in right now has org ID `12ba4ad9`. The project has two contracts:

- **Contract A** (TC→GC): IMIS bills GC for $150K — this is **money coming in** (receivable)
- **Contract B** (FC→TC): Pacifico bills IMIS for $100K — this is **money going out** (payable)

The current filter at line 129 keeps both contracts because the TC's orgId appears in both (`from_org_id` on A, `to_org_id` on B). This is technically correct for "contracts where this org is a party" but **completely wrong for financial summaries** because it mixes receivables and payables into one number.

## What the User Sees Now (Wrong)

| Metric | Current Value | How It Got There |
|--------|--------------|------------------|
| Budget | **$250,000** | $150K (TC→GC) + $100K (FC→TC) — meaningless sum |
| Total Billed | **$38,313** | $21,250 (TC's invoice to GC) + $3,250 (FC's invoice to TC) + $13,813 (FC's paid invoice to TC) |
| Outstanding | **$24,500** | Mixes money TC is owed BY the GC with money TC owes TO the FC |
| Unpaid Invoices action | **2 invoices, $24,500** | Combines "invoice I sent to GC" with "invoice FC sent to me" — completely different actions |

## What the User Should See

The dashboard card should show the TC's **receivable position** — their contract with the GC and the invoices they sent:

| Metric | Correct Value | Why |
|--------|--------------|-----|
| Budget | **$150,000** | Only the TC→GC contract (where TC is the contractor) |
| Total Billed | **$21,250** | Only invoices TC sent to GC (contract `32ca9a85`) |
| Outstanding | **$21,250** | Nothing paid yet on TC's invoices to GC |
| Action: "Invoices awaiting payment" | **1 invoice, $21,250** | Only invoices TC sent |
| Action: "Invoices to review" | **1 invoice, $3,250** | FC's invoice that TC needs to approve (separate action) |

## The Fix

**In `useProjectQuickStats.ts`:**

1. **Split contracts by direction.** Instead of one `contracts` array, create two:
   - `sentContracts` = contracts where `from_org_id === orgId` (TC is the contractor — receivables)
   - `receivedContracts` = contracts where `to_org_id === orgId` (TC is the client — payables)

2. **Budget and billing metrics should use `sentContracts` only.** The budget represents the TC's contract value with their client (GC). Invoices linked to sent contracts are the TC's receivables.

3. **Split invoice action items.** For TC/FC org types:
   - "Invoices awaiting payment" = SUBMITTED/APPROVED invoices on `sentContracts` (money owed TO the TC)
   - "Invoices to review" = SUBMITTED invoices on `receivedContracts` (money the TC owes, needs to approve)

4. **Outstanding billing** should only count invoices on sent contracts.

### Code changes in `useProjectQuickStats.ts`:

**Lines 127-161** — Replace the single contract/invoice filter with directional logic:

```typescript
if (orgId) {
  // Receivable contracts: where this org is the contractor (from_org_id)
  const sentContracts = allContracts.filter(c => c.from_org_id === orgId);
  // Payable contracts: where this org is the client (to_org_id)  
  const receivedContracts = allContracts.filter(c => c.to_org_id === orgId);
  
  // Budget = only sent contracts (what the org is contracted for)
  contracts = sentContracts;
  
  const sentContractIds = new Set(sentContracts.map(c => c.id));
  const receivedContractIds = new Set(receivedContracts.map(c => c.id));
  
  // Invoices for budget/billing = only on sent contracts
  invoices = allInvoices.filter(
    i => i.contract_id && sentContractIds.has(i.contract_id)
  );
  
  // Separate: invoices received (from subs) for action items
  receivedInvoices = allInvoices.filter(
    i => i.contract_id && receivedContractIds.has(i.contract_id)
  );
  
  // Keep existing WO and PO filters
  workOrders = allWorkOrders.filter(w => w.organization_id === orgId);
  pos = allPos.filter(p => p.created_by_org_id === orgId || p.organization_id === orgId);
}
```

**Lines 270-285** — Update TC/FC action items to show two separate invoice actions:

```typescript
// Invoices I SENT that are unpaid (receivables)
const myUnpaidInvoices = invoices.filter(i => i.status === 'SUBMITTED' || i.status === 'APPROVED');
if (myUnpaidInvoices.length > 0) {
  actionItems.push({ key: 'unpaid-invoices', label: '... awaiting payment', ... });
}

// Invoices I RECEIVED that need my review (payables)
const invoicesToReview = receivedInvoices.filter(i => i.status === 'SUBMITTED');
if (invoicesToReview.length > 0) {
  actionItems.push({ key: 'invoices-to-review', label: '... to review', severity: 'amber', tab: 'invoices' });
}
```

### Files to change:
| File | Change |
|------|--------|
| `src/hooks/useProjectQuickStats.ts` | Split contracts/invoices by direction; add `receivedInvoices` variable; update TC/FC action items |

No changes needed to `ProjectQuickOverview.tsx` — it just renders what the hook provides.


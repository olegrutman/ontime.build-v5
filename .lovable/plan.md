

# Fix: TC Billing & Cash Position Card — Split Upstream vs Downstream

## Problem
The current `BillingCashCard` sums **all** project invoices into one "Total Invoiced / Total Paid / Outstanding" view. For a Trade Contractor this is meaningless because it mixes:
- **Receivables** (invoices TC sent to GC — money coming in)
- **Payables** (invoices TC received from FC and suppliers — money going out)

A TC needs to see both sides separately to understand their actual cash position.

## Real-Life Logic
A Trade Contractor sits in the middle of the chain: GC pays them, they pay FC + suppliers. The card should show:

```text
┌──────────────────────────────────┐
│  Billing & Cash Position         │
│                                  │
│  RECEIVABLES (from GC)           │
│  Invoiced to GC        $120K    │
│  Collected              $80K    │
│  Retainage Held         $12K    │
│  Outstanding            $28K    │
│  ─────────────────────────────  │
│  PAYABLES (to FC & Suppliers)    │
│  Invoices Received      $65K    │
│  Paid Out               $40K    │
│  Outstanding            $25K    │
│  ─────────────────────────────  │
│  NET CASH POSITION       $3K    │
│  (Collected − Paid Out)          │
└──────────────────────────────────┘
```

## Changes

### 1. `src/hooks/useProjectFinancials.ts`
- **Expand invoice query** (line 192): Add `contract_id, po_id` to the select so we can classify invoices by direction.
- **Add new state fields** for TC:
  - `receivablesInvoiced`, `receivablesCollected`, `payablesInvoiced`, `payablesPaid`
- **Classify invoices** (around line 260): For TC, split invoices using contract direction:
  - Invoices where `contract_id` references a GC↔TC contract (TC is `from_org_id`) → **Receivables**
  - Invoices where `contract_id` references a TC↔FC contract (FC is `from_org_id`) OR `po_id` is set (supplier) → **Payables**
- **Export new fields** in the return object and `ProjectFinancials` interface.

### 2. `src/components/project/BillingCashCard.tsx`
- For `viewerRole === 'Trade Contractor'`: Render a two-section layout (Receivables + Payables + Net Cash Position) instead of the single combined view.
- For GC and FC: Keep existing single-section layout unchanged.
- Net Cash Position = receivablesCollected − payablesPaid.

**2 files modified. No database changes.**



# PO System Enhancement - Status Flow, Edit Capability & Consistent UI

## Overview

Enhance the Purchase Order system with:
1. New status workflow: ACTIVE -> SUBMITTED -> PRICED -> ORDERED -> DELIVERED
2. GC/TC can edit POs before submitting to supplier
3. Card-based display consistent with Invoices
4. PO detail page matching InvoiceDetail pattern
5. "Submit to Supplier" action with email delivery

---

## New Status Flow

| Status | Label | Who Sets It | Description |
|--------|-------|-------------|-------------|
| ACTIVE | Active | GC/TC on create | PO is being built, editable |
| SUBMITTED | Submitted | GC/TC clicks "Submit to Supplier" | Sent to supplier, awaiting pricing |
| PRICED | Priced | Supplier adds prices | Supplier has provided pricing |
| ORDERED | Ordered | Supplier confirms order placed | Materials ordered with vendor |
| DELIVERED | Delivered | Supplier or GC/TC marks complete | Materials received at site |

Status Colors (consistent with existing patterns):
- ACTIVE: Gray (#C4C4C4)
- SUBMITTED: Blue (#0086C0)
- PRICED: Amber (#FDAB3D)
- ORDERED: Purple (#A25DDC)
- DELIVERED: Green (#00C875)

---

## Database Changes

### 1. Update `po_status` Enum

Add new status values to the existing enum:

```sql
-- Add new enum values
ALTER TYPE po_status ADD VALUE 'ACTIVE';
ALTER TYPE po_status ADD VALUE 'SUBMITTED';
ALTER TYPE po_status ADD VALUE 'PRICED';
ALTER TYPE po_status ADD VALUE 'ORDERED';
ALTER TYPE po_status ADD VALUE 'DELIVERED';
```

### 2. Update `purchase_orders` Table

Add new columns for tracking status transitions and pricing:

```sql
-- Add new tracking columns
ALTER TABLE purchase_orders
ADD COLUMN submitted_at timestamptz,
ADD COLUMN submitted_by uuid REFERENCES auth.users(id),
ADD COLUMN priced_at timestamptz,
ADD COLUMN priced_by uuid REFERENCES auth.users(id),
ADD COLUMN ordered_at timestamptz,
ADD COLUMN delivered_at timestamptz;
```

### 3. Update `po_line_items` Table

Add pricing columns for supplier to fill:

```sql
-- Add pricing columns for supplier
ALTER TABLE po_line_items
ADD COLUMN unit_price numeric(12,4),
ADD COLUMN line_total numeric(12,2);
```

---

## Component Architecture

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/purchase-orders/POCard.tsx` | Card display matching InvoiceCard |
| `src/components/purchase-orders/PODetail.tsx` | Detail view matching InvoiceDetail |
| `src/components/purchase-orders/POStatusBadge.tsx` | Status badge component |
| `src/components/purchase-orders/index.ts` | Barrel export |

### Files to Modify

| File | Changes |
|------|---------|
| `src/types/purchaseOrder.ts` | Update POStatus type and labels/colors |
| `src/components/project/PurchaseOrdersTab.tsx` | Use POCard, add detail view, update status filter |
| `supabase/functions/send-po/index.ts` | Update to set SUBMITTED status |

---

## Component Details

### POStatusBadge.tsx

Matches the InvoiceStatusBadge pattern:

```typescript
const PO_STATUS_COLORS: Record<POStatus, string> = {
  ACTIVE: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  PRICED: 'bg-amber-100 text-amber-800',
  ORDERED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
};
```

### POCard.tsx

Features (matching InvoiceCard pattern):
- Icon + PO number header
- Supplier name and item count
- Status badge
- Hover actions (View, Edit if ACTIVE, Download)
- Action buttons:
  - ACTIVE: Edit, Submit to Supplier
  - SUBMITTED: (waiting for supplier)
  - PRICED: Mark Ordered (for supplier)
  - ORDERED: Mark Delivered

### PODetail.tsx

Layout (matching InvoiceDetail pattern):
- Back button + PO number + Status badge
- Action buttons in header based on status
- Info card: Supplier, Project, Work Item, Dates
- Line items table with columns:
  - Line #, SKU, Description, Qty, UOM
  - Unit Price (editable for supplier when SUBMITTED)
  - Line Total
- Footer with total (once priced)
- Notes section

---

## Status-Based Actions

### For GC/TC (creators)

| Current Status | Available Actions |
|---------------|-------------------|
| ACTIVE | Edit, Delete, Submit to Supplier |
| SUBMITTED | View Only (waiting for supplier) |
| PRICED | Accept Pricing / Request Changes |
| ORDERED | View Only |
| DELIVERED | View Only |

### For Supplier

| Current Status | Available Actions |
|---------------|-------------------|
| SUBMITTED | Add Pricing → PRICED |
| PRICED | Mark Ordered → ORDERED |
| ORDERED | Mark Delivered → DELIVERED |

---

## Editing Flow

### What Can Be Edited (ACTIVE status only)

1. **Line Items**: Add, remove, update quantities
2. **Notes**: Update PO notes
3. **Basic Info**: Work item association (not supplier/project)

### Edit Mode UI

When ACTIVE and user clicks Edit:
- Line items become editable inline
- Add Item button appears (opens PO Wizard picker)
- Delete buttons on each line
- Save/Cancel buttons in footer

---

## Submit to Supplier Flow

1. User clicks "Submit to Supplier" on ACTIVE PO
2. Dialog opens with:
   - Supplier email (pre-filled from supplier contact_info)
   - Option to add CC emails
   - Preview of what will be sent
3. On confirm:
   - Edge function sends email with PDF/CSV links
   - Status changes to SUBMITTED
   - submitted_at and submitted_by recorded

---

## Updated Types

### src/types/purchaseOrder.ts

```typescript
export type POStatus = 'ACTIVE' | 'SUBMITTED' | 'PRICED' | 'ORDERED' | 'DELIVERED';

export interface PurchaseOrder {
  id: string;
  organization_id: string;
  project_id?: string | null;
  work_item_id?: string | null;
  material_order_id?: string | null;
  supplier_id: string;
  po_number: string;
  po_name: string;
  status: POStatus;
  notes?: string | null;
  sent_at?: string | null; // Keep for backward compat
  sent_by?: string | null;
  submitted_at?: string | null;
  submitted_by?: string | null;
  priced_at?: string | null;
  priced_by?: string | null;
  ordered_at?: string | null;
  delivered_at?: string | null;
  download_token?: string;
  created_at: string;
  updated_at: string;
  // Relations
  organization?: { name: string; org_code: string } | null;
  supplier?: { id: string; name: string; supplier_code: string; contact_info?: string | null } | null;
  project?: { id: string; name: string } | null;
  work_item?: { id: string; title: string } | null;
  line_items?: POLineItem[];
}

export interface POLineItem {
  id: string;
  po_id: string;
  line_number: number;
  supplier_sku?: string | null;
  description: string;
  quantity: number;
  uom: string;
  pieces?: number | null;
  length_ft?: number | null;
  computed_bf?: number | null;
  computed_lf?: number | null;
  unit_price?: number | null;
  line_total?: number | null;
  notes?: string | null;
  created_at: string;
}

export const PO_STATUS_LABELS: Record<POStatus, string> = {
  ACTIVE: 'Active',
  SUBMITTED: 'Submitted',
  PRICED: 'Priced',
  ORDERED: 'Ordered',
  DELIVERED: 'Delivered',
};

export const PO_STATUS_COLORS: Record<POStatus, string> = {
  ACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  PRICED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  ORDERED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};
```

---

## UI Mockups

### PO Card (in grid)

```
┌──────────────────────────────────────────────────────┐
│  📦  PO-0042                      [HoverActions] 🟢  │
│      Jan 15, 2026                            Active  │
│                                                      │
│  📍 Supplier              📋 Items                   │
│     Builders Supply          12 line items           │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  [Edit]  [Submit to Supplier]                │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### PO Detail Header

```
┌────────────────────────────────────────────────────────────────┐
│  ← Back                                                        │
│                                                                │
│  PO-0042                                    🟢 Active          │
│  PO for 1st Floor Framing                                      │
│                                                                │
│                      [Edit] [Delete] [Submit to Supplier]      │
└────────────────────────────────────────────────────────────────┘
```

### Line Items Table (ACTIVE - Editable)

```
┌──────┬─────────┬────────────────────────────┬─────────┬───────┬─────────┐
│ Line │ SKU     │ Description                │ Qty     │ UOM   │ Actions │
├──────┼─────────┼────────────────────────────┼─────────┼───────┼─────────┤
│ 1    │ 2480    │ 2x4x8 SPF Stud            │ [294]   │ EA    │ [🗑]   │
│ 2    │ LVL1178 │ LVL 11-7/8 Header         │ [4]     │ EA    │ [🗑]   │
├──────┴─────────┴────────────────────────────┴─────────┴───────┴─────────┤
│                                         [+ Add Item]                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Line Items Table (PRICED - With Pricing)

```
┌──────┬─────────┬───────────────────────┬─────┬─────┬──────────┬──────────┐
│ Line │ SKU     │ Description           │ Qty │ UOM │ Unit $   │ Total    │
├──────┼─────────┼───────────────────────┼─────┼─────┼──────────┼──────────┤
│ 1    │ 2480    │ 2x4x8 SPF Stud       │ 294 │ EA  │ $3.45    │ $1,014.30│
│ 2    │ LVL1178 │ LVL 11-7/8 Header    │ 4   │ EA  │ $12.50/LF│ $600.00  │
├──────┴─────────┴───────────────────────┴─────┴─────┴──────────┼──────────┤
│                                                      TOTAL:   │ $1,614.30│
└───────────────────────────────────────────────────────────────┴──────────┘
```

---

## Migration from DRAFT/SENT

For existing POs:
- DRAFT → ACTIVE
- SENT → SUBMITTED

Migration query:
```sql
UPDATE purchase_orders 
SET status = 'ACTIVE' 
WHERE status = 'DRAFT';

UPDATE purchase_orders 
SET status = 'SUBMITTED', 
    submitted_at = sent_at,
    submitted_by = sent_by 
WHERE status = 'SENT';
```

---

## Summary of Changes

| Area | Change |
|------|--------|
| Database | New enum values, new columns for tracking + pricing |
| Types | Expanded POStatus, added labels/colors |
| Components | New POCard, PODetail, POStatusBadge |
| PurchaseOrdersTab | Card grid, detail view toggle, edit mode |
| send-po function | Update to SUBMITTED status |
| Global POs page | Update to use new components |

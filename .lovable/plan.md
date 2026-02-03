

# Add Delivery Tracking After PO is Finalized

## Overview

After a Purchase Order is finalized (confirmed by the buyer), suppliers need the ability to:
1. Mark the PO as "Ready for Delivery" with an expected delivery date
2. Mark the PO as "Delivered" when materials arrive on site

This adds supply chain visibility for all parties on the project.

---

## Current Status Flow

```text
ACTIVE → SUBMITTED → PRICED → ORDERED → DELIVERED → FINALIZED
```

The current flow has DELIVERED before FINALIZED, which doesn't match the real-world process where:
1. Buyer confirms/finalizes the order
2. Supplier prepares materials
3. Supplier schedules delivery
4. Materials are delivered

---

## New Status Flow

```text
ACTIVE → SUBMITTED → PRICED → FINALIZED → READY_FOR_DELIVERY → DELIVERED
```

| Status | Who Acts | Description |
|--------|----------|-------------|
| ACTIVE | Buyer | PO created, being edited |
| SUBMITTED | System | Sent to supplier for pricing |
| PRICED | Supplier | Pricing added by supplier |
| FINALIZED | Buyer | Order confirmed and locked |
| READY_FOR_DELIVERY | Supplier | Materials ready, delivery scheduled |
| DELIVERED | Supplier | Materials delivered to job site |

---

## Database Changes

### Add New Column

Add `ready_for_delivery_at` timestamp to track when materials are ready:

```sql
ALTER TABLE purchase_orders 
ADD COLUMN ready_for_delivery_at TIMESTAMPTZ;
```

### Add New Status to Enum

Add `READY_FOR_DELIVERY` to the `po_status` enum:

```sql
ALTER TYPE po_status ADD VALUE 'READY_FOR_DELIVERY' AFTER 'FINALIZED';
```

---

## TypeScript Changes

### File: `src/types/purchaseOrder.ts`

Update the status type, labels, and colors:

```typescript
export type POStatus = 
  | 'ACTIVE' 
  | 'SUBMITTED' 
  | 'PRICED' 
  | 'FINALIZED' 
  | 'READY_FOR_DELIVERY' 
  | 'DELIVERED'
  | 'ORDERED';  // Keep for backward compatibility

export const PO_STATUS_LABELS: Record<POStatus, string> = {
  ACTIVE: 'Active',
  SUBMITTED: 'Submitted',
  PRICED: 'Priced',
  ORDERED: 'Ordered',  // Legacy
  FINALIZED: 'Finalized',
  READY_FOR_DELIVERY: 'Ready for Delivery',
  DELIVERED: 'Delivered',
};

export const PO_STATUS_COLORS: Record<POStatus, string> = {
  // ... existing colors ...
  READY_FOR_DELIVERY: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
};
```

Also add the new field to the interface:

```typescript
export interface PurchaseOrder {
  // ... existing fields ...
  ready_for_delivery_at?: string | null;
}
```

---

## UI Changes

### File: `src/components/purchase-orders/PODetail.tsx`

#### 1. Add "Ready for Delivery" Dialog

Create a dialog that allows supplier to:
- Select an expected delivery date
- Optionally add delivery notes

```typescript
// New state
const [readyDialogOpen, setReadyDialogOpen] = useState(false);
const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<Date | undefined>();

// New handler
const handleMarkReadyForDelivery = async () => {
  if (!expectedDeliveryDate) {
    toast.error('Please select an expected delivery date');
    return;
  }
  
  setActionLoading(true);
  try {
    await supabase
      .from('purchase_orders')
      .update({
        status: 'READY_FOR_DELIVERY',
        ready_for_delivery_at: new Date().toISOString(),
        // Store expected delivery date in a notes field or new column
      })
      .eq('id', poId);
    
    toast.success('Marked ready for delivery');
    fetchPO();
    onUpdate();
  } finally {
    setActionLoading(false);
    setReadyDialogOpen(false);
  }
};
```

#### 2. Update Action Buttons Section

Add new buttons for suppliers when PO is FINALIZED:

```tsx
{/* FINALIZED: Supplier can mark ready for delivery */}
{status === 'FINALIZED' && effectiveIsSupplier && (
  <Button onClick={() => setReadyDialogOpen(true)} disabled={actionLoading}>
    <Package className="h-4 w-4 mr-2" />
    Ready for Delivery
  </Button>
)}

{/* READY_FOR_DELIVERY: Supplier can mark delivered */}
{status === 'READY_FOR_DELIVERY' && effectiveIsSupplier && (
  <Button onClick={handleMarkDelivered} disabled={actionLoading}>
    <Truck className="h-4 w-4 mr-2" />
    Mark Delivered
  </Button>
)}
```

#### 3. Add Ready for Delivery Dialog

```tsx
<Dialog open={readyDialogOpen} onOpenChange={setReadyDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Ready for Delivery</DialogTitle>
      <DialogDescription>
        Confirm that materials are ready and provide the expected delivery date.
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4 py-4">
      <div>
        <Label>Expected Delivery Date *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {expectedDeliveryDate ? format(expectedDeliveryDate, 'PPP') : 'Select date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <Calendar
              mode="single"
              selected={expectedDeliveryDate}
              onSelect={setExpectedDeliveryDate}
              disabled={(date) => date < new Date()}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setReadyDialogOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleMarkReadyForDelivery} disabled={actionLoading || !expectedDeliveryDate}>
        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Confirm Ready
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### 4. Show Delivery Status in Info Card

Update the info card to show delivery tracking info:

```tsx
{po.ready_for_delivery_at && (
  <div>
    <p className="text-xs text-muted-foreground">Ready for Delivery</p>
    <p className="font-medium flex items-center gap-1">
      <Package className="h-4 w-4" />
      {format(new Date(po.ready_for_delivery_at), 'MMM d, yyyy')}
    </p>
  </div>
)}
{po.delivered_at && (
  <div>
    <p className="text-xs text-muted-foreground">Delivered</p>
    <p className="font-medium flex items-center gap-1 text-green-600">
      <Truck className="h-4 w-4" />
      {format(new Date(po.delivered_at), 'MMM d, yyyy')}
    </p>
  </div>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| Database | Add `ready_for_delivery_at` column, add `READY_FOR_DELIVERY` to enum |
| `src/types/purchaseOrder.ts` | Add new status, labels, colors, and interface field |
| `src/components/purchase-orders/PODetail.tsx` | Add delivery dialog, update action buttons, show delivery info |

---

## Benefits

1. **Supply Chain Visibility**: Buyers know when materials are ready and scheduled
2. **Delivery Tracking**: Clear record of delivery dates for project management
3. **Supplier Control**: Suppliers can update status as materials move through their system
4. **Audit Trail**: Timestamps for each status change provide accountability




# Show Delivery Tracking Info on PO Cards

## Problem

After a PO is marked "Ready for Delivery" or "Delivered" by the supplier, GCs and TCs cannot see this information on the PO card list view. They have to click into each PO detail to see the delivery status. This makes it hard to quickly scan which materials are ready or have arrived.

---

## Solution

Add a delivery tracking section to the `POCard` component that displays:
1. **Ready for Delivery date** - when the PO status is `READY_FOR_DELIVERY` or `DELIVERED`
2. **Delivered date** - when the PO status is `DELIVERED`

This provides at-a-glance visibility for GCs and TCs to track material deliveries.

---

## Changes

### File: `src/components/purchase-orders/POCard.tsx`

Add a delivery tracking section that appears when the PO has delivery dates:

**1. Add new icon imports:**
```typescript
import { Truck, PackageCheck } from 'lucide-react';
```

**2. Add delivery tracking section after the pricing display:**

```tsx
{/* Delivery Tracking - Show for READY_FOR_DELIVERY and DELIVERED statuses */}
{(po.ready_for_delivery_at || po.delivered_at) && (
  <div className="mt-3 pt-3 border-t space-y-2">
    {po.ready_for_delivery_at && (
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <PackageCheck className="h-4 w-4 text-cyan-600" />
          <span>Ready for Delivery</span>
        </div>
        <span className="font-medium">
          {format(new Date(po.ready_for_delivery_at), 'MMM d, yyyy')}
        </span>
      </div>
    )}
    {po.delivered_at && (
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Truck className="h-4 w-4 text-green-600" />
          <span>Delivered</span>
        </div>
        <span className="font-medium text-green-600">
          {format(new Date(po.delivered_at), 'MMM d, yyyy')}
        </span>
      </div>
    )}
  </div>
)}
```

---

## Visual Result

**PO Card with "Ready for Delivery" status:**
```
┌────────────────────────────────────────────┐
│ 📦 PO-0045                    [Ready]      │
│    Feb 1, 2026                             │
├────────────────────────────────────────────┤
│ 🏢 Supplier: Acme Lumber                   │
│ 📄 Items: 12 line items                    │
├────────────────────────────────────────────┤
│ ✅ Ready for Delivery      Feb 3, 2026    │
└────────────────────────────────────────────┘
```

**PO Card with "Delivered" status:**
```
┌────────────────────────────────────────────┐
│ 📦 PO-0045                   [Delivered]   │
│    Feb 1, 2026                             │
├────────────────────────────────────────────┤
│ 🏢 Supplier: Acme Lumber                   │
│ 📄 Items: 12 line items                    │
├────────────────────────────────────────────┤
│ ✅ Ready for Delivery      Feb 3, 2026    │
│ 🚚 Delivered               Feb 4, 2026    │
└────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/purchase-orders/POCard.tsx` | Add `Truck` and `PackageCheck` icons, add delivery tracking section |

---

## Benefits

1. **Quick Visibility**: GCs and TCs can scan the PO list to see delivery status at a glance
2. **No Extra Clicks**: Delivery dates visible without opening the detail view
3. **Consistent Design**: Follows existing card section patterns with border separators
4. **Color Coding**: Cyan for "ready", green for "delivered" matches the status badge colors


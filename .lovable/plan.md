
# Plan: Display Contracted Prices by Contractor Type on Work Order Page

## Overview
Add a prominent pricing summary card to the Work Order detail page that displays the contracted price broken down by contractor type. This will show what each party (GC, TC, FC) pays or earns from the Work Order, respecting the role-based visibility rules.

---

## Pricing Visibility by Role

Based on the existing profit visibility rules:

| Viewer Role | What They See |
|------------|---------------|
| **GC (General Contractor)** | Total Work Order Cost (Labor + Materials + Equipment) |
| **TC (Trade Contractor)** | Revenue (Total to GC), Cost (FC + Materials + Equipment), Profit |
| **FC (Field Crew)** | "My Earnings" (their locked hours × rate or lump sum) |

---

## New Component: `ContractedPricingCard`

A new sidebar card that shows pricing breakdown appropriate to each role:

### For GC View:
```
┌─────────────────────────────────────────────────────────────┐
│  💵 Work Order Pricing                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Trade Contractor Labor .................. $2,500.00        │
│  Materials .............................. $1,200.00         │
│  Equipment ..............................   $300.00         │
│  ─────────────────────────────────────────────────          │
│  TOTAL CONTRACTED PRICE                   $4,000.00         │
│                                                             │
│  [Paid to: ABC Framing]                                     │
└─────────────────────────────────────────────────────────────┘
```

### For TC View:
```
┌─────────────────────────────────────────────────────────────┐
│  💵 Work Order Pricing                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  REVENUE (FROM GC)                                          │
│  TC Labor ............................... $2,500.00         │
│  Materials Markup ....................... $1,200.00         │
│  Equipment .............................. $300.00           │
│  Total Revenue                            $4,000.00         │
│                                                             │
│  COSTS                                                      │
│  Field Crew (XYZ Crew) .................. $1,000.00         │
│  Materials (Base Cost) ..................  $900.00          │
│  ─────────────────────────────────────────────────          │
│  Total Costs                              $1,900.00         │
│                                                             │
│  ─────────────────────────────────────────────────          │
│  PROFIT                                   $2,100.00         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### For FC View:
```
┌─────────────────────────────────────────────────────────────┐
│  💵 My Earnings                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Hours Logged: 20 hrs                                       │
│  Rate: $50.00/hr                                            │
│  ─────────────────────────────────────────────────          │
│  TOTAL EARNINGS                           $1,000.00         │
│                                                             │
│  Status: 🔒 Locked                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Create New Component

**File: `src/components/change-order-detail/ContractedPricingCard.tsx`**

```typescript
interface ContractedPricingCardProps {
  changeOrder: ChangeOrderProject;
  fcHours: ChangeOrderFCHours[];
  tcLabor: ChangeOrderTCLabor[];
  materials: ChangeOrderMaterial[];
  equipment: ChangeOrderEquipment[];
  participants: ChangeOrderParticipant[];
  currentRole: AppRole | null;
}
```

**Logic:**
- For **GC**: Display labor_total, material_total, equipment_total, and final_price from `changeOrder`
- For **TC**: Calculate revenue (from changeOrder totals), costs (FC hours + base material costs), and profit
- For **FC**: Display their own fcHours entries with labor_total

### 2. Update ChangeOrderDetailPage

**File: `src/components/change-order-detail/ChangeOrderDetailPage.tsx`**

Add the new `ContractedPricingCard` to the sidebar for all roles:

```tsx
{/* Contracted Pricing - visible to all roles */}
<ContractedPricingCard
  changeOrder={changeOrder}
  fcHours={fcHours}
  tcLabor={tcLabor}
  materials={materials}
  equipment={equipment}
  participants={participants}
  currentRole={currentRole}
/>
```

### 3. Show Participant Company Names

The card will display:
- For GC: The TC company name (from participants where role = 'TC')
- For TC: The FC company name (from participants where role = 'FC')
- For FC: The TC company name (who they're working for)

### 4. Update Index Exports

**File: `src/components/change-order-detail/index.ts`**

Add export for the new component.

---

## Files to Create/Modify

| File | Changes |
|------|---------|
| `src/components/change-order-detail/ContractedPricingCard.tsx` | **NEW** - Main pricing summary card with role-based views |
| `src/components/change-order-detail/ChangeOrderDetailPage.tsx` | Add ContractedPricingCard to sidebar |
| `src/components/change-order-detail/index.ts` | Export new component |

---

## Visual Placement

The ContractedPricingCard will be placed:
- **In the sidebar** (right column)
- **At the top** before other cards
- Visible to **all roles** (GC, TC, FC) with appropriate content

---

## Role-Based Display Logic

```typescript
// GC sees: Total cost breakdown
if (isGC) {
  return (
    <GCPricingView 
      laborTotal={changeOrder.labor_total}
      materialTotal={changeOrder.material_total}
      equipmentTotal={changeOrder.equipment_total}
      finalPrice={changeOrder.final_price}
      tcName={tcParticipant?.organization?.name}
    />
  );
}

// TC sees: Revenue, Costs, Profit breakdown
if (isTC) {
  const fcCost = fcHours.reduce((sum, h) => sum + (h.labor_total || 0), 0);
  const materialCost = materials.reduce((sum, m) => sum + ((m.unit_cost || 0) * m.quantity), 0);
  const revenue = changeOrder.final_price || 0;
  const totalCost = fcCost + materialCost;
  const profit = revenue - totalCost;
  
  return (
    <TCPricingView
      revenue={revenue}
      fcCost={fcCost}
      materialCost={materialCost}
      profit={profit}
      fcName={fcParticipant?.organization?.name}
    />
  );
}

// FC sees: Their earnings
if (isFC) {
  const myEarnings = fcHours.reduce((sum, h) => sum + (h.labor_total || 0), 0);
  const totalHours = fcHours.filter(h => h.pricing_type !== 'lump_sum').reduce((sum, h) => sum + h.hours, 0);
  const allLocked = fcHours.every(h => h.is_locked);
  
  return (
    <FCEarningsView
      totalEarnings={myEarnings}
      totalHours={totalHours}
      isLocked={allLocked}
      tcName={tcParticipant?.organization?.name}
    />
  );
}
```

---

## Conditional Display

The pricing card will only show substantial content when:
- Status is beyond `draft` (pricing has been entered)
- OR any pricing data exists (labor_total > 0, etc.)

For draft work orders with no pricing yet, show a placeholder message:
```
"Pricing will appear here once the Trade Contractor submits their quote."
```

---

## Testing Checklist

1. Log in as GC and view a work order with pricing
   - Verify total cost breakdown is displayed
   - Verify TC company name is shown
2. Log in as TC and view the same work order
   - Verify revenue, costs, and profit are calculated correctly
   - Verify FC company name is shown (if FC participant exists)
3. Log in as FC and view a work order where they're a participant
   - Verify only their earnings are shown
   - Verify locked status is displayed
4. View a draft work order with no pricing
   - Verify placeholder message appears
5. Test with work orders that have only labor (no materials/equipment)
   - Verify calculations are correct

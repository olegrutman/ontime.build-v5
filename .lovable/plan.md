

# Fix GC Work Order Pricing: Include Materials in Total and Restructure TC Tile

## Problem
1. The "Total Work Order Cost" uses `finalPrice` from the database, which may not include material costs when the GC is responsible for materials. The total should be computed as the sum of all cost components.
2. The TC Contract section currently embeds labor details inline with equipment. The user wants it restructured as a standalone tile (like the Materials and Equipment tiles), showing TC hours, hourly rate, and cost clearly.

## Changes (single file: `ContractedPricingCard.tsx`)

### 1. Compute Total Work Order Cost from components
Instead of using `finalPrice` directly, calculate the true total:

```
totalCost = laborTotal 
          + (requiresMaterials ? materialTotal : 0) 
          + (requiresEquipment ? equipmentTotal : 0)
```

This ensures materials are always included in the total when the work order requires them, regardless of who is responsible.

### 2. Restructure TC Contract into a tile matching the style of Materials/Equipment tiles
Convert the TC Contract section from a mixed block into a clean tile with:
- Header: "TC Labor" (or "TC Contract")
- Individual labor entries showing description, hours, hourly rate (or "Lump Sum")
- If TC is responsible for equipment, show equipment line within this tile
- Subtotal at bottom
- "Paid to: CompanyName" footer

The tile styling will use the same `border rounded-md p-3 space-y-2` pattern as Materials and Equipment tiles for visual consistency.

### Layout after changes

```text
+-------------------------------+
| TOTAL WORK ORDER COST         |
| $X,XXX.XX  (labor+mat+equip) |
+-------------------------------+

+-------------------------------+
| TC Labor                      |
| Entry 1: 8hrs @ $65/hr $520  |
| Entry 2: Lump Sum      $300  |
| Equipment (TC)          $200  |  <-- only if TC responsible
| ----------------------------- |
| Subtotal              $1,020  |
| Paid to: CompanyName          |
+-------------------------------+

+-------------------------------+
| Materials (GC Responsible)    |
| Total                   $500  |
+-------------------------------+

+-------------------------------+
| Equipment (GC Responsible)    |
| Total                   $200  |
+-------------------------------+
```

No other files need changes.


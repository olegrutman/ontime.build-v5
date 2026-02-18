
# Allow Supplier to Submit RFIs

## Problem
The SUPPLIER role currently has `canCreateRFIs: false` in its default permissions, which hides the "New RFI" button and blocks suppliers from creating RFIs.

## Change

**File: `src/types/organization.ts`** (1 line)

Update the SUPPLIER role defaults:
```
canCreateRFIs: true   // was false
```

This will make the "+ New RFI" button visible for supplier users on the RFIs page, allowing them to use the same 5-step RFI wizard (Location, Category, Details, Routing, Review) that GC/TC/FC roles already use. No other code changes are needed since the `RFIsTab` component already reads `permissions.canCreateRFIs` to control button visibility.

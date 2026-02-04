
# Plan: Make Requested Delivery Date Optional

## Summary

Remove the requirement for `requested_delivery_date` when creating a purchase order, allowing users to proceed without specifying a delivery date.

---

## Current Behavior

The "Next" button on the Header screen is disabled unless both:
1. A supplier is selected
2. A delivery date is selected

```typescript
const canAdvanceFromHeader = 
  !!formData.supplier_id && 
  !!formData.requested_delivery_date;  // ← This blocks advancement
```

---

## Proposed Change

### File: `src/components/po-wizard-v2/POWizardV2.tsx`

**Update validation logic (lines 178-180):**

Remove the `requested_delivery_date` requirement from the header advancement check:

```typescript
// Before
const canAdvanceFromHeader = 
  !!formData.supplier_id && 
  !!formData.requested_delivery_date;

// After
const canAdvanceFromHeader = !!formData.supplier_id;
```

---

## What Won't Change

- The date picker will still be available for users who want to specify a delivery date
- The type definition already supports `null` for `requested_delivery_date`
- The delivery window selector (AM/PM/Any) remains as-is
- The database already accepts NULL values for this field

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/po-wizard-v2/POWizardV2.tsx` | Remove `requested_delivery_date` from `canAdvanceFromHeader` validation |

---

## Single Line Change

```typescript
// Line 178-180 in POWizardV2.tsx
const canAdvanceFromHeader = !!formData.supplier_id;
```

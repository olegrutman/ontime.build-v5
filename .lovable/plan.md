

# Fix: GC Can't Select Trade Contractor in Assignment Step

## Problem

In the Work Order Wizard's Assignment step (step 7), clicking a Trade Contractor option in the dropdown closes it without selecting the value. The data is present in the database (IMIS, LLC is an accepted TC on this project), but the selection doesn't register.

## Root Cause

The `SelectItem` component contains a nested `<div className="flex flex-col">` with block-level layout. Radix UI's Select component doesn't handle complex children inside `SelectItem` well -- the click event gets intercepted by the inner div, preventing the selection from completing.

## Fix

**File: `src/components/work-order-wizard/steps/AssignmentStep.tsx`**

Replace the nested `div` inside each `SelectItem` with inline elements (`span`) that don't interfere with Radix's click handling:

Before:
```tsx
<SelectItem key={member.org_id} value={member.org_id}>
  <div className="flex flex-col">
    <span>{member.org_name}</span>
    {member.trade && (
      <span className="text-xs text-muted-foreground">{member.trade}</span>
    )}
  </div>
</SelectItem>
```

After:
```tsx
<SelectItem key={member.org_id} value={member.org_id}>
  {member.org_name}{member.trade ? ` (${member.trade})` : ''}
</SelectItem>
```

This flattens the content to a single text string, which Radix Select handles reliably. The trade info is still visible as parenthetical text.


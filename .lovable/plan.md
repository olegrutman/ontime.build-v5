

# Fix: Returns UPDATE RLS Policy Blocking Status Transitions

## Root Cause

The `returns` UPDATE policy uses only a `USING` clause (no explicit `WITH CHECK`). PostgreSQL applies `USING` for both the "can I read this row?" and "is the new row valid?" checks.

When the supplier changes status from `SUPPLIER_REVIEW` to `APPROVED`:
- **USING check (old row)**: Passes -- supplier org + status `SUPPLIER_REVIEW` is allowed
- **WITH CHECK (new row)**: Fails -- `APPROVED` is not in the supplier's allowed status list

The same problem affects the creator org transitioning `PRICED` to `CLOSED`.

## Fix

Add an explicit `WITH CHECK` clause that permits the valid target statuses for each org role. The `USING` clause controls which rows the org can select for update; the `WITH CHECK` clause controls what the row can look like after the update.

### Database Migration

```sql
DROP POLICY "Authorized orgs can update returns" ON public.returns;

CREATE POLICY "Authorized orgs can update returns" ON public.returns
  FOR UPDATE
  USING (
    (user_in_org(auth.uid(), created_by_org_id)
      AND status IN ('DRAFT','APPROVED','SCHEDULED','PRICED'))
    OR
    (user_in_org(auth.uid(), supplier_org_id)
      AND status IN ('SUBMITTED','SUPPLIER_REVIEW','PICKED_UP','SCHEDULED'))
  )
  WITH CHECK (
    (user_in_org(auth.uid(), created_by_org_id)
      AND status IN ('DRAFT','SUBMITTED','SCHEDULED','CLOSED'))
    OR
    (user_in_org(auth.uid(), supplier_org_id)
      AND status IN ('SUPPLIER_REVIEW','APPROVED','PICKED_UP','PRICED'))
  );
```

**USING** (which rows can be selected for update):
- Creator org: DRAFT, APPROVED, SCHEDULED, PRICED
- Supplier org: SUBMITTED, SUPPLIER_REVIEW, PICKED_UP, SCHEDULED

**WITH CHECK** (what the new row can look like):
- Creator org: DRAFT, SUBMITTED, SCHEDULED, CLOSED
- Supplier org: SUPPLIER_REVIEW, APPROVED, PICKED_UP, PRICED

This allows each valid transition:

| Who | From (USING) | To (WITH CHECK) |
|-----|-------------|-----------------|
| Creator | DRAFT | SUBMITTED |
| Supplier | SUBMITTED | SUPPLIER_REVIEW |
| Supplier | SUPPLIER_REVIEW | APPROVED |
| Creator | APPROVED | SCHEDULED |
| Supplier | SCHEDULED | PICKED_UP |
| Supplier | PICKED_UP | PRICED |
| Creator | PRICED | CLOSED |

### No code changes needed

The `ReturnSupplierReview.tsx` logic is correct -- only the RLS policy needs the WITH CHECK clause.

## Files

| Action | File |
|--------|------|
| Create | `supabase/migrations/XXXXXX_fix_returns_update_rls.sql` |




# Fix: SOV Not Updating When Invoice Is Deleted

## Problem
When an invoice is deleted, the SOV items still show as "fully billed" because the existing database trigger (`update_sov_on_invoice_status`) only fires on `UPDATE OF status` — not on `DELETE`. The deletion flow deletes line items first, then the invoice row, so the SOV `total_billed_amount`, `total_completion_percent`, and `billed_to_date` are never decremented.

## Fix

### Database Migration
Create a `BEFORE DELETE` trigger on `public.invoices` that subtracts the billing amounts from SOV items before the invoice and its line items are removed.

The trigger function will:
1. Check if the invoice status is in `('SUBMITTED', 'APPROVED', 'PAID')` — only those statuses would have been added to SOV totals
2. Subtract `current_billed` and `billed_percent` from the linked `project_sov_items` rows
3. Fire **before** the delete so the `invoice_line_items` still exist for the join

```sql
CREATE OR REPLACE FUNCTION public.update_sov_on_invoice_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('SUBMITTED', 'APPROVED', 'PAID') THEN
    UPDATE public.project_sov_items psi
    SET 
      total_completion_percent = GREATEST(0, COALESCE(psi.total_completion_percent, 0) - COALESCE(ili.billed_percent, 0)),
      total_billed_amount = GREATEST(0, COALESCE(psi.total_billed_amount, 0) - COALESCE(ili.current_billed, 0)),
      billed_to_date = GREATEST(0, COALESCE(psi.billed_to_date, 0) - COALESCE(ili.current_billed, 0))
    FROM public.invoice_line_items ili
    WHERE ili.invoice_id = OLD.id
      AND ili.sov_item_id = psi.id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### Frontend Change
Reorder the delete logic in `InvoicesTab.tsx` — delete the **invoice first** (triggering the `BEFORE DELETE` trigger while line items still exist), then the cascade will clean up line items. Actually, since `invoice_line_items` has `ON DELETE CASCADE` from the invoice, we just need to delete the invoice row and cascade handles the rest.

### Data Backfill
Run a one-time fix to recalculate `total_billed_amount` and `total_completion_percent` on all `project_sov_items` based on actual existing invoices (to fix the currently broken SOV item that shows "fully billed" for a deleted invoice).

| Type | Detail |
|------|--------|
| **Migration** | Add `BEFORE DELETE` trigger on `invoices` to decrement SOV billing; backfill SOV items from actual invoice data |
| **Frontend** | `src/components/invoices/InvoicesTab.tsx` — simplify delete to just delete the invoice (let cascade + trigger handle the rest) |


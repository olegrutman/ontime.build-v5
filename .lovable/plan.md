

# Database-Only: Change Orders Schema

No UI, hooks, or components. Just database migrations.

## What will be created

1. **Add column** `hourly_rate decimal nullable` to `profiles`
2. **New tables** (9 total):
   - `work_order_catalog` — global + per-org catalog items
   - `change_orders` — main CO header with status workflow
   - `co_line_items` — scope line items linked to catalog
   - `co_labor_entries` — T&M labor with generated `line_total`
   - `co_material_items` — materials with generated `line_cost`, `markup_amount`, `billed_amount`
   - `co_equipment_items` — equipment with generated `markup_amount`, `billed_amount`
   - `co_nte_log` — NTE increase request/approval history
   - `co_combined_members` — links member COs into a combined CO
   - `co_activity` — audit log per CO
3. **RLS policies** on all tables using `user_org_roles` membership checks
4. **Realtime** enabled on `co_labor_entries`

All SQL is provided verbatim by the user. The migration will be executed in a single batch. No code changes.


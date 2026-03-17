

# Drop All Work Order / Change Order Database Tables

## Tables to Drop (in dependency order)

### Tier 1 — Leaf tables (no other tables reference them)
| Table | Referenced by |
|---|---|
| `change_order_checklist` | — |
| `change_order_equipment` | — |
| `change_order_fc_hours` | — |
| `change_order_materials` | — |
| `change_order_participants` | — |
| `change_order_tc_labor` | — |
| `change_work_pricing` | references `work_items` |
| `work_item_participants` | references `work_items` |
| `work_order_catalog` | — |
| `work_order_equipment` | references `change_order_projects` |
| `work_order_line_items` | references `change_order_projects` |
| `work_order_log_items` | — |
| `work_order_materials` | references `change_order_projects` |
| `work_order_tasks` | — |
| `tm_time_cards` | references `change_order_projects` |
| `tm_labor_entries` | references `tm_periods` |
| `tm_material_entries` | references `tm_periods` |
| `tm_periods` | references `work_items` |

### Tier 2 — Parent tables (after leaf tables are gone)
| Table |
|---|
| `change_order_projects` |
| `work_items` |

### FK columns to drop on OTHER tables (SET NULL, not drop table)
| Table | Column | FK references |
|---|---|---|
| `actual_cost_entries` | `change_order_id` | → `change_order_projects` |
| `field_captures` | `converted_work_order_id` | → `change_order_projects` |
| `project_schedule_items` | `work_order_id` | → `change_order_projects` |
| `supplier_estimates` | `work_order_id` | → `change_order_projects` |
| `invoice_line_items` | `work_item_id` | → `work_items` |
| `labor_entries` | `work_item_id` | → `work_items` |
| `material_orders` | `work_item_id` | → `work_items` |
| `purchase_orders` | `work_item_id` | → `work_items` |

### Database functions to drop
- `execute_change_work`
- `generate_change_work_code`
- `approve_tm_period`
- `reject_tm_period`
- `submit_tm_period`

### Views to drop
- `tm_periods_gc`
- `tm_labor_entries_fs`
- `tm_material_entries_fs`

## Migration SQL (single migration)

The migration will:
1. Drop FK constraints on external tables, then drop those columns
2. Drop all leaf tables (Tier 1)
3. Drop views
4. Drop parent tables (Tier 2)  
5. Drop database functions
6. Drop any related enums (e.g., `change_order_status` if it exists)

## Code Cleanup

After the migration, remove remaining references in code files that still query these tables:
- `src/hooks/useProjectFinancials.ts` — remove `change_order_projects` query
- `src/hooks/useFinancialTrends.ts` — remove WO completion trend query
- `src/hooks/useProjectQuickStats.ts` — remove `work_items` query
- `src/hooks/useProjectRealtime.ts` — remove `change_order_projects` subscription
- `src/hooks/useChangeWork.ts` — **delete entirely**
- `src/hooks/useSOVReadiness.ts` — **delete** if still present
- `src/types/changeWork.ts` — **delete**
- `src/types/workItem.ts` — **delete**
- `src/components/project/ProjectFinancialsSectionNew.tsx` — remove WO total/FC hours queries
- `src/components/purchase-orders/CreateInvoiceFromPO.tsx` — remove CO markup pre-fill
- `src/components/schedule/ScheduleTab.tsx` — remove WO fetch for schedule linking
- `src/components/project/SupplierOperationalSummary.tsx` — remove WO section
- `src/components/project/PurchaseOrdersTab.tsx` — remove `work_item` join
- `supabase/functions/send-po/index.ts` — remove `work_item` join
- `supabase/functions/project-summary-download/index.ts` — remove WO section
- `src/components/project/index.ts` — remove any remaining WO exports
- `src/components/demo/index.ts` — verify clean


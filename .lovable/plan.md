

# Remove "Work Order" References — Rename to Change Order / Scope Catalog

## What I Understand

Work orders no longer exist as a concept in Ontime.build. They've been fully replaced by Change Orders (COs). Every UI label, type name, hook name, permission label, and navigation reference that says "work order" needs to be updated. The underlying database table `work_order_catalog` stays as-is (it's the scope catalog used by CO creation), but all code-facing names get renamed.

## Scope of Changes

### 1. Rename hook: `useWorkOrderCatalog` → `useScopeCatalog`
- Rename file `src/hooks/useWorkOrderCatalog.ts` → `src/hooks/useScopeCatalog.ts`
- Rename exported function to `useScopeCatalog`
- Keep querying `work_order_catalog` table (DB name unchanged)
- Update query key from `'work-order-catalog'` to `'scope-catalog'`

### 2. Rename type: `WorkOrderCatalogItem` → `ScopeCatalogItem`
- In `src/types/changeOrder.ts`, rename the interface
- Update all imports in CO wizard components

### 3. Update CO wizard imports
- `src/components/change-orders/wizard/COWizard.tsx` — import from `useScopeCatalog`, use `ScopeCatalogItem`
- `src/components/change-orders/wizard/StepCatalog.tsx` — same

### 4. Update permission labels and types
- `src/types/organization.ts` — rename `can_create_work_orders` → `can_create_change_orders`, `canCreateWorkOrders` → `canCreateChangeOrders` throughout all role defaults
- `src/components/team/MemberDetailDialog.tsx` — update label from "Create Work Orders" to "Create Change Orders"
- `src/hooks/useOrgTeam.ts` — update the RPC param name (if DB column unchanged, keep `_can_create_work_orders` in the RPC call but rename the TS-side key)

### 5. Remove work order UI sections
- `src/pages/Settings.tsx` — remove "Work Orders" settings section
- `src/pages/ProjectHome.tsx` — remove the `work-orders` tab redirect (already redirects to COs)
- `src/components/dashboard/FinancialTrendCharts.tsx` — remove "Work Orders (6 mo)" chart card, remove `MonthlyWorkOrders` import
- `src/components/demo/DemoProjectOverview.tsx` — remove work orders section, replace with COs
- `src/pages/platform/PlatformProjectDetail.tsx` — remove Work Orders table section, remove delete WO dialog

### 6. Update landing page copy
- `src/components/landing/HeroSection.tsx` — change "Work Orders" → "Change Orders" (line 103)
- `src/components/landing/RolesSection.tsx` — update TC description, replace "Work Orders" tag with "Change Orders"
- `src/components/landing/HowItWorksSection.tsx` — update step 2 copy
- `src/components/landing/PricingSection.tsx` — change "Work orders" → "Change orders"

### 7. Update platform types
- `src/types/platform.ts` — remove `EDIT_WORK_ORDER` and `DELETE_WORK_ORDER` action types and labels

### 8. Update remaining references
- `src/types/poWizardV2.ts` — remove `work_order_id`/`work_order_title` fields
- `src/types/supplierEstimate.ts` — remove `work_order_id`/`work_order` fields
- `src/types/unifiedWizard.ts` — rename "work order" in step descriptions
- `src/hooks/useNudge.ts` — remove `work_order` from `EntityType`
- `src/hooks/useSashaContext.ts` — update context strings
- `src/hooks/useSOVReadiness.ts`, `useSOVPage.ts`, `useContractSOV.ts` — update comments (functional filter on `'Work Order'` trade stays since that's a DB value)
- `src/components/project/ScopeDetailsTab.tsx` — update comment
- `src/components/project/SupplierOperationalSummary.tsx` — update comment
- `src/pages/Demo.tsx` — update role descriptions

### Files changed: ~25 files
### What is NOT changing
- Database tables or columns (`work_order_catalog` table name stays)
- RLS policies
- Edge functions (notification types kept for backwards compatibility)
- Archived files in `src/archive/`


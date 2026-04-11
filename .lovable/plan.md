

# Replace "Change Order" with "Work Order" Throughout T&M Projects

## What's happening
In T&M projects, many UI components still say "Change Order" instead of "Work Order". This needs to be conditional — only T&M projects use "Work Order" terminology; fixed-contract projects keep "Change Order".

## Files to modify

### 1. Pass `isTM` to overview components — `src/pages/ProjectHome.tsx`
- Pass `isTM` prop to `GCProjectOverviewContent`, `TCProjectOverview`, and `FCProjectOverview`

### 2. `src/components/project/GCProjectOverviewContent.tsx`
- Accept `isTM` prop
- Line 379: "Pending Change Order" → conditional "Pending Work Order"
- Line 458-479: KPI card label "CHANGE ORDERS" → "WORK ORDERS", empty state "No change orders yet" → "No work orders yet", button "+ Create Change Order" → "+ Create Work Order"

### 3. `src/components/project/TCProjectOverview.tsx`
- Accept `isTM` prop
- Line 431: "Pending Change Orders" → conditional
- Line 601/627: "No change orders yet", button label → conditional

### 4. `src/components/project/FCProjectOverview.tsx`
- Accept `isTM` prop
- Line 260-282: KPI label "CHANGE ORDERS" → "WORK ORDERS", empty state → conditional

### 5. `src/components/change-orders/wizard/COWizard.tsx`
- Accept `isTM` prop
- Line 243: toast "Change order created" → "Work order created"
- Line 246: error toast → conditional
- Line 341: button "Create Change Order" → "Create Work Order"
- Line 367-371: dialog title "New Change Order" → "New Work Order"
- Line 390: "What triggered this change order?" → "What triggered this work order?"
- Line 628: "Confirm participants and create this change order." → conditional

### 6. `src/components/change-orders/COListPage.tsx`
- Pass `isTM` to `COWizard`
- Line 150: stat label "Total CO value" → conditional "Total WO value"
- Line 172-177: empty state text "No change orders yet" / "Create a change order…" / button "New Change Order" → conditional

### 7. `src/components/change-orders/COHeroBlock.tsx`
- Accept `isTM` prop (via props or fetching project)
- Line 65, 102: headline "CHANGE ORDER" → "WORK ORDER"

### 8. `src/components/change-orders/COStatusActions.tsx`
- Accept `isTM` prop
- Line 511: "Approve change order" → conditional
- Line 514-515: dialog descriptions → conditional
- Line 536: "Reject change order" → conditional

### 9. `src/components/change-orders/CODetailLayout.tsx`
- Fetch project `contract_mode` to determine `isTM`
- Line 139: fallback title "Change Order" → conditional
- Pass `isTM` to `COHeroBlock` and `COStatusActions`

### 10. `src/components/project/ProjectContractsSection.tsx`
- Accept `isTM` prop
- Line 54-55: `formatTrade` → conditional "Work Order" labels
- Line 348: section header "Change Order Contracts" → conditional "Work Order Contracts"

### 11. `src/components/project/ProjectIconRail.tsx`
- Accept `isTM` prop
- Line 35: label "Change Orders" → conditional "Work Orders"

### 12. `src/lib/coNotifications.ts`
- Accept `isTM` parameter
- All notification strings "Change order" → conditional "Work order"

### 13. `src/components/dashboard/FCDashboardView.tsx`
- Line 369: "approved change order" → check project mode and use "work order" when T&M
- Line 382: fallback "Change order" → conditional

### 14. `src/constants/defaultKpiConfig.ts`
- These are config defaults that affect all projects; leave as-is (dashboard-level, not project-specific)

## Approach
- For components already receiving `isTM`, just use it for label swaps
- For the CO detail page (`CODetailLayout`), fetch the project's `contract_mode` to derive `isTM` since it navigates directly via URL
- Create a small helper: `coLabel(isTM: boolean) => isTM ? 'Work Order' : 'Change Order'` to reduce repetition
- No database changes needed


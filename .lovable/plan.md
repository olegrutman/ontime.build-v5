

# Add Change Orders Tab + Wizard Shell

## Changes

### 1. `src/components/change-orders/COListPage.tsx` (create)
List page shell with "New Change Order" button that opens the wizard. Shows placeholder empty state.

### 2. `src/components/change-orders/wizard/COWizard.tsx` (create)
4-step wizard shell (Scope, Location, Reason, Configuration) with:
- Desktop: Dialog with left sidebar step nav + right content area
- Mobile: Sheet with top progress bar
- Step navigation, back/next/submit buttons
- `COWizardData` state object — no form fields yet, just placeholder step content
- Uses `useAuth().currentRole` to derive GC/TC/FC role

### 3. `src/components/change-orders/index.ts` (create)
Barrel export for `COListPage` and `COWizard`.

### 4. `src/components/project/ProjectTopBar.tsx` (edit)
Add a new `TabsTrigger` with value `"change-orders"` and label "Change Orders" after the existing Work Orders tab. Gated by `changeOrdersEnabled` (already declared).

### 5. `src/components/layout/BottomNav.tsx` (edit)
Add `{ label: 'COs', icon: FileText, tab: 'change-orders' }` to the mobile project nav items, gated by `changeOrdersEnabled`.

### 6. `src/components/auth/FeatureGate.tsx` (edit)
Add `'change-orders': 'change_orders'` to `TAB_FEATURE_MAP`.

### 7. `src/pages/ProjectHome.tsx` (edit)
Add tab content block:
```
{activeTab === 'change-orders' && (
  <FeatureGate feature="change_orders">
    <COListPage projectId={id!} />
  </FeatureGate>
)}
```
Import `COListPage` from `@/components/change-orders`.




# Fix Edit Button & Remove Redundant Info

## Problems
1. **Edit button on contract cards does nothing** — navigates to `/project/${projectId}/contracts` which has no route (gets caught by `/project/:id/:section` → renders ProjectHome with no matching tab)
2. **Redundant contract info** — FC contracts show up both as individual contract cards AND inside the "Contracts & Scope" card from `DownstreamContractsCard`
3. **"Contracts & Scope" card** duplicates contract values already shown in the per-contract cards above

## Changes

### 1. Add missing route for contracts page
**File: `src/App.tsx`**
- Add route: `/project/:id/contracts` → `ProjectContractsPage` (already imported but never routed)
- Place it before the catch-all `/project/:id/:section` route

### 2. Remove redundant contract display in DownstreamContractsCard
**File: `src/components/project/DownstreamContractsCard.tsx`**
- Remove the "Contract Values" input section (FC contract values are already displayed in the per-contract cards and editable via the contracts page)
- Keep only the Scope Split section since that's unique functionality
- Rename title to just "Scope Assignments" since it no longer manages contracts

### 3. Make contract cards editable inline (alternative to navigating away)
**File: `src/components/project/ScopeDetailsTab.tsx`**
- The Edit button on contract cards will now correctly navigate to `/project/${projectId}/contracts` which renders the full contracts editor page

## Summary
Add the missing `/project/:id/contracts` route so Edit actually works. Remove duplicated FC contract values from the Contracts & Scope card, keeping only the unique Scope Split feature.


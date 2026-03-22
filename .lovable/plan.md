

# SOV Follows Contract Price + Sticky Back Bar

## Two changes

### 1. Contract price change detection
When the SOV page loads, compare the current contract value against the value stored in the SOV's `scope_snapshot` (or the SOV items' total). If the contract value has changed since the SOV was generated, show an amber warning banner: **"Contract value has changed to $X. Regenerate the SOV to update."** with a "Regenerate" button.

**Implementation in `src/pages/ProjectSOVPage.tsx`:**
- Compare `prereqs.contractValue` against the sum of `items` value_amounts (or store contract_value_at_generation in scope_snapshot)
- If mismatch and SOV exists and is not locked: show amber banner with regenerate CTA
- If SOV is locked: show info banner saying "Contract changed — create a new version"

**Implementation in `src/hooks/useSOVPage.ts`:**
- Add a `contractMismatch` boolean to the return value
- Compute by comparing `prereqs.contractValue` against the current SOV items' total scheduled value

### 2. Sticky bar to go back to overview
Replace the current back arrow button with a proper sticky bar at the very top of the content area (below the sidebar header). This bar shows the project name and an "← Back to Overview" button.

**Implementation in `src/pages/ProjectSOVPage.tsx`:**
- The existing sticky header already has a back button (line 107) pointing to `?tab=overview`. Just need to make it more prominent — change from ghost icon button to a visible bar/button that says "← Back to Overview" with project name visible.

## Files changed

| File | Change |
|------|--------|
| `src/pages/ProjectSOVPage.tsx` | Add contract mismatch banner, make back-to-overview more prominent as sticky bar |
| `src/hooks/useSOVPage.ts` | Add `contractMismatch` computed field comparing prereqs contract value vs SOV total |


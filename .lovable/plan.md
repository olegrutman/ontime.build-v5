

# Show All SOVs on One Page with Collapsible Sections

## Current Behavior
The SOV page shows a contract selector (pill buttons) and displays only one SOV at a time. TC must click between contracts to see each SOV.

## New Behavior
Show all relevant SOVs stacked vertically, each in a collapsible card. TC sees both "GC → TC" and "TC → FC" SOVs at once. Each section is independently collapsible with its own generate/lock actions.

## Approach

### File: `src/pages/ProjectSOVPage.tsx`

1. **Remove the single-contract architecture** — instead of one `useSOVPage` call with a selected contract, call `useSOVPage` per contract using a new `SOVContractSection` component.

2. **Create `SOVContractSection` component** (inline in the same file):
   - Receives `projectId`, `contractId`, `contract` info, `userOrgId`
   - Calls `useSOVPage(projectId, contractId)` internally
   - Renders a `Collapsible` card with:
     - Header: contract label (e.g. "Trade Contractor → General Contractor · $650,000"), version badge, locked badge, collapse chevron
     - Body: the existing SOV table, status strip, scope coverage panel, action buttons (generate/lock/add)
   - Each section manages its own open/closed state, defaulting to open

3. **Simplify the page component**:
   - Fetch `allContracts` directly (lightweight query, already exists in useSOVPage)
   - Fetch project info
   - Map over contracts → render one `SOVContractSection` per contract
   - Remove `selectedContractId` state and contract selector pills

4. **Use `Collapsible` from radix** (already available at `src/components/ui/collapsible.tsx`)

### File: `src/hooks/useSOVPage.ts`
No changes needed — it already accepts a `contractId` parameter and returns contract-specific data.

## Files changed

| File | Change |
|------|--------|
| `src/pages/ProjectSOVPage.tsx` | Refactor to render one collapsible SOV section per contract instead of a single switchable view |


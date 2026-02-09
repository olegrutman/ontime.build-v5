

# Fix: Allow Tab Click to Return to List View

## Problem

When viewing a PO detail or Invoice detail inside a project tab, clicking the same tab in the top bar does nothing. The user has to use the browser back arrow to return to the list view. This happens because Radix UI's Tabs component only fires `onValueChange` when the value *changes* -- clicking the already-active tab is ignored.

## Affected Tabs

| Tab | Detail Component | State to Reset |
|---|---|---|
| POs | `PODetail` (inline) | `selectedPOId` |
| Invoices | `InvoiceDetail` (inline) | `selectedInvoiceId` |
| Work Orders | Navigates to `/change-order/:id` | Different route -- not affected by this fix |

Work Orders navigate to a separate route, so the tabs aren't visible when viewing a work order detail. This fix focuses on POs and Invoices which render detail views inline within the tab.

## Solution

Use a "reset key" pattern: every time a tab is clicked (even the already-active one), increment a counter. Pass that counter as a React `key` to the tab content, forcing child components to remount and reset their internal state (like `selectedPOId`).

### Changes

**1. `src/components/project/ProjectTopBar.tsx`**

Replace the Radix `onValueChange` handler with individual `onClick` handlers on each `TabsTrigger`. This ensures `onTabChange` fires even when clicking the currently active tab.

```text
Before: <Tabs value={activeTab} onValueChange={onTabChange}>
After:  <Tabs value={activeTab}>
        + onClick={() => onTabChange('purchase-orders')} on each TabsTrigger
```

**2. `src/pages/ProjectHome.tsx`**

Add a `tabResetKey` counter state. Increment it every time `handleTabChange` is called (even with the same tab value). Use it as part of the `key` prop on the tab content components so they remount and reset their internal detail state.

```text
const [tabResetKey, setTabResetKey] = useState(0);

const handleTabChange = (tab: string) => {
  setSearchParams({ tab });
  setTabResetKey(prev => prev + 1);  // forces child remount
};

// In render:
{activeTab === 'purchase-orders' && (
  <PurchaseOrdersTab key={tabResetKey} ... />
)}
{activeTab === 'invoices' && (
  <InvoicesTab key={tabResetKey} ... />
)}
```

## Why This Works

- When the user clicks "POs" while already on the POs tab, `handleTabChange('purchase-orders')` fires
- `tabResetKey` increments, changing the `key` prop on `PurchaseOrdersTab`
- React unmounts the old instance (with `selectedPOId` set) and mounts a fresh one (with `selectedPOId = null`)
- The user sees the PO list view again
- Same behavior applies to the Invoices tab

## Files Changed

| File | Change |
|---|---|
| `src/components/project/ProjectTopBar.tsx` | Add `onClick` handlers to each `TabsTrigger` so clicks always fire even on the active tab |
| `src/pages/ProjectHome.tsx` | Add `tabResetKey` counter, increment on every tab change, pass as `key` to tab content components |


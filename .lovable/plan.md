

## Bug: PO rows on Supplier Project Overview don't open the PO

### Root cause
In `src/components/project/SupplierProjectOverview.tsx` (lines 345–352), the PO register table renders each row as `<TRow cells={[...]} />` without an `onClick` handler. The `TRow` primitive in `KpiCard.tsx` already supports `onClick` and even renders `cursor: pointer` + hover style, but no callback is wired in — so clicks do nothing.

### Fix (one line in one file)

In `SupplierProjectOverview.tsx`, line ~346, wire the row click to `onNavigate` with the PO query param:

```tsx
{pos.slice(0, 10).map(po => (
  <TRow
    key={po.id}
    onClick={() => onNavigate(`purchase-orders?po=${po.id}`)}
    cells={[
      <TdN>{po.po_number || '—'}</TdN>,
      po.po_name || po.source_pack_name || '—',
      <Pill type={PO_STATUS_PILL[po.status] || 'pm'}>{po.status}</Pill>,
      <TdM>{fmt(po.po_total || 0)}</TdM>,
    ]}
  />
))}
```

### Why this works (already plumbed end-to-end)
- `TRow` (`KpiCard.tsx` L148) already accepts an optional `onClick`.
- `ProjectHome.handleTabChange` (L131-133) already splits `tab?query`, switches to the tab, and forwards the query string to the URL.
- `PurchaseOrdersTab` (L91-99, L192-200) already reads `?po=<id>` from `searchParams`, sets `selectedPOId`, and opens the PO detail panel.

Same pattern is used by the archived `ProjectOverviewV2.tsx` (`onNavigate('purchase-orders?po=' + item.id)`) — this just brings the supplier overview in line.

### Files modified
- `src/components/project/SupplierProjectOverview.tsx` — add `onClick` to the PO register row (~3 lines)

### Files NOT touched
- `KpiCard.tsx`, `ProjectHome.tsx`, `PurchaseOrdersTab.tsx` — already correct

### Verification
- On Supplier Project Overview → Purchase Orders card → click any PO row → navigates to the Purchase Orders tab with that PO's detail panel open.
- "View All →" continues to work as before.
- Hover state on rows already shows the amber tint (already styled by `TRow`).


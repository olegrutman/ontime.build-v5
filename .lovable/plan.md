
# Plan: Align Dashboard Tile Headers and Content

## Summary

Ensure all three dashboard tiles (Financial Snapshot, Needs Attention, Reminders) have consistent heights and aligned headers/content.

---

## Current Issue

The tiles have varying content heights which causes misalignment in the 3-column grid. The tiles need:
1. Equal minimum heights to align bottoms
2. Consistent CardHeader and CardContent padding
3. Content that stretches to fill available space

---

## Technical Changes

### File 1: `src/pages/Dashboard.tsx`

Add `h-full` to the grid to enable equal-height cards:

```tsx
{/* Dashboard Tiles - 3 columns on desktop */}
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
```

No change needed here - the tiles themselves need the fix.

---

### File 2: `src/components/dashboard/FinancialSnapshotTile.tsx`

Add `h-full flex flex-col` to Card and `flex-1` to CardContent:

```tsx
<Card className="h-full flex flex-col">
  <CardHeader className="pb-2">
    ...
  </CardHeader>
  <CardContent className="flex-1 space-y-3">
    ...
  </CardContent>
</Card>
```

---

### File 3: `src/components/dashboard/NeedsAttentionTile.tsx`

Add `h-full flex flex-col` to Card and `flex-1` to CardContent:

```tsx
<Card className={cn("h-full flex flex-col", totalCount > 0 && "border-amber-500/50")}>
  <CardHeader className="pb-2">
    ...
  </CardHeader>
  <CardContent className="flex-1">
    ...
  </CardContent>
</Card>
```

---

### File 4: `src/components/dashboard/RemindersTile.tsx`

Add `h-full flex flex-col` to Card and `flex-1` to CardContent:

```tsx
<Card className="h-full flex flex-col">
  <CardHeader className="pb-2">
    ...
  </CardHeader>
  <CardContent className="flex-1">
    ...
  </CardContent>
</Card>
```

---

## Visual Result

```text
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ 💵 Financial   │ │ ⚠️ Needs       │ │ 🔔 Reminders   │  ← Headers aligned
│    Snapshot    │ │    Attention   │ │                │
├────────────────┤ ├────────────────┤ ├────────────────┤
│                │ │                │ │                │
│ Content...     │ │ Content...     │ │ Content...     │  ← Content fills space
│                │ │                │ │                │
│                │ │                │ │                │
└────────────────┘ └────────────────┘ └────────────────┘  ← Bottoms aligned
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/dashboard/FinancialSnapshotTile.tsx` | Add `h-full flex flex-col` to Card, `flex-1` to CardContent |
| `src/components/dashboard/NeedsAttentionTile.tsx` | Add `h-full flex flex-col` to Card, `flex-1` to CardContent |
| `src/components/dashboard/RemindersTile.tsx` | Add `h-full flex flex-col` to Card, `flex-1` to CardContent |



# Fix Mobile Invoice View: Bottom Nav Overlap, Card Layout, and Sasha Position

## Problems
1. **Bottom nav covers last card** — content has `pb-24` (96px) but Sasha bubble sits at `bottom-20` (80px), stacking on top of the 56px nav bar, so the last card is hidden behind ~136px of fixed UI
2. **Invoice card content doesn't fit on 390px** — the header row crams invoice number + age badge + hover actions + status pill into one line
3. **Sasha bubble overlaps card content** — 64px bubble at bottom-right covers card info

## Changes

| # | File | What |
|---|------|------|
| 1 | `SashaBubble.tsx` (line 344) | Move bubble higher on mobile: `bottom-20` → `bottom-24` (above bottom nav + breathing room). Move chat panel `bottom-36` → `bottom-40`. |
| 2 | `ProjectHome.tsx` (line 329) | Increase mobile bottom padding: `pb-24` → `pb-36` to clear both bottom nav AND Sasha bubble |
| 3 | `InvoiceCard.tsx` | Mobile-optimize the card layout: stack the header row on small screens — put invoice number + date on top, status + age badge below. Hide `HoverActions` on mobile (actions available on tap/click). Ensure billing period text truncates properly. |

## Card layout on mobile (before → after)

```text
BEFORE (single cramped row):
┌─────────────────────────────────┐
│ INV-001  [3d] [⋯] [Submitted]  │  ← too tight at 390px
│ Mar 1, 2026                     │
│ ...                             │

AFTER (stacked):
┌─────────────────────────────────┐
│ INV-001           [Submitted]   │
│ Mar 1, 2026            3d       │
│ ...                             │
```




# Optimize TC Project Overview for Mobile (390px)

## Problems
1. **Cash Flow Ladder** occupies ~400px vertically — 3 stacked blocks with arrows and labels
2. **KPI cards are single-column** on mobile — 8+ cards require excessive scrolling
3. **Action buttons** have long text that wraps ("Submit Invoice to Haley Custom Homes")
4. **Sasha bubble** still overlaps card content at the bottom
5. **Header area** consumes the entire first viewport before any financial data appears

## Changes

| # | File | What |
|---|------|------|
| 1 | `TCProjectOverview.tsx` — **Cash Flow Ladder** | On mobile, replace the 3-column vertical stack with a compact horizontal summary row: `GC $231K → You $231K → FC $160K` with margin shown as a small badge. Saves ~300px of vertical space. |
| 2 | `TCProjectOverview.tsx` — **KPI grid** | Change mobile grid from `grid-cols-1` to `grid-cols-2` for the first 4 summary cards (Revenue, FC Contract, Gross Margin, CO Net). Keep detail-heavy cards (Received, Pending, Paid, Team) as single-column below. |
| 3 | `TCProjectOverview.tsx` — **Action buttons** | Shorten mobile labels: "Submit Invoice" and "View Contract" (drop the org name on small screens). Use `className="max-sm:hidden"` on the org name span. |
| 4 | `TCProjectOverview.tsx` — **Card padding** | Reduce mobile card padding from `20px 24px` to `14px 16px` on the Cash Flow section and collapsed KPI card headers. |
| 5 | `SashaBubble.tsx` | Bump mobile position from `bottom-28` to `bottom-32` to fully clear the bottom nav + Capture button area. |

## Mobile layout (after)

```text
┌──────────────────────────────┐
│ ● Fuller Residence           │
│ TC · IMIS, LLC               │
│ [Submit Invoice] [View Cont] │  ← shortened labels
├──────────────────────────────┤
│ Revenue    │ FC Contract     │  ← 2-col grid
│ $231.7K    │ $160.5K         │
├────────────┼─────────────────│
│ Margin     │ CO Net          │
│ $71.2K     │ $0              │
├──────────────────────────────┤
│ GC $231K → You → FC $160K   │  ← compact cash flow
│         margin $71.2K        │
├──────────────────────────────┤
│ Received from GC    $0       │  ← single-col detail cards
│ Pending from GC     $0       │
│ ...                          │
└──────────────────────────────┘
```

## What stays unchanged
- Desktop layout (4-column grid, full Cash Flow Ladder)
- All expand/collapse KPI card functionality
- FC contract editing flow
- Team management card
- Warning/attention section


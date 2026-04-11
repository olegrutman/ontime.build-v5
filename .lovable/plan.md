

# Improve Mobile Invoice UX (390px)

## Problems observed
1. **Tab labels overflow** — "Sent to Haley Custom Hom..." and "From Field Crews & Suppliers" are too long for 390px, causing truncation and overlap
2. **KPI cards waste space** — Three full-width cards showing mostly zeros push the actual invoice below the fold. User has to scroll past empty metrics to see their data
3. **Invoice card still clipped** — Bottom of the card is partially hidden behind the bottom nav
4. **Sasha bubble overlaps Capture** — The floating Sasha avatar sits directly on top of the Capture button in the bottom nav bar
5. **Too much vertical chrome** — Section title + filter bar + 3 KPIs = ~300px of UI before the first invoice appears

## Plan

### 1. Shorten tab labels on mobile
**File:** `InvoicesTab.tsx`
- Use shorter labels on small screens: "Sent" / "Received" instead of the full org names
- Hide the icon on mobile to save space
- Add `truncate` and `max-w` constraints to the TabsTrigger content

### 2. Compact KPI bar on mobile
**File:** `InvoiceActionBar.tsx`
- Change from `grid-cols-1 sm:grid-cols-3` to a horizontal scroll row on mobile — all 3 metrics in a single row with compact styling
- Reduce card padding on mobile (`p-3` instead of `p-4`)
- Show just the number + label inline (skip the icon circle on mobile)
- Collapse cards with zero values on mobile — show only cards with actual data, or show all 3 in a single condensed row

### 3. Fix remaining bottom overlap
**File:** `ProjectHome.tsx`
- Verify `pb-36` is applied; if the card is still clipped, increase to `pb-40`

### 4. Move Sasha bubble away from Capture button
**File:** `SashaBubble.tsx`
- Increase `bottom` position further so it clears both the nav bar and the Capture button area
- Alternative: shift Sasha to `left` side on mobile when Capture button is present

### 5. Merge section title into filter bar
**File:** `InvoicesTab.tsx` (renderTabContent)
- Combine "From Field Crews & Suppliers / 1 Invoice" heading with the filter bar into a single compact row: `1 Invoice | [All Statuses v]`
- Saves ~40px of vertical space

## Expected result
On 390px, the user sees: compact tabs at top, a single-line KPI summary, filter, and the invoice card — all without scrolling. The bottom nav and Sasha bubble don't overlap any content.




# Match Project Overview to Mockup Screenshot

## What I see differs

1. **Dark header color**: Currently `bg-[hsl(var(--foreground))]`. Mockup uses a deep navy (`bg-slate-950`). The header also shows dot-separated project metadata (e.g., "5 Apartments · 2 Stories") after the address — currently only shows address.

2. **KPI cards background**: Currently `bg-accent/20` with a tinted look. Mockup shows clean white (`bg-card`) with only a subtle border.

3. **CO Impact card rows**: Currently each row is wrapped in `rounded-2xl bg-card border` sub-cards. Mockup shows simple flat rows — just label + value separated by thin borders, no individual card wrappers.

4. **Spacing**: Currently `space-y-6` and `gap-6` throughout. Mockup uses tighter `gap-4` / `space-y-4`.

5. **Materials Command Center stat tiles**: Currently `bg-accent/30`. Mockup shows cleaner `bg-slate-50` / `bg-accent/10` tiles.

6. **Tab bar**: Looks correct, sits below the dark card. No changes needed.

## Changes

### 1. Dark header — `ProjectHome.tsx` lines 291-316
- Change `bg-[hsl(var(--foreground))]` to `bg-slate-950`
- Add project structures info after address (e.g., "5 Apartments · 2 Stories" from `project.structures`)

### 2. KPI cards — `ProjectFinancialCommand.tsx`
- Change `bg-accent/20` to `bg-card` on each KPI tile (line 17)

### 3. CO Impact rows — `COImpactCard.tsx`
- Remove the `rounded-2xl bg-card border border-border/60` wrapper from each row
- Replace with simple `border-b border-border/40 px-0 py-3` divider rows (no card per row)
- Remove outer `bg-accent/20` from the card container — use `bg-card`

### 4. Tighten spacing — `ProjectHome.tsx`
- Change `space-y-6` to `space-y-4` in the overview content area (line 333)
- Change `gap-6` to `gap-4` in the 12-col grid (line 365)

### 5. Materials Command Center tiles — `MaterialsCommandCenter.tsx`
- Change stat grid tiles from `bg-accent/30` to `bg-slate-50 dark:bg-accent/20` for a cleaner look (lines 157, 190)

## Files to modify
| File | Change |
|------|--------|
| `ProjectHome.tsx` | Header bg to `bg-slate-950`, tighten spacing to `space-y-4` / `gap-4`, add structure info |
| `ProjectFinancialCommand.tsx` | KPI tile bg from `bg-accent/20` to `bg-card` |
| `COImpactCard.tsx` | Flatten row styling — remove individual card wrappers, use simple divider rows |
| `MaterialsCommandCenter.tsx` | Stat tiles bg from `bg-accent/30` to `bg-slate-50 dark:bg-accent/20` |


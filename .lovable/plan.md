

# Fix Dashboard Layout — Match Mockup

## What's wrong now
1. **BusinessSnapshot is full-width hero** between greeting and KPIs — pushes everything down, too big
2. **KPI 4th card wrong** — shows "Collected" (currency) but mockup shows "Materials Forecast" as text status ("Watch" / "On Track" / "Risk")
3. **Layout order wrong** — BusinessSnapshot should be in the RIGHT sidebar column, not above KPIs

## What the mockup shows (top to bottom)
1. Greeting ("Good morning, Oleg")
2. **4 KPI cards in a row** — Contract In, Cost Out, Projected Margin, Materials Forecast (text)
3. **8/4 grid**:
   - Left (8 cols): Attention List → Materials Health + Action Queue (2-col)
   - Right (4 cols): Business Snapshot (dark card, compact) → Pack Progress

## Changes

### 1. Move BusinessSnapshot from hero to right sidebar
In `Dashboard.tsx`: Remove `<DashboardBusinessSnapshot>` from its current position (line 230-236). Place it as the FIRST item in the right sidebar column (line 278), ABOVE RemindersTile.

### 2. Fix 4th KPI card for TC
In `DashboardKPIs.tsx` for `orgType === 'TC'`: Replace the 4th card ("Collected") with a "Materials Forecast" text card. Compute variance from material costs: if forecast > estimate by >5% → "Risk", >0% → "Watch", else "On Track". Use `isText=true` and `textValue` props already supported by KPICard.

### 3. Compact BusinessSnapshot styling
Already compact (p-5, rounded-3xl). No size changes needed — moving it to the 4-col sidebar naturally constrains its width.

## Files to modify
| File | Change |
|------|--------|
| `Dashboard.tsx` | Move BusinessSnapshot from hero to right sidebar column |
| `DashboardKPIs.tsx` | Replace TC 4th card with Materials Forecast text status |


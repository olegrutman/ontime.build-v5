

# Design-System Consistency Pass — Audit & Fix Plan

## Audit Results: Remaining Inconsistencies

### 1. Raw `Card` usage (not `SurfaceCard`)
These dashboard/overview components still use the old `Card` from `@/components/ui/card` instead of `SurfaceCard`, which means they get `rounded-lg` + different shadow/border instead of `rounded-2xl border-border/60 shadow-sm`:
- `PendingInvitesPanel.tsx` — uses `Card` with `rounded-lg`
- `OnboardingChecklist.tsx` — uses `Card` with `rounded-lg`
- `OrgInviteBanner.tsx` — uses `Card` with `rounded-lg`
- `ProjectReadinessCard.tsx` — uses `Card` with `rounded-lg`

### 2. Project Overview dark header badges are hand-rolled
Lines 300-313 of `ProjectHome.tsx` use inline `rounded-full px-3 py-1 text-xs font-semibold` with custom color classes instead of `StatusPill`. This is the exact use case `StatusPill` was built for.

### 3. Dashboard content has no horizontal padding
Dashboard layout at line 197: `px-0` on the content container, while Overview uses `px-3 sm:px-6`. This creates a different horizontal breathing room.

### 4. Dashboard content has no top padding after greeting
`DashboardWelcome` uses `pt-1 pb-0`, but the Overview content area uses `py-4 sm:py-6`. The greeting sits flush against the top of the content area.

### 5. DashboardBusinessSnapshot is a raw `<div>` not `SurfaceCard`
It uses `rounded-2xl bg-slate-950 text-white p-5` — correct radius but no border/shadow tokens. Since it's a dark card this is acceptable, but it should at least share the `rounded-2xl` radius consistently (it does).

### 6. Inner tile backgrounds inconsistent
- `DashboardActionQueue` action items: `bg-slate-50 dark:bg-accent/20` — correct
- `DashboardMaterialsHealth` bar chart bg: `bg-slate-50 dark:bg-accent/20` — correct
- `DashboardMaterialsHealth` mini stats: `bg-slate-50 dark:bg-accent/20` — correct
- `MaterialsCommandCenter` stat tiles: `bg-slate-50 dark:bg-accent/20` — correct
- **All match** — no issue here.

### 7. ProjectReadinessCard uses `border-l-4` accent style
This is a pattern not used anywhere else in the unified system. Should use `SurfaceCard` with the health banner pattern instead.

### 8. PendingInvitesPanel inner items use `rounded-lg` not `rounded-xl`
Line 62: `className="p-3 border rounded-lg bg-muted/30"` — should be `rounded-xl` to match inner tile pattern.

## Changes to Make

### File: `PendingInvitesPanel.tsx`
- Replace `Card`/`CardHeader`/`CardContent` with `SurfaceCard`/`SurfaceCardHeader`/`SurfaceCardBody`
- Change inner invite items from `rounded-lg` to `rounded-xl`
- Match section title to `SurfaceCardHeader` pattern (0.95rem font-semibold)

### File: `OnboardingChecklist.tsx`
- Replace `Card`/`CardHeader`/`CardContent` with `SurfaceCard`/`SurfaceCardHeader`/`SurfaceCardBody`

### File: `OrgInviteBanner.tsx`
- Replace `Card`/`CardContent` with `SurfaceCard`/`SurfaceCardBody`
- Keep the `border-primary/30 bg-primary/5` accent since it's a call-to-action banner

### File: `ProjectReadinessCard.tsx`
- Replace `Card`/`CardContent` with `SurfaceCard`/`SurfaceCardBody`
- Replace `border-l-4 border-l-green-500` with the standard card + a `StatusPill` inside

### File: `ProjectHome.tsx` (lines 300-313)
- Replace the two hand-rolled `<span>` badges with `StatusPill` components
- Health badge: map `healthLabel` to the correct `PillVariant` and render as `<StatusPill>`
- Status badge: use `StatusPill variant="neutral"` for the project status

### File: `Dashboard.tsx` (line 197)
- Change `px-0` to `px-3 sm:px-6` to match Overview's horizontal padding

### File: `DashboardWelcome.tsx`
- Change `pt-1 pb-0` to `pt-2 pb-0` for slightly more breathing room (subtle)

## Files to modify (7 files)
| File | Change |
|------|--------|
| `PendingInvitesPanel.tsx` | `Card` → `SurfaceCard`, inner items `rounded-lg` → `rounded-xl` |
| `OnboardingChecklist.tsx` | `Card` → `SurfaceCard` |
| `OrgInviteBanner.tsx` | `Card` → `SurfaceCard` |
| `ProjectReadinessCard.tsx` | `Card` → `SurfaceCard`, remove `border-l-4`, add `StatusPill` |
| `ProjectHome.tsx` | Replace hand-rolled header badges with `StatusPill` |
| `Dashboard.tsx` | Add `px-3 sm:px-6` to content container |
| `DashboardWelcome.tsx` | Adjust top padding from `pt-1` to `pt-2` |

## What is NOT changing
- No business logic changes
- No content changes
- No layout restructuring
- Components already using `SurfaceCard` stay as-is
- `DashboardBusinessSnapshot` dark card stays as-is (intentionally different bg)


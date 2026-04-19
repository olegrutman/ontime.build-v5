

## Diagnosis

The order classes ARE in the code, but Tailwind flex `order` is numeric. Items without an `order` class default to `order-0`. Projects has `order-2`, which is GREATER than 0, so it sits AFTER its un-ordered siblings on mobile too — exactly what the screenshot shows.

The previous plan said to add `order-3 md:order-2` to the KPI/attention blocks, but that step was never applied — only the Projects div got classes.

## Fix

Two options, going with the simpler one:

**Make Projects negative-order on mobile so it floats up past default-0 siblings, but stays last on desktop.**

Change in all three views:

```diff
- <div className="order-2 md:order-last" ...>
+ <div className="-order-1 md:order-last" ...>
```

Then add `order-first` (or just `-order-2`) to the Hero so it stays above Projects on mobile:

```diff
- <DashboardHero ... />
+ <div className="contents -order-2 md:order-none">
+   <DashboardHero ... />
+ </div>
```

Actually cleaner: wrap Hero in a div with order classes (DashboardHero is a component, can't take className directly without checking). Simplest path:

- Hero block (and onboarding/banners that should stay with it): wrap each in `<div className="-order-2 md:order-none">` or leave them and just push Projects above default-0 with `-order-1`.

**Final approach (minimal):** 
- Projects: `-order-1 md:order-last` (negative beats default 0 on mobile; `order-last` puts it at end on desktop)
- Hero: needs to be above Projects on mobile, so wrap with `<div className="-order-2 md:contents">` OR add `order-[-2] md:order-none` directly.

Since `DashboardHero` is rendered as a JSX component, wrap it in a div:

```tsx
<div className="-order-2 md:contents">
  <DashboardHero ... />
</div>
```

`md:contents` makes the wrapper disappear at desktop so it doesn't break flex layout there.

## Files to edit
- `src/components/dashboard/TCDashboardView.tsx` (lines ~100, ~320)
- `src/components/dashboard/GCDashboardView.tsx` (lines ~123, ~376)
- `src/components/dashboard/FCDashboardView.tsx` (lines ~113, ~351)

## Verification
- 390px: Hero → Projects → KPIs/rest
- ≥768px: Hero → KPIs → … → Projects (unchanged)
- Empty projects: block doesn't render, Hero still on top


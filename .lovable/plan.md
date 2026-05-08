## Goal

On the Change Orders page filter pills (`All` / `Action` / `Active` / `Approved` / `Withdrawn`), make the count next to each label a plain inline number — remove the grey rounded badge currently wrapping it.

## Where

`src/components/change-orders/COListPage.tsx`, lines ~136–155 (the filter pill render).

## Current

The count is wrapped in a `<span>` with `bg-muted` (grey pill) when the tab is inactive, and `bg-primary-foreground/20` when active:

```tsx
<span className={cn(
  'text-[10px] px-1 py-0.5 rounded-full',
  filter === f.key ? 'bg-primary-foreground/20' : 'bg-muted',
)}>
  {f.count}
</span>
```

## Change

Drop the background, padding, and rounded-full. Render the number inline, slightly muted in weight/opacity so it reads as secondary to the label, inheriting the pill's text color (so it stays white on the active primary pill and muted on inactive ones).

```tsx
<span className={cn(
  'text-[11px] sm:text-xs tabular-nums opacity-70 ml-0.5',
)}>
  {f.count}
</span>
```

- No background, no border, no padding, no rounded.
- `tabular-nums` keeps digits aligned.
- `opacity-70` makes the number visually subordinate to the label without needing a hardcoded color.
- Inherits `text-primary-foreground` when active, `text-muted-foreground` when inactive — so contrast stays correct in both states.

## Out of scope

- No changes to the `Action` tab logic, counts, or filter behavior — it already shows and works (driven by `myActionCount` for `submitted` / `closed_for_pricing` / `work_in_progress` COs assigned to the current org).
- No changes to the stats KPI row below the pills.
- No changes to button shape, padding, or layout — only the count badge styling.



## Goal

Make the IMIS company logo visible in the dashboard sidebar by giving its section a **lighter blue background** (so dark logos pop against it) and **enlarging the logo** itself.

## Changes — `src/components/app-shell/DashboardSidebar.tsx` (Company section, lines 83–98)

1. **Lighter background** for just the company section (not the whole sidebar):
   - Wrap the section in a softly tinted "card" inside the dark sidebar.
   - Use a translucent light-blue tint that reads as a separate panel: `bg-slate-100/95` (near-white with very slight cool tint) — this makes any dark or color logo readable.
   - Add `mx-3 mb-2 rounded-xl px-3 py-3` so it looks like an inset card, not a full-width band.
   - Keep the existing `border-t border-white/10` removed since it's now a card, not a divider.

2. **Larger logo**:
   - Bump from `max-h-9 max-w-[140px]` → `max-h-14 max-w-[170px]` (≈56px tall vs 36px).
   - Drop `rounded` (most logos aren't square — rounding clips edges).
   - Center it: `mx-auto block mb-2`.

3. **Adjust text colors** for the new light background:
   - Org name: `text-white` → `text-slate-900`.
   - Org type pill: `bg-white/10 text-slate-300` → `bg-slate-900/10 text-slate-700`.

4. **Fallback when no logo**: keep org name + pill rendering as today, just on the new light card so the visual rhythm stays consistent.

### Resulting markup (sketch)

```tsx
{/* Company section - light card so logos stand out */}
<div className="mx-3 mb-2 rounded-xl bg-slate-100/95 px-3 py-3">
  {currentOrg?.logo_url && (
    <img
      src={currentOrg.logo_url}
      alt={orgName}
      className="max-h-14 max-w-[170px] object-contain mx-auto block mb-2"
    />
  )}
  <p className="text-[0.8rem] font-semibold text-slate-900 truncate leading-tight">
    {orgName}
  </p>
  {orgType && (
    <span className="inline-block mt-1 text-[0.65rem] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-900/10 text-slate-700">
      {ORG_TYPE_LABELS[orgType] || orgType}
    </span>
  )}
</div>
```

## Files modified
- `src/components/app-shell/DashboardSidebar.tsx` — only the "Company section" block (~15 lines).

## Files NOT touched
- Nav items, Profile/Sign Out section, top logo lockup — unchanged.
- `PlatformSidebar.tsx`, `ProjectSidebar` — different surface, not in scope.

## Verification
- IMIS dark logo is clearly visible on the new light card.
- Logo is noticeably larger (≈56px tall vs ~36px today).
- Org name "IMIS, LLC" reads as dark text on light card.
- "TRADE CONTRACTOR" pill remains legible.
- Test with: a wide logo, a tall logo, and an org with no logo (text-only fallback still looks intentional).
- No layout shift in the sidebar; Profile/Sign Out section unchanged below.


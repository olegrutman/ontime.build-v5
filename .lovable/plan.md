
How I understand your request (plain English)
- You want the uploaded CO design to become the real product experience (not a demo), and it must work correctly for all three roles: GC, TC, and FC.
- You want this style applied to the CO detail screen and related CO pages, not just one component.
- You want a dedicated mobile layout that follows this design language, not just desktop squeezed down.
- You do not want the role switcher in production; users should only see their real signed-in role view.
- Before doing the redesign, we must fix the current build break (`Cannot find package 'rollup'`) so the project can compile again.

Implementation plan

1) Unblock the build first (dependency/lockfile stabilization)
- Audit and realign dependency manifests so the build toolchain is deterministic:
  - `package.json`
  - `package-lock.json`
  - `bun.lock` / `bun.lockb`
- Fix lockfile drift introduced by recent edits (current symptoms strongly indicate lock/dependency mismatch).
- Ensure the Vite toolchain resolves fully at build time (including Rollup), then confirm `vite build` passes.

2) Rebuild CO detail page to match uploaded design system
- Refactor `CODetailPage` into the same structural pattern from your file:
  - sticky top header area
  - two-column desktop layout (main + right rail)
  - role-aware card composition and tighter “ops dashboard” look
- Keep production behavior role-driven (no manual role toggle UI).
- Preserve existing workflow logic (status actions, NTE handling, submissions/approvals/rejections), but restyle and reorganize visually.

3) Enforce role-specific visibility exactly across GC/TC/FC
- Consolidate role visibility logic so every section follows one consistent rule set:
  - GC: billed-facing totals
  - TC: cost + markup operational view
  - FC: no TC/GC pricing leakage; FC-specific earnings/private actuals where applicable
- Apply consistently in:
  - labor line item expansion rows
  - materials table/footers
  - equipment panel
  - financial summary rail
  - status/notice blocks

4) Apply matching style to related CO pages
- Update `COListPage` to align card density, badges, hierarchy, and interaction style with the new CO detail visual system.
- Align CO entry points/wizard shell styling (`COWizard` wrapper/header/progress treatment) so the CO flow feels like one cohesive product.

5) Build dedicated mobile CO layout (not just responsive shrink)
- Create mobile-first structures for CO detail/list:
  - stacked card sections
  - touch-friendly action groups
  - compact but readable financial blocks
  - spacing safe for bottom navigation overlap
- Maintain role privacy and action permissions identically on mobile.

6) Validation and rollout checks
- First verify build stability (`vite build`) after dependency fix.
- Then run role-by-role functional verification on redesigned screens:
  - GC, TC, FC each see only intended data
  - FC save/submit flows still work
  - approvals/rejections/NTE actions still behave correctly
- End-to-end test checklist on desktop + mobile viewports before finalizing.

Primary files likely to be updated
- Build/dependency: `package.json`, `package-lock.json`, `bun.lock` (and possibly `bun.lockb` handling)
- CO detail experience:
  - `src/components/change-orders/CODetailPage.tsx`
  - `src/components/change-orders/COLineItemRow.tsx`
  - `src/components/change-orders/COMaterialsPanel.tsx`
  - `src/components/change-orders/COEquipmentPanel.tsx`
  - `src/components/change-orders/COActivityFeed.tsx`
  - `src/components/change-orders/COStatusActions.tsx`
  - `src/components/change-orders/CONTEPanel.tsx`
- Related CO pages:
  - `src/components/change-orders/COListPage.tsx`
  - `src/components/change-orders/wizard/COWizard.tsx`
- Shared style adjustments (if needed): `src/index.css` / local Tailwind utility usage

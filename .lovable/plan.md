
Plain-English understanding:
- You want the Change Orders experience redesigned into a light theme style based on your uploaded references.
- This should apply to both the CO list page and CO detail page (not list only).
- On the CO list page, users should be able to toggle between List view and Card view.
- Card view should be the default.
- The app should remember each user’s last selected view mode and restore it when they come back.
- The redesign must work for all role types (GC, TC, FC) without changing role permissions or workflow rules.

Implementation plan:

1) Build a light-theme CO visual system (shared styles)
- Add reusable light-surface utility classes/tokens (card shell, section header, KPI strip, subtle borders/shadows) in `src/index.css`.
- Keep existing global theme safe by scoping new classes to CO screens (no risky global override).

2) Add List/Card toggle with persistence on CO list page
- Update `src/components/change-orders/COListPage.tsx`:
  - Add `viewMode` state (`'card' | 'list'`) with default `'card'`.
  - Persist preference in `localStorage` (project-safe key like `co_view_mode`), load on mount.
  - Add a top-right toggle control (using existing `ViewSwitcher` pattern or CO-specific segmented toggle).
  - Render:
    - **List view**: current grouped row layout (refined styling).
    - **Card view**: new responsive card grid modeled after uploaded `co-page-cards.html`.
- Keep combine behavior in both views (draft/shared selectable, selected count, combine CTA).
- Preserve current “My change orders” + “Shared with me” separation and status grouping logic.

3) Apply light redesign to CO list content
- Introduce a cleaner top header with light KPI strip and status filters similar to uploaded references.
- Refresh row/card visuals:
  - clearer badges (status/pricing/reason),
  - location + age metadata,
  - optional NTE progress snippet for NTE items,
  - stronger hover/selected states.

4) Apply light redesign to CO detail page
- Update `src/components/change-orders/CODetailPage.tsx` structure and style to match the same light design language:
  - light sticky header,
  - cleaner section containers,
  - polished right rail cards (actions, financials, details, NTE).
- Keep current role-aware data visibility intact (GC/TC/FC views unchanged in logic).
- Keep all current workflow actions and permissions exactly as-is.

5) Align detail sub-panels to new light visual language
- Restyle without changing data behavior in:
  - `COLineItemRow.tsx`
  - `COMaterialsPanel.tsx`
  - `COEquipmentPanel.tsx`
  - `COActivityFeed.tsx`
  - `COStatusActions.tsx`
  - `CONTEPanel.tsx`
- Focus on typography hierarchy, spacing, chip/badge treatment, and card consistency.

6) Mobile behavior (dedicated layout)
- Add a dedicated mobile layout for CO list:
  - card-first stack with touch-optimized controls,
  - toggle accessible and sticky/visible,
  - combine CTA optimized for thumb reach.
- Keep CO detail mobile stacked-card flow consistent with light redesign.

7) Safety and regression checks
- Ensure no backend/schema/RLS changes (UI-only).
- Validate key flows still work for all roles:
  - open CO detail from both list and card views,
  - multi-select + combine,
  - share/submit/approve/reject actions,
  - NTE panel behavior.
- Confirm remembered view mode persists across navigation/reload.

Files to update (primary):
- `src/components/change-orders/COListPage.tsx`
- `src/components/change-orders/CODetailPage.tsx`
- `src/components/change-orders/COLineItemRow.tsx`
- `src/components/change-orders/COMaterialsPanel.tsx`
- `src/components/change-orders/COEquipmentPanel.tsx`
- `src/components/change-orders/COActivityFeed.tsx`
- `src/components/change-orders/COStatusActions.tsx`
- `src/components/change-orders/CONTEPanel.tsx`
- `src/index.css`
- (Optional) `src/components/ui/view-switcher.tsx` only if needed for explicit “Card View” labeling.

Expected outcome:
- CO pages have a consistent light, modern UI.
- Users can switch between List and Card views on CO list.
- Card view opens by default.
- Selected view mode is remembered per user/browser session.
- Existing GC/TC/FC permissions and workflows remain unchanged.

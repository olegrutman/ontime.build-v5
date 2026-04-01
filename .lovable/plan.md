

# 4 Changes: Structural Steel, Platform Admin Tools, Overview Navigation, Rename Orders→Actions

---

## 1. Add Structural Steel Installation to Framing Scope

**What**: Add a new "Structural Steel" section to the framing scope wizard between "Building Features" (Section 2) and "Sheathing & WRB" (Section 3).

### New types in `src/types/framingScope.ts`:
```typescript
export interface SteelAnswers {
  steel_columns: YesNoNa;
  steel_column_type: string | null;        // W-shape, HSS, pipe
  steel_beams: YesNoNa;
  beam_type: string | null;                // W-shape, LVL/steel hybrid
  moment_frames: YesNoNa;
  moment_frame_connections: string | null;  // bolted, welded, both
  steel_posts: YesNoNa;
  post_base_plates: YesNoNa;
  lintels: YesNoNa;
  lintel_type: string | null;              // angle iron, C-channel, plate
  steel_decking: YesNoNa;
  decking_gauge: string | null;
  shear_plates: YesNoNa;
  embed_plates: YesNoNa;
  steel_stairs: YesNoNa;
  steel_railings: YesNoNa;
  erection_method: string | null;          // crane, forklift, manual
  torque_bolting: YesNoNa;
  welding_onsite: YesNoNa;
  fireproofing: YesNoNa;
  fireproofing_type: string | null;        // intumescent, spray-applied, board
  touch_up_paint: YesNoNa;
}
```

### Visibility rules by building type:
| Question | SFR | Townhome | Multi-Family | Hotel | Commercial |
|----------|-----|----------|-------------|-------|-----------|
| Columns, Beams, Posts, Lintels | All | All | All | All | All |
| Moment frames | — | — | ✓ | ✓ | ✓ |
| Steel decking | — | — | ✓ | ✓ | ✓ |
| Shear/embed plates | — | ✓ | ✓ | ✓ | ✓ |
| Steel stairs/railings | — | ✓ | ✓ | ✓ | ✓ |
| Erection method | — | — | ✓ | ✓ | ✓ |
| Torque bolting, welding | — | — | ✓ | ✓ | ✓ |
| Fireproofing | — | — | ✓ | ✓ | ✓ |

### Files:
| File | Change |
|------|--------|
| `src/types/framingScope.ts` | Add `SteelAnswers`, add `steel` to `FramingScopeAnswers`, add to `SECTIONS` as id `2b`, update `createDefaultAnswers`, add `showSteelDecking()`, `showMomentFrames()` etc |
| `src/components/framing-scope/sections/SteelSection.tsx` | New section component with YesNoRow + ChildPanel pattern |
| `src/components/framing-scope/FramingScopeWizard.tsx` | Import + render `SteelSection`, update NAV_GROUPS, adjust section indices |
| `src/components/framing-scope/ScopeSummaryPanel.tsx` | Add steel items to summary display |
| `src/components/framing-scope/ScopeDocument.tsx` | Add steel section to generated document |
| `src/hooks/useFramingScope.ts` | Handle `steel` key in save/load |
| DB migration | Add `steel` JSONB column to `project_framing_scope` table |

---

## 2. Platform Owner: Reassign, Review & Edit Project Setup Questions

**What**: Add a "Setup Review" tab to `PlatformProjectDetail.tsx` that lets platform owners view and edit the project's scope selections and framing scope answers, and reassign the project to a different organization.

### Features:
- **View scope selections** — read from `project_scope_selections` + `project_scope_details` and display as editable form
- **Edit scope answers** — inline editing with save to DB
- **Reassign project** — dropdown to select a different org, updates `project_team.organization_id` for the creator role
- **Reset project status** — ability to move project back to `setup` if needed

### Files:
| File | Change |
|------|--------|
| `src/pages/platform/PlatformProjectDetail.tsx` | Add "Setup" tab with scope viewer, reassign dialog, status reset button |
| `src/components/platform/PlatformScopeEditor.tsx` | New — renders scope questions as editable form for platform admin |
| `src/components/platform/ProjectReassignDialog.tsx` | New — org selector + confirmation dialog |

---

## 3. Overview: Click Invoice/PO/CO → Navigate to Detail (with Return)

**What**: When clicking an invoice, PO, or CO on the overview page, instead of opening a BottomSheet, navigate to the detail page. Add a "Back to Overview" breadcrumb/button on the detail page.

### Changes:
- In `ProjectOverviewV2.tsx`, the `onClick` for order items currently opens a BottomSheet with limited info
- Replace with navigation: `onNavigate('invoices')` with a query param like `?highlight=INV-123`, or navigate directly to the detail route
- For invoices: navigate to `invoices` tab with the invoice selected
- For POs: navigate to `purchase-orders` tab → PO detail
- For COs: navigate to `change-orders` tab → CO slide-over

### Files:
| File | Change |
|------|--------|
| `src/components/project/ProjectOverviewV2.tsx` | Replace BottomSheet onClick with navigation callback; add `onItemClick(type, id)` prop |
| `src/pages/ProjectHome.tsx` | Handle `onItemClick` — navigate to correct tab with item ID |

---

## 4. Rename "Orders" → "Actions"

**What**: Rename the "Orders" pill tab to "Actions" across the overview.

### Files:
| File | Change |
|------|--------|
| `src/components/project/ProjectOverviewV2.tsx` | Change `PILLS` from `'orders'` to `'actions'`; update `PILL_ICONS`; update all references to `activePill === 'orders'` → `'actions'`; update empty state text |

---

## Summary of all files modified

| File | Changes |
|------|---------|
| `src/types/framingScope.ts` | Add SteelAnswers, visibility helpers |
| `src/components/framing-scope/sections/SteelSection.tsx` | **New** — structural steel questions |
| `src/components/framing-scope/FramingScopeWizard.tsx` | Add steel section to wizard flow |
| `src/components/framing-scope/ScopeSummaryPanel.tsx` | Steel in summary |
| `src/components/framing-scope/ScopeDocument.tsx` | Steel in document |
| `src/hooks/useFramingScope.ts` | Handle steel data |
| `src/pages/platform/PlatformProjectDetail.tsx` | Setup Review tab, reassign, status reset |
| `src/components/platform/PlatformScopeEditor.tsx` | **New** — platform scope editor |
| `src/components/platform/ProjectReassignDialog.tsx` | **New** — reassign dialog |
| `src/components/project/ProjectOverviewV2.tsx` | Orders→Actions rename; click-to-navigate instead of BottomSheet |
| `src/pages/ProjectHome.tsx` | Handle item click navigation |
| DB migration | Add `steel` JSONB column to `project_framing_scope` |

